// Combina el reporte de SISGED con el análisis de resoluciones (port del script de Python).
// Reporte: columna "Nro CUT" (por nombre de encabezado).
// Análisis (resultados): A Archivo, B Número, C Fecha, D CUT, E ALA, F Administrado, G Contenido, H Patrón.

type Procedimiento = string | [string, string | string[]];

const PROCEDIMIENTOS: Procedimiento[] = [
  ["OTROS", ["improcedente", "Abandono del procedimiento", "DESISTIMIENTO", "Modificar la Resolución", "Declarar de Oficio", "reforestación", "Declarar Fundado", "error material", "ocupación futura de la faja marginal", "Dejar sin efecto", "Disponer la ampliación excepcional", "DECLARAR NULO", "Declarar INFUNDADO", "Declarar sustraída la materia"]],
  ["TUPA - AUTORIZACIÓN DE USO DE AGUA", ["Autorización de uso de agua", "TUPA - AUTORIZACIÓN DE USO DE AGUA"]],
  "TUPA - IMPLANTACIÓN O MODIFICACIÓN DE SERVIDUMBRE DE AGUA  FORZOSA",
  "TUPA - AUTORIZACIÓN PARA LA EJECUCIÓN DE OBRAS EN FUENTE NATURAL DE AGUA O EN LA INFRAESTRUCTURA HIDRÁULICA MULTISECTORIAL",
  ["TUPA - AUTORIZACIÓN PARA LA EJECUCIÓN DE OBRAS EN FUENTES NATURALES DE AGUA O EN LA INFRAESTRUCTURA HIDRÁULICA MULTISECTORIAL", ["Autorizar la ejecución de obras mínimas", "Ejecución de obras en fuente natural", "autorización de uso de fuentes de agua", "ejecución de obras", "fuente natural"]],
  "TUPA - AUTORIZACIÓN DE EJECUCIÓN DE ESTUDIOS DE APROVECHAMIENTO HÍDRICO PARA OBTENCIÓN DE LICENCIA DE USO DE AGUA SUPERFICIAL O SUBTERRÁNEA",
  ["TUPA - AUTORIZACIÓN DE EJECUCIÓN DE ESTUDIOS DE AGUAS SUBTERRÁNEAS PARA LA OBTENCIÓN DE LICENCIA DE USO DE AGUA SUBTERRÁNEA, CON PERFORACIÓN", ["ejecución de estudios de aprovechamiento hídricos"]],
  ["TUPA - APROBACIÓN DE ESTUDIOS DE APROVECHAMIENTO DE  RECURSOS HÍDRICOS PARA LA OBTENCIÓN DE LA LICENCIA DE USO DE AGUA SUBTERRÁNEA O SUPERFICIAL. (ACREDITACIÓN DE DISPONIBILIDAD HÍDRICA)", ["Acreditar la disponibilidad hídrica", "Aprobación de estudios de aprovechamiento", "acreditación de disponibilidad hídrica"]],
  ["TUPA - AUTORIZACIÓN PARA LA EJECUCIÓN DE OBRAS DE APROVECHAMIENTO HÍDRICO PARA LA OBTENCIÓN DE LICENCIA DE USO DE AGUA SUPERFICIAL", ["ejecución de obras de aprovechamiento hídrico"]],
  "TUPA - AUTORIZACIÓN PARA LA EJECUCIÓN DE OBRAS DE ALUMBRAMIENTO DE AGUA SUBTERRÁNEA PARA LA OBTENCIÓN DE LA LICENCIA DE USO DE AGUA SUBTERRÁNEA",
  ["TUPA - OTORGAMIENTO DE LICENCIA DE USO DE AGUA SUPERFICIAL O SUBTERRÁNEA", "licencia de uso de agua"],
  ["TUPA - EXTINCIÓN Y OTORGAMIENTO DE LICENCIA DE USO DE AGUA POR CAMBIO DE TITULAR", ["extinción del derecho de uso de agua", "Extinguir, por la causal de renuncia del titular"]],
  "TUPA - AUTORIZACIÓN DE REUSO DE AGUAS RESIDUALES INDUSTRIALES, MUNICIPALES Y DOMÉSTICAS TRATADAS",
  ["P.A.S", ["P.A.S", "Responsabilidad Administrativa", "procedimiento administrativo sancionador"]],
  ["APROBAR LA DELIMITACIÓN DE FAJAS MARGINALES", ["Aprobar la Delimitación", "Delimitación de fajas marginales"]],
  ["AUTORIZACIÓN DE USOS TEMPORALES", ["Uso temporal", "Autorización de usos temporales"]],
  "APROBAR LOS PLANES DE DESCARGA DE LAS PRESAS DE REGULACIÓN",
  "MODIFICACIÓN DE LICENCIA DE USO DE AGUA",
];

const CAUSAS_OTROS = ["improcedente", "abandono del procedimiento", "desistimiento", "modificar la resolución", "declarar de oficio", "no responsable", "integrar lo contenido", "disponer el archivo", "estudios de ejecucion de obras"];
const PROCEDIMIENTO_FUENTES_NATURALES = "TUPA - AUTORIZACIÓN PARA LA EJECUCIÓN DE OBRAS EN FUENTES NATURALES DE AGUA O EN LA INFRAESTRUCTURA HIDRÁULICA MULTISECTORIAL";
const TERMINOS_FUENTES_NATURALES = ["ejecucion de obras", "fuente natural", "bienes naturales"];

// Minúsculas y sin tildes: el texto del reporte a veces viene sin tildes ("EJECUCION") y las palabras clave con tildes.
const clave = (texto: string) => texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// Procedimiento según el texto del asunto del trámite.
export const procedimientoDe = (asunto: string): string => {
  const minusculas = clave(asunto);
  if (CAUSAS_OTROS.some((causa) => minusculas.includes(clave(causa)))) return "OTROS";

  const normalizado = minusculas.split(/\s+/).filter(Boolean).join(" ");
  for (const proc of PROCEDIMIENTOS) {
    if (typeof proc === "string") {
      if (normalizado.includes(clave(proc))) return proc;
      continue;
    }
    const [nombre, criterio] = proc;
    if (typeof criterio === "string") {
      if (normalizado.includes(clave(criterio))) return nombre;
      continue;
    }
    if (nombre === PROCEDIMIENTO_FUENTES_NATURALES) {
      // Se exige "ejecución de obras" junto con una de las formas de "fuente natural".
      if (normalizado.includes(clave("ejecución de obras")) && ["fuente natural", "fuentes naturales", "bienes naturales"].some((t) => normalizado.includes(clave(t)))) return nombre;
      const otros = criterio.filter((t) => !TERMINOS_FUENTES_NATURALES.includes(clave(t)));
      if (otros.some((t) => normalizado.includes(clave(t)))) return nombre;
      continue;
    }
    if (criterio.some((t) => normalizado.includes(clave(t)))) return nombre;
  }
  return "No coincide";
};

const aTexto = (valor: unknown) => (valor === undefined || valor === null ? "" : String(valor));

// Devuelve la tabla combinada (encabezado + filas) lista para exportar.
export function combinarReporte(reporte: unknown[][], resultados: unknown[][]): unknown[][] {
  const encabezado = (reporte[0] ?? []).map(aTexto);
  const colCut = encabezado.findIndex((h) => h.trim().toLowerCase() === "nro cut");
  if (colCut < 0) throw new Error('El reporte debe tener la columna "Nro CUT"');
  // El asunto es respaldo: si el contenido no permite elegir procedimiento, se revisa aquí.
  const colAsunto = encabezado.findIndex((h) => h.trim().toLowerCase() === "asunto");

  // Por CUT: ALA, Administrado, Contenido y Fecha. Si un CUT se repite, queda el último, como en el script.
  const porCut = new Map<string, string[]>();
  for (const fila of resultados.slice(1)) {
    const cut = aTexto(fila[3]).trim();
    if (cut) porCut.set(cut, [aTexto(fila[4]), aTexto(fila[5]), aTexto(fila[6]), aTexto(fila[2])]);
  }

  const ancho = Math.max(encabezado.length, ...reporte.map((f) => f.length));
  const ajustar = (fila: unknown[]) => Array.from({ length: ancho }, (_, i) => fila[i] ?? "");

  const filas = reporte
    .slice(1)
    .filter((fila) => fila.some((v) => aTexto(v).trim() !== "") && aTexto(fila[colCut]).trim().toLowerCase() !== "nro cut")
    .map((fila) => {
      const datos = porCut.get(aTexto(fila[colCut]).trim()) ?? ["", "", "", ""];
      // El procedimiento se busca en el contenido del artículo primero (lo que decide la resolución), como la columna K del script.
      // Si el contenido no basta, se busca en el asunto del trámite.
      const contenido = datos[2];
      const asunto = colAsunto >= 0 ? aTexto(fila[colAsunto]) : "";
      let procedimiento = contenido.trim() ? procedimientoDe(contenido) : "No coincide";
      if (procedimiento === "No coincide" && asunto.trim()) procedimiento = procedimientoDe(asunto);
      return [...ajustar(fila), datos[0], datos[1], datos[2], procedimiento, datos[3]];
    });

  const nuevosEncabezados = ["Nuevo Dato 1", "Nuevo Dato 2", "Nuevo Dato 3", "Procedimiento", "Fecha de Resolución"];
  return [[...ajustar(encabezado), ...nuevosEncabezados], ...filas];
}

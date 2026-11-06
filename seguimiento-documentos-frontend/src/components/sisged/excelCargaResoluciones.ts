// Excel de carga a partir del Reporte_actualizado_final (reglas 1 a 9).
// Hoja2 (entrada), columnas por letra: A CUT, B N° Documento, C Asunto, I ALA, J Administrado,
// K Contenido, L Procedimiento, M Fecha de la resolución.

// Catálogo A (Procedimiento -> código).
const CATALOGO_PROCEDIMIENTOS: [string, number][] = [
  ["OTROS", 1],
  ["TUPA - AUTORIZACIÓN DE USO DE AGUA", 3],
  ["TUPA - IMPLANTACIÓN O MODIFICACIÓN DE SERVIDUMBRE DE AGUA FORZOSA", 5],
  ["TUPA - AUTORIZACIÓN DE ESTUDIOS PARA LA EJECUCIÓN DE OBRAS EN FUENTE NATURAL DE AGUA O EN LA INFRAESTRUCTURA HIDRÁULICA MULTISECTORIAL", 8],
  ["TUPA - AUTORIZACIÓN PARA LA EJECUCIÓN DE OBRAS EN FUENTES NATURALES DE AGUA O EN LA INFRAESTRUCTURA HIDRÁULICA MULTISECTORIAL", 9],
  ["TUPA - AUTORIZACIÓN DE EJECUCIÓN DE ESTUDIOS DE APROVECHAMIENTO HÍDRICO PARA OBTENCIÓN DE LICENCIA DE USO DE AGUA SUPERFICIAL O SUBTERRÁNEA", 12],
  ["TUPA - AUTORIZACIÓN DE EJECUCIÓN DE ESTUDIOS DE AGUAS SUBTERRÁNEAS PARA LA OBTENCIÓN DE LICENCIA DE USO DE AGUA SUBTERRÁNEA, CON PERFORACIÓN", 13],
  ["TUPA - APROBACIÓN DE ESTUDIOS DE APROVECHAMIENTO DE RECURSOS HÍDRICOS PARA LA OBTENCIÓN DE LA LICENCIA DE USO DE AGUA SUBTERRÁNEA O SUPERFICIAL. (ACREDITACIÓN DE DISPONIBILIDAD HÍDRICA)", 14],
  ["TUPA - AUTORIZACIÓN PARA LA EJECUCIÓN DE OBRAS DE APROVECHAMIENTO HÍDRICO PARA LA OBTENCIÓN DE LICENCIA DE USO DE AGUA SUPERFICIAL", 15],
  ["TUPA - AUTORIZACIÓN PARA LA EJECUCIÓN DE OBRAS DE ALUMBRAMIENTO DE AGUA SUBTERRÁNEA PARA LA OBTENCIÓN DE LA LICENCIA DE USO DE AGUA SUBTERRÁNEA", 16],
  ["TUPA - OTORGAMIENTO DE LICENCIA DE USO DE AGUA SUPERFICIAL O SUBTERRÁNEA", 17],
  ["TUPA - EXTINCIÓN Y OTORGAMIENTO DE LICENCIA DE USO DE AGUA POR CAMBIO DE TITULAR", 18],
  ["TUPA - AUTORIZACIÓN DE REUSO DE AGUAS RESIDUALES INDUSTRIALES, MUNICIPALES Y DOMÉSTICAS TRATADAS", 23],
  ["P.A.S", 25],
  ["APROBAR LA DELIMITACIÓN DE FAJAS MARGINALES", 26],
  ["AUTORIZACIÓN DE USOS TEMPORALES", 27],
  ["APROBAR LOS PLANES DE DESCARGA DE LAS PRESAS DE REGULACIÓN", 28],
  ["MODIFICACIÓN DE LICENCIA DE USO DE AGUA", 30],
];

// Catálogo B (Abreviatura de sede -> código).
const CATALOGO_ALA: [string, number][] = [
  ["ALA.PUC", 5],
  ["ALA.PE", 6],
  ["ALA.TAR", 7],
  ["ALA.ATA", 8],
  ["OTROS", 27],
];

const MESES: Record<string, string> = {
  enero: "01", febrero: "02", marzo: "03", abril: "04", mayo: "05", junio: "06",
  julio: "07", agosto: "08", setiembre: "09", septiembre: "09", octubre: "10",
  noviembre: "11", diciembre: "12",
};

const aTexto = (valor: unknown) => (valor === undefined || valor === null ? "" : String(valor));

// Para comparar catálogos: sin tildes, sin mayúsculas y con espacios simples.
const clave = (texto: string) => texto.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim().toLowerCase();

const buscarCodigo = (catalogo: [string, number][], valor: string) => {
  const buscado = clave(valor);
  const fila = catalogo.find(([nombre]) => clave(nombre) === buscado);
  return fila ? String(fila[1]) : "";
};

// "15 de octubre de 2026" -> { ddmmyyyy: "15/10/2026", iso: "2026-10-15" }; vacío si no se puede leer.
const convertirFecha = (texto: string) => {
  const partes = texto.trim().replace(/\s+de\s+/gi, "/").split("/");
  if (partes.length !== 3) return { ddmmyyyy: "", iso: "" };
  const [dia, mesNombre, anio] = partes;
  const mes = MESES[clave(mesNombre)];
  if (!mes || !/^\d{1,2}$/.test(dia.trim()) || !/^\d{4}$/.test(anio.trim())) return { ddmmyyyy: "", iso: "" };
  const d = dia.trim().padStart(2, "0");
  const y = anio.trim();
  return { ddmmyyyy: `${d}/${mes}/${y}`, iso: `${y}-${mes}-${d}` };
};

// Filas de salida (encabezado + una por documento), según las reglas 1 a 9.
export function generarFilasCarga(hoja2: unknown[][]): unknown[][] {
  const encabezado = ["Número de resolución", "Código (antes del guion)", "Sufijo (después del guion)", "Año de la resolución", "Fecha DD/MM/YYYY", "Fecha YYYY-MM-DD", "Procedimiento", "Código procedimiento", "Contenido", "ALA", "Código ALA", "Asunto + Administrado (HTML)"];

  const filas = hoja2.slice(1).map((fila) => {
    const celda = (letra: string) => aTexto(fila[letra.charCodeAt(0) - 65]).trim();

    // Regla 1: texto después de "RESOLUCION DIRECTORAL N° " (columna B).
    const coincidencia = celda("B").match(/RESOLUCION DIRECTORAL N°\s*(.*)$/i);
    const numero = coincidencia ? coincidencia[1].trim() : "";

    // Reglas 2 y 3: antes y después del primer guion (columna A).
    const cut = celda("A");
    const guion = cut.indexOf("-");
    const prefijo = guion >= 0 ? cut.slice(0, guion) : "";
    const sufijo = guion >= 0 ? cut.slice(guion + 1) : "";

    // Reglas 4 y 5: fecha de la resolución (columna M).
    const fecha = convertirFecha(celda("M"));

    // Año de la resolución: el número de cuatro cifras de "0857-2026-ANA-AAA.U".
    const anio = numero.match(/-(\d{4})-/)?.[1] ?? "";

    // Reglas 6 a 9 (la regla 9 une el asunto, columna C, y el administrado, columna J, del reporte).
    const procedimiento = celda("L");
    const ala = celda("I");
    return [
      numero,
      prefijo,
      sufijo,
      anio,
      fecha.ddmmyyyy,
      fecha.iso,
      procedimiento,
      buscarCodigo(CATALOGO_PROCEDIMIENTOS, procedimiento),
      // Se quita el ".-" o ".–" que abre el artículo, por si el análisis es anterior a ese cambio.
      celda("K").replace(/^\s*\.\s*[-–—]\s*/, ""),
      ala,
      buscarCodigo(CATALOGO_ALA, ala),
      `${celda("C")}<br>${celda("J")}`,
    ];
  });

  return [encabezado, ...filas.filter((f) => f.some((v) => aTexto(v).trim() !== ""))];
}

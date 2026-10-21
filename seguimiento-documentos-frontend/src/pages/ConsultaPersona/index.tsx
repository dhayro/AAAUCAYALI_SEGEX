import SearchableSelect from "@/components/form/SearchableSelect";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import ReporteTabla, { type Columna } from "@/components/reportes/ReporteTabla";
import { formatFecha, formatFechaHora } from "@/components/expedientes/format";
import api from "@/utils/api";
import { useCallback, useEffect, useMemo, useState } from "react";

interface UsuarioOpcion {
  id: number;
  nombre: string;
  cargo?: string | null;
}

const formatoHoras = (horas: number | null) => {
  if (horas === null || horas === undefined) return "—";
  const dias = Math.floor(horas / 24);
  const resto = Math.round(horas - dias * 24);
  return dias > 0 ? `${dias} d ${resto} h` : `${Math.round(horas)} h`;
};

const textoFaltante = (dias: number | null) => {
  if (dias === null) return "—";
  if (dias < 0) return `Vencida hace ${-dias} d`;
  if (dias === 0) return "Vence hoy";
  return `Le faltan ${dias} d`;
};

const ESTADO_ASIG: Record<string, string> = {
  SIN_RESPUESTA: "Sin respuesta",
  POR_EVALUAR: "Por evaluar",
  RESPONDIDA: "Respondida",
  OBSERVADA: "Observada",
  CERRADA: "Cerrada",
};

const SITUACION: Record<string, string> = {
  RESPONDIDA: "Respondida",
  VENCIDA: "Vencida",
  POR_VENCER: "Por vencer",
  EN_PLAZO: "En plazo",
  SIN_PLAZO: "Sin plazo",
};

const COLUMNAS_ASIGNACIONES: Columna[] = [
  { titulo: "CUT", celda: (f) => <span className="font-medium">{f.cut}</span>, excel: (f) => f.cut },
  { titulo: "Asignación", align: "center", celda: (f) => formatFecha(f.fecha_asignacion), excel: (f) => formatFecha(f.fecha_asignacion) },
  { titulo: "Vence", align: "center", celda: (f) => formatFecha(f.vence), excel: (f) => formatFecha(f.vence) },
  { titulo: "Respuestas", align: "center", celda: (f) => f.total_respuestas, excel: (f) => f.total_respuestas },
  { titulo: "Estado", celda: (f) => ESTADO_ASIG[f.estado_respuesta] ?? f.estado_respuesta, excel: (f) => ESTADO_ASIG[f.estado_respuesta] ?? f.estado_respuesta },
  {
    titulo: "Tiempo",
    celda: (f) =>
      f.total_respuestas > 0 && f.tiempo_respuesta_horas !== null
        ? `Respondió en ${formatoHoras(f.tiempo_respuesta_horas)}`
        : f.estado_respuesta === "CERRADA"
        ? "Cerrada"
        : textoFaltante(f.dias_restantes),
    excel: (f) =>
      f.total_respuestas > 0 && f.tiempo_respuesta_horas !== null
        ? `Respondió en ${formatoHoras(f.tiempo_respuesta_horas)}`
        : textoFaltante(f.dias_restantes),
  },
  {
    titulo: "Última respuesta",
    align: "center",
    celda: (f) => (f.ultima_respuesta ? formatFechaHora(f.ultima_respuesta) : "—"),
    excel: (f) => (f.ultima_respuesta ? formatFechaHora(f.ultima_respuesta) : ""),
  },
];

const COLUMNAS_LLAMADAS: Columna[] = [
  { titulo: "Fecha", celda: (f) => formatFechaHora(f.fecha_llamada), excel: (f) => formatFechaHora(f.fecha_llamada) },
  { titulo: "CUT", celda: (f) => <span className="font-medium">{f.cut}</span>, excel: (f) => f.cut },
  { titulo: "Quien llamó", celda: (f) => f.nombre_llamante, excel: (f) => f.nombre_llamante },
  {
    titulo: "Motivo",
    celda: (f) => (
      <span className="block max-w-xs truncate" title={f.motivo}>
        {f.motivo}
      </span>
    ),
    excel: (f) => f.motivo,
  },
  { titulo: "Responsable", celda: (f) => f.responsable, excel: (f) => f.responsable },
  { titulo: "Límite", align: "center", celda: (f) => formatFecha(f.fecha_limite), excel: (f) => formatFecha(f.fecha_limite) },
  { titulo: "Situación", celda: (f) => SITUACION[f.situacion] ?? f.situacion, excel: (f) => SITUACION[f.situacion] ?? f.situacion },
  {
    titulo: "Tiempo",
    celda: (f) =>
      f.respondido
        ? f.tiempo_respuesta_horas !== null
          ? `Respondió en ${formatoHoras(f.tiempo_respuesta_horas)}`
          : "Respondida"
        : textoFaltante(f.dias_restantes),
    excel: (f) =>
      f.respondido
        ? f.tiempo_respuesta_horas !== null
          ? `Respondió en ${formatoHoras(f.tiempo_respuesta_horas)}`
          : "Respondida"
        : textoFaltante(f.dias_restantes),
  },
  { titulo: "Acciones pendientes", align: "center", celda: (f) => f.acciones_pendientes, excel: (f) => f.acciones_pendientes },
];

// Consulta por persona: asignaciones de una persona, o consulta de llamadas filtrables por responsable, quien llamó, CUT y fecha.
export default function ConsultaPersona() {
  const [usuarios, setUsuarios] = useState<UsuarioOpcion[]>([]);
  const [persona, setPersona] = useState<number | "">("");
  const [tab, setTab] = useState<"asignaciones" | "llamadas">("asignaciones");
  const [quienLlamo, setQuienLlamo] = useState("");

  const fetchUsuarios = useCallback(async (filtro = "") => {
    try {
      const res = await api.get("/usuarios/select", { params: filtro ? { filtro } : {} });
      setUsuarios(Array.isArray(res.data) ? res.data : []);
    } catch {
      setUsuarios([]);
    }
  }, []);

  useEffect(() => {
    fetchUsuarios();
  }, [fetchUsuarios]);

  const etiqueta = (u: UsuarioOpcion) => (u.cargo ? `${u.nombre} (${u.cargo})` : u.nombre);
  const seleccionada = usuarios.find((u) => u.id === persona);

  const paramsAsignaciones = useMemo(() => ({ id_usuario: String(persona) }), [persona]);
  const paramsLlamadas = useMemo(() => {
    const params: Record<string, string> = {};
    if (persona !== "") params.id_responsable = String(persona);
    if (quienLlamo.trim()) params.nombre_llamante = quienLlamo.trim();
    return params;
  }, [persona, quienLlamo]);

  const pestana = (valor: "asignaciones" | "llamadas", texto: string) => (
    <button
      onClick={() => setTab(valor)}
      className={`rounded-lg px-4 py-2 text-sm font-semibold ${
        tab === valor ? "bg-brand-600 text-white" : "bg-white text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-600"
      }`}
    >
      {texto}
    </button>
  );

  const sinPersonaEnAsignaciones = tab === "asignaciones" && persona === "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Consulta por persona</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Revise las asignaciones de una persona o consulte llamadas por quien llamó, el CUT, la fecha o el responsable
        </p>
      </div>

      <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
        <Label>{tab === "llamadas" ? "Responsable (opcional)" : "Persona"}</Label>
        <div className="flex items-center gap-2">
          <div className="flex-1 md:max-w-xl">
            <SearchableSelect
              value={persona}
              onChange={(valor) => setPersona(valor === "" ? "" : Number(valor))}
              options={usuarios.map((u) => ({ id: u.id, nombre: etiqueta(u) }))}
              onSearch={(termino) => fetchUsuarios(termino)}
              placeholder="Buscar persona..."
              selectedLabel={seleccionada ? etiqueta(seleccionada) : ""}
            />
          </div>
          {persona !== "" && (
            <button
              onClick={() => setPersona("")}
              className="shrink-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
            >
              Quitar
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        {pestana("asignaciones", "Asignaciones")}
        {pestana("llamadas", "Llamadas")}
      </div>

      {sinPersonaEnAsignaciones ? (
        <div className="rounded-lg bg-white p-12 text-center text-gray-500 shadow dark:bg-gray-800">
          Seleccione una persona para ver sus asignaciones
        </div>
      ) : tab === "asignaciones" ? (
        <ReporteTabla
          key={`asig-${persona}`}
          titulo={`Asignaciones de ${seleccionada ? etiqueta(seleccionada) : ""}`}
          descripcion="Expedientes asignados a esta persona, con su respuesta y tiempo de atención"
          endpoint="/reportes/asignaciones"
          nombreArchivo="Consulta-Asignaciones"
          columnas={COLUMNAS_ASIGNACIONES}
          paramsExtra={paramsAsignaciones}
          textoAccion="Consultar"
          anchoMinimo={1000}
        />
      ) : (
        <ReporteTabla
          key="llamadas"
          titulo="Consulta de llamadas"
          descripcion="Llamadas de administrados, con su plazo y su tiempo de respuesta. Filtre por rango de fechas, quien llamó, CUT o responsable"
          endpoint="/reportes/llamadas"
          nombreArchivo="Consulta-Llamadas"
          columnas={COLUMNAS_LLAMADAS}
          conCut
          textoAccion="Consultar"
          paramsExtra={paramsLlamadas}
          filtrosExtra={
            <div className="min-w-[220px] flex-1">
              <Label>Quien llamó</Label>
              <Input value={quienLlamo} onChange={(e) => setQuienLlamo(e.target.value)} placeholder="Nombre de quien llamó" />
            </div>
          }
          anchoMinimo={1200}
        />
      )}
    </div>
  );
}

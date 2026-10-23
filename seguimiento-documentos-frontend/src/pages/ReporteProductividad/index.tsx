import ReporteTabla, { type Columna } from "@/components/reportes/ReporteTabla";
import { perfilActual } from "@/utils/sesion";

const NIVEL_CLASES: Record<string, string> = {
  Excelente: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
  Bueno: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
  Regular: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100",
  Deficiente: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
  "Sin datos": "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200",
};

// Solo admin y jefe ven la evaluación del desempeño.
const columnasEvaluacion: Columna[] = [
  { titulo: "Cumplimiento a tiempo", align: "center", celda: (f) => (f.cumplimiento_pct != null ? `${f.cumplimiento_pct}%` : "—"), excel: (f) => (f.cumplimiento_pct != null ? `${f.cumplimiento_pct}%` : "") },
  { titulo: "Calidad", align: "center", celda: (f) => (f.calidad_pct != null ? `${f.calidad_pct}%` : "—"), excel: (f) => (f.calidad_pct != null ? `${f.calidad_pct}%` : "") },
  { titulo: "Llamadas a tiempo", align: "center", celda: (f) => (f.llamadas_pct != null ? `${f.llamadas_pct}%` : "—"), excel: (f) => (f.llamadas_pct != null ? `${f.llamadas_pct}%` : "") },
  {
    titulo: "Evaluación",
    align: "center",
    celda: (f) => (
      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${NIVEL_CLASES[f.evaluacion_nivel] ?? ""}`}>
        {f.evaluacion_puntaje != null ? `${f.evaluacion_puntaje} · ` : ""}{f.evaluacion_nivel ?? "Sin datos"}
      </span>
    ),
    excel: (f) => (f.evaluacion_puntaje != null ? `${f.evaluacion_puntaje} (${f.evaluacion_nivel})` : "Sin datos"),
  },
];

const formatoHoras = (horas: number | null) => {
  if (horas === null || horas === undefined) return "—";
  const dias = Math.floor(horas / 24);
  const resto = Math.round(horas - dias * 24);
  return dias > 0 ? `${dias} d ${resto} h` : `${Math.round(horas)} h`;
};

const columnas: Columna[] = [
  {
    titulo: "Persona",
    celda: (f) => (
      <>
        <div className="font-semibold">{f.nombre}</div>
        {f.cargo && <div className="text-xs text-gray-500">{f.cargo}</div>}
      </>
    ),
    excel: (f) => (f.cargo ? `${f.nombre} (${f.cargo})` : f.nombre),
  },
  { titulo: "Asignaciones", align: "center", celda: (f) => f.asignaciones, excel: (f) => f.asignaciones },
  { titulo: "Cerradas", align: "center", celda: (f) => f.cerradas, excel: (f) => f.cerradas },
  { titulo: "Reasignadas", align: "center", celda: (f) => f.reasignadas ?? 0, excel: (f) => f.reasignadas ?? 0 },
  { titulo: "Observadas", align: "center", celda: (f) => f.observadas, excel: (f) => f.observadas },
  { titulo: "Sin respuesta", align: "center", celda: (f) => f.sin_respuesta, excel: (f) => f.sin_respuesta },
  {
    titulo: "Vencidas",
    align: "center",
    celda: (f) => <span className={f.vencidas > 0 ? "font-semibold text-red-600 dark:text-red-400" : ""}>{f.vencidas}</span>,
    excel: (f) => f.vencidas,
  },
  {
    titulo: "Tiempo promedio de respuesta",
    align: "center",
    celda: (f) => formatoHoras(f.tiempo_promedio_horas),
    excel: (f) => formatoHoras(f.tiempo_promedio_horas),
  },
  { titulo: "Llamadas", align: "center", celda: (f) => f.llamadas, excel: (f) => f.llamadas },
  { titulo: "Presenciales", align: "center", celda: (f) => f.presenciales ?? 0, excel: (f) => f.presenciales ?? 0 },
  { titulo: "Llamadas respondidas", align: "center", celda: (f) => f.llamadas_respondidas, excel: (f) => f.llamadas_respondidas },
  {
    titulo: "Llamadas vencidas",
    align: "center",
    celda: (f) => <span className={f.llamadas_vencidas > 0 ? "font-semibold text-red-600 dark:text-red-400" : ""}>{f.llamadas_vencidas}</span>,
    excel: (f) => f.llamadas_vencidas,
  },
];

export default function ReporteProductividad() {
  const verEvaluacion = ["admin", "jefe"].includes(perfilActual() ?? "");
  return (
    <ReporteTabla
      titulo="Productividad por persona"
      descripcion="Asignaciones, cierres, vencimientos, tiempo de respuesta y llamadas atendidas por cada persona"
      endpoint="/reportes/productividad"
      nombreArchivo="Reporte-Productividad"
      columnas={verEvaluacion ? [...columnas, ...columnasEvaluacion] : columnas}
      anchoMinimo={1200}
      indicadores={[
        { titulo: "Personas", clave: "personas" },
        { titulo: "Asignaciones", clave: "asignaciones" },
        { titulo: "Cerradas", clave: "cerradas", tono: "text-green-600 dark:text-green-400" },
        { titulo: "Observadas", clave: "observadas", tono: "text-amber-600 dark:text-amber-400" },
        { titulo: "Vencidas", clave: "vencidas", tono: "text-red-600 dark:text-red-400" },
        { titulo: "Llamadas respondidas", clave: "llamadas_respondidas", tono: "text-green-600 dark:text-green-400" },
      ]}
    />
  );
}

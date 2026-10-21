import ReporteTabla, { type Columna } from "@/components/reportes/ReporteTabla";
import { formatFechaHora } from "@/components/expedientes/format";

const columnas: Columna[] = [
  { titulo: "CUT", celda: (f) => <span className="font-medium">{f.cut}</span>, excel: (f) => f.cut },
  {
    titulo: "Asunto",
    celda: (f) => (
      <span className="block max-w-md truncate" title={f.asunto}>
        {f.asunto || "—"}
      </span>
    ),
    excel: (f) => f.asunto,
  },
  {
    titulo: "Procedimiento",
    celda: (f) => (
      <span className="block max-w-xs truncate" title={f.procedimiento}>
        {f.procedimiento || "—"}
      </span>
    ),
    excel: (f) => f.procedimiento,
  },
  {
    titulo: "Fecha de registro",
    align: "center",
    celda: (f) => (f.fecha_registro ? formatFechaHora(f.fecha_registro) : "—"),
    excel: (f) => (f.fecha_registro ? formatFechaHora(f.fecha_registro) : ""),
  },
  {
    titulo: "Días sin asignar",
    align: "center",
    celda: (f) => (
      <span className={f.dias_sin_asignar > 5 ? "font-semibold text-amber-700 dark:text-amber-300" : ""}>
        {f.dias_sin_asignar ?? "—"}
      </span>
    ),
    excel: (f) => f.dias_sin_asignar,
  },
];

export default function ReporteExpedientesSinAsignar() {
  return (
    <ReporteTabla
      titulo="Expedientes sin asignar"
      descripcion="Expedientes registrados en el sistema que todavía no tienen asignación activa"
      endpoint="/reportes/expedientes-sin-asignar"
      nombreArchivo="Reporte-Expedientes-Sin-Asignar"
      columnas={columnas}
      anchoMinimo={1100}
      indicadores={[{ titulo: "Sin asignar", clave: "total", tono: "text-amber-600 dark:text-amber-400" }]}
    />
  );
}

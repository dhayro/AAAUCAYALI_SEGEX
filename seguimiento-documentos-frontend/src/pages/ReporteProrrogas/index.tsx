import ReporteTabla, { type Columna } from "@/components/reportes/ReporteTabla";
import { formatFecha, formatFechaHora } from "@/components/expedientes/format";
import Label from "@/components/form/Label";
import { useMemo, useState } from "react";

const ESTADO: Record<string, { texto: string; clases: string }> = {
  PENDIENTE: { texto: "Pendiente", clases: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100" },
  ACEPTADA: { texto: "Aceptada", clases: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" },
  RECHAZADA: { texto: "Rechazada", clases: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100" },
};

const columnas: Columna[] = [
  { titulo: "CUT", celda: (f) => <span className="font-medium">{f.cut}</span>, excel: (f) => f.cut },
  {
    titulo: "Asignado a",
    celda: (f) => (
      <>
        <div>{f.asignado}</div>
        {f.cargo && <div className="text-xs text-gray-500">{f.cargo}</div>}
      </>
    ),
    excel: (f) => f.asignado,
  },
  { titulo: "Solicitud", align: "center", celda: (f) => formatFecha(f.fecha_solicitud), excel: (f) => formatFecha(f.fecha_solicitud) },
  { titulo: "Días pedidos", align: "center", celda: (f) => f.plazo_prorroga, excel: (f) => f.plazo_prorroga },
  {
    titulo: "Motivo",
    celda: (f) => (
      <span className="block max-w-xs truncate" title={f.motivo}>
        {f.motivo || "—"}
      </span>
    ),
    excel: (f) => f.motivo,
  },
  {
    titulo: "Estado",
    celda: (f) => (
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${ESTADO[f.estado]?.clases ?? ""}`}>
        {ESTADO[f.estado]?.texto ?? f.estado}
      </span>
    ),
    excel: (f) => ESTADO[f.estado]?.texto ?? f.estado,
  },
  { titulo: "Solicitada por", celda: (f) => f.solicitada_por || "—", excel: (f) => f.solicitada_por },
  { titulo: "Vence original", align: "center", celda: (f) => formatFecha(f.vence_original), excel: (f) => formatFecha(f.vence_original) },
  { titulo: "Vence con prórroga", align: "center", celda: (f) => formatFecha(f.vence_nueva), excel: (f) => formatFecha(f.vence_nueva) },
  { titulo: "Revisada por", celda: (f) => f.revisada_por || "—", excel: (f) => f.revisada_por },
  {
    titulo: "Fecha de revisión",
    align: "center",
    celda: (f) => (f.fecha_revision ? formatFechaHora(f.fecha_revision) : "—"),
    excel: (f) => (f.fecha_revision ? formatFechaHora(f.fecha_revision) : ""),
  },
];

export default function ReporteProrrogas() {
  const [estado, setEstado] = useState("");
  const paramsExtra = useMemo<Record<string, string>>(() => {
    const params: Record<string, string> = {};
    if (estado) params.estado = estado;
    return params;
  }, [estado]);

  return (
    <ReporteTabla
      titulo="Prórrogas"
      descripcion="Solicitudes de prórroga, quién las pidió, quién las revisó y el nuevo vencimiento"
      endpoint="/reportes/prorrogas"
      nombreArchivo="Reporte-Prorrogas"
      columnas={columnas}
      anchoMinimo={1300}
      paramsExtra={paramsExtra}
      filtrosExtra={
        <div>
          <Label>Estado</Label>
          <select
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
            className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700"
          >
            <option value="">Todas</option>
            <option value="PENDIENTE">Pendientes</option>
            <option value="ACEPTADA">Aceptadas</option>
            <option value="RECHAZADA">Rechazadas</option>
          </select>
        </div>
      }
      indicadores={[
        { titulo: "Prórrogas", clave: "total" },
        { titulo: "Pendientes", clave: "pendientes", tono: "text-amber-600 dark:text-amber-400" },
        { titulo: "Aceptadas", clave: "aceptadas", tono: "text-green-600 dark:text-green-400" },
        { titulo: "Rechazadas", clave: "rechazadas", tono: "text-red-600 dark:text-red-400" },
      ]}
    />
  );
}

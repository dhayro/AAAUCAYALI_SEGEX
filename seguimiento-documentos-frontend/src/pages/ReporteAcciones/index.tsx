import ReporteTabla, { type Columna } from "@/components/reportes/ReporteTabla";

const columnas: Columna[] = [
  { titulo: "Tipo de acción", celda: (f) => <span className="font-medium">{f.accion}</span>, excel: (f) => f.accion },
  { titulo: "Total", align: "center", celda: (f) => f.total, excel: (f) => f.total },
  {
    titulo: "Ejecutadas",
    align: "center",
    celda: (f) => <span className="text-green-700 dark:text-green-300">{f.ejecutadas}</span>,
    excel: (f) => f.ejecutadas,
  },
  {
    titulo: "Pendientes",
    align: "center",
    celda: (f) => <span className={f.pendientes > 0 ? "font-semibold text-amber-700 dark:text-amber-300" : ""}>{f.pendientes}</span>,
    excel: (f) => f.pendientes,
  },
  { titulo: "Con archivo", align: "center", celda: (f) => f.con_archivo, excel: (f) => f.con_archivo },
  {
    titulo: "Avance",
    align: "center",
    celda: (f) => (f.total ? `${Math.round((f.ejecutadas / f.total) * 100)}%` : "—"),
    excel: (f) => (f.total ? `${Math.round((f.ejecutadas / f.total) * 100)}%` : ""),
  },
];

export default function ReporteAcciones() {
  return (
    <ReporteTabla
      titulo="Acciones de llamada"
      descripcion="Cuántas acciones de cada tipo se registraron en las llamadas, cuántas se ejecutaron y cuántas siguen pendientes"
      endpoint="/reportes/acciones"
      nombreArchivo="Reporte-Acciones"
      columnas={columnas}
      anchoMinimo={900}
      indicadores={[
        { titulo: "Acciones", clave: "total" },
        { titulo: "Ejecutadas", clave: "ejecutadas", tono: "text-green-600 dark:text-green-400" },
        { titulo: "Pendientes", clave: "pendientes", tono: "text-amber-600 dark:text-amber-400" },
        { titulo: "Con archivo", clave: "con_archivo" },
      ]}
    />
  );
}

import ReporteTabla, { type Columna } from "@/components/reportes/ReporteTabla";

const columnas: Columna[] = [
  { titulo: "Indicador", celda: (f) => <span className="font-medium">{f.indicador}</span>, excel: (f) => f.indicador },
  {
    titulo: "Valor",
    align: "center",
    celda: (f) => <span className="text-lg font-bold">{f.valor}</span>,
    excel: (f) => f.valor,
  },
];

export default function ReporteResumen() {
  return (
    <ReporteTabla
      titulo="Resumen del periodo"
      descripcion="Indicadores clave de asignaciones, prórrogas, llamadas y acciones en el rango de fechas"
      endpoint="/reportes/resumen"
      nombreArchivo="Reporte-Resumen"
      columnas={columnas}
      anchoMinimo={600}
    />
  );
}

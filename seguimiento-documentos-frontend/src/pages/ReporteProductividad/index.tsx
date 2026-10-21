import ReporteTabla, { type Columna } from "@/components/reportes/ReporteTabla";

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
  { titulo: "Llamadas respondidas", align: "center", celda: (f) => f.llamadas_respondidas, excel: (f) => f.llamadas_respondidas },
  {
    titulo: "Llamadas vencidas",
    align: "center",
    celda: (f) => <span className={f.llamadas_vencidas > 0 ? "font-semibold text-red-600 dark:text-red-400" : ""}>{f.llamadas_vencidas}</span>,
    excel: (f) => f.llamadas_vencidas,
  },
];

export default function ReporteProductividad() {
  return (
    <ReporteTabla
      titulo="Productividad por persona"
      descripcion="Asignaciones, cierres, vencimientos, tiempo de respuesta y llamadas atendidas por cada persona"
      endpoint="/reportes/productividad"
      nombreArchivo="Reporte-Productividad"
      columnas={columnas}
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

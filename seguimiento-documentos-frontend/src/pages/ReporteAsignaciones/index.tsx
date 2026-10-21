import PageMeta from "@/components/common/PageMeta";
import DatePickerLima from "@/components/form/DatePickerLima";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { formatFecha, formatFechaHora } from "@/components/expedientes/format";
import { DownloadIcon } from "@/icons";
import api from "@/utils/api";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface Fila {
  cut: string;
  asignado: string;
  cargo: string;
  fecha_asignacion: string;
  plazo_atencion: number;
  vence: string;
  prorroga: string;
  dias_restantes: number | null;
  estado_respuesta: string;
  total_respuestas: number;
  ultima_respuesta: string | null;
  tiempo_respuesta_horas: number | null;
  evaluador: string;
  fecha_evaluacion: string | null;
  observacion_evaluacion: string;
}

interface Totales {
  total: number;
  sin_respuesta: number;
  por_evaluar: number;
  respondidas: number;
  observadas: number;
  cerradas: number;
  vencidas: number;
}

const ESTADO: Record<string, { texto: string; clases: string }> = {
  SIN_RESPUESTA: { texto: "Sin respuesta", clases: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200" },
  POR_EVALUAR: { texto: "Por evaluar", clases: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100" },
  RESPONDIDA: { texto: "Respondida", clases: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-100" },
  OBSERVADA: { texto: "Observada", clases: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100" },
  CERRADA: { texto: "Cerrada", clases: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" },
};

const FILTRO_ESTADO = [
  { value: "", texto: "Todas" },
  { value: "SIN_RESPUESTA", texto: "Sin respuesta" },
  { value: "POR_EVALUAR", texto: "Por evaluar" },
  { value: "RESPONDIDA", texto: "Respondidas" },
  { value: "OBSERVADA", texto: "Observadas" },
  { value: "CERRADA", texto: "Cerradas" },
];

const TOTALES_VACIOS: Totales = {
  total: 0,
  sin_respuesta: 0,
  por_evaluar: 0,
  respondidas: 0,
  observadas: 0,
  cerradas: 0,
  vencidas: 0,
};

const formatoHoras = (horas: number | null) => {
  if (horas === null) return "—";
  const dias = Math.floor(horas / 24);
  const resto = Math.round(horas - dias * 24);
  return dias > 0 ? `${dias} d ${resto} h` : `${Math.round(horas)} h`;
};

const textoDias = (dias: number | null) =>
  dias === null ? "—" : dias < 0 ? `Vencida hace ${-dias} d` : dias === 0 ? "Vence hoy" : `${dias} d`;

export default function ReporteAsignaciones() {
  const [filas, setFilas] = useState<Fila[]>([]);
  const [totales, setTotales] = useState<Totales>(TOTALES_VACIOS);
  const [cargando, setCargando] = useState(true);
  const [filtros, setFiltros] = useState({ cut: "", estado: "", desde: "", hasta: "" });

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const params: Record<string, string> = {};
      if (filtros.cut.trim()) params.cut = filtros.cut.trim();
      if (filtros.estado) params.estado_respuesta = filtros.estado;
      if (filtros.desde) params.desde = filtros.desde;
      if (filtros.hasta) params.hasta = filtros.hasta;
      const res = await api.get("/reportes/asignaciones", { params });
      setFilas(res.data.filas || []);
      setTotales(res.data.totales || TOTALES_VACIOS);
    } catch {
      toast.error("No se pudo generar el reporte");
    } finally {
      setCargando(false);
    }
  }, [filtros]);

  useEffect(() => {
    const espera = setTimeout(cargar, 300);
    return () => clearTimeout(espera);
  }, [cargar]);

  const exportarExcel = () => {
    const encabezado = [
      "CUT",
      "Asignado a",
      "Cargo",
      "Fecha asignación",
      "Plazo (días)",
      "Vence",
      "Prórroga",
      "Días restantes",
      "Estado",
      "N° respuestas",
      "Última respuesta",
      "Tiempo de respuesta",
      "Evaluado por",
      "Fecha evaluación",
      "Observación de evaluación",
    ];
    const datos = filas.map((f) => [
      f.cut,
      f.asignado,
      f.cargo,
      formatFecha(f.fecha_asignacion),
      f.plazo_atencion,
      formatFecha(f.vence),
      f.prorroga,
      f.dias_restantes ?? "",
      ESTADO[f.estado_respuesta]?.texto ?? f.estado_respuesta,
      f.total_respuestas,
      f.ultima_respuesta ? formatFechaHora(f.ultima_respuesta) : "",
      formatoHoras(f.tiempo_respuesta_horas),
      f.evaluador,
      f.fecha_evaluacion ? formatFechaHora(f.fecha_evaluacion) : "",
      f.observacion_evaluacion,
    ]);
    const hoja = XLSX.utils.aoa_to_sheet([encabezado, ...datos]);
    hoja["!cols"] = encabezado.map(() => ({ wch: 18 }));
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Asignaciones");
    XLSX.writeFile(libro, `Reporte-Asignaciones-${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const indicadores: { titulo: string; valor: number; tono: string }[] = [
    { titulo: "Asignaciones", valor: totales.total, tono: "text-gray-900 dark:text-white" },
    { titulo: "Sin respuesta", valor: totales.sin_respuesta, tono: "text-gray-600 dark:text-gray-300" },
    { titulo: "Por evaluar", valor: totales.por_evaluar, tono: "text-blue-600 dark:text-blue-400" },
    { titulo: "Observadas", valor: totales.observadas, tono: "text-amber-600 dark:text-amber-400" },
    { titulo: "Cerradas", valor: totales.cerradas, tono: "text-green-600 dark:text-green-400" },
    { titulo: "Vencidas", valor: totales.vencidas, tono: "text-red-600 dark:text-red-400" },
  ];

  return (
    <>
      <PageMeta title="Reporte de asignaciones | Sistema de Seguimiento" description="Asignaciones, respuestas y evaluación" />
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Reporte de asignaciones</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Asignaciones de expediente con su respuesta, evaluación y tiempo de atención
            </p>
          </div>
          <button
            onClick={exportarExcel}
            disabled={filas.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50"
          >
            <DownloadIcon className="h-5 w-5" />
            Exportar Excel
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
          {indicadores.map((i) => (
            <div key={i.titulo} className="rounded-2xl bg-white p-4 shadow ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{i.titulo}</div>
              <div className={`mt-1 text-2xl font-bold ${i.tono}`}>{i.valor}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 rounded-lg bg-gray-50 p-4 dark:bg-gray-800 md:grid-cols-4">
          <div>
            <Label>Buscar por CUT</Label>
            <Input value={filtros.cut} onChange={(e) => setFiltros({ ...filtros, cut: e.target.value })} placeholder="Ej: 105162-2025" />
          </div>
          <div>
            <Label>Estado de respuesta</Label>
            <select
              value={filtros.estado}
              onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700"
            >
              {FILTRO_ESTADO.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.texto}
                </option>
              ))}
            </select>
          </div>
          <DatePickerLima label="Asignadas desde" value={filtros.desde} onChange={(d) => setFiltros({ ...filtros, desde: d })} placeholder="DD/MM/YYYY" />
          <DatePickerLima label="Asignadas hasta" value={filtros.hasta} onChange={(d) => setFiltros({ ...filtros, hasta: d })} placeholder="DD/MM/YYYY" />
        </div>

        <div className="overflow-hidden rounded-lg bg-white shadow dark:bg-gray-800">
          <div className="overflow-x-auto">
            {cargando ? (
              <div className="p-12 text-center text-gray-500">Generando reporte...</div>
            ) : filas.length === 0 ? (
              <div className="p-12 text-center text-gray-500">No hay asignaciones para estos filtros</div>
            ) : (
              <table className="w-full min-w-[1100px] text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-700 dark:text-gray-300">
                    <th className="px-3 py-3 text-start">CUT</th>
                    <th className="px-3 py-3 text-start">Asignado a</th>
                    <th className="px-3 py-3 text-center">Asignación</th>
                    <th className="px-3 py-3 text-center">Vence</th>
                    <th className="px-3 py-3 text-center">Días restantes</th>
                    <th className="px-3 py-3 text-center">Respuestas</th>
                    <th className="px-3 py-3 text-center">Última respuesta</th>
                    <th className="px-3 py-3 text-center">Tiempo de respuesta</th>
                    <th className="px-3 py-3 text-start">Estado</th>
                    <th className="px-3 py-3 text-start">Evaluación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {filas.map((f, i) => (
                    <tr key={`${f.cut}-${i}`} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-3 py-2 font-medium">{f.cut}</td>
                      <td className="px-3 py-2">
                        <div>{f.asignado}</div>
                        {f.cargo && <div className="text-xs text-gray-500">{f.cargo}</div>}
                      </td>
                      <td className="px-3 py-2 text-center">{formatFecha(f.fecha_asignacion)}</td>
                      <td className="px-3 py-2 text-center">
                        {formatFecha(f.vence)}
                        {f.prorroga === "ACEPTADA" && <div className="text-xs text-gray-500">con prórroga</div>}
                      </td>
                      <td className="px-3 py-2 text-center">{textoDias(f.dias_restantes)}</td>
                      <td className="px-3 py-2 text-center">{f.total_respuestas}</td>
                      <td className="px-3 py-2 text-center">{f.ultima_respuesta ? formatFechaHora(f.ultima_respuesta) : "—"}</td>
                      <td className="px-3 py-2 text-center font-semibold">{formatoHoras(f.tiempo_respuesta_horas)}</td>
                      <td className="px-3 py-2">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${ESTADO[f.estado_respuesta]?.clases ?? ""}`}>
                          {ESTADO[f.estado_respuesta]?.texto ?? f.estado_respuesta}
                        </span>
                      </td>
                      <td className="max-w-xs px-3 py-2">
                        {f.evaluador ? (
                          <>
                            <div className="text-xs text-gray-500">
                              {f.evaluador} · {f.fecha_evaluacion ? formatFechaHora(f.fecha_evaluacion) : ""}
                            </div>
                            {f.observacion_evaluacion && (
                              <div className="truncate text-xs" title={f.observacion_evaluacion}>
                                {f.observacion_evaluacion}
                              </div>
                            )}
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

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
  fecha_llamada: string;
  cut: string;
  nombre_llamante: string;
  telefono: string;
  motivo: string;
  responsable: string;
  registrada_por: string;
  fecha_limite: string | null;
  dias_restantes: number | null;
  situacion: string;
  respondido: boolean;
  acciones_total: number;
  acciones_ejecutadas: number;
  acciones_pendientes: number;
}

interface Totales {
  total: number;
  respondidas: number;
  sin_respuesta: number;
  vencidas: number;
  por_vencer: number;
  sin_plazo: number;
  acciones_pendientes: number;
}

const SITUACION: Record<string, { texto: string; clases: string }> = {
  RESPONDIDA: { texto: "Respondida", clases: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" },
  VENCIDA: { texto: "Vencida", clases: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100" },
  POR_VENCER: { texto: "Por vencer", clases: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100" },
  EN_PLAZO: { texto: "En plazo", clases: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100" },
  SIN_PLAZO: { texto: "Sin plazo", clases: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200" },
};

const FILTRO_PLAZO = [
  { value: "", texto: "Todas" },
  { value: "VENCIDA", texto: "Vencidas" },
  { value: "POR_VENCER", texto: "Por vencer (5 días)" },
  { value: "EN_PLAZO", texto: "En plazo" },
  { value: "SIN_PLAZO", texto: "Sin plazo" },
  { value: "RESPONDIDA", texto: "Respondidas" },
];

const TOTALES_VACIOS: Totales = {
  total: 0,
  respondidas: 0,
  sin_respuesta: 0,
  vencidas: 0,
  por_vencer: 0,
  sin_plazo: 0,
  acciones_pendientes: 0,
};

const textoDias = (dias: number | null) =>
  dias === null ? "—" : dias < 0 ? `Vencida hace ${-dias} d` : dias === 0 ? "Vence hoy" : `${dias} d`;

export default function ReporteLlamadas() {
  const [filas, setFilas] = useState<Fila[]>([]);
  const [totales, setTotales] = useState<Totales>(TOTALES_VACIOS);
  const [cargando, setCargando] = useState(true);
  const [filtros, setFiltros] = useState({ cut: "", plazo: "", desde: "", hasta: "" });

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const params: Record<string, string> = {};
      if (filtros.cut.trim()) params.cut = filtros.cut.trim();
      if (filtros.plazo) params.plazo = filtros.plazo;
      if (filtros.desde) params.desde = filtros.desde;
      if (filtros.hasta) params.hasta = filtros.hasta;
      const res = await api.get("/reportes/llamadas", { params });
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
      "Fecha de llamada",
      "CUT",
      "Quien llama",
      "Teléfono",
      "Motivo",
      "Atiende",
      "Registrada por",
      "Plazo límite",
      "Días restantes",
      "Situación",
      "Acciones (total)",
      "Acciones ejecutadas",
      "Acciones pendientes",
    ];
    const datos = filas.map((f) => [
      formatFechaHora(f.fecha_llamada),
      f.cut,
      f.nombre_llamante,
      f.telefono,
      f.motivo,
      f.responsable,
      f.registrada_por,
      formatFecha(f.fecha_limite),
      f.dias_restantes ?? "",
      SITUACION[f.situacion]?.texto ?? f.situacion,
      f.acciones_total,
      f.acciones_ejecutadas,
      f.acciones_pendientes,
    ]);
    const hoja = XLSX.utils.aoa_to_sheet([encabezado, ...datos]);
    hoja["!cols"] = encabezado.map(() => ({ wch: 18 }));
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Llamadas");
    XLSX.writeFile(libro, `Reporte-Llamadas-${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const indicadores = [
    { titulo: "Llamadas", valor: totales.total, tono: "text-gray-900 dark:text-white" },
    { titulo: "Respondidas", valor: totales.respondidas, tono: "text-green-600 dark:text-green-400" },
    { titulo: "Sin respuesta", valor: totales.sin_respuesta, tono: "text-gray-600 dark:text-gray-300" },
    { titulo: "Vencidas", valor: totales.vencidas, tono: "text-red-600 dark:text-red-400" },
    { titulo: "Por vencer", valor: totales.por_vencer, tono: "text-amber-600 dark:text-amber-400" },
    { titulo: "Acciones pendientes", valor: totales.acciones_pendientes, tono: "text-blue-600 dark:text-blue-400" },
  ];

  return (
    <>
      <PageMeta title="Reporte de llamadas | Sistema de Seguimiento" description="Llamadas de administrados, plazo y acciones" />
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Reporte de llamadas</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Llamadas de administrados con su plazo de respuesta y el avance de sus acciones
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
            <Input value={filtros.cut} onChange={(e) => setFiltros({ ...filtros, cut: e.target.value })} placeholder="Ej: 163943-2026" />
          </div>
          <div>
            <Label>Situación del plazo</Label>
            <select
              value={filtros.plazo}
              onChange={(e) => setFiltros({ ...filtros, plazo: e.target.value })}
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700"
            >
              {FILTRO_PLAZO.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.texto}
                </option>
              ))}
            </select>
          </div>
          <DatePickerLima label="Llamadas desde" value={filtros.desde} onChange={(d) => setFiltros({ ...filtros, desde: d })} placeholder="DD/MM/YYYY" />
          <DatePickerLima label="Llamadas hasta" value={filtros.hasta} onChange={(d) => setFiltros({ ...filtros, hasta: d })} placeholder="DD/MM/YYYY" />
        </div>

        <div className="overflow-hidden rounded-lg bg-white shadow dark:bg-gray-800">
          <div className="overflow-x-auto">
            {cargando ? (
              <div className="p-12 text-center text-gray-500">Generando reporte...</div>
            ) : filas.length === 0 ? (
              <div className="p-12 text-center text-gray-500">No hay llamadas para estos filtros</div>
            ) : (
              <table className="w-full min-w-[1100px] text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-700 dark:text-gray-300">
                    <th className="px-3 py-3 text-start">Fecha</th>
                    <th className="px-3 py-3 text-start">CUT</th>
                    <th className="px-3 py-3 text-start">Quien llama</th>
                    <th className="px-3 py-3 text-start">Motivo</th>
                    <th className="px-3 py-3 text-start">Atiende</th>
                    <th className="px-3 py-3 text-center">Límite</th>
                    <th className="px-3 py-3 text-center">Plazo</th>
                    <th className="px-3 py-3 text-start">Situación</th>
                    <th className="px-3 py-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {filas.map((f, i) => (
                    <tr key={`${f.cut}-${i}`} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="whitespace-nowrap px-3 py-2">{formatFechaHora(f.fecha_llamada)}</td>
                      <td className="px-3 py-2 font-medium">{f.cut}</td>
                      <td className="px-3 py-2">
                        <div>{f.nombre_llamante}</div>
                        <div className="text-xs text-gray-500">{f.telefono || "Sin teléfono"}</div>
                      </td>
                      <td className="max-w-xs truncate px-3 py-2" title={f.motivo}>
                        {f.motivo}
                      </td>
                      <td className="px-3 py-2">
                        <div>{f.responsable || "—"}</div>
                        <div className="text-xs text-gray-500">Registró: {f.registrada_por || "—"}</div>
                      </td>
                      <td className="px-3 py-2 text-center">{formatFecha(f.fecha_limite)}</td>
                      <td className="px-3 py-2 text-center">{f.respondido ? "—" : textoDias(f.dias_restantes)}</td>
                      <td className="px-3 py-2">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${SITUACION[f.situacion]?.clases ?? ""}`}>
                          {SITUACION[f.situacion]?.texto ?? f.situacion}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        {f.acciones_total === 0 ? (
                          <span className="text-gray-400">Sin acciones</span>
                        ) : (
                          <span className={f.acciones_pendientes > 0 ? "font-semibold text-amber-700 dark:text-amber-300" : "text-green-700 dark:text-green-300"}>
                            {f.acciones_ejecutadas}/{f.acciones_total}
                          </span>
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

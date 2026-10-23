import PageMeta from "@/components/common/PageMeta";
import DatePickerLima from "@/components/form/DatePickerLima";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import SearchableSelect from "@/components/form/SearchableSelect";
import { formatFecha, formatFechaHora } from "@/components/expedientes/format";
import { DownloadIcon } from "@/icons";
import api from "@/utils/api";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  REASIGNADA: { texto: "Reasignada", clases: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100" },
};

const FILTRO_ESTADO = [
  { value: "", texto: "Todas" },
  { value: "SIN_RESPUESTA", texto: "Sin respuesta" },
  { value: "POR_EVALUAR", texto: "Por evaluar" },
  { value: "RESPONDIDA", texto: "Respondidas" },
  { value: "OBSERVADA", texto: "Observadas" },
  { value: "CERRADA", texto: "Cerradas" },
  { value: "REASIGNADA", texto: "Reasignadas" },
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

const hoyYMD = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

const formatoHoras = (horas: number) => {
  const dias = Math.floor(horas / 24);
  const resto = Math.round(horas - dias * 24);
  return dias > 0 ? `${dias} d ${resto} h` : `${Math.round(horas)} h`;
};

// Cuánto tardó si ya respondió, o cuánto le falta si no.
const textoTiempo = (f: Fila) => {
  if (f.total_respuestas > 0 && f.tiempo_respuesta_horas !== null) {
    return `Respondió en ${formatoHoras(f.tiempo_respuesta_horas)}`;
  }
  if (f.dias_restantes === null) return "—";
  if (f.dias_restantes < 0) return `Vencida hace ${-f.dias_restantes} d`;
  if (f.dias_restantes === 0) return "Vence hoy";
  return `Le faltan ${f.dias_restantes} d`;
};

export default function ReporteAsignaciones() {
  const [filas, setFilas] = useState<Fila[]>([]);
  const [totales, setTotales] = useState<Totales>(TOTALES_VACIOS);
  const [cargando, setCargando] = useState(false);
  const [generado, setGenerado] = useState(false);
  const [usuarios, setUsuarios] = useState<{ id: number; nombre: string; apellido?: string; usuario: string; cargo?: string | null }[]>([]);
  const [pagina, setPagina] = useState({ pageIndex: 0, pageSize: 10 });
  const [filtros, setFiltros] = useState(() => {
    const hoy = hoyYMD();
    return { desde: `${hoy.slice(0, 8)}01`, hasta: hoy, cut: "", estado: "", usuario: "" as number | "" };
  });

  const generar = useCallback(async () => {
    if (!filtros.desde || !filtros.hasta) return toast.error("Seleccione el rango de fechas");
    if (filtros.desde > filtros.hasta) return toast.error("La fecha inicial no puede ser mayor que la final");
    setCargando(true);
    try {
      const params: Record<string, string> = { desde: filtros.desde, hasta: filtros.hasta };
      if (filtros.cut.trim()) params.cut = filtros.cut.trim();
      if (filtros.estado) params.estado_respuesta = filtros.estado;
      if (filtros.usuario !== "") params.id_usuario = String(filtros.usuario);
      const res = await api.get("/reportes/asignaciones", { params });
      setFilas(res.data.filas || []);
      setTotales(res.data.totales || TOTALES_VACIOS);
      setPagina((p) => ({ ...p, pageIndex: 0 }));
      setGenerado(true);
    } catch {
      toast.error("No se pudo generar el reporte");
    } finally {
      setCargando(false);
    }
  }, [filtros]);

  const fetchUsuarios = useCallback(async (filtro = "") => {
    try {
      const params: Record<string, string | number> = { limit: 10 };
      if (filtro) params.filtro = filtro;
      const res = await api.get("/usuarios/select", { params });
      setUsuarios(Array.isArray(res.data) ? res.data : []);
    } catch {
      setUsuarios([]);
    }
  }, []);

  useEffect(() => {
    fetchUsuarios();
    generar();
  }, []);

  const paginaFilas = useMemo(
    () => filas.slice(pagina.pageIndex * pagina.pageSize, (pagina.pageIndex + 1) * pagina.pageSize),
    [filas, pagina]
  );
  const totalPaginas = Math.max(1, Math.ceil(filas.length / pagina.pageSize));

  const exportarExcel = () => {
    const encabezado = [
      "#",
      "CUT",
      "Asignado a",
      "Cargo",
      "Fecha asignación",
      "Plazo (días)",
      "Vence",
      "Prórroga",
      "Estado",
      "N° respuestas",
      "Última respuesta",
      "Tiempo",
      "Evaluado por",
      "Fecha evaluación",
      "Observación de evaluación",
    ];
    const datos = filas.map((f, i) => [
      i + 1,
      f.cut,
      f.asignado,
      f.cargo,
      formatFecha(f.fecha_asignacion),
      f.plazo_atencion,
      formatFecha(f.vence),
      f.prorroga,
      ESTADO[f.estado_respuesta]?.texto ?? f.estado_respuesta,
      f.total_respuestas,
      f.ultima_respuesta ? formatFechaHora(f.ultima_respuesta) : "",
      textoTiempo(f),
      f.evaluador,
      f.fecha_evaluacion ? formatFechaHora(f.fecha_evaluacion) : "",
      f.observacion_evaluacion,
    ]);
    const hoja = XLSX.utils.aoa_to_sheet([encabezado, ...datos]);
    hoja["!cols"] = encabezado.map(() => ({ wch: 18 }));
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Asignaciones");
    XLSX.writeFile(libro, `Reporte-Asignaciones-${filtros.desde}-a-${filtros.hasta}.xlsx`);
  };

  const indicadores = [
    { titulo: "Asignaciones", valor: totales.total, tono: "text-gray-900 dark:text-white" },
    { titulo: "Sin respuesta", valor: totales.sin_respuesta, tono: "text-gray-600 dark:text-gray-300" },
    { titulo: "Por evaluar", valor: totales.por_evaluar, tono: "text-blue-600 dark:text-blue-400" },
    { titulo: "Observadas", valor: totales.observadas, tono: "text-amber-600 dark:text-amber-400" },
    { titulo: "Cerradas", valor: totales.cerradas, tono: "text-green-600 dark:text-green-400" },
    { titulo: "Vencidas", valor: totales.vencidas, tono: "text-red-600 dark:text-red-400" },
  ];

  return (
    <>
      <PageMeta title="Reporte de asignaciones | Sistema de Seguimiento" description="Asignaciones, respuestas y tiempo de atención" />
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Reporte de asignaciones</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Cuánto tardó cada persona en responder, o cuánto le falta si aún no responde
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

        <div className="grid grid-cols-1 gap-4 rounded-lg bg-gray-50 p-4 dark:bg-gray-800 md:grid-cols-6">
          <DatePickerLima label="Asignadas desde" value={filtros.desde} onChange={(d) => setFiltros({ ...filtros, desde: d })} placeholder="DD/MM/YYYY" />
          <DatePickerLima label="Asignadas hasta" value={filtros.hasta} onChange={(d) => setFiltros({ ...filtros, hasta: d })} placeholder="DD/MM/YYYY" />
          <div>
            <Label>Buscar por CUT</Label>
            <Input value={filtros.cut} onChange={(e) => setFiltros({ ...filtros, cut: e.target.value })} placeholder="Ej: 105162-2025" />
          </div>
          <div>
            <Label>Estado</Label>
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
          <div>
            <Label>Asignado a</Label>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <SearchableSelect
                  value={filtros.usuario}
                  onChange={(valor) => {
                    setFiltros({ ...filtros, usuario: Number(valor) });
                  }}
                  options={usuarios.map((u) => ({
                    id: u.id,
                    nombre: u.cargo ? `${u.nombre} ${u.apellido ?? ""} (${u.cargo})` : `${u.nombre} ${u.apellido ?? ""}`,
                  }))}
                  onSearch={(termino) => fetchUsuarios(termino)}
                  placeholder="Todos · buscar persona"
                  selectedLabel={
                    filtros.usuario !== ""
                      ? (() => {
                          const u = usuarios.find((x) => x.id === filtros.usuario);
                          return u ? `${u.nombre} ${u.apellido ?? ""}` : "";
                        })()
                      : ""
                  }
                />
              </div>
              {filtros.usuario !== "" && (
                <button
                  onClick={() => setFiltros({ ...filtros, usuario: "" })}
                  className="shrink-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                >
                  Quitar
                </button>
              )}
            </div>
          </div>
          <div className="flex items-end">
            <button
              onClick={generar}
              disabled={cargando}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {cargando ? "Generando..." : "Generar reporte"}
            </button>
          </div>
        </div>

        {generado && (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
            {indicadores.map((i) => (
              <div key={i.titulo} className="rounded-2xl bg-white p-4 shadow ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{i.titulo}</div>
                <div className={`mt-1 text-2xl font-bold ${i.tono}`}>{i.valor}</div>
              </div>
            ))}
          </div>
        )}

        <div className="overflow-hidden rounded-lg bg-white shadow dark:bg-gray-800">
          <div className="overflow-x-auto">
            {cargando ? (
              <div className="p-12 text-center text-gray-500">Generando reporte...</div>
            ) : !generado ? (
              <div className="p-12 text-center text-gray-500">Seleccione el rango de fechas y pulse Generar reporte</div>
            ) : filas.length === 0 ? (
              <div className="p-12 text-center text-gray-500">No hay asignaciones en este rango</div>
            ) : (
              <table className="w-full min-w-[1200px] text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-700 dark:text-gray-300">
                    <th className="px-3 py-3 text-center">#</th>
                    <th className="px-3 py-3 text-start">CUT</th>
                    <th className="px-3 py-3 text-start">Asignado a</th>
                    <th className="px-3 py-3 text-center">Asignación</th>
                    <th className="px-3 py-3 text-center">Vence</th>
                    <th className="px-3 py-3 text-center">Respuestas</th>
                    <th className="px-3 py-3 text-center">Última respuesta</th>
                    <th className="px-3 py-3 text-start">Estado</th>
                    <th className="px-3 py-3 text-start">Tiempo</th>
                    <th className="px-3 py-3 text-start">Evaluación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {paginaFilas.map((f, i) => (
                    <tr key={`${f.cut}-${f.fecha_asignacion}-${i}`} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-3 py-2 text-center text-gray-500">{pagina.pageIndex * pagina.pageSize + i + 1}</td>
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
                      <td className="px-3 py-2 text-center">{f.total_respuestas}</td>
                      <td className="px-3 py-2 text-center">{f.ultima_respuesta ? formatFechaHora(f.ultima_respuesta) : "—"}</td>
                      <td className="px-3 py-2">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${ESTADO[f.estado_respuesta]?.clases ?? ""}`}>
                          {ESTADO[f.estado_respuesta]?.texto ?? f.estado_respuesta}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-semibold">{textoTiempo(f)}</td>
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

          {generado && filas.length > 0 && (
            <div className="flex flex-col gap-3 border-t bg-gray-50 px-6 py-4 md:flex-row md:items-center md:justify-between dark:border-gray-700 dark:bg-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Mostrando {pagina.pageIndex * pagina.pageSize + 1}-
                {Math.min((pagina.pageIndex + 1) * pagina.pageSize, filas.length)} de {filas.length}
              </div>
              <div className="flex items-center gap-4">
                <select
                  value={pagina.pageSize}
                  onChange={(e) => setPagina({ pageIndex: 0, pageSize: Number(e.target.value) })}
                  className="rounded border border-gray-300 bg-white px-3 py-1 text-sm dark:border-gray-600 dark:bg-gray-700"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPagina((p) => ({ ...p, pageIndex: Math.max(0, p.pageIndex - 1) }))}
                    disabled={pagina.pageIndex === 0}
                    className="rounded border border-gray-300 px-3 py-1 text-sm disabled:opacity-50"
                  >
                    ← Anterior
                  </button>
                  <span className="px-2 py-1 text-sm">
                    {pagina.pageIndex + 1} / {totalPaginas}
                  </span>
                  <button
                    onClick={() => setPagina((p) => ({ ...p, pageIndex: Math.min(totalPaginas - 1, p.pageIndex + 1) }))}
                    disabled={pagina.pageIndex + 1 >= totalPaginas}
                    className="rounded border border-gray-300 px-3 py-1 text-sm disabled:opacity-50"
                  >
                    Siguiente →
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

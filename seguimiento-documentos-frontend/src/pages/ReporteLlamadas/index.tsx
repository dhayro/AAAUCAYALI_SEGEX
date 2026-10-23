import PageMeta from "@/components/common/PageMeta";
import DatePickerLima from "@/components/form/DatePickerLima";
import SearchableSelect from "@/components/form/SearchableSelect";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { formatFecha, formatFechaHora } from "@/components/expedientes/format";
import { DownloadIcon } from "@/icons";
import api from "@/utils/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface Fila {
  fecha_llamada: string;
  cut: string;
  nombre_llamante: string;
  tipo_atencion?: "LLAMADA" | "PRESENCIAL";
  telefono: string;
  motivo: string;
  responsable: string;
  registrada_por: string;
  fecha_limite: string | null;
  dias_restantes: number | null;
  situacion: string;
  respondido: boolean;
  respondido_en: string | null;
  tiempo_respuesta_horas: number | null;
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

const FILTRO_SITUACION = [
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

const hoyYMD = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

const formatoHoras = (horas: number) => {
  const dias = Math.floor(horas / 24);
  const resto = Math.round(horas - dias * 24);
  return dias > 0 ? `${dias} d ${resto} h` : `${Math.round(horas)} h`;
};

// Texto del tiempo: cuánto tardó si ya respondió, o cuánto le falta si no.
const textoTiempo = (f: Fila) => {
  if (f.respondido) {
    return f.tiempo_respuesta_horas !== null ? `Respondió en ${formatoHoras(f.tiempo_respuesta_horas)}` : "Respondida";
  }
  if (f.dias_restantes === null) return "Sin plazo";
  if (f.dias_restantes < 0) return `Vencida hace ${-f.dias_restantes} d`;
  if (f.dias_restantes === 0) return "Vence hoy";
  return `Le faltan ${f.dias_restantes} d`;
};

export default function ReporteLlamadas() {
  const [filas, setFilas] = useState<Fila[]>([]);
  const [totales, setTotales] = useState<Totales>(TOTALES_VACIOS);
  const [cargando, setCargando] = useState(false);
  const [generado, setGenerado] = useState(false);
  const [pagina, setPagina] = useState({ pageIndex: 0, pageSize: 10 });
  const [usuarios, setUsuarios] = useState<{ id: number; nombre: string; apellido: string; usuario: string; cargo?: string | null }[]>([]);
  const [atiende, setAtiende] = useState<number | "">("");
  const [filtros, setFiltros] = useState(() => {
    const hoy = hoyYMD();
    return { desde: `${hoy.slice(0, 8)}01`, hasta: hoy, cut: "", plazo: "", tipo: "" };
  });

  const generar = useCallback(async () => {
    if (!filtros.desde || !filtros.hasta) return toast.error("Seleccione el rango de fechas");
    if (filtros.desde > filtros.hasta) return toast.error("La fecha inicial no puede ser mayor que la final");
    setCargando(true);
    try {
      const params: Record<string, string> = { desde: filtros.desde, hasta: filtros.hasta };
      if (filtros.cut.trim()) params.cut = filtros.cut.trim();
      if (filtros.plazo) params.plazo = filtros.plazo;
      if (filtros.tipo) params.tipo = filtros.tipo;
      if (atiende !== "") params.id_responsable = String(atiende);
      const res = await api.get("/reportes/llamadas", { params });
      setFilas(res.data.filas || []);
      setTotales(res.data.totales || TOTALES_VACIOS);
      setPagina((p) => ({ ...p, pageIndex: 0 }));
      setGenerado(true);
    } catch {
      toast.error("No se pudo generar el reporte");
    } finally {
      setCargando(false);
    }
  }, [filtros, atiende]);

  // Carga inicial con el mes actual; luego el reporte se genera con el botón o al cambiar CUT o situación.
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
      "Fecha de llamada",
      "CUT",
      "Quien llama",
      "Tipo",
      "Teléfono",
      "Motivo",
      "Atiende",
      "Registrada por",
      "Plazo límite",
      "Situación",
      "Tiempo",
      "Acciones ejecutadas",
      "Acciones totales",
    ];
    const datos = filas.map((f, i) => [
      i + 1,
      formatFechaHora(f.fecha_llamada),
      f.cut,
      f.nombre_llamante,
      f.tipo_atencion === "PRESENCIAL" ? "Presencial" : "Llamada",
      f.telefono,
      f.motivo,
      f.responsable,
      f.registrada_por,
      formatFecha(f.fecha_limite),
      SITUACION[f.situacion]?.texto ?? f.situacion,
      textoTiempo(f),
      f.acciones_ejecutadas,
      f.acciones_total,
    ]);
    const hoja = XLSX.utils.aoa_to_sheet([encabezado, ...datos]);
    hoja["!cols"] = encabezado.map(() => ({ wch: 18 }));
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Llamadas");
    XLSX.writeFile(libro, `Reporte-Llamadas-${filtros.desde}-a-${filtros.hasta}.xlsx`);
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
      <PageMeta title="Reporte de llamadas | Sistema de Seguimiento" description="Llamadas de administrados, plazo y tiempo de respuesta" />
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Reporte de llamadas</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Cuánto tardó cada llamada en responderse, o cuánto le falta si aún no se responde
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

        <div className="grid grid-cols-1 gap-4 rounded-lg bg-gray-50 p-4 dark:bg-gray-800 md:grid-cols-7">
          <DatePickerLima label="Desde" value={filtros.desde} onChange={(d) => setFiltros({ ...filtros, desde: d })} placeholder="DD/MM/YYYY" />
          <DatePickerLima label="Hasta" value={filtros.hasta} onChange={(d) => setFiltros({ ...filtros, hasta: d })} placeholder="DD/MM/YYYY" />
          <div>
            <Label>Buscar por CUT</Label>
            <Input value={filtros.cut} onChange={(e) => setFiltros({ ...filtros, cut: e.target.value })} placeholder="Ej: 163943-2026" />
          </div>
          <div>
            <Label>Tipo</Label>
            <select
              value={filtros.tipo}
              onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value })}
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700"
            >
              <option value="">Todos</option>
              <option value="LLAMADA">Llamadas</option>
              <option value="PRESENCIAL">Presenciales</option>
            </select>
          </div>
          <div>
            <Label>Situación</Label>
            <select
              value={filtros.plazo}
              onChange={(e) => setFiltros({ ...filtros, plazo: e.target.value })}
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700"
            >
              {FILTRO_SITUACION.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.texto}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Atiende</Label>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <SearchableSelect
                  value={atiende}
                  onChange={(valor) => setAtiende(Number(valor))}
                  options={usuarios.map((u) => ({
                    id: u.id,
                    nombre: u.cargo ? `${u.nombre} ${u.apellido ?? ""} (${u.cargo})` : `${u.nombre} ${u.apellido ?? ""}`,
                  }))}
                  onSearch={(termino) => fetchUsuarios(termino)}
                  placeholder="Todos · buscar persona"
                  selectedLabel={(() => {
                    const u = usuarios.find((x) => x.id === atiende);
                    return u ? `${u.nombre} ${u.apellido ?? ""}` : "";
                  })()}
                />
              </div>
              {atiende !== "" && (
                <button
                  onClick={() => setAtiende("")}
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
              <div className="p-12 text-center text-gray-500">No hay llamadas en este rango</div>
            ) : (
              <table className="w-full min-w-[1200px] text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-700 dark:text-gray-300">
                    <th className="px-3 py-3 text-center">#</th>
                    <th className="px-3 py-3 text-start">Fecha</th>
                    <th className="px-3 py-3 text-start">CUT</th>
                    <th className="px-3 py-3 text-start">Quien llama</th>
                    <th className="px-3 py-3 text-start">Motivo</th>
                    <th className="px-3 py-3 text-start">Atiende</th>
                    <th className="px-3 py-3 text-center">Límite</th>
                    <th className="px-3 py-3 text-start">Situación</th>
                    <th className="px-3 py-3 text-start">Tiempo</th>
                    <th className="px-3 py-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {paginaFilas.map((f, i) => (
                    <tr key={`${f.cut}-${f.fecha_llamada}-${i}`} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-3 py-2 text-center text-gray-500">{pagina.pageIndex * pagina.pageSize + i + 1}</td>
                      <td className="whitespace-nowrap px-3 py-2">{formatFechaHora(f.fecha_llamada)}</td>
                      <td className="px-3 py-2 font-medium">{f.cut}</td>
                      <td className="px-3 py-2">
                        <div>
                          {f.nombre_llamante}
                          <span
                            className={`ml-2 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                              f.tipo_atencion === "PRESENCIAL"
                                ? "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-100"
                                : "bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-100"
                            }`}
                          >
                            {f.tipo_atencion === "PRESENCIAL" ? "Presencial" : "Llamada"}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">{f.telefono || (f.tipo_atencion === "PRESENCIAL" ? "Atención en persona" : "Sin teléfono")}</div>
                      </td>
                      <td className="max-w-xs truncate px-3 py-2" title={f.motivo}>
                        {f.motivo}
                      </td>
                      <td className="px-3 py-2">
                        <div>{f.responsable || "—"}</div>
                        <div className="text-xs text-gray-500">Registró: {f.registrada_por || "—"}</div>
                      </td>
                      <td className="px-3 py-2 text-center">{formatFecha(f.fecha_limite)}</td>
                      <td className="px-3 py-2">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${SITUACION[f.situacion]?.clases ?? ""}`}>
                          {SITUACION[f.situacion]?.texto ?? f.situacion}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-semibold">{textoTiempo(f)}</td>
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

import PageMeta from "@/components/common/PageMeta";
import DatePickerLima from "@/components/form/DatePickerLima";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { DownloadIcon } from "@/icons";
import api from "@/utils/api";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

export interface Columna {
  titulo: string;
  align?: "start" | "center";
  celda: (f: any) => ReactNode;
  excel: (f: any) => string | number | null;
}

export interface Indicador {
  titulo: string;
  clave: string;
  tono?: string;
}

interface Props {
  titulo: string;
  descripcion: string;
  endpoint: string;
  columnas: Columna[];
  indicadores?: Indicador[];
  conCut?: boolean;
  paramsExtra?: Record<string, string>;
  filtrosExtra?: ReactNode;
  nombreArchivo: string;
  anchoMinimo?: number;
}

const hoyYMD = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

// Tabla de reporte: rango de fechas (mes actual por defecto), paginación, número de fila y Excel.
export default function ReporteTabla({
  titulo,
  descripcion,
  endpoint,
  columnas,
  indicadores = [],
  conCut = false,
  paramsExtra = {},
  filtrosExtra,
  nombreArchivo,
  anchoMinimo = 1000,
}: Props) {
  const [filas, setFilas] = useState<any[]>([]);
  const [totales, setTotales] = useState<Record<string, number>>({});
  const [cargando, setCargando] = useState(false);
  const [generado, setGenerado] = useState(false);
  const [pagina, setPagina] = useState({ pageIndex: 0, pageSize: 10 });
  const [filtros, setFiltros] = useState(() => {
    const hoy = hoyYMD();
    return { desde: `${hoy.slice(0, 8)}01`, hasta: hoy, cut: "" };
  });

  const generar = useCallback(async () => {
    if (!filtros.desde || !filtros.hasta) return toast.error("Seleccione el rango de fechas");
    if (filtros.desde > filtros.hasta) return toast.error("La fecha inicial no puede ser mayor que la final");
    setCargando(true);
    try {
      const params: Record<string, string> = { desde: filtros.desde, hasta: filtros.hasta, ...paramsExtra };
      if (conCut && filtros.cut.trim()) params.cut = filtros.cut.trim();
      const res = await api.get(endpoint, { params });
      setFilas(res.data.filas || []);
      setTotales(res.data.totales || {});
      setPagina((p) => ({ ...p, pageIndex: 0 }));
      setGenerado(true);
    } catch (error: any) {
      toast.error(error.response?.data?.mensaje || "No se pudo generar el reporte");
    } finally {
      setCargando(false);
    }
  }, [filtros, paramsExtra, endpoint, conCut]);

  useEffect(() => {
    generar();
  }, []);

  const paginaFilas = useMemo(
    () => filas.slice(pagina.pageIndex * pagina.pageSize, (pagina.pageIndex + 1) * pagina.pageSize),
    [filas, pagina]
  );
  const totalPaginas = Math.max(1, Math.ceil(filas.length / pagina.pageSize));

  const exportarExcel = () => {
    const encabezado = ["#", ...columnas.map((c) => c.titulo)];
    const datos = filas.map((f, i) => [i + 1, ...columnas.map((c) => c.excel(f))]);
    const hoja = XLSX.utils.aoa_to_sheet([encabezado, ...datos]);
    hoja["!cols"] = encabezado.map(() => ({ wch: 20 }));
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Reporte");
    XLSX.writeFile(libro, `${nombreArchivo}-${filtros.desde}-a-${filtros.hasta}.xlsx`);
  };

  return (
    <>
      <PageMeta title={`${titulo} | Sistema de Seguimiento`} description={descripcion} />
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{titulo}</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">{descripcion}</p>
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

        <div className="grid grid-cols-1 gap-4 rounded-lg bg-gray-50 p-4 dark:bg-gray-800 md:grid-cols-4">
          <DatePickerLima label="Desde" value={filtros.desde} onChange={(d) => setFiltros({ ...filtros, desde: d })} placeholder="DD/MM/YYYY" />
          <DatePickerLima label="Hasta" value={filtros.hasta} onChange={(d) => setFiltros({ ...filtros, hasta: d })} placeholder="DD/MM/YYYY" />
          {conCut && (
            <div>
              <Label>Buscar por CUT</Label>
              <Input value={filtros.cut} onChange={(e) => setFiltros({ ...filtros, cut: e.target.value })} placeholder="Ej: 105162-2025" />
            </div>
          )}
          {filtrosExtra}
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

        {generado && indicadores.length > 0 && (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
            {indicadores.map((i) => (
              <div key={i.titulo} className="rounded-2xl bg-white p-4 shadow ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{i.titulo}</div>
                <div className={`mt-1 text-2xl font-bold ${i.tono ?? "text-gray-900 dark:text-white"}`}>{totales[i.clave] ?? 0}</div>
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
              <div className="p-12 text-center text-gray-500">No hay datos para este rango</div>
            ) : (
              <table className="w-full text-sm" style={{ minWidth: anchoMinimo }}>
                <thead>
                  <tr className="border-b bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-700 dark:text-gray-300">
                    <th className="px-3 py-3 text-center">#</th>
                    {columnas.map((c) => (
                      <th key={c.titulo} className={`px-3 py-3 ${c.align === "center" ? "text-center" : "text-start"}`}>
                        {c.titulo}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {paginaFilas.map((f, i) => (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-3 py-2 text-center text-gray-500">{pagina.pageIndex * pagina.pageSize + i + 1}</td>
                      {columnas.map((c) => (
                        <td key={c.titulo} className={`px-3 py-2 ${c.align === "center" ? "text-center" : ""}`}>
                          {c.celda(f)}
                        </td>
                      ))}
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

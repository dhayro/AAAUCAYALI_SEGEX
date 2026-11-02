import PageMeta from "@/components/common/PageMeta";
import DatePickerLima from "@/components/form/DatePickerLima";
import Label from "@/components/form/Label";
import TrazabilidadModal from "@/components/expedientes/TrazabilidadModal";
import { OFICINA_SISGED_POR_DEFECTO, OFICINAS_SISGED, TIPOS_DOCUMENTO_SISGED } from "@/components/sisged/catalogosSisged";
import api from "@/utils/api";
import * as XLSX from "xlsx";
import { useState } from "react";
import { toast } from "sonner";

interface DocumentoCreado {
  id: string;
  cut: string;
  documento: string;
  asunto: string;
  referencia: string;
  destinos: string;
  fecha_creacion: string;
  tipo: string;
  estado: string;
}

interface Filtros {
  desde: string;
  hasta: string;
  oficina: string;
  tipo: string;
  filas: number;
}

const CANTIDADES = [15, 50, 100, 150, 300];

const hoyYMD = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

const selectClass = "w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700";

// Reporte "Documentos creados" de SISGED: se trae página por página, con las filas elegidas.
export default function DocumentosCreadosSisged() {
  const hoy = hoyYMD();
  const [filtros, setFiltros] = useState<Filtros>({
    desde: `${hoy.slice(0, 8)}01`,
    hasta: hoy,
    oficina: OFICINA_SISGED_POR_DEFECTO,
    tipo: "129",
    filas: 15,
  });
  // Filtros de la última consulta: las páginas siguientes se piden con los mismos filtros.
  const [consulta, setConsulta] = useState<Filtros | null>(null);
  const [filas, setFilas] = useState<DocumentoCreado[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [paginas, setPaginas] = useState(1);
  const [cargando, setCargando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [cutAbierto, setCutAbierto] = useState<string | null>(null);

  const traerPagina = async (base: Filtros, numero: number) => {
    setCargando(true);
    try {
      const res = await api.post("/sisged/documentos-creados", { ...base, pagina: numero });
      setFilas(res.data.filas || []);
      setTotal(res.data.total || 0);
      setPaginas(res.data.paginas || 1);
      setPagina(numero);
      setConsulta(base);
    } catch (error: any) {
      toast.error(error.response?.data?.mensaje || "No se pudo consultar SISGED");
    } finally {
      setCargando(false);
    }
  };

  const consultar = () => {
    if (!filtros.desde || !filtros.hasta) return toast.error("Seleccione el rango de fechas");
    if (filtros.desde > filtros.hasta) return toast.error("La fecha inicial no puede ser mayor que la final");
    traerPagina({ ...filtros }, 1);
  };

  const irAPagina = (numero: number) => {
    if (consulta) traerPagina(consulta, numero);
  };

  // Para el Excel se piden todas las páginas de SISGED del mismo rango.
  const exportarExcel = async () => {
    if (!consulta) return;
    setExportando(true);
    try {
      const res = await api.post("/sisged/documentos-creados", { ...consulta, todas: true });
      const todas: DocumentoCreado[] = res.data.filas || [];
      const encabezado = ["Nro CUT", "N° Documento", "Asunto", "Referencia", "Destinos", "Fecha Creación", "Tipo", "Estado"];
      const datos = todas.map((f) => [f.cut, f.documento, f.asunto, f.referencia, f.destinos, f.fecha_creacion, f.tipo, f.estado]);
      const hoja = XLSX.utils.aoa_to_sheet([encabezado, ...datos]);
      const libro = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(libro, hoja, "Documentos");
      XLSX.writeFile(libro, `Documentos-creados-SISGED-${consulta.desde}-${consulta.hasta}.xlsx`);
    } catch (error: any) {
      toast.error(error.response?.data?.mensaje || "No se pudo exportar");
    } finally {
      setExportando(false);
    }
  };

  return (
    <>
      <PageMeta title="Documentos creados en SISGED | Sistema de Seguimiento" description="Documentos creados en SISGED por rango de fechas" />
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Documentos creados en SISGED</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Documentos creados en SISGED por rango de fechas, oficina y tipo. Ordenados por correlativo, del más reciente al más antiguo.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 rounded-lg bg-gray-50 p-4 dark:bg-gray-800 md:grid-cols-6">
          <DatePickerLima label="Desde" value={filtros.desde} onChange={(d) => setFiltros({ ...filtros, desde: d })} placeholder="DD/MM/YYYY" />
          <DatePickerLima label="Hasta" value={filtros.hasta} onChange={(d) => setFiltros({ ...filtros, hasta: d })} placeholder="DD/MM/YYYY" />
          <div className="md:col-span-2">
            <Label>Oficina</Label>
            <select value={filtros.oficina} onChange={(e) => setFiltros({ ...filtros, oficina: e.target.value })} className={selectClass}>
              {OFICINAS_SISGED.map(([id, nombre]) => (
                <option key={id} value={id}>
                  {nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <Label>Tipo de documento</Label>
            <select value={filtros.tipo} onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value })} className={selectClass}>
              <option value="">Todos</option>
              {TIPOS_DOCUMENTO_SISGED.map(([id, nombre]) => (
                <option key={id} value={id}>
                  {nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Filas</Label>
            <select value={filtros.filas} onChange={(e) => setFiltros({ ...filtros, filas: Number(e.target.value) })} className={selectClass}>
              {CANTIDADES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={consultar}
            disabled={cargando}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {cargando ? "Consultando SISGED..." : "Consultar"}
          </button>
          {consulta && total > 0 && (
            <button
              onClick={exportarExcel}
              disabled={exportando}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
            >
              {exportando ? "Preparando Excel..." : `Exportar Excel (${total} documentos)`}
            </button>
          )}
          {consulta && (
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {filas.length} de {total} documento{total === 1 ? "" : "s"} en SISGED
            </span>
          )}
        </div>

        <div className="overflow-hidden rounded-lg bg-white shadow dark:bg-gray-800">
          <div className="overflow-x-auto">
            {!consulta ? (
              <div className="p-12 text-center text-gray-500">Seleccione el rango y pulse Consultar</div>
            ) : filas.length === 0 ? (
              <div className="p-12 text-center text-gray-500">No hay documentos para estos filtros</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-700 dark:text-gray-300">
                    <th className="px-3 py-3 text-center">Ver</th>
                    <th className="px-3 py-3 text-start">Nro CUT</th>
                    <th className="px-3 py-3 text-start">N° Documento</th>
                    <th className="px-3 py-3 text-start">Asunto</th>
                    <th className="px-3 py-3 text-start">Referencia</th>
                    <th className="px-3 py-3 text-start">Destinos</th>
                    <th className="px-3 py-3 text-center">Fecha Creación</th>
                    <th className="px-3 py-3 text-start">Tipo</th>
                    <th className="px-3 py-3 text-start">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {filas.map((f) => (
                    <tr key={f.id} className="align-top hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-3 py-2 text-center">
                        {f.cut ? (
                          <button
                            onClick={() => setCutAbierto(f.cut)}
                            className="rounded border border-brand-600 px-2 py-1 text-xs font-semibold text-brand-600 hover:bg-brand-50 dark:border-brand-400 dark:text-brand-400"
                          >
                            Ver
                          </button>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 font-medium">{f.cut || "—"}</td>
                      <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">{f.documento || "—"}</td>
                      <td className="max-w-xs px-3 py-2 text-gray-700 dark:text-gray-200">{f.asunto || "—"}</td>
                      <td className="max-w-xs px-3 py-2 text-gray-700 dark:text-gray-200">{f.referencia || "—"}</td>
                      <td className="max-w-xs px-3 py-2 text-gray-700 dark:text-gray-200">{f.destinos || "—"}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-center">{f.fecha_creacion || "—"}</td>
                      <td className="whitespace-nowrap px-3 py-2">{f.tipo || "—"}</td>
                      <td className="whitespace-nowrap px-3 py-2">{f.estado || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {consulta && paginas > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3 text-sm dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-400">
                Página {pagina} de {paginas}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => irAPagina(pagina - 1)}
                  disabled={cargando || pagina <= 1}
                  className="rounded border border-gray-300 px-3 py-1 disabled:opacity-40 dark:border-gray-600"
                >
                  Anterior
                </button>
                <button
                  onClick={() => irAPagina(pagina + 1)}
                  disabled={cargando || pagina >= paginas}
                  className="rounded border border-gray-300 px-3 py-1 disabled:opacity-40 dark:border-gray-600"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>

        {cutAbierto && <TrazabilidadModal cut={cutAbierto} onClose={() => setCutAbierto(null)} />}
      </div>
    </>
  );
}

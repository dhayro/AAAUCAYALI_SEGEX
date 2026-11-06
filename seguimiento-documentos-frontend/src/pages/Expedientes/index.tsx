import PageMeta from "@/components/common/PageMeta";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import ExpedienteDetalleModal from "@/components/expedientes/ExpedienteDetalleModal";
import AsignadoExpedienteModal from "@/components/asignaciones/AsignadoExpedienteModal";
import { formatFechaHora } from "@/components/expedientes/format";
import api from "@/utils/api";
import { UserCircleIcon, ChevronLeftIcon } from "@/icons";

interface Expediente {
  id: number;
  idoc: number;
  cut: string;
  asunto?: string | null;
  usurem?: string | null;
  ndoc?: string | null;
  proced?: string | null;
  estupa?: string | null;
  feccrea?: string | null;
}

export default function Expedientes() {
  const [expedientes, setExpedientes] = useState<Expediente[]>([]);
  const [loading, setLoading] = useState(true);
  const [cutAbierto, setCutAbierto] = useState<string | null>(null);
  const [cutAsignado, setCutAsignado] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [filters, setFilters] = useState({ filtro: "" });
  const [totalCount, setTotalCount] = useState(0);

  const fetchExpedientes = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
      };
      if (filters.filtro) params.filtro = filters.filtro;

      const response = await api.get("/expedientes", { params });
      setExpedientes(response.data.expedientes || []);
      setTotalCount(response.data.totalExpedientes || 0);
    } catch (error) {
      console.error("Error fetching expedientes:", error);
      toast.error("Error al cargar expedientes");
    } finally {
      setLoading(false);
    }
  }, [pagination, filters]);

  useEffect(() => {
    fetchExpedientes();
  }, [fetchExpedientes]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ filtro: e.target.value });
    setPagination({ pageIndex: 0, pageSize: 10 });
  };

  return (
    <>
      <PageMeta
        title="Expedientes | Sistema de Seguimiento"
        description="Consulta de expedientes"
      />
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Expedientes</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Consulta de expedientes. Haz clic en el CUT para ver su detalle y trazabilidad.
          </p>
        </div>

        <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
          <Label>Buscar expedientes</Label>
          <Input
            name="filtro"
            value={filters.filtro}
            onChange={handleFilterChange}
            placeholder="Buscar por CUT, asunto, documento, remitente o procedimiento..."
          />
        </div>

        <div className="overflow-hidden rounded-lg bg-white shadow dark:bg-gray-800">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-12 text-center text-gray-500">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
                <p className="mt-4">Cargando expedientes...</p>
              </div>
            ) : expedientes.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50 dark:bg-gray-700">
                    <th className="px-6 py-4 text-start text-sm font-semibold">#</th>
                    <th className="px-6 py-4 text-start text-sm font-semibold">CUT</th>
                    <th className="px-6 py-4 text-start text-sm font-semibold">Asunto</th>
                    <th className="px-6 py-4 text-start text-sm font-semibold">Remitente</th>
                    <th className="px-6 py-4 text-start text-sm font-semibold">Documento</th>
                    <th className="px-6 py-4 text-start text-sm font-semibold">Procedimiento</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold">TUPA</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold">Fecha de creación</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold">Asignado</th>
                  </tr>
                </thead>
                <tbody>
                  {expedientes.map((exp, index) => (
                    <tr key={exp.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 text-sm">
                        {pagination.pageIndex * pagination.pageSize + index + 1}
                      </td>
                      <td className="px-6 py-4 font-medium">
                        <button
                          onClick={() => setCutAbierto(exp.cut)}
                          className="text-blue-600 hover:underline dark:text-blue-400"
                        >
                          {exp.cut}
                        </button>
                      </td>
                      <td className="max-w-xs px-6 py-4 text-sm">{exp.asunto || "—"}</td>
                      <td className="max-w-[12rem] px-6 py-4 text-sm">{exp.usurem || "—"}</td>
                      <td className="px-6 py-4 text-sm">{exp.ndoc || "—"}</td>
                      <td className="max-w-xs px-6 py-4 text-sm">{exp.proced || "—"}</td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                            exp.estupa === "TUPA"
                              ? "bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-100"
                              : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200"
                          }`}
                        >
                          {exp.estupa === "TUPA" ? "TUPA" : "NO TUPA"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-center text-sm">
                        {formatFechaHora(exp.feccrea)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => setCutAsignado(exp.cut)}
                          title="Ver a quién está asignado"
                          aria-label={`Ver asignado de ${exp.cut}`}
                          className="inline-flex rounded-md p-1.5 text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-gray-700"
                        >
                          <UserCircleIcon className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-12 text-center text-gray-500">No hay expedientes disponibles</div>
            )}
          </div>

          {expedientes.length > 0 && (
            <div className="flex items-center justify-between border-t bg-gray-50 px-6 py-4 dark:border-gray-700 dark:bg-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Mostrando {pagination.pageIndex * pagination.pageSize + 1}-
                {Math.min((pagination.pageIndex + 1) * pagination.pageSize, totalCount)}{" "}
                de {totalCount}
              </div>
              <div className="flex flex-nowrap items-center gap-4">
                <select
                  value={pagination.pageSize}
                  onChange={(e) => setPagination({ pageIndex: 0, pageSize: Number(e.target.value) })}
                  className="rounded border border-gray-300 bg-white px-3 py-1 text-sm dark:border-gray-600 dark:bg-gray-700"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={150}>150</option>
                  <option value={200}>200</option>
                </select>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPagination((p) => ({ ...p, pageIndex: Math.max(0, p.pageIndex - 1) }))}
                    disabled={pagination.pageIndex === 0}
                   title="Anterior" aria-label="Anterior" className="inline-flex h-8 w-8 items-center justify-center rounded border border-gray-300 disabled:opacity-50 dark:border-gray-600"><ChevronLeftIcon className="h-4 w-4" /></button>
                  <span className="whitespace-nowrap px-2 py-1 text-sm">
                    {pagination.pageIndex + 1} / {Math.max(1, Math.ceil(totalCount / pagination.pageSize))}
                  </span>
                  <button
                    onClick={() => setPagination((p) => ({ ...p, pageIndex: p.pageIndex + 1 }))}
                    disabled={(pagination.pageIndex + 1) * pagination.pageSize >= totalCount}
                   title="Siguiente" aria-label="Siguiente" className="inline-flex h-8 w-8 items-center justify-center rounded border border-gray-300 disabled:opacity-50 dark:border-gray-600"><ChevronLeftIcon className="h-4 w-4 rotate-180" /></button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {cutAsignado && (
        <AsignadoExpedienteModal cut={cutAsignado} onClose={() => setCutAsignado(null)} />
      )}

      {cutAbierto && (
        <ExpedienteDetalleModal cut={cutAbierto} onClose={() => setCutAbierto(null)} />
      )}
    </>
  );
}

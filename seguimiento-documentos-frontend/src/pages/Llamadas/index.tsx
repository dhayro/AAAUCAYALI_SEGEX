import PageMeta from "@/components/common/PageMeta";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import RegistrarLlamadaModal from "@/components/atencion/RegistrarLlamadaModal";
import DetalleLlamadaModal from "@/components/atencion/DetalleLlamadaModal";
import { formatFecha, formatFechaHora } from "@/components/expedientes/format";
import api from "@/utils/api";

interface Llamada {
  id: number;
  cut: string;
  fecha_llamada: string;
  nombre_llamante: string;
  telefono?: string | null;
  motivo: string;
  fecha_respuesta?: string | null;
  respondido: boolean;
  responsable?: { nombre: string; apellido: string } | null;
  creador?: { nombre: string; apellido: string } | null;
}

const nombre = (u?: { nombre: string; apellido: string } | null) => (u ? `${u.nombre} ${u.apellido}` : "—");

export default function Llamadas() {
  const [llamadas, setLlamadas] = useState<Llamada[]>([]);
  const [loading, setLoading] = useState(true);
  const [registrando, setRegistrando] = useState(false);
  const [detalleId, setDetalleId] = useState<number | null>(null);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [filters, setFilters] = useState({ cut: "", respondido: "" });
  const [totalCount, setTotalCount] = useState(0);

  const fetchLlamadas = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page: pagination.pageIndex + 1, limit: pagination.pageSize };
      if (filters.cut) params.cut = filters.cut;
      if (filters.respondido) params.respondido = filters.respondido;
      const response = await api.get("/atenciones/llamadas", { params });
      setLlamadas(response.data.llamadas || []);
      setTotalCount(response.data.totalLlamadas || 0);
    } catch (error) {
      console.error("Error fetching llamadas:", error);
      toast.error("Error al cargar las llamadas");
    } finally {
      setLoading(false);
    }
  }, [pagination, filters]);

  useEffect(() => {
    fetchLlamadas();
  }, [fetchLlamadas]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPagination({ pageIndex: 0, pageSize: 10 });
  };

  const selectClass =
    "w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700";

  return (
    <>
      <PageMeta title="Control de Llamadas | Sistema de Seguimiento" description="Registro de llamadas de administrados" />
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Control de Llamadas</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Registra las llamadas de administrados, sus acciones y el avance de cada una
            </p>
          </div>
          <button
            onClick={() => setRegistrando(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            Registrar llamada
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 rounded-lg bg-gray-50 p-4 dark:bg-gray-800 md:grid-cols-2">
          <div>
            <Label>Buscar por CUT</Label>
            <Input name="cut" value={filters.cut} onChange={handleFilterChange} placeholder="Ej: 163943-2026" />
          </div>
          <div>
            <Label>Respuesta al administrado</Label>
            <select name="respondido" value={filters.respondido} onChange={handleFilterChange} className={selectClass}>
              <option value="">Todas</option>
              <option value="false">No respondidas</option>
              <option value="true">Respondidas</option>
            </select>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg bg-white shadow dark:bg-gray-800">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-12 text-center text-gray-500">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
                <p className="mt-4">Cargando llamadas...</p>
              </div>
            ) : llamadas.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50 dark:bg-gray-700">
                    <th className="px-6 py-4 text-start text-sm font-semibold">#</th>
                    <th className="px-6 py-4 text-start text-sm font-semibold">CUT</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold">Fecha y hora</th>
                    <th className="px-6 py-4 text-start text-sm font-semibold">Quien llama</th>
                    <th className="px-6 py-4 text-start text-sm font-semibold">Motivo</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold">Fecha respuesta</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold">Respondido</th>
                    <th className="px-6 py-4 text-start text-sm font-semibold">Atiende</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold">Ver</th>
                  </tr>
                </thead>
                <tbody>
                  {llamadas.map((l, index) => (
                    <tr key={l.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 text-sm">{pagination.pageIndex * pagination.pageSize + index + 1}</td>
                      <td className="px-6 py-4 font-medium">{l.cut}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-center text-sm">{formatFechaHora(l.fecha_llamada)}</td>
                      <td className="px-6 py-4 text-sm">
                        <div>{l.nombre_llamante}</div>
                        <div className="text-xs text-gray-500">{l.telefono || "Sin teléfono"}</div>
                      </td>
                      <td className="max-w-xs px-6 py-4 text-sm">
                        <div className="line-clamp-2 whitespace-pre-wrap break-words" title={l.motivo}>{l.motivo}</div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-center text-sm">{formatFecha(l.fecha_respuesta)}</td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            l.respondido
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                              : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
                          }`}
                        >
                          {l.respondido ? "SÍ" : "NO"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">{nombre(l.responsable)}</td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => setDetalleId(l.id)}
                          className="rounded border border-brand-600 px-2 py-1 text-xs font-semibold text-brand-600 hover:bg-brand-50 dark:border-brand-400 dark:text-brand-400 dark:hover:bg-gray-700"
                        >
                          Ver
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-12 text-center text-gray-500">No hay llamadas registradas</div>
            )}
          </div>

          {llamadas.length > 0 && (
            <div className="flex items-center justify-between border-t bg-gray-50 px-6 py-4 dark:border-gray-700 dark:bg-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Mostrando {pagination.pageIndex * pagination.pageSize + 1}-
                {Math.min((pagination.pageIndex + 1) * pagination.pageSize, totalCount)} de {totalCount}
              </div>
              <div className="flex items-center gap-4">
                <select
                  value={pagination.pageSize}
                  onChange={(e) => setPagination({ pageIndex: 0, pageSize: Number(e.target.value) })}
                  className="rounded border border-gray-300 bg-white px-3 py-1 text-sm dark:border-gray-600 dark:bg-gray-700"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                </select>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPagination((p) => ({ ...p, pageIndex: Math.max(0, p.pageIndex - 1) }))}
                    disabled={pagination.pageIndex === 0}
                    className="rounded border border-gray-300 px-3 py-1 text-sm disabled:opacity-50"
                  >
                    ← Anterior
                  </button>
                  <button
                    onClick={() => setPagination((p) => ({ ...p, pageIndex: p.pageIndex + 1 }))}
                    disabled={(pagination.pageIndex + 1) * pagination.pageSize >= totalCount}
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

      {registrando && (
        <RegistrarLlamadaModal
          onClose={() => setRegistrando(false)}
          onRegistrada={() => {
            setRegistrando(false);
            fetchLlamadas();
          }}
        />
      )}
      {detalleId !== null && (
        <DetalleLlamadaModal llamadaId={detalleId} onClose={() => setDetalleId(null)} onCambio={fetchLlamadas} />
      )}
    </>
  );
}

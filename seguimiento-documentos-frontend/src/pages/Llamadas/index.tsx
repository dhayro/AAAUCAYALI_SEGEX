import PageMeta from "@/components/common/PageMeta";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import RegistrarLlamadaModal from "@/components/atencion/RegistrarLlamadaModal";
import DetalleLlamadaModal from "@/components/atencion/DetalleLlamadaModal";
import ExpedienteDetalleModal from "@/components/expedientes/ExpedienteDetalleModal";
import { colorUsuario } from "@/utils/colorUsuario";
import { formatFecha, formatFechaHora } from "@/components/expedientes/format";
import { BadgePlazo } from "@/components/atencion/EditorPlazo";
import api from "@/utils/api";
import ConfirmDialog from "@/components/common/ConfirmDialog";

interface Llamada {
  id: number;
  cut: string;
  fecha_llamada: string;
  nombre_llamante: string;
  tipo_atencion?: "LLAMADA" | "PRESENCIAL";
  puede_editar_datos?: boolean;
  puede_eliminar?: boolean;
  presenciales_del_cut?: number;
  telefono?: string | null;
  motivo: string;
  fecha_respuesta?: string | null;
  respondido: boolean;
  responsable?: { id: number; nombre: string; apellido: string } | null;
  creador?: { id: number; nombre: string; apellido: string } | null;
  total_del_cut?: number;
}

const nombre = (u?: { nombre: string; apellido: string } | null) => (u ? `${u.nombre} ${u.apellido}` : "—");

const iniciales = (u: { nombre: string; apellido: string }) => `${u.nombre.charAt(0)}${u.apellido.charAt(0)}`.toUpperCase();



export default function Llamadas() {
  const [llamadas, setLlamadas] = useState<Llamada[]>([]);
  const [loading, setLoading] = useState(true);
  const [registrando, setRegistrando] = useState(false);
  const [detalleId, setDetalleId] = useState<number | null>(null);
  const [detalleAccion, setDetalleAccion] = useState<"editar" | undefined>(undefined);
  const [eliminarLlamada, setEliminarLlamada] = useState<{ id: number; cut: string } | null>(null);
  const [motivoEliminar, setMotivoEliminar] = useState("");
  const [eliminando, setEliminando] = useState(false);

  const confirmarEliminar = async () => {
    if (!eliminarLlamada) return;
    if (!motivoEliminar.trim()) return toast.error("Escriba el motivo de la eliminación");
    setEliminando(true);
    try {
      await api.post(`/atenciones/llamadas/${eliminarLlamada.id}/anular`, { motivo: motivoEliminar });
      toast.success("Registro eliminado");
      setEliminarLlamada(null);
      setMotivoEliminar("");
      fetchLlamadas();
    } catch (error: any) {
      toast.error(error.response?.data?.mensaje || "No se pudo eliminar el registro");
    } finally {
      setEliminando(false);
    }
  };
  const [cutAbierto, setCutAbierto] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [filters, setFilters] = useState({ cut: "", respondido: "false", plazo: "" });
  const [cutTexto, setCutTexto] = useState("");

  // Consulta al API cuando el usuario deja de escribir el CUT, no en cada tecla.
  useEffect(() => {
    const espera = setTimeout(() => {
      const cut = cutTexto.trim();
      setFilters((prev) => (prev.cut === cut ? prev : { ...prev, cut }));
      setPagination((p) => (p.pageIndex === 0 ? p : { ...p, pageIndex: 0 }));
    }, 400);
    return () => clearTimeout(espera);
  }, [cutTexto]);
  const [totalCount, setTotalCount] = useState(0);

  const fetchLlamadas = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page: pagination.pageIndex + 1, limit: pagination.pageSize };
      if (filters.cut) params.cut = filters.cut;
      // Al buscar por CUT se muestran todas las llamadas de ese CUT, respondidas o no.
      if (filters.respondido && !filters.cut) params.respondido = filters.respondido;
      if (filters.plazo) params.plazo = filters.plazo;
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
              Registra las llamadas y las atenciones presenciales de administrados, sus acciones y el avance de cada una
            </p>
          </div>
          <button
            onClick={() => setRegistrando(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            Registrar llamada o atención
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 rounded-lg bg-gray-50 p-4 dark:bg-gray-800 md:grid-cols-3">
          <div>
            <Label>Buscar por CUT</Label>
            <Input value={cutTexto} onChange={(e) => setCutTexto(e.target.value)} placeholder="Ej: 163943-2026" />
          </div>
          <div>
            <Label>Respuesta al administrado</Label>
            <select
              name="respondido"
              value={filters.respondido}
              onChange={handleFilterChange}
              disabled={!!filters.cut}
              title={filters.cut ? "Al buscar por CUT se muestran todas las llamadas" : undefined}
              className={`${selectClass} disabled:opacity-60`}
            >
              <option value="">Todas</option>
              <option value="false">No respondidas</option>
              <option value="true">Respondidas</option>
            </select>
          </div>
          <div>
            <Label>Plazo de respuesta</Label>
            <select name="plazo" value={filters.plazo} onChange={handleFilterChange} className={selectClass}>
              <option value="">Todos</option>
              <option value="VENCIDAS">Vencidas</option>
              <option value="POR_VENCER">Por vencer (5 días)</option>
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
                    <th className="px-6 py-4 text-center text-sm font-semibold">#</th>
                    <th className="px-6 py-4 text-start text-sm font-semibold">CUT</th>
                    <th className="whitespace-nowrap px-6 py-4 text-start text-sm font-semibold">Conteo</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold">Fecha y hora</th>
                    <th className="px-6 py-4 text-start text-sm font-semibold">Quien llamó o fue atendido</th>
                    <th className="px-6 py-4 text-start text-sm font-semibold">Motivo</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold">Plazo de respuesta</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold">Respondido</th>
                    <th className="px-6 py-4 text-start text-sm font-semibold">Registrada por</th>
                    <th className="px-6 py-4 text-start text-sm font-semibold">Atiende</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold">Ver</th>
                  </tr>
                </thead>
                <tbody>
                  {llamadas.map((l, index) => (
                    <tr
                      key={l.id}
                      className={`border-b border-l-4 hover:bg-gray-50 dark:hover:bg-gray-700 ${colorUsuario(l.responsable?.id).borde}`}
                    >
                      <td className="px-6 py-4 text-center text-sm">
                        <div>{pagination.pageIndex * pagination.pageSize + index + 1}</div>
                        <span
                          className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${
                            l.tipo_atencion === "PRESENCIAL"
                              ? "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-100"
                              : "bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-100"
                          }`}
                        >
                          {l.tipo_atencion === "PRESENCIAL" ? "Presencial" : "Llamada"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setCutAbierto(l.cut)}
                            title="Ver expediente"
                            className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                          >
                            {l.cut}
                          </button>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        {(l.total_del_cut ?? 1) > 1 ? (
                          (() => {
                            const pres = l.presenciales_del_cut ?? 0;
                            const llam = (l.total_del_cut ?? 1) - pres;
                            return (
                              <div className="flex gap-1">
                                {llam > 0 && (
                                  <span
                                    title={`${llam} llamada${llam === 1 ? "" : "s"}`}
                                    className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-bold text-sky-800 dark:bg-sky-900 dark:text-sky-100"
                                  >
                                    {llam} llam.
                                  </span>
                                )}
                                {pres > 0 && (
                                  <span
                                    title={`${pres} presencial${pres === 1 ? "" : "es"}`}
                                    className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-bold text-violet-800 dark:bg-violet-900 dark:text-violet-100"
                                  >
                                    {pres} pres.
                                  </span>
                                )}
                              </div>
                            );
                          })()
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-center text-sm">{formatFechaHora(l.fecha_llamada)}</td>
                      <td className="px-6 py-4 text-sm">
                        <div>{l.nombre_llamante}</div>
                        <div className="text-xs text-gray-500">
                          {l.telefono || (l.tipo_atencion === "PRESENCIAL" ? "Atención en persona" : "Sin teléfono")}
                        </div>
                      </td>
                      <td className="max-w-xs px-6 py-4 text-sm">
                        <div className="line-clamp-2 whitespace-pre-wrap break-words" title={l.motivo}>{l.motivo}</div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-center text-sm">
                        <div>{formatFecha(l.fecha_respuesta)}</div>
                        <div className="mt-1">
                          <BadgePlazo respondido={l.respondido} fechaLimite={l.fecha_respuesta} />
                        </div>
                      </td>
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
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{nombre(l.creador)}</td>
                      <td className="px-6 py-4">
                        {l.responsable ? (
                          <div className="flex items-center gap-3">
                            <span
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                colorUsuario(l.responsable.id).etiqueta
                              }`}
                            >
                              {iniciales(l.responsable)}
                            </span>
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">{nombre(l.responsable)}</span>
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-wrap items-center justify-center gap-1">
                          <button
                            onClick={() => {
                              setDetalleAccion(undefined);
                              setDetalleId(l.id);
                            }}
                            className="rounded border border-brand-600 px-2 py-1 text-xs font-semibold text-brand-600 hover:bg-brand-50 dark:border-brand-400 dark:text-brand-400 dark:hover:bg-gray-700"
                          >
                            Ver
                          </button>
                          {l.puede_eliminar && (
                            <button
                              onClick={() => {
                                setEliminarLlamada({ id: l.id, cut: l.cut });
                              }}
                              className="rounded border border-red-300 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-300 dark:hover:bg-gray-700"
                            >
                              Eliminar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-12 text-center text-gray-500">No hay registros</div>
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
      {cutAbierto && <ExpedienteDetalleModal cut={cutAbierto} onClose={() => setCutAbierto(null)} />}
      <ConfirmDialog
        abierto={eliminarLlamada !== null}
        titulo="Eliminar registro"
        textoConfirmar="Eliminar"
        peligro
        procesando={eliminando}
        mensaje={
          <div className="space-y-3">
            <p>
              El registro del CUT {eliminarLlamada?.cut} saldrá de las listas, el monitor, el calendario y los reportes. Quedará en el historial del CUT como eliminado.
            </p>
            <textarea
              rows={3}
              value={motivoEliminar}
              onChange={(e) => setMotivoEliminar(e.target.value)}
              placeholder="Motivo, por ejemplo: registrada por error"
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700"
            />
          </div>
        }
        onConfirmar={confirmarEliminar}
        onCancelar={() => {
          setEliminarLlamada(null);
          setMotivoEliminar("");
        }}
      />

      {detalleId !== null && (
        <DetalleLlamadaModal
          llamadaId={detalleId}
          accionInicial={detalleAccion}
          onClose={() => {
            setDetalleId(null);
            setDetalleAccion(undefined);
          }}
          onCambio={fetchLlamadas}
        />
      )}
    </>
  );
}

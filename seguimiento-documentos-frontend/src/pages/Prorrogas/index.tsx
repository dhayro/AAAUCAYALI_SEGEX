import PageMeta from "@/components/common/PageMeta";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import ExpedienteDetalleModal from "@/components/expedientes/ExpedienteDetalleModal";
import RevisionProrrogaModal from "@/components/asignaciones/RevisionProrrogaModal";
import HistorialAsignacionModal from "@/components/asignaciones/HistorialAsignacionModal";
import ProrrogaMasivaModal, { type ModoMasivo } from "@/components/asignaciones/ProrrogaMasivaModal";
import { formatFecha } from "@/components/expedientes/format";
import api from "@/utils/api";
import { puedeGestionarAsignaciones } from "@/utils/sesion";
import BotonAccion from "@/components/common/BotonAccion";
import { ClipboardCheckIcon, HistoryIcon, ChevronLeftIcon } from "@/icons";

interface UsuarioResumen {
  id: number;
  nombre: string;
  apellido: string;
  usuario: string;
}

interface Prorroga {
  id: number;
  cut: string;
  id_usuario: number;
  fecha_asignacion: string;
  plazo_atencion: number;
  fecha_vencimiento: string;
  fecha_prorroga?: string | null;
  plazo_prorroga?: number | null;
  motivo_prorroga?: string | null;
  estado_prorroga?: string | null;
  rechazos_previos?: number;
  fecha_vencimiento_prorroga?: string | null;
  asignado?: UsuarioResumen | null;
}

const ESTADO_PRORROGA: Record<string, { texto: string; clases: string }> = {
  PENDIENTE: { texto: "Pendiente", clases: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100" },
  ACEPTADA: { texto: "Aceptada", clases: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" },
  RECHAZADA: { texto: "Rechazada", clases: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100" },
};

const nombreUsuario = (u?: UsuarioResumen | null) => (u ? `${u.nombre} ${u.apellido}` : "—");

export default function Prorrogas() {
  const [prorrogas, setProrrogas] = useState<Prorroga[]>([]);
  const [loading, setLoading] = useState(true);
  const [cutAbierto, setCutAbierto] = useState<string | null>(null);
  const [revision, setRevision] = useState<Prorroga | null>(null);
  const [historial, setHistorial] = useState<Prorroga | null>(null);
  const gestiona = puedeGestionarAsignaciones();
  const [seleccion, setSeleccion] = useState<number[]>([]);
  const [masivo, setMasivo] = useState<ModoMasivo | null>(null);

  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [filters, setFilters] = useState({ cut: "", estado_prorroga: "PENDIENTE", con_rechazo: false });
  const [contadores, setContadores] = useState<Record<string, number>>({});
  const [totalCount, setTotalCount] = useState(0);

  const fetchProrrogas = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        estado: "true",
        con_prorroga: "true",
      };
      if (filters.cut) params.cut = filters.cut;
      if (filters.estado_prorroga) params.estado_prorroga = filters.estado_prorroga;
      if (filters.con_rechazo) params.con_rechazo_previo = "true";

      const response = await api.get("/asignaciones-expediente", { params });
      setProrrogas(response.data.asignaciones || []);
      setContadores(response.data.contadores_prorroga || {});
      setTotalCount(response.data.totalAsignaciones || 0);
      setSeleccion([]);
    } catch (error) {
      console.error("Error fetching prórrogas:", error);
      toast.error("Error al cargar prórrogas");
    } finally {
      setLoading(false);
    }
  }, [pagination, filters]);

  useEffect(() => {
    fetchProrrogas();
  }, [fetchProrrogas]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPagination({ pageIndex: 0, pageSize: 10 });
  };

  // "Con rechazo previo" es un filtro propio: incluye las que fueron rechazadas antes aunque hoy estén pendientes.
  const cambiarEstadoProrroga = (valor: string) => {
    if (valor === "CON_RECHAZO_PREVIO") {
      setFilters((prev) => ({ ...prev, estado_prorroga: "", con_rechazo: true }));
    } else {
      setFilters((prev) => ({ ...prev, estado_prorroga: valor, con_rechazo: false }));
    }
    setPagination({ pageIndex: 0, pageSize: 10 });
  };

  const FILTROS_PRORROGA = [
    {
      value: "",
      texto: "Todas",
      cantidad: (contadores.PENDIENTE ?? 0) + (contadores.ACEPTADA ?? 0) + (contadores.RECHAZADA ?? 0),
    },
    { value: "PENDIENTE", texto: "Pendientes", cantidad: contadores.PENDIENTE ?? 0 },
    { value: "ACEPTADA", texto: "Aceptadas", cantidad: contadores.ACEPTADA ?? 0 },
    { value: "RECHAZADA", texto: "Rechazadas", cantidad: contadores.RECHAZADA ?? 0 },
    { value: "CON_RECHAZO_PREVIO", texto: "Con rechazo previo", cantidad: contadores.CON_RECHAZO_PREVIO ?? 0 },
  ];

  const selectClass =
    "w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700";

  return (
    <>
      <PageMeta
        title="Prórrogas | Sistema de Seguimiento"
        description="Revisión de prórrogas de asignaciones de expedientes"
      />
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Prórrogas</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Revisa las solicitudes de prórroga: acepta, cambia los días o rechaza
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {FILTROS_PRORROGA.map((f) => {
            const activo =
              f.value === "CON_RECHAZO_PREVIO" ? filters.con_rechazo : !filters.con_rechazo && filters.estado_prorroga === f.value;
            return (
              <button
                key={f.value || "todas"}
                onClick={() => cambiarEstadoProrroga(f.value)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
                  activo
                    ? "bg-brand-600 text-white"
                    : "bg-white text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-600 dark:hover:bg-gray-700"
                }`}
              >
                {f.texto} · {f.cantidad}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-4 rounded-lg bg-gray-50 p-4 dark:bg-gray-800 md:grid-cols-2">
          <div>
            <Label>Buscar por CUT</Label>
            <Input name="cut" value={filters.cut} onChange={handleFilterChange} placeholder="Ej: 163943-2026" />
          </div>
          <div>
            <Label>Estado de la prórroga</Label>
            <select name="estado_prorroga" value={filters.estado_prorroga} onChange={handleFilterChange} className={selectClass}>
              <option value="">Todas</option>
              <option value="PENDIENTE">Pendientes</option>
              <option value="ACEPTADA">Aceptadas</option>
              <option value="RECHAZADA">Rechazadas</option>
            </select>
          </div>
        </div>

        {gestiona && seleccion.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-brand-200 bg-brand-50 p-3 dark:border-brand-800 dark:bg-brand-900/20">
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
              {seleccion.length} seleccionada(s)
            </span>
            <button
              onClick={() => setMasivo("aceptar")}
              className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-700"
            >
              Aceptar seleccionadas
            </button>
            <button
              onClick={() => setMasivo("rechazar")}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700"
            >
              Rechazar seleccionadas
            </button>
            <button
              onClick={() => setSeleccion([])}
              className="ml-auto text-sm text-gray-600 underline hover:text-gray-800 dark:text-gray-300"
            >
              Limpiar selección
            </button>
          </div>
        )}

        <div className="overflow-hidden rounded-lg bg-white shadow dark:bg-gray-800">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-12 text-center text-gray-500">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
                <p className="mt-4">Cargando prórrogas...</p>
              </div>
            ) : prorrogas.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50 dark:bg-gray-700">
                    <th className="px-4 py-4 text-center">
                      {gestiona && <input
                        type="checkbox"
                        aria-label="Seleccionar pendientes"
                        checked={
                          prorrogas.some((p) => p.estado_prorroga === "PENDIENTE") &&
                          prorrogas
                            .filter((p) => p.estado_prorroga === "PENDIENTE")
                            .every((p) => seleccion.includes(p.id))
                        }
                        onChange={(e) =>
                          setSeleccion(
                            e.target.checked
                              ? prorrogas.filter((p) => p.estado_prorroga === "PENDIENTE").map((p) => p.id)
                              : []
                          )
                        }
                      />}
                    </th>
                    <th className="px-6 py-4 text-start text-sm font-semibold">#</th>
                    <th className="px-6 py-4 text-start text-sm font-semibold">CUT</th>
                    <th className="px-6 py-4 text-start text-sm font-semibold">Asignado a</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold">Solicitud</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold">Días solicitados</th>
                    <th className="px-6 py-4 text-start text-sm font-semibold">Motivo</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold">Vencimiento original</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold">Estado</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold">Vence prórroga</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {prorrogas.map((p, index) => (
                    <tr key={p.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-4 text-center">
                        {gestiona && p.estado_prorroga === "PENDIENTE" && (
                          <input
                            type="checkbox"
                            aria-label={`Seleccionar ${p.cut}`}
                            checked={seleccion.includes(p.id)}
                            onChange={(e) =>
                              setSeleccion((prev) =>
                                e.target.checked ? [...prev, p.id] : prev.filter((x) => x !== p.id)
                              )
                            }
                          />
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">{pagination.pageIndex * pagination.pageSize + index + 1}</td>
                      <td className="px-6 py-4 font-medium">
                        <button onClick={() => setCutAbierto(p.cut)} className="text-blue-600 hover:underline dark:text-blue-400">
                          {p.cut}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-sm">{nombreUsuario(p.asignado)}</td>
                      <td className="px-6 py-4 text-center text-sm">{formatFecha(p.fecha_prorroga)}</td>
                      <td className="px-6 py-4 text-center text-sm">{p.plazo_prorroga ?? "—"}</td>
                      <td className="max-w-xs px-6 py-4 text-sm">
                        <div className="line-clamp-2 whitespace-pre-wrap break-words" title={p.motivo_prorroga || ""}>
                          {p.motivo_prorroga || "—"}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center text-sm">{formatFecha(p.fecha_vencimiento)}</td>
                      <td className="px-6 py-4 text-center">
                        {p.estado_prorroga && ESTADO_PRORROGA[p.estado_prorroga] && (
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${ESTADO_PRORROGA[p.estado_prorroga].clases}`}>
                            {ESTADO_PRORROGA[p.estado_prorroga].texto}
                          </span>
                        )}
                        {(p.rechazos_previos ?? 0) > 0 && (
                          <div className="mt-1">
                            <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800 dark:bg-red-900 dark:text-red-100">
                              Rechazada {p.rechazos_previos} {p.rechazos_previos === 1 ? "vez" : "veces"} antes
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center text-sm">
                        {p.estado_prorroga === "ACEPTADA" ? formatFecha(p.fecha_vencimiento_prorroga) : "—"}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          {gestiona && p.estado_prorroga === "PENDIENTE" && (
                            <BotonAccion
                              etiqueta="Revisar prórroga"
                              icono={<ClipboardCheckIcon />}
                              tono="alerta"
                              onClick={() => setRevision(p)}
                            />
                          )}
                          <BotonAccion
                            etiqueta="Historial"
                            icono={<HistoryIcon />}
                            onClick={() => setHistorial(p)}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-12 text-center text-gray-500">No hay prórrogas registradas</div>
            )}
          </div>

          {prorrogas.length > 0 && (
            <div className="flex items-center justify-between border-t bg-gray-50 px-6 py-4 dark:border-gray-700 dark:bg-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Mostrando {pagination.pageIndex * pagination.pageSize + 1}-
                {Math.min((pagination.pageIndex + 1) * pagination.pageSize, totalCount)} de {totalCount}
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

      {masivo && (
        <ProrrogaMasivaModal
          modo={masivo}
          ids={seleccion}
          onClose={() => setMasivo(null)}
          onDone={() => {
            setMasivo(null);
            setSeleccion([]);
            fetchProrrogas();
          }}
        />
      )}
      {revision && (
        <RevisionProrrogaModal
          asignacion={revision}
          onClose={() => setRevision(null)}
          onRevisada={() => {
            setRevision(null);
            fetchProrrogas();
          }}
        />
      )}
      {historial && (
        <HistorialAsignacionModal asignacionId={historial.id} cut={historial.cut} onClose={() => setHistorial(null)} />
      )}
      {cutAbierto && <ExpedienteDetalleModal cut={cutAbierto} onClose={() => setCutAbierto(null)} />}
    </>
  );
}

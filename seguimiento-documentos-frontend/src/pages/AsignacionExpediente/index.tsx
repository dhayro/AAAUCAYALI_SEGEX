import PageMeta from "@/components/common/PageMeta";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import DatePickerLima from "@/components/form/DatePickerLima";
import SearchableSelect from "@/components/form/SearchableSelect";
import ExpedienteDetalleModal from "@/components/expedientes/ExpedienteDetalleModal";
import { formatFecha } from "@/components/expedientes/format";
import api from "@/utils/api";
import { PencilIcon, TrashBinIcon, PlusIcon, CloseIcon } from "@/icons";

interface UsuarioResumen {
  id: number;
  nombre: string;
  apellido: string;
  usuario: string;
}

interface UsuarioSelect {
  id: number;
  nombre: string;
  usuario: string;
  cargo?: string | null;
}

interface Asignacion {
  id: number;
  cut: string;
  id_usuario: number;
  fecha_asignacion: string;
  plazo_atencion: number;
  fecha_vencimiento: string;
  fecha_prorroga?: string | null;
  plazo_prorroga?: number | null;
  fecha_vencimiento_prorroga?: string | null;
  estado_prorroga?: string | null;
  observacion?: string | null;
  numero_orden?: string | null;
  asignado?: (UsuarioResumen & { Cargo?: { nombre: string } | null }) | null;
}

const etiquetaUsuario = (nombre: string, cargo?: string | null) =>
  cargo ? `${nombre} (${cargo})` : nombre;

const hoyLima = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

const getEmptyForm = () => ({
  cut: "",
  id_usuario: "" as number | "",
  fecha_asignacion: hoyLima(),
  plazo_atencion: "",
  observacion: "",
  numero_orden: "",
});

const DIAS_PARA_PRORROGA = 5;

const diasEntre = (fecha: string, hoy: string) =>
  Math.round(
    (Date.parse(`${fecha.slice(0, 10)}T00:00:00Z`) - Date.parse(`${hoy}T00:00:00Z`)) / 86400000
  );

const vencimientoVigente = (a: Asignacion) =>
  a.estado_prorroga === "ACEPTADA" ? a.fecha_vencimiento_prorroga : a.fecha_vencimiento;

const puedeProrrogar = (a: Asignacion) => {
  if (a.estado_prorroga === "PENDIENTE" || a.estado_prorroga === "ACEPTADA") return false;
  return diasEntre(a.fecha_vencimiento, hoyLima()) <= DIAS_PARA_PRORROGA;
};

const ESTADO_PRORROGA: Record<string, { texto: string; clases: string }> = {
  PENDIENTE: { texto: "Pendiente", clases: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100" },
  ACEPTADA: { texto: "Aceptada", clases: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" },
  RECHAZADA: { texto: "Rechazada", clases: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100" },
};

const ETIQUETA_EVENTO: Record<string, string> = {
  SOLICITUD_PRORROGA: "Solicitud de prórroga",
  PRORROGA_ACEPTADA: "Prórroga aceptada",
  PRORROGA_RECHAZADA: "Prórroga rechazada",
};

const DiasRestantes = ({ a }: { a: Asignacion }) => {
  const vence = vencimientoVigente(a);
  if (!vence) return <span className="text-gray-400">—</span>;
  const dias = diasEntre(vence, hoyLima());
  const clases =
    dias < 0
      ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
      : dias <= DIAS_PARA_PRORROGA
      ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100"
      : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
  const texto =
    dias < 0 ? `Vencido hace ${-dias} d` : dias === 0 ? "Vence hoy" : `${dias} día${dias === 1 ? "" : "s"}`;
  return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${clases}`}>{texto}</span>;
};

const nombreUsuario = (u?: UsuarioResumen | null) =>
  u ? `${u.nombre} ${u.apellido}` : "—";

export default function AsignacionExpediente() {
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState(getEmptyForm);
  const [usuarios, setUsuarios] = useState<UsuarioSelect[]>([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const [selectedUsuarioName, setSelectedUsuarioName] = useState("");

  const [prorrogaTarget, setProrrogaTarget] = useState<Asignacion | null>(null);
  const [prorrogaData, setProrrogaData] = useState({ plazo: "" });
  const [revisionTarget, setRevisionTarget] = useState<Asignacion | null>(null);
  const [revisionData, setRevisionData] = useState({ plazo: "", observacion: "" });
  const [historialTarget, setHistorialTarget] = useState<Asignacion | null>(null);
  const [historialRows, setHistorialRows] = useState<any[]>([]);
  const [historialCargando, setHistorialCargando] = useState(false);

  const [cutAbierto, setCutAbierto] = useState<string | null>(null);

  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [filters, setFilters] = useState({ cut: "" });
  const [totalCount, setTotalCount] = useState(0);

  const fetchAsignaciones = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        estado: "true",
      };
      if (filters.cut) params.cut = filters.cut;

      const response = await api.get("/asignaciones-expediente", { params });
      setAsignaciones(response.data.asignaciones || []);
      setTotalCount(response.data.totalAsignaciones || 0);
    } catch (error) {
      console.error("Error fetching asignaciones:", error);
      toast.error("Error al cargar asignaciones");
    } finally {
      setLoading(false);
    }
  }, [pagination, filters]);

  useEffect(() => {
    fetchAsignaciones();
  }, [fetchAsignaciones]);

  const fetchUsuarios = useCallback(async (filtro = "") => {
    setLoadingUsuarios(true);
    try {
      const params: any = { limit: 10 };
      if (filtro) params.filtro = filtro;
      const res = await api.get("/usuarios/select", { params });
      setUsuarios(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Error cargando usuarios:", error);
    } finally {
      setLoadingUsuarios(false);
    }
  }, []);

  useEffect(() => {
    if (showModal) fetchUsuarios();
  }, [showModal, fetchUsuarios]);

  const opcionesUsuarios = usuarios.map((u) => ({
    id: u.id,
    nombre: etiquetaUsuario(u.nombre, u.cargo),
  }));

  const handleOpenModal = () => {
    setFormData(getEmptyForm());
    setSelectedUsuarioName("");
    setEditingId(null);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleEdit = (asignacion: Asignacion) => {
    setFormData({
      cut: asignacion.cut,
      id_usuario: asignacion.id_usuario,
      fecha_asignacion: asignacion.fecha_asignacion.slice(0, 10),
      plazo_atencion: String(asignacion.plazo_atencion),
      observacion: asignacion.observacion || "",
      numero_orden: asignacion.numero_orden || "",
    });
    setSelectedUsuarioName(
      asignacion.asignado
        ? etiquetaUsuario(
            `${asignacion.asignado.nombre} ${asignacion.asignado.apellido}`,
            asignacion.asignado.Cargo?.nombre
          )
        : ""
    );
    setEditingId(asignacion.id);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingId && !formData.cut.trim()) {
      toast.error("El CUT es obligatorio");
      return;
    }
    if (!formData.id_usuario) {
      toast.error("Seleccione el usuario asignado");
      return;
    }
    if (!formData.fecha_asignacion) {
      toast.error("La fecha de asignación es obligatoria");
      return;
    }
    if (!formData.plazo_atencion || Number(formData.plazo_atencion) < 1) {
      toast.error("El plazo debe ser un número mayor a 0");
      return;
    }

    const payload: any = {
      id_usuario: Number(formData.id_usuario),
      fecha_asignacion: formData.fecha_asignacion,
      plazo_atencion: Number(formData.plazo_atencion),
      observacion: formData.observacion,
      numero_orden: formData.numero_orden,
    };

    try {
      if (editingId) {
        await api.put(`/asignaciones-expediente/${editingId}`, payload);
        toast.success("Asignación actualizada correctamente");
      } else {
        await api.post("/asignaciones-expediente", { ...payload, cut: formData.cut });
        toast.success("Asignación creada correctamente");
      }
      handleCloseModal();
      await fetchAsignaciones();
    } catch (error: any) {
      toast.error(error.response?.data?.mensaje || "Error al procesar la solicitud");
    }
  };

  const handleOpenProrroga = (asignacion: Asignacion) => {
    setProrrogaTarget(asignacion);
    setProrrogaData({ plazo: "" });
  };

  const handleSubmitProrroga = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prorrogaTarget) return;

    if (!prorrogaData.plazo || Number(prorrogaData.plazo) < 1) {
      toast.error("El plazo de prórroga debe ser un número mayor a 0");
      return;
    }

    try {
      await api.patch(`/asignaciones-expediente/${prorrogaTarget.id}/prorroga`, {
        plazo_prorroga: Number(prorrogaData.plazo),
      });
      toast.success("Prórroga solicitada, pendiente de aceptación");
      setProrrogaTarget(null);
      await fetchAsignaciones();
    } catch (error: any) {
      toast.error(error.response?.data?.mensaje || "Error al solicitar la prórroga");
    }
  };

  const handleOpenRevision = (asignacion: Asignacion) => {
    setRevisionTarget(asignacion);
    setRevisionData({ plazo: String(asignacion.plazo_prorroga ?? ""), observacion: "" });
  };

  const handleAceptarProrroga = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revisionTarget) return;
    if (!revisionData.plazo || Number(revisionData.plazo) < 1) {
      toast.error("El plazo de prórroga debe ser un número mayor a 0");
      return;
    }
    try {
      await api.patch(`/asignaciones-expediente/${revisionTarget.id}/prorroga/aceptar`, {
        plazo_prorroga: Number(revisionData.plazo),
        observacion: revisionData.observacion,
      });
      toast.success("Prórroga aceptada");
      setRevisionTarget(null);
      await fetchAsignaciones();
    } catch (error: any) {
      toast.error(error.response?.data?.mensaje || "Error al aceptar la prórroga");
    }
  };

  const handleRechazarProrroga = async () => {
    if (!revisionTarget) return;
    try {
      await api.patch(`/asignaciones-expediente/${revisionTarget.id}/prorroga/rechazar`, {
        observacion: revisionData.observacion,
      });
      toast.success("Prórroga rechazada");
      setRevisionTarget(null);
      await fetchAsignaciones();
    } catch (error: any) {
      toast.error(error.response?.data?.mensaje || "Error al rechazar la prórroga");
    }
  };

  const handleOpenHistorial = async (asignacion: Asignacion) => {
    setHistorialTarget(asignacion);
    setHistorialRows([]);
    setHistorialCargando(true);
    try {
      const res = await api.get(`/asignaciones-expediente/${asignacion.id}/historial`);
      setHistorialRows(res.data || []);
    } catch (error: any) {
      toast.error("Error al cargar el historial");
    } finally {
      setHistorialCargando(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("¿Está seguro de que desea desactivar esta asignación?")) {
      return;
    }
    try {
      await api.delete(`/asignaciones-expediente/${id}`);
      toast.success("Asignación desactivada correctamente");
      await fetchAsignaciones();
    } catch (error: any) {
      toast.error("Error al desactivar la asignación");
    }
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPagination({ pageIndex: 0, pageSize: 10 });
  };

  return (
    <>
      <PageMeta
        title="Asignación de Expediente | Sistema de Seguimiento"
        description="Asignación de expedientes con plazos y prórroga"
      />
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Asignación de Expediente
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Asigna expedientes a usuarios con plazos calendario, prórroga y observaciones
            </p>
          </div>
          <button
            onClick={handleOpenModal}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            <PlusIcon className="h-5 w-5" />
            Nueva Asignación
          </button>
        </div>

        <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
          <Label>Buscar por CUT</Label>
          <Input
            name="cut"
            value={filters.cut}
            onChange={handleFilterChange}
            placeholder="Ej: 101183-2025"
          />
        </div>

        {/* Modal crear / editar */}
        {showModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-lg rounded-lg bg-white shadow-2xl dark:bg-gray-800 max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between border-b p-6 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {editingId ? "Editar Asignación" : "Nueva Asignación"}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400"
                >
                  <CloseIcon className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto p-6">
                <div>
                  <Label>CUT *</Label>
                  <Input
                    value={formData.cut}
                    onChange={(e) => setFormData({ ...formData, cut: e.target.value })}
                    placeholder="Ej: 101183-2025"
                    disabled={!!editingId}
                  />
                </div>
                <div>
                  <Label>Usuario asignado *</Label>
                  <SearchableSelect
                    value={formData.id_usuario}
                    onChange={(value) => setFormData({ ...formData, id_usuario: value as number })}
                    options={opcionesUsuarios}
                    onSearch={(term) => fetchUsuarios(term)}
                    isLoading={loadingUsuarios}
                    placeholder="Buscar por nombre o usuario..."
                    selectedLabel={selectedUsuarioName}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <DatePickerLima
                    label="Fecha de asignación *"
                    value={formData.fecha_asignacion}
                    onChange={(date) => setFormData({ ...formData, fecha_asignacion: date })}
                    placeholder="DD/MM/YYYY"
                  />
                  <div>
                    <Label>Plazo (días calendario) *</Label>
                    <Input
                      type="number"
                      min={1}
                      value={formData.plazo_atencion}
                      onChange={(e) => setFormData({ ...formData, plazo_atencion: e.target.value })}
                      placeholder="Ej: 15"
                    />
                  </div>
                </div>
                <div>
                  <Label>Número de orden (locadores)</Label>
                  <Input
                    value={formData.numero_orden}
                    onChange={(e) => setFormData({ ...formData, numero_orden: e.target.value })}
                    placeholder="Opcional"
                  />
                </div>
                <div>
                  <Label>Observación (entregable o detalle)</Label>
                  <textarea
                    value={formData.observacion}
                    onChange={(e) => setFormData({ ...formData, observacion: e.target.value })}
                    placeholder="Describa el entregable o detalle"
                    rows={3}
                    className="w-full rounded border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-700"
                  />
                </div>

                <div className="flex gap-3 border-t pt-4 dark:border-gray-700">
                  <button
                    type="submit"
                    className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                  >
                    {editingId ? "Actualizar" : "Guardar"}
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal prórroga */}
        {prorrogaTarget && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-lg bg-white shadow-2xl dark:bg-gray-800">
              <div className="flex items-center justify-between border-b p-6 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Registrar prórroga — {prorrogaTarget.cut}
                </h2>
                <button
                  onClick={() => setProrrogaTarget(null)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400"
                >
                  <CloseIcon className="h-6 w-6" />
                </button>
              </div>
              <form onSubmit={handleSubmitProrroga} className="space-y-4 p-6">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Vencimiento actual: <strong>{formatFecha(prorrogaTarget.fecha_vencimiento)}</strong>.
                  La prórroga se contará desde esa fecha, una vez aceptada.
                </p>
                <div>
                  <Label>Plazo de prórroga (días calendario) *</Label>
                  <Input
                    type="number"
                    min={1}
                    value={prorrogaData.plazo}
                    onChange={(e) => setProrrogaData({ ...prorrogaData, plazo: e.target.value })}
                    placeholder="Ej: 5"
                  />
                </div>
                <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                  Fecha de solicitud: hoy ({formatFecha(hoyLima())}). Quedará pendiente hasta que sea aceptada o rechazada.
                </p>
                <div className="flex gap-3 border-t pt-4 dark:border-gray-700">
                  <button
                    type="submit"
                    className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                  >
                    Registrar prórroga
                  </button>
                  <button
                    type="button"
                    onClick={() => setProrrogaTarget(null)}
                    className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal revisar prórroga */}
        {revisionTarget && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
            <form
              onSubmit={handleAceptarProrroga}
              className="w-full max-w-md space-y-4 rounded-lg bg-white p-6 shadow-2xl dark:bg-gray-800"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Revisar prórroga — {revisionTarget.cut}
                </h2>
                <button
                  type="button"
                  onClick={() => setRevisionTarget(null)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400"
                >
                  <CloseIcon className="h-6 w-6" />
                </button>
              </div>
              <div className="rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-700/50">
                <div>
                  Solicitada el <strong>{formatFecha(revisionTarget.fecha_prorroga)}</strong> por{" "}
                  <strong>{revisionTarget.plazo_prorroga}</strong> días calendario.
                </div>
                <div className="mt-1 text-gray-600 dark:text-gray-300">
                  Vencimiento actual: {formatFecha(revisionTarget.fecha_vencimiento)}
                </div>
              </div>
              <div>
                <Label>Días de prórroga a aceptar *</Label>
                <Input
                  type="number"
                  min={1}
                  value={revisionData.plazo}
                  onChange={(e) => setRevisionData({ ...revisionData, plazo: e.target.value })}
                />
                <p className="mt-1 text-xs text-gray-500">Puedes cambiar los días antes de aceptar.</p>
              </div>
              <div>
                <Label>Observación</Label>
                <textarea
                  value={revisionData.observacion}
                  onChange={(e) => setRevisionData({ ...revisionData, observacion: e.target.value })}
                  rows={2}
                  placeholder="Motivo o comentario (opcional)"
                  className="w-full rounded border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-700"
                />
              </div>
              <div className="flex gap-3 border-t pt-4 dark:border-gray-700">
                <button type="submit" className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700">
                  Aceptar prórroga
                </button>
                <button
                  type="button"
                  onClick={handleRechazarProrroga}
                  className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
                >
                  Rechazar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Modal historial */}
        {historialTarget && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-900/50 p-4">
            <div className="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-gray-800">
              <div className="flex items-center gap-3 bg-brand-600 px-5 py-3 text-white">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-white/70">Historial</span>
                <h2 className="text-lg font-bold">{historialTarget.cut}</h2>
                <button
                  onClick={() => setHistorialTarget(null)}
                  className="ml-auto rounded-full p-1 text-white/80 hover:bg-white/20 hover:text-white"
                >
                  <CloseIcon className="h-5 w-5" />
                </button>
              </div>
              <div className="overflow-auto">
                {historialCargando && (
                  <div className="p-10 text-center text-sm text-gray-500">Cargando historial...</div>
                )}
                {!historialCargando && historialRows.length === 0 && (
                  <div className="p-10 text-center text-sm text-gray-500">Esta asignación no tiene eventos de prórroga.</div>
                )}
                {!historialCargando && historialRows.length > 0 && (
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-700 dark:text-gray-300">
                      <tr>
                        <th className="px-4 py-2 text-start">Fecha</th>
                        <th className="px-4 py-2 text-start">Evento</th>
                        <th className="px-4 py-2 text-center">Días</th>
                        <th className="px-4 py-2 text-start">Usuario</th>
                        <th className="px-4 py-2 text-start">Observación</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {historialRows.map((h) => (
                        <tr key={h.id}>
                          <td className="whitespace-nowrap px-4 py-2">{formatFecha(h.fecha_evento)}</td>
                          <td className="px-4 py-2 font-semibold">{ETIQUETA_EVENTO[h.tipo] || h.tipo}</td>
                          <td className="px-4 py-2 text-center">{h.plazo ?? "—"}</td>
                          <td className="px-4 py-2">{h.usuario ? `${h.usuario.nombre} ${h.usuario.apellido}` : "—"}</td>
                          <td className="px-4 py-2 text-gray-600 dark:text-gray-300">{h.observacion || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {cutAbierto && (
          <ExpedienteDetalleModal cut={cutAbierto} onClose={() => setCutAbierto(null)} />
        )}

        {/* Tabla */}
        <div className="overflow-hidden rounded-lg bg-white shadow dark:bg-gray-800">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-12 text-center text-gray-500">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
                <p className="mt-4">Cargando asignaciones...</p>
              </div>
            ) : asignaciones.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50 dark:bg-gray-700">
                    <th className="px-6 py-4 text-start text-sm font-semibold">#</th>
                    <th className="px-6 py-4 text-start text-sm font-semibold">CUT</th>
                    <th className="px-6 py-4 text-start text-sm font-semibold">Asignado a</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold">Asignación</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold">Plazo (días)</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold">Vencimiento</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold">Prórroga</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold">Vence prórroga</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold">Días restantes</th>
                    <th className="px-6 py-4 text-start text-sm font-semibold">Observación</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {asignaciones.map((a, index) => (
                    <tr key={a.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 text-sm">
                        {pagination.pageIndex * pagination.pageSize + index + 1}
                      </td>
                      <td className="px-6 py-4 font-medium">
                        <button
                          onClick={() => setCutAbierto(a.cut)}
                          className="text-blue-600 hover:underline dark:text-blue-400"
                        >
                          {a.cut}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div>{nombreUsuario(a.asignado)}</div>
                        {a.numero_orden && (
                          <div className="text-xs text-gray-500">Orden: {a.numero_orden}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center text-sm">{formatFecha(a.fecha_asignacion)}</td>
                      <td className="px-6 py-4 text-center text-sm">{a.plazo_atencion}</td>
                      <td className="px-6 py-4 text-center text-sm">{formatFecha(a.fecha_vencimiento)}</td>
                      <td className="px-6 py-4 text-center text-sm">
                        {a.estado_prorroga && ESTADO_PRORROGA[a.estado_prorroga] ? (
                          <>
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${ESTADO_PRORROGA[a.estado_prorroga].clases}`}>
                              {ESTADO_PRORROGA[a.estado_prorroga].texto}
                            </span>
                            <div className="mt-1 text-xs text-gray-500">
                              {a.plazo_prorroga} días · {formatFecha(a.fecha_prorroga)}
                            </div>
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-6 py-4 text-center text-sm">
                        {a.estado_prorroga === "ACEPTADA" ? formatFecha(a.fecha_vencimiento_prorroga) : "—"}
                      </td>
                      <td className="px-6 py-4 text-center text-sm">
                        <DiasRestantes a={a} />
                      </td>
                      <td className="max-w-xs px-6 py-4 text-sm">{a.observacion || "—"}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-3">
                          {puedeProrrogar(a) && (
                            <button
                              onClick={() => handleOpenProrroga(a)}
                              className="rounded border border-blue-600 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400"
                            >
                              Prórroga
                            </button>
                          )}
                          {a.estado_prorroga === "PENDIENTE" && (
                            <button
                              onClick={() => handleOpenRevision(a)}
                              className="rounded bg-amber-500 px-2 py-1 text-xs font-semibold text-white hover:bg-amber-600"
                            >
                              Revisar
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenHistorial(a)}
                            className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                          >
                            Historial
                          </button>
                          <button
                            onClick={() => handleEdit(a)}
                            className="text-green-600 hover:text-green-800 dark:text-green-400"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(a.id)}
                            className="text-red-600 hover:text-red-800 dark:text-red-400"
                          >
                            <TrashBinIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-12 text-center text-gray-500">
                No hay asignaciones disponibles
              </div>
            )}
          </div>

          {asignaciones.length > 0 && (
            <div className="flex items-center justify-between border-t bg-gray-50 px-6 py-4 dark:border-gray-700 dark:bg-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Mostrando {pagination.pageIndex * pagination.pageSize + 1}-
                {Math.min((pagination.pageIndex + 1) * pagination.pageSize, totalCount)}{" "}
                de {totalCount}
              </div>
              <div className="flex items-center gap-4">
                <select
                  value={pagination.pageSize}
                  onChange={(e) =>
                    setPagination({ pageIndex: 0, pageSize: Number(e.target.value) })
                  }
                  className="rounded border border-gray-300 bg-white px-3 py-1 text-sm dark:border-gray-600 dark:bg-gray-700"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                </select>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setPagination((p) => ({ ...p, pageIndex: Math.max(0, p.pageIndex - 1) }))
                    }
                    disabled={pagination.pageIndex === 0}
                    className="rounded border border-gray-300 px-3 py-1 text-sm disabled:opacity-50"
                  >
                    ← Anterior
                  </button>
                  <button
                    onClick={() =>
                      setPagination((p) => ({ ...p, pageIndex: p.pageIndex + 1 }))
                    }
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
    </>
  );
}

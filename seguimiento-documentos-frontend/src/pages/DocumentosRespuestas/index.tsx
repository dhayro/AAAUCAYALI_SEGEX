import PageMeta from "@/components/common/PageMeta";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import api from "@/utils/api";
import { PencilIcon, TrashBinIcon, PlusIcon, CloseIcon, CheckCircleIcon } from "@/icons";
import { formatDate } from "@/utils/dateUtils";

interface Respuesta {
  id: number;
  id_asignacion: number;
  numero_documento: string;
  usuario_responsable: string;
  fecha_vencimiento: string;
  fecha_respuesta?: string;
  descripcion_respuesta?: string;
  estado: "pendiente" | "respondido" | "terminado";
  observaciones?: string;
}

export default function DocumentosRespuestas() {
  const [respuestas, setRespuestas] = useState<Respuesta[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showRespuestaModal, setShowRespuestaModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    descripcion_respuesta: "",
    observaciones: "",
  });

  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const [filters, setFilters] = useState({
    filtro: "",
    estado: "pendiente",
  });

  const [totalCount, setTotalCount] = useState(0);
  const [selectedRespuesta, setSelectedRespuesta] = useState<Respuesta | null>(null);

  useEffect(() => {
    fetchRespuestas();
  }, [pagination, filters]);

  const fetchRespuestas = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
      };

      if (filters.filtro) params.filtro = filters.filtro;
      if (filters.estado) params.estado = filters.estado;

      const response = await api.get("/respuestas", { params });
      setRespuestas(Array.isArray(response.data) ? response.data : response.data.respuestas || []);
      setTotalCount(response.data.totalRespuestas || response.data.length);
    } catch (error) {
      console.error("Error fetching respuestas:", error);
      toast.error("Error al cargar respuestas");
    } finally {
      setLoading(false);
    }
  }, [pagination, filters]);

  const handleOpenRespuestaModal = (respuesta: Respuesta) => {
    setSelectedRespuesta(respuesta);
    setFormData({
      descripcion_respuesta: respuesta.descripcion_respuesta || "",
      observaciones: respuesta.observaciones || "",
    });
    setShowRespuestaModal(true);
  };

  const handleOpenModal = (respuesta: Respuesta) => {
    setSelectedRespuesta(respuesta);
    setFormData({
      descripcion_respuesta: respuesta.descripcion_respuesta || "",
      observaciones: respuesta.observaciones || "",
    });
    setEditingId(respuesta.id);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setShowRespuestaModal(false);
    setSelectedRespuesta(null);
    setEditingId(null);
  };

  const handleSubmitRespuesta = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.descripcion_respuesta.trim()) {
      toast.error("La descripción de la respuesta es requerida");
      return;
    }

    try {
      const payload = {
        id_respuesta: selectedRespuesta?.id,
        descripcion_respuesta: formData.descripcion_respuesta,
        observaciones: formData.observaciones,
      };

      await api.post("/respuestas/registrar", payload);
      toast.success("Respuesta registrada correctamente");
      handleCloseModal();
      await fetchRespuestas();
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.mensaje || "Error al registrar respuesta";
      toast.error(errorMsg);
    }
  };

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.descripcion_respuesta.trim()) {
      toast.error("La descripción de la respuesta es requerida");
      return;
    }

    try {
      await api.put(`/respuestas/${editingId}`, formData);
      toast.success("Respuesta actualizada correctamente");
      handleCloseModal();
      await fetchRespuestas();
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.mensaje || "Error al actualizar respuesta";
      toast.error(errorMsg);
    }
  };

  const handleTerminar = async (id: number) => {
    if (!window.confirm("¿Está seguro de que desea terminar este documento?")) {
      return;
    }

    try {
      await api.patch(`/respuestas/${id}/terminar`);
      toast.success("Documento terminado correctamente");
      await fetchRespuestas();
    } catch (error: any) {
      toast.error("Error al terminar el documento");
    }
  };

  const handleReasignar = async (id: number) => {
    const nuevoUsuario = prompt("Ingrese el ID del nuevo usuario:");
    if (!nuevoUsuario) return;

    try {
      await api.patch(`/respuestas/${id}/reasignar`, {
        id_usuario_nuevo: parseInt(nuevoUsuario),
      });
      toast.success("Documento reasignado correctamente");
      await fetchRespuestas();
    } catch (error: any) {
      toast.error("Error al reasignar documento");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("¿Está seguro de que desea eliminar esta respuesta?")) {
      return;
    }

    try {
      await api.delete(`/respuestas/${id}`);
      toast.success("Respuesta eliminada correctamente");
      await fetchRespuestas();
    } catch (error: any) {
      toast.error("Error al eliminar la respuesta");
    }
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPagination({ pageIndex: 0, pageSize: 10 });
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case "terminado":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
      case "respondido":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100";
      case "pendiente":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100";
    }
  };

  const getDiasRestantes = (fechaVencimiento: string) => {
    const hoy = new Date();
    const vencimiento = new Date(fechaVencimiento);
    const dias = Math.ceil((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

    if (dias < 0) return `Vencido hace ${Math.abs(dias)} días`;
    if (dias === 0) return "Vence hoy";
    if (dias === 1) return "Vence mañana";
    return `${dias} días`;
  };

  return (
    <>
      <PageMeta
        title="Respuestas de Documentos | Sistema de Seguimiento"
        description="Gestión de respuestas a documentos asignados"
      />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Respuestas de Documentos
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Registra respuestas y cierra el ciclo de documentos
            </p>
          </div>
        </div>

        {/* Filtros */}
        <div className="grid grid-cols-1 gap-4 rounded-lg bg-gray-50 p-4 dark:bg-gray-800 md:grid-cols-2">
          <div>
            <Label>Buscar documento</Label>
            <Input
              name="filtro"
              value={filters.filtro}
              onChange={handleFilterChange}
              placeholder="Número de documento o usuario..."
            />
          </div>
          <div>
            <Label>Estado</Label>
            <select
              name="estado"
              value={filters.estado}
              onChange={handleFilterChange}
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-700"
            >
              <option value="">Todos</option>
              <option value="pendiente">Pendiente</option>
              <option value="respondido">Respondido</option>
              <option value="terminado">Terminado</option>
            </select>
          </div>
        </div>

        {/* Modal Registrar Respuesta */}
        {showRespuestaModal && selectedRespuesta && (
          <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-2xl rounded-lg bg-white shadow-2xl dark:bg-gray-800">
              <div className="flex items-center justify-between border-b p-6 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Registrar Respuesta
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400"
                >
                  <CloseIcon className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmitRespuesta} className="space-y-4 p-6">
                <div className="rounded bg-blue-50 p-4 dark:bg-blue-900/20">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <strong>Documento:</strong> {selectedRespuesta.numero_documento}
                  </p>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    <strong>Usuario Responsable:</strong> {selectedRespuesta.usuario_responsable}
                  </p>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    <strong>Fecha Vencimiento:</strong> {formatDate(selectedRespuesta.fecha_vencimiento)}
                  </p>
                </div>

                <div>
                  <Label>Descripción de la Respuesta *</Label>
                  <textarea
                    value={formData.descripcion_respuesta}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        descripcion_respuesta: e.target.value,
                      })
                    }
                    placeholder="Detalla la respuesta al documento..."
                    rows={5}
                    className="w-full rounded border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-700"
                    required
                  />
                </div>

                <div>
                  <Label>Observaciones</Label>
                  <textarea
                    value={formData.observaciones}
                    onChange={(e) =>
                      setFormData({ ...formData, observaciones: e.target.value })
                    }
                    placeholder="Observaciones adicionales..."
                    rows={3}
                    className="w-full rounded border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-700"
                  />
                </div>

                <div className="flex gap-3 border-t pt-4 dark:border-gray-700">
                  <button
                    type="submit"
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700"
                  >
                    <CheckCircleIcon className="h-5 w-5" />
                    Registrar Respuesta
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

        {/* Modal Editar Respuesta */}
        {showModal && selectedRespuesta && (
          <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-2xl rounded-lg bg-white shadow-2xl dark:bg-gray-800">
              <div className="flex items-center justify-between border-b p-6 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Editar Respuesta
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400"
                >
                  <CloseIcon className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmitEdit} className="space-y-4 p-6">
                <div className="rounded bg-blue-50 p-4 dark:bg-blue-900/20">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <strong>Documento:</strong> {selectedRespuesta.numero_documento}
                  </p>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    <strong>Usuario:</strong> {selectedRespuesta.usuario_responsable}
                  </p>
                </div>

                <div>
                  <Label>Descripción de la Respuesta</Label>
                  <textarea
                    value={formData.descripcion_respuesta}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        descripcion_respuesta: e.target.value,
                      })
                    }
                    placeholder="Detalla la respuesta..."
                    rows={5}
                    className="w-full rounded border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-700"
                  />
                </div>

                <div>
                  <Label>Observaciones</Label>
                  <textarea
                    value={formData.observaciones}
                    onChange={(e) =>
                      setFormData({ ...formData, observaciones: e.target.value })
                    }
                    placeholder="Observaciones..."
                    rows={3}
                    className="w-full rounded border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-700"
                  />
                </div>

                <div className="flex gap-3 border-t pt-4 dark:border-gray-700">
                  <button
                    type="submit"
                    className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                  >
                    Actualizar
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

        {/* Tabla */}
        <div className="overflow-hidden rounded-lg bg-white shadow dark:bg-gray-800">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-12 text-center text-gray-500">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
                <p className="mt-4">Cargando respuestas...</p>
              </div>
            ) : respuestas.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50 dark:bg-gray-700">
                    <th className="px-6 py-4 text-start text-sm font-semibold">#</th>
                    <th className="px-6 py-4 text-start text-sm font-semibold">Documento</th>
                    <th className="px-6 py-4 text-start text-sm font-semibold">Usuario</th>
                    <th className="px-6 py-4 text-start text-sm font-semibold">Vencimiento</th>
                    <th className="px-6 py-4 text-start text-sm font-semibold">Dias</th>
                    <th className="px-6 py-4 text-start text-sm font-semibold">Estado</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {respuestas.map((respuesta, index) => (
                    <tr
                      key={respuesta.id}
                      className="border-b hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <td className="px-6 py-4 text-sm">
                        {pagination.pageIndex * pagination.pageSize + index + 1}
                      </td>
                      <td className="px-6 py-4 font-medium">{respuesta.numero_documento}</td>
                      <td className="px-6 py-4 text-sm">{respuesta.usuario_responsable}</td>
                      <td className="px-6 py-4 text-sm">
                        {formatDate(respuesta.fecha_vencimiento)}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {getDiasRestantes(respuesta.fecha_vencimiento)}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getEstadoBadge(respuesta.estado)}`}>
                          {respuesta.estado}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          {respuesta.estado === "pendiente" && (
                            <button
                              onClick={() => handleOpenRespuestaModal(respuesta)}
                              className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
                              title="Registrar respuesta"
                            >
                              <PlusIcon className="h-5 w-5" />
                            </button>
                          )}
                          {respuesta.estado === "respondido" && (
                            <>
                              <button
                                onClick={() => handleTerminar(respuesta.id)}
                                className="text-green-600 hover:text-green-800 dark:text-green-400"
                                title="Terminar"
                              >
                                <CheckCircleIcon className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleReasignar(respuesta.id)}
                                className="text-purple-600 hover:text-purple-800 dark:text-purple-400"
                                title="Reasignar"
                              >
                                <PencilIcon className="h-5 w-5" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleOpenModal(respuesta)}
                            className="text-orange-600 hover:text-orange-800 dark:text-orange-400"
                            title="Editar"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(respuesta.id)}
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
                No hay respuestas disponibles
              </div>
            )}
          </div>

          {/* Paginación */}
          {respuestas.length > 0 && (
            <div className="flex items-center justify-between border-t bg-gray-50 px-6 py-4 dark:border-gray-700 dark:bg-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Mostrando {pagination.pageIndex * pagination.pageSize + 1}-
                {Math.min(
                  (pagination.pageIndex + 1) * pagination.pageSize,
                  totalCount
                )}{" "}
                de {totalCount}
              </div>

              <div className="flex items-center gap-4">
                <select
                  value={pagination.pageSize}
                  onChange={(e) =>
                    setPagination({
                      pageIndex: 0,
                      pageSize: Number(e.target.value),
                    })
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
                      setPagination((p) => ({
                        ...p,
                        pageIndex: Math.max(0, p.pageIndex - 1),
                      }))
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
                    disabled={
                      (pagination.pageIndex + 1) * pagination.pageSize >=
                      totalCount
                    }
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

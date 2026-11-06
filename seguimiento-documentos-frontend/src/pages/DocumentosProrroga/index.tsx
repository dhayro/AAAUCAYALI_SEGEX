import PageMeta from "@/components/common/PageMeta";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import api from "@/utils/api";
import { PencilIcon, TrashBinIcon, CheckCircleIcon, CloseIcon, ChevronLeftIcon } from "@/icons";
import { formatDate } from "@/utils/dateUtils";

interface Prorroga {
  id: number;
  id_asignacion: number;
  numero_documento: string;
  usuario_asignado: string;
  plazo_original: number;
  plazo_solicitado: number;
  fecha_solicitud: string;
  estado: "pendiente" | "aprobada" | "rechazada";
  observaciones?: string;
}

export default function DocumentosProrroga() {
  const [prorrogas, setProrrogas] = useState<Prorroga[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    plazo_solicitado: 5,
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
  const [selectedProrroga, setSelectedProrroga] = useState<Prorroga | null>(null);

  useEffect(() => {
    fetchProrrogas();
  }, [pagination, filters]);

  const fetchProrrogas = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
      };

      if (filters.filtro) params.filtro = filters.filtro;
      if (filters.estado) params.estado = filters.estado;

      const response = await api.get("/prorrogas", { params });
      setProrrogas(Array.isArray(response.data) ? response.data : response.data.prorrogas || []);
      setTotalCount(response.data.totalProrrogas || response.data.length);
    } catch (error) {
      console.error("Error fetching prorrogas:", error);
      toast.error("Error al cargar prórroga");
    } finally {
      setLoading(false);
    }
  }, [pagination, filters]);

  const handleOpenModal = (prorroga: Prorroga) => {
    setSelectedProrroga(prorroga);
    setFormData({
      plazo_solicitado: prorroga.plazo_solicitado,
      observaciones: prorroga.observaciones || "",
    });
    setEditingId(prorroga.id);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedProrroga(null);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.plazo_solicitado || formData.plazo_solicitado <= 0) {
      toast.error("El plazo debe ser mayor a 0 días");
      return;
    }

    try {
      if (editingId) {
        await api.put(`/prorrogas/${editingId}`, formData);
        toast.success("Prórroga actualizada correctamente");
      } else {
        // Para crear no se usa este formulario
        toast.error("No se pueden crear prórroga desde aquí");
        return;
      }

      handleCloseModal();
      await fetchProrrogas();
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.mensaje || "Error al procesar la solicitud";
      toast.error(errorMsg);
    }
  };

  const handleAprobar = async (id: number) => {
    if (!window.confirm("¿Está seguro de que desea aprobar esta prórroga?")) {
      return;
    }

    try {
      await api.patch(`/prorrogas/${id}/aprobar`);
      toast.success("Prórroga aprobada correctamente");
      await fetchProrrogas();
    } catch (error: any) {
      toast.error("Error al aprobar la prórroga");
    }
  };

  const handleRechazar = async (id: number) => {
    if (!window.confirm("¿Está seguro de que desea rechazar esta prórroga?")) {
      return;
    }

    try {
      await api.patch(`/prorrogas/${id}/rechazar`);
      toast.success("Prórroga rechazada");
      await fetchProrrogas();
    } catch (error: any) {
      toast.error("Error al rechazar la prórroga");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("¿Está seguro de que desea eliminar esta prórroga?")) {
      return;
    }

    try {
      await api.delete(`/prorrogas/${id}`);
      toast.success("Prórroga eliminada correctamente");
      await fetchProrrogas();
    } catch (error: any) {
      toast.error("Error al eliminar la prórroga");
    }
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPagination({ pageIndex: 0, pageSize: 10 });
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case "aprobada":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
      case "rechazada":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100";
      case "pendiente":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100";
    }
  };

  return (
    <>
      <PageMeta
        title="Prórroga de Documentos | Sistema de Seguimiento"
        description="Gestión de prórroga de documentos"
      />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Prórroga de Documentos
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Solicita o aprueba prórroga de documentos asignados
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
              <option value="aprobada">Aprobada</option>
              <option value="rechazada">Rechazada</option>
            </select>
          </div>
        </div>

        {/* Modal */}
        {showModal && selectedProrroga && (
          <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-lg bg-white shadow-2xl dark:bg-gray-800">
              <div className="flex items-center justify-between border-b p-6 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Editar Prórroga
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400"
                >
                  <CloseIcon className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 p-6">
                <div className="rounded bg-blue-50 p-4 dark:bg-blue-900/20">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <strong>Documento:</strong> {selectedProrroga.numero_documento}
                  </p>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    <strong>Usuario:</strong> {selectedProrroga.usuario_asignado}
                  </p>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    <strong>Plazo Original:</strong> {selectedProrroga.plazo_original} días
                  </p>
                </div>

                <div>
                  <Label>Plazo Solicitado (días) *</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.plazo_solicitado}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        plazo_solicitado: parseInt(e.target.value) || 0,
                      })
                    }
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
                    className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                  >
                    Guardar
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
                <p className="mt-4">Cargando prórroga...</p>
              </div>
            ) : prorrogas.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50 dark:bg-gray-700">
                    <th className="px-6 py-4 text-start text-sm font-semibold">#</th>
                    <th className="px-6 py-4 text-start text-sm font-semibold">Documento</th>
                    <th className="px-6 py-4 text-start text-sm font-semibold">Usuario</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold">
                      Plazo Original
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold">
                      Plazo Solicitado
                    </th>
                    <th className="px-6 py-4 text-start text-sm font-semibold">Fecha</th>
                    <th className="px-6 py-4 text-start text-sm font-semibold">Estado</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {prorrogas.map((prorroga, index) => (
                    <tr
                      key={prorroga.id}
                      className="border-b hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <td className="px-6 py-4 text-sm">
                        {pagination.pageIndex * pagination.pageSize + index + 1}
                      </td>
                      <td className="px-6 py-4 font-medium">{prorroga.numero_documento}</td>
                      <td className="px-6 py-4 text-sm">{prorroga.usuario_asignado}</td>
                      <td className="px-6 py-4 text-center text-sm">
                        {prorroga.plazo_original} días
                      </td>
                      <td className="px-6 py-4 text-center text-sm">
                        {prorroga.plazo_solicitado} días
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {formatDate(prorroga.fecha_solicitud)}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getEstadoBadge(prorroga.estado)}`}>
                          {prorroga.estado}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          {prorroga.estado === "pendiente" && (
                            <>
                              <button
                                onClick={() => handleAprobar(prorroga.id)}
                                className="text-green-600 hover:text-green-800 dark:text-green-400"
                                title="Aprobar"
                              >
                                <CheckCircleIcon className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleRechazar(prorroga.id)}
                                className="text-red-600 hover:text-red-800 dark:text-red-400"
                                title="Rechazar"
                              >
                                <CloseIcon className="h-5 w-5" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleOpenModal(prorroga)}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
                            title="Editar"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(prorroga.id)}
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
                No hay prórroga disponible
              </div>
            )}
          </div>

          {/* Paginación */}
          {prorrogas.length > 0 && (
            <div className="flex items-center justify-between border-t bg-gray-50 px-6 py-4 dark:border-gray-700 dark:bg-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Mostrando {pagination.pageIndex * pagination.pageSize + 1}-
                {Math.min(
                  (pagination.pageIndex + 1) * pagination.pageSize,
                  totalCount
                )}{" "}
                de {totalCount}
              </div>

              <div className="flex flex-nowrap items-center gap-4">
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
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={150}>150</option>
                  <option value={200}>200</option>
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
                   title="Anterior" aria-label="Anterior" className="inline-flex h-8 w-8 items-center justify-center rounded border border-gray-300 disabled:opacity-50 dark:border-gray-600"><ChevronLeftIcon className="h-4 w-4" /></button>
                  <span className="whitespace-nowrap px-2 py-1 text-sm">
                    {pagination.pageIndex + 1} / {Math.max(1, Math.ceil(totalCount / pagination.pageSize))}
                  </span>
                  <button
                    onClick={() =>
                      setPagination((p) => ({ ...p, pageIndex: p.pageIndex + 1 }))
                    }
                    disabled={
                      (pagination.pageIndex + 1) * pagination.pageSize >=
                      totalCount
                    }
                   title="Siguiente" aria-label="Siguiente" className="inline-flex h-8 w-8 items-center justify-center rounded border border-gray-300 disabled:opacity-50 dark:border-gray-600"><ChevronLeftIcon className="h-4 w-4 rotate-180" /></button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

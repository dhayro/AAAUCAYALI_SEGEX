import PageMeta from "@/components/common/PageMeta";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import api from "@/utils/api";
import { PencilIcon, TrashBinIcon, PlusIcon, CloseIcon } from "@/icons";

interface Accion {
  id: number;
  nombre: string;
  requiere_archivo: boolean;
  activo: boolean;
}

const formVacio = { nombre: "", requiere_archivo: true };

const selectClass =
  "w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700";

export default function AccionesAtencion() {
  const [acciones, setAcciones] = useState<Accion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState(formVacio);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [filters, setFilters] = useState({ filtro: "" });
  const [totalCount, setTotalCount] = useState(0);
  const [eliminando, setEliminando] = useState<Accion | null>(null);
  const [procesando, setProcesando] = useState(false);

  const fetchAcciones = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        solo_activas: "true",
      };
      if (filters.filtro) params.filtro = filters.filtro;
      const response = await api.get("/atenciones/acciones", { params });
      setAcciones(response.data.acciones || []);
      setTotalCount(response.data.totalAcciones || 0);
    } catch {
      toast.error("Error al cargar las acciones");
    } finally {
      setLoading(false);
    }
  }, [pagination, filters]);

  useEffect(() => {
    fetchAcciones();
  }, [fetchAcciones]);

  const handleOpenModal = () => {
    setFormData(formVacio);
    setEditingId(null);
    setShowModal(true);
  };

  const handleEdit = (accion: Accion) => {
    setFormData({ nombre: accion.nombre, requiere_archivo: accion.requiere_archivo });
    setEditingId(accion.id);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim()) {
      toast.error("El nombre de la acción es obligatorio");
      return;
    }
    try {
      if (editingId) {
        await api.put(`/atenciones/acciones/${editingId}`, formData);
        toast.success("Acción actualizada correctamente");
      } else {
        const res = await api.post("/atenciones/acciones", formData);
        toast.success(res.data.mensaje || "Acción creada correctamente");
      }
      setShowModal(false);
      await fetchAcciones();
    } catch (error: any) {
      toast.error(error.response?.data?.mensaje || "Error al procesar la solicitud");
    }
  };

  const confirmarEliminar = async () => {
    if (!eliminando) return;
    setProcesando(true);
    try {
      await api.delete(`/atenciones/acciones/${eliminando.id}`);
      toast.success("Acción eliminada correctamente");
      setEliminando(null);
      await fetchAcciones();
    } catch {
      toast.error("Error al eliminar la acción");
    } finally {
      setProcesando(false);
    }
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPagination({ pageIndex: 0, pageSize: 10 });
  };

  return (
    <>
      <PageMeta title="Acciones de Atención | Sistema de Seguimiento" description="Catálogo de acciones para la atención de llamadas" />
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Acciones de Atención</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Administra las acciones que se pueden asignar a una llamada
            </p>
          </div>
          <button
            onClick={handleOpenModal}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            <PlusIcon className="h-5 w-5" />
            Nueva Acción
          </button>
        </div>

        <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
          <Label>Buscar acciones</Label>
          <Input name="filtro" value={filters.filtro} onChange={handleFilterChange} placeholder="Buscar por nombre..." />
        </div>

        {showModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-lg bg-white shadow-2xl dark:bg-gray-800">
              <div className="flex items-center justify-between border-b p-6 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {editingId ? "Editar Acción" : "Nueva Acción"}
                </h2>
                <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400">
                  <CloseIcon className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 p-6">
                <div>
                  <Label>Nombre *</Label>
                  <Input
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    placeholder="Ej: EMITIR INFORME LEGAL"
                    required
                  />
                </div>
                <div>
                  <Label>Requiere archivo</Label>
                  <select
                    value={formData.requiere_archivo ? "true" : "false"}
                    onChange={(e) => setFormData({ ...formData, requiere_archivo: e.target.value === "true" })}
                    className={selectClass}
                  >
                    <option value="true">Sí</option>
                    <option value="false">No</option>
                  </select>
                </div>

                <div className="flex gap-3 border-t pt-4 dark:border-gray-700">
                  <button type="submit" className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
                    {editingId ? "Actualizar" : "Guardar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="overflow-hidden rounded-lg bg-white shadow dark:bg-gray-800">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-12 text-center text-gray-500">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
                <p className="mt-4">Cargando acciones...</p>
              </div>
            ) : acciones.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50 dark:bg-gray-700">
                    <th className="px-6 py-4 text-start text-sm font-semibold">#</th>
                    <th className="px-6 py-4 text-start text-sm font-semibold">Acción</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold">Requiere archivo</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {acciones.map((a, index) => (
                    <tr key={a.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 text-sm">{pagination.pageIndex * pagination.pageSize + index + 1}</td>
                      <td className="px-6 py-4 font-medium">{a.nombre}</td>
                      <td className="px-6 py-4 text-center text-sm">{a.requiere_archivo ? "Sí" : "No"}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-3">
                          <button onClick={() => handleEdit(a)} className="text-green-600 hover:text-green-800 dark:text-green-400">
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button onClick={() => setEliminando(a)} className="text-red-600 hover:text-red-800 dark:text-red-400">
                            <TrashBinIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-12 text-center text-gray-500">No hay acciones disponibles</div>
            )}
          </div>

          {acciones.length > 0 && (
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

      <ConfirmDialog
        abierto={eliminando !== null}
        titulo="Eliminar acción"
        mensaje={
          <>
            Se quitará <strong>{eliminando?.nombre}</strong> del catálogo. Las llamadas que ya la usan la mantienen; si
            se vuelve a crear con el mismo nombre, se reactiva.
          </>
        }
        textoConfirmar="Sí, eliminar"
        peligro
        procesando={procesando}
        onConfirmar={confirmarEliminar}
        onCancelar={() => setEliminando(null)}
      />
    </>
  );
}

import PageMeta from "@/components/common/PageMeta";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import api from "@/utils/api";
import { PencilIcon, TrashBinIcon, PlusIcon, CloseIcon, ChevronLeftIcon } from "@/icons";

interface Cargo {
  id: number;
  nombre: string;
  descripcion?: string;
}

export default function Cargos() {
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
  });

  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const [filters, setFilters] = useState({
    filtro: "",
  });

  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetchCargos();
  }, [pagination, filters]);

  const fetchCargos = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
      };

      if (filters.filtro) params.filtro = filters.filtro;

      const response = await api.get("/cargos", { params });
      setCargos(Array.isArray(response.data) ? response.data : response.data.cargos || []);
      setTotalCount(response.data.totalCargos || response.data.length);
    } catch (error) {
      console.error("Error fetching cargos:", error);
      toast.error("Error al cargar cargos");
    } finally {
      setLoading(false);
    }
  }, [pagination, filters]);

  const handleOpenModal = () => {
    setFormData({
      nombre: "",
      descripcion: "",
    });
    setEditingId(null);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nombre.trim()) {
      toast.error("El nombre del cargo es requerido");
      return;
    }

    try {
      if (editingId) {
        await api.put(`/cargos/${editingId}`, formData);
        toast.success("Cargo actualizado correctamente");
      } else {
        await api.post("/cargos", formData);
        toast.success("Cargo creado correctamente");
      }

      handleCloseModal();
      await fetchCargos();
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.mensaje || "Error al procesar la solicitud";
      toast.error(errorMsg);
    }
  };

  const handleEdit = (cargo: Cargo) => {
    setFormData({
      nombre: cargo.nombre,
      descripcion: cargo.descripcion || "",
    });
    setEditingId(cargo.id);
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("¿Está seguro de que desea eliminar este cargo?")) {
      return;
    }

    try {
      await api.delete(`/cargos/${id}`);
      toast.success("Cargo eliminado correctamente");
      await fetchCargos();
    } catch (error: any) {
      toast.error("Error al eliminar el cargo");
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
        title="Cargos | Sistema de Seguimiento"
        description="Gestión de cargos"
      />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Gestión de Cargos
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Administra todos los cargos del sistema
            </p>
          </div>
          <button
            onClick={handleOpenModal}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            <PlusIcon className="h-5 w-5" />
            Nuevo Cargo
          </button>
        </div>

        {/* Filtros */}
        <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
          <Label>Buscar cargos</Label>
          <Input
            name="filtro"
            value={filters.filtro}
            onChange={handleFilterChange}
            placeholder="Buscar por nombre o descripción..."
          />
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-lg bg-white shadow-2xl dark:bg-gray-800">
              <div className="flex items-center justify-between border-b p-6 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {editingId ? "Editar Cargo" : "Nuevo Cargo"}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400"
                >
                  <CloseIcon className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 p-6">
                <div>
                  <Label>Nombre *</Label>
                  <Input
                    value={formData.nombre}
                    onChange={(e) =>
                      setFormData({ ...formData, nombre: e.target.value })
                    }
                    placeholder="Nombre del cargo"
                    required
                  />
                </div>
                <div>
                  <Label>Descripción</Label>
                  <textarea
                    value={formData.descripcion}
                    onChange={(e) =>
                      setFormData({ ...formData, descripcion: e.target.value })
                    }
                    placeholder="Descripción (opcional)"
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

        {/* Tabla */}
        <div className="overflow-hidden rounded-lg bg-white shadow dark:bg-gray-800">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-12 text-center text-gray-500">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
                <p className="mt-4">Cargando cargos...</p>
              </div>
            ) : cargos.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50 dark:bg-gray-700">
                    <th className="px-6 py-4 text-start text-sm font-semibold">
                      #
                    </th>
                    <th className="px-6 py-4 text-start text-sm font-semibold">
                      Nombre
                    </th>
                    <th className="px-6 py-4 text-start text-sm font-semibold">
                      Descripción
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {cargos.map((cargo, index) => (
                    <tr
                      key={cargo.id}
                      className="border-b hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <td className="px-6 py-4 text-sm">
                        {pagination.pageIndex * pagination.pageSize + index + 1}
                      </td>
                      <td className="px-6 py-4 font-medium">{cargo.nombre}</td>
                      <td className="px-6 py-4 text-sm">
                        {cargo.descripcion || "—"}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-3">
                          <button
                            onClick={() => handleEdit(cargo)}
                            className="text-green-600 hover:text-green-800 dark:text-green-400"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(cargo.id)}
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
                No hay cargos disponibles
              </div>
            )}
          </div>

          {/* Paginación */}
          {cargos.length > 0 && (
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

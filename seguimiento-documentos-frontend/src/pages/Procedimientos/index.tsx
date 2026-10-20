import PageMeta from "@/components/common/PageMeta";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import api from "@/utils/api";
import { PencilIcon, TrashBinIcon, PlusIcon, CloseIcon } from "@/icons";

interface UsuarioResumen {
  id: number;
  nombre: string;
  apellido: string;
  usuario: string;
}

interface Procedimiento {
  id: number;
  nombre: string;
  plazo: number;
  es_tupa: boolean;
  estado: boolean;
  fecha_creacion?: string;
  fecha_modificacion?: string;
  creador?: UsuarioResumen | null;
  modificador?: UsuarioResumen | null;
}

const emptyForm = {
  nombre: "",
  plazo: "",
  es_tupa: "false",
  estado: "true",
};

const formatFecha = (fecha?: string) => {
  if (!fecha) return "—";
  const [y, m, d] = fecha.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
};

const formatUsuario = (u?: UsuarioResumen | null) =>
  u ? `${u.nombre} ${u.apellido}` : "—";

export default function Procedimientos() {
  const [procedimientos, setProcedimientos] = useState<Procedimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState(emptyForm);

  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const [filters, setFilters] = useState({
    filtro: "",
    estado: "",
  });

  const [totalCount, setTotalCount] = useState(0);

  const fetchProcedimientos = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
      };
      if (filters.filtro) params.filtro = filters.filtro;
      if (filters.estado) params.estado = filters.estado;

      const response = await api.get("/procedimientos", { params });
      setProcedimientos(response.data.procedimientos || []);
      setTotalCount(response.data.totalProcedimientos || 0);
    } catch (error) {
      console.error("Error fetching procedimientos:", error);
      toast.error("Error al cargar procedimientos");
    } finally {
      setLoading(false);
    }
  }, [pagination, filters]);

  useEffect(() => {
    fetchProcedimientos();
  }, [fetchProcedimientos]);

  const handleOpenModal = () => {
    setFormData(emptyForm);
    setEditingId(null);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nombre.trim()) {
      toast.error("El nombre del procedimiento es requerido");
      return;
    }
    if (formData.plazo === "" || Number(formData.plazo) < 0) {
      toast.error("El plazo debe ser un número mayor o igual a 0");
      return;
    }

    const payload = {
      nombre: formData.nombre,
      plazo: Number(formData.plazo),
      es_tupa: formData.es_tupa === "true",
      estado: formData.estado === "true",
    };

    try {
      if (editingId) {
        await api.put(`/procedimientos/${editingId}`, payload);
        toast.success("Procedimiento actualizado correctamente");
      } else {
        await api.post("/procedimientos", payload);
        toast.success("Procedimiento creado correctamente");
      }

      handleCloseModal();
      await fetchProcedimientos();
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.mensaje || "Error al procesar la solicitud";
      toast.error(errorMsg);
    }
  };

  const handleEdit = (procedimiento: Procedimiento) => {
    setFormData({
      nombre: procedimiento.nombre,
      plazo: String(procedimiento.plazo),
      es_tupa: String(procedimiento.es_tupa),
      estado: String(procedimiento.estado),
    });
    setEditingId(procedimiento.id);
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("¿Está seguro de que desea eliminar este procedimiento?")) {
      return;
    }

    try {
      await api.delete(`/procedimientos/${id}`);
      toast.success("Procedimiento eliminado correctamente");
      await fetchProcedimientos();
    } catch (error: any) {
      toast.error("Error al eliminar el procedimiento");
    }
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPagination({ pageIndex: 0, pageSize: 10 });
  };

  const selectClass =
    "w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700";

  return (
    <>
      <PageMeta
        title="Procedimientos | Sistema de Seguimiento"
        description="Gestión de procedimientos"
      />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Gestión de Procedimientos
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Administra los procedimientos, su plazo y si pertenecen al TUPA
            </p>
          </div>
          <button
            onClick={handleOpenModal}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            <PlusIcon className="h-5 w-5" />
            Nuevo Procedimiento
          </button>
        </div>

        {/* Filtros */}
        <div className="grid grid-cols-1 gap-4 rounded-lg bg-gray-50 p-4 dark:bg-gray-800 md:grid-cols-2">
          <div>
            <Label>Buscar procedimientos</Label>
            <Input
              name="filtro"
              value={filters.filtro}
              onChange={handleFilterChange}
              placeholder="Buscar por nombre..."
            />
          </div>
          <div>
            <Label>Estado</Label>
            <select
              name="estado"
              value={filters.estado}
              onChange={handleFilterChange}
              className={selectClass}
            >
              <option value="">Todos</option>
              <option value="true">Activos</option>
              <option value="false">Inactivos</option>
            </select>
          </div>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-lg bg-white shadow-2xl dark:bg-gray-800">
              <div className="flex items-center justify-between border-b p-6 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {editingId ? "Editar Procedimiento" : "Nuevo Procedimiento"}
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
                    placeholder="Nombre del procedimiento"
                    required
                  />
                </div>
                <div>
                  <Label>Plazo (días hábiles) *</Label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.plazo}
                    onChange={(e) =>
                      setFormData({ ...formData, plazo: e.target.value })
                    }
                    placeholder="Ej: 15"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Tipo</Label>
                    <select
                      value={formData.es_tupa}
                      onChange={(e) =>
                        setFormData({ ...formData, es_tupa: e.target.value })
                      }
                      className={selectClass}
                    >
                      <option value="true">TUPA</option>
                      <option value="false">NO TUPA</option>
                    </select>
                  </div>
                  <div>
                    <Label>Estado</Label>
                    <select
                      value={formData.estado}
                      onChange={(e) =>
                        setFormData({ ...formData, estado: e.target.value })
                      }
                      className={selectClass}
                    >
                      <option value="true">Activo</option>
                      <option value="false">Inactivo</option>
                    </select>
                  </div>
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
                <p className="mt-4">Cargando procedimientos...</p>
              </div>
            ) : procedimientos.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50 dark:bg-gray-700">
                    <th className="px-6 py-4 text-start text-sm font-semibold">#</th>
                    <th className="px-6 py-4 text-start text-sm font-semibold">Nombre</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold">Plazo (días)</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold">Tipo</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold">Estado</th>
                    <th className="px-6 py-4 text-start text-sm font-semibold">Creado por</th>
                    <th className="px-6 py-4 text-start text-sm font-semibold">Modificado por</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {procedimientos.map((proc, index) => (
                    <tr
                      key={proc.id}
                      className="border-b hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <td className="px-6 py-4 text-sm">
                        {pagination.pageIndex * pagination.pageSize + index + 1}
                      </td>
                      <td className="px-6 py-4 font-medium">{proc.nombre}</td>
                      <td className="px-6 py-4 text-center text-sm">{proc.plazo}</td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            proc.es_tupa
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100"
                              : "bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-100"
                          }`}
                        >
                          {proc.es_tupa ? "TUPA" : "NO TUPA"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            proc.estado
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                              : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
                          }`}
                        >
                          {proc.estado ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div>{formatUsuario(proc.creador)}</div>
                        <div className="text-xs text-gray-500">{formatFecha(proc.fecha_creacion)}</div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div>{formatUsuario(proc.modificador)}</div>
                        <div className="text-xs text-gray-500">{formatFecha(proc.fecha_modificacion)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-3">
                          <button
                            onClick={() => handleEdit(proc)}
                            className="text-green-600 hover:text-green-800 dark:text-green-400"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(proc.id)}
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
                No hay procedimientos disponibles
              </div>
            )}
          </div>

          {/* Paginación */}
          {procedimientos.length > 0 && (
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

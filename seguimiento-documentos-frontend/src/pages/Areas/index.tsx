import PageMeta from "@/components/common/PageMeta";
import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import api from "@/utils/api";
import {
  PencilIcon,
  TrashBinIcon,
  PlusIcon,
  FolderIcon,
  CloseIcon,
} from "@/icons";

interface Area {
  id: number;
  nombre: string;
  descripcion: string;
  id_padre: number | null;
}

interface Breadcrumb {
  id: number | null;
  name: string;
}

export default function Areas() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [allAreas, setAllAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [currentParentId, setCurrentParentId] = useState<number | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([
    { id: null, name: "Áreas Principales" },
  ]);

  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    id_padre: null as number | null,
  });

  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const [filters, setFilters] = useState({
    filtro: "",
    nombre: "",
    descripcion: "",
  });

  const [totalCount, setTotalCount] = useState(0);
  const nombreInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAreas(currentParentId);
    fetchAllAreas();
  }, [currentParentId, pagination, filters]);

  useEffect(() => {
    if (showModal && nombreInputRef.current) {
      setTimeout(() => nombreInputRef.current?.focus(), 0);
    }
  }, [showModal]);

  const fetchAreas = useCallback(async (parentId: number | null = null) => {
    setLoading(true);
    try {
      const params: any = {
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
      };

      if (parentId === null) {
        params.id_padre = "null";
      } else {
        params.id_padre = parentId;
      }

      if (filters.nombre) params.nombre = filters.nombre;
      if (filters.descripcion) params.descripcion = filters.descripcion;
      if (filters.filtro) params.filtro = filters.filtro;

      const response = await api.get("/areas", { params });
      setAreas(response.data.areas || response.data);
      setTotalCount(response.data.totalAreas || response.data.length);
    } catch (error) {
      console.error("Error fetching areas:", error);
      toast.error("Error al cargar áreas");
    } finally {
      setLoading(false);
    }
  }, [pagination, filters]);

  const fetchAllAreas = useCallback(async () => {
    try {
      const response = await api.get("/areas", { params: { limit: 1000 } });
      setAllAreas(response.data.areas || response.data);
    } catch (error) {
      console.error("Error fetching all areas:", error);
    }
  }, []);

  const handleOpenModal = () => {
    setFormData({ nombre: "", descripcion: "", id_padre: currentParentId });
    setEditingId(null);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({ nombre: "", descripcion: "", id_padre: null });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nombre.trim()) {
      toast.error("El nombre del área no puede estar vacío");
      nombreInputRef.current?.focus();
      return;
    }

    const areaData = {
      nombre: formData.nombre.trim().toUpperCase(),
      descripcion: formData.descripcion.trim(),
      id_padre: formData.id_padre,
    };

    try {
      if (editingId) {
        await api.put(`/areas/${editingId}`, areaData);
        toast.success("Área actualizada correctamente");
      } else {
        await api.post("/areas", areaData);
        toast.success("Área agregada correctamente");
      }

      handleCloseModal();
      await fetchAreas(currentParentId);
      await fetchAllAreas();
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.mensaje || "Error al procesar la solicitud";
      toast.error(errorMsg);
    }
  };

  const handleEdit = (area: Area) => {
    setFormData({
      nombre: area.nombre,
      descripcion: area.descripcion || "",
      id_padre: area.id_padre,
    });
    setEditingId(area.id);
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    const confirmed = window.confirm(
      "¿Está seguro de que desea eliminar esta área? No podrá revertir esta acción"
    );

    if (!confirmed) return;

    try {
      await api.delete(`/areas/${id}`);
      toast.success("Área eliminada correctamente");
      await fetchAreas(currentParentId);
      await fetchAllAreas();
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.mensaje || "Error al eliminar el área";
      toast.error(errorMsg);
    }
  };

  const handleShowSubAreas = (area: Area) => {
    setCurrentParentId(area.id);
    setBreadcrumbs([...breadcrumbs, { id: area.id, name: area.nombre }]);
    setPagination({ pageIndex: 0, pageSize: 10 });
  };

  const handleBreadcrumbClick = (id: number | null, index: number) => {
    setCurrentParentId(id);
    setBreadcrumbs(breadcrumbs.slice(0, index + 1));
    setPagination({ pageIndex: 0, pageSize: 10 });
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPagination({ pageIndex: 0, pageSize: 10 });
  };

  const handleChangePage = (newPage: number) => {
    setPagination((old) => ({ ...old, pageIndex: newPage }));
  };

  const handleChangeRowsPerPage = (newPageSize: number) => {
    setPagination({ pageIndex: 0, pageSize: newPageSize });
  };

  return (
    <>
      <PageMeta
        title="Áreas | Sistema de Seguimiento"
        description="Gestión de áreas"
      />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Gestión de Áreas
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Administra todas las áreas del sistema
            </p>
          </div>
          <button
            onClick={handleOpenModal}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            <PlusIcon className="h-5 w-5" />
            Nueva Área
          </button>
        </div>

        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm">
          {breadcrumbs.map((crumb, index) => (
            <div key={crumb.id} className="flex items-center gap-2">
              <button
                onClick={() => handleBreadcrumbClick(crumb.id, index)}
                className={`${
                  index === breadcrumbs.length - 1
                    ? "font-semibold text-gray-900 dark:text-white"
                    : "text-blue-600 hover:text-blue-800 dark:text-blue-400"
                }`}
              >
                {crumb.name}
              </button>
              {index < breadcrumbs.length - 1 && (
                <span className="text-gray-400">/</span>
              )}
            </div>
          ))}
        </nav>

        {/* Filtros */}
        <div className="grid grid-cols-1 gap-4 rounded-lg bg-gray-50 p-4 dark:bg-gray-800 md:grid-cols-3">
          <div>
            <Label>Buscar en todos los campos</Label>
            <Input
              name="filtro"
              value={filters.filtro}
              onChange={handleFilterChange}
              placeholder="Buscar..."
            />
          </div>
          <div>
            <Label>Filtrar por nombre</Label>
            <Input
              name="nombre"
              value={filters.nombre}
              onChange={handleFilterChange}
              placeholder="Nombre..."
            />
          </div>
          <div>
            <Label>Filtrar por descripción</Label>
            <Input
              name="descripcion"
              value={filters.descripcion}
              onChange={handleFilterChange}
              placeholder="Descripción..."
            />
          </div>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-lg bg-white shadow-2xl dark:bg-gray-800">
              <div className="flex items-center justify-between border-b p-6 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {editingId ? "Editar Área" : "Nueva Área"}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
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
                    placeholder="Nombre del área"
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
                    rows={4}
                    className="w-full rounded border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-700"
                  />
                </div>
                <div>
                  <Label>Área Padre</Label>
                  <select
                    value={formData.id_padre || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        id_padre: e.target.value
                          ? Number(e.target.value)
                          : null,
                      })
                    }
                    className="w-full rounded border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-700"
                  >
                    <option value="">Ninguna</option>
                    {allAreas.map((area) => (
                      <option key={area.id} value={area.id}>
                        {area.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 border-t pt-4 dark:border-gray-700">
                  <button
                    type="submit"
                    className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                  >
                    {editingId ? "Actualizar" : "Guardar"}
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
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
                <p className="mt-4">Cargando áreas...</p>
              </div>
            ) : areas.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50 dark:bg-gray-700">
                    <th className="px-6 py-4 text-start text-sm font-semibold text-gray-900 dark:text-white">
                      #
                    </th>
                    <th className="px-6 py-4 text-start text-sm font-semibold text-gray-900 dark:text-white">
                      Nombre
                    </th>
                    <th className="px-6 py-4 text-start text-sm font-semibold text-gray-900 dark:text-white">
                      Descripción
                    </th>
                    <th className="px-6 py-4 text-start text-sm font-semibold text-gray-900 dark:text-white">
                      Área Padre
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 dark:text-white">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {areas.map((area, index) => (
                    <tr
                      key={area.id}
                      className="border-b hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {pagination.pageIndex * pagination.pageSize + index + 1}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                        {area.nombre}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {area.descripcion || "—"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {allAreas.find((a) => a.id === area.id_padre)
                          ?.nombre || "—"}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-3">
                          <button
                            onClick={() => handleShowSubAreas(area)}
                            title="Ver sub-áreas"
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
                          >
                            <FolderIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleEdit(area)}
                            title="Editar"
                            className="text-green-600 hover:text-green-800 dark:text-green-400"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(area.id)}
                            title="Eliminar"
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
                No hay áreas disponibles
              </div>
            )}
          </div>

          {/* Paginación */}
          {areas.length > 0 && (
            <div className="flex items-center justify-between border-t bg-gray-50 px-6 py-4 dark:border-gray-700 dark:bg-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Mostrando{" "}
                {pagination.pageIndex * pagination.pageSize + 1}-
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
                    handleChangeRowsPerPage(Number(e.target.value))
                  }
                  className="rounded border border-gray-300 bg-white px-3 py-1 text-sm dark:border-gray-600 dark:bg-gray-700"
                >
                  <option value={5}>5 por página</option>
                  <option value={10}>10 por página</option>
                  <option value={25}>25 por página</option>
                </select>

                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      handleChangePage(Math.max(0, pagination.pageIndex - 1))
                    }
                    disabled={pagination.pageIndex === 0}
                    className="rounded border border-gray-300 px-3 py-1 text-sm disabled:opacity-50 dark:border-gray-600"
                  >
                    ← Anterior
                  </button>
                  <button
                    onClick={() =>
                      handleChangePage(pagination.pageIndex + 1)
                    }
                    disabled={
                      (pagination.pageIndex + 1) * pagination.pageSize >=
                      totalCount
                    }
                    className="rounded border border-gray-300 px-3 py-1 text-sm disabled:opacity-50 dark:border-gray-600"
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

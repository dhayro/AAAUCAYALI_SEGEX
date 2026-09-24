import PageMeta from "@/components/common/PageMeta";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import api from "@/utils/api";
import { PencilIcon, TrashBinIcon, PlusIcon, CloseIcon } from "@/icons";

interface Usuario {
  id: number;
  usuario: string;
  email: string;
  nombre: string;
  apellido: string;
  perfil: string;
}

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    usuario: "",
    email: "",
    nombre: "",
    apellido: "",
    password: "",
    perfil: "personal",
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
    fetchUsuarios();
  }, [pagination, filters]);

  const fetchUsuarios = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
      };

      if (filters.filtro) params.filtro = filters.filtro;

      const response = await api.get("/usuarios", { params });
      setUsuarios(Array.isArray(response.data) ? response.data : response.data.usuarios || []);
      setTotalCount(response.data.totalUsuarios || response.data.length);
    } catch (error) {
      console.error("Error fetching usuarios:", error);
      toast.error("Error al cargar usuarios");
    } finally {
      setLoading(false);
    }
  }, [pagination, filters]);

  const handleOpenModal = () => {
    setFormData({
      usuario: "",
      email: "",
      nombre: "",
      apellido: "",
      password: "",
      perfil: "personal",
    });
    setEditingId(null);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.usuario.trim() ||
      !formData.email.trim() ||
      !formData.nombre.trim()
    ) {
      toast.error("Completa todos los campos requeridos");
      return;
    }

    try {
      if (editingId) {
        await api.put(`/usuarios/${editingId}`, formData);
        toast.success("Usuario actualizado correctamente");
      } else {
        await api.post("/usuarios", formData);
        toast.success("Usuario creado correctamente");
      }

      handleCloseModal();
      await fetchUsuarios();
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.mensaje || "Error al procesar la solicitud";
      toast.error(errorMsg);
    }
  };

  const handleEdit = (usuario: Usuario) => {
    setFormData({
      usuario: usuario.usuario,
      email: usuario.email,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      password: "",
      perfil: usuario.perfil,
    });
    setEditingId(usuario.id);
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("¿Está seguro de que desea eliminar este usuario?")) {
      return;
    }

    try {
      await api.delete(`/usuarios/${id}`);
      toast.success("Usuario eliminado correctamente");
      await fetchUsuarios();
    } catch (error: any) {
      toast.error("Error al eliminar el usuario");
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
        title="Usuarios | Sistema de Seguimiento"
        description="Gestión de usuarios"
      />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Gestión de Usuarios
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Administra todos los usuarios del sistema
            </p>
          </div>
          <button
            onClick={handleOpenModal}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            <PlusIcon className="h-5 w-5" />
            Nuevo Usuario
          </button>
        </div>

        {/* Filtros */}
        <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
          <Label>Buscar usuarios</Label>
          <Input
            name="filtro"
            value={filters.filtro}
            onChange={handleFilterChange}
            placeholder="Buscar por nombre o email..."
          />
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-lg bg-white shadow-2xl dark:bg-gray-800">
              <div className="flex items-center justify-between border-b p-6 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {editingId ? "Editar Usuario" : "Nuevo Usuario"}
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
                  <Label>Usuario *</Label>
                  <Input
                    value={formData.usuario}
                    onChange={(e) =>
                      setFormData({ ...formData, usuario: e.target.value })
                    }
                    placeholder="Nombre de usuario"
                    required
                  />
                </div>
                <div>
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="correo@ejemplo.com"
                    required
                  />
                </div>
                <div>
                  <Label>Nombre *</Label>
                  <Input
                    value={formData.nombre}
                    onChange={(e) =>
                      setFormData({ ...formData, nombre: e.target.value })
                    }
                    placeholder="Nombre"
                    required
                  />
                </div>
                <div>
                  <Label>Apellido</Label>
                  <Input
                    value={formData.apellido}
                    onChange={(e) =>
                      setFormData({ ...formData, apellido: e.target.value })
                    }
                    placeholder="Apellido"
                  />
                </div>
                {!editingId && (
                  <div>
                    <Label>Contraseña *</Label>
                    <Input
                      type="password"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      placeholder="Contraseña"
                      required
                    />
                  </div>
                )}
                <div>
                  <Label>Perfil</Label>
                  <select
                    value={formData.perfil}
                    onChange={(e) =>
                      setFormData({ ...formData, perfil: e.target.value })
                    }
                    className="w-full rounded border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-700"
                  >
                    <option value="admin">Admin</option>
                    <option value="jefe">Jefe</option>
                    <option value="personal">Personal</option>
                    <option value="secretaria">Secretaria</option>
                  </select>
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
                <p className="mt-4">Cargando usuarios...</p>
              </div>
            ) : usuarios.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50 dark:bg-gray-700">
                    <th className="px-6 py-4 text-start text-sm font-semibold">
                      #
                    </th>
                    <th className="px-6 py-4 text-start text-sm font-semibold">
                      Usuario
                    </th>
                    <th className="px-6 py-4 text-start text-sm font-semibold">
                      Nombre
                    </th>
                    <th className="px-6 py-4 text-start text-sm font-semibold">
                      Email
                    </th>
                    <th className="px-6 py-4 text-start text-sm font-semibold">
                      Perfil
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((user, index) => (
                    <tr
                      key={user.id}
                      className="border-b hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <td className="px-6 py-4 text-sm">
                        {pagination.pageIndex * pagination.pageSize + index + 1}
                      </td>
                      <td className="px-6 py-4 font-medium">{user.usuario}</td>
                      <td className="px-6 py-4 text-sm">
                        {user.nombre} {user.apellido}
                      </td>
                      <td className="px-6 py-4 text-sm">{user.email}</td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                            user.perfil === "admin"
                              ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
                              : user.perfil === "jefe"
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100"
                                : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100"
                          }`}
                        >
                          {user.perfil}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-3">
                          <button
                            onClick={() => handleEdit(user)}
                            className="text-green-600 hover:text-green-800 dark:text-green-400"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(user.id)}
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
                No hay usuarios disponibles
              </div>
            )}
          </div>

          {/* Paginación */}
          {usuarios.length > 0 && (
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

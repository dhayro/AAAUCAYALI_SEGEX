import PageMeta from "@/components/common/PageMeta";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import DatePickerLima from "@/components/form/DatePickerLima";
import SearchableSelect from "@/components/form/SearchableSelect";
import api from "@/utils/api";
import { PencilIcon, TrashBinIcon, PlusIcon, CloseIcon } from "@/icons";
import UsuariosSisgedModal from "@/components/usuarios/UsuariosSisgedModal";

const formatDateForInput = (date: string | undefined): string => {
  if (!date) return "";
  try {
    // Parse YYYY-MM-DD format directly to avoid timezone issues
    const parts = date.split("T")[0].split("-");
    if (parts.length !== 3) return "";
    return `${parts[0]}-${parts[1]}-${parts[2]}`;
  } catch {
    return "";
  }
};

const formatDateForDisplay = (date: string | undefined): string => {
  if (!date) return "";
  try {
    // Parse YYYY-MM-DD format directly to avoid timezone issues
    const parts = date.split("T")[0].split("-");
    if (parts.length !== 3) return "";
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  } catch {
    return "";
  }
};

const formatAreaForDisplay = (area: any): string => {
  if (!area) return "—";
  const nombreArea = area.nombre || '';
  const inicialArea = area.descripcion || '';
  if (area.AreaPadre) {
    const inicialPadre = area.AreaPadre.descripcion || '';
    return `${nombreArea} - ${inicialPadre}-${inicialArea}`;
  }
  return nombreArea;
};


interface Cargo {
  id: number;
  nombre: string;
}

interface Area {
  id: number;
  nombre: string;
}

interface Usuario {
  id: number;
  usuario: string;
  email: string;
  nombre: string;
  apellido: string;
  perfil: string;
  dni?: string;
  telefono?: string;
  direccion?: string;
  fecha_nacimiento?: string;
  id_cargo?: number;
  id_area?: number;
  estado?: number;
  Cargo?: Cargo;
  Area?: Area;
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
    dni: "",
    telefono: "",
    direccion: "",
    fecha_nacimiento: "",
    id_cargo: "",
    id_area: "",
    estado: 1,
  });

  const [cargos, setCargos] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [loadingCargos, setLoadingCargos] = useState(false);
  const [loadingAreas, setLoadingAreas] = useState(false);
  const [selectedCargoName, setSelectedCargoName] = useState("");
  const [selectedAreaName, setSelectedAreaName] = useState("");
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetUserId, setResetUserId] = useState<number | null>(null);
  const [showEstadoModal, setShowEstadoModal] = useState(false);
  const [estadoUserId, setEstadoUserId] = useState<number | null>(null);
  const [estadoNuevo, setEstadoNuevo] = useState<boolean | null>(null);
  const [sisgedUser, setSisgedUser] = useState<Usuario | null>(null);

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

  useEffect(() => {
    if (showModal) {
      fetchCargosYAreas();
    }
  }, [showModal]);

  const formatAreaDisplay = (area: any) => {
    const nombreArea = area.nombre || '';
    const inicialArea = area.descripcion || '';
    let displayName = nombreArea;
    if (area.AreaPadre) {
      const inicialPadre = area.AreaPadre.descripcion || '';
      displayName = `${nombreArea} - ${inicialPadre}-${inicialArea}`;
    }
    return { ...area, nombre: displayName };
  };

  const fetchCargosYAreas = async () => {
    try {
      const [cargosRes, areasRes] = await Promise.all([
        api.get("/cargos?limit=10"),
        api.get("/areas?limit=10"),
      ]);
      setCargos(Array.isArray(cargosRes.data) ? cargosRes.data : cargosRes.data.cargos || []);
      const areasData = Array.isArray(areasRes.data) ? areasRes.data : areasRes.data.areas || [];
      setAreas(areasData.map(formatAreaDisplay));
    } catch (error) {
      console.error("Error fetching cargos y areas:", error);
    }
  };

  const searchCargos = async (term: string) => {
    setLoadingCargos(true);
    try {
      const res = await api.get(`/cargos?filtro=${encodeURIComponent(term)}&limit=10`);
      const cargosList = Array.isArray(res.data) ? res.data : res.data.cargos || [];
      setCargos(cargosList);
    } catch (error) {
      console.error("Error searching cargos:", error);
    } finally {
      setLoadingCargos(false);
    }
  };

  const searchAreas = async (term: string) => {
    setLoadingAreas(true);
    try {
      const res = await api.get(`/areas?filtro=${encodeURIComponent(term)}&limit=10`);
      const areasList = Array.isArray(res.data) ? res.data : res.data.areas || [];
      setAreas(areasList.map(formatAreaDisplay));
    } catch (error) {
      console.error("Error searching areas:", error);
    } finally {
      setLoadingAreas(false);
    }
  };

  const loadCargoSelected = async (cargoId: number) => {
    try {
      const res = await api.get(`/cargos/${cargoId}`);
      if (res.data) {
        setSelectedCargoName(res.data.nombre);
        setCargos((prev) => {
          const exists = prev.some((c: any) => c.id === cargoId);
          if (!exists) {
            return [res.data, ...prev];
          }
          return prev;
        });
      }
    } catch (error) {
      console.error("Error loading selected cargo:", error);
    }
  };

  const loadAreaSelected = async (areaId: number) => {
    try {
      const res = await api.get(`/areas/${areaId}`);
      if (res.data) {
        const formatted = formatAreaDisplay(res.data);
        setSelectedAreaName(formatted.nombre);
        setAreas((prev) => {
          const exists = prev.some((a: any) => a.id === areaId);
          if (!exists) {
            return [formatted, ...prev];
          }
          return prev;
        });
      }
    } catch (error) {
      console.error("Error loading selected area:", error);
    }
  };

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
      dni: "",
      telefono: "",
      direccion: "",
      fecha_nacimiento: "",
      id_cargo: "",
      id_area: "",
      estado: 1,
    });
    setEditingId(null);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedCargoName("");
    setSelectedAreaName("");
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    if (
      !formData.usuario.trim() ||
      !formData.email.trim() ||
      !formData.nombre.trim()
    ) {
      toast.error("Completa todos los campos requeridos");
      return;
    }

    try {
      const dataToSend = {
        ...formData,
        id_cargo: formData.id_cargo ? Number(formData.id_cargo) : null,
        id_area: formData.id_area ? Number(formData.id_area) : null,
      };

      if (editingId) {
        // No enviar password ni estado al actualizar (se manejan por rutas separadas)
        delete dataToSend.password;
        delete dataToSend.estado;
        await api.put(`/usuarios/${editingId}`, dataToSend);
        toast.success("✅ Usuario actualizado correctamente");
      } else {
        await api.post("/usuarios", dataToSend);
        toast.success("✅ Usuario creado correctamente");
      }

      handleCloseModal();
      await fetchUsuarios();
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.mensaje || "Error al procesar la solicitud";
      toast.error(errorMsg);
    }
  };

  const handleEdit = async (usuario: Usuario) => {
    try {
      // Obtener datos completos del usuario por ID
      const response = await api.get(`/usuarios/${usuario.id}`);
      const usuarioCompleto = response.data;

      setFormData({
        usuario: usuarioCompleto.usuario,
        email: usuarioCompleto.email,
        nombre: usuarioCompleto.nombre,
        apellido: usuarioCompleto.apellido,
        password: "",
        perfil: usuarioCompleto.perfil,
        dni: usuarioCompleto.dni || "",
        telefono: usuarioCompleto.telefono || "",
        direccion: usuarioCompleto.direccion || "",
        fecha_nacimiento: formatDateForInput(usuarioCompleto.fecha_nacimiento),
        id_cargo: usuarioCompleto.id_cargo?.toString() || "",
        id_area: usuarioCompleto.id_area?.toString() || "",
        estado: usuarioCompleto.estado || 1,
      });

      // Cargar cargo y área específicos si existen
      if (usuarioCompleto.id_cargo) {
        loadCargoSelected(usuarioCompleto.id_cargo);
      }
      if (usuarioCompleto.id_area) {
        loadAreaSelected(usuarioCompleto.id_area);
      }

      setEditingId(usuario.id);
      setShowModal(true);
    } catch (error) {
      console.error("Error cargando usuario:", error);
      toast.error("Error al cargar los datos del usuario");
    }
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

  const handleOpenResetModal = (id: number) => {
    setResetUserId(id);
    setShowResetModal(true);
  };

  // Completa nombre y apellidos desde RENIEC al escribir un DNI de 8 dígitos.
  const consultarDni = async (dni: string) => {
    try {
      const res = await api.get(`/usuarios/reniec/${dni}`);
      setFormData((prev) =>
        prev.dni === dni ? { ...prev, nombre: res.data.nombre, apellido: res.data.apellido } : prev
      );
    } catch (error: any) {
      toast.error(error.response?.data?.mensaje || "No se pudo consultar RENIEC");
    }
  };

  const handleConfirmReset = async () => {
    if (!resetUserId) return;

    try {
      await api.patch(`/usuarios/${resetUserId}/reset-password`);
      toast.success("✅ Contraseña restablecida correctamente");
      setShowResetModal(false);
      setResetUserId(null);
    } catch (error: any) {
      toast.error("❌ Error al restablecer la contraseña");
    }
  };

  const handleToggleEstado = (id: number, estadoActual: boolean) => {
    setEstadoUserId(id);
    setEstadoNuevo(!estadoActual);
    setShowEstadoModal(true);
  };

  const handleConfirmEstado = async () => {
    if (!estadoUserId || estadoNuevo === null) return;

    try {
      await api.patch(`/usuarios/${estadoUserId}/cambiar-estado`, { estado: estadoNuevo });
      toast.success(estadoNuevo ? "✅ Usuario activado" : "✅ Usuario desactivado");
      setShowEstadoModal(false);
      setEstadoUserId(null);
      setEstadoNuevo(null);
      await fetchUsuarios();
    } catch (error: any) {
      toast.error("❌ Error al cambiar el estado del usuario");
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
          <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-2xl rounded-lg bg-white shadow-2xl dark:bg-gray-800 max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between border-b p-6 dark:border-gray-700 flex-shrink-0">
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

              <form id="usuarioForm" onSubmit={handleSubmit} className="space-y-4 p-6 overflow-y-auto flex-1">
                <div className="grid grid-cols-2 gap-3">
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
                    <Label>DNI</Label>
                    <Input
                      value={formData.dni}
                      onChange={(e) => {
                        const dni = e.target.value.replace(/\D/g, "").slice(0, 8);
                        setFormData({ ...formData, dni });
                        if (dni.length === 8) consultarDni(dni);
                      }}
                      placeholder="12345678"
                    />
                  </div>
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

                <div className="grid grid-cols-2 gap-3">
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
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Teléfono</Label>
                    <Input
                      value={formData.telefono}
                      onChange={(e) =>
                        setFormData({ ...formData, telefono: e.target.value })
                      }
                      placeholder="987654321"
                    />
                  </div>
                  <DatePickerLima
                    label="Fecha de Nacimiento"
                    value={formData.fecha_nacimiento}
                    onChange={(date) => setFormData({ ...formData, fecha_nacimiento: date })}
                    placeholder="DD/MM/YYYY"
                  />
                </div>

                <div>
                  <Label>Dirección</Label>
                  <Input
                    value={formData.direccion}
                    onChange={(e) =>
                      setFormData({ ...formData, direccion: e.target.value })
                    }
                    placeholder="Calle, número, ciudad"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <SearchableSelect
                    label="Cargo"
                    value={formData.id_cargo}
                    onChange={(value) =>
                      setFormData({ ...formData, id_cargo: value })
                    }
                    options={cargos}
                    onSearch={searchCargos}
                    isLoading={loadingCargos}
                    placeholder="Buscar cargo..."
                    selectedLabel={selectedCargoName}
                  />
                  <SearchableSelect
                    label="Área"
                    value={formData.id_area}
                    onChange={(value) =>
                      setFormData({ ...formData, id_area: value })
                    }
                    options={areas}
                    onSearch={searchAreas}
                    isLoading={loadingAreas}
                    placeholder="Buscar área..."
                    selectedLabel={selectedAreaName}
                  />
                </div>

                <div>
                  <Label>Perfil</Label>
                  <select
                    value={formData.perfil}
                    onChange={(e) =>
                      setFormData({ ...formData, perfil: e.target.value })
                    }
                    className="w-full rounded border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-700 text-sm"
                  >
                    <option value="admin">Admin</option>
                    <option value="jefe">Jefe</option>
                    <option value="personal">Personal</option>
                    <option value="secretaria">Secretaria</option>
                  </select>
                </div>

              </form>

              <div className="flex gap-3 border-t bg-gray-50 px-6 py-4 dark:border-gray-700 dark:bg-gray-700 flex-shrink-0">
                <button
                  type="submit"
                  form="usuarioForm"
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
            </div>
          </div>
        )}

        {/* Modal Restablecer Contraseña */}
        {sisgedUser && (
          <UsuariosSisgedModal
            usuarioId={sisgedUser.id}
            nombreUsuario={sisgedUser.usuario}
            onClose={() => setSisgedUser(null)}
          />
        )}

        {showResetModal && (
          <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-lg bg-white shadow-2xl dark:bg-gray-800">
              <div className="flex items-center justify-between border-b p-6 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  🔑 Restablecer Contraseña
                </h2>
                <button
                  onClick={() => setShowResetModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-4 border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                    Se restablecerá la contraseña del usuario a:
                  </p>
                  <div className="inline-block bg-white dark:bg-gray-700 px-4 py-2 rounded-lg border-2 border-blue-500 font-mono font-bold text-lg text-blue-600 dark:text-blue-400">
                    Autoridad1
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                    El usuario deberá cambiar esta contraseña en su próximo inicio de sesión.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    ⚠️ Esta acción no se puede deshacer. ¿Deseas continuar?
                  </p>
                </div>
              </div>

              <div className="flex gap-3 border-t bg-gray-50 px-6 py-4 dark:border-gray-700 dark:bg-gray-700">
                <button
                  onClick={handleConfirmReset}
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 font-medium"
                >
                  ✓ Restablecer
                </button>
                <button
                  onClick={() => setShowResetModal(false)}
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Cambiar Estado */}
        {showEstadoModal && (
          <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-lg bg-white shadow-2xl dark:bg-gray-800">
              <div className="flex items-center justify-between border-b p-6 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {estadoNuevo ? "🟢 Activar Usuario" : "🔴 Desactivar Usuario"}
                </h2>
                <button
                  onClick={() => setShowEstadoModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className={`rounded-lg p-4 border-2 ${
                  estadoNuevo
                    ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                    : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                }`}>
                  <p className={`text-sm font-medium ${
                    estadoNuevo
                      ? "text-green-800 dark:text-green-200"
                      : "text-red-800 dark:text-red-200"
                  }`}>
                    {estadoNuevo
                      ? "✓ El usuario podrá acceder al sistema normalmente."
                      : "✗ El usuario NO podrá acceder al sistema."}
                  </p>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                  ¿Deseas {estadoNuevo ? "activar" : "desactivar"} este usuario?
                </p>
              </div>

              <div className="flex gap-3 border-t bg-gray-50 px-6 py-4 dark:border-gray-700 dark:bg-gray-700">
                <button
                  onClick={handleConfirmEstado}
                  className={`flex-1 rounded-lg px-4 py-2 text-white hover:opacity-90 font-medium ${
                    estadoNuevo
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  {estadoNuevo ? "✓ Activar" : "✗ Desactivar"}
                </button>
                <button
                  onClick={() => setShowEstadoModal(false)}
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
                >
                  Cancelar
                </button>
              </div>
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
                      Cargo
                    </th>
                    <th className="px-6 py-4 text-start text-sm font-semibold">
                      Área
                    </th>
                    <th className="px-6 py-4 text-start text-sm font-semibold">
                      Perfil
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold">
                      Estado
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
                        {user.Cargo?.nombre || "—"}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {formatAreaForDisplay(user.Area)}
                      </td>
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
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleToggleEstado(user.id, user.estado)}
                          className={`inline-flex rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${
                            user.estado
                              ? "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-100"
                              : "bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900 dark:text-red-100"
                          }`}
                        >
                          {user.estado ? "✓ Activo" : "✗ Inactivo"}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setSisgedUser(user)}
                            className="rounded border border-indigo-600 px-2 py-0.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 dark:border-indigo-400 dark:text-indigo-400"
                            title="Usuarios de SISGED"
                          >
                            SISGED
                          </button>
                          <button
                            onClick={() => handleEdit(user)}
                            className="text-green-600 hover:text-green-800 dark:text-green-400 p-1"
                            title="Editar"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleOpenResetModal(user.id)}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 p-1"
                            title="Restablecer contraseña"
                          >
                            🔑
                          </button>
                          <button
                            onClick={() => handleDelete(user.id)}
                            className="text-red-600 hover:text-red-800 dark:text-red-400 p-1"
                            title="Eliminar"
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

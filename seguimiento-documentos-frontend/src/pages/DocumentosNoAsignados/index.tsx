import PageMeta from "@/components/common/PageMeta";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import api from "@/utils/api";
import { TrashBinIcon, PlusIcon, CloseIcon, CheckCircleIcon } from "@/icons";

interface Documento {
  id: number;
  numero_documento: string;
  tipo?: string;
  remitente?: string;
  asunto?: string;
  descripcion?: string;
  fecha_recepcion?: string;
}

interface Usuario {
  id: number;
  nombre: string;
  email: string;
}

interface Area {
  id: number;
  nombre: string;
}

export default function DocumentosNoAsignados() {
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [areas, setAreas] = useState<Area[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);

  const [formData, setFormData] = useState({
    id_area: "",
    usuarios: [] as number[],
    plazo_respuesta: 5,
    observaciones: "",
  });

  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const [filters, setFilters] = useState({
    filtro: "",
  });

  const [totalCount, setTotalCount] = useState(0);
  const [selectedDocumento, setSelectedDocumento] = useState<Documento | null>(null);

  useEffect(() => {
    fetchDocumentosNoAsignados();
    fetchAreas();
  }, [pagination, filters]);

  const fetchDocumentosNoAsignados = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
      };

      if (filters.filtro) params.filtro = filters.filtro;

      const response = await api.get("/documentos/sin-asignar", { params });
      setDocumentos(
        Array.isArray(response.data) ? response.data : response.data.documentos || []
      );
      setTotalCount(response.data.totalDocumentos || response.data.length);
    } catch (error) {
      console.error("Error fetching documentos:", error);
      toast.error("Error al cargar documentos sin asignar");
    } finally {
      setLoading(false);
    }
  }, [pagination, filters]);

  const fetchAreas = useCallback(async () => {
    try {
      const response = await api.get("/areas", { params: { limit: 1000 } });
      setAreas(Array.isArray(response.data) ? response.data : response.data.areas || []);
    } catch (error) {
      console.error("Error fetching areas:", error);
    }
  }, []);

  const fetchUsuariosPorArea = useCallback(async (areaId: string) => {
    if (!areaId) {
      setUsuarios([]);
      return;
    }
    try {
      const response = await api.get(`/usuarios/por-area/${areaId}`);
      setUsuarios(Array.isArray(response.data) ? response.data : response.data.usuarios || []);
    } catch (error) {
      console.error("Error fetching usuarios:", error);
      toast.error("Error al cargar usuarios del área");
    }
  }, []);

  const handleOpenModal = (documento: Documento) => {
    setSelectedDocumento(documento);
    setFormData({
      id_area: "",
      usuarios: [],
      plazo_respuesta: 5,
      observaciones: "",
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedDocumento(null);
  };

  const handleAreaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const areaId = e.target.value;
    setFormData({ ...formData, id_area: areaId });
    fetchUsuariosPorArea(areaId);
  };

  const handleUsuarioToggle = (usuarioId: number) => {
    setFormData((prev) => {
      const usuarios = prev.usuarios.includes(usuarioId)
        ? prev.usuarios.filter((id) => id !== usuarioId)
        : [...prev.usuarios, usuarioId];
      return { ...prev, usuarios };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.id_area) {
      toast.error("Debe seleccionar un área");
      return;
    }

    if (formData.usuarios.length === 0) {
      toast.error("Debe seleccionar al menos un usuario");
      return;
    }

    if (!formData.plazo_respuesta || formData.plazo_respuesta <= 0) {
      toast.error("El plazo debe ser mayor a 0 días");
      return;
    }

    try {
      const payload = {
        id_documento: selectedDocumento?.id,
        usuarios_asignados: formData.usuarios,
        plazo_respuesta: formData.plazo_respuesta,
        observaciones: formData.observaciones,
      };

      await api.post("/asignaciones", payload);
      toast.success("Documento asignado correctamente");
      handleCloseModal();
      await fetchDocumentosNoAsignados();
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.mensaje || "Error al asignar documento";
      toast.error(errorMsg);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("¿Está seguro de que desea eliminar este documento?")) {
      return;
    }

    try {
      await api.delete(`/documentos/${id}`);
      toast.success("Documento eliminado correctamente");
      await fetchDocumentosNoAsignados();
    } catch (error: any) {
      toast.error("Error al eliminar el documento");
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
        title="Documentos Sin Asignar | Sistema de Seguimiento"
        description="Asignación de documentos a usuarios"
      />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Documentos Sin Asignar
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Asigna documentos a usuarios y áreas específicas
            </p>
          </div>
        </div>

        {/* Filtros */}
        <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
          <Label>Buscar documentos</Label>
          <Input
            name="filtro"
            value={filters.filtro}
            onChange={handleFilterChange}
            placeholder="Buscar por número, remitente o asunto..."
          />
        </div>

        {/* Modal */}
        {showModal && selectedDocumento && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-2xl rounded-lg bg-white shadow-2xl dark:bg-gray-800">
              <div className="flex items-center justify-between border-b p-6 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Asignar Documento: {selectedDocumento.numero_documento}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400"
                >
                  <CloseIcon className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 p-6">
                {/* Documento Info */}
                <div className="rounded bg-blue-50 p-4 dark:bg-blue-900/20">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <strong>Remitente:</strong> {selectedDocumento.remitente || "—"}
                  </p>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    <strong>Asunto:</strong> {selectedDocumento.asunto || "—"}
                  </p>
                </div>

                {/* Area Selection */}
                <div>
                  <Label>Seleccionar Área *</Label>
                  <select
                    value={formData.id_area}
                    onChange={handleAreaChange}
                    className="w-full rounded border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-700"
                    required
                  >
                    <option value="">-- Seleccione una área --</option>
                    {areas.map((area) => (
                      <option key={area.id} value={area.id}>
                        {area.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Usuarios Selection */}
                {formData.id_area && usuarios.length > 0 && (
                  <div>
                    <Label>Asignar a Usuarios *</Label>
                    <div className="max-h-40 space-y-2 overflow-y-auto rounded border border-gray-300 p-3 dark:border-gray-600">
                      {usuarios.map((usuario) => (
                        <div key={usuario.id} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`usuario-${usuario.id}`}
                            checked={formData.usuarios.includes(usuario.id)}
                            onChange={() => handleUsuarioToggle(usuario.id)}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                          <label
                            htmlFor={`usuario-${usuario.id}`}
                            className="flex-1 cursor-pointer text-sm"
                          >
                            {usuario.nombre} ({usuario.email})
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Plazo */}
                <div>
                  <Label>Plazo de Respuesta (días) *</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.plazo_respuesta}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        plazo_respuesta: parseInt(e.target.value) || 0,
                      })
                    }
                    required
                  />
                </div>

                {/* Observaciones */}
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
                    Asignar
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
                <p className="mt-4">Cargando documentos...</p>
              </div>
            ) : documentos.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50 dark:bg-gray-700">
                    <th className="px-6 py-4 text-start text-sm font-semibold">#</th>
                    <th className="px-6 py-4 text-start text-sm font-semibold">
                      Número
                    </th>
                    <th className="px-6 py-4 text-start text-sm font-semibold">
                      Remitente
                    </th>
                    <th className="px-6 py-4 text-start text-sm font-semibold">
                      Asunto
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {documentos.map((doc, index) => (
                    <tr
                      key={doc.id}
                      className="border-b hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <td className="px-6 py-4 text-sm">
                        {pagination.pageIndex * pagination.pageSize + index + 1}
                      </td>
                      <td className="px-6 py-4 font-medium">
                        {doc.numero_documento}
                      </td>
                      <td className="px-6 py-4 text-sm">{doc.remitente || "—"}</td>
                      <td className="px-6 py-4 text-sm">{doc.asunto || "—"}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-3">
                          <button
                            onClick={() => handleOpenModal(doc)}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
                            title="Asignar"
                          >
                            <PlusIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(doc.id)}
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
                No hay documentos sin asignar
              </div>
            )}
          </div>

          {/* Paginación */}
          {documentos.length > 0 && (
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

import PageMeta from "@/components/common/PageMeta";
import { ChevronLeftIcon } from "@/icons";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import { getAsignaciones, solicitarProrroga, updateAsignacionEstado, createRespuesta, updateDocumentoEstado } from "@/utils/api";
import { formatDate, formatDateWithTime, parseISOToLimaDate, toLimaTimezone } from "@/utils/dateUtils";
import { jwtDecode } from "jwt-decode";
import { TaskIcon, EnvelopeIcon, CalenderIcon, FileIcon, UserIcon, InfoIcon } from "@/icons";

interface Asignacion {
  id: number;
  Documento?: {
    id: number;
    numero_documento?: string;
    fecha_documento?: string;
    estado?: string;
    TipoDocumento?: {
      nombre?: string;
    };
    Expediente?: {
      cut?: string;
      remitente?: string;
    };
  };
  fecha_asignacion?: string;
  fecha_limite?: string;
  fecha_prorroga?: string;
  fecha_prorroga_limite?: string;
  asignado?: {
    id?: number;
    nombre?: string;
    apellido?: string;
  };
}

export default function Documentos() {
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [totalCount, setTotalCount] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  const [filters, setFilters] = useState({
    filtro: "",
    cut: "",
    remitente: "",
    documento: "",
    usuario: "",
  });

  const [showResponseModal, setShowResponseModal] = useState(false);
  const [selectedAsignacion, setSelectedAsignacion] = useState<Asignacion | null>(null);
  const [responseText, setResponseText] = useState("");
  const [isSubmittingResponse, setIsSubmittingResponse] = useState(false);

  const [showProrrogaModal, setShowProrrogaModal] = useState(false);
  const [prorrogaDias, setProrrogaDias] = useState(5);
  const [isSubmittingProrroga, setIsSubmittingProrroga] = useState(false);

  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Decodificar token para obtener ID del usuario actual
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decodedToken: any = jwtDecode(token);
        setCurrentUserId(decodedToken.id);
      } catch (error) {
        console.error("Error decodificando token:", error);
      }
    }
  }, []);

  useEffect(() => {
    fetchAsignaciones();
  }, [pagination, filters]);

  const fetchAsignaciones = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        cut: filters.cut,
        remitente: filters.remitente,
        documento: filters.documento,
        usuario: filters.usuario,
        filtro: filters.filtro,
      };

      const response = await getAsignaciones(params);
      setAsignaciones(response.data.asignaciones || response.data);
      setTotalCount(response.data.totalAsignaciones || response.data.length);
    } catch (error) {
      console.error("Error fetching asignaciones:", error);
      toast.error("Error al cargar asignaciones");
    } finally {
      setLoading(false);
    }
  }, [pagination, filters]);

  const calculateDaysRemaining = (asignacion: Asignacion) => {
    const dueDate = asignacion.fecha_prorroga_limite || asignacion.fecha_limite;
    if (!dueDate) return null;

    const today = toLimaTimezone(new Date());
    const due = parseISOToLimaDate(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getStatusColor = (daysRemaining: number | null) => {
    if (daysRemaining === null) return "default";
    if (daysRemaining < 0) return "error";
    if (daysRemaining <= 2) return "warning";
    return "success";
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPagination({ pageIndex: 0, pageSize: 10 });
  };

  const canShowResponseButton = (asignacion: Asignacion): boolean => {
    return asignacion.Documento?.estado === "EN_REVISION";
  };

  const canShowProrrogaButton = (asignacion: Asignacion): boolean => {
    const daysRemaining = calculateDaysRemaining(asignacion);
    return (
      daysRemaining !== null &&
      daysRemaining <= 2 &&
      !asignacion.fecha_prorroga &&
      asignacion.Documento?.estado === "EN_REVISION"
    );
  };

  const handleOpenResponseModal = (asignacion: Asignacion) => {
    if (asignacion.asignado?.id !== currentUserId) {
      toast.error("No tiene permiso para responder a esta asignación");
      return;
    }
    setSelectedAsignacion(asignacion);
    setShowResponseModal(true);
  };

  const handleSendResponse = async () => {
    if (!selectedAsignacion?.id || !responseText.trim()) {
      toast.error("Debe ingresar una respuesta");
      return;
    }

    setIsSubmittingResponse(true);
    try {
      // Crear respuesta
      await createRespuesta({
        id_asignacion: selectedAsignacion.id,
        fecha_respuesta: new Date().toISOString(),
        observaciones: responseText,
        estado: true,
      });

      // Actualizar estado del documento a RESPUESTA
      await updateDocumentoEstado(selectedAsignacion.Documento?.id || 0, "RESPUESTA");

      // Marcar asignación como completada
      await updateAsignacionEstado(selectedAsignacion.id, "completada");

      toast.success("Respuesta registrada correctamente");
      setShowResponseModal(false);
      setResponseText("");
      fetchAsignaciones();
    } catch (error) {
      console.error("Error al registrar respuesta:", error);
      toast.error("Error al registrar respuesta");
    } finally {
      setIsSubmittingResponse(false);
    }
  };

  const handleRequestProrroga = async () => {
    if (!selectedAsignacion?.id) return;

    setIsSubmittingProrroga(true);
    try {
      await solicitarProrroga(selectedAsignacion.id, prorrogaDias);
      toast.success("Prórroga solicitada correctamente");
      setShowProrrogaModal(false);
      setProrrogaDias(5);
      fetchAsignaciones();
    } catch (error) {
      console.error("Error al solicitar prórroga:", error);
      toast.error("Error al solicitar prórroga");
    } finally {
      setIsSubmittingProrroga(false);
    }
  };

  const getStatusLabel = (daysRemaining: number | null) => {
    if (daysRemaining === null) return "Sin fecha";
    if (daysRemaining < 0) return `Vencido ${Math.abs(daysRemaining)} día(s)`;
    if (daysRemaining === 0) return "Hoy";
    return `${daysRemaining} día(s)`;
  };

  const getProrrogaLabel = (asignacion: Asignacion) => {
    if (asignacion.fecha_prorroga_limite) return "Prórroga Aceptada";
    if (asignacion.fecha_prorroga) return "Prórroga Solicitada";
    return "No";
  };

  return (
    <>
      <PageMeta
        title="Documentos Asignados | Sistema de Seguimiento"
        description="Gestión de documentos asignados"
      />
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Documentos Asignados</h1>

        {/* Filtros */}
        <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Input
              name="cut"
              placeholder="Filtrar por CUT"
              value={filters.cut}
              onChange={handleFilterChange}
            />
            <Input
              name="remitente"
              placeholder="Filtrar por remitente"
              value={filters.remitente}
              onChange={handleFilterChange}
            />
            <Input
              name="documento"
              placeholder="Filtrar por documento"
              value={filters.documento}
              onChange={handleFilterChange}
            />
            <Input
              name="usuario"
              placeholder="Filtrar por usuario"
              value={filters.usuario}
              onChange={handleFilterChange}
            />
            <Input
              name="filtro"
              placeholder="Buscar en todos los campos"
              value={filters.filtro}
              onChange={handleFilterChange}
            />
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto rounded-lg bg-white shadow dark:bg-gray-800">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Item</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">CUT</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Remitente</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Documento</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Fecha Documento</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Fecha Asignación</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Fecha Vencimiento</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Persona Asignada</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Estado</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Prórroga</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center">
                    <div className="inline-block">Cargando...</div>
                  </td>
                </tr>
              ) : asignaciones.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    No hay asignaciones
                  </td>
                </tr>
              ) : (
                asignaciones.map((asignacion, index) => {
                  const daysRemaining = calculateDaysRemaining(asignacion);
                  const statusColor = getStatusColor(daysRemaining);

                  return (
                    <tr key={asignacion.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-3">{pagination.pageIndex * pagination.pageSize + index + 1}</td>
                      <td className="px-4 py-3">{asignacion.Documento?.Expediente?.cut || "N/A"}</td>
                      <td className="px-4 py-3">{asignacion.Documento?.Expediente?.remitente || "N/A"}</td>
                      <td className="px-4 py-3">
                        {asignacion.Documento?.TipoDocumento?.nombre || "N/A"}{" "}
                        {asignacion.Documento?.numero_documento || ""}
                      </td>
                      <td className="px-4 py-3">
                        {asignacion.Documento?.fecha_documento
                          ? (() => {
                              try {
                                return formatDate(parseISOToLimaDate(asignacion.Documento?.fecha_documento || ""));
                              } catch {
                                return "N/A";
                              }
                            })()
                          : "N/A"}
                      </td>
                      <td className="px-4 py-3">
                        {asignacion.fecha_asignacion
                          ? (() => {
                              try {
                                return formatDateWithTime(parseISOToLimaDate(asignacion.fecha_asignacion || ""));
                              } catch {
                                return "N/A";
                              }
                            })()
                          : "N/A"}
                      </td>
                      <td className="px-4 py-3">
                        {asignacion.fecha_prorroga_limite || asignacion.fecha_limite
                          ? (() => {
                              try {
                                const dateStr = asignacion.fecha_prorroga_limite || asignacion.fecha_limite || "";
                                return formatDateWithTime(parseISOToLimaDate(dateStr));
                              } catch {
                                return "N/A";
                              }
                            })()
                          : "N/A"}
                      </td>
                      <td className="px-4 py-3">
                        {asignacion.asignado?.nombre} {asignacion.asignado?.apellido}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                            statusColor === "error"
                              ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                              : statusColor === "warning"
                                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                                : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          }`}
                        >
                          {getStatusLabel(daysRemaining)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                            asignacion.fecha_prorroga_limite
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              : asignacion.fecha_prorroga
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                          }`}
                        >
                          {getProrrogaLabel(asignacion)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setSelectedAsignacion(asignacion);
                              setShowDetailsModal(true);
                            }}
                            title="Ver detalles"
                            className="rounded bg-gray-600 p-2 hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600"
                          >
                            <TaskIcon className="h-4 w-4 text-white" />
                          </button>
                          {canShowResponseButton(asignacion) && (
                            <button
                              onClick={() => handleOpenResponseModal(asignacion)}
                              title="Dar respuesta"
                              className="rounded bg-blue-600 p-2 hover:bg-blue-700 dark:hover:bg-blue-500"
                            >
                              <EnvelopeIcon className="h-4 w-4 text-white" />
                            </button>
                          )}
                          {canShowProrrogaButton(asignacion) && (
                            <button
                              onClick={() => {
                                if (asignacion.asignado?.id !== currentUserId) {
                                  toast.error("No tiene permiso para solicitar una prórroga para esta asignación");
                                  return;
                                }
                                setSelectedAsignacion(asignacion);
                                setShowProrrogaModal(true);
                              }}
                              title="Solicitar prórroga"
                              className="rounded bg-orange-600 p-2 hover:bg-orange-700 dark:hover:bg-orange-500"
                            >
                              <CalenderIcon className="h-4 w-4 text-white" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Mostrando {asignaciones.length > 0 ? pagination.pageIndex * pagination.pageSize + 1 : 0} a{" "}
            {Math.min((pagination.pageIndex + 1) * pagination.pageSize, totalCount)} de {totalCount}
          </div>
          <div className="flex flex-nowrap items-center gap-4">
            <select
              value={pagination.pageSize}
              onChange={(e) => setPagination({ pageIndex: 0, pageSize: Number(e.target.value) })}
              className="rounded border border-gray-300 bg-white px-3 py-1 text-sm dark:border-gray-600 dark:bg-gray-700"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={150}>150</option>
              <option value={200}>200</option>
            </select>
            <div className="flex gap-2">
              <button
                onClick={() => setPagination((p) => ({ ...p, pageIndex: Math.max(0, p.pageIndex - 1) }))}
                disabled={pagination.pageIndex === 0}
                title="Anterior"
                aria-label="Anterior"
                className="inline-flex h-8 w-8 items-center justify-center rounded border border-gray-300 disabled:opacity-50 dark:border-gray-600"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </button>
                  <span className="whitespace-nowrap px-2 py-1 text-sm">
                    {pagination.pageIndex + 1} / {Math.max(1, Math.ceil(totalCount / pagination.pageSize))}
                  </span>
              <button
                onClick={() =>
                  setPagination((p) => ({
                    ...p,
                    pageIndex: Math.min(p.pageIndex + 1, Math.ceil(totalCount / pagination.pageSize) - 1),
                  }))
                }
                disabled={(pagination.pageIndex + 1) * pagination.pageSize >= totalCount}
                title="Siguiente"
                aria-label="Siguiente"
                className="inline-flex h-8 w-8 items-center justify-center rounded border border-gray-300 disabled:opacity-50 dark:border-gray-600"
              >
                <ChevronLeftIcon className="h-4 w-4 rotate-180" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Response Modal */}
      {showResponseModal && selectedAsignacion && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-2xl dark:bg-gray-800">
            <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">Dar Respuesta</h2>
            <textarea
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              placeholder="Ingrese su respuesta"
              className="mb-4 w-full rounded border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              rows={4}
            />
            <div className="flex gap-2">
              <Button
                onClick={handleSendResponse}
                disabled={isSubmittingResponse}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50"
              >
                {isSubmittingResponse ? "Enviando..." : "Enviar"}
              </Button>
              <Button
                onClick={() => {
                  setShowResponseModal(false);
                  setResponseText("");
                }}
                className="flex-1 bg-gray-500 hover:bg-gray-600"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Prorroga Modal */}
      {showProrrogaModal && selectedAsignacion && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-2xl dark:bg-gray-800">
            <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">Solicitar Prórroga</h2>

            {selectedAsignacion.asignado?.id === currentUserId ? (
              <>
                <div className="mb-4">
                  <div className="mb-2 block text-sm font-medium text-gray-900 dark:text-white">Días de prórroga</div>
                  <Input
                    type="number"
                    value={prorrogaDias}
                    onChange={(e) => setProrrogaDias(parseInt(e.target.value) || 5)}
                    min="1"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleRequestProrroga}
                    disabled={isSubmittingProrroga}
                    className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:opacity-50"
                  >
                    {isSubmittingProrroga ? "Solicitando..." : "Solicitar"}
                  </Button>
                  <Button
                    onClick={() => setShowProrrogaModal(false)}
                    className="flex-1 bg-gray-500 hover:bg-gray-600"
                  >
                    Cancelar
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-800 dark:bg-red-900 dark:text-red-200">
                  No tiene permiso para solicitar una prórroga para esta asignación.
                </div>
                <div className="flex justify-center">
                  <Button
                    onClick={() => setShowProrrogaModal(false)}
                    className="bg-gray-500 hover:bg-gray-600"
                  >
                    Cancelar
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedAsignacion && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/50">
          <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-2xl dark:bg-gray-800">
            <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">Detalles del Documento</h2>
            <div className="mb-6 space-y-3 text-sm">
              {/* Fila 1: CUT y Documento */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/30">
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-300">
                    <FileIcon className="h-4 w-4" />
                    <span className="text-xs font-semibold uppercase">CUT</span>
                  </div>
                  <div className="mt-1 font-bold text-gray-900 dark:text-white">{selectedAsignacion.Documento?.Expediente?.cut || "N/A"}</div>
                </div>
                <div className="rounded-lg bg-purple-50 p-3 dark:bg-purple-900/30">
                  <div className="flex items-center gap-2 text-purple-600 dark:text-purple-300">
                    <FileIcon className="h-4 w-4" />
                    <span className="text-xs font-semibold uppercase">Tipo</span>
                  </div>
                  <div className="mt-1 font-bold text-gray-900 dark:text-white">{selectedAsignacion.Documento?.TipoDocumento?.nombre || "N/A"}</div>
                </div>
              </div>

              {/* Fila 2: Remitente */}
              <div className="rounded-lg bg-green-50 p-3 dark:bg-green-900/30">
                <div className="flex items-center gap-2 text-green-600 dark:text-green-300">
                  <UserIcon className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase">Remitente</span>
                </div>
                <div className="mt-1 font-bold text-gray-900 dark:text-white">{selectedAsignacion.Documento?.Expediente?.remitente || "N/A"}</div>
              </div>

              {/* Fila 3: Número y Asunto */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-orange-50 p-3 dark:bg-orange-900/30">
                  <div className="flex items-center gap-2 text-orange-600 dark:text-orange-300">
                    <InfoIcon className="h-4 w-4" />
                    <span className="text-xs font-semibold uppercase">Número</span>
                  </div>
                  <div className="mt-1 truncate text-xs font-bold text-gray-900 dark:text-white">{selectedAsignacion.Documento?.numero_documento || "N/A"}</div>
                </div>
                <div className="rounded-lg bg-indigo-50 p-3 dark:bg-indigo-900/30">
                  <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-300">
                    <InfoIcon className="h-4 w-4" />
                    <span className="text-xs font-semibold uppercase">Asunto</span>
                  </div>
                  <div className="mt-1 truncate text-xs font-bold text-gray-900 dark:text-white">{selectedAsignacion.Documento?.numero_documento || "N/A"}</div>
                </div>
              </div>

              {/* Fila 4: Fechas */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-cyan-50 p-3 dark:bg-cyan-900/30">
                  <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-300">
                    <CalenderIcon className="h-4 w-4" />
                    <span className="text-xs font-semibold uppercase">Asignación</span>
                  </div>
                  <div className="mt-1 text-xs font-bold text-gray-900 dark:text-white">
                    {selectedAsignacion.fecha_asignacion
                      ? (() => {
                          try {
                            return formatDateWithTime(parseISOToLimaDate(selectedAsignacion.fecha_asignacion));
                          } catch {
                            return "N/A";
                          }
                        })()
                      : "N/A"}
                  </div>
                </div>
                <div className="rounded-lg bg-rose-50 p-3 dark:bg-rose-900/30">
                  <div className="flex items-center gap-2 text-rose-600 dark:text-rose-300">
                    <CalenderIcon className="h-4 w-4" />
                    <span className="text-xs font-semibold uppercase">Vencimiento</span>
                  </div>
                  <div className="mt-1 text-xs font-bold text-gray-900 dark:text-white">
                    {selectedAsignacion.fecha_prorroga_limite || selectedAsignacion.fecha_limite
                      ? (() => {
                          try {
                            return formatDateWithTime(
                              parseISOToLimaDate(selectedAsignacion.fecha_prorroga_limite || selectedAsignacion.fecha_limite || "")
                            );
                          } catch {
                            return "N/A";
                          }
                        })()
                      : "N/A"}
                  </div>
                </div>
              </div>

              {/* Fila 5: Asignado */}
              <div className="rounded-lg bg-teal-50 p-3 dark:bg-teal-900/30">
                <div className="flex items-center gap-2 text-teal-600 dark:text-teal-300">
                  <UserIcon className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase">Asignado a</span>
                </div>
                <div className="mt-1 font-bold text-gray-900 dark:text-white">
                  {selectedAsignacion.asignado?.nombre} {selectedAsignacion.asignado?.apellido}
                </div>
              </div>

              {/* Fila 6: Instrucciones */}
              <div className="rounded-lg bg-yellow-50 p-3 dark:bg-yellow-900/30">
                <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-300">
                  <InfoIcon className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase">Instrucciones</span>
                </div>
                <div className="mt-1 text-xs text-gray-900 dark:text-white">{"Sin instrucciones"}</div>
              </div>

              {/* Fila 7: Estado */}
              <div className="rounded-lg bg-gray-100 p-3 dark:bg-gray-700">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                  <InfoIcon className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase">Estado</span>
                </div>
                <div className="mt-2">
                  <span
                    className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                      getStatusColor(calculateDaysRemaining(selectedAsignacion)) === "error"
                        ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                        : getStatusColor(calculateDaysRemaining(selectedAsignacion)) === "warning"
                          ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                          : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                    }`}
                  >
                    {getStatusLabel(calculateDaysRemaining(selectedAsignacion))}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                onClick={() => setShowDetailsModal(false)}
                className="bg-gray-500 hover:bg-gray-600"
              >
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

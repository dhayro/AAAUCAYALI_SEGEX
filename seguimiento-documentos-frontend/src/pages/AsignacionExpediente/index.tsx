import PageMeta from "@/components/common/PageMeta";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import DatePickerLima from "@/components/form/DatePickerLima";
import SearchableSelect from "@/components/form/SearchableSelect";
import api from "@/utils/api";
import { PencilIcon, TrashBinIcon, PlusIcon, CloseIcon } from "@/icons";

interface UsuarioResumen {
  id: number;
  nombre: string;
  apellido: string;
  usuario: string;
}

interface UsuarioSelect {
  id: number;
  nombre: string;
  usuario: string;
  cargo?: string | null;
}

interface Asignacion {
  id: number;
  cut: string;
  id_usuario: number;
  fecha_asignacion: string;
  plazo_atencion: number;
  fecha_vencimiento: string;
  fecha_prorroga?: string | null;
  plazo_prorroga?: number | null;
  fecha_vencimiento_prorroga?: string | null;
  observacion?: string | null;
  numero_orden?: string | null;
  asignado?: (UsuarioResumen & { Cargo?: { nombre: string } | null }) | null;
}

const etiquetaUsuario = (nombre: string, cargo?: string | null) =>
  cargo ? `${nombre} (${cargo})` : nombre;

const hoyLima = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

const getEmptyForm = () => ({
  cut: "",
  id_usuario: "" as number | "",
  fecha_asignacion: hoyLima(),
  plazo_atencion: "",
  observacion: "",
  numero_orden: "",
});

const formatFecha = (fecha?: string | null) => {
  if (!fecha) return "—";
  const [y, m, d] = fecha.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
};

const formatFechaHora = (valor?: string | null) => {
  if (!valor) return "—";
  const coincidencia = String(valor).match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}:\d{2}:\d{2}))?/);
  if (!coincidencia) return String(valor);
  const [, y, m, d, hora] = coincidencia;
  return hora ? `${d}/${m}/${y} ${hora}` : `${d}/${m}/${y}`;
};

type FormatoCampo = "texto" | "largo" | "fecha" | "fechahora" | "siNo";

const SECCIONES_EXPEDIENTE: {
  titulo: string;
  campos: { clave: string; etiqueta: string; formato?: FormatoCampo }[];
}[] = [
  {
    titulo: "Identificación",
    campos: [
      { clave: "ndoc", etiqueta: "Documento" },
      { clave: "origen", etiqueta: "Origen" },
      { clave: "destip", etiqueta: "Destino (tipo)" },
    ],
  },
  {
    titulo: "Trámite",
    campos: [
      { clave: "proced", etiqueta: "Procedimiento", formato: "largo" },
      { clave: "fol", etiqueta: "Folios" },
    ],
  },
  {
    titulo: "Contenido",
    campos: [
      { clave: "asunto", etiqueta: "Asunto", formato: "largo" },
      { clave: "refe", etiqueta: "Referencia", formato: "largo" },
      { clave: "destinos", etiqueta: "Destinos", formato: "largo" },
      { clave: "tema", etiqueta: "Tema", formato: "largo" },
    ],
  },
  {
    titulo: "Remitente y fechas",
    campos: [
      { clave: "usurem", etiqueta: "Remitente", formato: "largo" },
      { clave: "ofirem", etiqueta: "Oficina remitente" },
      { clave: "feccrea", etiqueta: "Fecha de creación", formato: "fechahora" },
      { clave: "solfec", etiqueta: "Fecha de solicitud", formato: "fecha" },
      { clave: "solhor", etiqueta: "Hora de solicitud" },
    ],
  },
];

const valorCampo = (valor: any, formato: FormatoCampo = "texto") => {
  const vacio = valor === null || valor === undefined || valor === "" || String(valor).trim() === "-";
  if (formato === "siNo") {
    if (vacio) return "—";
    return ["1", "true"].includes(String(valor)) ? "Sí" : "No";
  }
  if (vacio) return "—";
  if (formato === "fecha") return formatFecha(String(valor));
  if (formato === "fechahora") return formatFechaHora(String(valor));
  return String(valor);
};

type AdjuntoSisged = {
  id: string;
  nombre: string;
  extension: string;
  isUrl: boolean;
  icono: string;
};

const iconoAdjunto = (nombre: string) => {
  if (nombre.startsWith("http://") || nombre.startsWith("https://")) return "🔗";
  const extension = nombre.split(".").pop()?.toLowerCase() || "";
  if (extension === "pdf") return "📕";
  if (["doc", "docx"].includes(extension)) return "📝";
  if (["xls", "xlsx"].includes(extension)) return "📊";
  if (["ppt", "pptx"].includes(extension)) return "🎯";
  if (["jpg", "jpeg", "png", "gif"].includes(extension)) return "🖼️";
  if (["zip", "rar", "7z"].includes(extension)) return "🗜️";
  return "📎";
};

// Formato SISGED: ID"NOMBRE"...  separado por saltos de línea
const parseAdjuntos = (texto?: string | null): AdjuntoSisged[] => {
  if (!texto) return [];
  return texto
    .split("\r")
    .map((linea) => linea.trim())
    .filter(Boolean)
    .map((linea) => {
      const coincidencia = linea.match(/^(\d+)"([^"]+)"/);
      if (!coincidencia) return null;
      const nombre = coincidencia[2];
      const isUrl = nombre.startsWith("http://") || nombre.startsWith("https://");
      const extension = isUrl ? "url" : nombre.split(".").pop()?.toLowerCase() || "";
      return { id: coincidencia[1], nombre, extension, isUrl, icono: iconoAdjunto(nombre) };
    })
    .filter((a): a is AdjuntoSisged => a !== null);
};

const badgeEstado = (estado?: string | null) => {
  const valor = (estado || "").toUpperCase();
  const clases =
    valor === "ATENDIDO"
      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
      : valor === "PENDIENTE"
      ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100"
      : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${clases}`}>
      {valor || "—"}
    </span>
  );
};

const nombreUsuario = (u?: UsuarioResumen | null) =>
  u ? `${u.nombre} ${u.apellido}` : "—";

export default function AsignacionExpediente() {
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState(getEmptyForm);
  const [usuarios, setUsuarios] = useState<UsuarioSelect[]>([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const [selectedUsuarioName, setSelectedUsuarioName] = useState("");

  const [prorrogaTarget, setProrrogaTarget] = useState<Asignacion | null>(null);
  const [prorrogaData, setProrrogaData] = useState({ plazo: "", fecha: "" });

  const [cutAbierto, setCutAbierto] = useState<string | null>(null);
  const [expedienteCut, setExpedienteCut] = useState<any>(null);
  const [cutCargando, setCutCargando] = useState(false);
  const [cutError, setCutError] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [trazCut, setTrazCut] = useState<string | null>(null);
  const [trazRows, setTrazRows] = useState<any[]>([]);
  const [trazCargando, setTrazCargando] = useState(false);
  const [trazSincronizando, setTrazSincronizando] = useState(false);
  const [trazError, setTrazError] = useState("");
  const [verDoc, setVerDoc] = useState<{
    titulo: string;
    url: string | null;
    cargando: boolean;
    error: string;
  } | null>(null);

  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [filters, setFilters] = useState({ cut: "" });
  const [totalCount, setTotalCount] = useState(0);

  const fetchAsignaciones = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        estado: "true",
      };
      if (filters.cut) params.cut = filters.cut;

      const response = await api.get("/asignaciones-expediente", { params });
      setAsignaciones(response.data.asignaciones || []);
      setTotalCount(response.data.totalAsignaciones || 0);
    } catch (error) {
      console.error("Error fetching asignaciones:", error);
      toast.error("Error al cargar asignaciones");
    } finally {
      setLoading(false);
    }
  }, [pagination, filters]);

  useEffect(() => {
    fetchAsignaciones();
  }, [fetchAsignaciones]);

  const fetchUsuarios = useCallback(async (filtro = "") => {
    setLoadingUsuarios(true);
    try {
      const params: any = { limit: 10 };
      if (filtro) params.filtro = filtro;
      const res = await api.get("/usuarios/select", { params });
      setUsuarios(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Error cargando usuarios:", error);
    } finally {
      setLoadingUsuarios(false);
    }
  }, []);

  useEffect(() => {
    if (showModal) fetchUsuarios();
  }, [showModal, fetchUsuarios]);

  const opcionesUsuarios = usuarios.map((u) => ({
    id: u.id,
    nombre: etiquetaUsuario(u.nombre, u.cargo),
  }));

  const handleOpenModal = () => {
    setFormData(getEmptyForm());
    setSelectedUsuarioName("");
    setEditingId(null);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleEdit = (asignacion: Asignacion) => {
    setFormData({
      cut: asignacion.cut,
      id_usuario: asignacion.id_usuario,
      fecha_asignacion: asignacion.fecha_asignacion.slice(0, 10),
      plazo_atencion: String(asignacion.plazo_atencion),
      observacion: asignacion.observacion || "",
      numero_orden: asignacion.numero_orden || "",
    });
    setSelectedUsuarioName(
      asignacion.asignado
        ? etiquetaUsuario(
            `${asignacion.asignado.nombre} ${asignacion.asignado.apellido}`,
            asignacion.asignado.Cargo?.nombre
          )
        : ""
    );
    setEditingId(asignacion.id);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingId && !formData.cut.trim()) {
      toast.error("El CUT es obligatorio");
      return;
    }
    if (!formData.id_usuario) {
      toast.error("Seleccione el usuario asignado");
      return;
    }
    if (!formData.fecha_asignacion) {
      toast.error("La fecha de asignación es obligatoria");
      return;
    }
    if (!formData.plazo_atencion || Number(formData.plazo_atencion) < 1) {
      toast.error("El plazo debe ser un número mayor a 0");
      return;
    }

    const payload: any = {
      id_usuario: Number(formData.id_usuario),
      fecha_asignacion: formData.fecha_asignacion,
      plazo_atencion: Number(formData.plazo_atencion),
      observacion: formData.observacion,
      numero_orden: formData.numero_orden,
    };

    try {
      if (editingId) {
        await api.put(`/asignaciones-expediente/${editingId}`, payload);
        toast.success("Asignación actualizada correctamente");
      } else {
        await api.post("/asignaciones-expediente", { ...payload, cut: formData.cut });
        toast.success("Asignación creada correctamente");
      }
      handleCloseModal();
      await fetchAsignaciones();
    } catch (error: any) {
      toast.error(error.response?.data?.mensaje || "Error al procesar la solicitud");
    }
  };

  const handleOpenProrroga = (asignacion: Asignacion) => {
    setProrrogaTarget(asignacion);
    setProrrogaData({ plazo: "", fecha: "" });
  };

  const handleSubmitProrroga = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prorrogaTarget) return;

    if (!prorrogaData.plazo || Number(prorrogaData.plazo) < 1) {
      toast.error("El plazo de prórroga debe ser un número mayor a 0");
      return;
    }

    const payload: any = { plazo_prorroga: Number(prorrogaData.plazo) };
    if (prorrogaData.fecha) payload.fecha_prorroga = prorrogaData.fecha;

    try {
      await api.patch(`/asignaciones-expediente/${prorrogaTarget.id}/prorroga`, payload);
      toast.success("Prórroga registrada correctamente");
      setProrrogaTarget(null);
      await fetchAsignaciones();
    } catch (error: any) {
      toast.error(error.response?.data?.mensaje || "Error al registrar la prórroga");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("¿Está seguro de que desea desactivar esta asignación?")) {
      return;
    }
    try {
      await api.delete(`/asignaciones-expediente/${id}`);
      toast.success("Asignación desactivada correctamente");
      await fetchAsignaciones();
    } catch (error: any) {
      toast.error("Error al desactivar la asignación");
    }
  };

  const abrirExpediente = async (cut: string) => {
    setCutAbierto(cut);
    setExpedienteCut(null);
    setCutError("");
    setCutCargando(true);
    try {
      const res = await api.get(`/expedientes/por-cut/${encodeURIComponent(cut)}`);
      setExpedienteCut(res.data.expediente);
    } catch (error: any) {
      setCutError(error.response?.data?.mensaje || "Error al consultar el expediente");
    } finally {
      setCutCargando(false);
    }
  };

  const cerrarExpediente = () => {
    setCutAbierto(null);
    setCopiado(false);
  };

  const copiarCut = async () => {
    if (!cutAbierto) return;
    try {
      await navigator.clipboard.writeText(cutAbierto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      toast.error("No se pudo copiar el CUT");
    }
  };

  const cargarTrazabilidad = async (cut: string) => {
    const res = await api.get(`/expedientes/por-cut/${encodeURIComponent(cut)}/trazabilidad`);
    return res.data.documentos || [];
  };

  const sincronizarTrazabilidad = async (cut: string) => {
    setTrazSincronizando(true);
    setTrazError("");
    try {
      await api.post("/sisged/sincronizar-con-parametros", {
        params: { NRO_CUT: cut },
        endpoint: "trazabilidad",
      });
      setTrazRows(await cargarTrazabilidad(cut));
    } catch (error: any) {
      setTrazError(error.response?.data?.error || error.response?.data?.mensaje || "No se pudo consultar SISGED");
    } finally {
      setTrazSincronizando(false);
    }
  };

  const abrirTrazabilidad = async (cut: string) => {
    setTrazCut(cut);
    setTrazRows([]);
    setTrazError("");
    setTrazCargando(true);
    try {
      const guardados = await cargarTrazabilidad(cut);
      setTrazRows(guardados);
      setTrazCargando(false);
      if (guardados.length === 0) {
        await sincronizarTrazabilidad(cut);
      }
    } catch (error: any) {
      setTrazError(error.response?.data?.mensaje || "Error al cargar la trazabilidad");
    } finally {
      setTrazCargando(false);
    }
  };

  const pedirArchivo = async (titulo: string, params: Record<string, any>) => {
    setVerDoc({ titulo, url: null, cargando: true, error: "" });
    try {
      const res = await api.post("/sisged/sincronizar-con-parametros", { params, endpoint: "archivo" });
      if (!res.data.success || !res.data.pdfUrl) {
        throw new Error("SISGED no devolvió el archivo");
      }
      setVerDoc((prev) => (prev ? { ...prev, url: res.data.pdfUrl, cargando: false } : prev));
    } catch (error: any) {
      setVerDoc((prev) =>
        prev
          ? { ...prev, cargando: false, error: error.response?.data?.error || error.message || "No se pudo obtener el archivo" }
          : prev
      );
    }
  };

  const verDocumento = (documento: any) => {
    pedirArchivo(documento.ndoc || "Documento", {
      ID_DOCUMENTO: documento.iddocpad || documento.iddocanex || 0,
      ID_USUARIO: 1,
      ID_OFICINA: documento.idofi || 1,
      ID_PERFIL: 1,
      FLG_TIPO: 1,
      FLG_FIRMA: 1,
      CODIGO_ADJUNTO: "-",
    });
  };

  const verAdjunto = (adjunto: AdjuntoSisged, documento: any) => {
    if (adjunto.isUrl) {
      window.open(adjunto.nombre, "_blank");
      return;
    }
    if (adjunto.extension === "pdf") {
      pedirArchivo(adjunto.nombre, {
        ID_DOCUMENTO: adjunto.id,
        ID_USUARIO: 1,
        ID_OFICINA: documento.idofi || 1,
        ID_PERFIL: 1,
        FLG_TIPO: 2,
        FLG_FIRMA: 1,
        CODIGO_ADJUNTO: "-",
      });
      return;
    }
    window.open(
      `https://sisged.ana.gob.pe/SISGED/Recursos/Descarga/FrmDescargaAdjunto.aspx?ID_DOCUMENTO_ADJUNTO=${adjunto.id}&CODIGO_ADJUNTO=--`,
      "_blank"
    );
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPagination({ pageIndex: 0, pageSize: 10 });
  };

  return (
    <>
      <PageMeta
        title="Asignación de Expediente | Sistema de Seguimiento"
        description="Asignación de expedientes con plazos y prórroga"
      />
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Asignación de Expediente
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Asigna expedientes a usuarios con plazos calendario, prórroga y observaciones
            </p>
          </div>
          <button
            onClick={handleOpenModal}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            <PlusIcon className="h-5 w-5" />
            Nueva Asignación
          </button>
        </div>

        <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
          <Label>Buscar por CUT</Label>
          <Input
            name="cut"
            value={filters.cut}
            onChange={handleFilterChange}
            placeholder="Ej: 101183-2025"
          />
        </div>

        {/* Modal crear / editar */}
        {showModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-lg rounded-lg bg-white shadow-2xl dark:bg-gray-800 max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between border-b p-6 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {editingId ? "Editar Asignación" : "Nueva Asignación"}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400"
                >
                  <CloseIcon className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto p-6">
                <div>
                  <Label>CUT *</Label>
                  <Input
                    value={formData.cut}
                    onChange={(e) => setFormData({ ...formData, cut: e.target.value })}
                    placeholder="Ej: 101183-2025"
                    disabled={!!editingId}
                  />
                </div>
                <div>
                  <Label>Usuario asignado *</Label>
                  <SearchableSelect
                    value={formData.id_usuario}
                    onChange={(value) => setFormData({ ...formData, id_usuario: value as number })}
                    options={opcionesUsuarios}
                    onSearch={(term) => fetchUsuarios(term)}
                    isLoading={loadingUsuarios}
                    placeholder="Buscar por nombre o usuario..."
                    selectedLabel={selectedUsuarioName}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <DatePickerLima
                    label="Fecha de asignación *"
                    value={formData.fecha_asignacion}
                    onChange={(date) => setFormData({ ...formData, fecha_asignacion: date })}
                    placeholder="DD/MM/YYYY"
                  />
                  <div>
                    <Label>Plazo (días calendario) *</Label>
                    <Input
                      type="number"
                      min={1}
                      value={formData.plazo_atencion}
                      onChange={(e) => setFormData({ ...formData, plazo_atencion: e.target.value })}
                      placeholder="Ej: 15"
                    />
                  </div>
                </div>
                <div>
                  <Label>Número de orden (locadores)</Label>
                  <Input
                    value={formData.numero_orden}
                    onChange={(e) => setFormData({ ...formData, numero_orden: e.target.value })}
                    placeholder="Opcional"
                  />
                </div>
                <div>
                  <Label>Observación (entregable o detalle)</Label>
                  <textarea
                    value={formData.observacion}
                    onChange={(e) => setFormData({ ...formData, observacion: e.target.value })}
                    placeholder="Describa el entregable o detalle"
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

        {/* Modal prórroga */}
        {prorrogaTarget && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-lg bg-white shadow-2xl dark:bg-gray-800">
              <div className="flex items-center justify-between border-b p-6 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Registrar prórroga — {prorrogaTarget.cut}
                </h2>
                <button
                  onClick={() => setProrrogaTarget(null)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400"
                >
                  <CloseIcon className="h-6 w-6" />
                </button>
              </div>
              <form onSubmit={handleSubmitProrroga} className="space-y-4 p-6">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Vencimiento actual: <strong>{formatFecha(prorrogaTarget.fecha_vencimiento)}</strong>.
                  La prórroga se cuenta desde esa fecha.
                </p>
                <div>
                  <Label>Plazo de prórroga (días calendario) *</Label>
                  <Input
                    type="number"
                    min={1}
                    value={prorrogaData.plazo}
                    onChange={(e) => setProrrogaData({ ...prorrogaData, plazo: e.target.value })}
                    placeholder="Ej: 5"
                  />
                </div>
                <DatePickerLima
                  label="Fecha de prórroga (vacío = hoy)"
                  value={prorrogaData.fecha}
                  onChange={(date) => setProrrogaData({ ...prorrogaData, fecha: date })}
                  placeholder="DD/MM/YYYY"
                />
                <div className="flex gap-3 border-t pt-4 dark:border-gray-700">
                  <button
                    type="submit"
                    className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                  >
                    Registrar prórroga
                  </button>
                  <button
                    type="button"
                    onClick={() => setProrrogaTarget(null)}
                    className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal expediente por CUT */}
        {cutAbierto && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-900/50 p-4">
            <div className="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-gray-800">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 bg-brand-600 px-5 py-3 text-white">
                <div className="flex items-baseline gap-3">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-white/70">Expediente</span>
                  <h2 className="text-lg font-bold">{cutAbierto}</h2>
                </div>
                <button
                  onClick={copiarCut}
                  className="rounded-md bg-white/15 px-2 py-0.5 text-[11px] font-medium hover:bg-white/25"
                >
                  {copiado ? "Copiado" : "Copiar"}
                </button>
                <button
                  onClick={() => cutAbierto && abrirTrazabilidad(cutAbierto)}
                  className="rounded-md bg-white px-2 py-0.5 text-[11px] font-semibold text-brand-700 hover:bg-white/90"
                >
                  Trazabilidad
                </button>
                {expedienteCut && (
                  <div className="flex items-center gap-2 text-[11px]">
                    <span
                      className={`rounded-full px-2 py-0.5 font-bold ${
                        expedienteCut.estupa === "TUPA" ? "bg-white text-brand-700" : "bg-white/15"
                      }`}
                    >
                      {expedienteCut.estupa === "TUPA" ? "TUPA" : "NO TUPA"}
                    </span>
                    {expedienteCut.origen && (
                      <span className="rounded-full bg-white/15 px-2 py-0.5">Origen {expedienteCut.origen}</span>
                    )}
                  </div>
                )}
                <button
                  onClick={cerrarExpediente}
                  className="ml-auto rounded-full p-1 text-white/80 hover:bg-white/20 hover:text-white"
                >
                  <CloseIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="overflow-y-auto bg-gray-50 p-3 dark:bg-gray-900/40">
                {cutCargando && (
                  <div className="grid animate-pulse grid-cols-1 gap-3 md:grid-cols-2">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className="h-24 rounded-xl bg-white dark:bg-gray-800"></div>
                    ))}
                  </div>
                )}
                {!cutCargando && cutError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
                    {cutError}
                  </div>
                )}
                {!cutCargando && expedienteCut && (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {SECCIONES_EXPEDIENTE.map((seccion) => (
                      <section
                        key={seccion.titulo}
                        className="h-full rounded-xl bg-white p-3 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700"
                      >
                        <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                          {seccion.titulo}
                        </h3>
                        <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
                          {seccion.campos.map((campo) => {
                            const valor = valorCampo(expedienteCut[campo.clave], campo.formato);
                            const esLargo = campo.formato === "largo";
                            return (
                              <div
                                key={campo.clave}
                                className={esLargo ? "col-span-2" : ""}
                              >
                                <dt className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                  {campo.etiqueta}
                                </dt>
                                <dd
                                  className={`whitespace-pre-wrap break-words text-gray-900 dark:text-white ${
                                    esLargo
                                      ? "border-l-2 border-brand-500 pl-2 text-xs leading-snug"
                                      : "text-xs font-semibold"
                                  }`}
                                >
                                  {valor}
                                </dd>
                              </div>
                            );
                          })}
                        </dl>
                      </section>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal trazabilidad */}
        {trazCut && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-gray-900/50 p-4">
            <div className="flex max-h-[85vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-gray-800">
              <div className="flex items-center gap-3 bg-brand-600 px-5 py-3 text-white">
                <div className="flex items-baseline gap-3">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-white/70">Trazabilidad</span>
                  <h2 className="text-lg font-bold">{trazCut}</h2>
                  <span className="text-[11px] text-white/70">{trazRows.length} documentos</span>
                </div>
                <button
                  onClick={() => sincronizarTrazabilidad(trazCut)}
                  disabled={trazSincronizando || trazCargando}
                  className="ml-auto rounded-md bg-white/15 px-2.5 py-1 text-[11px] font-medium hover:bg-white/25 disabled:opacity-50"
                >
                  {trazSincronizando ? "Actualizando..." : "Actualizar desde SISGED"}
                </button>
                <button
                  onClick={() => setTrazCut(null)}
                  className="rounded-full p-1 text-white/80 hover:bg-white/20 hover:text-white"
                >
                  <CloseIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="overflow-auto">
                {(trazCargando || trazSincronizando) && trazRows.length === 0 && (
                  <div className="p-10 text-center text-sm text-gray-500">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-brand-600 border-t-transparent"></div>
                    <p className="mt-3">Consultando trazabilidad en SISGED...</p>
                  </div>
                )}
                {trazError && (
                  <div className="m-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
                    {trazError}
                  </div>
                )}
                {!trazCargando && !trazSincronizando && !trazError && trazRows.length === 0 && (
                  <div className="p-10 text-center text-sm text-gray-500">No hay documentos registrados para este CUT.</div>
                )}
                {trazRows.length > 0 && (
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-gray-50 text-[10px] uppercase tracking-wide text-gray-500 dark:bg-gray-700 dark:text-gray-300">
                      <tr>
                        <th className="px-3 py-2 text-start">N°</th>
                        <th className="px-3 py-2 text-start">Documento</th>
                        <th className="px-3 py-2 text-center">Adjunto</th>
                        <th className="px-3 py-2 text-start">Asunto</th>
                        <th className="px-3 py-2 text-start">Fecha creación</th>
                        <th className="px-3 py-2 text-center">Estado</th>
                        <th className="px-3 py-2 text-center">Folios</th>
                        <th className="px-3 py-2 text-start">Remitente</th>
                        <th className="px-3 py-2 text-start">Destino</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {trazRows.map((d, index) => (
                        <tr key={d.id} className="align-top hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-3 py-2 text-gray-500">{index + 1}</td>
                          <td className="px-3 py-2">
                            <button
                              onClick={() => verDocumento(d)}
                              className="text-left font-semibold text-brand-600 underline-offset-2 hover:underline dark:text-brand-400"
                            >
                              {d.ndoc || "—"}
                            </button>
                          </td>
                          <td className="px-3 py-2 text-center">
                            {parseAdjuntos(d.adjunto).length > 0 ? (
                              <div className="flex flex-wrap justify-center gap-1">
                                {parseAdjuntos(d.adjunto).map((adj) => (
                                  <button
                                    key={adj.id}
                                    onClick={() => verAdjunto(adj, d)}
                                    title={adj.isUrl ? `Enlace: ${adj.nombre}` : `${adj.nombre} (${adj.extension.toUpperCase()})`}
                                    className="text-base transition hover:scale-125"
                                  >
                                    {adj.icono}
                                  </button>
                                ))}
                              </div>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="max-w-xs px-3 py-2 text-gray-700 dark:text-gray-200">{d.asunto || "—"}</td>
                          <td className="whitespace-nowrap px-3 py-2">{formatFechaHora(d.stfecrea)}</td>
                          <td className="px-3 py-2 text-center">{badgeEstado(d.estado)}</td>
                          <td className="px-3 py-2 text-center">{d.fol ?? "—"}</td>
                          <td className="max-w-[12rem] px-3 py-2 text-gray-700 dark:text-gray-200">{d.remi || "—"}</td>
                          <td className="max-w-[12rem] px-3 py-2 text-gray-700 dark:text-gray-200">{d.destino || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal visor de documento */}
        {verDoc && (
          <div className="fixed inset-0 z-[11000] flex items-center justify-center bg-gray-900/60 p-4">
            <div className="flex h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-gray-800">
              <div className="flex items-center gap-3 bg-brand-600 px-5 py-3 text-white">
                <h2 className="min-w-0 flex-1 truncate text-sm font-bold">{verDoc.titulo}</h2>
                {verDoc.url && (
                  <a
                    href={verDoc.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md bg-white/15 px-2.5 py-1 text-[11px] font-medium hover:bg-white/25"
                  >
                    Abrir en nueva pestaña
                  </a>
                )}
                <button
                  onClick={() => setVerDoc(null)}
                  className="rounded-full p-1 text-white/80 hover:bg-white/20 hover:text-white"
                >
                  <CloseIcon className="h-5 w-5" />
                </button>
              </div>
              <div className="flex flex-1 items-center justify-center bg-gray-100 dark:bg-gray-900">
                {verDoc.cargando && (
                  <div className="text-center text-sm text-gray-500">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent"></div>
                    <p className="mt-3">Obteniendo documento de SISGED...</p>
                  </div>
                )}
                {!verDoc.cargando && verDoc.error && (
                  <div className="m-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
                    {verDoc.error}
                  </div>
                )}
                {!verDoc.cargando && verDoc.url && (
                  <iframe src={verDoc.url} title={verDoc.titulo} className="h-full w-full border-0 bg-white" />
                )}
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
                <p className="mt-4">Cargando asignaciones...</p>
              </div>
            ) : asignaciones.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50 dark:bg-gray-700">
                    <th className="px-6 py-4 text-start text-sm font-semibold">#</th>
                    <th className="px-6 py-4 text-start text-sm font-semibold">CUT</th>
                    <th className="px-6 py-4 text-start text-sm font-semibold">Asignado a</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold">Asignación</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold">Plazo (días)</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold">Vencimiento</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold">Prórroga</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold">Vence prórroga</th>
                    <th className="px-6 py-4 text-start text-sm font-semibold">Observación</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {asignaciones.map((a, index) => (
                    <tr key={a.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 text-sm">
                        {pagination.pageIndex * pagination.pageSize + index + 1}
                      </td>
                      <td className="px-6 py-4 font-medium">
                        <button
                          onClick={() => abrirExpediente(a.cut)}
                          className="text-blue-600 hover:underline dark:text-blue-400"
                        >
                          {a.cut}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div>{nombreUsuario(a.asignado)}</div>
                        {a.numero_orden && (
                          <div className="text-xs text-gray-500">Orden: {a.numero_orden}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center text-sm">{formatFecha(a.fecha_asignacion)}</td>
                      <td className="px-6 py-4 text-center text-sm">{a.plazo_atencion}</td>
                      <td className="px-6 py-4 text-center text-sm">{formatFecha(a.fecha_vencimiento)}</td>
                      <td className="px-6 py-4 text-center text-sm">
                        {a.plazo_prorroga ? (
                          <>
                            <div>{formatFecha(a.fecha_prorroga)}</div>
                            <div className="text-xs text-gray-500">{a.plazo_prorroga} días</div>
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-6 py-4 text-center text-sm">
                        {formatFecha(a.fecha_vencimiento_prorroga)}
                      </td>
                      <td className="max-w-xs px-6 py-4 text-sm">{a.observacion || "—"}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-3">
                          <button
                            onClick={() => handleOpenProrroga(a)}
                            className="rounded border border-blue-600 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400"
                          >
                            Prórroga
                          </button>
                          <button
                            onClick={() => handleEdit(a)}
                            className="text-green-600 hover:text-green-800 dark:text-green-400"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(a.id)}
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
                No hay asignaciones disponibles
              </div>
            )}
          </div>

          {asignaciones.length > 0 && (
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
                      setPagination((p) => ({ ...p, pageIndex: Math.max(0, p.pageIndex - 1) }))
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

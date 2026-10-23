import PageMeta from "@/components/common/PageMeta";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import DatePickerLima from "@/components/form/DatePickerLima";
import SearchableSelect from "@/components/form/SearchableSelect";
import ExpedienteDetalleModal from "@/components/expedientes/ExpedienteDetalleModal";
import HistorialAsignacionModal from "@/components/asignaciones/HistorialAsignacionModal";
import ProrrogaMasivaModal from "@/components/asignaciones/ProrrogaMasivaModal";
import RespuestasAsignacionModal from "@/components/asignaciones/RespuestasAsignacionModal";
import { formatFecha, formatFechaHora } from "@/components/expedientes/format";
import api from "@/utils/api";
import * as XLSX from "xlsx";
import { puedeGestionarAsignaciones, usuarioActualId } from "@/utils/sesion";
import { PencilIcon, TrashBinIcon, PlusIcon, CloseIcon, CalendarPlusIcon, ChatBubbleIcon, HistoryIcon } from "@/icons";
import BotonAccion from "@/components/common/BotonAccion";

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
  estado_prorroga?: string | null;
  motivo_prorroga?: string | null;
  observacion?: string | null;
  numero_orden?: string | null;
  asignado?: (UsuarioResumen & { Cargo?: { nombre: string } | null }) | null;
  respuesta?: {
    total: number;
    ultima_respuesta: string | null;
    estado: string;
    evaluacion?: {
      resultado: string;
      observacion?: string | null;
      fecha_evaluacion: string;
      evaluador?: { nombre: string; apellido: string } | null;
    } | null;
  } | null;
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

const DIAS_PARA_PRORROGA = 5;

const diasEntre = (fecha: string, hoy: string) =>
  Math.round(
    (Date.parse(`${fecha.slice(0, 10)}T00:00:00Z`) - Date.parse(`${hoy}T00:00:00Z`)) / 86400000
  );

const vencimientoVigente = (a: Asignacion) =>
  a.estado_prorroga === "ACEPTADA" ? a.fecha_vencimiento_prorroga : a.fecha_vencimiento;

const puedeProrrogar = (a: Asignacion) => {
  if (a.estado_prorroga === "PENDIENTE" || a.estado_prorroga === "ACEPTADA") return false;
  if (a.respuesta?.estado === "CERRADA") return false;
  return diasEntre(a.fecha_vencimiento, hoyLima()) <= DIAS_PARA_PRORROGA;
};

const ESTADO_PRORROGA: Record<string, { texto: string; clases: string }> = {
  PENDIENTE: { texto: "Pendiente", clases: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100" },
  ACEPTADA: { texto: "Aceptada", clases: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" },
  RECHAZADA: { texto: "Rechazada", clases: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100" },
};


const ESTADO_RESPUESTA: Record<string, { texto: string; clases: string }> = {
  SIN_RESPUESTA: { texto: "Sin respuesta", clases: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200" },
  POR_EVALUAR: { texto: "Por evaluar", clases: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100" },
  RESPONDIDA: { texto: "Respondida", clases: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-100" },
  OBSERVADA: { texto: "Observada", clases: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100" },
  CERRADA: { texto: "Cerrada", clases: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" },
};

const DiasRestantes = ({ a }: { a: Asignacion }) => {
  if (a.respuesta?.estado === "CERRADA") {
    return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${ESTADO_RESPUESTA.CERRADA.clases}`}>Cerrada</span>;
  }
  const vence = vencimientoVigente(a);
  if (!vence) return <span className="text-gray-400">—</span>;
  const dias = diasEntre(vence, hoyLima());
  const clases =
    dias < 0
      ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
      : dias <= DIAS_PARA_PRORROGA
      ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100"
      : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
  const texto =
    dias < 0 ? `Vencido hace ${-dias} d` : dias === 0 ? "Vence hoy" : `${dias} día${dias === 1 ? "" : "s"}`;
  return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${clases}`}>{texto}</span>;
};

const nombreUsuario = (u?: UsuarioResumen | null) =>
  u ? `${u.nombre} ${u.apellido}` : "—";

// Convierte la fecha de una celda Excel (fecha real o texto dd/mm/aaaa) a AAAA-MM-DD.
const aFechaYMD = (valor: any) => {
  if (valor instanceof Date && !isNaN(valor.getTime())) {
    const mes = String(valor.getMonth() + 1).padStart(2, "0");
    const dia = String(valor.getDate()).padStart(2, "0");
    return `${valor.getFullYear()}-${mes}-${dia}`;
  }
  const texto = String(valor ?? "").trim();
  const coincidencia = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (coincidencia) {
    return `${coincidencia[3]}-${coincidencia[2].padStart(2, "0")}-${coincidencia[1].padStart(2, "0")}`;
  }
  return texto;
};

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
  const [prorrogaData, setProrrogaData] = useState({ plazo: "", motivo: "" });
  const [historialTarget, setHistorialTarget] = useState<Asignacion | null>(null);
  const [respuestasTarget, setRespuestasTarget] = useState<Asignacion | null>(null);
  const [seleccion, setSeleccion] = useState<number[]>([]);
  const [prorrogaMasiva, setProrrogaMasiva] = useState(false);
  const [erroresCarga, setErroresCarga] = useState<{ fila: number; mensaje: string }[]>([]);
  const [cargandoExcel, setCargandoExcel] = useState(false);
  const [vistaPrevia, setVistaPrevia] = useState<{
    filas: any[];
    errores: { fila: number; mensaje: string }[];
    total: number;
    listas: number;
    omitidas: number;
  } | null>(null);
  const [datosPendientes, setDatosPendientes] = useState<any[]>([]);
  const [filasQuitadas, setFilasQuitadas] = useState<number[]>([]);
  const [confirmandoCarga, setConfirmandoCarga] = useState(false);
  const [asignadosCut, setAsignadosCut] = useState<Asignacion[]>([]);

  const [cutAbierto, setCutAbierto] = useState<string | null>(null);

  const gestiona = puedeGestionarAsignaciones();

  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [filters, setFilters] = useState<{ cut: string; id_usuario: number | "" }>({ cut: "", id_usuario: "" });
  const [asignadoNombre, setAsignadoNombre] = useState("");
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
      if (filters.id_usuario !== "") params.id_usuario = filters.id_usuario;

      const response = await api.get("/asignaciones-expediente", { params });
      setAsignaciones(response.data.asignaciones || []);
      setTotalCount(response.data.totalAsignaciones || 0);
      setSeleccion([]);
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
      const params: any = {};
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

  // Lista de usuarios para el filtro "Asignado a".
  useEffect(() => {
    fetchUsuarios();
  }, [fetchUsuarios]);

  // Mientras se escribe el CUT, muestra si ya está asignado a alguien.
  useEffect(() => {
    const cut = formData.cut.trim();
    if (!showModal || editingId || cut.length < 5) {
      setAsignadosCut([]);
      return;
    }
    const espera = setTimeout(() => {
      api
        .get(`/asignaciones-expediente/por-cut/${encodeURIComponent(cut)}`)
        .then((res) => setAsignadosCut(Array.isArray(res.data) ? res.data : []))
        .catch(() => setAsignadosCut([]));
    }, 400);
    return () => clearTimeout(espera);
  }, [formData.cut, showModal, editingId]);

  const opcionesUsuarios = usuarios.map((u) => ({
    id: u.id,
    nombre: etiquetaUsuario(u.nombre, u.cargo),
  }));

  // Plantilla con las columnas de la carga y una hoja con los usuarios para copiar el usuario asignado.
  const descargarPlantilla = async () => {
    try {
      const res = await api.get("/usuarios/select", { params: { limit: 500 } });
      const usuarios: { nombre: string; usuario: string; cargo?: string | null }[] = Array.isArray(res.data) ? res.data : [];

      const cabecera = [
        "CUT",
        "USUARIO ASIGNADO",
        "FECHA ASIGNACION (AAAA-MM-DD)",
        "PLAZO (DIAS)",
        "NUMERO DE ORDEN",
        "OBSERVACION",
      ];
      const hoja = XLSX.utils.aoa_to_sheet([cabecera, ["101183-2025", usuarios[0]?.usuario ?? "", hoyLima(), 15, "", "EJEMPLO"]]);
      hoja["!cols"] = [{ wch: 16 }, { wch: 22 }, { wch: 30 }, { wch: 14 }, { wch: 18 }, { wch: 40 }];

      const referencia = XLSX.utils.aoa_to_sheet([
        ["NOMBRE", "USUARIO (copiar en la columna USUARIO ASIGNADO)", "CARGO"],
        ...usuarios.map((u) => [u.nombre, u.usuario, u.cargo ?? ""]),
      ]);
      referencia["!cols"] = [{ wch: 40 }, { wch: 40 }, { wch: 24 }];

      const libro = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(libro, hoja, "Asignaciones");
      XLSX.utils.book_append_sheet(libro, referencia, "Usuarios");
      XLSX.writeFile(libro, "plantilla_asignaciones.xlsx");
    } catch {
      toast.error("No se pudo generar la plantilla");
    }
  };

  const cargarExcel = async (archivo: File) => {
    setCargandoExcel(true);
    setErroresCarga([]);
    try {
      const libro = XLSX.read(await archivo.arrayBuffer(), { type: "array", cellDates: true });
      const hoja = libro.Sheets[libro.SheetNames[0]];
      const filas = XLSX.utils.sheet_to_json<Record<string, any>>(hoja, { defval: "", raw: true });
      const datos = filas
        .map((f, i) => ({ fila: i + 2, original: f }))
        .filter((x) => String(x.original["CUT"] ?? "").trim() !== "")
        .map(({ fila, original: f }) => ({
          fila,
          cut: f["CUT"],
          usuario: f["USUARIO ASIGNADO"],
          fecha: aFechaYMD(f["FECHA ASIGNACION (AAAA-MM-DD)"]),
          plazo: f["PLAZO (DIAS)"],
          numero_orden: f["NUMERO DE ORDEN"],
          observacion: f["OBSERVACION"],
        }));
      if (datos.length === 0) {
        toast.error("El archivo no tiene filas con CUT");
        return;
      }
      // Primero se revisa el archivo: la vista previa no crea nada.
      setDatosPendientes(datos);
      setFilasQuitadas([]);
      fetchUsuarios();
      const res = await api.post("/asignaciones-expediente/carga-masiva", { filas: datos });
      setVistaPrevia(res.data);
    } catch (error: any) {
      const errores = error.response?.data?.errores;
      if (errores) {
        setErroresCarga(errores);
        toast.error("Hay filas con errores. No se creó ninguna asignación.");
      } else {
        toast.error(error.response?.data?.mensaje || "No se pudo leer el archivo");
      }
    } finally {
      setCargandoExcel(false);
    }
  };

  // Filas que siguen en la vista previa (sin las quitadas con la X).
  const filasVisibles = vistaPrevia ? vistaPrevia.filas.filter((f) => !filasQuitadas.includes(f.fila)) : [];
  const listasVisibles = filasVisibles.filter((f) => f.estado === "LISTA").length;
  const avisosVisibles = filasVisibles.filter((f) => f.estado === "AVISO").length;
  const erroresVisibles = filasVisibles.filter((f) => f.estado === "ERROR").length;
  const filasAConfirmar = datosPendientes.filter((d) => filasVisibles.some((f) => f.fila === d.fila));

  // Cambia la persona asignada de una fila y vuelve a revisar el archivo con ese cambio.
  const cambiarUsuarioFila = async (fila: number, idUsuario: number) => {
    const elegido = usuarios.find((u) => u.id === idUsuario);
    if (!elegido) return;
    const nuevos = datosPendientes.map((d) => (d.fila === fila ? { ...d, usuario: elegido.usuario } : d));
    setDatosPendientes(nuevos);
    try {
      const res = await api.post("/asignaciones-expediente/carga-masiva", { filas: nuevos });
      setVistaPrevia(res.data);
    } catch {
      toast.error("No se pudo revisar el archivo con el cambio");
    }
  };

  const confirmarCarga = async () => {
    setConfirmandoCarga(true);
    try {
      const res = await api.post("/asignaciones-expediente/carga-masiva", { filas: filasAConfirmar, confirmar: true });
      toast.success(`Se crearon ${res.data.creadas} asignaciones`);
      setVistaPrevia(null);
      setDatosPendientes([]);
      setFilasQuitadas([]);
      await fetchAsignaciones();
    } catch (error: any) {
      const errores = error.response?.data?.errores;
      if (errores) {
        setErroresCarga(errores);
        setVistaPrevia(null);
      }
      toast.error(error.response?.data?.mensaje || "No se pudo cargar el archivo");
    } finally {
      setConfirmandoCarga(false);
    }
  };

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
    setProrrogaData({ plazo: "", motivo: "" });
  };

  const handleSubmitProrroga = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prorrogaTarget) return;

    if (!prorrogaData.plazo || Number(prorrogaData.plazo) < 1) {
      toast.error("El plazo de prórroga debe ser un número mayor a 0");
      return;
    }
    if (!prorrogaData.motivo.trim()) {
      toast.error("Escribe el motivo por el que solicitas la prórroga");
      return;
    }

    try {
      await api.patch(`/asignaciones-expediente/${prorrogaTarget.id}/prorroga`, {
        plazo_prorroga: Number(prorrogaData.plazo),
        motivo: prorrogaData.motivo,
      });
      toast.success("Prórroga solicitada, pendiente de aceptación");
      setProrrogaTarget(null);
      await fetchAsignaciones();
    } catch (error: any) {
      toast.error(error.response?.data?.mensaje || "Error al solicitar la prórroga");
    }
  };

  const handleOpenHistorial = (asignacion: Asignacion) => {
    setHistorialTarget(asignacion);
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

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPagination({ pageIndex: 0, pageSize: 10 });
  };

  const handleAsignadoChange = (valor: string | number) => {
    const usuario = usuarios.find((u) => u.id === Number(valor));
    setAsignadoNombre(usuario ? etiquetaUsuario(usuario.nombre, usuario.cargo) : "");
    setFilters((prev) => ({ ...prev, id_usuario: valor === "" ? "" : Number(valor) }));
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
          {gestiona && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={descargarPlantilla}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
              >
                Plantilla Excel
              </button>
              <label
                className={`cursor-pointer rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 ${
                  cargandoExcel ? "pointer-events-none opacity-50" : ""
                }`}
              >
                {cargandoExcel ? "Cargando..." : "Cargar Excel"}
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => {
                    const archivo = e.target.files?.[0];
                    if (archivo) cargarExcel(archivo);
                    e.target.value = "";
                  }}
                />
              </label>
              <button
                onClick={handleOpenModal}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                <PlusIcon className="h-5 w-5" />
                Nueva Asignación
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 rounded-lg bg-gray-50 p-4 md:grid-cols-2 dark:bg-gray-800">
          <div>
            <Label>Buscar por CUT</Label>
            <Input
              name="cut"
              value={filters.cut}
              onChange={handleFilterChange}
              placeholder="Ej: 101183-2025"
            />
          </div>
          <div>
            <Label>Asignado a</Label>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <SearchableSelect
                  value={filters.id_usuario}
                  onChange={handleAsignadoChange}
                  options={usuarios.map((u) => ({ id: u.id, nombre: etiquetaUsuario(u.nombre, u.cargo) }))}
                  onSearch={(termino) => fetchUsuarios(termino)}
                  isLoading={loadingUsuarios}
                  placeholder="Buscar persona..."
                  selectedLabel={asignadoNombre}
                />
              </div>
              {filters.id_usuario !== "" && (
                <button
                  onClick={() => handleAsignadoChange("")}
                  className="shrink-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                >
                  Quitar
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Modal crear / editar */}
        {showModal && (
          <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/50 p-4">
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
                  {asignadosCut.length > 0 && (
                    <div className="mt-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs dark:border-amber-700 dark:bg-amber-900/30">
                      <div className="font-semibold text-amber-900 dark:text-amber-100">
                        Este CUT ya está asignado a {asignadosCut.length} persona{asignadosCut.length === 1 ? "" : "s"}:
                      </div>
                      <ul className="mt-1 space-y-1 text-amber-900 dark:text-amber-100">
                        {asignadosCut.map((a) => (
                          <li key={a.id}>
                            {nombreUsuario(a.asignado)} · desde {formatFecha(a.fecha_asignacion)} · vence{" "}
                            {formatFecha(a.fecha_vencimiento)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
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
          <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/50 p-4">
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
                  La prórroga se contará desde esa fecha, una vez aceptada.
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
                <div>
                  <Label>Motivo de la prórroga *</Label>
                  <textarea
                    value={prorrogaData.motivo}
                    onChange={(e) => setProrrogaData({ ...prorrogaData, motivo: e.target.value })}
                    rows={3}
                    placeholder="Explica por qué se necesita la prórroga"
                    className="w-full rounded border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-700"
                  />
                </div>
                <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                  Fecha de solicitud: hoy ({formatFecha(hoyLima())}). Quedará pendiente hasta que sea aceptada o rechazada.
                </p>
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

        {prorrogaMasiva && (
          <ProrrogaMasivaModal
            modo="solicitar"
            ids={seleccion}
            onClose={() => setProrrogaMasiva(false)}
            onDone={() => {
              setProrrogaMasiva(false);
              setSeleccion([]);
              fetchAsignaciones();
            }}
          />
        )}

        {historialTarget && (
          <HistorialAsignacionModal
            asignacionId={historialTarget.id}
            cut={historialTarget.cut}
            onClose={() => setHistorialTarget(null)}
          />
        )}

        {respuestasTarget && (
          <RespuestasAsignacionModal
            asignacion={respuestasTarget}
            ultimaEvaluacion={respuestasTarget.respuesta?.evaluacion ?? null}
            estadoRespuesta={respuestasTarget.respuesta?.estado ?? null}
            onCambio={fetchAsignaciones}
            onClose={() => setRespuestasTarget(null)}
          />
        )}

        {cutAbierto && (
          <ExpedienteDetalleModal cut={cutAbierto} onClose={() => setCutAbierto(null)} />
        )}

        {gestiona && seleccion.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-brand-200 bg-brand-50 p-3 dark:border-brand-800 dark:bg-brand-900/20">
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
              {seleccion.length} seleccionada(s)
            </span>
            <button
              onClick={() => setProrrogaMasiva(true)}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Solicitar prórroga a seleccionadas
            </button>
            <button
              onClick={() => setSeleccion([])}
              className="ml-auto text-sm text-gray-600 underline hover:text-gray-800 dark:text-gray-300"
            >
              Limpiar selección
            </button>
          </div>
        )}

        {vistaPrevia && (
          <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/50 p-4">
            <div className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl dark:bg-gray-800">
              <div className="border-b p-5 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Vista previa de la carga</h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {filasVisibles.length} fila{filasVisibles.length === 1 ? "" : "s"} · {listasVisibles} lista
                  {listasVisibles === 1 ? "" : "s"} · {avisosVisibles} ya asignada{avisosVisibles === 1 ? "" : "s"} · {erroresVisibles} con error
                  {vistaPrevia.errores.length > 0 && " · corrija el archivo y vuelva a cargarlo para poder confirmar"}
                </p>
              </div>

              <div className="min-h-0 flex-1 overflow-auto p-5">
                <table className="min-w-[900px] w-full text-sm">
                  <thead className="sticky top-0 bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-700 dark:text-gray-300">
                    <tr>
                      <th className="px-3 py-2 text-start">Fila</th>
                      <th className="px-3 py-2 text-start">CUT</th>
                      <th className="px-3 py-2 text-start">Asignado a</th>
                      <th className="px-3 py-2 text-center">Plazo</th>
                      <th className="px-3 py-2 text-center">Asignación</th>
                      <th className="px-3 py-2 text-center">Vence</th>
                      <th className="px-3 py-2 text-start">Observación</th>
                      <th className="px-3 py-2 text-start">Estado</th>
                      <th className="px-3 py-2 text-center">Quitar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {filasVisibles.map((f) => (
                      <tr
                        key={f.fila}
                        className={
                          f.estado === "ERROR"
                            ? "bg-red-50 dark:bg-red-900/20"
                            : f.estado === "AVISO"
                            ? "bg-amber-50 dark:bg-amber-900/20"
                            : ""
                        }
                      >
                        <td className="px-3 py-2">{f.fila}</td>
                        <td className="px-3 py-2 font-medium">{f.cut || "—"}</td>
                        <td className="min-w-[240px] px-3 py-2">
                          <SearchableSelect
                            value={f.id_usuario ?? ""}
                            onChange={(valor) => cambiarUsuarioFila(f.fila, Number(valor))}
                            options={usuarios.map((u) => ({ id: u.id, nombre: etiquetaUsuario(u.nombre, u.cargo) }))}
                            onSearch={(termino) => fetchUsuarios(termino)}
                            placeholder="Buscar persona..."
                            selectedLabel={f.nombre || f.usuario}
                          />
                        </td>
                        <td className="px-3 py-2 text-center">{f.plazo || "—"}</td>
                        <td className="px-3 py-2 text-center">{formatFecha(f.fecha)}</td>
                        <td className="px-3 py-2 text-center">{formatFecha(f.fecha_vencimiento)}</td>
                        <td className="max-w-xs truncate px-3 py-2">{f.observacion || "—"}</td>
                        <td className="px-3 py-2">
                          {f.estado === "ERROR" && <span className="text-red-700 dark:text-red-300">{f.mensaje}</span>}
                          {f.estado === "AVISO" && (
                            <span className="font-medium text-amber-800 dark:text-amber-200">Aviso: {f.mensaje}</span>
                          )}
                          {f.estado === "LISTA" && (
                            <span className="font-semibold text-green-700 dark:text-green-300">Lista</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            onClick={() => setFilasQuitadas((prev) => [...prev, f.fila])}
                            title="Quitar de la carga"
                            aria-label="Quitar de la carga"
                            className="rounded px-2 py-0.5 text-lg leading-none text-gray-500 hover:bg-gray-200 hover:text-red-600 dark:text-gray-300 dark:hover:bg-gray-700"
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-3 border-t p-5 sm:flex-row sm:items-center sm:justify-end dark:border-gray-700">
                {filasQuitadas.length > 0 && (
                  <button
                    onClick={() => setFilasQuitadas([])}
                    className="mr-auto text-sm font-semibold text-brand-600 underline dark:text-brand-400"
                  >
                    Restaurar {filasQuitadas.length} quitada{filasQuitadas.length === 1 ? "" : "s"}
                  </button>
                )}
                <button
                  onClick={() => {
                    setVistaPrevia(null);
                    setDatosPendientes([]);
                  }}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarCarga}
                  disabled={confirmandoCarga || erroresVisibles > 0 || filasAConfirmar.length === 0}
                  className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {confirmandoCarga ? "Creando..." : `Confirmar y crear ${filasAConfirmar.length} asignaciones`}
                </button>
              </div>
            </div>
          </div>
        )}

        {erroresCarga.length > 0 && (
          <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm dark:border-red-800 dark:bg-red-900/30">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-semibold text-red-800 dark:text-red-200">
                El archivo tiene {erroresCarga.length} fila{erroresCarga.length === 1 ? "" : "s"} con errores. Corríjalas y vuelva a cargarlo; no se creó ninguna asignación.
              </span>
              <button onClick={() => setErroresCarga([])} className="text-xs font-semibold text-red-700 underline dark:text-red-300">
                Cerrar
              </button>
            </div>
            <ul className="max-h-48 list-disc space-y-1 overflow-y-auto pl-5 text-red-800 dark:text-red-200">
              {erroresCarga.map((e) => (
                <li key={e.fila}>
                  Fila {e.fila}: {e.mensaje}
                </li>
              ))}
            </ul>
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
                    <th className="px-4 py-4 text-center">
                      {gestiona && (
                      <input
                        type="checkbox"
                        aria-label="Seleccionar las que pueden pedir prórroga"
                        checked={
                          asignaciones.some((a) => puedeProrrogar(a)) &&
                          asignaciones.filter((a) => puedeProrrogar(a)).every((a) => seleccion.includes(a.id))
                        }
                        onChange={(e) =>
                          setSeleccion(
                            e.target.checked ? asignaciones.filter((a) => puedeProrrogar(a)).map((a) => a.id) : []
                          )
                        }
                      />
                      )}
                    </th>
                    <th className="px-6 py-4 text-start text-sm font-semibold">#</th>
                    <th className="px-6 py-4 text-start text-sm font-semibold">CUT</th>
                    <th className="px-6 py-4 text-start text-sm font-semibold">Asignado a</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold">Asignación</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold">Plazo (días)</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold">Vencimiento</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold">Prórroga</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold">Vence prórroga</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold">Días restantes</th>
                    <th className="px-6 py-4 text-start text-sm font-semibold">Observación</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold">Respuesta</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {asignaciones.map((a, index) => (
                    <tr key={a.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-4 text-center">
                        {gestiona && puedeProrrogar(a) && (
                          <input
                            type="checkbox"
                            aria-label={`Seleccionar ${a.cut}`}
                            checked={seleccion.includes(a.id)}
                            onChange={(e) =>
                              setSeleccion((prev) =>
                                e.target.checked ? [...prev, a.id] : prev.filter((x) => x !== a.id)
                              )
                            }
                          />
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {pagination.pageIndex * pagination.pageSize + index + 1}
                      </td>
                      <td className="px-6 py-4 font-medium">
                        <button
                          onClick={() => setCutAbierto(a.cut)}
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
                        {a.estado_prorroga && ESTADO_PRORROGA[a.estado_prorroga] ? (
                          <>
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${ESTADO_PRORROGA[a.estado_prorroga].clases}`}>
                              {ESTADO_PRORROGA[a.estado_prorroga].texto}
                            </span>
                            <div className="mt-1 text-xs text-gray-500">
                              {a.plazo_prorroga} días · {formatFecha(a.fecha_prorroga)}
                            </div>
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-6 py-4 text-center text-sm">
                        {a.estado_prorroga === "ACEPTADA" ? formatFecha(a.fecha_vencimiento_prorroga) : "—"}
                      </td>
                      <td className="px-6 py-4 text-center text-sm">
                        <DiasRestantes a={a} />
                      </td>
                      <td className="max-w-xs px-6 py-4 text-sm">{a.observacion || "—"}</td>
                      <td className="px-6 py-4 text-center text-sm">
                        {a.respuesta && a.respuesta.total > 0 ? (
                          <>
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${ESTADO_RESPUESTA[a.respuesta.estado].clases}`}>
                              {ESTADO_RESPUESTA[a.respuesta.estado].texto}
                            </span>
                            <div className="mt-1 text-xs text-gray-500">
                              {a.respuesta.total} · última {formatFechaHora(a.respuesta.ultima_respuesta)}
                            </div>
                          </>
                        ) : (
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${ESTADO_RESPUESTA.SIN_RESPUESTA.clases}`}>
                            Sin respuesta
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-3">
                          {(gestiona || a.id_usuario === usuarioActualId()) && puedeProrrogar(a) && (
                            <BotonAccion
                              etiqueta="Solicitar prórroga"
                              icono={<CalendarPlusIcon />}
                              tono="alerta"
                              onClick={() => handleOpenProrroga(a)}
                            />
                          )}
                          <BotonAccion
                            etiqueta="Respuestas"
                            icono={<ChatBubbleIcon />}
                            tono="primario"
                            onClick={() => setRespuestasTarget(a)}
                          />
                          <BotonAccion
                            etiqueta="Historial"
                            icono={<HistoryIcon />}
                            onClick={() => handleOpenHistorial(a)}
                          />
                          {gestiona && (
                            <>
                              <BotonAccion
                                etiqueta="Editar"
                                icono={<PencilIcon className="h-5 w-5" />}
                                tono="exito"
                                onClick={() => handleEdit(a)}
                              />
                              <BotonAccion
                                etiqueta="Desactivar"
                                icono={<TrashBinIcon className="h-5 w-5" />}
                                tono="peligro"
                                onClick={() => handleDelete(a.id)}
                              />
                            </>
                          )}
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

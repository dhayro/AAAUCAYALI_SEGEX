import PageMeta from "@/components/common/PageMeta";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import api from "@/utils/api";
import { PencilIcon, TrashBinIcon, PlusIcon, CloseIcon, FileIcon, DocsIcon, UploadIcon } from "@/icons";
import { formatDate } from "@/utils/dateUtils";
import * as XLSX from "xlsx";

interface Expediente {
  id: number;
  numero_expediente?: string;
  cut: string;
  asunto: string;
  estado?: string;
  descripcion?: string;
  remitente?: string;
  numero_documento?: string;
  estupa?: string;
  tipo_procedimiento?: string;
  periodo?: string;
  fecha_documento?: string;
}

interface Documento {
  id: number;
  numero_documento: string;
  asunto?: string;
  tipo?: string;
  estado?: string;
  TipoDocumento?: { nombre: string };
}

interface Antecedente {
  id: number;
  fecha_incidente: string;
  persona_involucrada: string;
  telefono: string;
  resumen: string;
}

interface Area {
  id: number;
  nombre: string;
}

interface Usuario {
  id: number;
  nombre: string;
  email: string;
}

export default function Expedientes() {
  const [expedientes, setExpedientes] = useState<Expediente[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ numero_expediente: "", asunto: "", estado: "abierto", descripcion: "" });
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [filters, setFilters] = useState({ filtro: "", asunto: "", cut: "" });
  const [totalCount, setTotalCount] = useState(0);
  const [showDocumentosDialog, setShowDocumentosDialog] = useState(false);
  const [currentExpediente, setCurrentExpediente] = useState<Expediente | null>(null);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [showCrearDocumentoDialog, setShowCrearDocumentoDialog] = useState(false);
  const [documentoForm, setDocumentoForm] = useState({ numero_documento: "", asunto: "", tipo_documento: "" });
  const [showAsignarDialog, setShowAsignarDialog] = useState(false);
  const [selectedDocumento, setSelectedDocumento] = useState<Documento | null>(null);
  const [areas, setAreas] = useState<Area[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [selectedArea, setSelectedArea] = useState("");
  const [selectedUsuarios, setSelectedUsuarios] = useState<number[]>([]);
  const [plazoRespuesta, setPlazoRespuesta] = useState(3);
  const [observacion, setObservacion] = useState("");
  const [showAntecedentesDialog, setShowAntecedentesDialog] = useState(false);
  const [antecedentes, setAntecedentes] = useState<Antecedente[]>([]);
  const [antecedenteForm, setAntecedenteForm] = useState({ fecha_incidente: new Date().toISOString().split("T")[0], persona_involucrada: "", telefono: "", resumen: "" });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => { fetchExpedientes(); }, [pagination, filters]);

  const fetchExpedientes = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page: pagination.pageIndex + 1, limit: pagination.pageSize };
      if (filters.filtro) params.filtro = filters.filtro;
      if (filters.asunto) params.asunto = filters.asunto;
      if (filters.cut) params.cut = filters.cut;
      const response = await api.get("/expedientes", { params });
      setExpedientes(response.data.expedientes || response.data);
      setTotalCount(response.data.totalExpedientes || response.data.length);
    } catch (error) {
      console.error("Error fetching expedientes:", error);
      toast.error("Error al cargar expedientes");
    } finally {
      setLoading(false);
    }
  }, [pagination, filters]);

  const handleOpenModal = () => {
    setFormData({ numero_expediente: "", asunto: "", estado: "abierto", descripcion: "" });
    setEditingId(null);
    setShowModal(true);
  };

  const handleCloseModal = () => { setShowModal(false); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.numero_expediente.trim() || !formData.asunto.trim()) {
      toast.error("Los campos requeridos no pueden estar vacíos");
      return;
    }
    try {
      if (editingId) {
        await api.put(`/expedientes/${editingId}`, formData);
        toast.success("Expediente actualizado correctamente");
      } else {
        await api.post("/expedientes", formData);
        toast.success("Expediente creado correctamente");
      }
      handleCloseModal();
      await fetchExpedientes();
    } catch (error: any) {
      toast.error(error.response?.data?.mensaje || "Error al procesar la solicitud");
    }
  };

  const handleEdit = (exp: Expediente) => {
    setFormData({ numero_expediente: exp.numero_expediente || "", asunto: exp.asunto || "", estado: exp.estado || "abierto", descripcion: exp.descripcion || "" });
    setEditingId(exp.id);
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("¿Está seguro de que desea eliminar este expediente?")) return;
    try {
      await api.delete(`/expedientes/${id}`);
      toast.success("Expediente eliminado correctamente");
      await fetchExpedientes();
    } catch (error: any) {
      toast.error("Error al eliminar el expediente");
    }
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPagination({ pageIndex: 0, pageSize: 10 });
  };

  const fetchDocumentos = async (expedienteId: number) => {
    try {
      const response = await api.get(`/expedientes/${expedienteId}/documentos`);
      setDocumentos(response.data.documentos || response.data || []);
    } catch (error) {
      console.error("Error fetching documentos:", error);
      toast.error("Error al cargar documentos");
    }
  };

  const handleOpenDocumentos = (expediente: Expediente) => {
    setCurrentExpediente(expediente);
    setShowDocumentosDialog(true);
    fetchDocumentos(expediente.id);
  };

  const handleCrearDocumento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentExpediente) return;
    try {
      await api.post(`/expedientes/${currentExpediente.id}/documentos`, documentoForm);
      toast.success("Documento creado correctamente");
      setDocumentoForm({ numero_documento: "", asunto: "", tipo_documento: "" });
      setShowCrearDocumentoDialog(false);
      await fetchDocumentos(currentExpediente.id);
    } catch (error: any) {
      toast.error("Error al crear documento");
    }
  };

  const fetchAreas = async () => {
    try {
      const response = await api.get("/areas");
      setAreas(response.data.areas || response.data || []);
    } catch (error) {
      console.error("Error fetching areas:", error);
    }
  };

  const fetchUsuarios = async (areaId?: string) => {
    try {
      const params = areaId ? { id_area: areaId } : {};
      const response = await api.get("/usuarios", { params });
      setUsuarios(response.data.usuarios || response.data || []);
    } catch (error) {
      console.error("Error fetching usuarios:", error);
    }
  };

  const handleOpenAsignar = async (doc: Documento) => {
    setSelectedDocumento(doc);
    setSelectedArea("");
    setSelectedUsuarios([]);
    setPlazoRespuesta(3);
    setObservacion("");
    setShowAsignarDialog(true);
    await fetchAreas();
    await fetchUsuarios();
  };

  const handleAreaChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const areaId = e.target.value;
    setSelectedArea(areaId);
    setSelectedUsuarios([]);
    if (areaId) {
      await fetchUsuarios(areaId);
    } else {
      await fetchUsuarios();
    }
  };

  const handleAsignar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDocumento || selectedUsuarios.length === 0) {
      toast.error("Selecciona al menos un usuario");
      return;
    }
    try {
      for (const usuarioId of selectedUsuarios) {
        await api.post("/asignaciones", {
          id_documento: selectedDocumento.id,
          id_usuario: usuarioId,
          plazo_respuesta: plazoRespuesta,
          observaciones: observacion,
        });
      }
      toast.success("Documento asignado correctamente");
      setShowAsignarDialog(false);
      if (currentExpediente) {
        await fetchDocumentos(currentExpediente.id);
      }
    } catch (error: any) {
      toast.error("Error al asignar documento");
    }
  };

  const fetchAntecedentes = async (expedienteId: number) => {
    try {
      const response = await api.get(`/antecedentes?id_expediente=${expedienteId}`);
      setAntecedentes(response.data || []);
    } catch (error) {
      console.error("Error fetching antecedentes:", error);
    }
  };

  const handleOpenAntecedentes = (expediente: Expediente) => {
    setCurrentExpediente(expediente);
    setShowAntecedentesDialog(true);
    fetchAntecedentes(expediente.id);
  };

  const handleCrearAntecedente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentExpediente) return;
    try {
      await api.post("/antecedentes", { ...antecedenteForm, id_expediente: currentExpediente.id });
      toast.success("Antecedente creado correctamente");
      setAntecedenteForm({ fecha_incidente: new Date().toISOString().split("T")[0], persona_involucrada: "", telefono: "", resumen: "" });
      await fetchAntecedentes(currentExpediente.id);
    } catch (error: any) {
      toast.error("Error al crear antecedente");
    }
  };

  const handleDeleteAntecedente = async (id: number) => {
    if (!window.confirm("¿Está seguro?")) return;
    try {
      await api.delete(`/antecedentes/${id}`);
      toast.success("Antecedente eliminado");
      if (currentExpediente) {
        await fetchAntecedentes(currentExpediente.id);
      }
    } catch (error: any) {
      toast.error("Error al eliminar antecedente");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setSelectedFile(e.target.files[0]);
  };

  const handleImportExcel = async () => {
    if (!selectedFile) {
      toast.error("Selecciona un archivo");
      return;
    }
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        for (const row of jsonData as any[]) {
          await api.post("/expedientes", {
            cut: row["CUT"] || "",
            estupa: row["Estupa"] || "",
            tipo_procedimiento: row["Tipo Procedimiento"] || "",
            asunto: row["Asunto"] || "",
            remitente: row["Remitente"] || "",
            periodo: row["Periodo"] || "",
          });
        }
        toast.success("Expedientes importados correctamente");
        setSelectedFile(null);
        await fetchExpedientes();
      };
      reader.readAsArrayBuffer(selectedFile);
    } catch (error: any) {
      toast.error("Error al importar archivo");
    }
  };

  return (
    <>
      <PageMeta title="Expedientes | Sistema de Seguimiento" description="Gestión de expedientes" />
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Gestión de Expedientes</h1>
          </div>
          <div className="flex items-center gap-2">
            <label className="rounded-lg bg-blue-600 px-4 py-2 text-white cursor-pointer hover:bg-blue-700 inline-flex items-center gap-2">
              <UploadIcon className="h-5 w-5" />
              Seleccionar Archivo
              <input type="file" accept=".xlsx,.xls" onChange={handleFileSelect} className="hidden" />
            </label>
            <button onClick={handleImportExcel} disabled={!selectedFile} className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50">
              Importar
            </button>
            <button onClick={handleOpenModal} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
              <PlusIcon className="h-5 w-5" />
              Agregar Nuevo Expediente
            </button>
          </div>
        </div>

        <div className="rounded-lg bg-white p-4 shadow dark:bg-gray-800">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Input name="cut" value={filters.cut} onChange={handleFilterChange} placeholder="Filtrar por CUT..." />
            <Input name="asunto" value={filters.asunto} onChange={handleFilterChange} placeholder="Filtrar por asunto..." />
            <Input name="filtro" value={filters.filtro} onChange={handleFilterChange} placeholder="Búsqueda general..." />
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg bg-white shadow dark:bg-gray-800">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Item</th>
                <th className="px-4 py-3 text-left font-semibold">CUT</th>
                <th className="px-4 py-3 text-left font-semibold">Asunto</th>
                <th className="px-4 py-3 text-left font-semibold">Remitente</th>
                <th className="px-4 py-3 text-left font-semibold">Documento Origen</th>
                <th className="px-4 py-3 text-center font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center">Cargando...</td></tr>
              ) : expedientes.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No hay expedientes</td></tr>
              ) : (
                expedientes.map((exp, index) => (
                  <tr key={exp.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 text-sm">{pagination.pageIndex * pagination.pageSize + index + 1}</td>
                    <td className="px-4 py-3 font-bold text-sm">{exp.cut}</td>
                    <td className="px-4 py-3 text-sm">{exp.asunto}</td>
                    <td className="px-4 py-3 text-sm">{exp.remitente || "—"}</td>
                    <td className="px-4 py-3 text-sm">{exp.numero_documento || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => handleOpenDocumentos(exp)} title="Documentos" className="rounded bg-green-600 p-2 hover:bg-green-700"><FileIcon className="h-4 w-4 text-white" /></button>
                        <button onClick={() => handleOpenAntecedentes(exp)} title="Antecedentes" className="rounded bg-orange-600 p-2 hover:bg-orange-700"><DocsIcon className="h-4 w-4 text-white" /></button>
                        <button onClick={() => handleEdit(exp)} title="Editar" className="rounded bg-blue-600 p-2 hover:bg-blue-700"><PencilIcon className="h-4 w-4 text-white" /></button>
                        <button onClick={() => handleDelete(exp.id)} title="Eliminar" className="rounded bg-red-600 p-2 hover:bg-red-700"><TrashBinIcon className="h-4 w-4 text-white" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-400">Mostrando {expedientes.length > 0 ? pagination.pageIndex * pagination.pageSize + 1 : 0} a {Math.min((pagination.pageIndex + 1) * pagination.pageSize, totalCount)} de {totalCount}</div>
          <div className="flex gap-2">
            <button onClick={() => setPagination((p) => ({ ...p, pageIndex: Math.max(0, p.pageIndex - 1) }))} disabled={pagination.pageIndex === 0} className="rounded border px-3 py-1 text-sm disabled:opacity-50">Anterior</button>
            <button onClick={() => setPagination((p) => ({ ...p, pageIndex: p.pageIndex + 1 }))} disabled={(pagination.pageIndex + 1) * pagination.pageSize >= totalCount} className="rounded border px-3 py-1 text-sm disabled:opacity-50">Siguiente</button>
          </div>
        </div>

        {showModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-2xl dark:bg-gray-800">
              <h2 className="mb-4 text-xl font-bold">{editingId ? "Editar Expediente" : "Nuevo Expediente"}</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input value={formData.numero_expediente} onChange={(e) => setFormData({ ...formData, numero_expediente: e.target.value })} placeholder="Número de expediente" required />
                <Input value={formData.asunto} onChange={(e) => setFormData({ ...formData, asunto: e.target.value })} placeholder="Asunto" required />
                <textarea value={formData.descripcion} onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })} placeholder="Descripción" rows={3} className="w-full rounded border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-700" />
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">{editingId ? "Actualizar" : "Crear"}</button>
                  <button type="button" onClick={handleCloseModal} className="flex-1 rounded bg-gray-500 px-4 py-2 text-white hover:bg-gray-600">Cancelar</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showDocumentosDialog && currentExpediente && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
            <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-2xl dark:bg-gray-800">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold">Documentos - {currentExpediente.numero_expediente}</h2>
                <button onClick={() => setShowDocumentosDialog(false)} className="text-gray-500"><CloseIcon className="h-6 w-6" /></button>
              </div>
              <button onClick={() => setShowCrearDocumentoDialog(true)} className="mb-4 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"><PlusIcon className="inline h-4 w-4 mr-2" />Crear Documento</button>
              <div className="max-h-96 overflow-y-auto">
                {documentos.length === 0 ? (
                  <p className="text-center text-gray-500">No hay documentos</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead><tr className="border-b bg-gray-50 dark:bg-gray-700"><th className="px-3 py-2 text-left">Número</th><th className="px-3 py-2 text-left">Asunto</th><th className="px-3 py-2 text-center">Acciones</th></tr></thead>
                    <tbody>
                      {documentos.map((doc) => (
                        <tr key={doc.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-3 py-2">{doc.numero_documento}</td>
                          <td className="px-3 py-2">{doc.asunto || "—"}</td>
                          <td className="px-3 py-2 text-center"><button onClick={() => handleOpenAsignar(doc)} className="rounded bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-700">Asignar</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              <button onClick={() => setShowDocumentosDialog(false)} className="mt-4 w-full rounded bg-gray-500 px-4 py-2 text-white hover:bg-gray-600">Cerrar</button>
            </div>
          </div>
        )}

        {showCrearDocumentoDialog && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-2xl dark:bg-gray-800">
              <h2 className="mb-4 text-xl font-bold">Crear Documento</h2>
              <form onSubmit={handleCrearDocumento} className="space-y-4">
                <Input value={documentoForm.numero_documento} onChange={(e) => setDocumentoForm({ ...documentoForm, numero_documento: e.target.value })} placeholder="Número de documento" required />
                <Input value={documentoForm.asunto} onChange={(e) => setDocumentoForm({ ...documentoForm, asunto: e.target.value })} placeholder="Asunto" required />
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">Guardar</button>
                  <button type="button" onClick={() => setShowCrearDocumentoDialog(false)} className="flex-1 rounded bg-gray-500 px-4 py-2 text-white hover:bg-gray-600">Cancelar</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showAsignarDialog && selectedDocumento && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-2xl dark:bg-gray-800">
              <h2 className="mb-4 text-xl font-bold">Asignar Documento</h2>
              <form onSubmit={handleAsignar} className="space-y-4">
                <div><Label>Área</Label><select value={selectedArea} onChange={handleAreaChange} className="w-full rounded border border-gray-300 p-2 dark:bg-gray-700"><option value="">Todos los usuarios</option>{areas.map((area) => (<option key={area.id} value={area.id}>{area.nombre}</option>))}</select></div>
                <div><Label>Usuarios</Label><div className="max-h-40 overflow-y-auto border border-gray-300 rounded p-2 dark:bg-gray-700">{usuarios.map((user) => (<label key={user.id} className="flex items-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-600"><input type="checkbox" checked={selectedUsuarios.includes(user.id)} onChange={(e) => { if (e.target.checked) { setSelectedUsuarios([...selectedUsuarios, user.id]); } else { setSelectedUsuarios(selectedUsuarios.filter((id) => id !== user.id)); } }} />{user.nombre}</label>))}</div></div>
                <Input type="number" value={plazoRespuesta} onChange={(e) => setPlazoRespuesta(parseInt(e.target.value))} placeholder="Plazo (días)" min="1" />
                <textarea value={observacion} onChange={(e) => setObservacion(e.target.value)} placeholder="Observaciones" rows={2} className="w-full rounded border border-gray-300 p-2 dark:bg-gray-700" />
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">Asignar</button>
                  <button type="button" onClick={() => setShowAsignarDialog(false)} className="flex-1 rounded bg-gray-500 px-4 py-2 text-white hover:bg-gray-600">Cancelar</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showAntecedentesDialog && currentExpediente && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
            <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-2xl dark:bg-gray-800">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold">Antecedentes - {currentExpediente.numero_expediente}</h2>
                <button onClick={() => setShowAntecedentesDialog(false)} className="text-gray-500"><CloseIcon className="h-6 w-6" /></button>
              </div>
              <form onSubmit={handleCrearAntecedente} className="mb-6 space-y-3 rounded bg-gray-50 p-4 dark:bg-gray-700">
                <h3 className="font-semibold">Nuevo Antecedente</h3>
                <Input type="date" value={antecedenteForm.fecha_incidente} onChange={(e) => setAntecedenteForm({ ...antecedenteForm, fecha_incidente: e.target.value })} required />
                <Input value={antecedenteForm.persona_involucrada} onChange={(e) => setAntecedenteForm({ ...antecedenteForm, persona_involucrada: e.target.value })} placeholder="Persona involucrada" required />
                <Input value={antecedenteForm.telefono} onChange={(e) => setAntecedenteForm({ ...antecedenteForm, telefono: e.target.value })} placeholder="Teléfono" />
                <textarea value={antecedenteForm.resumen} onChange={(e) => setAntecedenteForm({ ...antecedenteForm, resumen: e.target.value })} placeholder="Resumen" rows={2} className="w-full rounded border border-gray-300 p-2 dark:bg-gray-600" required />
                <button type="submit" className="w-full rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">Agregar Antecedente</button>
              </form>
              <div className="max-h-96 overflow-y-auto space-y-3">
                {antecedentes.length === 0 ? (
                  <p className="text-center text-gray-500">No hay antecedentes</p>
                ) : (
                  antecedentes.map((ante) => (
                    <div key={ante.id} className="rounded border border-gray-300 p-3 dark:border-gray-600">
                      <div className="flex justify-between">
                        <div><p className="font-semibold">{ante.persona_involucrada}</p><p className="text-xs text-gray-600">{formatDate(ante.fecha_incidente)}</p>{ante.telefono && <p className="text-xs text-gray-600">Tel: {ante.telefono}</p>}<p className="mt-1 text-sm">{ante.resumen}</p></div>
                        <button onClick={() => handleDeleteAntecedente(ante.id)} className="text-red-600 hover:text-red-800"><TrashBinIcon className="h-4 w-4" /></button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <button onClick={() => setShowAntecedentesDialog(false)} className="mt-4 w-full rounded bg-gray-500 px-4 py-2 text-white hover:bg-gray-600">Cerrar</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

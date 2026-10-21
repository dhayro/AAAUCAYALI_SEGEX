import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import Input from "@/components/form/input/InputField";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import VisorArchivoModal from "@/components/expedientes/VisorArchivoModal";
import { formatFechaHora } from "@/components/expedientes/format";
import api from "@/utils/api";
import { colorUsuario } from "@/utils/colorUsuario";
import { puedeGestionarAsignaciones, usuarioActualId } from "@/utils/sesion";
import { CloseIcon } from "@/icons";

type Evaluacion = {
  resultado: string;
  observacion?: string | null;
  fecha_evaluacion: string;
  evaluador?: { nombre: string; apellido: string } | null;
};

type Props = {
  asignacion: { id: number; cut: string; id_usuario: number };
  onClose: () => void;
  onCambio?: () => void;
  soloLectura?: boolean;
  ultimaEvaluacion?: Evaluacion | null;
  estadoRespuesta?: string | null;
};

type Archivo = { id: number; descripcion: string; nombre_original: string; mimetype?: string; fecha_subida: string };
type Respuesta = { id: number; texto: string; fecha_creacion: string; id_usuario: number; usuario?: any; archivos: Archivo[] };

const nombre = (u?: { nombre: string; apellido: string } | null) => (u ? `${u.nombre} ${u.apellido}` : "—");
const esPdf = (a: Archivo) => (a.mimetype || "").includes("pdf") || a.nombre_original.toLowerCase().endsWith(".pdf");

export default function RespuestasAsignacionModal({
  asignacion,
  onClose,
  onCambio,
  soloLectura = false,
  ultimaEvaluacion = null,
  estadoRespuesta = null,
}: Props) {
  const gestiona = puedeGestionarAsignaciones();
  const usuarioId = usuarioActualId();
  const puedeEscribir = !soloLectura && (gestiona || asignacion.id_usuario === usuarioId);

  const [respuestas, setRespuestas] = useState<Respuesta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [descripciones, setDescripciones] = useState<Record<number, string>>({});
  const [subiendo, setSubiendo] = useState<number | null>(null);
  const [visor, setVisor] = useState<{ titulo: string; url: string | null; cargando: boolean; error: string } | null>(null);
  const [eliminando, setEliminando] = useState<Archivo | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [estado, setEstado] = useState<string | null>(estadoRespuesta);
  const [enviandoRevision, setEnviandoRevision] = useState(false);
  const [confirmandoEnvio, setConfirmandoEnvio] = useState(false);
  const [editando, setEditando] = useState<{ id: number; descripcion: string } | null>(null);
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [reemplazando, setReemplazando] = useState<number | null>(null);

  const observacionPendiente = ultimaEvaluacion?.resultado === "OBSERVADA" && estado === "OBSERVADA";

  const enviarRevision = async () => {
    setEnviandoRevision(true);
    try {
      const res = await api.post(`/asignaciones-expediente/${asignacion.id}/respuestas/enviar`);
      setEstado(res.data.estado);
      toast.success("Respuesta enviada a evaluación");
      onCambio?.();
    } catch (error: any) {
      toast.error(error.response?.data?.mensaje || "No se pudo enviar a evaluación");
    } finally {
      setEnviandoRevision(false);
      setConfirmandoEnvio(false);
    }
  };

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const res = await api.get(`/asignaciones-expediente/${asignacion.id}/respuestas`);
      setRespuestas(res.data || []);
    } catch {
      toast.error("No se pudieron cargar las respuestas");
    } finally {
      setCargando(false);
    }
  }, [asignacion.id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const registrar = async () => {
    if (!texto.trim()) return toast.error("Escriba la respuesta o avance");
    setEnviando(true);
    try {
      const res = await api.post(`/asignaciones-expediente/${asignacion.id}/respuestas`, { texto });
      setRespuestas(res.data);
      setTexto("");
      toast.success("Respuesta registrada");
      onCambio?.();
    } catch (error: any) {
      toast.error(error.response?.data?.mensaje || "No se pudo registrar la respuesta");
    } finally {
      setEnviando(false);
    }
  };

  const reemplazarEnLista = (actualizada: Respuesta) =>
    setRespuestas((prev) => prev.map((r) => (r.id === actualizada.id ? actualizada : r)));

  const subirArchivos = async (respuesta: Respuesta, archivos: FileList) => {
    const descripcion = (descripciones[respuesta.id] || "").trim();
    if (!descripcion) return toast.error("Describa qué contiene el archivo antes de subirlo");
    setSubiendo(respuesta.id);
    try {
      for (const archivo of Array.from(archivos)) {
        const fd = new FormData();
        fd.append("archivo", archivo);
        fd.append("descripcion", descripcion);
        const res = await api.post(`/asignaciones-expediente/respuestas/${respuesta.id}/archivos`, fd);
        reemplazarEnLista(res.data);
      }
      setDescripciones((prev) => ({ ...prev, [respuesta.id]: "" }));
      toast.success("Archivos subidos");
      onCambio?.();
    } catch (error: any) {
      toast.error(error.response?.data?.mensaje || "No se pudo subir el archivo");
    } finally {
      setSubiendo(null);
    }
  };

  const eliminarArchivo = async () => {
    if (!eliminando) return;
    setProcesando(true);
    try {
      const res = await api.delete(`/asignaciones-expediente/archivos-respuesta/${eliminando.id}`);
      const respuesta = respuestas.find((r) => r.archivos.some((a) => a.id === eliminando.id));
      if (respuesta) reemplazarEnLista({ ...respuesta, archivos: res.data.archivos });
      toast.success("Archivo eliminado");
      setEliminando(null);
      onCambio?.();
    } catch (error: any) {
      toast.error(error.response?.data?.mensaje || "No se pudo eliminar el archivo");
    } finally {
      setProcesando(false);
    }
  };

  const guardarEdicion = async () => {
    if (!editando) return;
    if (!editando.descripcion.trim()) return toast.error("La descripción no puede quedar vacía");
    setGuardandoEdicion(true);
    try {
      const res = await api.patch(`/asignaciones-expediente/archivos-respuesta/${editando.id}`, {
        descripcion: editando.descripcion,
      });
      reemplazarEnLista(res.data);
      setEditando(null);
      toast.success("Descripción actualizada");
    } catch (error: any) {
      toast.error(error.response?.data?.mensaje || "No se pudo actualizar la descripción");
    } finally {
      setGuardandoEdicion(false);
    }
  };

  const reemplazarArchivo = async (archivo: Archivo, nuevo: File) => {
    setReemplazando(archivo.id);
    try {
      const fd = new FormData();
      fd.append("archivo", nuevo);
      const res = await api.put(`/asignaciones-expediente/archivos-respuesta/${archivo.id}/archivo`, fd);
      reemplazarEnLista(res.data);
      toast.success("Archivo reemplazado");
      onCambio?.();
    } catch (error: any) {
      toast.error(error.response?.data?.mensaje || "No se pudo reemplazar el archivo");
    } finally {
      setReemplazando(null);
    }
  };

  const descargar = async (archivo: Archivo) => {
    try {
      const res = await api.get(`/asignaciones-expediente/archivos-respuesta/${archivo.id}/descargar`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = archivo.nombre_original;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("No se pudo descargar el archivo");
    }
  };

  const verArchivo = async (archivo: Archivo) => {
    if (!esPdf(archivo)) return descargar(archivo);
    setVisor({ titulo: archivo.descripcion, url: null, cargando: true, error: "" });
    try {
      const res = await api.get(`/asignaciones-expediente/archivos-respuesta/${archivo.id}/descargar`, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      setVisor((prev) => (prev ? { ...prev, url, cargando: false } : prev));
    } catch {
      setVisor((prev) => (prev ? { ...prev, cargando: false, error: "No se pudo abrir el archivo" } : prev));
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-gray-900/50 p-4">
        <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-gray-800">
          <div className="flex items-center gap-3 bg-brand-600 px-5 py-3 text-white">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-white/70">Respuestas</span>
            <h2 className="text-lg font-bold">{asignacion.cut}</h2>
            <span className="text-xs text-white/70">{respuestas.length} registradas</span>
            <button onClick={onClose} className="ml-auto rounded-full p-1 text-white/80 hover:bg-white/20 hover:text-white">
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4 overflow-y-auto bg-gray-50 p-4 dark:bg-gray-900/40">
            {observacionPendiente && ultimaEvaluacion && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-900/30">
                <div className="text-xs font-semibold uppercase text-amber-800 dark:text-amber-200">
                  Observada por {nombre(ultimaEvaluacion.evaluador)} · {formatFechaHora(ultimaEvaluacion.fecha_evaluacion)}
                </div>
                <div className="mt-1 whitespace-pre-wrap break-words text-sm text-amber-900 dark:text-amber-100">
                  {ultimaEvaluacion.observacion || "Sin detalle"}
                </div>
                <div className="mt-2 text-xs text-amber-800 dark:text-amber-200">
                  Responda abajo y suba los archivos que falten. Cuando termine, pulse el botón para enviarla a evaluación.
                </div>
                {puedeEscribir && (
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={() => setConfirmandoEnvio(true)}
                      disabled={enviandoRevision}
                      className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
                    >
                      {enviandoRevision ? "Enviando..." : "Ya respondí, enviar a evaluación"}
                    </button>
                  </div>
                )}
              </div>
            )}
            {puedeEscribir && (
              <div className="space-y-2 rounded-xl bg-white p-4 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">
                <textarea
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  rows={3}
                  placeholder="Escriba el avance o la respuesta sobre esta asignación"
                  className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700"
                />
                <div className="flex justify-end">
                  <button
                    onClick={registrar}
                    disabled={enviando}
                    className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
                  >
                    {enviando ? "Registrando..." : "Registrar respuesta"}
                  </button>
                </div>
              </div>
            )}

            {cargando && <div className="p-10 text-center text-sm text-gray-500">Cargando respuestas...</div>}
            {!cargando && respuestas.length === 0 && (
              <div className="p-10 text-center text-sm text-gray-500">Aún no hay respuestas registradas.</div>
            )}

            <ol className="space-y-4">
              {respuestas.map((r) => (
                <li
                  key={r.id}
                  className={`space-y-3 rounded-xl border-l-4 bg-white p-4 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700 ${colorUsuario(r.id_usuario).borde}`}
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className={`rounded-full px-2.5 py-0.5 font-semibold ${colorUsuario(r.id_usuario).etiqueta}`}>
                      {nombre(r.usuario)}
                    </span>
                    <span className="text-gray-500">{formatFechaHora(r.fecha_creacion)}</span>
                  </div>
                  <div className="whitespace-pre-wrap break-words text-sm text-gray-900 dark:text-white">{r.texto}</div>

                  {r.archivos.length > 0 && (
                    <div className="space-y-2">
                      {r.archivos.map((a) => (
                        <div key={a.id} className="flex flex-wrap items-center gap-3 rounded-lg bg-gray-50 p-2 dark:bg-gray-700/50">
                          <div className="min-w-0 flex-1">
                            {editando?.id === a.id ? (
                              <div className="flex gap-2">
                                <Input
                                  value={editando.descripcion}
                                  onChange={(e) => setEditando({ id: a.id, descripcion: e.target.value })}
                                />
                                <button
                                  onClick={guardarEdicion}
                                  disabled={guardandoEdicion}
                                  className="rounded bg-brand-500 px-3 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
                                >
                                  Guardar
                                </button>
                                <button
                                  onClick={() => setEditando(null)}
                                  className="rounded border border-gray-300 px-3 text-xs text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300"
                                >
                                  Cancelar
                                </button>
                              </div>
                            ) : (
                              <>
                                <div className="truncate text-sm font-semibold">{a.descripcion}</div>
                                <div className="truncate text-xs text-gray-500">
                                  {a.nombre_original} · Subido {formatFechaHora(a.fecha_subida)}
                                </div>
                              </>
                            )}
                          </div>
                          <button
                            onClick={() => verArchivo(a)}
                            className="rounded border border-brand-600 px-2 py-0.5 text-xs font-semibold text-brand-600 hover:bg-brand-50 dark:border-brand-400 dark:text-brand-400"
                          >
                            {esPdf(a) ? "Ver" : "Descargar"}
                          </button>
                          {puedeEscribir && (
                            <>
                              <button
                                onClick={() => setEditando({ id: a.id, descripcion: a.descripcion })}
                                className="rounded border border-gray-400 px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-100 dark:border-gray-500 dark:text-gray-300 dark:hover:bg-gray-600"
                              >
                                Editar
                              </button>
                              <label
                                className={`cursor-pointer rounded border border-gray-400 px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-100 dark:border-gray-500 dark:text-gray-300 dark:hover:bg-gray-600 ${
                                  reemplazando === a.id ? "pointer-events-none opacity-50" : ""
                                }`}
                              >
                                {reemplazando === a.id ? "Reemplazando..." : "Reemplazar"}
                                <input
                                  type="file"
                                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                                  className="hidden"
                                  onChange={(e) => {
                                    const nuevo = e.target.files?.[0];
                                    if (nuevo) reemplazarArchivo(a, nuevo);
                                    e.target.value = "";
                                  }}
                                />
                              </label>
                              <button
                                onClick={() => setEliminando(a)}
                                className="rounded border border-red-300 px-2 py-0.5 text-xs text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400"
                              >
                                Eliminar
                              </button>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {puedeEscribir && (
                    <div className="flex flex-wrap items-end gap-3 border-t pt-3 dark:border-gray-700">
                      <div className="min-w-[14rem] flex-1">
                        <Input
                          value={descripciones[r.id] || ""}
                          onChange={(e) => setDescripciones((prev) => ({ ...prev, [r.id]: e.target.value }))}
                          placeholder="Qué contiene el archivo (obligatorio)"
                        />
                      </div>
                      <label
                        className={`inline-flex cursor-pointer items-center rounded border border-dashed border-gray-400 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700 ${
                          subiendo === r.id ? "pointer-events-none opacity-50" : ""
                        }`}
                      >
                        {subiendo === r.id ? "Subiendo..." : "Subir archivos"}
                        <input
                          type="file"
                          multiple
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files?.length) subirArchivos(r, e.target.files);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      <ConfirmDialog
        abierto={eliminando !== null}
        titulo="Eliminar archivo"
        mensaje={
          <>
            Se eliminará <strong>{eliminando?.descripcion}</strong>. No se puede deshacer.
          </>
        }
        textoConfirmar="Sí, eliminar"
        peligro
        procesando={procesando}
        onConfirmar={eliminarArchivo}
        onCancelar={() => setEliminando(null)}
      />

      {visor && (
        <VisorArchivoModal
          titulo={visor.titulo}
          url={visor.url}
          cargando={visor.cargando}
          error={visor.error}
          onClose={() => {
            if (visor.url) URL.revokeObjectURL(visor.url);
            setVisor(null);
          }}
        />
      )}
      <ConfirmDialog
        abierto={confirmandoEnvio}
        titulo="Enviar respuesta a evaluación"
        mensaje="¿Ya terminó de subir su respuesta? Una vez enviada, el gestor la revisará para volver a evaluarla."
        textoConfirmar="Sí, enviar"
        procesando={enviandoRevision}
        onConfirmar={enviarRevision}
        onCancelar={() => setConfirmandoEnvio(false)}
      />
    </>
  );
}

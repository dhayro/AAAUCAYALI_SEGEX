import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import SearchableSelect from "@/components/form/SearchableSelect";
import Input from "@/components/form/input/InputField";
import VisorArchivoModal from "@/components/expedientes/VisorArchivoModal";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { formatFecha, formatFechaHora } from "@/components/expedientes/format";
import api from "@/utils/api";
import { puedeGestionarAsignaciones, usuarioActualId } from "@/utils/sesion";
import { CloseIcon } from "@/icons";
import { BadgePlazo, EditorPlazo } from "@/components/atencion/EditorPlazo";
import { colorUsuario } from "@/utils/colorUsuario";

type Props = {
  llamadaId: number;
  onClose: () => void;
  onCambio: () => void;
  soloLectura?: boolean;
};

const nombre = (u?: { nombre: string; apellido: string } | null) => (u ? `${u.nombre} ${u.apellido}` : "—");

const TIPO_ANTECEDENTE: Record<string, string> = {
  REGISTRO: "Registro",
  EDICION: "Edición",
  PLAZO_CAMBIADO: "Plazo de respuesta cambiado",
  RESPONDIDO: "Respondida",
  NO_RESPONDIDO: "No respondida",
  REASIGNACION: "Reasignación",
  ACCION_AGREGADA: "Acción agregada",
  ACCION_EJECUTADA: "Acción ejecutada",
  ACCION_PENDIENTE: "Acción pendiente",
  OBSERVACION: "Observación",
  ARCHIVO_SUBIDO: "Archivo subido",
  ARCHIVO_ELIMINADO: "Archivo eliminado",
  ARCHIVO_EDITADO: "Descripción de archivo editada",
};

const esPdf = (archivo: any) => (archivo.mimetype || "").includes("pdf") || archivo.nombre_original?.toLowerCase().endsWith(".pdf");

export default function DetalleLlamadaModal({ llamadaId, onClose, onCambio, soloLectura = false }: Props) {
  // En solo lectura no se muestra ningún control que cambie la llamada.
  const gestiona = !soloLectura && puedeGestionarAsignaciones();
  const usuarioId = usuarioActualId();
  const [llamada, setLlamada] = useState<any>(null);
  const [cargando, setCargando] = useState(true);
  const [catalogo, setCatalogo] = useState<any[]>([]);
  const [opcionesAcciones, setOpcionesAcciones] = useState<{ id: number; nombre: string }[]>([]);

  const buscarAcciones = async (termino: string) => {
    const texto = termino.trim().toUpperCase();
    setOpcionesAcciones(
      catalogo.filter((c) => c.nombre.includes(texto)).slice(0, 10).map((c) => ({ id: c.id, nombre: c.nombre }))
    );
  };
  const [nuevaAccion, setNuevaAccion] = useState({ id_accion: "", observacion: "" });
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [nuevoResponsable, setNuevoResponsable] = useState("");
  const [subiendo, setSubiendo] = useState<number | null>(null);
  const [descripciones, setDescripciones] = useState<Record<number, string>>({});
  const [visor, setVisor] = useState<{ titulo: string; url: string | null; cargando: boolean; error: string } | null>(null);
  const [confirmar, setConfirmar] = useState<{
    titulo: string;
    mensaje: React.ReactNode;
    textoConfirmar: string;
    peligro: boolean;
    accion: () => Promise<unknown>;
  } | null>(null);
  const [procesandoConfirmar, setProcesandoConfirmar] = useState(false);
  const [verAntecedentes, setVerAntecedentes] = useState(false);
  const [editandoArchivo, setEditandoArchivo] = useState<{ id: number; valor: string } | null>(null);

  const ejecutarConfirmacion = async () => {
    if (!confirmar) return;
    setProcesandoConfirmar(true);
    try {
      await confirmar.accion();
    } finally {
      setProcesandoConfirmar(false);
      setConfirmar(null);
    }
  };

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const res = await api.get(`/atenciones/llamadas/${llamadaId}`);
      setLlamada(res.data);
    } catch {
      toast.error("No se pudo cargar la llamada");
    } finally {
      setCargando(false);
    }
  }, [llamadaId]);

  useEffect(() => {
    cargar();
    api.get("/atenciones/acciones", { params: { solo_activas: "true" } }).then((r) => {
      setCatalogo(r.data);
      setOpcionesAcciones(r.data.slice(0, 10));
    });
    if (gestiona) buscarUsuarios();
  }, [cargar, gestiona]);

  const buscarUsuarios = async (filtro = "") => {
    const params: any = { limit: 10 };
    if (filtro) params.filtro = filtro;
    const res = await api.get("/usuarios/select", { params });
    setUsuarios(res.data || []);
  };

  const puedeOperar = !soloLectura && llamada && (gestiona || llamada.id_responsable === usuarioId);

  const notificar = async (fn: () => Promise<any>, ok: string): Promise<boolean> => {
    try {
      const res = await fn();
      setLlamada(res.data);
      toast.success(ok);
      onCambio();
      return true;
    } catch (error: any) {
      toast.error(error.response?.data?.mensaje || "No se pudo completar la acción");
      return false;
    }
  };

  const cambiarEstado = (accion: any) => {
    const ejecutar = accion.estado !== "EJECUTADO";
    setConfirmar({
      titulo: ejecutar ? "Marcar como ejecutada" : "Marcar como pendiente",
      mensaje: (
        <>
          La acción <strong>{accion.accion?.nombre}</strong> quedará {ejecutar ? "ejecutada" : "pendiente"}. Se
          registrará en el antecedente.
        </>
      ),
      textoConfirmar: ejecutar ? "Sí, ejecutada" : "Sí, pendiente",
      peligro: false,
      accion: () =>
        notificar(
          () => api.patch(`/atenciones/acciones-llamada/${accion.id}`, { estado: ejecutar ? "EJECUTADO" : "PENDIENTE" }),
          ejecutar ? "Acción marcada como ejecutada" : "Acción marcada como pendiente"
        ),
    });
  };

  const cambiarRespondido = () => {
    const respondido = !llamada.respondido;
    setConfirmar({
      titulo: respondido ? "Marcar como respondida" : "Marcar como no respondida",
      mensaje: respondido
        ? "Confirme que ya se dio respuesta al administrado."
        : "Confirme que el administrado todavía no ha recibido respuesta.",
      textoConfirmar: "Sí, confirmar",
      peligro: false,
      accion: () =>
        notificar(
          () => api.put(`/atenciones/llamadas/${llamadaId}`, { respondido }),
          respondido ? "Marcada como respondida" : "Marcada como no respondida"
        ),
    });
  };

  const reasignar = () => {
    if (!nuevoResponsable) return toast.error("Seleccione el usuario que atenderá");
    const elegido = usuarios.find((u) => String(u.id) === nuevoResponsable);
    setConfirmar({
      titulo: "Reasignar llamada",
      mensaje: (
        <>
          La llamada pasará a <strong>{elegido?.nombre ?? "el usuario seleccionado"}</strong>. Quien atiende cambiará
          desde ahora.
        </>
      ),
      textoConfirmar: "Sí, reasignar",
      peligro: false,
      accion: () =>
        notificar(
          () => api.patch(`/atenciones/llamadas/${llamadaId}/responsable`, { id_responsable: Number(nuevoResponsable) }),
          "Responsable actualizado"
        ),
    });
  };

  const guardarDescripcion = async (archivo: any) => {
    const valor = editandoArchivo?.valor.trim() ?? "";
    if (!valor) return toast.error("La descripción no puede quedar vacía");
    const ok = await notificar(
      () => api.patch(`/atenciones/archivos/${archivo.id}`, { descripcion: valor }),
      "Descripción actualizada"
    );
    if (ok) setEditandoArchivo(null);
  };

  const subirArchivos = async (accion: any, archivos: FileList) => {
    const descripcion = (descripciones[accion.id] || "").trim();
    if (!descripcion) {
      toast.error("Escriba qué contiene el archivo antes de subirlo");
      return;
    }
    setSubiendo(accion.id);
    try {
      for (const archivo of Array.from(archivos)) {
        const fd = new FormData();
        fd.append("archivo", archivo);
        fd.append("descripcion", descripcion);
        const res = await api.post(`/atenciones/acciones-llamada/${accion.id}/archivos`, fd);
        setLlamada(res.data);
      }
      toast.success(archivos.length > 1 ? "Archivos subidos" : "Archivo subido");
      setDescripciones((prev) => ({ ...prev, [accion.id]: "" }));
      onCambio();
    } catch (error: any) {
      toast.error(error.response?.data?.mensaje || "No se pudo subir el archivo");
    } finally {
      setSubiendo(null);
    }
  };

  const pedirReemplazo = (accion: any, viejo: any, archivo: File) => {
    setConfirmar({
      titulo: "Reemplazar archivo",
      mensaje: (
        <>
          <div>
            Se quitará <strong>{viejo.descripcion || viejo.nombre_original}</strong> y se subirá{" "}
            <strong>{archivo.name}</strong> con la misma descripción.
          </div>
        </>
      ),
      textoConfirmar: "Sí, reemplazar",
      peligro: false,
      accion: () => reemplazarArchivo(accion, viejo, archivo),
    });
  };

  const reemplazarArchivo = async (accion: any, viejo: any, archivo: File) => {
    setSubiendo(accion.id);
    try {
      const fd = new FormData();
      fd.append("archivo", archivo);
      fd.append("descripcion", viejo.descripcion || archivo.name);
      await api.post(`/atenciones/acciones-llamada/${accion.id}/archivos`, fd);
      const res = await api.delete(`/atenciones/archivos/${viejo.id}`);
      setLlamada(res.data);
      toast.success("Archivo reemplazado");
      onCambio();
    } catch (error: any) {
      toast.error(error.response?.data?.mensaje || "No se pudo reemplazar el archivo");
    } finally {
      setSubiendo(null);
    }
  };

  const eliminarArchivo = (archivo: any) => {
    setConfirmar({
      titulo: "Eliminar archivo",
      mensaje: (
        <>
          Se eliminará <strong>{archivo.descripcion || archivo.nombre_original}</strong>. No se puede deshacer, pero
          queda registrado en el antecedente.
        </>
      ),
      textoConfirmar: "Sí, eliminar",
      peligro: true,
      accion: () => notificar(() => api.delete(`/atenciones/archivos/${archivo.id}`), "Archivo eliminado"),
    });
  };

  const verArchivo = async (archivo: any) => {
    if (!esPdf(archivo)) {
      await descargar(archivo);
      return;
    }
    setVisor({ titulo: archivo.descripcion || archivo.nombre_original, url: null, cargando: true, error: "" });
    try {
      const res = await api.get(`/atenciones/archivos/${archivo.id}/descargar`, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      setVisor((prev) => (prev ? { ...prev, url, cargando: false } : prev));
    } catch {
      setVisor((prev) => (prev ? { ...prev, cargando: false, error: "No se pudo abrir el archivo" } : prev));
    }
  };

  const descargar = async (archivo: any) => {
    try {
      const res = await api.get(`/atenciones/archivos/${archivo.id}/descargar`, { responseType: "blob" });
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

  const agregarAccion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaAccion.id_accion) return toast.error("Seleccione una acción");
    const ok = await notificar(
      () => api.post(`/atenciones/llamadas/${llamadaId}/acciones`, nuevaAccion),
      "Acción agregada"
    );
    if (ok) setNuevaAccion({ id_accion: "", observacion: "" });
  };

  return (
    <>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-900/50 p-4">
        <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-gray-800">
          <div className="flex items-center gap-3 bg-brand-600 px-5 py-3 text-white">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-white/70">Llamada</span>
            <h2 className="text-lg font-bold">{llamada?.cut || "…"}</h2>
            <button onClick={onClose} className="ml-auto rounded-full p-1 text-white/80 hover:bg-white/20 hover:text-white">
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4 overflow-y-auto bg-gray-50 p-4 dark:bg-gray-900/40">
            {cargando && <div className="p-10 text-center text-sm text-gray-500">Cargando...</div>}

            {!cargando && llamada && (
              <>
                <section className="grid grid-cols-2 gap-3 rounded-xl bg-white p-4 text-sm ring-1 ring-gray-200 md:grid-cols-3 dark:bg-gray-800 dark:ring-gray-700">
                  <div>
                    <div className="text-xs text-gray-500">Fecha y hora</div>
                    <div className="font-semibold">{formatFechaHora(llamada.fecha_llamada)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Quien llama</div>
                    <div className="font-semibold">{llamada.nombre_llamante}</div>
                    <div className="text-xs text-gray-500">{llamada.telefono || "Sin teléfono"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Plazo de respuesta</div>
                    <div className="font-semibold">{formatFecha(llamada.fecha_respuesta)}</div>
                    <div className="mt-1">
                      <BadgePlazo respondido={llamada.respondido} fechaLimite={llamada.fecha_respuesta} />
                    </div>
                    <UltimoCambioPlazo antecedentes={llamada.antecedentes || []} />
                    {!soloLectura && (
                      <EditorPlazo
                        llamadaId={llamadaId}
                        fechaLlamada={llamada.fecha_llamada}
                        respondido={llamada.respondido}
                        onGuardado={cargar}
                      />
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <div className="text-xs text-gray-500">Motivo</div>
                    <div className="whitespace-pre-wrap">{llamada.motivo}</div>
                  </div>
                  {(llamada.otras_del_cut || []).length > 0 && (
                    <div className="md:col-span-3">
                      <div className="text-xs text-gray-500">
                        Otras llamadas de este CUT ({llamada.otras_del_cut.length})
                      </div>
                      <ul className="mt-1 space-y-1">
                        {llamada.otras_del_cut.map((o: any) => (
                          <li key={o.id} className="rounded-lg bg-amber-50 p-2 text-sm dark:bg-amber-900/30">
                            <span className="font-semibold">{formatFechaHora(o.fecha_llamada)}</span> ·{" "}
                            {o.respondido ? "Respondida" : "Sin respuesta"} · {nombre(o.responsable)} — {o.motivo}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div>
                    <div className="text-xs text-gray-500">Atiende</div>
                    <div className="font-semibold">{nombre(llamada.responsable)}</div>
                    <div className="text-xs text-gray-500">Registró: {nombre(llamada.creador)}</div>
                  </div>
                  <div className="flex items-center gap-3 md:col-span-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        llamada.respondido
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                          : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
                      }`}
                    >
                      {llamada.respondido ? "RESPONDIDO" : "NO RESPONDIDO"}
                    </span>
                    {puedeOperar && (
                      <div className="flex flex-col">
                        <button
                          onClick={cambiarRespondido}
                          disabled={!llamada.respondido && (llamada.acciones || []).length === 0}
                          className="text-xs text-brand-600 underline disabled:text-gray-400 disabled:no-underline dark:text-brand-400"
                        >
                          {llamada.respondido ? "Marcar como no respondida" : "Marcar como respondida"}
                        </button>
                        {!llamada.respondido && (llamada.acciones || []).length === 0 && (
                          <span className="text-xs text-gray-500">Registre al menos una acción para poder marcarla</span>
                        )}
                      </div>
                    )}
                  </div>
                </section>

                <section className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                    Acciones ({llamada.acciones?.length || 0})
                  </h3>
                  {(llamada.acciones || []).length === 0 && (
                    <div className="rounded-xl bg-white p-4 text-sm text-gray-500 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">
                      Esta llamada no tiene acciones; no requiere trabajo adicional.
                    </div>
                  )}
                  {(llamada.acciones || []).map((accion: any) => (
                    <div key={accion.id} className="space-y-3 rounded-xl bg-white p-4 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="font-semibold">{accion.accion?.nombre}</span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            accion.estado === "EJECUTADO"
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100"
                          }`}
                        >
                          {accion.estado === "EJECUTADO" ? "EJECUTADO" : "PENDIENTE"}
                        </span>
                        {accion.accion?.requiere_archivo && (
                          <span className="rounded bg-amber-50 px-1.5 text-[10px] font-bold text-amber-800">REQUIERE ARCHIVO</span>
                        )}
                        {accion.estado === "EJECUTADO" && !gestiona && (
                          <span className="ml-auto text-xs text-gray-500">Ejecutada · no admite cambios</span>
                        )}
                        {gestiona && (
                          <button
                            onClick={() => cambiarEstado(accion)}
                            className="ml-auto rounded border border-brand-600 px-2 py-0.5 text-xs font-semibold text-brand-600 hover:bg-brand-50 dark:border-brand-400 dark:text-brand-400"
                          >
                            {accion.estado === "EJECUTADO" ? "Marcar pendiente" : "Marcar ejecutada"}
                          </button>
                        )}
                      </div>
                      {accion.observacion && <div className="text-sm text-gray-600 dark:text-gray-300">{accion.observacion}</div>}

                      <div className="space-y-2">
                        {(accion.archivos || []).length === 0 && (
                          <div className="text-xs text-gray-500">Sin archivos de avance.</div>
                        )}
                        {(accion.archivos || []).map((archivo: any) => (
                          <div key={archivo.id} className="flex flex-wrap items-center gap-3 rounded-lg bg-gray-50 p-2 dark:bg-gray-700/50">
                            <div className="min-w-0 flex-1">
                              {editandoArchivo && editandoArchivo.id === archivo.id ? (
                                <div className="flex items-center gap-2">
                                  <Input
                                    value={editandoArchivo.valor}
                                    onChange={(e) => setEditandoArchivo({ id: archivo.id, valor: e.target.value })}
                                  />
                                  <button
                                    onClick={() => guardarDescripcion(archivo)}
                                    className="rounded bg-brand-500 px-2 py-1 text-xs font-semibold text-white hover:bg-brand-600"
                                  >
                                    Guardar
                                  </button>
                                  <button
                                    onClick={() => setEditandoArchivo(null)}
                                    className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 dark:border-gray-600 dark:text-gray-300"
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <div className="truncate text-sm font-semibold">{archivo.descripcion || archivo.nombre_original}</div>
                                  <div className="truncate text-xs text-gray-500">
                                    {archivo.nombre_original} · Subido {formatFechaHora(archivo.fecha_subida)}
                                  </div>
                                </>
                              )}
                            </div>
                            <button
                              onClick={() => verArchivo(archivo)}
                              className="rounded border border-brand-600 px-2 py-0.5 text-xs font-semibold text-brand-600 hover:bg-brand-50 dark:border-brand-400 dark:text-brand-400"
                            >
                              {esPdf(archivo) ? "Ver" : "Descargar"}
                            </button>
                            {puedeOperar && accion.estado !== "EJECUTADO" && (
                              <>
                                <button
                                  onClick={() => setEditandoArchivo({ id: archivo.id, valor: archivo.descripcion || "" })}
                                  className="rounded border border-gray-300 px-2 py-0.5 text-xs text-gray-600 hover:bg-white dark:border-gray-600 dark:text-gray-300"
                                >
                                  Editar
                                </button>
                                <label className="cursor-pointer rounded border border-gray-300 px-2 py-0.5 text-xs text-gray-600 hover:bg-white dark:border-gray-600 dark:text-gray-300">
                                  Reemplazar
                                  <input
                                    type="file"
                                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                                    className="hidden"
                                    disabled={subiendo === accion.id}
                                    onChange={(e) => {
                                      const archivoNuevo = e.target.files?.[0];
                                      if (archivoNuevo) pedirReemplazo(accion, archivo, archivoNuevo);
                                      e.target.value = "";
                                    }}
                                  />
                                </label>
                                <button
                                  onClick={() => eliminarArchivo(archivo)}
                                  className="rounded border border-red-300 px-2 py-0.5 text-xs text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400"
                                >
                                  Eliminar
                                </button>
                              </>
                            )}
                          </div>
                        ))}
                      </div>

                      {puedeOperar && accion.estado !== "EJECUTADO" && (
                        <div className="flex flex-wrap items-end gap-3 border-t pt-3 dark:border-gray-700">
                          <div className="min-w-[14rem] flex-1">
                            <Input
                              value={descripciones[accion.id] || ""}
                              onChange={(e) => setDescripciones((prev) => ({ ...prev, [accion.id]: e.target.value }))}
                              placeholder="Qué contiene el archivo (obligatorio)"
                            />
                          </div>
                          <label
                            className={`inline-flex cursor-pointer items-center rounded border border-dashed border-gray-400 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700 ${
                              subiendo === accion.id ? "pointer-events-none opacity-50" : ""
                            }`}
                          >
                            {subiendo === accion.id ? "Subiendo..." : "Subir archivos"}
                            <input
                              type="file"
                              multiple
                              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files?.length) subirArchivos(accion, e.target.files);
                                e.target.value = "";
                              }}
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  ))}

                  {puedeOperar && (
                    <form onSubmit={agregarAccion} className="flex flex-wrap items-center gap-2 rounded-xl bg-white p-3 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">
                      <div className="min-w-[16rem] flex-1">
                        <SearchableSelect
                          value={nuevaAccion.id_accion ? Number(nuevaAccion.id_accion) : ""}
                          onChange={(value) => setNuevaAccion({ ...nuevaAccion, id_accion: String(value) })}
                          options={opcionesAcciones}
                          onSearch={buscarAcciones}
                          placeholder="Buscar acción..."
                        />
                      </div>
                      <input
                        value={nuevaAccion.observacion}
                        onChange={(e) => setNuevaAccion({ ...nuevaAccion, observacion: e.target.value })}
                        placeholder="Observación"
                        className="min-w-[10rem] flex-1 rounded border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700"
                      />
                      <button type="submit" className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700">
                        Agregar
                      </button>
                    </form>
                  )}
                </section>

                {gestiona && (
                  <section className="flex flex-wrap items-end gap-3 rounded-xl bg-white p-4 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">
                    <div className="min-w-[16rem] flex-1">
                      <div className="mb-1 text-xs font-semibold uppercase text-gray-500">Reasignar a</div>
                      <SearchableSelect
                        value={nuevoResponsable ? Number(nuevoResponsable) : ""}
                        onChange={(value) => setNuevoResponsable(String(value))}
                        options={usuarios.map((u) => ({ id: u.id, nombre: u.cargo ? `${u.nombre} (${u.cargo})` : u.nombre }))}
                        onSearch={buscarUsuarios}
                        placeholder="Seleccione el usuario que atenderá"
                      />
                    </div>
                    <button onClick={reasignar} className="rounded bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700">
                      Reasignar
                    </button>
                  </section>
                )}

                <section className="flex items-center justify-between rounded-xl bg-white p-4 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                    Antecedentes ({llamada.antecedentes?.length || 0})
                  </h3>
                  <button
                    onClick={() => setVerAntecedentes(true)}
                    className="rounded border border-brand-600 px-3 py-1 text-xs font-semibold text-brand-600 hover:bg-brand-50 dark:border-brand-400 dark:text-brand-400 dark:hover:bg-gray-700"
                  >
                    Ver línea de tiempo
                  </button>
                </section>
              </>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        abierto={confirmar !== null}
        titulo={confirmar?.titulo ?? ""}
        mensaje={confirmar?.mensaje ?? ""}
        textoConfirmar={confirmar?.textoConfirmar}
        peligro={confirmar?.peligro}
        procesando={procesandoConfirmar}
        onConfirmar={ejecutarConfirmacion}
        onCancelar={() => setConfirmar(null)}
      />

      {verAntecedentes && (
        <AntecedentesModal
          cut={llamada?.cut || ""}
          antecedentes={llamada?.antecedentes || []}
          onClose={() => setVerAntecedentes(false)}
        />
      )}

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
    </>
  );
}


function UltimoCambioPlazo({ antecedentes }: { antecedentes: any[] }) {
  const ultimo = antecedentes
    .filter((h) => h.tipo === "PLAZO_CAMBIADO")
    .sort((a, b) => String(b.fecha_registro).localeCompare(String(a.fecha_registro)))[0];
  if (!ultimo) return null;
  return (
    <div className="mt-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
      Último cambio: {formatFechaHora(ultimo.fecha_registro)} por {nombre(ultimo.usuario)}
    </div>
  );
}

function AntecedentesModal({ cut, antecedentes, onClose }: { cut: string; antecedentes: any[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-gray-900/50 p-4">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-gray-800">
        <div className="flex items-center gap-3 bg-brand-600 px-5 py-3 text-white">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-white/70">Antecedentes</span>
          <h2 className="text-lg font-bold">{cut}</h2>
          <span className="text-xs text-white/70">{antecedentes.length} eventos</span>
          <button onClick={onClose} className="ml-auto rounded-full p-1 text-white/80 hover:bg-white/20 hover:text-white">
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto p-5">
          {antecedentes.length === 0 && <div className="text-sm text-gray-500">Sin antecedentes registrados.</div>}
          <ol className="space-y-0">
            {antecedentes.map((h) => (
              <li key={h.id} className={`relative border-l-2 pb-5 pl-5 last:pb-0 ${colorUsuario(h.usuario?.id).borde}`}>
                <span className={`absolute -left-[7px] top-1 h-3 w-3 rounded-full ${colorUsuario(h.usuario?.id).etiqueta.split(" ")[0]}`} />
                <div className="text-xs text-gray-500">{formatFechaHora(h.fecha_registro)}</div>
                <div className="mt-0.5 font-semibold text-gray-900 dark:text-white">{TIPO_ANTECEDENTE[h.tipo] || h.tipo}</div>
                <div
                  className={`mt-0.5 whitespace-pre-wrap break-words text-sm ${
                    h.tipo === "PLAZO_CAMBIADO"
                      ? "rounded-lg bg-amber-50 p-2 font-semibold text-amber-900 dark:bg-amber-900/30 dark:text-amber-100"
                      : "text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {h.detalle}
                </div>
                <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${colorUsuario(h.usuario?.id).etiqueta}`}>
                  {nombre(h.usuario)}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

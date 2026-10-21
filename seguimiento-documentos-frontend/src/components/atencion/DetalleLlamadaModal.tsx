import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import SearchableSelect from "@/components/form/SearchableSelect";
import { formatFecha, formatFechaHora } from "@/components/expedientes/format";
import api from "@/utils/api";
import { puedeGestionarAsignaciones, usuarioActualId } from "@/utils/sesion";
import { CloseIcon } from "@/icons";

type Props = {
  llamadaId: number;
  onClose: () => void;
  onCambio: () => void;
};

const nombre = (u?: { nombre: string; apellido: string } | null) => (u ? `${u.nombre} ${u.apellido}` : "—");

const badgeEstado = (estado: string) =>
  estado === "EJECUTADO"
    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
    : "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100";

export default function DetalleLlamadaModal({ llamadaId, onClose, onCambio }: Props) {
  const gestiona = puedeGestionarAsignaciones();
  const usuarioId = usuarioActualId();
  const [llamada, setLlamada] = useState<any>(null);
  const [cargando, setCargando] = useState(true);
  const [catalogo, setCatalogo] = useState<any[]>([]);
  const [nuevaAccion, setNuevaAccion] = useState({ id_accion: "", observacion: "" });
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [nuevoResponsable, setNuevoResponsable] = useState("");
  const [subiendo, setSubiendo] = useState<number | null>(null);

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
    api.get("/atenciones/acciones", { params: { solo_activas: "true" } }).then((r) => setCatalogo(r.data));
    if (gestiona) {
      api.get("/usuarios/select", { params: { limit: 10 } }).then((r) => setUsuarios(r.data || []));
    }
  }, [cargar, gestiona]);

  const puedeOperar = llamada && (gestiona || llamada.id_responsable === usuarioId);

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

  const buscarUsuarios = async (filtro = "") => {
    const params: any = { limit: 10 };
    if (filtro) params.filtro = filtro;
    const res = await api.get("/usuarios/select", { params });
    setUsuarios(res.data || []);
  };

  const cambiarEstado = (accion: any) => {
    const nuevo = accion.estado === "EJECUTADO" ? "PENDIENTE" : "EJECUTADO";
    notificar(
      () => api.patch(`/atenciones/acciones-llamada/${accion.id}`, { estado: nuevo }),
      nuevo === "EJECUTADO" ? "Acción marcada como ejecutada" : "Acción marcada como pendiente"
    );
  };

  const subirArchivo = async (accion: any, archivo: File) => {
    const fd = new FormData();
    fd.append("archivo", archivo);
    setSubiendo(accion.id);
    try {
      const res = await api.post(`/atenciones/acciones-llamada/${accion.id}/archivos`, fd);
      setLlamada(res.data);
      toast.success("Archivo subido");
      onCambio();
    } catch (error: any) {
      toast.error(error.response?.data?.mensaje || "No se pudo subir el archivo");
    } finally {
      setSubiendo(null);
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

  const agregarAccion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaAccion.id_accion) return toast.error("Seleccione una acción");
    notificar(
      () => api.post(`/atenciones/llamadas/${llamadaId}/acciones`, nuevaAccion),
      "Acción agregada"
    ).then((ok) => {
      if (ok) setNuevaAccion({ id_accion: "", observacion: "" });
    });
  };

  const reasignar = () => {
    if (!nuevoResponsable) return toast.error("Seleccione el usuario que atenderá");
    notificar(
      () => api.patch(`/atenciones/llamadas/${llamadaId}/responsable`, { id_responsable: Number(nuevoResponsable) }),
      "Responsable actualizado"
    );
  };

  const cambiarRespondido = () => {
    notificar(
      () => api.put(`/atenciones/llamadas/${llamadaId}`, { respondido: !llamada.respondido }),
      llamada.respondido ? "Marcada como no respondida" : "Marcada como respondida"
    );
  };

  return (
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
                  <div className="text-xs text-gray-500">Fecha de respuesta</div>
                  <div className="font-semibold">{formatFecha(llamada.fecha_respuesta)}</div>
                </div>
                <div className="md:col-span-2">
                  <div className="text-xs text-gray-500">Motivo</div>
                  <div className="whitespace-pre-wrap">{llamada.motivo}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Atiende</div>
                  <div className="font-semibold">{nombre(llamada.responsable)}</div>
                  <div className="text-xs text-gray-500">Registró: {nombre(llamada.creador)}</div>
                </div>
                <div className="md:col-span-3 flex items-center gap-3">
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
                    <button onClick={cambiarRespondido} className="text-xs text-brand-600 underline dark:text-brand-400">
                      {llamada.respondido ? "Marcar como no respondida" : "Marcar como respondida"}
                    </button>
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
                  <div key={accion.id} className="space-y-2 rounded-xl bg-white p-4 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-semibold">{accion.accion?.nombre}</span>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${badgeEstado(accion.estado)}`}>
                        {accion.estado === "EJECUTADO" ? "EJECUTADO" : "PENDIENTE"}
                      </span>
                      {accion.accion?.requiere_archivo && (
                        <span className="rounded bg-amber-50 px-1.5 text-[10px] font-bold text-amber-800">REQUIERE ARCHIVO</span>
                      )}
                      {puedeOperar && (
                        <button
                          onClick={() => cambiarEstado(accion)}
                          className="ml-auto rounded border border-brand-600 px-2 py-0.5 text-xs font-semibold text-brand-600 hover:bg-brand-50 dark:border-brand-400 dark:text-brand-400"
                        >
                          {accion.estado === "EJECUTADO" ? "Marcar pendiente" : "Marcar ejecutada"}
                        </button>
                      )}
                    </div>
                    {accion.observacion && <div className="text-sm text-gray-600 dark:text-gray-300">{accion.observacion}</div>}

                    <div className="space-y-1">
                      {(accion.archivos || []).map((archivo: any) => (
                        <div key={archivo.id} className="flex items-center gap-2 text-sm">
                          <button onClick={() => descargar(archivo)} className="text-brand-600 underline dark:text-brand-400">
                            {archivo.nombre_original}
                          </button>
                          <span className="text-xs text-gray-500">{formatFechaHora(archivo.fecha_subida)}</span>
                        </div>
                      ))}
                    </div>

                    {puedeOperar && (
                      <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-300">
                        <span className="rounded border border-dashed border-gray-400 px-2 py-1 hover:bg-gray-50 dark:hover:bg-gray-700">
                          {subiendo === accion.id ? "Subiendo..." : "Subir archivo de avance"}
                        </span>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                          className="hidden"
                          disabled={subiendo === accion.id}
                          onChange={(e) => {
                            const archivo = e.target.files?.[0];
                            if (archivo) subirArchivo(accion, archivo);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    )}
                  </div>
                ))}

                {puedeOperar && (
                  <form onSubmit={agregarAccion} className="flex flex-wrap items-center gap-2 rounded-xl bg-white p-3 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">
                    <select
                      value={nuevaAccion.id_accion}
                      onChange={(e) => setNuevaAccion({ ...nuevaAccion, id_accion: e.target.value })}
                      className="rounded border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700"
                    >
                      <option value="">Agregar acción...</option>
                      {catalogo.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre}
                        </option>
                      ))}
                    </select>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}

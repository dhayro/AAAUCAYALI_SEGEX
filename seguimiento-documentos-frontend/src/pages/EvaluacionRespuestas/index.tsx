import PageMeta from "@/components/common/PageMeta";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import RespuestasAsignacionModal from "@/components/asignaciones/RespuestasAsignacionModal";
import { formatFecha, formatFechaHora } from "@/components/expedientes/format";
import { CloseIcon, ChatBubbleIcon, ClipboardCheckIcon } from "@/icons";
import BotonAccion from "@/components/common/BotonAccion";
import SearchableSelect from "@/components/form/SearchableSelect";
import api from "@/utils/api";

interface Evaluacion {
  resultado: "APROBADA" | "OBSERVADA";
  observacion?: string | null;
  fecha_evaluacion: string;
  evaluador?: { id: number; nombre: string; apellido: string } | null;
}

interface FilaEvaluable {
  id: number;
  cut: string;
  asignado?: { id: number; nombre: string; apellido: string; Cargo?: { nombre: string } | null } | null;
  fecha_asignacion: string;
  plazo_atencion: number;
  fecha_vencimiento: string;
  total_respuestas: number;
  ultima_respuesta: string | null;
  tiempo_respuesta_horas: number | null;
  estado: "POR_EVALUAR" | "RESPONDIDA" | "OBSERVADA" | "SIN_RESPUESTA" | "CERRADA";
  ultima_evaluacion: Evaluacion | null;
}

const ESTADO: Record<FilaEvaluable["estado"], { texto: string; clases: string }> = {
  POR_EVALUAR: { texto: "Por evaluar", clases: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100" },
  RESPONDIDA: { texto: "Respondida", clases: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-100" },
  OBSERVADA: { texto: "Observada", clases: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100" },
  SIN_RESPUESTA: { texto: "Sin respuesta", clases: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200" },
  CERRADA: { texto: "Cerrada", clases: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" },
};

const nombre = (u?: { nombre: string; apellido: string } | null) => (u ? `${u.nombre} ${u.apellido}` : "—");

const formatoTiempo = (horas: number | null) => {
  if (horas === null) return "—";
  const dias = Math.floor(horas / 24);
  const resto = Math.round(horas - dias * 24);
  return dias > 0 ? `${dias} d ${resto} h` : `${Math.round(horas)} h`;
};

const FILTROS_ESTADO = [
  { value: "", texto: "Todos" },
  { value: "POR_EVALUAR", texto: "Por evaluar" },
  { value: "RESPONDIDA", texto: "Respondidas" },
  { value: "OBSERVADA", texto: "Observadas" },
  { value: "CERRADA", texto: "Cerradas" },
];

const CONTADORES_VACIOS: Record<FilaEvaluable["estado"], number> = {
  POR_EVALUAR: 0,
  RESPONDIDA: 0,
  OBSERVADA: 0,
  CERRADA: 0,
  SIN_RESPUESTA: 0,
};

const CONTADORES: { value: FilaEvaluable["estado"]; texto: string }[] = [
  { value: "POR_EVALUAR", texto: "Por evaluar" },
  { value: "RESPONDIDA", texto: "Respondidas" },
  { value: "OBSERVADA", texto: "Observadas" },
];

export default function EvaluacionRespuestas() {
  const [filas, setFilas] = useState<FilaEvaluable[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroCut, setFiltroCut] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("POR_EVALUAR");
  const [respuestasDe, setRespuestasDe] = useState<FilaEvaluable | null>(null);
  const [evaluando, setEvaluando] = useState<FilaEvaluable | null>(null);
  const [formEvaluacion, setFormEvaluacion] = useState<{ resultado: "APROBADA" | "OBSERVADA" | "REASIGNADA"; observacion: string }>({
    resultado: "APROBADA",
    observacion: "",
  });
  const [reasignacion, setReasignacion] = useState<{ id_usuario: number | ""; dias: string }>({ id_usuario: "", dias: "" });
  const [usuariosReasig, setUsuariosReasig] = useState<{ id: number; nombre: string; cargo?: string | null }[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [contadores, setContadores] = useState<Record<FilaEvaluable["estado"], number>>(CONTADORES_VACIOS);

  const fetchFilas = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/evaluaciones-asignacion", {
        params: { estado: filtroEstado || undefined, cut: filtroCut.trim() || undefined },
      });
      setFilas(res.data.filas || []);
      setContadores(res.data.contadores || CONTADORES_VACIOS);
    } catch {
      toast.error("No se pudieron cargar las respuestas para evaluar");
    } finally {
      setLoading(false);
    }
  }, [filtroEstado, filtroCut]);

  // Espera un momento al escribir el CUT para no pedir al servidor en cada tecla.
  useEffect(() => {
    const espera = setTimeout(fetchFilas, 300);
    return () => clearTimeout(espera);
  }, [fetchFilas]);

  const filasVisibles = filas;

  const buscarUsuariosReasig = useCallback(async (filtro = "") => {
    try {
      const res = await api.get("/usuarios/select", { params: filtro ? { filtro } : {} });
      setUsuariosReasig(Array.isArray(res.data) ? res.data : []);
    } catch {
      setUsuariosReasig([]);
    }
  }, []);

  const abrirEvaluacion = (fila: FilaEvaluable) => {
    setFormEvaluacion({ resultado: "APROBADA", observacion: "" });
    setReasignacion({ id_usuario: "", dias: "" });
    buscarUsuariosReasig();
    setEvaluando(fila);
  };

  const enviarEvaluacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evaluando) return;
    if (formEvaluacion.resultado === "OBSERVADA" && !formEvaluacion.observacion.trim()) {
      toast.error("Describa qué debe corregir o completar la respuesta");
      return;
    }
    if (formEvaluacion.resultado === "REASIGNADA") {
      if (!reasignacion.id_usuario) return toast.error("Elija el usuario al que se reasigna");
      if (!Number(reasignacion.dias) || Number(reasignacion.dias) < 1) return toast.error("Indique los días de plazo del nuevo usuario");
    }
    setEnviando(true);
    try {
      if (formEvaluacion.resultado === "REASIGNADA") {
        await api.post(`/asignaciones-expediente/${evaluando.id}/reasignar`, {
          id_usuario: reasignacion.id_usuario,
          plazo_atencion: Number(reasignacion.dias),
          observacion: formEvaluacion.observacion,
        });
        await fetchFilas();
        toast.success("Asignación reasignada: el nuevo usuario tiene su plazo desde hoy");
      } else {
        await api.post(`/evaluaciones-asignacion/${evaluando.id}`, formEvaluacion);
        await fetchFilas();
        toast.success(
          formEvaluacion.resultado === "APROBADA"
            ? "Asignación cerrada"
            : "Respuesta observada, el usuario deberá responder de nuevo"
        );
      }
      setEvaluando(null);
    } catch (error: any) {
      toast.error(error.response?.data?.mensaje || "No se pudo registrar la evaluación");
    } finally {
      setEnviando(false);
    }
  };

  const selectClass =
    "w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700";

  return (
    <>
      <PageMeta title="Evaluación de Respuestas | Sistema de Seguimiento" description="Evaluación de respuestas de asignaciones" />
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Evaluación de Respuestas</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Revisa las respuestas subidas por cada usuario, aprueba para cerrar la asignación u observa para que responda de nuevo
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {CONTADORES.map((c) => {
            const activo = filtroEstado === c.value;
            const cantidad = contadores[c.value];
            return (
              <button
                key={c.value}
                onClick={() => setFiltroEstado(c.value)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
                  activo
                    ? "bg-brand-600 text-white"
                    : "bg-white text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-600 dark:hover:bg-gray-700"
                }`}
              >
                {c.texto} · {cantidad}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-4 rounded-lg bg-gray-50 p-4 dark:bg-gray-800 md:grid-cols-2">
          <div>
            <Label>Buscar por CUT</Label>
            <Input value={filtroCut} onChange={(e) => setFiltroCut(e.target.value)} placeholder="Ej: 105162-2025" />
          </div>
          <div>
            <Label>Estado</Label>
            <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className={selectClass}>
              {FILTROS_ESTADO.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.texto}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg bg-white shadow dark:bg-gray-800">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-12 text-center text-gray-500">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
                <p className="mt-4">Cargando respuestas...</p>
              </div>
            ) : filasVisibles.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50 dark:bg-gray-700">
                    <th className="px-6 py-4 text-start text-sm font-semibold">CUT</th>
                    <th className="px-6 py-4 text-start text-sm font-semibold">Atiende</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold">Asignación</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold">Vence</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold">Última respuesta</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold">Tiempo de respuesta</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold">Respuestas</th>
                    <th className="px-6 py-4 text-start text-sm font-semibold">Estado</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filasVisibles.map((f) => (
                    <tr key={f.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 font-medium">{f.cut}</td>
                      <td className="px-6 py-4 text-sm">
                        <div>{nombre(f.asignado)}</div>
                        {f.asignado?.Cargo && <div className="text-xs text-gray-500">{f.asignado.Cargo.nombre}</div>}
                      </td>
                      <td className="px-6 py-4 text-center text-sm">{formatFecha(f.fecha_asignacion)}</td>
                      <td className="px-6 py-4 text-center text-sm">{formatFecha(f.fecha_vencimiento)}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-center text-sm">{formatFechaHora(f.ultima_respuesta)}</td>
                      <td className="px-6 py-4 text-center text-sm font-semibold">{formatoTiempo(f.tiempo_respuesta_horas)}</td>
                      <td className="px-6 py-4 text-center text-sm">{f.total_respuestas}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${ESTADO[f.estado].clases}`}>
                          {ESTADO[f.estado].texto}
                        </span>
                        {f.ultima_evaluacion && (
                          <div className="mt-1 text-xs text-gray-500">
                            {f.ultima_evaluacion.resultado === "APROBADA" ? "Aprobada" : "Observada"} por{" "}
                            {nombre(f.ultima_evaluacion.evaluador)} · {formatFechaHora(f.ultima_evaluacion.fecha_evaluacion)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <BotonAccion
                            etiqueta="Respuestas"
                            icono={<ChatBubbleIcon />}
                            tono="primario"
                            onClick={() => setRespuestasDe(f)}
                          />
                          {f.estado !== "CERRADA" && (
                            <BotonAccion
                              etiqueta="Evaluar"
                              icono={<ClipboardCheckIcon />}
                              tono="alerta"
                              onClick={() => abrirEvaluacion(f)}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-12 text-center text-gray-500">No hay respuestas para evaluar con este filtro</div>
            )}
          </div>
        </div>
      </div>

      {respuestasDe && (
        <RespuestasAsignacionModal
          asignacion={{ id: respuestasDe.id, cut: respuestasDe.cut, id_usuario: respuestasDe.asignado?.id ?? 0 }}
          soloLectura
          ultimaEvaluacion={respuestasDe.ultima_evaluacion}
          estadoRespuesta={respuestasDe.estado}
          onCambio={fetchFilas}
          onClose={() => setRespuestasDe(null)}
        />
      )}

      {evaluando && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white shadow-2xl dark:bg-gray-800">
            <div className="flex items-center justify-between border-b p-6 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Evaluar respuesta — {evaluando.cut}</h2>
              <button onClick={() => setEvaluando(null)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400">
                <CloseIcon className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={enviarEvaluacion} className="space-y-4 p-6">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Atiende <strong>{nombre(evaluando.asignado)}</strong>. Última respuesta:{" "}
                <strong>{formatFechaHora(evaluando.ultima_respuesta)}</strong> ({formatoTiempo(evaluando.tiempo_respuesta_horas)} desde la asignación).
              </p>
              <button
                type="button"
                onClick={() => setRespuestasDe(evaluando)}
                className="rounded-lg border border-brand-600 px-3 py-1.5 text-sm font-semibold text-brand-600 hover:bg-brand-50 dark:border-brand-400 dark:text-brand-400"
              >
                Ver respuestas y archivos
              </button>

              <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 dark:border-gray-600">
                <input
                  type="radio"
                  name="resultado"
                  value="APROBADA"
                  checked={formEvaluacion.resultado === "APROBADA"}
                  onChange={() => setFormEvaluacion({ ...formEvaluacion, resultado: "APROBADA" })}
                  className="mt-1"
                />
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">Aprobar y cerrar la asignación</div>
                  <div className="text-xs text-gray-500">La respuesta es correcta. La asignación queda cerrada.</div>
                </div>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 dark:border-gray-600">
                <input
                  type="radio"
                  name="resultado"
                  value="OBSERVADA"
                  checked={formEvaluacion.resultado === "OBSERVADA"}
                  onChange={() => setFormEvaluacion({ ...formEvaluacion, resultado: "OBSERVADA" })}
                  className="mt-1"
                />
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">Observar y devolver</div>
                  <div className="text-xs text-gray-500">Falta algo o no es correcta. El usuario debe responder de nuevo.</div>
                </div>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 dark:border-gray-600">
                <input
                  type="radio"
                  name="resultado"
                  value="REASIGNADA"
                  checked={formEvaluacion.resultado === "REASIGNADA"}
                  onChange={() => setFormEvaluacion({ ...formEvaluacion, resultado: "REASIGNADA" })}
                  className="mt-1"
                />
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">Reasignar a otro usuario</div>
                  <div className="text-xs text-gray-500">
                    El cumplimiento de este usuario queda hasta su última respuesta. La asignación continúa para el nuevo usuario.
                  </div>
                </div>
              </label>

              {formEvaluacion.resultado === "REASIGNADA" && (
                <div className="space-y-3 rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-900/20">
                  <div>
                    <Label>Nuevo usuario *</Label>
                    <SearchableSelect
                      value={reasignacion.id_usuario}
                      onChange={(valor) => setReasignacion({ ...reasignacion, id_usuario: valor === "" ? "" : Number(valor) })}
                      options={usuariosReasig.map((u) => ({ id: u.id, nombre: u.cargo ? `${u.nombre} (${u.cargo})` : u.nombre }))}
                      onSearch={(termino) => buscarUsuariosReasig(termino)}
                      placeholder="Buscar usuario..."
                    />
                  </div>
                  <div>
                    <Label>Días de plazo para el nuevo usuario *</Label>
                    <Input
                      type="number"
                      min={1}
                      value={reasignacion.dias}
                      onChange={(e) => setReasignacion({ ...reasignacion, dias: e.target.value })}
                      placeholder="Ej: 5"
                    />
                  </div>
                </div>
              )}

              <div>
                <Label>
                  {formEvaluacion.resultado === "OBSERVADA" ? "Qué debe corregir o completar *" : "Observación"}
                </Label>
                <textarea
                  value={formEvaluacion.observacion}
                  onChange={(e) => setFormEvaluacion({ ...formEvaluacion, observacion: e.target.value })}
                  rows={3}
                  className="w-full rounded border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-700"
                />
              </div>

              <div className="flex gap-3 border-t pt-4 dark:border-gray-700">
                <button
                  type="submit"
                  disabled={enviando}
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {enviando ? "Guardando..." : formEvaluacion.resultado === "REASIGNADA" ? "Reasignar asignación" : "Guardar evaluación"}
                </button>
                <button
                  type="button"
                  onClick={() => setEvaluando(null)}
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

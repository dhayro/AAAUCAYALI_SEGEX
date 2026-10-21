import PageMeta from "@/components/common/PageMeta";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import RespuestasAsignacionModal from "@/components/asignaciones/RespuestasAsignacionModal";
import { formatFecha, formatFechaHora } from "@/components/expedientes/format";
import { CloseIcon } from "@/icons";
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
  estado: "POR_EVALUAR" | "OBSERVADA" | "SIN_RESPUESTA" | "CERRADA";
  ultima_evaluacion: Evaluacion | null;
}

const ESTADO: Record<FilaEvaluable["estado"], { texto: string; clases: string }> = {
  POR_EVALUAR: { texto: "Por evaluar", clases: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100" },
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
  { value: "OBSERVADA", texto: "Observadas" },
  { value: "CERRADA", texto: "Cerradas" },
];

export default function EvaluacionRespuestas() {
  const [filas, setFilas] = useState<FilaEvaluable[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroCut, setFiltroCut] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [respuestasDe, setRespuestasDe] = useState<FilaEvaluable | null>(null);
  const [evaluando, setEvaluando] = useState<FilaEvaluable | null>(null);
  const [formEvaluacion, setFormEvaluacion] = useState<{ resultado: "APROBADA" | "OBSERVADA"; observacion: string }>({
    resultado: "APROBADA",
    observacion: "",
  });
  const [enviando, setEnviando] = useState(false);

  const fetchFilas = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/evaluaciones-asignacion");
      setFilas(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error("No se pudieron cargar las respuestas para evaluar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFilas();
  }, [fetchFilas]);

  const filasVisibles = filas.filter(
    (f) =>
      (!filtroCut || f.cut.toUpperCase().includes(filtroCut.trim().toUpperCase())) &&
      (!filtroEstado || f.estado === filtroEstado)
  );

  const abrirEvaluacion = (fila: FilaEvaluable) => {
    setFormEvaluacion({ resultado: "APROBADA", observacion: "" });
    setEvaluando(fila);
  };

  const enviarEvaluacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evaluando) return;
    if (formEvaluacion.resultado === "OBSERVADA" && !formEvaluacion.observacion.trim()) {
      toast.error("Describa qué debe corregir o completar la respuesta");
      return;
    }
    setEnviando(true);
    try {
      const res = await api.post(`/evaluaciones-asignacion/${evaluando.id}`, formEvaluacion);
      setFilas((prev) => prev.map((f) => (f.id === res.data.id ? res.data : f)));
      toast.success(
        formEvaluacion.resultado === "APROBADA"
          ? "Asignación cerrada"
          : "Respuesta observada, el usuario deberá responder de nuevo"
      );
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
                          <button
                            onClick={() => setRespuestasDe(f)}
                            className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                          >
                            Ver respuestas
                          </button>
                          {f.estado !== "CERRADA" && (
                            <button
                              onClick={() => abrirEvaluacion(f)}
                              className="rounded border border-brand-600 px-2 py-1 text-xs font-semibold text-brand-600 hover:bg-brand-50 dark:border-brand-400 dark:text-brand-400"
                            >
                              Evaluar
                            </button>
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
          onClose={() => setRespuestasDe(null)}
        />
      )}

      {evaluando && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
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
                  {enviando ? "Guardando..." : "Guardar evaluación"}
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

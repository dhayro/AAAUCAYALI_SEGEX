import PageMeta from "@/components/common/PageMeta";
import ExpedienteDetalleModal from "@/components/expedientes/ExpedienteDetalleModal";
import { formatFecha, formatFechaHora } from "@/components/expedientes/format";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import api from "@/utils/api";
import { useState } from "react";
import { toast } from "sonner";

interface Evento {
  fecha: string;
  origen: string;
  tipo: string;
  detalle: string;
  usuario: string;
}

interface Asignacion {
  asignado: string;
  fecha_asignacion: string;
  plazo_atencion: number;
  vence: string;
  estado: string;
}

const ORIGEN: Record<string, { texto: string; clases: string }> = {
  ASIGNACION: { texto: "Asignación", clases: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100" },
  RESPUESTA: { texto: "Respuesta", clases: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-100" },
  EVALUACION: { texto: "Evaluación", clases: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" },
  LLAMADA: { texto: "Llamada", clases: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100" },
};

export default function ReporteHistorialCut() {
  const [cut, setCut] = useState("");
  const [cargando, setCargando] = useState(false);
  const [datos, setDatos] = useState<{ cut: string; asignaciones: Asignacion[]; llamadas: number; eventos: Evento[] } | null>(null);
  const [verExpediente, setVerExpediente] = useState(false);

  const consultar = async () => {
    if (!cut.trim()) return toast.error("Escriba el CUT");
    setCargando(true);
    try {
      const res = await api.get("/reportes/historial-cut", { params: { cut: cut.trim() } });
      setDatos(res.data);
    } catch (error: any) {
      setDatos(null);
      toast.error(error.response?.data?.mensaje || "No se pudo consultar el CUT");
    } finally {
      setCargando(false);
    }
  };

  return (
    <>
      <PageMeta title="Historial por CUT | Sistema de Seguimiento" description="Todo lo ocurrido con un expediente en orden" />
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Historial por CUT</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Asignaciones, respuestas, evaluaciones y llamadas de un expediente, en el orden en que ocurrieron
          </p>
        </div>

        <div className="flex flex-col gap-3 rounded-lg bg-gray-50 p-4 md:flex-row md:items-end dark:bg-gray-800">
          <div className="flex-1">
            <Label>CUT del expediente</Label>
            <Input
              value={cut}
              onChange={(e) => setCut(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && consultar()}
              placeholder="Ej: 105162-2025"
            />
          </div>
          {datos && (
            <button
              onClick={() => setVerExpediente(true)}
              className="rounded-lg border border-brand-600 px-4 py-2 font-semibold text-brand-600 hover:bg-brand-50 dark:border-brand-400 dark:text-brand-400"
            >
              Ver expediente
            </button>
          )}
          <button
            onClick={consultar}
            disabled={cargando}
            className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {cargando ? "Consultando..." : "Consultar"}
          </button>
        </div>

        {datos && (
          <>
            <section className="rounded-2xl bg-white p-5 shadow dark:bg-gray-800">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                {datos.cut} · {datos.asignaciones.length} asignación(es) · {datos.llamadas} llamada(s)
              </h2>
              {datos.asignaciones.length === 0 ? (
                <p className="text-sm text-gray-500">Este CUT no tiene asignaciones.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs uppercase text-gray-500 dark:text-gray-400">
                        <th className="px-3 py-2 text-start">Asignado a</th>
                        <th className="px-3 py-2 text-center">Asignación</th>
                        <th className="px-3 py-2 text-center">Plazo</th>
                        <th className="px-3 py-2 text-center">Vence</th>
                        <th className="px-3 py-2 text-start">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {datos.asignaciones.map((a, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2">{a.asignado}</td>
                          <td className="px-3 py-2 text-center">{formatFecha(a.fecha_asignacion)}</td>
                          <td className="px-3 py-2 text-center">{a.plazo_atencion} d</td>
                          <td className="px-3 py-2 text-center">{formatFecha(a.vence)}</td>
                          <td className="px-3 py-2">{a.estado}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="rounded-2xl bg-white p-5 shadow dark:bg-gray-800">
              <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                Línea de tiempo ({datos.eventos.length} eventos)
              </h2>
              {datos.eventos.length === 0 ? (
                <p className="text-sm text-gray-500">No hay eventos registrados para este CUT.</p>
              ) : (
                <ol className="space-y-4">
                  {datos.eventos.map((e, i) => (
                    <li key={i} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <span className="mt-1 h-3 w-3 rounded-full bg-brand-500" />
                        {i < datos.eventos.length - 1 && <span className="mt-1 w-px flex-1 bg-gray-200 dark:bg-gray-700" />}
                      </div>
                      <div className="min-w-0 flex-1 pb-2">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                          <span>{formatFechaHora(e.fecha)}</span>
                          <span className={`rounded-full px-2 py-0.5 font-bold ${ORIGEN[e.origen]?.clases ?? ""}`}>
                            {ORIGEN[e.origen]?.texto ?? e.origen}
                          </span>
                          <span className="font-semibold text-gray-700 dark:text-gray-300">{e.usuario}</span>
                        </div>
                        <div className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{e.tipo.replace(/_/g, " ")}</div>
                        {e.detalle && <div className="mt-0.5 whitespace-pre-wrap break-words text-sm text-gray-600 dark:text-gray-300">{e.detalle}</div>}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </>
        )}
      </div>

      {verExpediente && datos && <ExpedienteDetalleModal cut={datos.cut} onClose={() => setVerExpediente(false)} />}
    </>
  );
}

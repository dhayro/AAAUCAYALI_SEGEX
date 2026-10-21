import PageMeta from "@/components/common/PageMeta";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { formatFecha } from "@/components/expedientes/format";
import { CalendarPlusIcon, CallIcon, ClipboardCheckIcon, HistoryIcon } from "@/icons";
import api from "@/utils/api";
import { puedeGestionarAsignaciones } from "@/utils/sesion";

type Motivo = "OBSERVADA" | "VENCIDA" | "POR_VENCER" | "POR_EVALUAR" | "RESPONDIDA";

interface ResumenDashboard {
  alcance: "TODOS" | "PERSONAL";
  asignaciones: {
    abiertas: number;
    vencidas: number;
    por_vencer: number;
    prorrogas_pendientes: number;
    cerradas: number;
    tiempo_promedio_horas: number | null;
  };
  respuestas: {
    sin_respuesta: number;
    por_evaluar: number;
    respondidas: number;
    observadas: number;
    cerradas: number;
  };
  llamadas: { total: number; sin_respuesta: number; acciones_pendientes: number };
  atencion: { id: number; cut: string; asignado: string | null; vence: string; dias: number; motivo: Motivo }[];
}

const MOTIVO: Record<Motivo, { texto: string; clases: string }> = {
  OBSERVADA: { texto: "Observada: responder", clases: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100" },
  VENCIDA: { texto: "Vencida", clases: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100" },
  POR_VENCER: { texto: "Por vencer", clases: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100" },
  POR_EVALUAR: { texto: "Por evaluar", clases: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100" },
  RESPONDIDA: { texto: "Respondida", clases: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-100" },
};

const formatoTiempo = (horas: number | null) => {
  if (horas === null) return "—";
  const dias = Math.floor(horas / 24);
  const resto = Math.round(horas - dias * 24);
  return dias > 0 ? `${dias} d ${resto} h` : `${Math.round(horas)} h`;
};

const textoDias = (dias: number) => (dias < 0 ? `Vencida hace ${-dias} d` : dias === 0 ? "Vence hoy" : `${dias} d`);

interface TarjetaProps {
  titulo: string;
  valor: string | number;
  ayuda: string;
  tono?: "neutro" | "alerta" | "peligro" | "exito";
}

const TONO_VALOR: Record<NonNullable<TarjetaProps["tono"]>, string> = {
  neutro: "text-gray-900 dark:text-white",
  alerta: "text-amber-600 dark:text-amber-400",
  peligro: "text-red-600 dark:text-red-400",
  exito: "text-green-600 dark:text-green-400",
};

const Tarjeta = ({ titulo, valor, ayuda, tono = "neutro" }: TarjetaProps) => (
  <div className="rounded-lg bg-white p-5 shadow dark:bg-gray-800">
    <div className="text-sm font-medium text-gray-600 dark:text-gray-400">{titulo}</div>
    <div className={`mt-2 text-3xl font-bold ${TONO_VALOR[tono]}`}>{valor}</div>
    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{ayuda}</div>
  </div>
);

const ACCESOS = [
  { to: "/asignacion-expediente", titulo: "Asignación de expediente", texto: "Asignaciones, plazos y respuestas", icono: <CalendarPlusIcon />, soloGestores: false },
  { to: "/evaluacion-respuestas", titulo: "Evaluación de respuestas", texto: "Aprobar o observar respuestas", icono: <ClipboardCheckIcon />, soloGestores: true },
  { to: "/prorrogas", titulo: "Prórrogas", texto: "Solicitudes pendientes de revisión", icono: <HistoryIcon />, soloGestores: false },
  { to: "/llamadas", titulo: "Control de llamadas", texto: "Llamadas de administrados y acciones", icono: <CallIcon />, soloGestores: false },
];

export default function Inicio() {
  const [resumen, setResumen] = useState<ResumenDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const gestor = puedeGestionarAsignaciones();

  useEffect(() => {
    api
      .get("/dashboard/resumen")
      .then((res) => setResumen(res.data))
      .catch(() => toast.error("No se pudo cargar el resumen"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <PageMeta title="Inicio | Sistema de Seguimiento" description="Resumen de asignaciones, respuestas y llamadas" />
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Inicio</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {gestor
              ? "Vista general de todas las asignaciones, respuestas y llamadas"
              : "Tus asignaciones, respuestas y llamadas"}
          </p>
        </div>

        {loading && <div className="p-12 text-center text-gray-500">Cargando resumen...</div>}

        {resumen && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Tarjeta titulo="Asignaciones abiertas" valor={resumen.asignaciones.abiertas} ayuda="Sin cerrar" />
              <Tarjeta
                titulo="Vencidas"
                valor={resumen.asignaciones.vencidas}
                ayuda="Pasaron su plazo"
                tono={resumen.asignaciones.vencidas > 0 ? "peligro" : "neutro"}
              />
              <Tarjeta
                titulo="Por vencer (5 días)"
                valor={resumen.asignaciones.por_vencer}
                ayuda="Vencen en los próximos días"
                tono={resumen.asignaciones.por_vencer > 0 ? "alerta" : "neutro"}
              />
              <Tarjeta
                titulo="Tiempo de respuesta"
                valor={formatoTiempo(resumen.asignaciones.tiempo_promedio_horas)}
                ayuda={`Promedio de ${resumen.asignaciones.cerradas} cerradas, desde la asignación`}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {gestor ? (
                <>
                  <Tarjeta
                    titulo="Respuestas por evaluar"
                    valor={resumen.respuestas.por_evaluar + resumen.respuestas.respondidas}
                    ayuda={`${resumen.respuestas.respondidas} respondidas tras observación`}
                    tono={resumen.respuestas.por_evaluar + resumen.respuestas.respondidas > 0 ? "alerta" : "neutro"}
                  />
                  <Tarjeta
                    titulo="Prórrogas pendientes"
                    valor={resumen.asignaciones.prorrogas_pendientes}
                    ayuda="Esperando aceptación o rechazo"
                    tono={resumen.asignaciones.prorrogas_pendientes > 0 ? "alerta" : "neutro"}
                  />
                </>
              ) : (
                <>
                  <Tarjeta
                    titulo="Observadas"
                    valor={resumen.respuestas.observadas}
                    ayuda="Tienen una observación pendiente de tu respuesta"
                    tono={resumen.respuestas.observadas > 0 ? "alerta" : "neutro"}
                  />
                  <Tarjeta
                    titulo="Esperando evaluación"
                    valor={resumen.respuestas.respondidas + resumen.respuestas.por_evaluar}
                    ayuda="Respuestas enviadas al gestor"
                  />
                </>
              )}
              <Tarjeta
                titulo="Llamadas sin respuesta"
                valor={resumen.llamadas.sin_respuesta}
                ayuda={`De ${resumen.llamadas.total} registradas`}
                tono={resumen.llamadas.sin_respuesta > 0 ? "alerta" : "neutro"}
              />
              <Tarjeta
                titulo="Acciones de llamada pendientes"
                valor={resumen.llamadas.acciones_pendientes}
                ayuda="Aún no ejecutadas"
              />
            </div>

            <div className="overflow-hidden rounded-lg bg-white shadow dark:bg-gray-800">
              <div className="flex items-center justify-between border-b px-6 py-4 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Atención requerida</h2>
                <Link
                  to="/asignacion-expediente"
                  className="text-sm font-semibold text-brand-600 hover:underline dark:text-brand-400"
                >
                  Ver asignaciones
                </Link>
              </div>
              {resumen.atencion.length === 0 ? (
                <div className="p-10 text-center text-sm text-gray-500">No hay pendientes. Todo está al día.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-gray-50 dark:bg-gray-700">
                        <th className="px-6 py-3 text-start text-sm font-semibold">CUT</th>
                        {gestor && <th className="px-6 py-3 text-start text-sm font-semibold">Atiende</th>}
                        <th className="px-6 py-3 text-start text-sm font-semibold">Motivo</th>
                        <th className="px-6 py-3 text-center text-sm font-semibold">Vence</th>
                        <th className="px-6 py-3 text-center text-sm font-semibold">Días</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resumen.atencion.map((f) => (
                        <tr key={f.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-3 font-medium">{f.cut}</td>
                          {gestor && <td className="px-6 py-3 text-sm">{f.asignado || "—"}</td>}
                          <td className="px-6 py-3">
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${MOTIVO[f.motivo].clases}`}>
                              {MOTIVO[f.motivo].texto}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-center text-sm">{formatFecha(f.vence)}</td>
                          <td className="px-6 py-3 text-center text-sm">{textoDias(f.dias)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        <div>
          <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">Accesos</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {ACCESOS.filter((a) => !a.soloGestores || gestor).map((a) => (
              <Link
                key={a.to}
                to={a.to}
                className="flex items-start gap-3 rounded-lg bg-white p-5 shadow hover:ring-2 hover:ring-brand-500 dark:bg-gray-800"
              >
                <span className="rounded-md bg-brand-50 p-2 text-brand-600 dark:bg-gray-700 dark:text-brand-400 [&>svg]:h-5 [&>svg]:w-5">
                  {a.icono}
                </span>
                <span>
                  <span className="block font-semibold text-gray-900 dark:text-white">{a.titulo}</span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">{a.texto}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

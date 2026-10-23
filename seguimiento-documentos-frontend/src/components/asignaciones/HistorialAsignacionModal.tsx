import { useEffect, useState } from "react";
import api from "@/utils/api";
import { CloseIcon } from "@/icons";
import { formatFechaHora } from "@/components/expedientes/format";

type Props = {
  asignacionId: number;
  cut: string;
  onClose: () => void;
};

const ETIQUETA_EVENTO: Record<string, string> = {
  ASIGNACION_CREADA: "Asignación creada",
  ASIGNACION_EDITADA: "Asignación editada",
  REASIGNADA: "Asignación reasignada",
  REASIGNACION_RECIBIDA: "Reasignación recibida",
  SOLICITUD_PRORROGA: "Solicitud de prórroga",
  PRORROGA_ACEPTADA: "Prórroga aceptada",
  PRORROGA_RECHAZADA: "Prórroga rechazada",
  RESPUESTA_REGISTRADA: "Respuesta registrada",
  RESPUESTA_ENVIADA: "Respuesta enviada a evaluación",
  ARCHIVO_SUBIDO: "Archivo subido",
  ARCHIVO_EDITADO: "Archivo editado",
  ARCHIVO_REEMPLAZADO: "Archivo reemplazado",
  ARCHIVO_ELIMINADO: "Archivo eliminado",
  EVALUACION_APROBADA: "Evaluación: aprobada y cerrada",
  EVALUACION_OBSERVADA: "Evaluación: observada",
};

// Color por tipo de evento para diferenciarlos a simple vista.
const COLOR_EVENTO: Record<string, string> = {
  ASIGNACION_CREADA: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
  ASIGNACION_EDITADA: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
  REASIGNADA: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
  REASIGNACION_RECIBIDA: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-100",
  SOLICITUD_PRORROGA: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100",
  PRORROGA_ACEPTADA: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
  PRORROGA_RECHAZADA: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
  RESPUESTA_REGISTRADA: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-100",
  RESPUESTA_ENVIADA: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-100",
  ARCHIVO_SUBIDO: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100",
  ARCHIVO_EDITADO: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100",
  ARCHIVO_REEMPLAZADO: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100",
  ARCHIVO_ELIMINADO: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
  EVALUACION_APROBADA: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
  EVALUACION_OBSERVADA: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100",
};

export default function HistorialAsignacionModal({ asignacionId, cut, onClose }: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    api
      .get(`/asignaciones-expediente/${asignacionId}/historial`)
      .then((res) => {
        if (!cancelado) setRows(res.data || []);
      })
      .catch(() => {
        if (!cancelado) setError("Error al cargar el historial");
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [asignacionId]);

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-gray-900/50 p-4">
      <div className="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-gray-800">
        <div className="flex items-center gap-3 bg-brand-600 px-5 py-3 text-white">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-white/70">Historial</span>
          <h2 className="text-lg font-bold">{cut}</h2>
          <button onClick={onClose} className="ml-auto rounded-full p-1 text-white/80 hover:bg-white/20 hover:text-white">
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-auto">
          {cargando && <div className="p-10 text-center text-sm text-gray-500">Cargando historial...</div>}
          {!cargando && error && <div className="m-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          {!cargando && !error && rows.length === 0 && (
            <div className="p-10 text-center text-sm text-gray-500">Esta asignación no tiene eventos registrados.</div>
          )}
          {!cargando && rows.length > 0 && (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-700 dark:text-gray-300">
                <tr>
                  <th className="px-4 py-2 text-start">Fecha</th>
                  <th className="px-4 py-2 text-start">Evento</th>
                  <th className="px-4 py-2 text-center">Días</th>
                  <th className="px-4 py-2 text-start">Usuario</th>
                  <th className="px-4 py-2 text-start">Observación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {rows.map((h) => (
                  <tr key={h.id}>
                    <td className="whitespace-nowrap px-4 py-2">{formatFechaHora(h.fecha_registro ?? h.fecha_evento)}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          COLOR_EVENTO[h.tipo] || "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200"
                        }`}
                      >
                        {ETIQUETA_EVENTO[h.tipo] || h.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-center">{h.plazo ?? "—"}</td>
                    <td className="px-4 py-2">{h.usuario ? `${h.usuario.nombre} ${h.usuario.apellido}` : "—"}</td>
                    <td className="whitespace-pre-wrap break-words px-4 py-2 text-gray-600 dark:text-gray-300">{h.observacion || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

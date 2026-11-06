import { useEffect, useState } from "react";
import api from "@/utils/api";
import { CloseIcon } from "@/icons";
import { formatFecha } from "@/components/expedientes/format";
import HistorialAsignacionModal from "@/components/asignaciones/HistorialAsignacionModal";

type Props = {
  cut: string;
  onClose: () => void;
};

const ESTADO_PRORROGA: Record<string, { texto: string; clases: string }> = {
  PENDIENTE: { texto: "Pendiente", clases: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100" },
  ACEPTADA: { texto: "Aceptada", clases: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" },
  RECHAZADA: { texto: "Rechazada", clases: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100" },
};

export default function AsignadoExpedienteModal({ cut, onClose }: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [historialId, setHistorialId] = useState<number | null>(null);

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    setError("");
    api
      .get("/asignaciones-expediente", { params: { cut, estado: "true", limit: 50 } })
      .then((res) => {
        if (cancelado) return;
        const exactas = (res.data.asignaciones || []).filter((a: any) => a.cut === cut);
        setRows(exactas);
      })
      .catch(() => {
        if (!cancelado) setError("Error al cargar las asignaciones");
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [cut]);

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-gray-900/50 p-4">
      <div className="flex max-h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-gray-800">
        <div className="flex items-center gap-3 bg-brand-600 px-5 py-3 text-white">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-white/70">Asignado a</span>
          <h2 className="text-lg font-bold">{cut}</h2>
          <button onClick={onClose} className="ml-auto rounded-full p-1 text-white/80 hover:bg-white/20 hover:text-white">
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-auto">
          {cargando && <div className="p-10 text-center text-sm text-gray-500">Cargando asignaciones...</div>}
          {!cargando && error && <div className="m-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          {!cargando && !error && rows.length === 0 && (
            <div className="p-10 text-center text-sm text-gray-500">Este expediente no tiene asignaciones visibles para ti.</div>
          )}
          {!cargando && rows.length > 0 && (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-700 dark:text-gray-300">
                <tr>
                  <th className="px-4 py-2 text-start">Asignado a</th>
                  <th className="px-4 py-2 text-center">Asignación</th>
                  <th className="px-4 py-2 text-center">Plazo (días)</th>
                  <th className="px-4 py-2 text-center">Vencimiento</th>
                  <th className="px-4 py-2 text-center">Prórroga</th>
                  <th className="px-4 py-2 text-center">Vence prórroga</th>
                  <th className="px-4 py-2 text-center">Historial</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {rows.map((a) => (
                  <tr key={a.id}>
                    <td className="px-4 py-2">
                      <div className="font-semibold">
                        {a.asignado ? `${a.asignado.nombre} ${a.asignado.apellido}` : "—"}
                      </div>
                      <div className="text-xs text-gray-500">
                        {a.asignado?.Cargo?.nombre ? a.asignado.Cargo.nombre : ""}
                        {a.numero_orden ? ` · Orden: ${a.numero_orden}` : ""}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-center">{formatFecha(a.fecha_asignacion)}</td>
                    <td className="px-4 py-2 text-center">{a.plazo_atencion}</td>
                    <td className="whitespace-nowrap px-4 py-2 text-center">{formatFecha(a.fecha_vencimiento)}</td>
                    <td className="px-4 py-2 text-center">
                      {a.estado_prorroga && ESTADO_PRORROGA[a.estado_prorroga] ? (
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${ESTADO_PRORROGA[a.estado_prorroga].clases}`}>
                          {ESTADO_PRORROGA[a.estado_prorroga].texto}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-center">
                      {a.fecha_vencimiento_prorroga ? formatFecha(a.fecha_vencimiento_prorroga) : "—"}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <button
                        onClick={() => setHistorialId(a.id)}
                        className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                      >
                        Historial
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {historialId !== null && (
        <HistorialAsignacionModal asignacionId={historialId} cut={cut} onClose={() => setHistorialId(null)} />
      )}
    </div>
  );
}

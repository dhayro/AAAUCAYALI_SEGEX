import { CloseIcon } from "@/icons";
import EstadoBadge from "./EstadoBadge";

type Props = {
  titulo: string;
  rows: any[];
  cargando: boolean;
  error: string;
  onClose: () => void;
};

export default function MovimientosModal({ titulo, rows, cargando, error, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-gray-900/50 p-4">
      <div className="flex max-h-[85vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-gray-800">
        <div className="flex items-center gap-3 bg-brand-600 px-5 py-3 text-white">
          <div className="flex min-w-0 items-baseline gap-3">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-white/70">Movimientos</span>
            <h2 className="truncate text-lg font-bold">{titulo}</h2>
          </div>
          <button onClick={onClose} className="ml-auto rounded-full p-1 text-white/80 hover:bg-white/20 hover:text-white">
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-auto">
          {cargando && (
            <div className="p-10 text-center text-sm text-gray-500">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-brand-600 border-t-transparent"></div>
              <p className="mt-3">Consultando movimientos en SISGED...</p>
            </div>
          )}
          {!cargando && error && (
            <div className="m-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
              {error}
            </div>
          )}
          {!cargando && !error && rows.length === 0 && (
            <div className="p-10 text-center text-sm text-gray-500">No hay movimientos disponibles para este documento.</div>
          )}
          {!cargando && rows.length > 0 && (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-gray-50 text-[10px] uppercase tracking-wide text-gray-500 dark:bg-gray-700 dark:text-gray-300">
                <tr>
                  <th className="px-3 py-2 text-center">N°</th>
                  <th className="px-3 py-2 text-start">Oficina envía</th>
                  <th className="px-3 py-2 text-center">Fecha envío</th>
                  <th className="px-3 py-2 text-start">Oficina recibe</th>
                  <th className="px-3 py-2 text-center">Fecha recepción</th>
                  <th className="px-3 py-2 text-start">Acción</th>
                  <th className="px-3 py-2 text-start">Documento</th>
                  <th className="px-3 py-2 text-center">Estado</th>
                  <th className="px-3 py-2 text-start">Comentario envía</th>
                  <th className="px-3 py-2 text-start">Comentario recibe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {rows.map((m, index) => (
                  <tr key={index} className="align-top hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-3 py-2 text-center font-bold text-brand-600">{index + 1}</td>
                    <td className="max-w-[10rem] px-3 py-2 text-gray-700 dark:text-gray-200">
                      {m.DESC_OFICINA_ENVIA || "—"}
                      {m.USUARIO_ENVIA_LOCAL && (
                        <div className="mt-1 text-xs font-semibold text-brand-700 dark:text-brand-300">{m.USUARIO_ENVIA_LOCAL}</div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-center">{m.STR_FEC_INICIO || "—"}</td>
                    <td className="max-w-[10rem] px-3 py-2 text-gray-700 dark:text-gray-200">
                      {m.DESC_OFICINA_RECIBE || "—"}
                      {m.USUARIO_RECIBE_LOCAL && (
                        <div className="mt-1 text-xs font-semibold text-brand-700 dark:text-brand-300">{m.USUARIO_RECIBE_LOCAL}</div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-center">{m.STR_FEC_FIN || "—"}</td>
                    <td className="px-3 py-2 font-semibold text-gray-900 dark:text-white">{m.MOVIMIENTO || "—"}</td>
                    <td className="max-w-[12rem] px-3 py-2 text-gray-700 dark:text-gray-200">{m.NRO_DOCUMENTO || "—"}</td>
                    <td className="px-3 py-2 text-center"><EstadoBadge estado={m.ESTADO} /></td>
                    <td className="max-w-[12rem] whitespace-pre-wrap px-3 py-2 text-gray-700 dark:text-gray-200">{m.COMENTARIO_ENVIA || "—"}</td>
                    <td className="max-w-[12rem] whitespace-pre-wrap px-3 py-2 text-gray-700 dark:text-gray-200">{m.COMENTARIO_RECIBE || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {rows.length > 0 && (
          <div className="border-t bg-gray-50 px-5 py-2 text-xs text-gray-500 dark:border-gray-700 dark:bg-gray-900/40">
            {rows.length} movimientos
          </div>
        )}
      </div>
    </div>
  );
}

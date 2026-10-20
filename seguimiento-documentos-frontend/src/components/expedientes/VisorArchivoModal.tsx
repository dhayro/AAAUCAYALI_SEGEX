import { CloseIcon } from "@/icons";

type Props = {
  titulo: string;
  url: string | null;
  cargando: boolean;
  error: string;
  onClose: () => void;
};

export default function VisorArchivoModal({ titulo, url, cargando, error, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-[11000] flex items-center justify-center bg-gray-900/60 p-4">
      <div className="flex h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-gray-800">
        <div className="flex items-center gap-3 bg-brand-600 px-5 py-3 text-white">
          <h2 className="min-w-0 flex-1 truncate text-sm font-bold">{titulo}</h2>
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="rounded-md bg-white/15 px-2.5 py-1 text-[11px] font-medium hover:bg-white/25"
            >
              Abrir en nueva pestaña
            </a>
          )}
          <button onClick={onClose} className="rounded-full p-1 text-white/80 hover:bg-white/20 hover:text-white">
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="flex flex-1 items-center justify-center bg-gray-100 dark:bg-gray-900">
          {cargando && (
            <div className="text-center text-sm text-gray-500">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent"></div>
              <p className="mt-3">Obteniendo documento de SISGED...</p>
            </div>
          )}
          {!cargando && error && (
            <div className="m-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
              {error}
            </div>
          )}
          {!cargando && url && (
            <iframe src={url} title={titulo} className="h-full w-full border-0 bg-white" />
          )}
        </div>
      </div>
    </div>
  );
}

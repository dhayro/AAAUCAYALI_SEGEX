import { Modal } from "@/components/ui/modal";

type Props = {
  abierto: boolean;
  titulo: string;
  mensaje: React.ReactNode;
  textoConfirmar?: string;
  peligro?: boolean;
  procesando?: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
};

export default function ConfirmDialog({
  abierto,
  titulo,
  mensaje,
  textoConfirmar = "Confirmar",
  peligro = false,
  procesando = false,
  onConfirmar,
  onCancelar,
}: Props) {
  return (
    <Modal isOpen={abierto} onClose={onCancelar} className="max-w-md p-6 sm:p-8">
      <div className="space-y-4">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-full text-xl font-bold ${
            peligro
              ? "bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500"
              : "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400"
          }`}
        >
          !
        </div>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">{titulo}</h3>
        <div className="text-sm text-gray-600 dark:text-gray-400">{mensaje}</div>
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancelar}
            disabled={procesando}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            disabled={procesando}
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
              peligro ? "bg-error-600 hover:bg-error-700" : "bg-brand-500 hover:bg-brand-600"
            }`}
          >
            {procesando ? "Procesando..." : textoConfirmar}
          </button>
        </div>
      </div>
    </Modal>
  );
}

import type { ReactNode } from "react";

type Tono = "neutro" | "primario" | "alerta" | "exito" | "peligro";

const TONOS: Record<Tono, string> = {
  neutro: "border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700",
  primario: "border-brand-600 text-brand-600 hover:bg-brand-50 dark:border-brand-400 dark:text-brand-400 dark:hover:bg-gray-700",
  alerta: "border-amber-500 text-amber-700 hover:bg-amber-50 dark:border-amber-400 dark:text-amber-300 dark:hover:bg-gray-700",
  exito: "border-green-600 text-green-700 hover:bg-green-50 dark:border-green-400 dark:text-green-300 dark:hover:bg-gray-700",
  peligro: "border-red-500 text-red-600 hover:bg-red-50 dark:border-red-400 dark:text-red-400 dark:hover:bg-gray-700",
};

type Props = {
  etiqueta: string;
  icono: ReactNode;
  onClick: () => void;
  tono?: Tono;
  disabled?: boolean;
};

export default function BotonAccion({ etiqueta, icono, onClick, tono = "neutro", disabled = false }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={etiqueta}
      aria-label={etiqueta}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-md border disabled:opacity-50 [&>svg]:h-4 [&>svg]:w-4 ${TONOS[tono]}`}
    >
      {icono}
    </button>
  );
}

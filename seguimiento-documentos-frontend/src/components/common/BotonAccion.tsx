import type { ReactNode } from "react";

type Tono = "neutro" | "primario" | "alerta" | "exito" | "peligro";

const TONOS: Record<Tono, string> = {
  neutro: "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700",
  primario: "text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-gray-700",
  alerta: "text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-gray-700",
  exito: "text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-gray-700",
  peligro: "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-gray-700",
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
      className={`inline-flex h-8 w-8 items-center justify-center rounded-md disabled:opacity-50 ${TONOS[tono]}`}
    >
      {icono}
    </button>
  );
}

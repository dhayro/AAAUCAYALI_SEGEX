export default function EstadoBadge({ estado }: { estado?: string | null }) {
  const valor = (estado || "").toUpperCase();
  const clases =
    valor === "ATENDIDO"
      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
      : valor === "PENDIENTE"
      ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100"
      : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${clases}`}>
      {valor || "—"}
    </span>
  );
}

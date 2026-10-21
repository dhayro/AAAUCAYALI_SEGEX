export const PALETA_USUARIOS = [
  { borde: "border-blue-500", etiqueta: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100" },
  { borde: "border-green-500", etiqueta: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" },
  { borde: "border-amber-500", etiqueta: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100" },
  { borde: "border-purple-500", etiqueta: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100" },
  { borde: "border-pink-500", etiqueta: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-100" },
  { borde: "border-teal-500", etiqueta: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-100" },
  { borde: "border-orange-500", etiqueta: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100" },
  { borde: "border-indigo-500", etiqueta: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-100" },
];

export const colorUsuario = (id?: number | null) => PALETA_USUARIOS[Math.abs(id ?? 0) % PALETA_USUARIOS.length];

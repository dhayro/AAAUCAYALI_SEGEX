// Plazo de respuesta al administrado: días calendario desde la fecha de la llamada, en hora de Lima.

const LIMA = "America/Lima";

const formatoYMD = (fecha: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: LIMA, year: "numeric", month: "2-digit", day: "2-digit" }).format(fecha);

export const hoyYMD = () => formatoYMD(new Date());

// Fecha (YYYY-MM-DD) de un valor de fecha. Los textos "YYYY-MM-DD HH:mm:ss" ya son de Lima.
export const ymdLima = (valor: string) => {
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?$/.test(valor)) return valor.slice(0, 10);
  return formatoYMD(new Date(valor));
};

export const sumarDias = (ymd: string, dias: number) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + dias)).toISOString().slice(0, 10);
};

export const diasEntre = (ymd: string, hoy: string) =>
  Math.round((Date.parse(`${ymd}T00:00:00Z`) - Date.parse(`${hoy}T00:00:00Z`)) / 86400000);

// Fecha límite a partir de la fecha de la llamada y los días de plazo. Sin días, no hay límite.
export const limiteDesde = (fechaLlamada: string, dias: string | number) => {
  if (dias === "" || dias === null || dias === undefined || Number(dias) < 0) return null;
  return sumarDias(ymdLima(fechaLlamada), Number(dias));
};

export const fechaLegible = (ymd?: string | null) => {
  if (!ymd) return "—";
  const [y, m, d] = ymd.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
};

export const estadoPlazo = (respondido: boolean, fechaLimite?: string | null) => {
  if (respondido) return { texto: "Respondida", clases: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" };
  if (!fechaLimite) return { texto: "Sin plazo", clases: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200" };
  const dias = diasEntre(fechaLimite.slice(0, 10), hoyYMD());
  if (dias < 0) return { texto: `Vencido hace ${-dias} d`, clases: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100" };
  if (dias === 0) return { texto: "Vence hoy", clases: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100" };
  if (dias <= 2) return { texto: `Quedan ${dias} d`, clases: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100" };
  return { texto: `Quedan ${dias} d`, clases: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" };
};

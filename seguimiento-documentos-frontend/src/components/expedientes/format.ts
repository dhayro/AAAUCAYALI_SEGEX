export const formatFecha = (fecha?: string | null) => {
  if (!fecha) return "—";
  const texto = String(fecha).slice(0, 10);
  // Si no es una fecha AAAA-MM-DD, se muestra tal cual en lugar de romper el formato.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return String(fecha);
  const [y, m, d] = texto.split("-");
  return `${d}/${m}/${y}`;
};

export const formatFechaHora = (valor?: string | null) => {
  if (!valor) return "—";
  const coincidencia = String(valor).match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}:\d{2}:\d{2}))?/);
  if (!coincidencia) return String(valor);
  const [, y, m, d, hora] = coincidencia;
  return hora ? `${d}/${m}/${y} ${hora}` : `${d}/${m}/${y}`;
};

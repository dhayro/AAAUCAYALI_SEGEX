const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;

const hoyLima = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

const esFechaValida = (valor) => FORMATO_FECHA.test(String(valor)) && !isNaN(Date.parse(valor));

const sumarDiasCalendario = (fechaYMD, dias) => {
  const [anio, mes, dia] = fechaYMD.split('-').map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia + dias));
  return fecha.toISOString().slice(0, 10);
};

// SISGED entrega fechas como "dd/mm/yyyy" y horas como "hh:mm:ss"
const convertirFechaSisged = (valor) => {
  if (!valor) return null;
  const coincidencia = String(valor).match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}:\d{2}:\d{2}))?$/);
  if (!coincidencia) return valor;
  const [, dia, mes, anio, hora] = coincidencia;
  return hora ? `${anio}-${mes}-${dia} ${hora}` : `${anio}-${mes}-${dia}`;
};

module.exports = { hoyLima, esFechaValida, sumarDiasCalendario, convertirFechaSisged };

const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;

const hoyLima = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

const esFechaValida = (valor) => FORMATO_FECHA.test(String(valor)) && !isNaN(Date.parse(valor));

const sumarDiasHabiles = (fechaYMD, dias) => {
  const [anio, mes, dia] = fechaYMD.split('-').map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  let agregados = 0;
  while (agregados < dias) {
    fecha.setUTCDate(fecha.getUTCDate() + 1);
    const diaSemana = fecha.getUTCDay();
    if (diaSemana !== 0 && diaSemana !== 6) {
      agregados++;
    }
  }
  return fecha.toISOString().slice(0, 10);
};

module.exports = { hoyLima, esFechaValida, sumarDiasHabiles };

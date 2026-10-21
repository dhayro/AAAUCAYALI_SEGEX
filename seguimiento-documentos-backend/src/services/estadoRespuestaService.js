const { Op } = require('sequelize');
const RespuestaAsignacion = require('../models/RespuestaAsignacion');
const EvaluacionAsignacion = require('../models/EvaluacionAsignacion');
const Usuario = require('../models/Usuario');

const ESTADOS = {
  SIN_RESPUESTA: 'SIN_RESPUESTA',
  POR_EVALUAR: 'POR_EVALUAR',
  OBSERVADA: 'OBSERVADA',
  CERRADA: 'CERRADA',
};

const PRIORIDAD_ESTADO = { POR_EVALUAR: 0, OBSERVADA: 1, SIN_RESPUESTA: 2, CERRADA: 3 };

const estadoDe = (total, ultimaRespuesta, evaluacion) => {
  if (evaluacion?.resultado === 'APROBADA') return ESTADOS.CERRADA;
  if (!total) return ESTADOS.SIN_RESPUESTA;
  if (evaluacion?.resultado === 'OBSERVADA' && new Date(evaluacion.fecha_evaluacion) >= ultimaRespuesta) {
    return ESTADOS.OBSERVADA;
  }
  return ESTADOS.POR_EVALUAR;
};

// Devuelve un Map id_asignacion -> { total, ultima_respuesta, estado, evaluacion }
// para todas las ids pedidas (aunque no tengan respuestas).
const resumenPorAsignacion = async (ids) => {
  const resumen = new Map();
  ids.forEach((id) =>
    resumen.set(id, { total: 0, ultima_respuesta: null, estado: ESTADOS.SIN_RESPUESTA, evaluacion: null })
  );
  if (!ids.length) return resumen;

  const respuestas = await RespuestaAsignacion.findAll({
    attributes: ['id_asignacion', 'fecha_creacion'],
    where: { id_asignacion: { [Op.in]: ids } },
    raw: true,
  });
  respuestas.forEach((r) => {
    const entrada = resumen.get(r.id_asignacion);
    const fecha = new Date(r.fecha_creacion);
    entrada.total += 1;
    if (!entrada.ultima_respuesta || fecha > entrada.ultima_respuesta) entrada.ultima_respuesta = fecha;
  });

  const evaluaciones = await EvaluacionAsignacion.findAll({
    where: { id_asignacion: { [Op.in]: ids } },
    include: [{ model: Usuario, as: 'evaluador', attributes: ['id', 'nombre', 'apellido'] }],
    order: [['id', 'ASC']],
  });
  evaluaciones.forEach((e) => {
    resumen.get(e.id_asignacion).evaluacion = e.get({ plain: true });
  });

  resumen.forEach((entrada) => {
    entrada.estado = estadoDe(entrada.total, entrada.ultima_respuesta, entrada.evaluacion);
  });
  return resumen;
};

// Horas desde el inicio del día de asignación (medianoche Lima) hasta la última respuesta.
const tiempoRespuestaHoras = (fechaAsignacion, ultimaRespuesta) => {
  if (!ultimaRespuesta) return null;
  const inicio = new Date(`${String(fechaAsignacion).slice(0, 10)}T00:00:00-05:00`);
  return Math.round(((ultimaRespuesta - inicio) / 3600000) * 10) / 10;
};

// Fecha y hora de Lima (UTC-5, sin horario de verano) con el mismo formato que el resto de la API.
const aLima = (valor) => {
  if (!valor) return null;
  const fecha = new Date(valor);
  return new Date(fecha.getTime() - 5 * 3600000).toISOString().replace('T', ' ').slice(0, 19);
};

const compararFilas = (a, b) =>
  PRIORIDAD_ESTADO[a.estado] - PRIORIDAD_ESTADO[b.estado] ||
  new Date(b.ultima_respuesta) - new Date(a.ultima_respuesta);

module.exports = {
  ESTADOS,
  resumenPorAsignacion,
  tiempoRespuestaHoras,
  compararFilas,
  aLima,
};

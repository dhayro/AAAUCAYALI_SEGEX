const { Op } = require('sequelize');
const AsignacionExpediente = require('../models/AsignacionExpediente');
const EvaluacionAsignacion = require('../models/EvaluacionAsignacion');
const RespuestaAsignacion = require('../models/RespuestaAsignacion');
const Usuario = require('../models/Usuario');
const Cargo = require('../models/Cargo');
const { registrarEvento } = require('../services/historialAsignacionService');
const {
  ESTADOS,
  resumenPorAsignacion,
  tiempoRespuestaHoras,
  compararFilas,
  aLima,
} = require('../services/estadoRespuestaService');

const textoMayuscula = (valor) => {
  if (valor === undefined || valor === null) return null;
  const limpio = String(valor).trim().toUpperCase();
  return limpio === '' ? null : limpio;
};

const errorConEstado = (mensaje, status = 400) => Object.assign(new Error(mensaje), { status });

const includeAsignado = [
  {
    model: Usuario,
    as: 'asignado',
    attributes: ['id', 'nombre', 'apellido', 'usuario'],
    include: [{ model: Cargo, attributes: ['id', 'nombre'] }],
    required: false,
  },
];

const filaEvaluable = (asignacion, resumen) => {
  const plain = asignacion.get({ plain: true });
  const r = resumen.get(asignacion.id);
  return {
    id: asignacion.id,
    cut: asignacion.cut,
    asignado: plain.asignado,
    fecha_asignacion: asignacion.fecha_asignacion,
    plazo_atencion: asignacion.plazo_atencion,
    fecha_vencimiento: asignacion.fecha_vencimiento,
    total_respuestas: r.total,
    ultima_respuesta: aLima(r.ultima_respuesta),
    tiempo_respuesta_horas: tiempoRespuestaHoras(asignacion.fecha_asignacion, r.ultima_respuesta),
    estado: r.estado,
    ultima_evaluacion: r.evaluacion && { ...r.evaluacion, fecha_evaluacion: aLima(r.evaluacion.fecha_evaluacion) },
  };
};

const ESTADOS_LISTADO = ['POR_EVALUAR', 'RESPONDIDA', 'OBSERVADA', 'CERRADA', 'SIN_RESPUESTA'];

// Query: estado (opcional) filtra las filas; cut (opcional) busca por CUT.
// Devuelve las filas pedidas y el conteo de cada estado (con el mismo CUT).
exports.listar = async (req, res) => {
  try {
    const estado = String(req.query.estado || '').trim().toUpperCase();
    const cut = textoMayuscula(req.query.cut);
    const contadores = Object.fromEntries(ESTADOS_LISTADO.map((e) => [e, 0]));

    const conRespuesta = await RespuestaAsignacion.findAll({ attributes: ['id_asignacion'], raw: true });
    const ids = [...new Set(conRespuesta.map((r) => r.id_asignacion))];
    if (!ids.length) return res.json({ contadores, filas: [] });

    // Las asignaciones reasignadas ya no se evalúan: la evaluación la hace la fila vigente.
    const where = { id: { [Op.in]: ids }, estado: true, motivo_cierre: null };
    if (cut) where.cut = { [Op.like]: `%${cut}%` };
    const asignaciones = await AsignacionExpediente.findAll({
      where,
      include: includeAsignado,
      order: [['id', 'ASC']],
    });
    const resumen = await resumenPorAsignacion(asignaciones.map((a) => a.id));
    const todas = asignaciones.map((a) => filaEvaluable(a, resumen));
    todas.forEach((f) => {
      contadores[f.estado] += 1;
    });
    const filas = (estado ? todas.filter((f) => f.estado === estado) : todas).sort(compararFilas);
    res.json({ contadores, filas });
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

exports.evaluar = async (req, res) => {
  try {
    const asignacion = await AsignacionExpediente.findByPk(req.params.id, { include: includeAsignado });
    if (!asignacion) throw errorConEstado('Asignación no encontrada', 404);
    if (asignacion.motivo_cierre) throw errorConEstado('Esta asignación fue reasignada: evalúe la asignación vigente');

    const resumen = await resumenPorAsignacion([asignacion.id]);
    const actual = resumen.get(asignacion.id);
    if (!actual.total) throw errorConEstado('La asignación todavía no tiene respuestas para evaluar');
    if (actual.estado === ESTADOS.CERRADA) throw errorConEstado('La asignación ya está cerrada');

    const resultado = String(req.body.resultado || '').trim().toUpperCase();
    if (!['APROBADA', 'OBSERVADA'].includes(resultado)) {
      throw errorConEstado('Indique si la respuesta se aprueba o se observa');
    }
    const observacion = textoMayuscula(req.body.observacion);
    if (resultado === 'OBSERVADA' && !observacion) {
      throw errorConEstado('Describa qué debe corregir o completar la respuesta');
    }

    await EvaluacionAsignacion.create({
      id_asignacion: asignacion.id,
      resultado,
      observacion,
      fecha_ultima_respuesta: actual.ultima_respuesta,
      id_usuario: req.user.id,
    });

    await registrarEvento(
      asignacion.id,
      req.user.id,
      resultado === 'APROBADA' ? 'EVALUACION_APROBADA' : 'EVALUACION_OBSERVADA',
      observacion || (resultado === 'APROBADA' ? 'RESPUESTA APROBADA' : null)
    );

    const actualizada = await resumenPorAsignacion([asignacion.id]);
    res.status(201).json(filaEvaluable(asignacion, actualizada));
  } catch (error) {
    res.status(error.status || 400).json({ mensaje: error.message });
  }
};

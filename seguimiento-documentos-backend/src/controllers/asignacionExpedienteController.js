const { Op } = require('sequelize');
const AsignacionExpediente = require('../models/AsignacionExpediente');
const HistorialAsignacion = require('../models/HistorialAsignacion');
const Usuario = require('../models/Usuario');
const Cargo = require('../models/Cargo');
const { hoyLima, esFechaValida, sumarDiasCalendario } = require('../utils/fechas');
const { resumenPorAsignacion, aLima } = require('../services/estadoRespuestaService');

const parseBoolean = (value) => value === true || value === 'true' || value === 1 || value === '1';

const normalizarTexto = (valor) => (valor === undefined || valor === null ? null : String(valor).trim().toUpperCase() || null);

const parsePlazo = (valor) => {
  const plazo = parseInt(valor, 10);
  if (isNaN(plazo) || plazo < 1) {
    throw new Error('El plazo debe ser un número entero mayor a 0');
  }
  return plazo;
};

const parseFecha = (valor) => {
  if (!esFechaValida(valor)) {
    throw new Error('La fecha debe tener formato YYYY-MM-DD');
  }
  return valor;
};

const includes = [
  {
    model: Usuario,
    as: 'asignado',
    attributes: ['id', 'nombre', 'apellido', 'usuario'],
    include: [{ model: Cargo, attributes: ['id', 'nombre'] }],
    required: false,
  },
  { model: Usuario, as: 'creador', attributes: ['id', 'nombre', 'apellido', 'usuario'], required: false },
  { model: Usuario, as: 'modificador', attributes: ['id', 'nombre', 'apellido', 'usuario'], required: false },
];

const obtenerConRelaciones = (id) => AsignacionExpediente.findByPk(id, { include: includes });

const PERFILES_VER_TODAS = ['admin', 'jefe', 'secretaria'];
const puedeVerTodas = (usuario) => PERFILES_VER_TODAS.includes(usuario.perfil);
const puedeVerAsignacion = (asignacion, usuario) =>
  puedeVerTodas(usuario) || asignacion.id_usuario === usuario.id;

const validarUsuario = async (valor) => {
  const id = parseInt(valor, 10);
  if (isNaN(id)) throw new Error('El usuario asignado es obligatorio');
  const usuario = await Usuario.findByPk(id);
  if (!usuario) throw new Error('El usuario asignado no existe');
  return id;
};

exports.obtenerTodas = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const { cut, id_usuario, estado, con_prorroga, estado_prorroga } = req.query;

    const whereClause = {};
    if (cut) whereClause.cut = { [Op.like]: `%${normalizarTexto(cut)}%` };
    if (id_usuario) whereClause.id_usuario = parseInt(id_usuario, 10);
    if (!puedeVerTodas(req.user)) whereClause.id_usuario = req.user.id;
    if (estado !== undefined && estado !== '') whereClause.estado = parseBoolean(estado);
    if (parseBoolean(con_prorroga)) whereClause.estado_prorroga = { [Op.ne]: null };
    if (estado_prorroga) whereClause.estado_prorroga = normalizarTexto(estado_prorroga);

    const { count, rows } = await AsignacionExpediente.findAndCountAll({
      where: whereClause,
      include: includes,
      limit,
      offset,
      order: [['id', 'ASC']],
    });

    const resumen = await resumenPorAsignacion(rows.map((a) => a.id));
    res.json({
      asignaciones: rows.map((a) => {
        const r = resumen.get(a.id);
        return { ...a.get({ plain: true }), respuesta: { ...r, ultima_respuesta: aLima(r.ultima_respuesta) } };
      }),
      totalAsignaciones: count,
      totalPaginas: Math.ceil(count / limit),
      paginaActual: page,
    });
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

exports.obtenerPorId = async (req, res) => {
  try {
    const asignacion = await obtenerConRelaciones(req.params.id);
    if (!asignacion || !puedeVerAsignacion(asignacion, req.user)) {
      return res.status(404).json({ mensaje: 'Asignación no encontrada' });
    }
    res.json(asignacion);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

exports.crear = async (req, res) => {
  try {
    const cut = normalizarTexto(req.body.cut);
    if (!cut) {
      return res.status(400).json({ mensaje: 'El CUT es obligatorio' });
    }

    const idUsuario = await validarUsuario(req.body.id_usuario);
    const plazo = parsePlazo(req.body.plazo_atencion);
    const fechaAsignacion = req.body.fecha_asignacion ? parseFecha(req.body.fecha_asignacion) : hoyLima();

    const nueva = await AsignacionExpediente.create({
      cut,
      id_expediente: null,
      id_usuario: idUsuario,
      fecha_asignacion: fechaAsignacion,
      plazo_atencion: plazo,
      fecha_vencimiento: sumarDiasCalendario(fechaAsignacion, plazo),
      observacion: normalizarTexto(req.body.observacion),
      numero_orden: normalizarTexto(req.body.numero_orden),
      estado: true,
      id_usuario_creador: req.user.id,
      id_usuario_modificador: req.user.id,
    });

    res.status(201).json(await obtenerConRelaciones(nueva.id));
  } catch (error) {
    res.status(400).json({ mensaje: error.message });
  }
};

exports.actualizar = async (req, res) => {
  try {
    const actual = await AsignacionExpediente.findByPk(req.params.id);
    if (!actual) {
      return res.status(404).json({ mensaje: 'Asignación no encontrada' });
    }

    const cambios = { id_usuario_modificador: req.user.id };
    if (req.body.id_usuario !== undefined) cambios.id_usuario = await validarUsuario(req.body.id_usuario);
    if (req.body.observacion !== undefined) cambios.observacion = normalizarTexto(req.body.observacion);
    if (req.body.numero_orden !== undefined) cambios.numero_orden = normalizarTexto(req.body.numero_orden);

    const fechaAsignacion = req.body.fecha_asignacion !== undefined
      ? parseFecha(req.body.fecha_asignacion)
      : actual.fecha_asignacion;
    const plazo = req.body.plazo_atencion !== undefined
      ? parsePlazo(req.body.plazo_atencion)
      : actual.plazo_atencion;

    cambios.fecha_asignacion = fechaAsignacion;
    cambios.plazo_atencion = plazo;
    cambios.fecha_vencimiento = sumarDiasCalendario(fechaAsignacion, plazo);
    if (actual.estado_prorroga === 'ACEPTADA') {
      cambios.fecha_vencimiento_prorroga = sumarDiasCalendario(cambios.fecha_vencimiento, actual.plazo_prorroga);
    }

    await actual.update(cambios);
    res.json(await obtenerConRelaciones(actual.id));
  } catch (error) {
    res.status(400).json({ mensaje: error.message });
  }
};

const errorConEstado = (mensaje) => Object.assign(new Error(mensaje), { status: 400 });

const solicitarProrroga = async (actual, datos, userId) => {
  if (actual.estado_prorroga === 'PENDIENTE') {
    throw errorConEstado('Ya hay una prórroga pendiente de aceptación');
  }
  if (actual.estado_prorroga === 'ACEPTADA') {
    throw errorConEstado('La asignación ya tiene una prórroga aceptada');
  }

  const plazo = parsePlazo(datos.plazo_prorroga);
  const motivo = normalizarTexto(datos.motivo);
  if (!motivo) {
    throw errorConEstado('Debe indicar el motivo de la prórroga');
  }
  const hoy = hoyLima();

  await actual.update({
    fecha_prorroga: hoy,
    plazo_prorroga: plazo,
    estado_prorroga: 'PENDIENTE',
    motivo_prorroga: motivo,
    fecha_vencimiento_prorroga: null,
    id_usuario_modificador: userId,
  });
  await HistorialAsignacion.create({
    id_asignacion: actual.id,
    tipo: 'SOLICITUD_PRORROGA',
    plazo,
    fecha_evento: hoy,
    observacion: motivo,
    id_usuario: userId,
  });
};

const aceptarProrrogaPendiente = async (actual, datos, userId) => {
  if (actual.estado_prorroga !== 'PENDIENTE') {
    throw errorConEstado('No hay una prórroga pendiente para aceptar');
  }

  const plazo = datos.plazo_prorroga !== undefined
    ? parsePlazo(datos.plazo_prorroga)
    : actual.plazo_prorroga;

  await actual.update({
    plazo_prorroga: plazo,
    estado_prorroga: 'ACEPTADA',
    fecha_vencimiento_prorroga: sumarDiasCalendario(actual.fecha_vencimiento, plazo),
    id_usuario_modificador: userId,
  });
  await HistorialAsignacion.create({
    id_asignacion: actual.id,
    tipo: 'PRORROGA_ACEPTADA',
    plazo,
    fecha_evento: hoyLima(),
    observacion: normalizarTexto(datos.observacion),
    id_usuario: userId,
  });
};

const rechazarProrrogaPendiente = async (actual, datos, userId) => {
  if (actual.estado_prorroga !== 'PENDIENTE') {
    throw errorConEstado('No hay una prórroga pendiente para rechazar');
  }
  const motivo = normalizarTexto(datos.observacion);
  if (!motivo) {
    throw errorConEstado('Debe indicar el motivo del rechazo');
  }

  await actual.update({
    estado_prorroga: 'RECHAZADA',
    fecha_vencimiento_prorroga: null,
    id_usuario_modificador: userId,
  });
  await HistorialAsignacion.create({
    id_asignacion: actual.id,
    tipo: 'PRORROGA_RECHAZADA',
    plazo: actual.plazo_prorroga,
    fecha_evento: hoyLima(),
    observacion: motivo,
    id_usuario: userId,
  });
};

const accionIndividual = (accion) => async (req, res) => {
  try {
    const actual = await AsignacionExpediente.findByPk(req.params.id);
    if (!actual) {
      return res.status(404).json({ mensaje: 'Asignación no encontrada' });
    }
    await accion(actual, req.body, req.user.id);
    res.json(await obtenerConRelaciones(actual.id));
  } catch (error) {
    res.status(error.status || 400).json({ mensaje: error.message });
  }
};

const accionMasiva = (accion) => async (req, res) => {
  const ids = Array.isArray(req.body.ids)
    ? [...new Set(req.body.ids.map(Number).filter((n) => Number.isInteger(n) && n > 0))]
    : [];
  if (ids.length === 0) {
    return res.status(400).json({ mensaje: 'Seleccione al menos una asignación' });
  }

  const ok = [];
  const errores = [];
  for (const id of ids) {
    try {
      const actual = await AsignacionExpediente.findByPk(id);
      if (!actual) throw errorConEstado('Asignación no encontrada');
      await accion(actual, req.body, req.user.id);
      ok.push(id);
    } catch (error) {
      errores.push({ id, mensaje: error.message });
    }
  }
  res.json({ total: ids.length, ok, errores });
};

exports.prorrogar = accionIndividual(solicitarProrroga);
exports.aceptarProrroga = accionIndividual(aceptarProrrogaPendiente);
exports.rechazarProrroga = accionIndividual(rechazarProrrogaPendiente);
exports.prorrogarMasivo = accionMasiva(solicitarProrroga);
exports.aceptarProrrogaMasivo = accionMasiva(aceptarProrrogaPendiente);
exports.rechazarProrrogaMasivo = accionMasiva(rechazarProrrogaPendiente);

exports.obtenerHistorial = async (req, res) => {
  try {
    const asignacion = await AsignacionExpediente.findByPk(req.params.id, { attributes: ['id', 'id_usuario'] });
    if (!asignacion || !puedeVerAsignacion(asignacion, req.user)) {
      return res.status(404).json({ mensaje: 'Asignación no encontrada' });
    }
    const historial = await HistorialAsignacion.findAll({
      where: { id_asignacion: req.params.id },
      include: [{ model: Usuario, as: 'usuario', attributes: ['id', 'nombre', 'apellido', 'usuario'] }],
      order: [['id', 'ASC']],
    });
    res.json(historial);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

exports.eliminar = async (req, res) => {
  try {
    const actual = await AsignacionExpediente.findByPk(req.params.id);
    if (!actual) {
      return res.status(404).json({ mensaje: 'Asignación no encontrada' });
    }
    await actual.update({ estado: false, id_usuario_modificador: req.user.id });
    res.json({ mensaje: 'Asignación desactivada exitosamente' });
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

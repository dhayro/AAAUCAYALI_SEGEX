const { Op } = require('sequelize');
const AsignacionExpediente = require('../models/AsignacionExpediente');
const HistorialAsignacion = require('../models/HistorialAsignacion');
const Usuario = require('../models/Usuario');
const Cargo = require('../models/Cargo');
const { hoyLima, esFechaValida, sumarDiasCalendario } = require('../utils/fechas');

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

    res.json({
      asignaciones: rows,
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
    if (!asignacion) {
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

exports.prorrogar = async (req, res) => {
  try {
    const actual = await AsignacionExpediente.findByPk(req.params.id);
    if (!actual) {
      return res.status(404).json({ mensaje: 'Asignación no encontrada' });
    }

    if (actual.estado_prorroga === 'PENDIENTE') {
      return res.status(400).json({ mensaje: 'Ya hay una prórroga pendiente de aceptación' });
    }
    if (actual.estado_prorroga === 'ACEPTADA') {
      return res.status(400).json({ mensaje: 'La asignación ya tiene una prórroga aceptada' });
    }

    const plazo = parsePlazo(req.body.plazo_prorroga);
    const hoy = hoyLima();

    await actual.update({
      fecha_prorroga: hoy,
      plazo_prorroga: plazo,
      estado_prorroga: 'PENDIENTE',
      fecha_vencimiento_prorroga: null,
      id_usuario_modificador: req.user.id,
    });
    await HistorialAsignacion.create({
      id_asignacion: actual.id,
      tipo: 'SOLICITUD_PRORROGA',
      plazo,
      fecha_evento: hoy,
      id_usuario: req.user.id,
    });

    res.json(await obtenerConRelaciones(actual.id));
  } catch (error) {
    res.status(400).json({ mensaje: error.message });
  }
};

exports.aceptarProrroga = async (req, res) => {
  try {
    const actual = await AsignacionExpediente.findByPk(req.params.id);
    if (!actual) {
      return res.status(404).json({ mensaje: 'Asignación no encontrada' });
    }
    if (actual.estado_prorroga !== 'PENDIENTE') {
      return res.status(400).json({ mensaje: 'No hay una prórroga pendiente para aceptar' });
    }

    const plazo = req.body.plazo_prorroga !== undefined
      ? parsePlazo(req.body.plazo_prorroga)
      : actual.plazo_prorroga;
    const hoy = hoyLima();

    await actual.update({
      plazo_prorroga: plazo,
      estado_prorroga: 'ACEPTADA',
      fecha_vencimiento_prorroga: sumarDiasCalendario(actual.fecha_vencimiento, plazo),
      id_usuario_modificador: req.user.id,
    });
    await HistorialAsignacion.create({
      id_asignacion: actual.id,
      tipo: 'PRORROGA_ACEPTADA',
      plazo,
      fecha_evento: hoy,
      observacion: normalizarTexto(req.body.observacion),
      id_usuario: req.user.id,
    });

    res.json(await obtenerConRelaciones(actual.id));
  } catch (error) {
    res.status(400).json({ mensaje: error.message });
  }
};

exports.rechazarProrroga = async (req, res) => {
  try {
    const actual = await AsignacionExpediente.findByPk(req.params.id);
    if (!actual) {
      return res.status(404).json({ mensaje: 'Asignación no encontrada' });
    }
    if (actual.estado_prorroga !== 'PENDIENTE') {
      return res.status(400).json({ mensaje: 'No hay una prórroga pendiente para rechazar' });
    }
    const motivo = normalizarTexto(req.body.observacion);
    if (!motivo) {
      return res.status(400).json({ mensaje: 'Debe indicar el motivo del rechazo' });
    }

    await actual.update({
      estado_prorroga: 'RECHAZADA',
      fecha_vencimiento_prorroga: null,
      id_usuario_modificador: req.user.id,
    });
    await HistorialAsignacion.create({
      id_asignacion: actual.id,
      tipo: 'PRORROGA_RECHAZADA',
      plazo: actual.plazo_prorroga,
      fecha_evento: hoyLima(),
      observacion: motivo,
      id_usuario: req.user.id,
    });

    res.json(await obtenerConRelaciones(actual.id));
  } catch (error) {
    res.status(400).json({ mensaje: error.message });
  }
};

exports.obtenerHistorial = async (req, res) => {
  try {
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

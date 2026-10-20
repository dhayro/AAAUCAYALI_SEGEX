const { Op } = require('sequelize');
const AsignacionExpediente = require('../models/AsignacionExpediente');
const Expediente = require('../models/Expediente');
const Usuario = require('../models/Usuario');
const { hoyLima, esFechaValida, sumarDiasHabiles } = require('../utils/diasHabiles');

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
  { model: Expediente, attributes: ['id', 'cut', 'asunto'], required: false },
  { model: Usuario, as: 'asignado', attributes: ['id', 'nombre', 'apellido', 'usuario'], required: false },
  { model: Usuario, as: 'creador', attributes: ['id', 'nombre', 'apellido', 'usuario'], required: false },
  { model: Usuario, as: 'modificador', attributes: ['id', 'nombre', 'apellido', 'usuario'], required: false },
];

const obtenerConRelaciones = (id) => AsignacionExpediente.findByPk(id, { include: includes });

const usuarioExiste = async (idUsuario) => {
  const id = parseInt(idUsuario, 10);
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
    const { cut, id_usuario, estado } = req.query;

    const whereClause = {};
    if (id_usuario) whereClause.id_usuario = parseInt(id_usuario, 10);
    if (estado !== undefined && estado !== '') whereClause.estado = parseBoolean(estado);

    const include = includes.map((inc) => ({ ...inc }));
    if (cut) {
      include[0].where = { cut: { [Op.like]: `%${normalizarTexto(cut)}%` } };
      include[0].required = true;
    }

    const { count, rows } = await AsignacionExpediente.findAndCountAll({
      where: whereClause,
      include,
      limit,
      offset,
      distinct: true,
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
      return res.status(400).json({ mensaje: 'El CUT del expediente es obligatorio' });
    }
    const expediente = await Expediente.findOne({ where: { cut } });
    if (!expediente) {
      return res.status(404).json({ mensaje: 'No existe un expediente con ese CUT' });
    }

    const idUsuario = await usuarioExiste(req.body.id_usuario);
    const plazo = parsePlazo(req.body.plazo_atencion);
    const fechaAsignacion = req.body.fecha_asignacion ? parseFecha(req.body.fecha_asignacion) : hoyLima();

    const nueva = await AsignacionExpediente.create({
      id_expediente: expediente.id,
      id_usuario: idUsuario,
      fecha_asignacion: fechaAsignacion,
      plazo_atencion: plazo,
      fecha_vencimiento: sumarDiasHabiles(fechaAsignacion, plazo),
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
    if (req.body.id_usuario !== undefined) cambios.id_usuario = await usuarioExiste(req.body.id_usuario);
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
    cambios.fecha_vencimiento = sumarDiasHabiles(fechaAsignacion, plazo);
    if (actual.plazo_prorroga) {
      cambios.fecha_vencimiento_prorroga = sumarDiasHabiles(cambios.fecha_vencimiento, actual.plazo_prorroga);
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

    const plazoProrroga = parsePlazo(req.body.plazo_prorroga);
    const fechaProrroga = req.body.fecha_prorroga ? parseFecha(req.body.fecha_prorroga) : hoyLima();

    await actual.update({
      fecha_prorroga: fechaProrroga,
      plazo_prorroga: plazoProrroga,
      fecha_vencimiento_prorroga: sumarDiasHabiles(actual.fecha_vencimiento, plazoProrroga),
      id_usuario_modificador: req.user.id,
    });

    res.json(await obtenerConRelaciones(actual.id));
  } catch (error) {
    res.status(400).json({ mensaje: error.message });
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

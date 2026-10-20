const { Op } = require('sequelize');
const Procedimiento = require('../models/Procedimiento');
const Usuario = require('../models/Usuario');

const parseBoolean = (value) => value === true || value === 'true' || value === 1 || value === '1';

const usuarioInclude = [
  { model: Usuario, as: 'creador', attributes: ['id', 'nombre', 'apellido', 'usuario'], required: false },
  { model: Usuario, as: 'modificador', attributes: ['id', 'nombre', 'apellido', 'usuario'], required: false },
];

const MENSAJE_DUPLICADO = 'Ya existe un procedimiento con ese nombre y tipo';

const validarYNormalizar = (data) => {
  const normalized = {};
  if (data.nombre !== undefined) {
    normalized.nombre = String(data.nombre).trim().toUpperCase();
  }
  if (data.plazo !== undefined) {
    const plazo = parseInt(data.plazo, 10);
    if (isNaN(plazo) || plazo < 0) {
      throw new Error('El plazo debe ser un número entero mayor o igual a 0');
    }
    normalized.plazo = plazo;
  }
  if (data.es_tupa !== undefined) {
    normalized.es_tupa = parseBoolean(data.es_tupa);
  }
  return normalized;
};

const obtenerConUsuarios = (id) => Procedimiento.findByPk(id, { include: usuarioInclude });

exports.obtenerTodos = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const { filtro, estado } = req.query;

    const whereClause = {};
    if (filtro) {
      whereClause.nombre = { [Op.like]: `%${String(filtro).trim()}%` };
    }
    if (estado !== undefined && estado !== '') {
      whereClause.estado = parseBoolean(estado);
    }

    const { count, rows } = await Procedimiento.findAndCountAll({
      where: whereClause,
      include: usuarioInclude,
      limit,
      offset,
      order: [['id', 'ASC']]
    });

    res.json({
      procedimientos: rows,
      totalProcedimientos: count,
      totalPaginas: Math.ceil(count / limit),
      paginaActual: page
    });
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

exports.obtenerPorId = async (req, res) => {
  try {
    const procedimiento = await obtenerConUsuarios(req.params.id);
    if (!procedimiento) {
      return res.status(404).json({ mensaje: 'Procedimiento no encontrado' });
    }
    res.json(procedimiento);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

exports.crear = async (req, res) => {
  try {
    const datos = validarYNormalizar(req.body);
    if (!datos.nombre || datos.plazo === undefined) {
      return res.status(400).json({ mensaje: 'El nombre y el plazo son obligatorios' });
    }
    datos.es_tupa = datos.es_tupa ?? false;

    const existente = await Procedimiento.findOne({
      where: { nombre: datos.nombre, es_tupa: datos.es_tupa }
    });

    if (existente && existente.estado) {
      return res.status(409).json({ mensaje: MENSAJE_DUPLICADO });
    }

    if (existente) {
      await existente.update({
        plazo: datos.plazo,
        estado: true,
        id_usuario_modificador: req.user.id,
      });
      const reactivado = await obtenerConUsuarios(existente.id);
      return res.json({ ...reactivado.toJSON(), mensaje: 'Procedimiento reactivado' });
    }

    const nuevo = await Procedimiento.create({
      ...datos,
      estado: true,
      id_usuario_creador: req.user.id,
      id_usuario_modificador: req.user.id,
    });
    res.status(201).json(await obtenerConUsuarios(nuevo.id));
  } catch (error) {
    res.status(400).json({ mensaje: error.message });
  }
};

exports.actualizar = async (req, res) => {
  try {
    const actual = await Procedimiento.findByPk(req.params.id);
    if (!actual) {
      return res.status(404).json({ mensaje: 'Procedimiento no encontrado' });
    }

    const datos = validarYNormalizar(req.body);
    const nombre = datos.nombre ?? actual.nombre;
    const esTupa = datos.es_tupa ?? actual.es_tupa;

    const duplicado = await Procedimiento.findOne({
      where: { nombre, es_tupa: esTupa, id: { [Op.ne]: actual.id } }
    });
    if (duplicado) {
      return res.status(409).json({ mensaje: MENSAJE_DUPLICADO });
    }

    await actual.update({ ...datos, id_usuario_modificador: req.user.id });
    res.json(await obtenerConUsuarios(actual.id));
  } catch (error) {
    res.status(400).json({ mensaje: error.message });
  }
};

exports.eliminar = async (req, res) => {
  try {
    const procedimiento = await Procedimiento.findByPk(req.params.id);
    if (!procedimiento) {
      return res.status(404).json({ mensaje: 'Procedimiento no encontrado' });
    }
    await procedimiento.update({ estado: false, id_usuario_modificador: req.user.id });
    res.json({ mensaje: 'Procedimiento desactivado exitosamente' });
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

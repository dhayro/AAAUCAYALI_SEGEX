const { Op } = require('sequelize');
const Procedimiento = require('../models/Procedimiento');

const parseEsTupa = (value) => value === true || value === 'true' || value === 1 || value === '1';

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
    normalized.es_tupa = parseEsTupa(data.es_tupa);
  }
  return normalized;
};

exports.obtenerTodos = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const { filtro } = req.query;

    const whereClause = filtro
      ? { nombre: { [Op.like]: `%${String(filtro).trim()}%` } }
      : {};

    const { count, rows } = await Procedimiento.findAndCountAll({
      where: whereClause,
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
    const procedimiento = await Procedimiento.findByPk(req.params.id);
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
    const nuevo = await Procedimiento.create(validarYNormalizar(req.body));
    res.status(201).json(nuevo);
  } catch (error) {
    res.status(400).json({ mensaje: error.message });
  }
};

exports.actualizar = async (req, res) => {
  try {
    const [actualizado] = await Procedimiento.update(validarYNormalizar(req.body), {
      where: { id: req.params.id }
    });
    if (!actualizado) {
      return res.status(404).json({ mensaje: 'Procedimiento no encontrado' });
    }
    const procedimiento = await Procedimiento.findByPk(req.params.id);
    res.json(procedimiento);
  } catch (error) {
    res.status(400).json({ mensaje: error.message });
  }
};

exports.eliminar = async (req, res) => {
  try {
    const eliminado = await Procedimiento.destroy({ where: { id: req.params.id } });
    if (!eliminado) {
      return res.status(404).json({ mensaje: 'Procedimiento no encontrado' });
    }
    res.json({ mensaje: 'Procedimiento eliminado exitosamente' });
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

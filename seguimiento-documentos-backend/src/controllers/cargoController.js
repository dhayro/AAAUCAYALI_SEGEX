const { Op } = require('sequelize');
const Cargo = require('../models/Cargo');

exports.obtenerTodosLosCargos = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const { nombre, descripcion, filtro } = req.query;

    let whereClause = {};

    if (filtro) {
      whereClause[Op.or] = [
        { nombre: { [Op.like]: `%${filtro}%` } },
        { descripcion: { [Op.like]: `%${filtro}%` } }
      ];
    } else {
      if (nombre) {
        whereClause.nombre = { [Op.like]: `%${nombre}%` };
      }

      if (descripcion) {
        whereClause.descripcion = { [Op.like]: `%${descripcion}%` };
      }
    }

    const { count, rows } = await Cargo.findAndCountAll({
      where: whereClause,
      limit: limit,
      offset: offset,
      order: [['id', 'ASC']]
    });

    res.json({
      cargos: rows,
      totalCargos: count,
      totalPaginas: Math.ceil(count / limit),
      paginaActual: page
    });
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

exports.obtenerCargoPorId = async (req, res) => {
  try {
    const cargo = await Cargo.findByPk(req.params.id);
    if (cargo) {
      res.json(cargo);
    } else {
      res.status(404).json({ mensaje: 'Cargo no encontrado' });
    }
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

exports.crearCargo = async (req, res) => {
  try {
    const nuevoCargo = await Cargo.create(req.body);
    res.status(201).json(nuevoCargo);
  } catch (error) {
    res.status(400).json({ mensaje: error.message });
  }
};

exports.actualizarCargo = async (req, res) => {
  try {
    const actualizado = await Cargo.update(req.body, {
      where: { id: req.params.id }
    });
    if (actualizado[0] === 1) {
      res.json({ mensaje: 'Cargo actualizado exitosamente' });
    } else {
      res.status(404).json({ mensaje: 'Cargo no encontrado' });
    }
  } catch (error) {
    res.status(400).json({ mensaje: error.message });
  }
};

exports.eliminarCargo = async (req, res) => {
  try {
    const eliminado = await Cargo.destroy({
      where: { id: req.params.id }
    });
    if (eliminado) {
      res.json({ mensaje: 'Cargo eliminado exitosamente' });
    } else {
      res.status(404).json({ mensaje: 'Cargo no encontrado' });
    }
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};
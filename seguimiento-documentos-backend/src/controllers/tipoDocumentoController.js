const TipoDocumento = require('../models/TipoDocumento');
const { Op } = require('sequelize'); // Import Op from Sequelize

// Obtener todos los tipos de documento con paginación y filtros
exports.obtenerTodos = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { nombre, descripcion, filtro } = req.query;

    // Build the where clause for filtering
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

    const { count, rows } = await TipoDocumento.findAndCountAll({
      where: whereClause,
      limit: limit,
      offset: offset,
      order: [['id', 'ASC']]
    });

    res.json({
      tiposDocumento: rows,
      totalTiposDocumento: count,
      totalPaginas: Math.ceil(count / limit),
      paginaActual: page
    });
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

// Obtener un tipo de documento por ID
exports.obtenerPorId = async (req, res) => {
  try {
    const tipoDocumento = await TipoDocumento.findByPk(req.params.id);
    if (tipoDocumento) {
      res.json(tipoDocumento);
    } else {
      res.status(404).json({ mensaje: 'Tipo de documento no encontrado' });
    }
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

// Crear un nuevo tipo de documento
exports.crear = async (req, res) => {
  try {
    const nuevoTipo = await TipoDocumento.create(req.body);
    res.status(201).json(nuevoTipo);
  } catch (error) {
    res.status(400).json({ mensaje: error.message });
  }
};

// Actualizar un tipo de documento
exports.actualizar = async (req, res) => {
  try {
    const [actualizado] = await TipoDocumento.update(req.body, {
      where: { id: req.params.id }
    });
    if (actualizado) {
      const tipoActualizado = await TipoDocumento.findByPk(req.params.id);
      res.json(tipoActualizado);
    } else {
      res.status(404).json({ mensaje: 'Tipo de documento no encontrado' });
    }
  } catch (error) {
    res.status(400).json({ mensaje: error.message });
  }
};

// Eliminar un tipo de documento
exports.eliminar = async (req, res) => {
  try {
    const eliminado = await TipoDocumento.destroy({
      where: { id: req.params.id }
    });
    if (eliminado) {
      res.json({ mensaje: 'Tipo de documento eliminado exitosamente' });
    } else {
      res.status(404).json({ mensaje: 'Tipo de documento no encontrado' });
    }
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};
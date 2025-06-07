const AsignacionDocumento = require('../models/AsignacionDocumento');

exports.getAllAsignaciones = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { count, rows } = await AsignacionDocumento.findAndCountAll({
      limit: limit,
      offset: offset,
      order: [['id', 'ASC']]
    });

    res.json({
      asignaciones: rows,
      totalAsignaciones: count,
      totalPaginas: Math.ceil(count / limit),
      paginaActual: page
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAsignacionById = async (req, res) => {
  try {
    const asignacion = await AsignacionDocumento.findByPk(req.params.id);
    if (asignacion) {
      res.json(asignacion);
    } else {
      res.status(404).json({ message: 'Asignación no encontrada' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createAsignacion = async (req, res) => {
  try {
    const nuevaAsignacion = await AsignacionDocumento.create(req.body);
    res.status(201).json(nuevaAsignacion);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.updateAsignacion = async (req, res) => {
  try {
    const [updated] = await AsignacionDocumento.update(req.body, {
      where: { id: req.params.id }
    });
    if (updated) {
      const updatedAsignacion = await AsignacionDocumento.findByPk(req.params.id);
      res.json(updatedAsignacion);
    } else {
      res.status(404).json({ message: 'Asignación no encontrada' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteAsignacion = async (req, res) => {
  try {
    const deleted = await AsignacionDocumento.destroy({
      where: { id: req.params.id }
    });
    if (deleted) {
      res.json({ message: 'Asignación eliminada' });
    } else {
      res.status(404).json({ message: 'Asignación no encontrada' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
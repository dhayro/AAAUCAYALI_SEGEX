const RespuestaDocumento = require('../models/RespuestaDocumento');

exports.getAllRespuestas = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { count, rows } = await RespuestaDocumento.findAndCountAll({
      limit: limit,
      offset: offset,
      order: [['id', 'ASC']]
    });

    res.json({
      respuestas: rows,
      totalRespuestas: count,
      totalPaginas: Math.ceil(count / limit),
      paginaActual: page
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getRespuestaById = async (req, res) => {
  try {
    const respuesta = await RespuestaDocumento.findByPk(req.params.id);
    if (respuesta) {
      res.json(respuesta);
    } else {
      res.status(404).json({ message: 'Respuesta no encontrada' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createRespuesta = async (req, res) => {
  try {
    const nuevaRespuesta = await RespuestaDocumento.create(req.body);
    res.status(201).json(nuevaRespuesta);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.updateRespuesta = async (req, res) => {
  try {
    const [updated] = await RespuestaDocumento.update(req.body, {
      where: { id: req.params.id }
    });
    if (updated) {
      const updatedRespuesta = await RespuestaDocumento.findByPk(req.params.id);
      res.json(updatedRespuesta);
    } else {
      res.status(404).json({ message: 'Respuesta no encontrada' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteRespuesta = async (req, res) => {
  try {
    const deleted = await RespuestaDocumento.destroy({
      where: { id: req.params.id }
    });
    if (deleted) {
      res.json({ message: 'Respuesta eliminada' });
    } else {
      res.status(404).json({ message: 'Respuesta no encontrada' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
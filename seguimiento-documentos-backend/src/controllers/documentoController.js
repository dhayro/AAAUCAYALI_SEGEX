const Documento = require('../models/Documento');

exports.getAllDocumentos = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { count, rows } = await Documento.findAndCountAll({
      limit: limit,
      offset: offset,
      order: [['id', 'ASC']]
    });

    res.json({
      documentos: rows,
      totalDocumentos: count,
      totalPaginas: Math.ceil(count / limit),
      paginaActual: page
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getDocumentoById = async (req, res) => {
  try {
    const documento = await Documento.findByPk(req.params.id);
    if (documento) {
      res.json(documento);
    } else {
      res.status(404).json({ message: 'Documento no encontrado' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createDocumento = async (req, res) => {
  try {
    const nuevoDocumento = await Documento.create(req.body);
    res.status(201).json(nuevoDocumento);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.updateDocumento = async (req, res) => {
  try {
    const [updated] = await Documento.update(req.body, {
      where: { id: req.params.id }
    });
    if (updated) {
      const updatedDocumento = await Documento.findByPk(req.params.id);
      res.json(updatedDocumento);
    } else {
      res.status(404).json({ message: 'Documento no encontrado' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteDocumento = async (req, res) => {
  try {
    const deleted = await Documento.destroy({
      where: { id: req.params.id }
    });
    if (deleted) {
      res.json({ message: 'Documento eliminado' });
    } else {
      res.status(404).json({ message: 'Documento no encontrado' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
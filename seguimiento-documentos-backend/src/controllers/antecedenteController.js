const Antecedente = require('../models/Antecedente');

exports.createAntecedente = async (req, res) => {
  try {
    const antecedente = await Antecedente.create(req.body);
    res.status(201).json(antecedente);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getAllAntecedentes = async (req, res) => {
    try {
      const { id_expediente } = req.query; // Assuming the expediente ID is passed as a query parameter
      if (!id_expediente) {
        return res.status(400).json({ message: 'El ID del expediente es requerido' });
      }
  
      const antecedentes = await Antecedente.findAll({
        where: { id_expediente }
      });
  
      res.json(antecedentes);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };

exports.getAntecedenteById = async (req, res) => {
  try {
    const antecedente = await Antecedente.findByPk(req.params.id);
    if (antecedente) {
      res.json(antecedente);
    } else {
      res.status(404).json({ message: 'Antecedente no encontrado' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateAntecedente = async (req, res) => {
  try {
    const [updated] = await Antecedente.update(req.body, {
      where: { id: req.params.id }
    });
    if (updated) {
      const updatedAntecedente = await Antecedente.findByPk(req.params.id);
      res.json(updatedAntecedente);
    } else {
      res.status(404).json({ message: 'Antecedente no encontrado' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteAntecedente = async (req, res) => {
  try {
    const deleted = await Antecedente.destroy({
      where: { id: req.params.id }
    });
    if (deleted) {
      res.json({ message: 'Antecedente eliminado' });
    } else {
      res.status(404).json({ message: 'Antecedente no encontrado' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
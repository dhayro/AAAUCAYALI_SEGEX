const { Op } = require('sequelize');
const sequelize = require('../config/database'); // Asegúrate de que esta ruta sea correcta
const Expediente = require('../models/Expediente');
const TipoDocumento = require('../models/TipoDocumento');
const { formatDateForLima } = require('../utils/dateUtils');

exports.getAllExpedientes = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const cut = req.query.cut ? req.query.cut.trim() : null;
    const asunto = req.query.asunto ? req.query.asunto.trim() : null;
    const remitente = req.query.remitente ? req.query.remitente.trim() : null;
    const documento = req.query.documento ? req.query.documento.trim() : null;
    const filtro = req.query.filtro ? req.query.filtro.trim() : null;

    let whereClause = {};

    if (filtro) {
      whereClause[Op.or] = [
        { cut: { [Op.like]: `%${filtro}%` } },
        { asunto: { [Op.like]: `%${filtro}%` } },
        { remitente: { [Op.like]: `%${remitente}%` } },
        { '$TipoDocumento.nombre$': { [Op.like]: `%${filtro}%` } },
        { numero_documento: { [Op.like]: `%${filtro}%` } }
      ];
    } else {
      if (cut) {
        whereClause.cut = { [Op.like]: `%${cut}%` };
      }
      if (asunto) {
        whereClause.asunto = { [Op.like]: `%${asunto}%` };
      }
      if (remitente) {
        whereClause.remitente = { [Op.like]: `%${remitente}%` };
      }
      if (documento) {
        whereClause[Op.or] = [
          { '$TipoDocumento.nombre$': { [Op.like]: `%${documento}%` } },
          { numero_documento: { [Op.like]: `%${documento}%` } }
        ];
      }
    }

    const { count, rows } = await Expediente.findAndCountAll({
      where: whereClause,
      include: [{
        model: TipoDocumento,
        as: 'TipoDocumento', // Ensure this matches the alias used in your associations
        attributes: ['id', 'nombre', 'descripcion'] // Include the TipoDocumento attributes you want to return
      }],
      limit: limit,
      offset: offset,
      order: [['id', 'ASC']]
    });

    res.json({
      expedientes: rows,
      totalExpedientes: count,
      totalPaginas: Math.ceil(count / limit),
      paginaActual: page
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getExpedienteById = async (req, res) => {
  try {
    const expediente = await Expediente.findByPk(req.params.id, {
            include: [{
              model: TipoDocumento,
              as: 'TipoDocumento', // This matches the alias used in the association
            }]
          });
    if (expediente) {
      res.json(expediente);
    } else {
      res.status(404).json({ message: 'Expediente no encontrado' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// exports.getExpedienteById = async (req, res) => {
//   try {
//     const expediente = await Expediente.findByPk(req.params.id, {
//       include: [{
//         model: TipoDocumento,
//         as: 'TipoDocumento', // This matches the alias used in the association
//       }]
//     });

//     if (expediente) {
//       res.json({
//         expediente: expediente,
//         tipoDocumento: expediente.TipoDocumento // Include the associated TipoDocumento
//       });
//     } else {
//       res.status(404).json({ message: 'Expediente no encontrado' });
//     }
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

exports.createExpediente = async (req, res) => {
  try {
    const { cut, numero_documento, fecha_creacion, ...otherData } = req.body;

    // Check if an expediente with the same cut already exists
    const existingExpediente = await Expediente.findOne({ where: { cut } });
    if (existingExpediente) {
      return res.status(200).json({
        alert: 'El expediente con este CUT ya existe',
        id: existingExpediente.id
      });
    }

    // Check if the beginning of numero_documento matches any tipo_documento
    const tiposDocumentos = await TipoDocumento.findAll();
    let id_tipo_documento = null;
    let updatedNumeroDocumento = numero_documento;

    // Sort tiposDocumentos by the length of the name in descending order
    tiposDocumentos.sort((a, b) => b.nombre.length - a.nombre.length);

    for (const tipo of tiposDocumentos) {
      const tipoNombre = tipo.nombre.toUpperCase();
      if (numero_documento.toUpperCase().startsWith(tipoNombre)) {
        id_tipo_documento = tipo.id;
        updatedNumeroDocumento = numero_documento.substring(tipoNombre.length).trim();
        break;
      }
    }

    // Formatear la fecha de creación para Lima o usar la fecha actual
    const formattedDate = formatDateForLima(fecha_creacion || new Date());

    // Create a new expediente if the cut does not exist
    const nuevoExpediente = await Expediente.create({
      cut,
      numero_documento: updatedNumeroDocumento,
      id_tipo_documento,
      fecha_creacion: formattedDate,
      ...otherData
    });

    res.status(201).json(nuevoExpediente);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.updateExpediente = async (req, res) => {
  try {
    const [updated] = await Expediente.update(req.body, {
      where: { id: req.params.id }
    });
    if (updated) {
      const updatedExpediente = await Expediente.findByPk(req.params.id);
      res.json(updatedExpediente);
    } else {
      res.status(404).json({ message: 'Expediente no encontrado' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteExpediente = async (req, res) => {
  try {
    const deleted = await Expediente.destroy({
      where: { id: req.params.id }
    });
    if (deleted) {
      res.json({ message: 'Expediente eliminado' });
    } else {
      res.status(404).json({ message: 'Expediente no encontrado' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getUniqueProcedimientos = async (req, res) => {
  try {
    // Obtener todos los tipos de procedimientos únicos
    const procedimientos = await Expediente.findAll({
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('tipo_procedimiento')), 'tipo_procedimiento']],
      order: [['tipo_procedimiento', 'ASC']]
    });

    // Extraer solo los nombres de los procedimientos
    const uniqueProcedimientos = procedimientos.map(proc => proc.tipo_procedimiento);

    res.json(uniqueProcedimientos);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
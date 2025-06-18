const RespuestaDocumento = require('../models/RespuestaDocumento');
const AsignacionDocumento = require('../models/AsignacionDocumento');
const Documento = require('../models/Documento');
const Usuario = require('../models/Usuario');
const TipoDocumento = require('../models/TipoDocumento');
const Expediente = require('../models/Expediente');
const { Op } = require('sequelize');

exports.getAllRespuestas = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Opciones de consulta base
    const queryOptions = {
      limit: limit,
      offset: offset,
      order: [['id', 'ASC']],
      include: [
        {
          model: AsignacionDocumento,
          as: 'AsignacionDocumento', // Ensure this alias matches your model association
          include: [
            {
              model: Documento,
              attributes: ['id', 'numero_documento', 'asunto', 'fecha_documento', 'estado'],
              include: [
                {
                  model: TipoDocumento,
                  as: 'TipoDocumento',
                  attributes: ['id', 'nombre']
                },
                {
                  model: Expediente,
                  as: 'Expediente',
                  attributes: ['id', 'cut', 'asunto', 'remitente', 'fecha_creacion', 'estado']
                }
              ],
            },
            {
              model: Usuario,
              as: 'asignado',
              attributes: ['id', 'nombre', 'apellido', 'usuario', 'email', 'perfil']
            }
          ]
        }
      ],
      where: {
        estado: 1 // Filter responses with estado = 1
      }
    };

    // Add filtering based on query parameters
    const { id_asignacion, filtro, cut, documento, usuario } = req.query;
    let whereClause = {};

    if (id_asignacion) {
      whereClause.id_asignacion = id_asignacion;
    }

    if (filtro) {
      whereClause[Op.or] = [
        { '$AsignacionDocumento.Documento.numero_documento$': { [Op.like]: `%${filtro}%` } },
        { '$AsignacionDocumento.Documento.asunto$': { [Op.like]: `%${filtro}%` } },
        { '$AsignacionDocumento.Documento.TipoDocumento.nombre$': { [Op.like]: `%${filtro}%` } },
        { '$AsignacionDocumento.Documento.Expediente.cut$': { [Op.like]: `%${filtro}%` } },
        { '$AsignacionDocumento.Documento.Expediente.asunto$': { [Op.like]: `%${filtro}%` } },
        { '$AsignacionDocumento.Documento.Expediente.remitente$': { [Op.like]: `%${filtro}%` } },
        { '$AsignacionDocumento.asignado.nombre$': { [Op.like]: `%${filtro}%` } },
        { '$AsignacionDocumento.asignado.apellido$': { [Op.like]: `%${filtro}%` } },
        { '$AsignacionDocumento.asignado.usuario$': { [Op.like]: `%${filtro}%` } }
      ];
    } else {
      if (cut) {
        whereClause['$AsignacionDocumento.Documento.Expediente.cut$'] = { [Op.like]: `%${cut}%` };
      }
      if (documento) {
        whereClause[Op.or] = [
          { '$AsignacionDocumento.Documento.TipoDocumento.nombre$': { [Op.like]: `%${documento}%` } },
          { '$AsignacionDocumento.Documento.numero_documento$': { [Op.like]: `%${documento}%` } }
        ];
      }
      if (usuario) {
        whereClause[Op.or] = [
          { '$AsignacionDocumento.asignado.nombre$': { [Op.like]: `%${usuario}%` } },
          { '$AsignacionDocumento.asignado.apellido$': { [Op.like]: `%${usuario}%` } }
        ];
      }
    }

    // Log the whereClause for debugging
    console.log('whereClause:', whereClause);

    // Merge whereClause into queryOptions.where
    queryOptions.where = {
      ...queryOptions.where,
      ...whereClause
    };

    // Log the final queryOptions for debugging
    console.log('queryOptions:', queryOptions);

    const { count, rows } = await RespuestaDocumento.findAndCountAll(queryOptions);

    res.json({
      respuestas: rows,
      totalRespuestas: count,
      totalPaginas: Math.ceil(count / limit),
      paginaActual: page
    });
  } catch (error) {
    console.error('Error al obtener respuestas:', error);
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

exports.cambiarEstadoRespuesta = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    // Validate that estado is provided
    if (estado === undefined) {
      return res.status(400).json({ message: 'Se requiere proporcionar un estado' });
    }

    // Find the respuesta by ID
    const respuesta = await RespuestaDocumento.findByPk(id);
    if (!respuesta) {
      return res.status(404).json({ message: 'Respuesta no encontrada' });
    }

    // Update the estado
    respuesta.estado = estado;

    // Save the changes
    await respuesta.save();

    res.json({
      message: 'Estado de la respuesta actualizado exitosamente',
      respuesta: {
        id: respuesta.id,
        estado: respuesta.estado
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
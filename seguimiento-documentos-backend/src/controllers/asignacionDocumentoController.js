const AsignacionDocumento = require('../models/AsignacionDocumento');
const Usuario = require('../models/Usuario');
const Documento = require('../models/Documento');
const TipoDocumento = require('../models/TipoDocumento');
const Expediente = require('../models/Expediente');
const { Op } = require('sequelize'); // Asegúrate de importar Op desde sequelize
const sequelize = require('../config/database'); // Import the sequelize instance



exports.getAllAsignaciones = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    // Opciones de consulta base
    const queryOptions = {
      limit: limit,
      offset: offset,
      order: [
        [sequelize.literal('CASE WHEN fecha_prorroga_limite IS NOT NULL THEN fecha_prorroga_limite ELSE fecha_limite END'), 'ASC']
      ],
      where: {
        estado: true 
      },
      include: [
        {
          model: Usuario,
          as: 'asignado',
          attributes: ['id', 'nombre', 'apellido', 'usuario', 'email', 'perfil']
        },
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
          as: 'creador',
          attributes: ['id', 'nombre', 'apellido', 'usuario']
        }
      ]
    };
    
    // Filtrar por perfil de usuario
    if (req.user) {
      if (req.user.perfil === 'personal') {
        queryOptions.where.id_asignado = req.user.id;
      }
    }

    // Add filtering based on query parameters
    const { cut, remitente, documento, usuario, filtro } = req.query;

    let whereClause = {};

    if (filtro) {
      whereClause[Op.or] = [
        { '$Documento.numero_documento$': { [Op.like]: `%${filtro}%` } },
        { '$Documento.asunto$': { [Op.like]: `%${filtro}%` } },
        { '$Documento.TipoDocumento.nombre$': { [Op.like]: `%${filtro}%` } },
        { '$Documento.Expediente.cut$': { [Op.like]: `%${filtro}%` } },
        { '$Documento.Expediente.asunto$': { [Op.like]: `%${filtro}%` } },
        { '$Documento.Expediente.remitente$': { [Op.like]: `%${filtro}%` } },
        { '$asignado.nombre$': { [Op.like]: `%${filtro}%` } },
        { '$asignado.apellido$': { [Op.like]: `%${filtro}%` } },
        { '$asignado.usuario$': { [Op.like]: `%${filtro}%` } }
      ];
    } else {
      if (cut) {
        whereClause['$Documento.Expediente.cut$'] = { [Op.like]: `%${cut}%` };
      }
      if (remitente) {
        whereClause['$Documento.Expediente.remitente$'] = { [Op.like]: `%${remitente}%` };
      }
      if (documento) {
        whereClause[Op.or] = [
          { '$Documento.TipoDocumento.nombre$': { [Op.like]: `%${documento}%` } },
          { '$Documento.numero_documento$': { [Op.like]: `%${documento}%` } }
        ];
      }
      if (usuario) {
        whereClause[Op.or] = [
          { '$asignado.nombre$': { [Op.like]: `%${usuario}%` } },
          { '$asignado.apellido$': { [Op.like]: `%${usuario}%` } }
        ];
      }
    }

    // Merge whereClause into queryOptions.where
    queryOptions.where = {
      ...queryOptions.where,
      ...whereClause
    };

    const { count, rows } = await AsignacionDocumento.findAndCountAll(queryOptions);

    res.json({
      asignaciones: rows,
      totalAsignaciones: count,
      totalPaginas: Math.ceil(count / limit),
      paginaActual: page
    });
  } catch (error) {
    console.error('Error al obtener asignaciones:', error);
    res.status(500).json({ message: error.message });
  }
};


exports.getAsignacionesConProrrogaPendiente = async (req, res) => {
  try {
    // Check if the user has the right profile
    if (!['admin', 'jefe', 'secretaria'].includes(req.user.perfil)) {
      return res.status(403).json({ message: 'Acceso prohibido' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Opciones de consulta base
    const queryOptions = {
      limit: limit,
      offset: offset,
      order: [['id', 'ASC']],
      where: {
        estado: true,
        fecha_prorroga: { [Op.ne]: null },
        fecha_prorroga_limite: null
      },
      include: [
        {
          model: Usuario,
          as: 'asignado',
          attributes: ['id', 'nombre', 'apellido', 'usuario', 'email', 'perfil']
        },
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
          as: 'creador',
          attributes: ['id', 'nombre', 'apellido', 'usuario']
        }
      ]
    };

    // Add filtering based on query parameters
    const { cut, remitente, documento, usuario, filtro } = req.query;

    let whereClause = {};

    if (filtro) {
      whereClause[Op.or] = [
        { '$Documento.numero_documento$': { [Op.like]: `%${filtro}%` } },
        { '$Documento.asunto$': { [Op.like]: `%${filtro}%` } },
        { '$Documento.TipoDocumento.nombre$': { [Op.like]: `%${filtro}%` } },
        { '$Documento.Expediente.cut$': { [Op.like]: `%${filtro}%` } },
        { '$Documento.Expediente.asunto$': { [Op.like]: `%${filtro}%` } },
        { '$Documento.Expediente.remitente$': { [Op.like]: `%${filtro}%` } },
        { '$asignado.nombre$': { [Op.like]: `%${filtro}%` } },
        { '$asignado.apellido$': { [Op.like]: `%${filtro}%` } },
        { '$asignado.usuario$': { [Op.like]: `%${filtro}%` } }
      ];
    } else {
      if (cut) {
        whereClause['$Documento.Expediente.cut$'] = { [Op.like]: `%${cut}%` };
      }
      if (remitente) {
        whereClause['$Documento.Expediente.remitente$'] = { [Op.like]: `%${remitente}%` };
      }
      if (documento) {
        whereClause[Op.or] = [
          { '$Documento.TipoDocumento.nombre$': { [Op.like]: `%${documento}%` } },
          { '$Documento.numero_documento$': { [Op.like]: `%${documento}%` } }
        ];
      }
      if (usuario) {
        whereClause[Op.or] = [
          { '$asignado.nombre$': { [Op.like]: `%${usuario}%` } },
          { '$asignado.apellido$': { [Op.like]: `%${usuario}%` } }
        ];
      }
    }

    // Merge whereClause into queryOptions.where
    queryOptions.where = {
      ...queryOptions.where,
      ...whereClause
    };

    const { count, rows } = await AsignacionDocumento.findAndCountAll(queryOptions);

    res.json({
      asignaciones: rows,
      totalAsignaciones: count,
      totalPaginas: Math.ceil(count / limit),
      paginaActual: page
    });
  } catch (error) {
    console.error('Error al obtener asignaciones con prórroga pendiente:', error);
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
    // Obtener los datos del cuerpo de la solicitud
    const datosAsignacion = { ...req.body };
    
    // Establecer la fecha de asignación como la fecha actual
    datosAsignacion.fecha_asignacion = new Date();
    
    // Calcular la fecha límite sumando días hábiles (excluyendo sábados y domingos)
    const plazoRespuesta = parseInt(datosAsignacion.plazo_respuesta);
    if (isNaN(plazoRespuesta) || plazoRespuesta <= 0) {
      return res.status(400).json({ message: 'El plazo de respuesta debe ser un número positivo' });
    }
    
    // Función para calcular la fecha límite excluyendo fines de semana
    const fechaLimite = calcularFechaLimite(datosAsignacion.fecha_asignacion, plazoRespuesta);
    datosAsignacion.fecha_limite = fechaLimite;
    
    // Crear la asignación con los datos calculados
    const nuevaAsignacion = await AsignacionDocumento.create(datosAsignacion);
    
    // Registrar el usuario que creó la asignación
    if (req.user && req.user.id) {
      nuevaAsignacion.id_usuario_creador = req.user.id;
      await nuevaAsignacion.save();
    }
    
    res.status(201).json(nuevaAsignacion);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.createAsignacionCalendario = async (req, res) => {
  try {
    // Obtener los datos del cuerpo de la solicitud
    const datosAsignacion = { ...req.body };
    
    // Establecer la fecha de asignación como la fecha actual
    datosAsignacion.fecha_asignacion = new Date();
    
    // Calcular la fecha límite sumando días calendario (incluyendo sábados y domingos)
    const plazoRespuesta = parseInt(datosAsignacion.plazo_respuesta);
    if (isNaN(plazoRespuesta) || plazoRespuesta <= 0) {
      return res.status(400).json({ message: 'El plazo de respuesta debe ser un número positivo' });
    }
    
    // Función para calcular la fecha límite incluyendo fines de semana (días calendario)
    const fechaLimite = calcularFechaLimiteCalendario(datosAsignacion.fecha_asignacion, plazoRespuesta);
    datosAsignacion.fecha_limite = fechaLimite;
    
    // Crear la asignación con los datos calculados
    const nuevaAsignacion = await AsignacionDocumento.create(datosAsignacion);
    
    // Registrar el usuario que creó la asignación
    if (req.user && req.user.id) {
      nuevaAsignacion.id_usuario_creador = req.user.id;
      await nuevaAsignacion.save();
    }
    
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

exports.cambiarEstadoAsignacion = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    // Validar que se proporcione un estado
    if (estado === undefined) {
      return res.status(400).json({ message: 'Se requiere proporcionar un estado' });
    }

    // Buscar la asignación
    const asignacion = await AsignacionDocumento.findByPk(id);
    if (!asignacion) {
      return res.status(404).json({ message: 'Asignación no encontrada' });
    }

    // Actualizar el estado de la asignación
    asignacion.estado = estado;

    // Registrar el usuario que modificó la asignación
    if (req.user && req.user.id) {
      asignacion.id_usuario_modificador = req.user.id;
    }

    // Guardar los cambios
    await asignacion.save();

    res.json({ 
      message: 'Estado de la asignación actualizado exitosamente',
      asignacion: {
        id: asignacion.id,
        estado: asignacion.estado
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.solicitarProrroga = async (req, res) => {
  try {
    const { id } = req.params;
    const { plazo_prorroga } = req.body;

    // Validar que se proporcione un plazo de prórroga válido
    if (plazo_prorroga === undefined || plazo_prorroga <= 0) {
      return res.status(400).json({ message: 'Se requiere proporcionar un plazo de prórroga válido' });
    }

    // Buscar la asignación
    const asignacion = await AsignacionDocumento.findByPk(id);
    if (!asignacion) {
      return res.status(404).json({ message: 'Asignación no encontrada' });
    }

    // Actualizar el campo de solicitud de prórroga
    asignacion.plazo_prorroga = plazo_prorroga;
    asignacion.fecha_prorroga = new Date(); // Registrar la fecha actual como fecha de solicitud


    // Registrar el usuario que solicitó la prórroga
    if (req.user && req.user.id) {
      asignacion.id_usuario_modificador = req.user.id;
    }

    // Guardar los cambios
    await asignacion.save();

    res.json({ 
      message: 'Prórroga solicitada exitosamente',
      asignacion: {
        id: asignacion.id,
        plazo_prorroga: asignacion.plazo_prorroga,
        fecha_prorroga: asignacion.fecha_prorroga
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.aceptarProrroga = async (req, res) => {
  try {
    const { id } = req.params;
    const { nuevo_plazo_prorroga } = req.body;

    // Validar que se proporcione un nuevo plazo de prórroga válido
    if (nuevo_plazo_prorroga === undefined || nuevo_plazo_prorroga <= 0) {
      return res.status(400).json({ message: 'Se requiere proporcionar un nuevo plazo de prórroga válido' });
    }

    // Buscar la asignación
    const asignacion = await AsignacionDocumento.findByPk(id);
    if (!asignacion) {
      return res.status(404).json({ message: 'Asignación no encontrada' });
    }

    // Calcular la nueva fecha límite con prórroga
    const nuevaFechaLimite = calcularFechaLimite(asignacion.fecha_limite, nuevo_plazo_prorroga);

    // Actualizar los campos de prórroga de la asignación
    asignacion.plazo_prorroga = nuevo_plazo_prorroga;
    asignacion.fecha_prorroga_limite = nuevaFechaLimite;

    // Registrar el usuario que aceptó la prórroga
    if (req.user && req.user.id) {
      asignacion.id_usuario_modificador = req.user.id;
    }

    // Guardar los cambios
    await asignacion.save();

    res.json({ 
      message: 'Prórroga aceptada y plazo actualizado exitosamente',
      asignacion: {
        id: asignacion.id,
        plazo_prorroga: asignacion.plazo_prorroga,
        fecha_prorroga_limite: asignacion.fecha_prorroga_limite
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.aceptarProrrogaCalendario = async (req, res) => {
  try {
    const { id } = req.params;
    const { nuevo_plazo_prorroga } = req.body;

    // Validar que se proporcione un nuevo plazo de prórroga válido
    if (nuevo_plazo_prorroga === undefined || nuevo_plazo_prorroga <= 0) {
      return res.status(400).json({ message: 'Se requiere proporcionar un nuevo plazo de prórroga válido' });
    }

    // Buscar la asignación
    const asignacion = await AsignacionDocumento.findByPk(id);
    if (!asignacion) {
      return res.status(404).json({ message: 'Asignación no encontrada' });
    }

    // Calcular la nueva fecha límite con prórroga usando días calendario
    const nuevaFechaLimite = calcularFechaLimiteCalendario(asignacion.fecha_limite, nuevo_plazo_prorroga);

    // Actualizar los campos de prórroga de la asignación
    asignacion.plazo_prorroga = nuevo_plazo_prorroga;
    asignacion.fecha_prorroga_limite = nuevaFechaLimite;

    // Registrar el usuario que aceptó la prórroga
    if (req.user && req.user.id) {
      asignacion.id_usuario_modificador = req.user.id;
    }

    // Guardar los cambios
    await asignacion.save();

    res.json({ 
      message: 'Prórroga con días calendario aceptada y plazo actualizado exitosamente',
      asignacion: {
        id: asignacion.id,
        plazo_prorroga: asignacion.plazo_prorroga,
        fecha_prorroga_limite: asignacion.fecha_prorroga_limite
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getPendientesAsignacionesByDocumentoId = async (req, res) => {
  try {
    const { documentoId } = req.params; // Obtener el ID del documento de los parámetros de la solicitud

    const pendientesCount = await AsignacionDocumento.count({
      where: {
        id_documento: documentoId, // Filtrar por el ID del documento
        estado: true // Asumiendo que 'true' representa el estado pendiente
      }
    });

    res.json({
      message: 'Número de asignaciones pendientes para el documento obtenido exitosamente',
      pendientes: pendientesCount
    });
  } catch (error) {
    console.error('Error al obtener asignaciones pendientes para el documento:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Calcula la fecha límite sumando días hábiles (excluyendo sábados y domingos)
 * @param {Date} fechaInicio - Fecha de inicio
 * @param {Number} diasHabiles - Número de días hábiles a sumar
 * @returns {Date} - Fecha límite resultante
 */
function calcularFechaLimite(fechaInicio, diasHabiles) {
  // Crear una copia de la fecha de inicio para no modificar la original
  const fecha = new Date(fechaInicio);
  let diasAgregados = 0;
  
  // Seguir agregando días hasta alcanzar el número de días hábiles requerido
  while (diasAgregados < diasHabiles) {
    // Avanzar un día
    fecha.setDate(fecha.getDate() + 1);
    
    // Verificar si es día hábil (no es sábado ni domingo)
    const diaSemana = fecha.getDay(); // 0 es domingo, 6 es sábado
    if (diaSemana !== 0 && diaSemana !== 6) {
      diasAgregados++;
    }
  }
  
  return fecha;
}

/**
 * Calcula la fecha límite sumando días calendario (incluyendo sábados y domingos)
 * @param {Date} fechaInicio - Fecha de inicio
 * @param {Number} diasCalendario - Número de días calendario a sumar
 * @returns {Date} - Fecha límite resultante
 */
function calcularFechaLimiteCalendario(fechaInicio, diasCalendario) {
  // Crear una copia de la fecha de inicio para no modificar la original
  const fecha = new Date(fechaInicio);
  
  // Simplemente sumar los días calendario a la fecha
  fecha.setDate(fecha.getDate() + diasCalendario);
  
  return fecha;
}
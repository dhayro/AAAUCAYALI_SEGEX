const AsignacionDocumento = require('../models/AsignacionDocumento');
const Usuario = require('../models/Usuario');
const Documento = require('../models/Documento');
const TipoDocumento = require('../models/TipoDocumento');
const Expediente = require('../models/Expediente');


exports.getAllAsignaciones = async (req, res) => {
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
              attributes: ['id', 'cut', 'asunto']
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
      // Si el usuario tiene perfil 'personal', solo mostrar sus asignaciones
      if (req.user.perfil === 'personal') {
        queryOptions.where = {
          id_asignado: req.user.id
        };
      }
      // Los perfiles 'admin', 'jefe' y 'secretaria' pueden ver todas las asignaciones
      // por lo que no necesitan filtro adicional
    }

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
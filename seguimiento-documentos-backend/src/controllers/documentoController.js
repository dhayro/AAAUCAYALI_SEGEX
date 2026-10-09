const Documento = require('../models/Documento');
const TipoDocumento = require('../models/TipoDocumento'); // Asegúrate de importar el modelo de TipoDocumento
const { formatDateForLima } = require('../utils/dateUtils');

const normalizeDocumentoData = (data) => {
  const normalized = { ...data };
  const fieldsToUppercase = ['numero_documento', 'asunto', 'ultimo_escritorio', 'ultima_oficina_area', 'bandeja', 'estado'];
  fieldsToUppercase.forEach((field) => {
    if (normalized[field]) {
      normalized[field] = String(normalized[field]).trim().toUpperCase();
    }
  });
  return normalized;
};

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
    const documento = await Documento.findByPk(req.params.id, {
      include: [{
        model: TipoDocumento,
        as: 'TipoDocumento', // This matches the alias used in the association
      }]
    });
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
    const { numero_documento, fecha_documento, ...otherData } = req.body;
    const normalizedData = normalizeDocumentoData(otherData);
    const normalizedNumeroDocumento = String(numero_documento).trim().toUpperCase();

    let id_tipo_documento = req.body.id_tipo_documento || null;
    let updatedNumeroDocumento = normalizedNumeroDocumento;

    // Si no se proporcionó un id_tipo_documento, intentar detectarlo automáticamente
    if (!id_tipo_documento && numero_documento) {
      const tiposDocumentos = await TipoDocumento.findAll();
      tiposDocumentos.sort((a, b) => b.nombre.length - a.nombre.length);

      for (const tipo of tiposDocumentos) {
        const tipoNombre = tipo.nombre.toUpperCase();
        if (normalizedNumeroDocumento.startsWith(tipoNombre)) {
          id_tipo_documento = tipo.id;
          updatedNumeroDocumento = normalizedNumeroDocumento.substring(tipoNombre.length).trim();
          console.log(`Tipo de documento detectado: ${tipo.nombre} (ID: ${tipo.id})`);
          break;
        }
      }
    }
    let formattedDate = null;
    if (fecha_documento) {
      formattedDate = formatDateForLima(fecha_documento || new Date());
    }

    const nuevoDocumento = await Documento.create({
      ...normalizedData,
      numero_documento: updatedNumeroDocumento,
      id_tipo_documento: id_tipo_documento,
      fecha_documento: formattedDate
    });

    res.status(201).json(nuevoDocumento);
  } catch (error) {
    console.error('Error al crear documento:', error);
    res.status(400).json({ message: error.message });
  }
};

exports.updateDocumento = async (req, res) => {
  try {
    const { fecha_documento, ...otherData } = req.body;
    const normalizedData = normalizeDocumentoData(otherData);
    const formattedDate = formatDateForLima(fecha_documento || new Date());

    const [updated] = await Documento.update(
      { ...normalizedData, fecha_documento: formattedDate },
      {
        where: { id: req.params.id }
      }
    );

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

exports.getDocumentosByExpedienteId = async (req, res) => {
  try {
    const expedienteId = req.params.expedienteId;
    
    const documentos = await Documento.findAll({
      where: {
        id_expediente: expedienteId
      },
      include: [{
        model: TipoDocumento,
        as: 'TipoDocumento', // This matches the alias used in the association
      }],
      order: [['id', 'ASC']]
    });
    
    res.json(documentos);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.actualizarEstadoDocumento = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    
    // Validar que se proporcione un estado
    if (estado === undefined) {
      return res.status(400).json({ message: 'Se requiere proporcionar un estado' });
    }
    
    // Buscar el documento
    const documento = await Documento.findByPk(id);
    if (!documento) {
      return res.status(404).json({ message: 'Documento no encontrado' });
    }
    
    // Actualizar el estado del documento
    documento.estado = estado;
    
    // Registrar el usuario que modificó el documento
    if (req.user && req.user.id) {
      documento.id_usuario_modificador = req.user.id;
    }
    
    // Guardar los cambios
    await documento.save();
    
    res.json({ 
      message: 'Estado del documento actualizado exitosamente',
      documento: {
        id: documento.id,
        estado: documento.estado
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
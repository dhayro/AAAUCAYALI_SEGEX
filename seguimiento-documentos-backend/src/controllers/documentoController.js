const Documento = require('../models/Documento');
const TipoDocumento = require('../models/TipoDocumento'); // Asegúrate de importar el modelo de TipoDocumento
const { formatDateForLima } = require('../utils/dateUtils');

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
    const { numero_documento, fecha_documento, ...otherData } = req.body;
    let id_tipo_documento = req.body.id_tipo_documento || null; // Mantener el id_tipo_documento si ya viene en el body
    let updatedNumeroDocumento = numero_documento;

    // Si no se proporcionó un id_tipo_documento, intentar detectarlo automáticamente
    if (!id_tipo_documento && numero_documento) {
      // Obtener todos los tipos de documentos
      const tiposDocumentos = await TipoDocumento.findAll();

      // Ordenar tiposDocumentos por la longitud del nombre en orden descendente
      tiposDocumentos.sort((a, b) => b.nombre.length - a.nombre.length);

      for (const tipo of tiposDocumentos) {
        const tipoNombre = tipo.nombre.toUpperCase();
        if (numero_documento.toUpperCase().startsWith(tipoNombre)) {
          id_tipo_documento = tipo.id;
          updatedNumeroDocumento = numero_documento.substring(tipoNombre.length).trim();
          console.log(`Tipo de documento detectado: ${tipo.nombre} (ID: ${tipo.id})`);
          break;
        }
      }
    }

    const formattedDate = formatDateForLima(fecha_documento || new Date());

    // Crear el nuevo documento con el id_tipo_documento, el número de documento actualizado y la fecha procesada
    const nuevoDocumento = await Documento.create({
      ...otherData,
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
    const formattedDate = formatDateForLima(fecha_documento || new Date());

    const [updated] = await Documento.update(
      { ...otherData, fecha_documento: formattedDate },
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
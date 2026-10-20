const { Op } = require('sequelize');
const sequelize = require('../config/database');
const Expediente = require('../models/Expediente');
const Documento = require('../models/Documento');
const Usuario = require('../models/Usuario');
const { convertirFechaSisged } = require('../utils/fechas');
const sisgedSyncService = require('../services/sisgedSyncService');

const CAMPOS_TEXTO = ['cut', 'origen', 'destip', 'estupa', 'proced', 'asunto', 'refe', 'destinos', 'ndoc', 'usurem', 'ofirem', 'tema'];
const CAMPOS_ENTERO = ['idoc', 'fol', 'flgcut', 'flgarc'];

const normalizeExpedienteData = (data) => {
  const normalized = {};
  CAMPOS_TEXTO.forEach((campo) => {
    if (data[campo] !== undefined) {
      normalized[campo] = data[campo] === null ? null : String(data[campo]).trim().toUpperCase();
    }
  });
  CAMPOS_ENTERO.forEach((campo) => {
    if (data[campo] !== undefined) {
      normalized[campo] = data[campo] === null || data[campo] === '' ? null : parseInt(data[campo], 10);
    }
  });
  return normalized;
};

const incluirUsuarios = [
  { model: Usuario, as: 'creador', attributes: ['id', 'nombre', 'apellido', 'usuario'], required: false },
  { model: Usuario, as: 'modificador', attributes: ['id', 'nombre', 'apellido', 'usuario'], required: false },
];

exports.getAllExpedientes = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const { cut, filtro, estado } = req.query;

    const whereClause = {};
    if (estado !== undefined && estado !== '') {
      whereClause.estado = estado === 'true' || estado === '1';
    } else {
      whereClause.estado = true;
    }

    if (filtro) {
      const termino = `%${String(filtro).trim()}%`;
      whereClause[Op.or] = [
        { cut: { [Op.like]: termino } },
        { asunto: { [Op.like]: termino } },
        { ndoc: { [Op.like]: termino } },
        { usurem: { [Op.like]: termino } },
        { proced: { [Op.like]: termino } },
        { destinos: { [Op.like]: termino } },
      ];
    } else if (cut) {
      whereClause.cut = { [Op.like]: `%${String(cut).trim()}%` };
    }

    const { count, rows } = await Expediente.findAndCountAll({
      where: whereClause,
      include: incluirUsuarios,
      limit,
      offset,
      order: [['id', 'ASC']],
    });

    res.json({
      expedientes: rows,
      totalExpedientes: count,
      totalPaginas: Math.ceil(count / limit),
      paginaActual: page,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.buscarPorCut = async (req, res) => {
  try {
    const cut = String(req.params.cut).trim().toUpperCase();

    const local = await Expediente.findOne({ where: { cut }, include: incluirUsuarios });
    if (local) {
      return res.json({ origen: 'LOCAL', expediente: local });
    }

    const datos = await sisgedSyncService.obtenerDatosDeSISGED('general', { NRO_CUT: cut });
    const coincidencias = (Array.isArray(datos) ? datos.flat() : [])
      .filter((item) => String(item.ncut || '').trim().toUpperCase() === cut);
    if (coincidencias.length === 0) {
      return res.status(404).json({ mensaje: 'No se encontró el CUT en SISGED' });
    }

    await sisgedSyncService.importarExpedientesABD(coincidencias, sequelize.models, req.user.id);

    const guardado = await Expediente.findOne({ where: { cut }, include: incluirUsuarios });
    if (!guardado) {
      return res.status(500).json({ mensaje: 'No se pudo guardar el expediente obtenido de SISGED' });
    }
    res.json({ origen: 'SISGED', expediente: guardado });
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

exports.getExpedienteById = async (req, res) => {
  try {
    const expediente = await Expediente.findByPk(req.params.id, { include: incluirUsuarios });
    if (expediente) {
      res.json(expediente);
    } else {
      res.status(404).json({ message: 'Expediente no encontrado' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createExpediente = async (req, res) => {
  try {
    const datos = normalizeExpedienteData(req.body);
    if (!datos.idoc || !datos.cut) {
      return res.status(400).json({ message: 'El idoc y el CUT son obligatorios' });
    }

    const existente = await Expediente.findOne({
      where: { [Op.or]: [{ cut: datos.cut }, { idoc: datos.idoc }] },
    });
    if (existente) {
      return res.status(200).json({
        alert: 'El expediente con este CUT o idoc ya existe',
        id: existente.id,
      });
    }

    const nuevo = await Expediente.create({
      ...datos,
      feccrea: convertirFechaSisged(req.body.feccrea),
      solfec: convertirFechaSisged(req.body.solfec),
      solhor: req.body.solhor || null,
      estado: true,
      id_usuario_creador: req.user.id,
      id_usuario_modificador: req.user.id,
    });

    res.status(201).json(nuevo);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.updateExpediente = async (req, res) => {
  try {
    const datos = normalizeExpedienteData(req.body);
    if (req.body.feccrea !== undefined) datos.feccrea = convertirFechaSisged(req.body.feccrea);
    if (req.body.solfec !== undefined) datos.solfec = convertirFechaSisged(req.body.solfec);
    if (req.body.solhor !== undefined) datos.solhor = req.body.solhor || null;
    datos.id_usuario_modificador = req.user.id;

    const [updated] = await Expediente.update(datos, { where: { id: req.params.id } });
    if (updated) {
      const expediente = await Expediente.findByPk(req.params.id, { include: incluirUsuarios });
      await Expediente.vincularAsignaciones(expediente);
      res.json(expediente);
    } else {
      res.status(404).json({ message: 'Expediente no encontrado' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteExpediente = async (req, res) => {
  try {
    await sequelize.models.AsignacionExpediente.update(
      { id_expediente: null },
      { where: { id_expediente: req.params.id } }
    );
    const deleted = await Expediente.destroy({ where: { id: req.params.id } });
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
    const procedimientos = await Expediente.findAll({
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('proced')), 'proced']],
      where: { proced: { [Op.ne]: null } },
      order: [['proced', 'ASC']],
    });
    res.json(procedimientos.map((p) => p.proced));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getDocumentosRelacionados = async (req, res) => {
  try {
    const expedienteId = req.params.id;
    const { numero_documento, id_tipo_documento } = req.query;

    const expediente = await Expediente.findByPk(expedienteId);
    if (!expediente) {
      return res.status(404).json({ message: 'Expediente no encontrado' });
    }

    const documentoRelacionado = await Documento.findOne({
      where: {
        id_expediente: expedienteId,
        numero_documento,
        id_tipo_documento,
      },
    });

    res.json(documentoRelacionado);
  } catch (error) {
    console.error('Error al buscar documentos relacionados:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.cambiarEstadoExpediente = async (req, res) => {
  try {
    const { id } = req.params;
    const estado = req.body.estado === true || req.body.estado === 'true' || req.body.estado === 1;

    if (!estado) {
      const documentosNoTerminados = await Documento.count({
        where: { id_expediente: id, estado: { [Op.ne]: 'TERMINADO' } },
      });
      if (documentosNoTerminados > 0) {
        return res.json({
          message: 'expediente no puede ser cambiado a estado "false" porque hay documentos no terminados',
          expediente: id,
        });
      }
    }

    const [updated] = await Expediente.update(
      { estado, id_usuario_modificador: req.user.id },
      { where: { id } }
    );
    if (!updated) {
      return res.status(404).json({ message: 'Expediente no encontrado' });
    }

    res.json({
      message: 'Estado del expediente actualizado exitosamente',
      expediente: await Expediente.findByPk(id, { include: incluirUsuarios }),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

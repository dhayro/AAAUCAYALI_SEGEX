const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');
const AccionAtencion = require('../models/AccionAtencion');
const LlamadaAdministrado = require('../models/LlamadaAdministrado');
const AccionLlamada = require('../models/AccionLlamada');
const ArchivoAccion = require('../models/ArchivoAccion');
const Expediente = require('../models/Expediente');
const Usuario = require('../models/Usuario');

const CARPETA_ARCHIVOS = path.join(__dirname, '../../uploads/atenciones');
fs.mkdirSync(CARPETA_ARCHIVOS, { recursive: true });

const PERFILES_GESTION = ['admin', 'jefe', 'secretaria'];
const esGestor = (usuario) => PERFILES_GESTION.includes(usuario.perfil);

const textoMayuscula = (valor) => {
  if (valor === undefined || valor === null) return null;
  const limpio = String(valor).trim().toUpperCase();
  return limpio === '' ? null : limpio;
};

const parseBoolean = (valor) => valor === true || valor === 'true' || valor === 1 || valor === '1';

const errorConEstado = (mensaje) => Object.assign(new Error(mensaje), { status: 400 });

const puedeVerLlamada = (llamada, usuario) =>
  esGestor(usuario) || llamada.id_responsable === usuario.id || llamada.id_usuario_creador === usuario.id;

const puedeOperarLlamada = (llamada, usuario) =>
  esGestor(usuario) || llamada.id_responsable === usuario.id;

const includesLlamada = [
  { model: Usuario, as: 'responsable', attributes: ['id', 'nombre', 'apellido', 'usuario'] },
  { model: Usuario, as: 'creador', attributes: ['id', 'nombre', 'apellido', 'usuario'] },
  {
    model: AccionLlamada,
    as: 'acciones',
    include: [
      { model: AccionAtencion, as: 'accion', attributes: ['id', 'nombre', 'requiere_archivo'] },
      { model: ArchivoAccion, as: 'archivos', attributes: ['id', 'nombre_original', 'mimetype', 'tamano', 'fecha_subida', 'id_usuario'] },
    ],
  },
];

const obtenerLlamada = (id) => LlamadaAdministrado.findByPk(id, { include: includesLlamada });

const idsAccionesValidas = async (acciones) => {
  const ids = acciones.map((a) => parseInt(a.id_accion, 10));
  if (ids.some((id) => isNaN(id))) throw errorConEstado('Acción no válida');
  const encontradas = await AccionAtencion.findAll({ where: { id: ids, activo: true }, attributes: ['id'] });
  if (encontradas.length !== new Set(ids).size) throw errorConEstado('Alguna acción no existe o está inactiva');
  return ids;
};

// ---------- Catálogo de acciones ----------

exports.listarAcciones = async (req, res) => {
  try {
    const where = parseBoolean(req.query.solo_activas) ? { activo: true } : {};
    const acciones = await AccionAtencion.findAll({ where, order: [['nombre', 'ASC']] });
    res.json(acciones);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

exports.crearAccion = async (req, res) => {
  try {
    const nombre = textoMayuscula(req.body.nombre);
    if (!nombre) throw errorConEstado('El nombre de la acción es obligatorio');
    const nueva = await AccionAtencion.create({
      nombre,
      requiere_archivo: parseBoolean(req.body.requiere_archivo),
      activo: req.body.activo === undefined ? true : parseBoolean(req.body.activo),
    });
    res.status(201).json(nueva);
  } catch (error) {
    res.status(error.status || 400).json({ mensaje: error.message });
  }
};

exports.actualizarAccion = async (req, res) => {
  try {
    const cambios = {};
    if (req.body.nombre !== undefined) cambios.nombre = textoMayuscula(req.body.nombre);
    if (req.body.requiere_archivo !== undefined) cambios.requiere_archivo = parseBoolean(req.body.requiere_archivo);
    if (req.body.activo !== undefined) cambios.activo = parseBoolean(req.body.activo);
    const [actualizado] = await AccionAtencion.update(cambios, { where: { id: req.params.id } });
    if (!actualizado) return res.status(404).json({ mensaje: 'Acción no encontrada' });
    res.json(await AccionAtencion.findByPk(req.params.id));
  } catch (error) {
    res.status(400).json({ mensaje: error.message });
  }
};

// ---------- Llamadas ----------

exports.listarLlamadas = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const where = {};
    if (req.query.cut) where.cut = { [Op.like]: `%${textoMayuscula(req.query.cut)}%` };
    if (req.query.respondido !== undefined && req.query.respondido !== '') {
      where.respondido = parseBoolean(req.query.respondido);
    }
    if (!esGestor(req.user)) {
      where[Op.or] = [{ id_responsable: req.user.id }, { id_usuario_creador: req.user.id }];
    }

    const { count, rows } = await LlamadaAdministrado.findAndCountAll({
      where,
      include: [
        { model: Usuario, as: 'responsable', attributes: ['id', 'nombre', 'apellido', 'usuario'] },
        { model: Usuario, as: 'creador', attributes: ['id', 'nombre', 'apellido', 'usuario'] },
      ],
      order: [['fecha_llamada', 'DESC'], ['id', 'DESC']],
      limit,
      offset: (page - 1) * limit,
      distinct: true,
    });

    res.json({ llamadas: rows, totalLlamadas: count, totalPaginas: Math.ceil(count / limit), paginaActual: page });
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

exports.obtenerLlamada = async (req, res) => {
  try {
    const llamada = await obtenerLlamada(req.params.id);
    if (!llamada || !puedeVerLlamada(llamada, req.user)) {
      return res.status(404).json({ mensaje: 'Llamada no encontrada' });
    }
    res.json(llamada);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

exports.crearLlamada = async (req, res) => {
  try {
    const cut = textoMayuscula(req.body.cut);
    const nombreLlamante = textoMayuscula(req.body.nombre_llamante);
    const motivo = textoMayuscula(req.body.motivo);
    if (!cut) throw errorConEstado('El CUT es obligatorio');
    if (!nombreLlamante) throw errorConEstado('El nombre de quien llama es obligatorio');
    if (!motivo) throw errorConEstado('El motivo es obligatorio');

    const fechaLlamada = req.body.fecha_llamada ? new Date(req.body.fecha_llamada) : new Date();
    if (isNaN(fechaLlamada)) throw errorConEstado('La fecha de la llamada no es válida');

    let idResponsable = req.user.id;
    if (req.body.id_responsable !== undefined && esGestor(req.user)) {
      idResponsable = parseInt(req.body.id_responsable, 10);
      const existe = await Usuario.findByPk(idResponsable, { attributes: ['id'] });
      if (!existe) throw errorConEstado('El usuario responsable no existe');
    }

    const acciones = Array.isArray(req.body.acciones) ? req.body.acciones : [];
    const idsAcciones = acciones.length ? await idsAccionesValidas(acciones) : [];

    const expediente = await Expediente.findOne({ where: { cut }, attributes: ['id'] });

    const llamada = await LlamadaAdministrado.create({
      cut,
      id_expediente: expediente ? expediente.id : null,
      fecha_llamada: fechaLlamada,
      nombre_llamante: nombreLlamante,
      telefono: req.body.telefono ? String(req.body.telefono).trim() : null,
      motivo,
      fecha_respuesta: req.body.fecha_respuesta || null,
      respondido: parseBoolean(req.body.respondido),
      id_responsable: idResponsable,
      id_usuario_creador: req.user.id,
      id_usuario_modificador: req.user.id,
    });

    for (let i = 0; i < idsAcciones.length; i++) {
      await AccionLlamada.create({
        id_llamada: llamada.id,
        id_accion: idsAcciones[i],
        observacion: textoMayuscula(acciones[i].observacion),
        estado: 'PENDIENTE',
        id_usuario_creador: req.user.id,
        id_usuario_modificador: req.user.id,
      });
    }

    res.status(201).json(await obtenerLlamada(llamada.id));
  } catch (error) {
    res.status(error.status || 400).json({ mensaje: error.message });
  }
};

exports.actualizarLlamada = async (req, res) => {
  try {
    const llamada = await LlamadaAdministrado.findByPk(req.params.id);
    if (!llamada || !puedeVerLlamada(llamada, req.user)) {
      return res.status(404).json({ mensaje: 'Llamada no encontrada' });
    }
    if (!puedeOperarLlamada(llamada, req.user) && llamada.id_usuario_creador !== req.user.id) {
      return res.status(403).json({ mensaje: 'No puede modificar esta llamada' });
    }

    const cambios = { id_usuario_modificador: req.user.id };
    if (req.body.fecha_llamada !== undefined) cambios.fecha_llamada = new Date(req.body.fecha_llamada);
    if (req.body.nombre_llamante !== undefined) cambios.nombre_llamante = textoMayuscula(req.body.nombre_llamante);
    if (req.body.telefono !== undefined) cambios.telefono = req.body.telefono ? String(req.body.telefono).trim() : null;
    if (req.body.motivo !== undefined) cambios.motivo = textoMayuscula(req.body.motivo);
    if (req.body.fecha_respuesta !== undefined) cambios.fecha_respuesta = req.body.fecha_respuesta || null;
    if (req.body.respondido !== undefined) cambios.respondido = parseBoolean(req.body.respondido);

    await llamada.update(cambios);
    res.json(await obtenerLlamada(llamada.id));
  } catch (error) {
    res.status(400).json({ mensaje: error.message });
  }
};

exports.reasignarLlamada = async (req, res) => {
  try {
    const llamada = await LlamadaAdministrado.findByPk(req.params.id);
    if (!llamada) return res.status(404).json({ mensaje: 'Llamada no encontrada' });
    const idResponsable = parseInt(req.body.id_responsable, 10);
    const usuario = await Usuario.findByPk(idResponsable, { attributes: ['id'] });
    if (!usuario) return res.status(400).json({ mensaje: 'El usuario responsable no existe' });

    await llamada.update({ id_responsable: idResponsable, id_usuario_modificador: req.user.id });
    res.json(await obtenerLlamada(llamada.id));
  } catch (error) {
    res.status(400).json({ mensaje: error.message });
  }
};

// ---------- Acciones de la llamada ----------

const llamadaDeAccion = async (idAccionLlamada) => {
  const accion = await AccionLlamada.findByPk(idAccionLlamada);
  if (!accion) return { accion: null, llamada: null };
  const llamada = await LlamadaAdministrado.findByPk(accion.id_llamada);
  return { accion, llamada };
};

exports.agregarAccion = async (req, res) => {
  try {
    const llamada = await LlamadaAdministrado.findByPk(req.params.id);
    if (!llamada || !puedeVerLlamada(llamada, req.user)) {
      return res.status(404).json({ mensaje: 'Llamada no encontrada' });
    }
    if (!puedeOperarLlamada(llamada, req.user)) {
      return res.status(403).json({ mensaje: 'Solo el responsable puede agregar acciones' });
    }
    const [idAccion] = await idsAccionesValidas([{ id_accion: req.body.id_accion }]);
    await AccionLlamada.create({
      id_llamada: llamada.id,
      id_accion: idAccion,
      observacion: textoMayuscula(req.body.observacion),
      estado: 'PENDIENTE',
      id_usuario_creador: req.user.id,
      id_usuario_modificador: req.user.id,
    });
    res.status(201).json(await obtenerLlamada(llamada.id));
  } catch (error) {
    res.status(error.status || 400).json({ mensaje: error.message });
  }
};

exports.actualizarAccionLlamada = async (req, res) => {
  try {
    const { accion, llamada } = await llamadaDeAccion(req.params.id);
    if (!accion || !llamada || !puedeVerLlamada(llamada, req.user)) {
      return res.status(404).json({ mensaje: 'Acción no encontrada' });
    }
    if (!puedeOperarLlamada(llamada, req.user)) {
      return res.status(403).json({ mensaje: 'Solo el responsable puede actualizar esta acción' });
    }

    const cambios = { id_usuario_modificador: req.user.id };
    if (req.body.estado !== undefined) {
      const estado = String(req.body.estado).toUpperCase();
      if (!['PENDIENTE', 'EJECUTADO'].includes(estado)) throw errorConEstado('Estado no válido');
      if (estado === 'EJECUTADO') {
        const catalogo = await AccionAtencion.findByPk(accion.id_accion, { attributes: ['requiere_archivo'] });
        if (catalogo.requiere_archivo) {
          const archivos = await ArchivoAccion.count({ where: { id_accion_llamada: accion.id } });
          if (archivos === 0) throw errorConEstado('Esta acción requiere al menos un archivo de avance antes de marcarla como ejecutada');
        }
        cambios.fecha_ejecucion = req.body.fecha_ejecucion || new Date().toISOString().slice(0, 10);
      } else {
        cambios.fecha_ejecucion = null;
      }
      cambios.estado = estado;
    }
    if (req.body.observacion !== undefined) cambios.observacion = textoMayuscula(req.body.observacion);

    await accion.update(cambios);
    res.json(await obtenerLlamada(llamada.id));
  } catch (error) {
    res.status(error.status || 400).json({ mensaje: error.message });
  }
};

// ---------- Archivos de avance ----------

exports.subirArchivo = async (req, res) => {
  try {
    if (!req.file) throw errorConEstado('Seleccione un archivo para subir');
    const { accion, llamada } = await llamadaDeAccion(req.params.id);
    if (!accion || !llamada || !puedeVerLlamada(llamada, req.user)) {
      fs.unlink(req.file.path, () => {});
      return res.status(404).json({ mensaje: 'Acción no encontrada' });
    }
    if (!puedeOperarLlamada(llamada, req.user)) {
      fs.unlink(req.file.path, () => {});
      return res.status(403).json({ mensaje: 'Solo el responsable puede subir archivos' });
    }

    await ArchivoAccion.create({
      id_accion_llamada: accion.id,
      nombre_original: req.file.originalname,
      nombre_guardado: req.file.filename,
      mimetype: req.file.mimetype,
      tamano: req.file.size,
      id_usuario: req.user.id,
    });
    res.status(201).json(await obtenerLlamada(llamada.id));
  } catch (error) {
    if (req.file) fs.unlink(req.file.path, () => {});
    res.status(error.status || 400).json({ mensaje: error.message });
  }
};

exports.descargarArchivo = async (req, res) => {
  try {
    const archivo = await ArchivoAccion.findByPk(req.params.id);
    if (!archivo) return res.status(404).json({ mensaje: 'Archivo no encontrado' });
    const accion = await AccionLlamada.findByPk(archivo.id_accion_llamada);
    const llamada = accion && (await LlamadaAdministrado.findByPk(accion.id_llamada));
    if (!llamada || !puedeVerLlamada(llamada, req.user)) {
      return res.status(404).json({ mensaje: 'Archivo no encontrado' });
    }
    const ruta = path.join(CARPETA_ARCHIVOS, path.basename(archivo.nombre_guardado));
    if (!fs.existsSync(ruta)) return res.status(404).json({ mensaje: 'El archivo ya no está disponible' });
    res.download(ruta, archivo.nombre_original);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

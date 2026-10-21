const fs = require('fs');
const path = require('path');
const AsignacionExpediente = require('../models/AsignacionExpediente');
const RespuestaAsignacion = require('../models/RespuestaAsignacion');
const ArchivoRespuestaAsignacion = require('../models/ArchivoRespuestaAsignacion');
const Usuario = require('../models/Usuario');

const CARPETA_ARCHIVOS = path.join(__dirname, '../../uploads/asignaciones');
fs.mkdirSync(CARPETA_ARCHIVOS, { recursive: true });

const PERFILES_GESTION = ['admin', 'jefe', 'secretaria'];
const esGestor = (usuario) => PERFILES_GESTION.includes(usuario.perfil);
const puedeVer = (asignacion, usuario) => esGestor(usuario) || asignacion.id_usuario === usuario.id;
const puedeOperar = (asignacion, usuario) => esGestor(usuario) || asignacion.id_usuario === usuario.id;

const textoMayuscula = (valor) => {
  if (valor === undefined || valor === null) return null;
  const limpio = String(valor).trim().toUpperCase();
  return limpio === '' ? null : limpio;
};

const errorConEstado = (mensaje, status = 400) => Object.assign(new Error(mensaje), { status });

const includesRespuesta = [
  { model: Usuario, as: 'usuario', attributes: ['id', 'nombre', 'apellido', 'usuario'] },
  {
    model: ArchivoRespuestaAsignacion,
    as: 'archivos',
    attributes: ['id', 'descripcion', 'nombre_original', 'mimetype', 'tamano', 'fecha_subida', 'id_usuario'],
  },
];

const listarRespuestasDe = (idAsignacion) =>
  RespuestaAsignacion.findAll({
    where: { id_asignacion: idAsignacion },
    include: includesRespuesta,
    order: [['id', 'ASC']],
  });

const respuestaCompleta = (id) => RespuestaAsignacion.findByPk(id, { include: includesRespuesta });

exports.listarRespuestas = async (req, res) => {
  try {
    const asignacion = await AsignacionExpediente.findByPk(req.params.id, { attributes: ['id', 'id_usuario'] });
    if (!asignacion || !puedeVer(asignacion, req.user)) {
      return res.status(404).json({ mensaje: 'Asignación no encontrada' });
    }
    res.json(await listarRespuestasDe(asignacion.id));
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

exports.crearRespuesta = async (req, res) => {
  try {
    const asignacion = await AsignacionExpediente.findByPk(req.params.id, { attributes: ['id', 'id_usuario'] });
    if (!asignacion || !puedeVer(asignacion, req.user)) {
      return res.status(404).json({ mensaje: 'Asignación no encontrada' });
    }
    if (!puedeOperar(asignacion, req.user)) {
      return res.status(403).json({ mensaje: 'Solo el usuario asignado puede registrar respuestas' });
    }
    const texto = textoMayuscula(req.body.texto);
    if (!texto) throw errorConEstado('Escriba la respuesta o avance');

    await RespuestaAsignacion.create({ id_asignacion: asignacion.id, texto, id_usuario: req.user.id });
    res.status(201).json(await listarRespuestasDe(asignacion.id));
  } catch (error) {
    res.status(error.status || 400).json({ mensaje: error.message });
  }
};

const respuestaDeArchivo = async (id) => {
  const respuesta = await RespuestaAsignacion.findByPk(id);
  if (!respuesta) return { respuesta: null, asignacion: null };
  const asignacion = await AsignacionExpediente.findByPk(respuesta.id_asignacion, { attributes: ['id', 'id_usuario'] });
  return { respuesta, asignacion };
};

exports.subirArchivo = async (req, res) => {
  const limpiarTemporal = () => {
    if (req.file) fs.unlink(req.file.path, () => {});
  };
  try {
    if (!req.file) throw errorConEstado('Seleccione un archivo para subir');
    const descripcion = textoMayuscula(req.body.descripcion);
    if (!descripcion) throw errorConEstado('Describa qué contiene el archivo antes de subirlo');

    const { respuesta, asignacion } = await respuestaDeArchivo(req.params.id);
    if (!respuesta || !asignacion || !puedeVer(asignacion, req.user)) {
      throw errorConEstado('Respuesta no encontrada', 404);
    }
    if (!puedeOperar(asignacion, req.user)) {
      throw errorConEstado('Solo el usuario asignado puede subir archivos', 403);
    }

    await ArchivoRespuestaAsignacion.create({
      id_respuesta: respuesta.id,
      descripcion,
      nombre_original: req.file.originalname,
      nombre_guardado: req.file.filename,
      mimetype: req.file.mimetype,
      tamano: req.file.size,
      id_usuario: req.user.id,
    });
    res.status(201).json(await respuestaCompleta(respuesta.id));
  } catch (error) {
    limpiarTemporal();
    res.status(error.status || 400).json({ mensaje: error.message });
  }
};

exports.eliminarArchivo = async (req, res) => {
  try {
    const archivo = await ArchivoRespuestaAsignacion.findByPk(req.params.id);
    if (!archivo) return res.status(404).json({ mensaje: 'Archivo no encontrado' });
    const { respuesta, asignacion } = await respuestaDeArchivo(archivo.id_respuesta);
    if (!respuesta || !asignacion || !puedeVer(asignacion, req.user)) {
      return res.status(404).json({ mensaje: 'Archivo no encontrado' });
    }
    if (!puedeOperar(asignacion, req.user)) {
      return res.status(403).json({ mensaje: 'Solo el usuario asignado puede eliminar archivos' });
    }

    const ruta = path.join(CARPETA_ARCHIVOS, path.basename(archivo.nombre_guardado));
    await archivo.destroy();
    fs.unlink(ruta, () => {});
    res.json(await respuestaCompleta(respuesta.id));
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

exports.descargarArchivo = async (req, res) => {
  try {
    const archivo = await ArchivoRespuestaAsignacion.findByPk(req.params.id);
    if (!archivo) return res.status(404).json({ mensaje: 'Archivo no encontrado' });
    const { respuesta, asignacion } = await respuestaDeArchivo(archivo.id_respuesta);
    if (!respuesta || !asignacion || !puedeVer(asignacion, req.user)) {
      return res.status(404).json({ mensaje: 'Archivo no encontrado' });
    }
    const ruta = path.join(CARPETA_ARCHIVOS, path.basename(archivo.nombre_guardado));
    if (!fs.existsSync(ruta)) return res.status(404).json({ mensaje: 'El archivo ya no está disponible' });
    res.download(ruta, archivo.nombre_original);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};


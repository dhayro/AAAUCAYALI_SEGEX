const express = require('express');
const crypto = require('crypto');
const path = require('path');
const multer = require('multer');
const router = express.Router();
const controller = require('../controllers/llamadaController');
const { authenticateToken, isSecretariaOrAbove } = require('../middleware/auth');

const CARPETA_ARCHIVOS = path.join(__dirname, '../../uploads/atenciones');
const EXTENSIONES_PERMITIDAS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png'];

const upload = multer({
  storage: multer.diskStorage({
    destination: CARPETA_ARCHIVOS,
    filename: (req, file, cb) =>
      cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (EXTENSIONES_PERMITIDAS.includes(path.extname(file.originalname).toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido (PDF, Word, Excel o imagen)'));
    }
  },
});

const subirArchivo = (req, res, next) =>
  upload.single('archivo')(req, res, (error) => {
    if (error) return res.status(400).json({ mensaje: error.message });
    next();
  });

// Catálogo de acciones
router.get('/acciones', authenticateToken, controller.listarAcciones);
router.post('/acciones', authenticateToken, isSecretariaOrAbove, controller.crearAccion);
router.put('/acciones/:id', authenticateToken, isSecretariaOrAbove, controller.actualizarAccion);
router.delete('/acciones/:id', authenticateToken, isSecretariaOrAbove, controller.eliminarAccion);

// Llamadas de administrados
router.get('/llamadas', authenticateToken, controller.listarLlamadas);
router.post('/llamadas', authenticateToken, controller.crearLlamada);
router.get('/llamadas/por-cut/:cut', authenticateToken, controller.llamadasDelCut);
router.get('/calendario', authenticateToken, controller.calendario);
router.get('/llamadas/:id', authenticateToken, controller.obtenerLlamada);
router.put('/llamadas/:id', authenticateToken, controller.actualizarLlamada);
router.post('/llamadas/:id/anular', authenticateToken, controller.anularLlamada);
router.patch('/llamadas/:id/responsable', authenticateToken, isSecretariaOrAbove, controller.reasignarLlamada);
router.post('/llamadas/:id/acciones', authenticateToken, controller.agregarAccion);

// Acciones de cada llamada, archivos de avance
router.patch('/acciones-llamada/:id', authenticateToken, controller.actualizarAccionLlamada);
router.post('/acciones-llamada/:id/archivos', authenticateToken, subirArchivo, controller.subirArchivo);
router.get('/archivos/:id/descargar', authenticateToken, controller.descargarArchivo);
router.patch('/archivos/:id', authenticateToken, controller.editarArchivo);
router.delete('/archivos/:id', authenticateToken, controller.eliminarArchivo);

module.exports = router;

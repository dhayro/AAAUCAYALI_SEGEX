const express = require('express');
const crypto = require('crypto');
const path = require('path');
const multer = require('multer');
const router = express.Router();
const controller = require('../controllers/asignacionExpedienteController');
const respuestaController = require('../controllers/respuestaAsignacionController');
const { authenticateToken, isSecretariaOrAbove } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: AsignacionesExpediente
 *   description: Asignación de expedientes a usuarios con plazos, prórroga y observación
 */

/**
 * @swagger
 * /api/asignaciones-expediente:
 *   get:
 *     summary: Listar asignaciones de expedientes
 *     tags: [AsignacionesExpediente]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: cut
 *         schema:
 *           type: string
 *       - in: query
 *         name: id_usuario
 *         schema:
 *           type: integer
 *       - in: query
 *         name: estado
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Lista de asignaciones
 */
router.get('/', authenticateToken, controller.obtenerTodas);

/**
 * @swagger
 * /api/asignaciones-expediente/{id}:
 *   get:
 *     summary: Obtener una asignación por ID
 *     tags: [AsignacionesExpediente]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Asignación encontrada
 *       404:
 *         description: No encontrada
 */
router.get('/:id', authenticateToken, controller.obtenerPorId);

/**
 * @swagger
 * /api/asignaciones-expediente:
 *   post:
 *     summary: Crear una asignación (admin, jefe o secretaria)
 *     description: Recibe el CUT tal cual. El vencimiento se calcula con días calendario.
 *     tags: [AsignacionesExpediente]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [cut, id_usuario, plazo_atencion]
 *             properties:
 *               cut:
 *                 type: string
 *               id_usuario:
 *                 type: integer
 *               fecha_asignacion:
 *                 type: string
 *                 format: date
 *                 description: Por defecto la fecha de hoy (Lima)
 *               plazo_atencion:
 *                 type: integer
 *               observacion:
 *                 type: string
 *               numero_orden:
 *                 type: string
 *     responses:
 *       201:
 *         description: Asignación creada
 *       400:
 *         description: Datos inválidos
 *       404:
 *         description: No existe un expediente con ese CUT
 */
router.post('/', authenticateToken, isSecretariaOrAbove, controller.crear);

/**
 * @swagger
 * /api/asignaciones-expediente/{id}:
 *   put:
 *     summary: Actualizar una asignación (admin, jefe o secretaria)
 *     tags: [AsignacionesExpediente]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Asignación actualizada
 *       404:
 *         description: No encontrada
 */
router.put('/:id', authenticateToken, isSecretariaOrAbove, controller.actualizar);

/**
 * @swagger
 * /api/asignaciones-expediente/{id}/prorroga:
 *   patch:
 *     summary: Registrar prórroga (admin, jefe o secretaria)
 *     description: El vencimiento de prórroga se calcula desde la fecha de vencimiento original.
 *     tags: [AsignacionesExpediente]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [plazo_prorroga]
 *             properties:
 *               plazo_prorroga:
 *                 type: integer
 *               fecha_prorroga:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Prórroga registrada
 *       404:
 *         description: No encontrada
 */
router.patch('/:id/prorroga', authenticateToken, isSecretariaOrAbove, controller.prorrogar);
router.patch('/:id/prorroga/aceptar', authenticateToken, isSecretariaOrAbove, controller.aceptarProrroga);
router.patch('/:id/prorroga/rechazar', authenticateToken, isSecretariaOrAbove, controller.rechazarProrroga);
router.get('/:id/historial', authenticateToken, controller.obtenerHistorial);
router.post('/prorroga-masiva/solicitar', authenticateToken, isSecretariaOrAbove, controller.prorrogarMasivo);
router.post('/prorroga-masiva/aceptar', authenticateToken, isSecretariaOrAbove, controller.aceptarProrrogaMasivo);
router.post('/prorroga-masiva/rechazar', authenticateToken, isSecretariaOrAbove, controller.rechazarProrrogaMasivo);

/**
 * @swagger
 * /api/asignaciones-expediente/{id}:
 *   delete:
 *     summary: Desactivar una asignación (admin, jefe o secretaria)
 *     tags: [AsignacionesExpediente]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Asignación desactivada
 *       404:
 *         description: No encontrada
 */
router.delete('/:id', authenticateToken, isSecretariaOrAbove, controller.eliminar);

const CARPETA_RESPUESTAS = path.join(__dirname, '../../uploads/asignaciones');
const EXTENSIONES_RESPUESTA = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png'];

const uploadRespuesta = multer({
  storage: multer.diskStorage({
    destination: CARPETA_RESPUESTAS,
    filename: (req, file, cb) =>
      cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (EXTENSIONES_RESPUESTA.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('Tipo de archivo no permitido (PDF, Word, Excel o imagen)'));
  },
});

const subirArchivoRespuesta = (req, res, next) =>
  uploadRespuesta.single('archivo')(req, res, (error) => {
    if (error) return res.status(400).json({ mensaje: error.message });
    next();
  });

router.get('/:id/respuestas', authenticateToken, respuestaController.listarRespuestas);
router.post('/:id/respuestas', authenticateToken, respuestaController.crearRespuesta);
router.post('/:id/respuestas/enviar', authenticateToken, respuestaController.enviarRevision);
router.post('/respuestas/:id/archivos', authenticateToken, subirArchivoRespuesta, respuestaController.subirArchivo);
router.get('/archivos-respuesta/:id/descargar', authenticateToken, respuestaController.descargarArchivo);
router.patch('/archivos-respuesta/:id', authenticateToken, respuestaController.editarArchivo);
router.put('/archivos-respuesta/:id/archivo', authenticateToken, subirArchivoRespuesta, respuestaController.reemplazarArchivo);
router.delete('/archivos-respuesta/:id', authenticateToken, respuestaController.eliminarArchivo);

module.exports = router;

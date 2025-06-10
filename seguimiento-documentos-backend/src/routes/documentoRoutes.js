const express = require('express');
const router = express.Router();
const documentoController = require('../controllers/documentoController');
const { authenticateToken } = require('../middleware/auth');

/**
 * @swagger
 * components:
 *   schemas:
 *     Documento:
 *       type: object
 *       required:
 *         - id_expediente
 *         - id_tipo_documento
 *         - numero_documento
 *         - estado
 *       properties:
 *         id:
 *           type: integer
 *           description: ID auto-generado del documento
 *         id_expediente:
 *           type: integer
 *           description: ID del expediente al que pertenece el documento
 *         id_tipo_documento:
 *           type: integer
 *           description: ID del tipo de documento
 *         numero_documento:
 *           type: string
 *           description: Número o código del documento
 *         asunto:
 *           type: string
 *           description: Asunto o descripción breve del documento
 *         fecha_documento:
 *           type: string
 *           format: date
 *           description: Fecha del documento
 *         ultimo_escritorio:
 *           type: string
 *           description: Último escritorio donde se procesó el documento
 *         ultima_oficina_area:
 *           type: string
 *           description: Última oficina o área que procesó el documento
 *         fecha_ingreso_ultimo_escritorio:
 *           type: string
 *           format: date-time
 *           description: Fecha y hora de ingreso al último escritorio
 *         bandeja:
 *           type: string
 *           description: Bandeja actual del documento
 *         estado:
 *           type: string
 *           enum: [pendiente, en_revision, aprobado, rechazado]
 *           description: Estado actual del documento
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * tags:
 *   name: Documentos
 *   description: API para gestionar documentos
 */

router.use(authenticateToken);

/**
 * @swagger
 * /api/documentos:
 *   get:
 *     summary: Obtener todos los documentos
 *     tags: [Documentos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de documentos obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Documento'
 *       401:
 *         description: No autorizado
 */
router.get('/', documentoController.getAllDocumentos);

/**
 * @swagger
 * /api/documentos/{id}:
 *   get:
 *     summary: Obtener un documento por ID
 *     tags: [Documentos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del documento
 *     responses:
 *       200:
 *         description: Documento obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Documento'
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Documento no encontrado
 */
router.get('/:id', documentoController.getDocumentoById);

/**
 * @swagger
 * /api/documentos:
 *   post:
 *     summary: Crear un nuevo documento
 *     tags: [Documentos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Documento'
 *     responses:
 *       201:
 *         description: Documento creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Documento'
 *       400:
 *         description: Datos inválidos en la solicitud
 *       401:
 *         description: No autorizado
 */
router.post('/', documentoController.createDocumento);

/**
 * @swagger
 * /api/documentos/{id}:
 *   put:
 *     summary: Actualizar un documento existente
 *     tags: [Documentos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del documento a actualizar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Documento'
 *     responses:
 *       200:
 *         description: Documento actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Documento'
 *       400:
 *         description: Datos inválidos en la solicitud
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Documento no encontrado
 */
router.put('/:id', documentoController.updateDocumento);

/**
 * @swagger
 * /api/documentos/{id}:
 *   delete:
 *     summary: Eliminar un documento
 *     tags: [Documentos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del documento a eliminar
 *     responses:
 *       200:
 *         description: Documento eliminado exitosamente
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Documento no encontrado
 */
router.delete('/:id', documentoController.deleteDocumento);

/**
 * @swagger
 * /api/documentos/expediente/{expedienteId}:
 *   get:
 *     summary: Obtener documentos por ID de expediente
 *     tags: [Documentos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: expedienteId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del expediente
 *     responses:
 *       200:
 *         description: Lista de documentos del expediente obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Documento'
 *       401:
 *         description: No autorizado
 *       404:
 *         description: No se encontraron documentos para este expediente
 *       500:
 *         description: Error del servidor
 */
router.get('/expediente/:expedienteId', documentoController.getDocumentosByExpedienteId);

module.exports = router;
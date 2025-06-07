const express = require('express');
const router = express.Router();
const asignacionDocumentoController = require('../controllers/asignacionDocumentoController');
const { authenticateToken } = require('../middleware/auth');

/**
 * @swagger
 * components:
 *   schemas:
 *     AsignacionDocumento:
 *       type: object
 *       required:
 *         - id_documento
 *         - id_asignado
 *         - fecha_asignacion
 *         - plazo_respuesta
 *         - fecha_limite
 *       properties:
 *         id:
 *           type: integer
 *           description: ID auto-generado de la asignación
 *         id_documento:
 *           type: integer
 *           description: ID del documento asignado
 *         id_asignado:
 *           type: integer
 *           description: ID del usuario al que se asigna el documento
 *         fecha_asignacion:
 *           type: string
 *           format: date-time
 *           description: Fecha y hora de la asignación
 *         plazo_respuesta:
 *           type: integer
 *           description: Plazo en días para responder
 *         fecha_limite:
 *           type: string
 *           format: date-time
 *           description: Fecha límite para responder
 *         fecha_prorroga:
 *           type: string
 *           format: date-time
 *           description: Fecha de prórroga (si aplica)
 *         plazo_prorroga:
 *           type: integer
 *           description: Plazo adicional en días (si aplica)
 *         fecha_prorroga_limite:
 *           type: string
 *           format: date-time
 *           description: Nueva fecha límite después de la prórroga
 *         fecha_respuesta:
 *           type: string
 *           format: date-time
 *           description: Fecha en que se respondió la asignación
 *         observaciones:
 *           type: string
 *           description: Observaciones sobre la asignación
 *         estado:
 *           type: boolean
 *           description: Estado de la asignación (activa/inactiva)
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * tags:
 *   name: Asignaciones de Documentos
 *   description: API para gestionar asignaciones de documentos
 */

router.use(authenticateToken);

/**
 * @swagger
 * /api/asignaciones:
 *   get:
 *     summary: Obtener todas las asignaciones de documentos
 *     tags: [Asignaciones de Documentos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de asignaciones obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/AsignacionDocumento'
 *       401:
 *         description: No autorizado
 */
router.get('/', asignacionDocumentoController.getAllAsignaciones);

/**
 * @swagger
 * /api/asignaciones/{id}:
 *   get:
 *     summary: Obtener una asignación de documento por ID
 *     tags: [Asignaciones de Documentos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la asignación
 *     responses:
 *       200:
 *         description: Asignación obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AsignacionDocumento'
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Asignación no encontrada
 */
router.get('/:id', asignacionDocumentoController.getAsignacionById);

/**
 * @swagger
 * /api/asignaciones:
 *   post:
 *     summary: Crear una nueva asignación de documento
 *     tags: [Asignaciones de Documentos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AsignacionDocumento'
 *     responses:
 *       201:
 *         description: Asignación creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AsignacionDocumento'
 *       400:
 *         description: Datos inválidos en la solicitud
 *       401:
 *         description: No autorizado
 */
router.post('/', asignacionDocumentoController.createAsignacion);

/**
 * @swagger
 * /api/asignaciones/{id}:
 *   put:
 *     summary: Actualizar una asignación de documento existente
 *     tags: [Asignaciones de Documentos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la asignación a actualizar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AsignacionDocumento'
 *     responses:
 *       200:
 *         description: Asignación actualizada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AsignacionDocumento'
 *       400:
 *         description: Datos inválidos en la solicitud
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Asignación no encontrada
 */
router.put('/:id', asignacionDocumentoController.updateAsignacion);

/**
 * @swagger
 * /api/asignaciones/{id}:
 *   delete:
 *     summary: Eliminar una asignación de documento
 *     tags: [Asignaciones de Documentos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la asignación a eliminar
 *     responses:
 *       200:
 *         description: Asignación eliminada exitosamente
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Asignación no encontrada
 */
router.delete('/:id', asignacionDocumentoController.deleteAsignacion);

module.exports = router;
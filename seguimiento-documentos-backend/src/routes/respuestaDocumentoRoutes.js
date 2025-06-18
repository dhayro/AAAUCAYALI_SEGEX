const express = require('express');
const router = express.Router();
const respuestaDocumentoController = require('../controllers/respuestaDocumentoController');
const { authenticateToken,isSecretariaOrAbove } = require('../middleware/auth');

/**
 * @swagger
 * components:
 *   schemas:
 *     RespuestaDocumento:
 *       type: object
 *       required:
 *         - id_asignacion
 *         - fecha_respuesta
 *       properties:
 *         id:
 *           type: integer
 *           description: ID auto-generado de la respuesta
 *         id_asignacion:
 *           type: integer
 *           description: ID de la asignación a la que corresponde esta respuesta
 *         fecha_respuesta:
 *           type: string
 *           format: date-time
 *           description: Fecha y hora de la respuesta
 *         observaciones:
 *           type: string
 *           description: Observaciones o comentarios sobre la respuesta
 *         fecha_creacion:
 *           type: string
 *           format: date-time
 *           description: Fecha y hora de creación del registro
 *         fecha_modificacion:
 *           type: string
 *           format: date-time
 *           description: Fecha y hora de la última modificación
 *         id_usuario_creador:
 *           type: integer
 *           description: ID del usuario que creó la respuesta
 *         id_usuario_modificador:
 *           type: integer
 *           description: ID del último usuario que modificó la respuesta
 *         estado:
 *           type: boolean
 *           description: Estado de la respuesta (activa/inactiva)
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * tags:
 *   name: Respuestas de Documentos
 *   description: API para gestionar respuestas de documentos
 */

// Use authentication middleware for all routes
router.use(authenticateToken);

/**
 * @swagger
 * /api/respuestas:
 *   get:
 *     summary: Obtener todas las respuestas de documentos
 *     tags: [Respuestas de Documentos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Número de página para la paginación
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Número de elementos por página
 *     responses:
 *       200:
 *         description: Lista de respuestas obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/RespuestaDocumento'
 *       401:
 *         description: No autorizado
 */
router.get('/', isSecretariaOrAbove,respuestaDocumentoController.getAllRespuestas);

/**
 * @swagger
 * /api/respuestas/{id}:
 *   get:
 *     summary: Obtener una respuesta de documento por ID
 *     tags: [Respuestas de Documentos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la respuesta
 *     responses:
 *       200:
 *         description: Respuesta obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RespuestaDocumento'
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Respuesta no encontrada
 */
router.get('/:id', respuestaDocumentoController.getRespuestaById);

/**
 * @swagger
 * /api/respuestas:
 *   post:
 *     summary: Crear una nueva respuesta de documento
 *     tags: [Respuestas de Documentos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RespuestaDocumento'
 *     responses:
 *       201:
 *         description: Respuesta creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RespuestaDocumento'
 *       400:
 *         description: Datos inválidos en la solicitud
 *       401:
 *         description: No autorizado
 */
router.post('/', respuestaDocumentoController.createRespuesta);

/**
 * @swagger
 * /api/respuestas/{id}:
 *   put:
 *     summary: Actualizar una respuesta de documento existente
 *     tags: [Respuestas de Documentos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la respuesta a actualizar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RespuestaDocumento'
 *     responses:
 *       200:
 *         description: Respuesta actualizada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RespuestaDocumento'
 *       400:
 *         description: Datos inválidos en la solicitud
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Respuesta no encontrada
 */
router.put('/:id', respuestaDocumentoController.updateRespuesta);

/**
 * @swagger
 * /api/respuestas/{id}:
 *   delete:
 *     summary: Eliminar una respuesta de documento
 *     tags: [Respuestas de Documentos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la respuesta a eliminar
 *     responses:
 *       200:
 *         description: Respuesta eliminada exitosamente
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Respuesta no encontrada
 */
router.delete('/:id', respuestaDocumentoController.deleteRespuesta);

/**
 * @swagger
 * /api/respuestas/{id}/estado:
 *   patch:
 *     summary: Cambiar el estado de una respuesta de documento
 *     tags: [Respuestas de Documentos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la respuesta a actualizar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               estado:
 *                 type: boolean
 *                 description: Nuevo estado de la respuesta
 *                 example: true
 *     responses:
 *       200:
 *         description: Estado de la respuesta actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 respuesta:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     estado:
 *                       type: boolean
 *       400:
 *         description: Datos inválidos en la solicitud
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Respuesta no encontrada
 */
router.patch('/:id/estado', respuestaDocumentoController.cambiarEstadoRespuesta);

module.exports = router;
const express = require('express');
const router = express.Router();
const expedienteController = require('../controllers/expedienteController');
const { authenticateToken } = require('../middleware/auth');

/**
 * @swagger
 * components:
 *   schemas:
 *     Expediente:
 *       type: object
 *       required:
 *         - cut
 *         - tipo_procedimiento
 *         - periodo
 *         - id_tipo_documento
 *         - numero_documento
 *         - asunto
 *         - remitente
 *         - fecha_creacion
 *         - estado
 *       properties:
 *         id:
 *           type: integer
 *           description: ID auto-generado del expediente
 *         cut:
 *           type: string
 *           description: Código Único de Trámite
 *         estupa:
 *           type: string
 *           description: Número de ESTUPA (si aplica)
 *         tipo_procedimiento:
 *           type: string
 *           description: Tipo de procedimiento
 *         periodo:
 *           type: integer
 *           description: Año o periodo del expediente
 *         id_tipo_documento:
 *           type: integer
 *           description: ID del tipo de documento principal
 *         numero_documento:
 *           type: string
 *           description: Número del documento principal
 *         asunto:
 *           type: string
 *           description: Asunto o descripción del expediente
 *         remitente:
 *           type: string
 *           description: Nombre del remitente o solicitante
 *         fecha_creacion:
 *           type: string
 *           format: date
 *           description: Fecha de creación del expediente
 *         fecha_cierre:
 *           type: string
 *           format: date
 *           description: Fecha de cierre del expediente (si está cerrado)
 *         fecha_ultima_respuesta:
 *           type: string
 *           format: date
 *           description: Fecha de la última respuesta recibida
 *         fecha_ultima_modificacion:
 *           type: string
 *           format: date
 *           description: Fecha de la última modificación del expediente
 *         estado:
 *           type: string
 *           enum: [abierto, cerrado, pendiente, en_revision]
 *           description: Estado actual del expediente
 *         id_usuario_creador:
 *           type: integer
 *           description: ID del usuario que creó el expediente
 *         id_usuario_modificador:
 *           type: integer
 *           description: ID del último usuario que modificó el expediente
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * tags:
 *   name: Expedientes
 *   description: API para gestionar expedientes
 */

router.use(authenticateToken);

/**
 * @swagger
 * /api/expedientes:
 *   get:
 *     summary: Obtener todos los expedientes
 *     tags: [Expedientes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de expedientes obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Expediente'
 *       401:
 *         description: No autorizado
 */
router.get('/', expedienteController.getAllExpedientes);

/**
 * @swagger
 * /api/expedientes/{id}:
 *   get:
 *     summary: Obtener un expediente por ID
 *     tags: [Expedientes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del expediente
 *     responses:
 *       200:
 *         description: Expediente obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Expediente'
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Expediente no encontrado
 */
router.get('/:id', expedienteController.getExpedienteById);

/**
 * @swagger
 * /api/expedientes:
 *   post:
 *     summary: Crear un nuevo expediente
 *     tags: [Expedientes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Expediente'
 *     responses:
 *       201:
 *         description: Expediente creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Expediente'
 *       400:
 *         description: Datos inválidos en la solicitud
 *       401:
 *         description: No autorizado
 */
router.post('/', expedienteController.createExpediente);

/**
 * @swagger
 * /api/expedientes/{id}:
 *   put:
 *     summary: Actualizar un expediente existente
 *     tags: [Expedientes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del expediente a actualizar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Expediente'
 *     responses:
 *       200:
 *         description: Expediente actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Expediente'
 *       400:
 *         description: Datos inválidos en la solicitud
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Expediente no encontrado
 */
router.put('/:id', expedienteController.updateExpediente);

/**
 * @swagger
 * /api/expedientes/{id}:
 *   delete:
 *     summary: Eliminar un expediente
 *     tags: [Expedientes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del expediente a eliminar
 *     responses:
 *       200:
 *         description: Expediente eliminado exitosamente
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Expediente no encontrado
 */
router.delete('/:id', expedienteController.deleteExpediente);

module.exports = router;
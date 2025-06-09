const express = require('express');
const router = express.Router();
const tipoDocumentoController = require('../controllers/tipoDocumentoController');
const { authenticateToken, isSecretariaOrAbove } = require('../middleware/auth');

/**
 * @swagger
 * components:
 *   schemas:
 *     TipoDocumento:
 *       type: object
 *       required:
 *         - nombre
 *       properties:
 *         id:
 *           type: integer
 *           description: ID auto-generado del tipo de documento
 *         nombre:
 *           type: string
 *           description: Nombre del tipo de documento
 *         descripcion:
 *           type: string
 *           description: Descripción del tipo de documento
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * tags:
 *   name: Tipos de Documentos
 *   description: API para gestionar tipos de documentos
 */

/**
 * @swagger
 * /api/tipoDocumentos:
 *   get:
 *     summary: Obtener todos los tipos de documentos
 *     tags: [Tipos de Documentos]
 *     responses:
 *       200:
 *         description: Lista de tipos de documentos obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/TipoDocumento'
 */
router.get('/', tipoDocumentoController.obtenerTodos);

/**
 * @swagger
 * /api/tipoDocumentos/{id}:
 *   get:
 *     summary: Obtener un tipo de documento por ID
 *     tags: [Tipos de Documentos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del tipo de documento
 *     responses:
 *       200:
 *         description: Tipo de documento obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TipoDocumento'
 *       404:
 *         description: Tipo de documento no encontrado
 */
router.get('/:id', tipoDocumentoController.obtenerPorId);

/**
 * @swagger
 * /api/tipoDocumentos:
 *   post:
 *     summary: Crear un nuevo tipo de documento
 *     tags: [Tipos de Documentos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TipoDocumento'
 *     responses:
 *       201:
 *         description: Tipo de documento creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TipoDocumento'
 *       400:
 *         description: Datos inválidos en la solicitud
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Acceso prohibido
 */
router.post('/', authenticateToken, isSecretariaOrAbove, tipoDocumentoController.crear);

/**
 * @swagger
 * /api/tipoDocumentos/{id}:
 *   put:
 *     summary: Actualizar un tipo de documento existente
 *     tags: [Tipos de Documentos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del tipo de documento a actualizar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TipoDocumento'
 *     responses:
 *       200:
 *         description: Tipo de documento actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TipoDocumento'
 *       400:
 *         description: Datos inválidos en la solicitud
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Acceso prohibido
 *       404:
 *         description: Tipo de documento no encontrado
 */
router.put('/:id', authenticateToken, isSecretariaOrAbove, tipoDocumentoController.actualizar);

/**
 * @swagger
 * /api/tipoDocumentos/{id}:
 *   delete:
 *     summary: Eliminar un tipo de documento
 *     tags: [Tipos de Documentos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del tipo de documento a eliminar
 *     responses:
 *       200:
 *         description: Tipo de documento eliminado exitosamente
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Acceso prohibido
 *       404:
 *         description: Tipo de documento no encontrado
 */
router.delete('/:id', authenticateToken, isSecretariaOrAbove, tipoDocumentoController.eliminar);

module.exports = router;
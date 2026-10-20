const express = require('express');
const router = express.Router();
const procedimientoController = require('../controllers/procedimientoController');
const { authenticateToken, isJefeOrAdmin } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Procedimientos
 *   description: Catálogo de procedimientos (plazo en días y marca TUPA)
 * components:
 *   schemas:
 *     Procedimiento:
 *       type: object
 *       required:
 *         - nombre
 *         - plazo
 *       properties:
 *         id:
 *           type: integer
 *         nombre:
 *           type: string
 *         plazo:
 *           type: integer
 *           description: Plazo en días hábiles
 *         es_tupa:
 *           type: boolean
 *           description: Indica si el procedimiento figura en el TUPA
 */

/**
 * @swagger
 * /api/procedimientos:
 *   get:
 *     summary: Listar procedimientos (paginado, filtro por nombre)
 *     tags: [Procedimientos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: filtro
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de procedimientos
 */
router.get('/', authenticateToken, procedimientoController.obtenerTodos);

/**
 * @swagger
 * /api/procedimientos/{id}:
 *   get:
 *     summary: Obtener un procedimiento por ID
 *     tags: [Procedimientos]
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
 *         description: Procedimiento encontrado
 *       404:
 *         description: No encontrado
 */
router.get('/:id', authenticateToken, procedimientoController.obtenerPorId);

/**
 * @swagger
 * /api/procedimientos:
 *   post:
 *     summary: Crear un procedimiento (jefe o admin)
 *     tags: [Procedimientos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Procedimiento'
 *     responses:
 *       201:
 *         description: Creado
 *       400:
 *         description: Datos inválidos
 */
router.post('/', authenticateToken, isJefeOrAdmin, procedimientoController.crear);

/**
 * @swagger
 * /api/procedimientos/{id}:
 *   put:
 *     summary: Actualizar un procedimiento (jefe o admin)
 *     tags: [Procedimientos]
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
 *             $ref: '#/components/schemas/Procedimiento'
 *     responses:
 *       200:
 *         description: Actualizado
 *       404:
 *         description: No encontrado
 */
router.put('/:id', authenticateToken, isJefeOrAdmin, procedimientoController.actualizar);

/**
 * @swagger
 * /api/procedimientos/{id}:
 *   delete:
 *     summary: Eliminar un procedimiento (jefe o admin)
 *     tags: [Procedimientos]
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
 *         description: Eliminado
 *       404:
 *         description: No encontrado
 */
router.delete('/:id', authenticateToken, isJefeOrAdmin, procedimientoController.eliminar);

module.exports = router;

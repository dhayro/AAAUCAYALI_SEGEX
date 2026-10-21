const express = require('express');
const router = express.Router();
const controller = require('../controllers/evaluacionAsignacionController');
const { authenticateToken, isSecretariaOrAbove } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: EvaluacionAsignaciones
 *   description: Evaluación de las respuestas subidas en asignaciones (admin, jefe o secretaria)
 */

/**
 * @swagger
 * /api/evaluaciones-asignacion:
 *   get:
 *     summary: Listar asignaciones con respuestas y su estado de evaluación
 *     tags: [EvaluacionAsignaciones]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de asignaciones con respuestas
 */
router.get('/', authenticateToken, isSecretariaOrAbove, controller.listar);

/**
 * @swagger
 * /api/evaluaciones-asignacion/{id}:
 *   post:
 *     summary: Evaluar la última respuesta de una asignación (aprobar y cerrar, u observar)
 *     tags: [EvaluacionAsignaciones]
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
 *             required: [resultado]
 *             properties:
 *               resultado:
 *                 type: string
 *                 enum: [APROBADA, OBSERVADA]
 *               observacion:
 *                 type: string
 *                 description: Obligatoria cuando el resultado es OBSERVADA
 *     responses:
 *       201:
 *         description: Evaluación registrada
 *       400:
 *         description: Datos inválidos o asignación sin respuestas / ya cerrada
 *       404:
 *         description: Asignación no encontrada
 */
router.post('/:id', authenticateToken, isSecretariaOrAbove, controller.evaluar);

module.exports = router;

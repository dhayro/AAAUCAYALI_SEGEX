const express = require('express');
const router = express.Router();
const controller = require('../controllers/dashboardController');
const { authenticateToken } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Resumen de asignaciones, respuestas y llamadas según el perfil del usuario
 */

/**
 * @swagger
 * /api/dashboard/resumen:
 *   get:
 *     summary: Indicadores y atención requerida del usuario
 *     description: Admin, jefe y secretaria ven todo; el resto solo lo asignado a sí mismo o sus llamadas.
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Resumen del dashboard
 */
router.get('/resumen', authenticateToken, controller.resumen);

/**
 * @swagger
 * /api/dashboard/monitor-llamadas:
 *   get:
 *     summary: Llamadas sin respuesta ordenadas por fecha límite
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Resumen y lista de llamadas sin respuesta
 */
router.get('/monitor-llamadas', authenticateToken, controller.monitorLlamadas);

module.exports = router;

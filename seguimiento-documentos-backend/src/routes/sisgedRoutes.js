const express = require('express');
const sisgedController = require('../controllers/sisgedController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * /api/sisged/general:
 *   get:
 *     summary: Proxy to SISGED general endpoint
 *     tags: [SISGED]
 *     parameters:
 *       - name: NRO_CUT
 *         in: query
 *         type: string
 *       - name: NRO_DOCUMENTO
 *         in: query
 *         type: string
 *       - name: ASUNTO
 *         in: query
 *         type: string
 *       - name: USUARIO_REMITENTE
 *         in: query
 *         type: string
 *       - name: FEC_INICIO
 *         in: query
 *         type: string
 *       - name: FEC_FIN
 *         in: query
 *         type: string
 *     responses:
 *       200:
 *         description: SISGED response
 *       401:
 *         description: Unauthorized
 */
router.get('/general', authenticateToken, sisgedController.getGeneral);

/**
 * @swagger
 * /api/sisged/trazabilidad:
 *   get:
 *     summary: Proxy to SISGED trazabilidad endpoint
 *     tags: [SISGED]
 *     parameters:
 *       - name: NRO_CUT
 *         in: query
 *         type: string
 *     responses:
 *       200:
 *         description: SISGED trazabilidad response
 *       401:
 *         description: Unauthorized
 */
router.get('/trazabilidad', authenticateToken, sisgedController.getTrazabilidad);

/**
 * @swagger
 * /api/sisged/test:
 *   get:
 *     summary: Test endpoint with mock data
 *     tags: [SISGED]
 *     description: Returns mock SISGED data for testing without external API
 *     responses:
 *       200:
 *         description: Mock test data
 */
router.get('/test', sisgedController.getTestData);

module.exports = router;

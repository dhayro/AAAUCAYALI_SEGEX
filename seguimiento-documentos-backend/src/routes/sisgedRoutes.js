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

/**
 * @swagger
 * /api/sisged/proxy:
 *   post:
 *     summary: Proxy any SISGED URL request
 *     tags: [SISGED]
 *     description: Forward a SISGED URL request to backend (avoids CORS)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               url:
 *                 type: string
 *                 example: "https://sisgedpiloto.ana.gob.pe/apiRestSG/api/SISGED/general?..."
 *     responses:
 *       200:
 *         description: SISGED response data
 *       401:
 *         description: Token required
 *       400:
 *         description: URL required
 */
router.post('/proxy', sisgedController.proxyRequest);

// Test simple POST
router.post('/test-post', (req, res) => {
  console.log('[POST TEST]', req.body);
  res.json({ success: true, message: 'POST test works' });
});

/**
 * @swagger
 * /api/sisged/sincronizar:
 *   post:
 *     summary: Sincronizar datos de SISGED
 *     tags: [SISGED]
 *     description: Obtiene datos de SISGED y los importa a la BD automáticamente
 *     responses:
 *       200:
 *         description: Sincronización completada
 *       500:
 *         description: Error en sincronización
 */
router.post('/sincronizar', sisgedController.sincronizar);

router.post('/sincronizar-con-parametros', sisgedController.sincronizarConParametros);

module.exports = router;

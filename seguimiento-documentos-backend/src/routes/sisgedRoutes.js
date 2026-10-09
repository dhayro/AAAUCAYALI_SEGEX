const express = require('express');
const sisgedController = require('../controllers/sisgedController');
const sisgedTokenController = require('../controllers/sisgedTokenController');
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

/**
 * @swagger
 * /api/sisged/limpiar-cache:
 *   post:
 *     summary: Limpiar cache de token
 *     tags: [SISGED]
 *     description: Elimina el token cacheado para forzar obtener uno nuevo de Postman
 *     responses:
 *       200:
 *         description: Cache limpiado
 *       500:
 *         description: Error
 */
router.post('/limpiar-cache', sisgedController.limpiarCache);

/**
 * @swagger
 * /api/sisged/sincronizar-postman:
 *   post:
 *     summary: Sincronizar parámetros con Postman manualmente
 *     tags: [SISGED]
 *     description: Actualiza la colección SISGED en Postman con los parámetros actuales
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               params:
 *                 type: object
 *               endpoint:
 *                 type: string
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Postman sincronizado
 *       500:
 *         description: Error
 */
router.post('/sincronizar-postman', sisgedController.sincronizarPostman);

// ============== SISGED TOKEN MANAGEMENT ==============

/**
 * @swagger
 * /api/sisged/tokens:
 *   get:
 *     summary: Obtener tokens activos
 *     tags: [SISGED Tokens]
 *     responses:
 *       200:
 *         description: Lista de tokens activos
 */
router.get('/tokens', sisgedTokenController.obtenerTokensActivos);

/**
 * @swagger
 * /api/sisged/tokens/agregar:
 *   post:
 *     summary: Agregar nuevo token SISGED
 *     tags: [SISGED Tokens]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *               fecha_vencimiento:
 *                 type: string
 *                 example: "2026-12-31"
 *               dias_validez:
 *                 type: integer
 *               notas:
 *                 type: string
 *     responses:
 *       201:
 *         description: Token agregado
 *       400:
 *         description: Datos inválidos
 */
router.post('/tokens/agregar', sisgedTokenController.agregarToken);

/**
 * @swagger
 * /api/sisged/tokens/ultimo-activo:
 *   get:
 *     summary: Obtener último token activo y vigente
 *     tags: [SISGED Tokens]
 *     responses:
 *       200:
 *         description: Token activo
 *       404:
 *         description: No hay tokens vigentes
 */
router.get('/tokens/ultimo-activo', sisgedTokenController.obtenerUltimoTokenActivo);

/**
 * @swagger
 * /api/sisged/tokens/:id/desactivar:
 *   post:
 *     summary: Desactivar un token
 *     tags: [SISGED Tokens]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *     responses:
 *       200:
 *         description: Token desactivado
 */
router.post('/tokens/:id/desactivar', sisgedTokenController.desactivarToken);

/**
 * @swagger
 * /api/sisged/tokens/historial:
 *   get:
 *     summary: Obtener historial de últimos 20 tokens
 *     tags: [SISGED Tokens]
 *     responses:
 *       200:
 *         description: Historial de tokens
 */
router.get('/tokens/historial', sisgedTokenController.obtenerHistorialTokens);

/**
 * @swagger
 * /api/sisged/tokens/verificar-actual:
 *   get:
 *     summary: Verificar qué token se está usando actualmente
 *     tags: [SISGED Tokens]
 *     description: Muestra si se está usando token de BD o de Postman
 *     responses:
 *       200:
 *         description: Info del token actual en uso
 */
router.get('/tokens/verificar-actual', sisgedTokenController.verificarTokenActual);

module.exports = router;

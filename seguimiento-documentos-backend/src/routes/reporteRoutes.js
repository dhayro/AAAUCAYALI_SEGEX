const express = require('express');
const router = express.Router();
const controller = require('../controllers/reporteController');
const avanzado = require('../controllers/reporteAvanzadoController');
const { authenticateToken, isSecretariaOrAbove } = require('../middleware/auth');

// Asignaciones, llamadas e historial por CUT: cualquier usuario con sesión; el controlador limita al personal a lo suyo.
router.get('/asignaciones', authenticateToken, controller.asignaciones);
router.get('/llamadas', authenticateToken, controller.llamadas);
router.get('/productividad', authenticateToken, isSecretariaOrAbove, avanzado.productividad);
router.get('/prorrogas', authenticateToken, isSecretariaOrAbove, avanzado.prorrogas);
router.get('/expedientes-sin-asignar', authenticateToken, isSecretariaOrAbove, avanzado.expedientesSinAsignar);
router.get('/acciones', authenticateToken, isSecretariaOrAbove, avanzado.acciones);
router.get('/historial-cut', authenticateToken, avanzado.historialCut);
router.get('/resumen', authenticateToken, isSecretariaOrAbove, avanzado.resumen);
// Cualquier usuario con sesión: solo devuelve sus propios datos.
router.get('/mi-desempeno', authenticateToken, avanzado.miDesempeno);

module.exports = router;

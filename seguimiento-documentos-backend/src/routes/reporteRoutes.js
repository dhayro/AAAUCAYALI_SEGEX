const express = require('express');
const router = express.Router();
const controller = require('../controllers/reporteController');
const { authenticateToken, isSecretariaOrAbove } = require('../middleware/auth');

router.get('/asignaciones', authenticateToken, isSecretariaOrAbove, controller.asignaciones);
router.get('/llamadas', authenticateToken, isSecretariaOrAbove, controller.llamadas);

module.exports = router;

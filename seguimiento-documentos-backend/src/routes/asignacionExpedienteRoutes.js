const express = require('express');
const router = express.Router();
const controller = require('../controllers/asignacionExpedienteController');
const { authenticateToken, isSecretariaOrAbove } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: AsignacionesExpediente
 *   description: Asignación de expedientes a usuarios con plazos, prórroga y observación
 */

/**
 * @swagger
 * /api/asignaciones-expediente:
 *   get:
 *     summary: Listar asignaciones de expedientes
 *     tags: [AsignacionesExpediente]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: cut
 *         schema:
 *           type: string
 *       - in: query
 *         name: id_usuario
 *         schema:
 *           type: integer
 *       - in: query
 *         name: estado
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Lista de asignaciones
 */
router.get('/', authenticateToken, controller.obtenerTodas);

/**
 * @swagger
 * /api/asignaciones-expediente/{id}:
 *   get:
 *     summary: Obtener una asignación por ID
 *     tags: [AsignacionesExpediente]
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
 *         description: Asignación encontrada
 *       404:
 *         description: No encontrada
 */
router.get('/:id', authenticateToken, controller.obtenerPorId);

/**
 * @swagger
 * /api/asignaciones-expediente:
 *   post:
 *     summary: Crear una asignación (admin, jefe o secretaria)
 *     description: Recibe el CUT del expediente. El vencimiento se calcula con días hábiles.
 *     tags: [AsignacionesExpediente]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [cut, id_usuario, plazo_atencion]
 *             properties:
 *               cut:
 *                 type: string
 *               id_usuario:
 *                 type: integer
 *               fecha_asignacion:
 *                 type: string
 *                 format: date
 *                 description: Por defecto la fecha de hoy (Lima)
 *               plazo_atencion:
 *                 type: integer
 *               observacion:
 *                 type: string
 *               numero_orden:
 *                 type: string
 *     responses:
 *       201:
 *         description: Asignación creada
 *       400:
 *         description: Datos inválidos
 *       404:
 *         description: No existe un expediente con ese CUT
 */
router.post('/', authenticateToken, isSecretariaOrAbove, controller.crear);

/**
 * @swagger
 * /api/asignaciones-expediente/{id}:
 *   put:
 *     summary: Actualizar una asignación (admin, jefe o secretaria)
 *     tags: [AsignacionesExpediente]
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
 *         description: Asignación actualizada
 *       404:
 *         description: No encontrada
 */
router.put('/:id', authenticateToken, isSecretariaOrAbove, controller.actualizar);

/**
 * @swagger
 * /api/asignaciones-expediente/{id}/prorroga:
 *   patch:
 *     summary: Registrar prórroga (admin, jefe o secretaria)
 *     description: El vencimiento de prórroga se calcula desde la fecha de vencimiento original.
 *     tags: [AsignacionesExpediente]
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
 *             required: [plazo_prorroga]
 *             properties:
 *               plazo_prorroga:
 *                 type: integer
 *               fecha_prorroga:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Prórroga registrada
 *       404:
 *         description: No encontrada
 */
router.patch('/:id/prorroga', authenticateToken, isSecretariaOrAbove, controller.prorrogar);

/**
 * @swagger
 * /api/asignaciones-expediente/{id}:
 *   delete:
 *     summary: Desactivar una asignación (admin, jefe o secretaria)
 *     tags: [AsignacionesExpediente]
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
 *         description: Asignación desactivada
 *       404:
 *         description: No encontrada
 */
router.delete('/:id', authenticateToken, isSecretariaOrAbove, controller.eliminar);

module.exports = router;

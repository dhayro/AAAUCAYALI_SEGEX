const express = require('express');
const router = express.Router();
const cargoController = require('../controllers/cargoController');
const { authenticateToken, isJefeOrAdmin } = require('../middleware/auth');

/**
 * @swagger
 * components:
 *   schemas:
 *     Cargo:
 *       type: object
 *       required:
 *         - nombre
 *       properties:
 *         id:
 *           type: integer
 *           description: ID auto-generado del cargo
 *         nombre:
 *           type: string
 *           description: Nombre del cargo
 *         descripcion:
 *           type: string
 *           description: Descripción del cargo
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * tags:
 *   name: Cargos
 *   description: API para gestionar cargos
 */

/**
 * @swagger
 * /api/cargos:
 *   get:
 *     summary: Obtener todos los cargos
 *     tags: [Cargos]
 *     responses:
 *       200:
 *         description: Lista de cargos obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Cargo'
 */
router.get('/', cargoController.obtenerTodosLosCargos);

/**
 * @swagger
 * /api/cargos/{id}:
 *   get:
 *     summary: Obtener un cargo por ID
 *     tags: [Cargos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del cargo
 *     responses:
 *       200:
 *         description: Cargo obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Cargo'
 *       404:
 *         description: Cargo no encontrado
 */
router.get('/:id', cargoController.obtenerCargoPorId);

/**
 * @swagger
 * /api/cargos:
 *   post:
 *     summary: Crear un nuevo cargo
 *     tags: [Cargos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Cargo'
 *     responses:
 *       201:
 *         description: Cargo creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Cargo'
 *       400:
 *         description: Datos inválidos en la solicitud
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Acceso prohibido
 */
router.post('/', authenticateToken, isJefeOrAdmin, cargoController.crearCargo);

/**
 * @swagger
 * /api/cargos/{id}:
 *   put:
 *     summary: Actualizar un cargo existente
 *     tags: [Cargos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del cargo a actualizar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Cargo'
 *     responses:
 *       200:
 *         description: Cargo actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Cargo'
 *       400:
 *         description: Datos inválidos en la solicitud
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Acceso prohibido
 *       404:
 *         description: Cargo no encontrado
 */
router.put('/:id', authenticateToken, isJefeOrAdmin, cargoController.actualizarCargo);

/**
 * @swagger
 * /api/cargos/{id}:
 *   delete:
 *     summary: Eliminar un cargo
 *     tags: [Cargos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del cargo a eliminar
 *     responses:
 *       200:
 *         description: Cargo eliminado exitosamente
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Acceso prohibido
 *       404:
 *         description: Cargo no encontrado
 */
router.delete('/:id', authenticateToken, isJefeOrAdmin, cargoController.eliminarCargo);

module.exports = router;
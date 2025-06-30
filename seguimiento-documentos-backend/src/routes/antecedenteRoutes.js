const express = require('express');
const router = express.Router();
const antecedenteController = require('../controllers/antecedenteController');

/**
 * @swagger
 * components:
 *   schemas:
 *     Antecedente:
 *       type: object
 *       required:
 *         - nombre
 *         - descripcion
 *       properties:
 *         id:
 *           type: integer
 *           description: ID auto-generado del antecedente
 *         nombre:
 *           type: string
 *           description: Nombre del antecedente
 *         descripcion:
 *           type: string
 *           description: Descripción del antecedente
 *         id_expediente:
 *           type: integer
 *           description: ID del expediente al que pertenece el antecedente
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * tags:
 *   name: Antecedentes
 *   description: API para gestionar antecedentes
 */

/**
 * @swagger
 * /api/antecedentes:
 *   post:
 *     summary: Crear un nuevo antecedente
 *     tags: [Antecedentes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Antecedente'
 *     responses:
 *       201:
 *         description: Antecedente creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Antecedente'
 *       400:
 *         description: Datos inválidos en la solicitud
 *       401:
 *         description: No autorizado
 */
router.post('/', antecedenteController.createAntecedente);

/**
 * @swagger
 * /api/antecedentes:
 *   get:
 *     summary: Obtener todos los antecedentes por ID de expediente
 *     tags: [Antecedentes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: id_expediente
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del expediente para filtrar los antecedentes
 *     responses:
 *       200:
 *         description: Lista de antecedentes obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Antecedente'
 *       400:
 *         description: El ID del expediente es requerido
 *       401:
 *         description: No autorizado
 */
router.get('/', antecedenteController.getAllAntecedentes);

/**
 * @swagger
 * /api/antecedentes/{id}:
 *   get:
 *     summary: Obtener un antecedente por ID
 *     tags: [Antecedentes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del antecedente
 *     responses:
 *       200:
 *         description: Antecedente obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Antecedente'
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Antecedente no encontrado
 */
router.get('/:id', antecedenteController.getAntecedenteById);

/**
 * @swagger
 * /api/antecedentes/{id}:
 *   put:
 *     summary: Actualizar un antecedente existente
 *     tags: [Antecedentes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del antecedente a actualizar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Antecedente'
 *     responses:
 *       200:
 *         description: Antecedente actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Antecedente'
 *       400:
 *         description: Datos inválidos en la solicitud
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Antecedente no encontrado
 */
router.put('/:id', antecedenteController.updateAntecedente);

/**
 * @swagger
 * /api/antecedentes/{id}:
 *   delete:
 *     summary: Eliminar un antecedente
 *     tags: [Antecedentes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del antecedente a eliminar
 *     responses:
 *       200:
 *         description: Antecedente eliminado exitosamente
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Antecedente no encontrado
 */
router.delete('/:id', antecedenteController.deleteAntecedente);

module.exports = router;
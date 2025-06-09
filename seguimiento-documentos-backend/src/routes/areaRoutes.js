const express = require('express');
const router = express.Router();
const areaController = require('../controllers/areaController');
const { authenticateToken, isJefeOrAdmin } = require('../middleware/auth');

/**
 * @swagger
 * components:
 *   schemas:
 *     Area:
 *       type: object
 *       required:
 *         - nombre
 *       properties:
 *         id:
 *           type: integer
 *           description: ID auto-generado del área
 *         nombre:
 *           type: string
 *           description: Nombre del área
 *         descripcion:
 *           type: string
 *           description: Descripción del área
 *         id_padre:
 *           type: integer
 *           description: ID del área padre (si es una subárea)
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * tags:
 *   name: Areas
 *   description: API para gestionar áreas
 */

/**
 * @swagger
 * /api/areas:
 *   get:
 *     summary: Obtener todas las áreas
 *     tags: [Areas]
 *     responses:
 *       200:
 *         description: Lista de áreas obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Area'
 */
router.get('/', areaController.obtenerTodasLasAreas);

/**
 * @swagger
 * /api/areas/principales:
 *   get:
 *     summary: Obtener áreas principales (sin padre)
 *     tags: [Areas]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Número de página para la paginación
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Número de elementos por página
 *       - in: query
 *         name: filtro
 *         schema:
 *           type: string
 *         description: Filtro general para buscar en nombre y descripción
 *       - in: query
 *         name: nombre
 *         schema:
 *           type: string
 *         description: Filtro específico para el nombre del área
 *       - in: query
 *         name: descripcion
 *         schema:
 *           type: string
 *         description: Filtro específico para la descripción del área
 *     responses:
 *       200:
 *         description: Lista de áreas principales obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 areas:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Area'
 *                 totalAreas:
 *                   type: integer
 *                   description: Número total de áreas principales encontradas
 *                 totalPaginas:
 *                   type: integer
 *                   description: Número total de páginas
 *                 paginaActual:
 *                   type: integer
 *                   description: Número de la página actual
 *       500:
 *         description: Error del servidor
 */
router.patch('/principales', areaController.obtenerAreasPrincipales);

/**
 * @swagger
 * /api/areas/{id}:
 *   get:
 *     summary: Obtener un área por ID
 *     tags: [Areas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del área
 *     responses:
 *       200:
 *         description: Área obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Area'
 *       404:
 *         description: Área no encontrada
 */
router.get('/:id', areaController.obtenerAreaPorId);

/**
 * @swagger
 * /api/areas/{idPadre}/hijas:
 *   get:
 *     summary: Obtener áreas hijas de un área padre o áreas de nivel superior
 *     tags: [Areas]
 *     parameters:
 *       - in: path
 *         name: idPadre
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del área padre o 'null' para obtener áreas de nivel superior
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Número de página para la paginación
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Número de elementos por página
 *       - in: query
 *         name: filtro
 *         schema:
 *           type: string
 *         description: Filtro general para buscar en nombre y descripción
 *       - in: query
 *         name: nombre
 *         schema:
 *           type: string
 *         description: Filtro específico para el nombre del área
 *       - in: query
 *         name: descripcion
 *         schema:
 *           type: string
 *         description: Filtro específico para la descripción del área
 *     responses:
 *       200:
 *         description: Lista de áreas hijas o de nivel superior obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 areas:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Area'
 *                 totalAreas:
 *                   type: integer
 *                   description: Número total de áreas encontradas
 *                 totalPaginas:
 *                   type: integer
 *                   description: Número total de páginas
 *                 paginaActual:
 *                   type: integer
 *                   description: Número de la página actual
 *       404:
 *         description: Área padre no encontrada (solo si se proporciona un ID válido)
 *       500:
 *         description: Error del servidor
 */
router.get('/:idPadre/hijas', areaController.obtenerAreasHijas);

/**
 * @swagger
 * /api/areas:
 *   post:
 *     summary: Crear una nueva área
 *     tags: [Areas]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Area'
 *     responses:
 *       201:
 *         description: Área creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Area'
 *       400:
 *         description: Datos inválidos en la solicitud
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Acceso prohibido
 */
router.post('/', authenticateToken, isJefeOrAdmin, areaController.crearArea);

/**
 * @swagger
 * /api/areas/{id}:
 *   put:
 *     summary: Actualizar un área existente
 *     tags: [Areas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del área a actualizar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Area'
 *     responses:
 *       200:
 *         description: Área actualizada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Area'
 *       400:
 *         description: Datos inválidos en la solicitud
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Acceso prohibido
 *       404:
 *         description: Área no encontrada
 */
router.put('/:id', authenticateToken, isJefeOrAdmin, areaController.actualizarArea);

/**
 * @swagger
 * /api/areas/{id}:
 *   delete:
 *     summary: Eliminar un área
 *     tags: [Areas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del área a eliminar
 *     responses:
 *       200:
 *         description: Área eliminada exitosamente
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Acceso prohibido
 *       404:
 *         description: Área no encontrada
 */
router.delete('/:id', authenticateToken, isJefeOrAdmin, areaController.eliminarArea);

module.exports = router;
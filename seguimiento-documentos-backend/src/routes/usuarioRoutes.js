const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');
const authController = require('../controllers/authController');
const { authenticateToken, isAdmin, isJefeOrAdmin } = require('../middleware/auth');

/**
 * @swagger
 * components:
 *   schemas:
 *     Usuario:
 *       type: object
 *       required:
 *         - usuario
 *         - password
 *         - email
 *         - nombre
 *         - apellido
 *         - dni
 *       properties:
 *         id:
 *           type: integer
 *           description: ID auto-generado del usuario
 *         usuario:
 *           type: string
 *           description: Nombre de usuario único
 *         password:
 *           type: string
 *           description: Contraseña del usuario
 *         email:
 *           type: string
 *           description: Correo electrónico del usuario
 *         nombre:
 *           type: string
 *           description: Nombre del usuario
 *         apellido:
 *           type: string
 *           description: Apellido del usuario
 *         dni:
 *           type: string
 *           description: Documento Nacional de Identidad
 *         id_cargo:
 *           type: integer
 *           description: ID del cargo del usuario
 *         id_area:
 *           type: integer
 *           description: ID del área del usuario
 *         perfil:
 *           type: string
 *           enum: [admin, personal, jefe, secretaria]
 *           description: Perfil o rol del usuario
 *         telefono:
 *           type: string
 *           description: Número de teléfono del usuario
 *         direccion:
 *           type: string
 *           description: Dirección del usuario
 *         fecha_nacimiento:
 *           type: string
 *           format: date
 *           description: Fecha de nacimiento del usuario
 *         estado:
 *           type: boolean
 *           description: Estado del usuario (activo/inactivo)
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * tags:
 *   name: Usuarios
 *   description: API para gestionar usuarios
 *   name: Autenticación
 *   description: API para autenticación de usuarios
 */

/**
 * @swagger
 * /api/usuarios/registro:
 *   post:
 *     summary: Registrar un nuevo usuario
 *     tags: [Usuarios]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Usuario'
 *     responses:
 *       200:
 *         description: Usuario registrado exitosamente
 *       400:
 *         description: Error en los datos proporcionados
 */
router.post('/registro', usuarioController.registrarUsuario);

/**
 * @swagger
 * /api/usuarios/login:
 *   post:
 *     summary: Iniciar sesión de usuario
 *     tags: [Usuarios]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - usuario
 *               - password
 *             properties:
 *               usuario:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Inicio de sesión exitoso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *       401:
 *         description: Credenciales inválidas
 */
router.post('/login', usuarioController.loginUsuario);

// Rutas protegidas
router.use(authenticateToken);

/**
 * @swagger
 * /api/usuarios:
 *   get:
 *     summary: Obtener todos los usuarios (solo admin)
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de usuarios obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Usuario'
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Acceso prohibido
 */
router.get('/', isAdmin, usuarioController.obtenerTodosLosUsuarios);

/**
 * @swagger
 * /api/usuarios/{id}:
 *   get:
 *     summary: Obtener usuario por ID (admin y jefes)
 *     tags: [Usuarios]
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
 *         description: Usuario obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Usuario'
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Acceso prohibido
 *       404:
 *         description: Usuario no encontrado
 */
router.get('/:id', isJefeOrAdmin, usuarioController.obtenerUsuarioPorId);

/**
 * @swagger
 * /api/usuarios:
 *   post:
 *     summary: Crear un nuevo usuario (solo admin)
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Usuario'
 *     responses:
 *       201:
 *         description: Usuario creado exitosamente
 *       400:
 *         description: Error en los datos proporcionados
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Acceso prohibido
 */
router.post('/', isAdmin, usuarioController.crearUsuario);

/**
 * @swagger
 * /api/usuarios/{id}:
 *   put:
 *     summary: Actualizar un usuario (solo admin)
 *     tags: [Usuarios]
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
 *             $ref: '#/components/schemas/Usuario'
 *     responses:
 *       200:
 *         description: Usuario actualizado exitosamente
 *       400:
 *         description: Error en los datos proporcionados
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Acceso prohibido
 *       404:
 *         description: Usuario no encontrado
 */
router.put('/:id', isAdmin, usuarioController.actualizarUsuario);

/**
 * @swagger
 * /api/usuarios/{id}:
 *   delete:
 *     summary: Eliminar un usuario (solo admin)
 *     tags: [Usuarios]
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
 *         description: Usuario eliminado exitosamente
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Acceso prohibido
 *       404:
 *         description: Usuario no encontrado
 */
router.delete('/:id', isAdmin, usuarioController.eliminarUsuario);

/**
 * @swagger
 * /api/usuarios/verify-token:
 *   get:
 *     summary: Verificar token JWT
 *     tags: [Autenticación]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token válido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Token is valid
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     perfil:
 *                       type: string
 *                       example: admin
 *                     nombre:
 *                       type: string
 *                       example: John
 *                     apellido:
 *                       type: string
 *                       example: Doe
 *                     email:
 *                       type: string
 *                       example: john.doe@example.com
 *       401:
 *         description: Token no válido o expirado
 *       403:
 *         description: No se proporcionó token
 */
router.get('/verify-token', authController.verifyToken);

module.exports = router;
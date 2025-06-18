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
 *   - name: Usuarios
 *     description: API para gestionar usuarios
 * security:
 *   - bearerAuth: []
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
 *   patch:
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
router.patch('/verify-token', authController.verifyToken);

/**
 * @swagger
 * /api/usuarios/cambiar-contrasena:
 *   patch:
 *     summary: Cambiar la contraseña del usuario autenticado
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Contraseña actualizada exitosamente
 *       400:
 *         description: Error en los datos proporcionados
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Usuario no encontrado
 */
router.patch('/cambiar-contrasena', authenticateToken, usuarioController.actualizarContrasena);

/**
 * @swagger
 * /api/usuarios/{id}/reset-password:
 *   patch:
 *     summary: Restablecer la contraseña de un usuario a un valor por defecto
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del usuario cuya contraseña se va a restablecer
 *     responses:
 *       200:
 *         description: Contraseña restablecida exitosamente
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Usuario no encontrado
 */
router.patch('/:id/reset-password', authenticateToken, isAdmin, usuarioController.resetPassword);

/**
 * @swagger
 * /api/usuarios/{id}/actualizar-contrasena:
 *   patch:
 *     summary: Actualizar la contraseña de un usuario
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del usuario cuya contraseña se va a actualizar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Contraseña actualizada exitosamente
 *       400:
 *         description: Error en los datos proporcionados
 *       404:
 *         description: Usuario no encontrado
 *       500:
 *         description: Error del servidor
 */
router.patch('/:id/actualizar-contrasena', authenticateToken, usuarioController.actualizarContrasena);

/**
 * @swagger
 * /api/usuarios/verificar/{usuario}/{email}:
 *   get:
 *     summary: Verificar si un usuario existe por nombre de usuario o correo electrónico
 *     tags: [Usuarios]
 *     parameters:
 *       - in: path
 *         name: usuario
 *         schema:
 *           type: string
 *         description: Nombre de usuario a verificar
 *       - in: path
 *         name: email
 *         schema:
 *           type: string
 *         description: Correo electrónico a verificar
 *     responses:
 *       200:
 *         description: Resultado de la verificación
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 existe:
 *                   type: boolean
 *                 mensaje:
 *                   type: string
 *                 tipo:
 *                   type: string
 *                   description: Indica si el usuario fue encontrado por 'usuario' o 'email'
 *       500:
 *         description: Error del servidor
 */
router.get('/verificar/:usuario/:email', usuarioController.verificarUsuarioExistente);

/**
 * @swagger
 * /api/usuarios/select:
 *   get:
 *     summary: Obtener usuarios formateados para un select
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de usuarios formateada para select
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   nombre:
 *                     type: string
 *                   usuario:
 *                     type: string
 *                   perfil:
 *                     type: string
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error del servidor
 */
router.get('/select', authenticateToken, usuarioController.obtenerUsuariosParaSelect);

/**
 * @swagger
 * /api/usuarios/area/{areaId}:
 *   get:
 *     summary: Obtener usuarios por área
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: areaId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del área
 *     responses:
 *       200:
 *         description: Lista de usuarios del área obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   nombre:
 *                     type: string
 *                   usuario:
 *                     type: string
 *                   perfil:
 *                     type: string
 *                   email:
 *                     type: string
 *                   cargo:
 *                     type: string
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Área no encontrada
 */
router.get('/area/:areaId', authenticateToken, usuarioController.obtenerUsuariosPorArea);

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
 * /api/usuarios/{id}/cambiar-perfil:
 *   patch:
 *     summary: Cambiar el perfil de un usuario
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del usuario
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nuevoPerfil:
 *                 type: string
 *                 description: Nuevo perfil del usuario
 *     responses:
 *       200:
 *         description: Perfil del usuario actualizado exitosamente
 *       400:
 *         description: Error en los datos proporcionados
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Usuario no encontrado
 */
router.patch('/:id/cambiar-perfil', authenticateToken, isAdmin, usuarioController.cambiarPerfilUsuario);

module.exports = router;
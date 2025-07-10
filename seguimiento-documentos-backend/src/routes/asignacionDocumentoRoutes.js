const express = require('express');
const router = express.Router();
const asignacionDocumentoController = require('../controllers/asignacionDocumentoController');
const { authenticateToken, isSecretariaOrAbove } = require('../middleware/auth');

/**
 * @swagger
 * components:
 *   schemas:
 *     TipoDocumento:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: ID del tipo de documento
 *         nombre:
 *           type: string
 *           description: Nombre del tipo de documento
 *     
 *     Expediente:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: ID del expediente
 *         cut:
 *           type: string
 *           description: Código Único de Trámite
 *         asunto:
 *           type: string
 *           description: Asunto del expediente
 *     
 *     Documento:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: ID del documento
 *         numero_documento:
 *           type: string
 *           description: Número del documento
 *         asunto:
 *           type: string
 *           description: Asunto del documento
 *         fecha_documento:
 *           type: string
 *           format: date-time
 *           description: Fecha del documento
 *         estado:
 *           type: string
 *           description: Estado del documento
 *         TipoDocumento:
 *           $ref: '#/components/schemas/TipoDocumento'
 *         Expediente:
 *           $ref: '#/components/schemas/Expediente'
 *     
 *     Usuario:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: ID del usuario
 *         nombre:
 *           type: string
 *           description: Nombre del usuario
 *         apellido:
 *           type: string
 *           description: Apellido del usuario
 *         usuario:
 *           type: string
 *           description: Nombre de usuario
 *         email:
 *           type: string
 *           description: Correo electrónico del usuario
 *         perfil:
 *           type: string
 *           description: Perfil o rol del usuario
 *     
 *     AsignacionDocumento:
 *       type: object
 *       required:
 *         - id_documento
 *         - id_asignado
 *         - plazo_respuesta
 *       properties:
 *         id:
 *           type: integer
 *           description: ID auto-generado de la asignación
 *         id_documento:
 *           type: integer
 *           description: ID del documento asignado
 *         id_asignado:
 *           type: integer
 *           description: ID del usuario al que se asigna el documento
 *         fecha_asignacion:
 *           type: string
 *           format: date-time
 *           description: Fecha y hora de la asignación (generada automáticamente)
 *         plazo_respuesta:
 *           type: integer
 *           description: Plazo en días hábiles para responder
 *         fecha_limite:
 *           type: string
 *           format: date-time
 *           description: Fecha límite calculada para la respuesta
 *         fecha_prorroga:
 *           type: string
 *           format: date-time
 *           description: Fecha de solicitud de prórroga (opcional)
 *         plazo_prorroga:
 *           type: integer
 *           description: Plazo adicional en días hábiles (opcional)
 *         fecha_prorroga_limite:
 *           type: string
 *           format: date-time
 *           description: Nueva fecha límite con prórroga (opcional)
 *         fecha_respuesta:
 *           type: string
 *           format: date-time
 *           description: Fecha en que se respondió el documento (opcional)
 *         observaciones:
 *           type: string
 *           description: Observaciones sobre la asignación
 *         estado:
 *           type: boolean
 *           description: Estado de la asignación (activa/inactiva)
 *         asignado:
 *           $ref: '#/components/schemas/Usuario'
 *           description: Usuario al que se asignó el documento
 *         Documento:
 *           $ref: '#/components/schemas/Documento'
 *           description: Documento asignado
 *         creador:
 *           $ref: '#/components/schemas/Usuario'
 *           description: Usuario que creó la asignación
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * tags:
 *   name: Asignaciones de Documentos
 *   description: API para gestionar asignaciones de documentos
 */


router.use(authenticateToken);




/**
 * @swagger
 * /api/asignaciones:
 *   post:
 *     summary: Crear una nueva asignación de documento
 *     tags: [Asignaciones de Documentos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id_documento
 *               - id_asignado
 *               - plazo_respuesta
 *             properties:
 *               id_documento:
 *                 type: integer
 *               id_asignado:
 *                 type: integer
 *               plazo_respuesta:
 *                 type: integer
 *               observaciones:
 *                 type: string
 *     responses:
 *       201:
 *         description: Asignación creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AsignacionDocumento'
 *       400:
 *         description: Datos inválidos en la solicitud
 *       401:
 *         description: No autorizado
 */
router.post('/', asignacionDocumentoController.createAsignacion);

/**
 * @swagger
 * /api/asignaciones/{id}:
 *   put:
 *     summary: Actualizar una asignación de documento existente
 *     tags: [Asignaciones de Documentos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la asignación a actualizar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AsignacionDocumento'
 *     responses:
 *       200:
 *         description: Asignación actualizada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AsignacionDocumento'
 *       400:
 *         description: Datos inválidos en la solicitud
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Asignación no encontrada
 */
router.put('/:id', asignacionDocumentoController.updateAsignacion);

/**
 * @swagger
 * /api/asignaciones/{id}:
 *   delete:
 *     summary: Eliminar una asignación de documento
 *     tags: [Asignaciones de Documentos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la asignación a eliminar
 *     responses:
 *       200:
 *         description: Asignación eliminada exitosamente
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Asignación no encontrada
 */
router.delete('/:id', asignacionDocumentoController.deleteAsignacion);

/**
 * @swagger
 * /api/asignaciones/con-prorroga-pendiente:
 *   get:
 *     summary: Obtener asignaciones con prórroga pendiente
 *     description: Retorna todas las asignaciones de documentos que tienen una solicitud de prórroga pendiente.
 *     tags: [Asignaciones de Documentos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de asignaciones con prórroga pendiente obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/AsignacionDocumento'
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Acceso prohibido
 *       500:
 *         description: Error del servidor
 */
router.get('/con-prorroga-pendiente', isSecretariaOrAbove, asignacionDocumentoController.getAsignacionesConProrrogaPendiente);
/**
 * @swagger
 * /api/asignaciones:
 *   get:
 *     summary: Obtener asignaciones de documentos
 *     description: |
 *       Retorna todas las asignaciones para usuarios con perfil admin, jefe o secretaria.
 *       Para usuarios con perfil personal, solo retorna sus propias asignaciones.
 *       Incluye información detallada del usuario asignado, documento, tipo de documento y expediente relacionado.
 *     tags: [Asignaciones de Documentos]
 *     security:
 *       - bearerAuth: []
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
 *     responses:
 *       200:
 *         description: Lista de asignaciones obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 asignaciones:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       id_documento:
 *                         type: integer
 *                       id_asignado:
 *                         type: integer
 *                       fecha_asignacion:
 *                         type: string
 *                         format: date-time
 *                       plazo_respuesta:
 *                         type: integer
 *                       fecha_limite:
 *                         type: string
 *                         format: date-time
 *                       observaciones:
 *                         type: string
 *                       estado:
 *                         type: boolean
 *                       asignado:
 *                         $ref: '#/components/schemas/Usuario'
 *                       Documento:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           numero_documento:
 *                             type: string
 *                           asunto:
 *                             type: string
 *                           fecha_documento:
 *                             type: string
 *                             format: date-time
 *                           estado:
 *                             type: string
 *                           TipoDocumento:
 *                             $ref: '#/components/schemas/TipoDocumento'
 *                           Expediente:
 *                             $ref: '#/components/schemas/Expediente'
 *                       creador:
 *                         $ref: '#/components/schemas/Usuario'
 *                 totalAsignaciones:
 *                   type: integer
 *                   description: Número total de asignaciones encontradas
 *                 totalPaginas:
 *                   type: integer
 *                   description: Número total de páginas
 *                 paginaActual:
 *                   type: integer
 *                   description: Número de la página actual
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error del servidor
 */
router.get('/', asignacionDocumentoController.getAllAsignaciones);

/**
 * @swagger
 * /api/asignaciones/{id}:
 *   get:
 *     summary: Obtener una asignación de documento por ID
 *     description: Retorna una asignación específica con información detallada del usuario asignado, documento, tipo de documento y expediente relacionado.
 *     tags: [Asignaciones de Documentos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la asignación
 *     responses:
 *       200:
 *         description: Asignación obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 id_documento:
 *                   type: integer
 *                 id_asignado:
 *                   type: integer
 *                 fecha_asignacion:
 *                   type: string
 *                   format: date-time
 *                 plazo_respuesta:
 *                   type: integer
 *                 fecha_limite:
 *                   type: string
 *                   format: date-time
 *                 observaciones:
 *                   type: string
 *                 estado:
 *                   type: boolean
 *                 asignado:
 *                   $ref: '#/components/schemas/Usuario'
 *                 Documento:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     numero_documento:
 *                       type: string
 *                     asunto:
 *                       type: string
 *                     fecha_documento:
 *                       type: string
 *                       format: date-time
 *                     estado:
 *                       type: string
 *                     TipoDocumento:
 *                       $ref: '#/components/schemas/TipoDocumento'
 *                     Expediente:
 *                       $ref: '#/components/schemas/Expediente'
 *                 creador:
 *                   $ref: '#/components/schemas/Usuario'
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Asignación no encontrada
 */
router.get('/:id', asignacionDocumentoController.getAsignacionById);

/**
 * @swagger
 * /api/asignaciones/{id}/estado:
 *   patch:
 *     summary: Cambiar el estado de una asignación
 *     tags: [Asignaciones de Documentos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la asignación a actualizar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               estado:
 *                 type: boolean
 *                 description: Nuevo estado de la asignación
 *                 example: true
 *     responses:
 *       200:
 *         description: Estado de la asignación actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 asignacion:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     estado:
 *                       type: boolean
 *       400:
 *         description: Datos inválidos en la solicitud
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Asignación no encontrada
 */
router.patch('/:id/estado', authenticateToken, asignacionDocumentoController.cambiarEstadoAsignacion);

/**
 * @swagger
 * /api/asignaciones/{id}/solicitar-prorroga:
 *   patch:
 *     summary: Solicitar una prórroga para una asignación
 *     tags: [Asignaciones de Documentos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la asignación a actualizar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               plazo_prorroga:
 *                 type: integer
 *                 description: Plazo adicional en días hábiles
 *                 example: 5
 *     responses:
 *       200:
 *         description: Prórroga solicitada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 asignacion:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     plazo_prorroga:
 *                       type: integer
 *       400:
 *         description: Datos inválidos en la solicitud
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Asignación no encontrada
 */
router.patch('/:id/solicitar-prorroga', authenticateToken, asignacionDocumentoController.solicitarProrroga);

/**
 * @swagger
 * /api/asignaciones/{id}/aceptar-prorroga:
 *   patch:
 *     summary: Aceptar una prórroga para una asignación y actualizar el plazo
 *     tags: [Asignaciones de Documentos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la asignación a actualizar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nuevo_plazo_prorroga:
 *                 type: integer
 *                 description: Nuevo plazo adicional en días hábiles
 *                 example: 5
 *     responses:
 *       200:
 *         description: Prórroga aceptada y plazo actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 asignacion:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     plazo_prorroga:
 *                       type: integer
 *                     fecha_prorroga_limite:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Datos inválidos en la solicitud
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Asignación no encontrada
 */
router.patch('/:id/aceptar-prorroga', authenticateToken, asignacionDocumentoController.aceptarProrroga);

/**
 * @swagger
 * /api/asignaciones/documento/{documentoId}/pendientes:
 *   get:
 *     summary: Obtener el número de asignaciones pendientes para un documento específico
 *     tags: [Asignaciones de Documentos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: documentoId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del documento
 *     responses:
 *       200:
 *         description: Número de asignaciones pendientes obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 pendientes:
 *                   type: integer
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Documento no encontrado
 *       500:
 *         description: Error del servidor
 */
router.get('/documento/:documentoId/pendientes', authenticateToken, asignacionDocumentoController.getPendientesAsignacionesByDocumentoId);

/**
 * @swagger
 * /api/asignaciones/calendario:
 *   post:
 *     summary: Crear una nueva asignación de documento con plazo en días calendario
 *     description: Crea una nueva asignación de documento calculando la fecha límite en días calendario (incluyendo fines de semana).
 *     tags: [Asignaciones de Documentos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id_documento
 *               - id_asignado
 *               - plazo_respuesta
 *             properties:
 *               id_documento:
 *                 type: integer
 *                 description: ID del documento a asignar
 *               id_asignado:
 *                 type: integer
 *                 description: ID del usuario al que se asigna el documento
 *               plazo_respuesta:
 *                 type: integer
 *                 description: Plazo de respuesta en días calendario
 *               observaciones:
 *                 type: string
 *                 description: Observaciones o instrucciones para la asignación
 *     responses:
 *       201:
 *         description: Asignación creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AsignacionDocumento'
 *       400:
 *         description: Datos inválidos o plazo de respuesta no válido
 *       401:
 *         description: No autorizado
 *       500:
 *         description: Error del servidor
 */
router.post('/calendario', asignacionDocumentoController.createAsignacionCalendario);

module.exports = router;
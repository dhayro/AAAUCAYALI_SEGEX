const express = require('express');
const cors = require('cors');
const sequelize = require('./config/database');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const areaRoutes = require('./routes/areaRoutes');
const cargoRoutes = require('./routes/cargoRoutes');
const usuarioRoutes = require('./routes/usuarioRoutes');
const tipoDocumentoRoutes = require('./routes/tipoDocumentoRoutes');
const expedienteRoutes = require('./routes/expedienteRoutes');
const documentoRoutes = require('./routes/documentoRoutes');
const asignacionDocumentoRoutes = require('./routes/asignacionDocumentoRoutes');
const respuestaDocumentoRoutes = require('./routes/respuestaDocumentoRoutes');
const antecedenteRoutes = require('./routes/antecedenteRoutes');
const sisgedRoutes = require('./routes/sisgedRoutes');
const atencionRoutes = require('./routes/atencionRoutes');
const initAccionesAtencion = require('./utils/initAccionesAtencion');
const procedimientoRoutes = require('./routes/procedimientoRoutes');
const asignacionExpedienteRoutes = require('./routes/asignacionExpedienteRoutes');
const initAdmin = require('./utils/initAdmin');
const initTipoDocumentos = require('./utils/initTipoDocumentos');

require('dotenv').config();

// Set timezone to Lima, Peru
process.env.TZ = 'America/Lima';
console.log(`Application timezone set to: ${process.env.TZ}`);

// Manejo de errores no capturados
process.on('unhandledRejection', (reason, promise) => {
  console.error('[UNHANDLED REJECTION]', reason);
});

process.on('uncaughtException', (error) => {
  console.error('[UNCAUGHT EXCEPTION]', error);
});

const app = express();
const PORT = process.env.PORT || 3000;

// Opciones de Swagger
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API de Seguimiento de Documentos',
      version: '1.0.0',
      description: 'Documentación de la API para el sistema de seguimiento de documentos',
    },
    servers: [
      {
        url: process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`,
        description: 'Servidor de desarrollo',
      },
    ],
  },
  apis: ['./src/routes/*.js'], // Rutas a los archivos que contienen anotaciones de Swagger
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// CORS configuration
const corsOptions = {
  origin: ['http://localhost:3003', 'http://localhost:3004', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString(), port: PORT });
});

// Ruta para la documentación de Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/api/areas', areaRoutes);
app.use('/api/cargos', cargoRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/tipoDocumentos', tipoDocumentoRoutes);
app.use('/api/expedientes', expedienteRoutes);
app.use('/api/documentos', documentoRoutes);
app.use('/api/asignaciones', asignacionDocumentoRoutes);
app.use('/api/respuestas', respuestaDocumentoRoutes);
app.use('/api/antecedentes', antecedenteRoutes);
app.use('/api/sisged', sisgedRoutes);
app.use('/api/atenciones', atencionRoutes);
app.use('/api/procedimientos', procedimientoRoutes);
app.use('/api/asignaciones-expediente', asignacionExpedienteRoutes);

// Cargar todos los modelos
const Area = require('./models/Area');
const Cargo = require('./models/Cargo');
const Usuario = require('./models/Usuario');
const TipoDocumento = require('./models/TipoDocumento');
const Expediente = require('./models/Expediente');
const Documento = require('./models/Documento');
const AsignacionDocumento = require('./models/AsignacionDocumento');
const RespuestaDocumento = require('./models/RespuestaDocumento');
const Antecedente = require('./models/Antecedente');
const SisgedToken = require('./models/SisgedToken');
const Procedimiento = require('./models/Procedimiento');
const AsignacionExpediente = require('./models/AsignacionExpediente');
const DocumentoSisged = require('./models/DocumentoSisged');
const HistorialAsignacion = require('./models/HistorialAsignacion');
require('./models/RespuestaAsignacion');
const AccionAtencion = require('./models/AccionAtencion');
require('./models/relacionesAtencion');

// Cargar asociaciones
require('./models/associations');

// Importar la función de inicialización de la base de datos
const { initDatabaseFromSQL } = require('./config/database');

// Inicializar la base de datos antes de sincronizar los modelos
(async () => {
  try {
    // Inicializar la base de datos desde el script SQL si es necesario
    await initDatabaseFromSQL();

    // Sincronizar los modelos con la base de datos
    await sequelize.sync();

    // Hacer los models accesibles desde el app
    app.set('models', sequelize.models);

    // Inicializar usuario admin y tipos de documentos
    await initAdmin();
    await initTipoDocumentos();
    await initAccionesAtencion();

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Swagger documentation available at http://localhost:${PORT}/api-docs`);
    });
  } catch (error) {
    console.error('Error durante la inicialización de la aplicación:', error);
  }
})();

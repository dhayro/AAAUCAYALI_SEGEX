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
const initAdmin = require('./utils/initAdmin');
require('dotenv').config();

const app = express();

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

app.use(cors());
app.use(express.json());

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

const PORT = process.env.PORT || 3000;

sequelize.sync().then(async () => {
  // Inicializar usuario admin
  await initAdmin();

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Swagger documentation available at http://localhost:${PORT}/api-docs`);
  });
});

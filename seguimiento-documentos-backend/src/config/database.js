const { Sequelize } = require('sequelize');
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config(); 


// Configuración de la base de datos
const config = {
  host: process.env.DB_HOST || 'localhost',
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'seguimiento_documentos',
  dialect: 'mysql'
};

// Función para inicializar la base de datos con el script SQL
async function initDatabaseFromSQL() {
  let connection;
  try {
    // Conectar sin especificar la base de datos
    connection = await mysql.createConnection({
      host: config.host,
      user: config.username,
      password: config.password,
      multipleStatements: true
    });
    
    // Verificar si la base de datos existe
    const [rows] = await connection.query(
      `SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = '${config.database}'`
    );
    
    if (rows.length === 0) {
      console.log(`La base de datos '${config.database}' no existe. Inicializando...`);
      
      // Leer y ejecutar el script SQL
      const sqlPath = path.join(__dirname, '../../init.sql');
      const sqlScript = fs.readFileSync(sqlPath, 'utf8');
      await connection.query(sqlScript);
      
      console.log('Base de datos inicializada correctamente');
    } else {
      console.log(`La base de datos '${config.database}' ya existe.`);
    }
  } catch (error) {
    console.error('Error al inicializar la base de datos:', error);
  } finally {
    if (connection) await connection.end();
  }
}

// Crear instancia de Sequelize
const sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  {
    host: config.host,
    dialect: config.dialect,
    timezone: '-05:00', // Zona horaria de Lima, Perú (UTC-5)
    dialectOptions: {
      // Para MySQL
      dateStrings: true,
      typeCast: function (field, next) {
        if (field.type === 'DATETIME' || field.type === 'TIMESTAMP') {
          return field.string();
        }
        return next();
      },
    },
    logging: false
  }
);

// Exportar la instancia de Sequelize y la función de inicialización
module.exports = sequelize;
module.exports.config = config;
module.exports.initDatabaseFromSQL = initDatabaseFromSQL;
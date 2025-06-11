const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const config = require('../config/database').config; // Asumiendo que tienes la configuración exportada

async function initDatabase() {
  let connection;
  
  try {
    // Primero conectamos sin especificar la base de datos
    connection = await mysql.createConnection({
      host: config.host,
      user: config.username,
      password: config.password,
      multipleStatements: true // Importante para ejecutar múltiples consultas SQL
    });
    
    console.log('Conectado al servidor MySQL');
    
    // Leer el archivo SQL
    const sqlPath = path.join(__dirname, '../../init.sql');
    const sqlScript = fs.readFileSync(sqlPath, 'utf8');
    
    // Ejecutar el script SQL
    console.log('Ejecutando script de inicialización de base de datos...');
    await connection.query(sqlScript);
    console.log('Base de datos inicializada correctamente');
    
  } catch (error) {
    console.error('Error al inicializar la base de datos:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Conexión cerrada');
    }
  }
}

module.exports = initDatabase;
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config(); // Para cargar variables de entorno si las usas

async function initDb() {
  const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true
  };

  let connection;
  
  try {
    // Conectar al servidor MySQL
    connection = await mysql.createConnection(config);
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
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Conexión cerrada');
    }
  }
}

// Ejecutar la función
initDb();
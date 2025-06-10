const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
  host: process.env.DB_HOST,
  dialect: 'mysql',
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
  // logging: false, // Esto desactivará todos los logs de Sequelize
  logging: console.log // Esto mostrará todas las consultas SQL en la consola
});

module.exports = sequelize;
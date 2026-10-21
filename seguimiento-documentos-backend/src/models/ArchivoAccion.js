const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const AccionLlamada = require('./AccionLlamada');

const ArchivoAccion = sequelize.define('ArchivoAccion', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  id_accion_llamada: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  nombre_original: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  descripcion: {
    type: DataTypes.STRING(255),
    comment: 'Qué contiene el archivo, para identificarlo',
  },
  nombre_guardado: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  mimetype: {
    type: DataTypes.STRING(100),
  },
  tamano: {
    type: DataTypes.INTEGER,
  },
  id_usuario: {
    type: DataTypes.INTEGER,
  },
}, {
  tableName: 'archivos_accion',
  timestamps: true,
  createdAt: 'fecha_subida',
  updatedAt: false,
});

ArchivoAccion.belongsTo(AccionLlamada, { foreignKey: 'id_accion_llamada' });

module.exports = ArchivoAccion;

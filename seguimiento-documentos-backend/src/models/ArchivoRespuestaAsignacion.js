const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ArchivoRespuestaAsignacion = sequelize.define('ArchivoRespuestaAsignacion', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  id_respuesta: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  descripcion: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  nombre_original: {
    type: DataTypes.STRING(255),
    allowNull: false,
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
  tableName: 'archivos_respuesta_asignacion',
  timestamps: true,
  createdAt: 'fecha_subida',
  updatedAt: false,
});

module.exports = ArchivoRespuestaAsignacion;

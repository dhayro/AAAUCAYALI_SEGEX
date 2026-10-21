const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const AsignacionExpediente = require('./AsignacionExpediente');
const Usuario = require('./Usuario');
const ArchivoRespuestaAsignacion = require('./ArchivoRespuestaAsignacion');

const RespuestaAsignacion = sequelize.define('RespuestaAsignacion', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  id_asignacion: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  texto: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Avance o respuesta sobre la asignación',
  },
  id_usuario: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
}, {
  tableName: 'respuestas_asignacion',
  timestamps: true,
  createdAt: 'fecha_creacion',
  updatedAt: false,
});

RespuestaAsignacion.belongsTo(AsignacionExpediente, { foreignKey: 'id_asignacion' });
RespuestaAsignacion.belongsTo(Usuario, { as: 'usuario', foreignKey: 'id_usuario' });
RespuestaAsignacion.hasMany(ArchivoRespuestaAsignacion, { as: 'archivos', foreignKey: 'id_respuesta' });

module.exports = RespuestaAsignacion;

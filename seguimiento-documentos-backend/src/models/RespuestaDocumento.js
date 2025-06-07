const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const AsignacionDocumento = require('./AsignacionDocumento');
const Usuario = require('./Usuario');

const RespuestaDocumento = sequelize.define('RespuestaDocumento', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  fecha_respuesta: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  observaciones: {
    type: DataTypes.TEXT,
  },
  fecha_creacion: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  fecha_modificacion: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  estado: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'respuestas_documentos',
  timestamps: false,
});

RespuestaDocumento.belongsTo(AsignacionDocumento, { foreignKey: 'id_asignacion' });
RespuestaDocumento.belongsTo(Usuario, { as: 'creador', foreignKey: 'id_usuario_creador' });
RespuestaDocumento.belongsTo(Usuario, { as: 'modificador', foreignKey: 'id_usuario_modificador' });

module.exports = RespuestaDocumento;
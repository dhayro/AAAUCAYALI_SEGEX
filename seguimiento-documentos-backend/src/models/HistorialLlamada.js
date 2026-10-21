const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Usuario = require('./Usuario');

const HistorialLlamada = sequelize.define('HistorialLlamada', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  id_llamada: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  tipo: {
    type: DataTypes.STRING(40),
    allowNull: false,
    comment: 'REGISTRO, EDICION, RESPONDIDO, REASIGNACION, ACCION_AGREGADA, ACCION_EJECUTADA, ACCION_PENDIENTE, OBSERVACION, ARCHIVO_SUBIDO, ARCHIVO_ELIMINADO',
  },
  detalle: {
    type: DataTypes.TEXT,
  },
  id_usuario: {
    type: DataTypes.INTEGER,
  },
}, {
  tableName: 'historial_llamadas',
  timestamps: true,
  createdAt: 'fecha_registro',
  updatedAt: false,
});

HistorialLlamada.belongsTo(Usuario, { as: 'usuario', foreignKey: 'id_usuario' });

module.exports = HistorialLlamada;

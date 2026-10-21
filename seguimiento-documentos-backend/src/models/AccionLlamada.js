const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const LlamadaAdministrado = require('./LlamadaAdministrado');
const AccionAtencion = require('./AccionAtencion');

const AccionLlamada = sequelize.define('AccionLlamada', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  id_llamada: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  id_accion: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  estado: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'PENDIENTE',
    comment: 'PENDIENTE o EJECUTADO',
  },
  observacion: {
    type: DataTypes.TEXT,
  },
  fecha_ejecucion: {
    type: DataTypes.DATEONLY,
  },
  id_usuario_creador: {
    type: DataTypes.INTEGER,
  },
  id_usuario_modificador: {
    type: DataTypes.INTEGER,
  },
}, {
  tableName: 'acciones_llamada',
  timestamps: true,
  createdAt: 'fecha_creacion',
  updatedAt: 'fecha_modificacion',
});

AccionLlamada.belongsTo(LlamadaAdministrado, { foreignKey: 'id_llamada' });
AccionLlamada.belongsTo(AccionAtencion, { as: 'accion', foreignKey: 'id_accion' });

module.exports = AccionLlamada;

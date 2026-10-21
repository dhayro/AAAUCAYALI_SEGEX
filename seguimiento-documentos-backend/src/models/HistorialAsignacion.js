const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const AsignacionExpediente = require('./AsignacionExpediente');
const Usuario = require('./Usuario');

const HistorialAsignacion = sequelize.define('HistorialAsignacion', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  id_asignacion: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  tipo: {
    type: DataTypes.STRING(30),
    allowNull: false,
    comment: 'SOLICITUD_PRORROGA, PRORROGA_ACEPTADA o PRORROGA_RECHAZADA',
  },
  plazo: {
    type: DataTypes.INTEGER,
    comment: 'Días de prórroga involucrados en el evento',
  },
  fecha_evento: {
    type: DataTypes.DATEONLY,
  },
  observacion: {
    type: DataTypes.TEXT,
  },
  id_usuario: {
    type: DataTypes.INTEGER,
  },
}, {
  tableName: 'historial_asignaciones',
  timestamps: true,
  createdAt: 'fecha_registro',
  updatedAt: false,
});

HistorialAsignacion.belongsTo(AsignacionExpediente, { foreignKey: 'id_asignacion' });
HistorialAsignacion.belongsTo(Usuario, { as: 'usuario', foreignKey: 'id_usuario' });

module.exports = HistorialAsignacion;

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Expediente = require('./Expediente');
const Usuario = require('./Usuario');

const AsignacionExpediente = sequelize.define('AsignacionExpediente', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  cut: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  id_expediente: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Se enlaza al expediente cuando los datos de expedientes estén cargados',
  },
  id_usuario: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  fecha_asignacion: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  plazo_atencion: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Plazo de atención en días calendario',
  },
  fecha_vencimiento: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  fecha_prorroga: {
    type: DataTypes.DATEONLY,
  },
  plazo_prorroga: {
    type: DataTypes.INTEGER,
    comment: 'Plazo de prórroga en días calendario',
  },
  fecha_vencimiento_prorroga: {
    type: DataTypes.DATEONLY,
  },
  observacion: {
    type: DataTypes.TEXT,
    comment: 'Entregable o detalle de la asignación',
  },
  numero_orden: {
    type: DataTypes.STRING(50),
    comment: 'Número de orden (para locadores)',
  },
  estado: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  id_usuario_creador: {
    type: DataTypes.INTEGER,
  },
  id_usuario_modificador: {
    type: DataTypes.INTEGER,
  },
}, {
  tableName: 'asignaciones_expedientes',
  timestamps: true,
  createdAt: 'fecha_creacion',
  updatedAt: 'fecha_modificacion',
});

AsignacionExpediente.belongsTo(Expediente, { foreignKey: 'id_expediente' });
AsignacionExpediente.belongsTo(Usuario, { as: 'asignado', foreignKey: 'id_usuario' });
AsignacionExpediente.belongsTo(Usuario, { as: 'creador', foreignKey: 'id_usuario_creador' });
AsignacionExpediente.belongsTo(Usuario, { as: 'modificador', foreignKey: 'id_usuario_modificador' });

module.exports = AsignacionExpediente;

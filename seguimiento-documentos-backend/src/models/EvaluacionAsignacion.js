const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const AsignacionExpediente = require('./AsignacionExpediente');
const Usuario = require('./Usuario');

const EvaluacionAsignacion = sequelize.define('EvaluacionAsignacion', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  id_asignacion: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  resultado: {
    type: DataTypes.STRING(20),
    allowNull: false,
    comment: 'APROBADA cierra la asignación; OBSERVADA la devuelve para nueva respuesta',
  },
  observacion: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  fecha_ultima_respuesta: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'Fecha y hora de la última respuesta subida al momento de evaluar',
  },
  id_usuario: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Gestor que evalúa',
  },
}, {
  tableName: 'evaluaciones_asignacion',
  timestamps: true,
  createdAt: 'fecha_evaluacion',
  updatedAt: false,
});

EvaluacionAsignacion.belongsTo(AsignacionExpediente, { foreignKey: 'id_asignacion' });
EvaluacionAsignacion.belongsTo(Usuario, { as: 'evaluador', foreignKey: 'id_usuario' });

module.exports = EvaluacionAsignacion;

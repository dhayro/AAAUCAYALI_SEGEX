const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Documento = require('./Documento');
const Usuario = require('./Usuario');

const AsignacionDocumento = sequelize.define('AsignacionDocumento', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  fecha_asignacion: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  plazo_respuesta: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  fecha_limite: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  fecha_prorroga: {
    type: DataTypes.DATE,
  },
  plazo_prorroga: {
    type: DataTypes.INTEGER,
  },
  fecha_prorroga_limite: {
    type: DataTypes.DATE,
  },
  fecha_respuesta: {
    type: DataTypes.DATE,
  },
  observaciones: {
    type: DataTypes.TEXT,
  },
  estado: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'asignaciones_documentos',
  timestamps: true,
  createdAt: 'fecha_creacion',
  updatedAt: 'fecha_modificacion'
});

AsignacionDocumento.belongsTo(Documento, { foreignKey: 'id_documento' });
AsignacionDocumento.belongsTo(Usuario, { as: 'asignado', foreignKey: 'id_asignado' });
AsignacionDocumento.belongsTo(Usuario, { as: 'creador', foreignKey: 'id_usuario_creador' });
AsignacionDocumento.belongsTo(Usuario, { as: 'modificador', foreignKey: 'id_usuario_modificador' });

module.exports = AsignacionDocumento;
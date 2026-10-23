const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Usuario = require('./Usuario');

const LlamadaAdministrado = sequelize.define('LlamadaAdministrado', {
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
  },
  fecha_llamada: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  nombre_llamante: {
    type: DataTypes.STRING(150),
    allowNull: false,
  },
  telefono: {
    type: DataTypes.STRING(30),
  },
  motivo: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  // LLAMADA (por defecto) o PRESENCIAL: atención en persona, registrada con el mismo flujo.
  tipo_atencion: {
    type: DataTypes.STRING(12),
    allowNull: false,
    defaultValue: 'LLAMADA',
  },
  fecha_respuesta: {
    type: DataTypes.DATEONLY,
    comment: 'Fecha en que se da o se dará respuesta al administrado',
  },
  respondido: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  id_responsable: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Usuario que atiende la llamada',
  },
  id_usuario_creador: {
    type: DataTypes.INTEGER,
  },
  id_usuario_modificador: {
    type: DataTypes.INTEGER,
  },
}, {
  tableName: 'llamadas_administrado',
  timestamps: true,
  createdAt: 'fecha_creacion',
  updatedAt: 'fecha_modificacion',
});

LlamadaAdministrado.belongsTo(Usuario, { as: 'responsable', foreignKey: 'id_responsable' });
LlamadaAdministrado.belongsTo(Usuario, { as: 'creador', foreignKey: 'id_usuario_creador' });
LlamadaAdministrado.belongsTo(Usuario, { as: 'modificador', foreignKey: 'id_usuario_modificador' });

module.exports = LlamadaAdministrado;

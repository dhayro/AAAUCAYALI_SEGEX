const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Usuario = require('./Usuario');

const Procedimiento = sequelize.define('Procedimiento', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  nombre: {
    type: DataTypes.STRING(200),
    allowNull: false,
  },
  plazo: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Plazo en días hábiles',
  },
  es_tupa: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
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
  tableName: 'procedimientos',
  indexes: [
    { unique: true, fields: ['nombre', 'es_tupa'] },
  ],
  timestamps: true,
  createdAt: 'fecha_creacion',
  updatedAt: 'fecha_modificacion',
});

Procedimiento.belongsTo(Usuario, { as: 'creador', foreignKey: 'id_usuario_creador' });
Procedimiento.belongsTo(Usuario, { as: 'modificador', foreignKey: 'id_usuario_modificador' });

module.exports = Procedimiento;

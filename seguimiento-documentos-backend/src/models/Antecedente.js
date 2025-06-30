const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Antecedente = sequelize.define('Antecedente', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  id_expediente: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  fecha_incidente: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  persona_involucrada: {
    type: DataTypes.STRING(200),
    allowNull: false,
  },
  telefono: {
    type: DataTypes.STRING(20),
  },
  resumen: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
}, {
  tableName: 'antecedentes',
  timestamps: true,
  createdAt: 'fecha_creacion',
  updatedAt: 'fecha_modificacion'
});

module.exports = Antecedente;
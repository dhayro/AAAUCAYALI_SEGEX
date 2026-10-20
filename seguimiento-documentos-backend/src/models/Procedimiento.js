const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

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
}, {
  tableName: 'procedimientos',
  timestamps: false,
});

module.exports = Procedimiento;

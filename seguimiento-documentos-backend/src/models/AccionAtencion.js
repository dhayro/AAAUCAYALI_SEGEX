const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AccionAtencion = sequelize.define('AccionAtencion', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  nombre: {
    type: DataTypes.STRING(150),
    allowNull: false,
    unique: true,
  },
  requiere_archivo: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Si true, la acción debe respaldarse con archivos de avance',
  },
  activo: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
}, {
  tableName: 'acciones_atencion',
  timestamps: false,
});

module.exports = AccionAtencion;

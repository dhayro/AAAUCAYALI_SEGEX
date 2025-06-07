const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TipoDocumento = sequelize.define('TipoDocumento', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  nombre: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true,
  }
}, {
  tableName: 'tipo_documentos',
  timestamps: false,
});

module.exports = TipoDocumento;
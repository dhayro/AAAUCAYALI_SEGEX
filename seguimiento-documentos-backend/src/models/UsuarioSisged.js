const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Usuario de SISGED asociado a un usuario del sistema, con su vigencia (fecha de inicio y fin).
// Un usuario del sistema puede tener varios usuarios de SISGED a lo largo del tiempo.
const UsuarioSisged = sequelize.define('UsuarioSisged', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  id_usuario: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  usuario_sisged: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  fecha_inicio: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  fecha_fin: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  observacion: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'usuarios_sisged',
  timestamps: true,
  createdAt: 'fecha_creacion',
  updatedAt: 'fecha_modificacion',
});

module.exports = UsuarioSisged;

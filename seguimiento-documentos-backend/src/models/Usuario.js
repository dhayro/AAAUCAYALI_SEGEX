const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Cargo = require('./Cargo');
const Area = require('./Area');

const Usuario = sequelize.define('Usuario', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  usuario: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
  },
  nombre: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  apellido: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  dni: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
  },
  id_cargo: {
    type: DataTypes.INTEGER,
    references: {
      model: Cargo,
      key: 'id',
    },
  },
  id_area: {
    type: DataTypes.INTEGER,
    references: {
      model: Area,
      key: 'id',
    },
  },
  perfil: {
    type: DataTypes.ENUM('admin', 'personal', 'jefe', 'secretaria'),
    defaultValue: 'personal',
    allowNull: false,
  },
  telefono: {
    type: DataTypes.STRING(20),
  },
  direccion: {
    type: DataTypes.TEXT,
  },
  fecha_nacimiento: {
    type: DataTypes.DATE,
  },
  estado: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'usuarios',
  timestamps: false,
});

Usuario.belongsTo(Cargo, { foreignKey: 'id_cargo' });
Usuario.belongsTo(Area, { foreignKey: 'id_area' });

module.exports = Usuario;
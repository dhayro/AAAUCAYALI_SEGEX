const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Usuario = require('./Usuario');
const TipoDocumento = require('./TipoDocumento');

const Expediente = sequelize.define('Expediente', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  cut: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
  },
  estupa: {
    type: DataTypes.STRING(50),
  },
  tipo_procedimiento: {
    type: DataTypes.STRING(100),
  },
  periodo: {
    type: DataTypes.INTEGER,
  },
  numero_documento: {
    type: DataTypes.STRING(100),
  },
  asunto: {
    type: DataTypes.TEXT,
  },
  remitente: {
    type: DataTypes.STRING(100),
  },
  fecha_creacion: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  fecha_cierre: {
    type: DataTypes.DATE,
  },
  fecha_ultima_respuesta: {
    type: DataTypes.DATE,
  },
  fecha_ultima_modificacion: {
    type: DataTypes.DATE,
  },
  estado: {
    type: DataTypes.ENUM('abierto', 'cerrado', 'pendiente', 'en_revision'),
    defaultValue: 'abierto',
    allowNull: false,
  },
}, {
  tableName: 'expedientes',
  timestamps: false,
});

Expediente.belongsTo(TipoDocumento, { foreignKey: 'id_tipo_documento' });
Expediente.belongsTo(Usuario, { as: 'creador', foreignKey: 'id_usuario_creador' });
Expediente.belongsTo(Usuario, { as: 'modificador', foreignKey: 'id_usuario_modificador' });

module.exports = Expediente;
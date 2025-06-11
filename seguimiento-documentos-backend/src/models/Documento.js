const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Expediente = require('./Expediente');
const TipoDocumento = require('./TipoDocumento');
const Usuario = require('./Usuario');

const Documento = sequelize.define('Documento', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  numero_documento: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  asunto: {
    type: DataTypes.TEXT,
  },
  fecha_documento: {
    type: DataTypes.DATE,
  },
  ultimo_escritorio: {
    type: DataTypes.STRING(100),
  },
  ultima_oficina_area: {
    type: DataTypes.STRING(100),
  },
  fecha_ingreso_ultimo_escritorio: {
    type: DataTypes.DATE,
  },
  bandeja: {
    type: DataTypes.STRING(255),
  },
  brecha: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Fecha de brecha para el documento'
  },
  estado: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'Estado del documento (pendiente, en_revision, aprobado, rechazado)',
  },
}, {
  tableName: 'documentos',
  timestamps: true,
  createdAt: 'fecha_creacion',
  updatedAt: 'fecha_modificacion'
});

Documento.belongsTo(Expediente, { foreignKey: 'id_expediente' });
Documento.belongsTo(TipoDocumento, { foreignKey: 'id_tipo_documento' });
Documento.belongsTo(Usuario, { as: 'creador', foreignKey: 'id_usuario_creador' });
Documento.belongsTo(Usuario, { as: 'modificador', foreignKey: 'id_usuario_modificador' });

module.exports = Documento;
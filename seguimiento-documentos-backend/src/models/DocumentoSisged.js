const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DocumentoSisged = sequelize.define('DocumentoSisged', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  iddochij: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    comment: 'ID del documento en SISGED',
  },
  cut: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  id_expediente: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  adjunto: { type: DataTypes.TEXT },
  asunto: { type: DataTypes.TEXT },
  desofi: { type: DataTypes.TEXT },
  destip: { type: DataTypes.STRING(50) },
  dtipdoc: { type: DataTypes.STRING(100) },
  destino: { type: DataTypes.TEXT },
  estado: { type: DataTypes.STRING(50) },
  ext: { type: DataTypes.STRING(20) },
  flganex: { type: DataTypes.INTEGER },
  flgori: { type: DataTypes.STRING(5) },
  flgver: { type: DataTypes.INTEGER },
  fol: { type: DataTypes.INTEGER },
  iddocanex: { type: DataTypes.INTEGER },
  iddocpad: { type: DataTypes.INTEGER },
  iddocusu: { type: DataTypes.INTEGER },
  iddocvin: { type: DataTypes.INTEGER },
  iddocest: { type: DataTypes.INTEGER },
  idofi: { type: DataTypes.INTEGER },
  idtipdoc: { type: DataTypes.INTEGER },
  nomarch: { type: DataTypes.TEXT },
  ndoc: { type: DataTypes.STRING(255) },
  remi: { type: DataTypes.TEXT },
  stfecrea: { type: DataTypes.DATE },
  flgpriv: { type: DataTypes.INTEGER },
}, {
  tableName: 'documentos_sisged',
  timestamps: true,
  createdAt: 'fecha_creacion',
  updatedAt: 'fecha_modificacion',
});

module.exports = DocumentoSisged;

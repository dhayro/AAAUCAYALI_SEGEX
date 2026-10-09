const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const SisgedToken = sequelize.define(
  "SisgedToken",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    token: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    fecha_vencimiento: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    dias_validez: {
      type: DataTypes.INTEGER,
      comment: "Días desde la creación hasta el vencimiento",
    },
    activo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: "true = vigente, false = expirado o inactivo",
    },
    notas: {
      type: DataTypes.TEXT,
      comment: "Notas sobre el token (ej: del usuario X, del Postman, etc)",
    },
  },
  {
    tableName: "sisged_tokens",
    timestamps: true,
    createdAt: "fecha_creacion",
    updatedAt: "fecha_modificacion",
  }
);

module.exports = SisgedToken;

const { DataTypes, Op } = require("sequelize");
const sequelize = require("../config/database");
const Usuario = require("./Usuario");

const Expediente = sequelize.define(
  "Expediente",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    idoc: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
    },
    cut: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    origen: {
      type: DataTypes.STRING(20),
    },
    destip: {
      type: DataTypes.STRING(100),
    },
    estupa: {
      type: DataTypes.STRING(20),
    },
    proced: {
      type: DataTypes.TEXT,
    },
    asunto: {
      type: DataTypes.TEXT,
    },
    refe: {
      type: DataTypes.TEXT,
    },
    fol: {
      type: DataTypes.INTEGER,
    },
    flgcut: {
      type: DataTypes.INTEGER,
    },
    destinos: {
      type: DataTypes.TEXT,
    },
    ndoc: {
      type: DataTypes.STRING(255),
    },
    feccrea: {
      type: DataTypes.DATE,
    },
    solfec: {
      type: DataTypes.DATEONLY,
    },
    solhor: {
      type: DataTypes.TIME,
    },
    usurem: {
      type: DataTypes.TEXT,
    },
    ofirem: {
      type: DataTypes.TEXT,
    },
    flgarc: {
      type: DataTypes.INTEGER,
    },
    tema: {
      type: DataTypes.TEXT,
    },
    estado: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    tableName: "expedientes",
    timestamps: true,
    createdAt: "fecha_creacion",
    updatedAt: "fecha_modificacion",
  }
);

Expediente.belongsTo(Usuario, {
  as: "creador",
  foreignKey: "id_usuario_creador",
});
Expediente.belongsTo(Usuario, {
  as: "modificador",
  foreignKey: "id_usuario_modificador",
});

Expediente.vincularAsignaciones = async (expediente, transaction) => {
  const AsignacionExpediente = sequelize.models.AsignacionExpediente;
  if (!AsignacionExpediente || !expediente) return;
  await AsignacionExpediente.update(
    { id_expediente: null },
    { where: { id_expediente: expediente.id, cut: { [Op.ne]: expediente.cut } }, transaction }
  );
  await AsignacionExpediente.update(
    { id_expediente: expediente.id },
    { where: { cut: expediente.cut }, transaction }
  );
  await sequelize.models.DocumentoSisged.update(
    { id_expediente: expediente.id },
    { where: { cut: expediente.cut }, transaction }
  );
};

Expediente.addHook("afterSave", (expediente, options) =>
  Expediente.vincularAsignaciones(expediente, options.transaction)
);

module.exports = Expediente;

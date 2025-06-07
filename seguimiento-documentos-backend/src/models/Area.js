const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Area = sequelize.define('Area', {
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
  },
  id_padre: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
}, {
  tableName: 'areas',
  timestamps: false,
});

Area.hasMany(Area, { as: 'subAreas', foreignKey: 'id_padre' });
Area.belongsTo(Area, { as: 'areaPadre', foreignKey: 'id_padre' });

module.exports = Area;
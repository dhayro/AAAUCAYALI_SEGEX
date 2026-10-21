const LlamadaAdministrado = require('./LlamadaAdministrado');
const AccionLlamada = require('./AccionLlamada');
const ArchivoAccion = require('./ArchivoAccion');
const HistorialLlamada = require('./HistorialLlamada');

LlamadaAdministrado.hasMany(AccionLlamada, { foreignKey: 'id_llamada', as: 'acciones' });
AccionLlamada.hasMany(ArchivoAccion, { foreignKey: 'id_accion_llamada', as: 'archivos' });
LlamadaAdministrado.hasMany(HistorialLlamada, { foreignKey: 'id_llamada', as: 'antecedentes' });

module.exports = { LlamadaAdministrado, AccionLlamada, ArchivoAccion, HistorialLlamada };

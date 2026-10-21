const LlamadaAdministrado = require('./LlamadaAdministrado');
const AccionLlamada = require('./AccionLlamada');
const ArchivoAccion = require('./ArchivoAccion');

LlamadaAdministrado.hasMany(AccionLlamada, { foreignKey: 'id_llamada', as: 'acciones' });
AccionLlamada.hasMany(ArchivoAccion, { foreignKey: 'id_accion_llamada', as: 'archivos' });

module.exports = { LlamadaAdministrado, AccionLlamada, ArchivoAccion };

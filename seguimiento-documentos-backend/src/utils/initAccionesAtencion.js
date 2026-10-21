const AccionAtencion = require('../models/AccionAtencion');

const ACCIONES_INICIALES = [
  { nombre: 'EMITIR INFORME TÉCNICO', requiere_archivo: true },
  { nombre: 'EMITIR INFORME LEGAL', requiere_archivo: true },
  { nombre: 'EMITIR INFORME TÉCNICO LEGAL', requiere_archivo: true },
  { nombre: 'PROYECTAR RESOLUCIÓN', requiere_archivo: true },
  { nombre: 'INSPECCIÓN OCULAR', requiere_archivo: true },
  { nombre: 'VERIFICACIÓN TÉCNICA DE CAMPO', requiere_archivo: true },
  { nombre: 'OTRA (SIN ARCHIVO)', requiere_archivo: false },
];

async function initAccionesAtencion() {
  for (const accion of ACCIONES_INICIALES) {
    await AccionAtencion.findOrCreate({ where: { nombre: accion.nombre }, defaults: accion });
  }
}

module.exports = initAccionesAtencion;

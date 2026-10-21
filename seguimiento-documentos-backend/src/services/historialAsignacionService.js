const HistorialAsignacion = require('../models/HistorialAsignacion');
const { hoyLima } = require('../utils/fechas');

// Tipos: RESPUESTA_REGISTRADA, ARCHIVO_SUBIDO, ARCHIVO_EDITADO, ARCHIVO_REEMPLAZADO,
// ARCHIVO_ELIMINADO, EVALUACION_APROBADA, EVALUACION_OBSERVADA (además de los de prórroga).
const registrarEvento = (idAsignacion, idUsuario, tipo, observacion = null) =>
  HistorialAsignacion.create({
    id_asignacion: idAsignacion,
    tipo,
    fecha_evento: hoyLima(),
    observacion,
    id_usuario: idUsuario,
  });

module.exports = { registrarEvento };

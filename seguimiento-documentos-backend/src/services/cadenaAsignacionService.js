const AsignacionExpediente = require('../models/AsignacionExpediente');

const CAMPOS_CADENA = ['id', 'id_usuario', 'id_asignacion_anterior', 'id_asignacion_siguiente', 'motivo_cierre'];

// Asignación actual (la última de la cadena) a partir de cualquiera de sus filas.
const cabezaDeCadena = async (asignacion) => {
  let actual = await AsignacionExpediente.findByPk(asignacion.id, { attributes: CAMPOS_CADENA });
  while (actual.id_asignacion_siguiente) {
    const siguiente = await AsignacionExpediente.findByPk(actual.id_asignacion_siguiente, {
      attributes: ['id', 'id_usuario', 'id_asignacion_anterior', 'id_asignacion_siguiente', 'motivo_cierre'],
    });
    if (!siguiente) break;
    actual = siguiente;
  }
  return actual;
};

// Ids de todas las filas de la cadena, de la primera a la última.
const idsDeCadena = async (asignacion) => {
  let primera = await AsignacionExpediente.findByPk(asignacion.id, { attributes: CAMPOS_CADENA });
  while (primera.id_asignacion_anterior) {
    const anterior = await AsignacionExpediente.findByPk(primera.id_asignacion_anterior, {
      attributes: ['id', 'id_asignacion_anterior', 'id_asignacion_siguiente', 'motivo_cierre', 'id_usuario'],
    });
    if (!anterior) break;
    primera = anterior;
  }
  const ids = [];
  let actual = primera;
  while (actual) {
    ids.push(actual.id);
    if (!actual.id_asignacion_siguiente) break;
    actual = await AsignacionExpediente.findByPk(actual.id_asignacion_siguiente, {
      attributes: ['id', 'id_asignacion_anterior', 'id_asignacion_siguiente', 'motivo_cierre', 'id_usuario'],
    });
  }
  return ids;
};

// Puede ver la fila el gestor, su dueño, o la persona que tiene hoy la cadena (así ve lo que subió el anterior).
const puedeVerCadena = async (asignacion, usuario) => {
  if (['admin', 'jefe', 'secretaria'].includes(usuario.perfil)) return true;
  if (asignacion.id_usuario === usuario.id) return true;
  const cabeza = await cabezaDeCadena(asignacion);
  return cabeza.id_usuario === usuario.id;
};

module.exports = { cabezaDeCadena, idsDeCadena, puedeVerCadena };

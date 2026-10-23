const UsuarioSisged = require('../models/UsuarioSisged');
const Usuario = require('../models/Usuario');

// Usuarios de SISGED que aparecen en el texto de una oficina, por ejemplo:
//   "[AAA UCAYALI] - (P) USER2026_AAAU21 - -"  -> USER2026_AAAU21
//   "[VEN ALA.PUC] - CDOMINGUEZR"              -> CDOMINGUEZR
// Se separa por " - ", se quitan la oficina entre corchetes y el rol (P)/(J), y se toman los trozos que son
// un solo nombre sin espacios. Los nombres completos (con espacios) no son usuarios de SISGED.
const candidatosDe = (texto) => {
  if (!texto || typeof texto !== 'string') return [];
  return texto
    .split(' - ')
    .map((parte) => parte.replace(/\[[^\]]*\]/g, '').replace(/\([A-Za-z]\)/g, '').trim())
    .filter((parte) => /^[A-Za-z0-9_.]+$/.test(parte))
    .map((parte) => parte.toUpperCase());
};

// "dd/mm/yyyy hh:mm:ss" -> "yyyy-mm-dd"
const fechaISO = (valor) => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(String(valor || ''));
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
};

// Carga los usuarios de SISGED registrados, con el nombre del usuario del sistema.
const cargarRegistros = async () => {
  const registros = await UsuarioSisged.findAll({ raw: true });
  const ids = [...new Set(registros.map((r) => r.id_usuario))];
  const usuarios = ids.length
    ? await Usuario.findAll({ where: { id: ids }, attributes: ['id', 'nombre', 'apellido'], raw: true })
    : [];
  const nombres = new Map(usuarios.map((u) => [u.id, `${u.nombre} ${u.apellido}`]));
  return registros.map((r) => ({ ...r, nombre_local: nombres.get(r.id_usuario) || null }));
};

// Usuario del sistema que tenía ese usuario de SISGED en la fecha del movimiento.
const resolverUsuario = (texto, fecha, registros) => {
  for (const candidato of candidatosDe(texto)) {
    const coincidencias = registros.filter((r) => r.usuario_sisged.toUpperCase() === candidato);
    if (!coincidencias.length) continue;
    const vigente = coincidencias.find(
      (r) => (!fecha || r.fecha_inicio <= fecha) && (!r.fecha_fin || !fecha || r.fecha_fin >= fecha)
    );
    return (vigente || coincidencias[0]).nombre_local;
  }
  return null;
};

// Agrega a cada movimiento el usuario del sistema que corresponde a quien envía y a quien recibe.
const agregarUsuariosLocales = async (movimientos) => {
  if (!Array.isArray(movimientos) || movimientos.length === 0) return movimientos;
  const registros = await cargarRegistros();
  return movimientos.map((m) => {
    const fecha = fechaISO(m.STR_FEC_INICIO) || fechaISO(m.STR_FEC_FIN);
    return {
      ...m,
      USUARIO_ENVIA_LOCAL: resolverUsuario(m.DESC_OFICINA_ENVIA, fecha, registros),
      USUARIO_RECIBE_LOCAL: resolverUsuario(m.DESC_OFICINA_RECIBE, fecha, registros),
    };
  });
};

module.exports = { candidatosDe, agregarUsuariosLocales };

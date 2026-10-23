const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');
const AccionAtencion = require('../models/AccionAtencion');
const LlamadaAdministrado = require('../models/LlamadaAdministrado');
const AccionLlamada = require('../models/AccionLlamada');
const ArchivoAccion = require('../models/ArchivoAccion');
const HistorialLlamada = require('../models/HistorialLlamada');
const Expediente = require('../models/Expediente');
const Usuario = require('../models/Usuario');
const { hoyLima, sumarDiasCalendario } = require('../utils/fechas');
const { aLima } = require('../services/estadoRespuestaService');

const CARPETA_ARCHIVOS = path.join(__dirname, '../../uploads/atenciones');
fs.mkdirSync(CARPETA_ARCHIVOS, { recursive: true });

const PERFILES_GESTION = ['admin', 'jefe', 'secretaria'];
const esGestor = (usuario) => PERFILES_GESTION.includes(usuario.perfil);

const textoMayuscula = (valor) => {
  if (valor === undefined || valor === null) return null;
  const limpio = String(valor).trim().toUpperCase();
  return limpio === '' ? null : limpio;
};

const parseBoolean = (valor) => valor === true || valor === 'true' || valor === 1 || valor === '1';

const errorConEstado = (mensaje) => Object.assign(new Error(mensaje), { status: 400 });

const nombreCompleto = (u) => (u ? `${u.nombre} ${u.apellido}` : '—');

const puedeVerLlamada = (llamada, usuario) =>
  esGestor(usuario) || llamada.id_responsable === usuario.id || llamada.id_usuario_creador === usuario.id;

// El monitor muestra todas las llamadas a cualquier usuario con sesión, así que su detalle y archivos son de solo lectura para todos.
const puedeLeerLlamada = () => true;

const puedeOperarLlamada = (llamada, usuario) =>
  esGestor(usuario) || llamada.id_responsable === usuario.id;

const registrarHistorial = (idLlamada, tipo, detalle, idUsuario) =>
  HistorialLlamada.create({ id_llamada: idLlamada, tipo, detalle, id_usuario: idUsuario });

const ymdLegible = (ymd) => (ymd ? `${ymd.slice(8, 10)}/${ymd.slice(5, 7)}/${ymd.slice(0, 4)}` : 'sin fecha');
const ymdLima = (fecha) => new Date(new Date(fecha).getTime() - 5 * 3600000).toISOString().slice(0, 10);
const diasEntre = (a, b) => Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86400000);

// Texto del cambio de plazo: valor anterior, valor nuevo y días desde la fecha de la llamada.
const detallePlazo = (llamada, anterior, nuevo) => {
  if (!nuevo) return `Plazo quitado (antes ${ymdLegible(anterior)})`;
  const dias = diasEntre(nuevo, ymdLima(llamada.fecha_llamada));
  const cuanto = `${dias} día${dias === 1 ? '' : 's'} desde la llamada`;
  return anterior
    ? `Plazo: ${ymdLegible(anterior)} → ${ymdLegible(nuevo)} (${cuanto})`
    : `Plazo establecido: hasta ${ymdLegible(nuevo)} (${cuanto})`;
};

const includesLlamada = [
  { model: Usuario, as: 'responsable', attributes: ['id', 'nombre', 'apellido', 'usuario'] },
  { model: Usuario, as: 'creador', attributes: ['id', 'nombre', 'apellido', 'usuario'] },
  {
    model: AccionLlamada,
    as: 'acciones',
    include: [
      { model: AccionAtencion, as: 'accion', attributes: ['id', 'nombre', 'requiere_archivo'] },
      {
        model: ArchivoAccion,
        as: 'archivos',
        attributes: ['id', 'nombre_original', 'descripcion', 'mimetype', 'tamano', 'fecha_subida', 'id_usuario'],
      },
    ],
  },
];

const obtenerLlamada = async (id) => {
  const llamada = await LlamadaAdministrado.findByPk(id, { include: includesLlamada });
  if (!llamada) return null;
  const datos = llamada.toJSON();
  datos.antecedentes = await HistorialLlamada.findAll({
    where: { id_llamada: id },
    include: [{ model: Usuario, as: 'usuario', attributes: ['id', 'nombre', 'apellido', 'usuario'] }],
    order: [['id', 'ASC']],
  });
  return datos;
};

const idsAccionesValidas = async (acciones) => {
  const ids = acciones.map((a) => parseInt(a.id_accion, 10));
  if (ids.some((id) => isNaN(id))) throw errorConEstado('Acción no válida');
  const encontradas = await AccionAtencion.findAll({ where: { id: ids, activo: true }, attributes: ['id'] });
  if (encontradas.length !== new Set(ids).size) throw errorConEstado('Alguna acción no existe o está inactiva');
  return ids;
};

// ---------- Catálogo de acciones ----------

const MENSAJE_NOMBRE_REPETIDO = 'Ya existe una acción con ese nombre';

const esNombreRepetido = (error) => error.name === 'SequelizeUniqueConstraintError';

exports.listarAcciones = async (req, res) => {
  try {
    const where = {};
    if (parseBoolean(req.query.solo_activas)) where.activo = true;
    if (req.query.filtro) where.nombre = { [Op.like]: `%${textoMayuscula(req.query.filtro)}%` };

    if (req.query.page) {
      const pagina = parseInt(req.query.page, 10) || 1;
      const limite = parseInt(req.query.limit, 10) || 10;
      const { count, rows } = await AccionAtencion.findAndCountAll({
        where,
        order: [['nombre', 'ASC']],
        limit: limite,
        offset: (pagina - 1) * limite,
      });
      return res.json({ acciones: rows, totalAcciones: count, totalPaginas: Math.ceil(count / limite), paginaActual: pagina });
    }

    const acciones = await AccionAtencion.findAll({ where, order: [['nombre', 'ASC']] });
    res.json(acciones);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

exports.crearAccion = async (req, res) => {
  try {
    const nombre = textoMayuscula(req.body.nombre);
    if (!nombre) throw errorConEstado('El nombre de la acción es obligatorio');
    const requiereArchivo = parseBoolean(req.body.requiere_archivo);

    const existente = await AccionAtencion.findOne({ where: { nombre } });
    if (existente && existente.activo) throw errorConEstado(MENSAJE_NOMBRE_REPETIDO);
    if (existente) {
      await existente.update({ requiere_archivo: requiereArchivo, activo: true });
      return res.json({ ...existente.toJSON(), mensaje: 'Acción reactivada' });
    }

    const nueva = await AccionAtencion.create({ nombre, requiere_archivo: requiereArchivo, activo: true });
    res.status(201).json(nueva);
  } catch (error) {
    res.status(error.status || 400).json({ mensaje: error.message });
  }
};

exports.eliminarAccion = async (req, res) => {
  try {
    const [desactivada] = await AccionAtencion.update({ activo: false }, { where: { id: req.params.id } });
    if (!desactivada) return res.status(404).json({ mensaje: 'Acción no encontrada' });
    res.json({ mensaje: 'Acción eliminada' });
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

exports.actualizarAccion = async (req, res) => {
  try {
    const cambios = {};
    if (req.body.nombre !== undefined) cambios.nombre = textoMayuscula(req.body.nombre);
    if (req.body.requiere_archivo !== undefined) cambios.requiere_archivo = parseBoolean(req.body.requiere_archivo);
    if (req.body.activo !== undefined) cambios.activo = parseBoolean(req.body.activo);
    const [actualizado] = await AccionAtencion.update(cambios, { where: { id: req.params.id } });
    if (!actualizado) return res.status(404).json({ mensaje: 'Acción no encontrada' });
    res.json(await AccionAtencion.findByPk(req.params.id));
  } catch (error) {
    res.status(400).json({ mensaje: esNombreRepetido(error) ? MENSAJE_NOMBRE_REPETIDO : error.message });
  }
};

// ---------- Llamadas ----------

exports.listarLlamadas = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const where = {};
    if (req.query.cut) where.cut = { [Op.like]: `%${textoMayuscula(req.query.cut)}%` };
    if (req.query.respondido !== undefined && req.query.respondido !== '') {
      where.respondido = parseBoolean(req.query.respondido);
    }
    // Plazo: VENCIDAS = sin respuesta con fecha límite ya pasada; POR_VENCER = vence en los próximos 5 días.
    const hoy = hoyLima();
    if (req.query.plazo === 'VENCIDAS') {
      where.respondido = false;
      where.fecha_respuesta = { [Op.lt]: hoy };
    } else if (req.query.plazo === 'POR_VENCER') {
      where.respondido = false;
      where.fecha_respuesta = { [Op.between]: [hoy, sumarDiasCalendario(hoy, 5)] };
    }
    if (!esGestor(req.user)) {
      where[Op.or] = [{ id_responsable: req.user.id }, { id_usuario_creador: req.user.id }];
    }

    const { count, rows } = await LlamadaAdministrado.findAndCountAll({
      where,
      include: [
        { model: Usuario, as: 'responsable', attributes: ['id', 'nombre', 'apellido', 'usuario'] },
        { model: Usuario, as: 'creador', attributes: ['id', 'nombre', 'apellido', 'usuario'] },
      ],
      order: [['fecha_llamada', 'DESC'], ['id', 'DESC']],
      limit,
      offset: (page - 1) * limit,
      distinct: true,
    });

    const conteo = await conteoPorCut(rows.map((r) => r.cut), req.user);
    const llamadas = rows.map((r) => ({ ...r.get({ plain: true }), total_del_cut: conteo[r.cut] || 1 }));
    res.json({ llamadas, totalLlamadas: count, totalPaginas: Math.ceil(count / limit), paginaActual: page });
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

// Llamadas con plazo dentro de un rango de fechas, para el calendario. Lectura para cualquier usuario con sesión.
// Cada llamada cae en el día de su plazo; su situación (respondida, vencida, por vencer o en plazo) va aparte.
exports.calendario = async (req, res) => {
  try {
    const desde = String(req.query.desde || '').slice(0, 10);
    const hasta = String(req.query.hasta || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(desde) || !/^\d{4}-\d{2}-\d{2}$/.test(hasta)) {
      return res.status(400).json({ mensaje: 'Indique el rango de fechas (desde y hasta)' });
    }
    // 'llamada': se ubica en el día en que se recibió la llamada. 'plazo' (por defecto): en el día de su plazo de respuesta.
    const porLlamada = req.query.campo === 'llamada';
    const rango = porLlamada
      ? { fecha_llamada: { [Op.between]: [`${desde} 00:00:00`, `${hasta} 23:59:59`] } }
      : { fecha_respuesta: { [Op.between]: [desde, hasta] } };
    const llamadas = await LlamadaAdministrado.findAll({
      where: rango,
      attributes: ['id', 'cut', 'nombre_llamante', 'motivo', 'fecha_llamada', 'fecha_respuesta', 'respondido'],
      include: [{ model: Usuario, as: 'responsable', attributes: ['nombre', 'apellido'], required: false }],
      order: [['fecha_respuesta', 'ASC'], ['id', 'ASC']],
    });
    const hoy = hoyLima();
    const diasHasta = (fecha) =>
      Math.round((Date.parse(`${String(fecha).slice(0, 10)}T00:00:00Z`) - Date.parse(`${hoy}T00:00:00Z`)) / 86400000);

    res.json(
      llamadas.map((l) => {
        const dias = diasHasta(l.fecha_respuesta);
        let situacion = 'EN_PLAZO';
        if (l.respondido) situacion = 'RESPONDIDA';
        else if (dias < 0) situacion = 'VENCIDA';
        else if (dias <= 5) situacion = 'POR_VENCER';
        const fechaLlamadaLima = aLima(l.fecha_llamada);
        return {
          id: l.id,
          cut: l.cut,
          nombre_llamante: l.nombre_llamante,
          motivo: l.motivo,
          fecha_llamada: fechaLlamadaLima,
          fecha_respuesta: l.fecha_respuesta,
          // Día en que se muestra la llamada en el calendario, según el criterio elegido.
          dia: porLlamada ? fechaLlamadaLima.slice(0, 10) : String(l.fecha_respuesta).slice(0, 10),
          respondido: l.respondido,
          situacion,
          responsable: l.responsable ? `${l.responsable.nombre} ${l.responsable.apellido}` : '',
        };
      })
    );
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

exports.obtenerLlamada = async (req, res) => {
  try {
    const llamada = await LlamadaAdministrado.findByPk(req.params.id);
    if (!llamada || !puedeLeerLlamada()) {
      return res.status(404).json({ mensaje: 'Llamada no encontrada' });
    }
    const datos = await obtenerLlamada(llamada.id);
    datos.otras_del_cut = await LlamadaAdministrado.findAll({
      where: { cut: llamada.cut, id: { [Op.ne]: llamada.id } },
      attributes: ['id', 'fecha_llamada', 'nombre_llamante', 'respondido', 'fecha_respuesta', 'motivo'],
      include: [{ model: Usuario, as: 'responsable', attributes: ['id', 'nombre', 'apellido'] }],
      order: [['fecha_llamada', 'DESC']],
    });
    res.json(datos);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

// Alcance de llamadas visibles para el usuario (gestores ven todas; el resto, las suyas).
const ambitoDe = (usuario) =>
  esGestor(usuario) ? {} : { [Op.or]: [{ id_responsable: usuario.id }, { id_usuario_creador: usuario.id }] };

// Cuántas llamadas visibles tiene cada CUT, para avisar de reincidencias.
const conteoPorCut = async (cuts, usuario) => {
  const conteo = {};
  if (!cuts.length) return conteo;
  const filas = await LlamadaAdministrado.findAll({
    attributes: ['cut'],
    where: { cut: { [Op.in]: cuts }, ...ambitoDe(usuario) },
    raw: true,
  });
  filas.forEach((f) => {
    conteo[f.cut] = (conteo[f.cut] || 0) + 1;
  });
  return conteo;
};

// Todas las llamadas visibles de un CUT, para el aviso al registrar una llamada nueva.
exports.llamadasDelCut = async (req, res) => {
  try {
    const cut = textoMayuscula(req.params.cut);
    const llamadas = await LlamadaAdministrado.findAll({
      where: { cut, ...ambitoDe(req.user) },
      attributes: ['id', 'fecha_llamada', 'nombre_llamante', 'respondido', 'fecha_respuesta', 'motivo'],
      include: [{ model: Usuario, as: 'responsable', attributes: ['id', 'nombre', 'apellido'] }],
      order: [['fecha_llamada', 'DESC']],
    });
    res.json(llamadas);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

exports.crearLlamada = async (req, res) => {
  try {
    const cut = textoMayuscula(req.body.cut);
    const nombreLlamante = textoMayuscula(req.body.nombre_llamante);
    const motivo = textoMayuscula(req.body.motivo);
    if (!cut) throw errorConEstado('El CUT es obligatorio');
    if (!nombreLlamante) throw errorConEstado('El nombre de quien llama es obligatorio');
    if (!motivo) throw errorConEstado('El motivo es obligatorio');

    const fechaLlamada = req.body.fecha_llamada ? new Date(req.body.fecha_llamada) : new Date();
    if (isNaN(fechaLlamada)) throw errorConEstado('La fecha de la llamada no es válida');

    let idResponsable = req.user.id;
    if (req.body.id_responsable !== undefined && req.body.id_responsable !== null && req.body.id_responsable !== '') {
      idResponsable = parseInt(req.body.id_responsable, 10);
      const existe = await Usuario.findByPk(idResponsable, { attributes: ['id'] });
      if (!existe) throw errorConEstado('El usuario responsable no existe');
    }

    const acciones = Array.isArray(req.body.acciones) ? req.body.acciones : [];
    const idsAcciones = acciones.length ? await idsAccionesValidas(acciones) : [];
    if (parseBoolean(req.body.respondido) && idsAcciones.length === 0) {
      throw errorConEstado('Registre al menos una acción antes de marcar la llamada como respondida');
    }

    const expediente = await Expediente.findOne({ where: { cut }, attributes: ['id'] });

    const llamada = await LlamadaAdministrado.create({
      cut,
      id_expediente: expediente ? expediente.id : null,
      fecha_llamada: fechaLlamada,
      nombre_llamante: nombreLlamante,
      telefono: req.body.telefono ? String(req.body.telefono).trim() : null,
      motivo,
      fecha_respuesta: req.body.fecha_respuesta || null,
      respondido: parseBoolean(req.body.respondido),
      id_responsable: idResponsable,
      id_usuario_creador: req.user.id,
      id_usuario_modificador: req.user.id,
    });

    await registrarHistorial(llamada.id, 'REGISTRO', 'Llamada registrada', req.user.id);

    for (let i = 0; i < idsAcciones.length; i++) {
      await AccionLlamada.create({
        id_llamada: llamada.id,
        id_accion: idsAcciones[i],
        observacion: textoMayuscula(acciones[i].observacion),
        estado: 'PENDIENTE',
        id_usuario_creador: req.user.id,
        id_usuario_modificador: req.user.id,
      });
    }

    res.status(201).json(await obtenerLlamada(llamada.id));
  } catch (error) {
    res.status(error.status || 400).json({ mensaje: error.message });
  }
};

exports.actualizarLlamada = async (req, res) => {
  try {
    const llamada = await LlamadaAdministrado.findByPk(req.params.id);
    if (!llamada || !puedeVerLlamada(llamada, req.user)) {
      return res.status(404).json({ mensaje: 'Llamada no encontrada' });
    }
    if (!puedeOperarLlamada(llamada, req.user) && llamada.id_usuario_creador !== req.user.id) {
      return res.status(403).json({ mensaje: 'No puede modificar esta llamada' });
    }

    const respondidoAnterior = llamada.respondido;
    const fechaRespuestaAnterior = llamada.fecha_respuesta;
    const cambios = { id_usuario_modificador: req.user.id };
    if (req.body.fecha_llamada !== undefined) cambios.fecha_llamada = new Date(req.body.fecha_llamada);
    if (req.body.nombre_llamante !== undefined) cambios.nombre_llamante = textoMayuscula(req.body.nombre_llamante);
    if (req.body.telefono !== undefined) cambios.telefono = req.body.telefono ? String(req.body.telefono).trim() : null;
    if (req.body.motivo !== undefined) cambios.motivo = textoMayuscula(req.body.motivo);
    if (req.body.fecha_respuesta !== undefined) cambios.fecha_respuesta = req.body.fecha_respuesta || null;
    if (req.body.respondido !== undefined) cambios.respondido = parseBoolean(req.body.respondido);

    // Al marcar la llamada como respondida, sus acciones pendientes pasan a ejecutadas.
    let pendientesAEjecutar = [];
    if (cambios.respondido === true && !respondidoAnterior) {
      const acciones = await AccionLlamada.count({ where: { id_llamada: llamada.id } });
      if (acciones === 0) throw errorConEstado('Registre al menos una acción antes de marcar la llamada como respondida');

      pendientesAEjecutar = await AccionLlamada.findAll({
        where: { id_llamada: llamada.id, estado: 'PENDIENTE' },
        include: [{ model: AccionAtencion, as: 'accion', attributes: ['nombre', 'requiere_archivo'] }],
      });
      const sinArchivo = [];
      const sinRespuesta = [];
      for (const p of pendientesAEjecutar) {
        const archivos = await ArchivoAccion.count({ where: { id_accion_llamada: p.id } });
        if (p.accion?.requiere_archivo && archivos === 0) sinArchivo.push(p.accion.nombre);
        if (!p.accion?.requiere_archivo && !p.observacion) sinRespuesta.push(p.accion?.nombre);
      }
      if (sinArchivo.length) {
        throw errorConEstado(`Estas acciones requieren archivo antes de marcar la llamada como respondida: ${sinArchivo.join(', ')}`);
      }
      if (sinRespuesta.length) {
        throw errorConEstado(`Escriba la respuesta de estas acciones antes de marcar la llamada como respondida: ${sinRespuesta.join(', ')}`);
      }
    }

    // Auditoría: se guarda cada campo que cambió, con su valor anterior y el nuevo. Se calcula antes de actualizar.
    const etiquetasEdicion = { fecha_llamada: 'Fecha de llamada', nombre_llamante: 'Quien llamó', telefono: 'Teléfono', motivo: 'Motivo' };
    const textoValor = (campo, valor) => {
      if (valor === null || valor === undefined || valor === '') return '(vacío)';
      return campo === 'fecha_llamada' ? new Date(valor).toLocaleString('es-PE', { timeZone: 'America/Lima' }) : String(valor);
    };
    const detallesEdicion = Object.keys(etiquetasEdicion)
      .filter((campo) => cambios[campo] !== undefined && textoValor(campo, cambios[campo]) !== textoValor(campo, llamada[campo]))
      .map((campo) => `${etiquetasEdicion[campo]}: ${textoValor(campo, llamada[campo])} → ${textoValor(campo, cambios[campo])}`);

    await llamada.update(cambios);

    for (const p of pendientesAEjecutar) {
      await p.update({ estado: 'EJECUTADO', fecha_ejecucion: hoyLima(), id_usuario_modificador: req.user.id });
      await registrarHistorial(
        llamada.id,
        'ACCION_EJECUTADA',
        `Ejecutada al marcar la llamada como respondida: ${p.accion?.nombre}`,
        req.user.id
      );
    }

    if (cambios.respondido !== undefined && cambios.respondido !== respondidoAnterior) {
      await registrarHistorial(
        llamada.id,
        cambios.respondido ? 'RESPONDIDO' : 'NO_RESPONDIDO',
        cambios.respondido ? 'Marcada como respondida al administrado' : 'Marcada como no respondida',
        req.user.id
      );
    }
    if (cambios.fecha_respuesta !== undefined && cambios.fecha_respuesta !== fechaRespuestaAnterior) {
      await registrarHistorial(
        llamada.id,
        'PLAZO_CAMBIADO',
        detallePlazo(llamada, fechaRespuestaAnterior, cambios.fecha_respuesta),
        req.user.id
      );
    }
    if (detallesEdicion.length > 0) {
      await registrarHistorial(llamada.id, 'EDICION', detallesEdicion.join('\n'), req.user.id);
    }

    res.json(await obtenerLlamada(llamada.id));
  } catch (error) {
    res.status(400).json({ mensaje: error.message });
  }
};

exports.reasignarLlamada = async (req, res) => {
  try {
    const llamada = await LlamadaAdministrado.findByPk(req.params.id);
    if (!llamada) return res.status(404).json({ mensaje: 'Llamada no encontrada' });
    const idResponsable = parseInt(req.body.id_responsable, 10);
    const nuevo = await Usuario.findByPk(idResponsable, { attributes: ['id', 'nombre', 'apellido'] });
    if (!nuevo) return res.status(400).json({ mensaje: 'El usuario responsable no existe' });

    const anterior = await Usuario.findByPk(llamada.id_responsable, { attributes: ['nombre', 'apellido'] });
    await llamada.update({ id_responsable: idResponsable, id_usuario_modificador: req.user.id });
    await registrarHistorial(
      llamada.id,
      'REASIGNACION',
      `De ${nombreCompleto(anterior)} a ${nombreCompleto(nuevo)}`,
      req.user.id
    );

    res.json(await obtenerLlamada(llamada.id));
  } catch (error) {
    res.status(400).json({ mensaje: error.message });
  }
};

// ---------- Acciones de la llamada ----------

const MENSAJE_RESPONDIDA =
  'La llamada está respondida: sus acciones y archivos no se pueden modificar. Márquela como no respondida para editarlos';

const llamadaDeAccion = async (idAccionLlamada) => {
  const accion = await AccionLlamada.findByPk(idAccionLlamada);
  if (!accion) return { accion: null, llamada: null };
  const llamada = await LlamadaAdministrado.findByPk(accion.id_llamada);
  if (llamada && llamada.respondido) throw errorConEstado(MENSAJE_RESPONDIDA);
  return { accion, llamada };
};

exports.agregarAccion = async (req, res) => {
  try {
    const llamada = await LlamadaAdministrado.findByPk(req.params.id);
    if (!llamada || !puedeVerLlamada(llamada, req.user)) {
      return res.status(404).json({ mensaje: 'Llamada no encontrada' });
    }
    if (!puedeOperarLlamada(llamada, req.user)) {
      return res.status(403).json({ mensaje: 'Solo el responsable puede agregar acciones' });
    }
    if (llamada.respondido) throw errorConEstado(MENSAJE_RESPONDIDA);
    const [idAccion] = await idsAccionesValidas([{ id_accion: req.body.id_accion }]);
    const catalogo = await AccionAtencion.findByPk(idAccion, { attributes: ['nombre'] });
    await AccionLlamada.create({
      id_llamada: llamada.id,
      id_accion: idAccion,
      observacion: textoMayuscula(req.body.observacion),
      estado: 'PENDIENTE',
      id_usuario_creador: req.user.id,
      id_usuario_modificador: req.user.id,
    });
    await registrarHistorial(llamada.id, 'ACCION_AGREGADA', `Acción agregada: ${catalogo.nombre}`, req.user.id);
    res.status(201).json(await obtenerLlamada(llamada.id));
  } catch (error) {
    res.status(error.status || 400).json({ mensaje: error.message });
  }
};

exports.actualizarAccionLlamada = async (req, res) => {
  try {
    const { accion, llamada } = await llamadaDeAccion(req.params.id);
    if (!accion || !llamada || !puedeVerLlamada(llamada, req.user)) {
      return res.status(404).json({ mensaje: 'Acción no encontrada' });
    }
    if (!puedeOperarLlamada(llamada, req.user)) {
      return res.status(403).json({ mensaje: 'Solo el responsable puede actualizar esta acción' });
    }
    const quiereEstado = req.body.estado !== undefined;
    if (quiereEstado && !esGestor(req.user)) {
      throw errorConEstado('Solo admin, jefe o secretaria pueden cambiar el estado de la acción');
    }
    if (accion.estado === 'EJECUTADO') {
      const soloRevertir = quiereEstado && String(req.body.estado).toUpperCase() === 'PENDIENTE' && req.body.observacion === undefined;
      if (!soloRevertir) throw errorConEstado('Esta acción ya está ejecutada y no puede modificarse');
    }

    const catalogo = await AccionAtencion.findByPk(accion.id_accion, { attributes: ['nombre', 'requiere_archivo'] });
    const cambios = { id_usuario_modificador: req.user.id };
    const historial = [];

    if (req.body.estado !== undefined) {
      const estado = String(req.body.estado).toUpperCase();
      if (!['PENDIENTE', 'EJECUTADO'].includes(estado)) throw errorConEstado('Estado no válido');
      if (estado !== accion.estado) {
        if (estado === 'EJECUTADO') {
          if (catalogo.requiere_archivo) {
            const archivos = await ArchivoAccion.count({ where: { id_accion_llamada: accion.id } });
            if (archivos === 0) {
              throw errorConEstado('Esta acción requiere al menos un archivo de avance antes de marcarla como ejecutada');
            }
          }
          if (!catalogo.requiere_archivo) {
            const respuesta = req.body.observacion !== undefined ? textoMayuscula(req.body.observacion) : accion.observacion;
            if (!respuesta) throw errorConEstado('Escriba la respuesta antes de marcar la acción como ejecutada');
          }
          cambios.fecha_ejecucion = req.body.fecha_ejecucion || new Date().toISOString().slice(0, 10);
          historial.push(['ACCION_EJECUTADA', `Ejecutada: ${catalogo.nombre}`]);
        } else {
          cambios.fecha_ejecucion = null;
          historial.push(['ACCION_PENDIENTE', `Marcada como pendiente: ${catalogo.nombre}`]);
        }
        cambios.estado = estado;
      }
    }
    if (req.body.observacion !== undefined) {
      const observacion = textoMayuscula(req.body.observacion);
      if (observacion !== accion.observacion) {
        cambios.observacion = observacion;
        historial.push([
          'OBSERVACION',
          `Observación de ${catalogo.nombre}: ${accion.observacion || '(sin texto)'} → ${observacion || '(sin texto)'}`,
        ]);
      }
    }

    await accion.update(cambios);
    for (const [tipo, detalle] of historial) {
      await registrarHistorial(llamada.id, tipo, detalle, req.user.id);
    }
    res.json(await obtenerLlamada(llamada.id));
  } catch (error) {
    res.status(error.status || 400).json({ mensaje: error.message });
  }
};

// ---------- Archivos de avance ----------

exports.subirArchivo = async (req, res) => {
  try {
    if (!req.file) throw errorConEstado('Seleccione un archivo para subir');
    const descripcion = textoMayuscula(req.body.descripcion);
    if (!descripcion) {
      fs.unlink(req.file.path, () => {});
      throw errorConEstado('Describa qué contiene el archivo antes de subirlo');
    }
    const { accion, llamada } = await llamadaDeAccion(req.params.id);
    if (!accion || !llamada || !puedeVerLlamada(llamada, req.user)) {
      fs.unlink(req.file.path, () => {});
      return res.status(404).json({ mensaje: 'Acción no encontrada' });
    }
    if (!puedeOperarLlamada(llamada, req.user)) {
      fs.unlink(req.file.path, () => {});
      return res.status(403).json({ mensaje: 'Solo el responsable puede subir archivos' });
    }

    if (accion.estado === 'EJECUTADO') throw errorConEstado('Esta acción ya está ejecutada y no puede modificarse');
    await ArchivoAccion.create({
      id_accion_llamada: accion.id,
      nombre_original: req.file.originalname,
      descripcion,
      nombre_guardado: req.file.filename,
      mimetype: req.file.mimetype,
      tamano: req.file.size,
      id_usuario: req.user.id,
    });
    await registrarHistorial(llamada.id, 'ARCHIVO_SUBIDO', `${descripcion} (${req.file.originalname})`, req.user.id);
    res.status(201).json(await obtenerLlamada(llamada.id));
  } catch (error) {
    if (req.file) fs.unlink(req.file.path, () => {});
    res.status(error.status || 400).json({ mensaje: error.message });
  }
};

exports.eliminarArchivo = async (req, res) => {
  try {
    const archivo = await ArchivoAccion.findByPk(req.params.id);
    if (!archivo) return res.status(404).json({ mensaje: 'Archivo no encontrado' });
    const { accion, llamada } = await llamadaDeAccion(archivo.id_accion_llamada);
    if (!accion || !llamada || !puedeVerLlamada(llamada, req.user)) {
      return res.status(404).json({ mensaje: 'Archivo no encontrado' });
    }
    if (!puedeOperarLlamada(llamada, req.user)) {
      return res.status(403).json({ mensaje: 'Solo el responsable puede eliminar archivos' });
    }

    if (accion.estado === 'EJECUTADO') throw errorConEstado('Esta acción ya está ejecutada y no puede modificarse');

    const ruta = path.join(CARPETA_ARCHIVOS, path.basename(archivo.nombre_guardado));
    await archivo.destroy();
    fs.unlink(ruta, () => {});
    await registrarHistorial(
      llamada.id,
      'ARCHIVO_ELIMINADO',
      `${archivo.descripcion || ''} (${archivo.nombre_original})`.trim(),
      req.user.id
    );
    res.json(await obtenerLlamada(llamada.id));
  } catch (error) {
    res.status(error.status || 400).json({ mensaje: error.message });
  }
};

exports.editarArchivo = async (req, res) => {
  try {
    const archivo = await ArchivoAccion.findByPk(req.params.id);
    if (!archivo) return res.status(404).json({ mensaje: 'Archivo no encontrado' });
    const { accion, llamada } = await llamadaDeAccion(archivo.id_accion_llamada);
    if (!accion || !llamada || !puedeVerLlamada(llamada, req.user)) {
      return res.status(404).json({ mensaje: 'Archivo no encontrado' });
    }
    if (!puedeOperarLlamada(llamada, req.user)) {
      return res.status(403).json({ mensaje: 'Solo el responsable puede editar archivos' });
    }

    if (accion.estado === 'EJECUTADO') throw errorConEstado('Esta acción ya está ejecutada y no puede modificarse');
    const descripcion = textoMayuscula(req.body.descripcion);
    if (!descripcion) throw errorConEstado('La descripción no puede quedar vacía');
    if (descripcion !== archivo.descripcion) {
      const anterior = archivo.descripcion || '(sin descripción)';
      await archivo.update({ descripcion });
      await registrarHistorial(llamada.id, 'ARCHIVO_EDITADO', `${anterior} → ${descripcion}`, req.user.id);
    }
    res.json(await obtenerLlamada(llamada.id));
  } catch (error) {
    res.status(error.status || 400).json({ mensaje: error.message });
  }
};

exports.descargarArchivo = async (req, res) => {
  try {
    const archivo = await ArchivoAccion.findByPk(req.params.id);
    if (!archivo) return res.status(404).json({ mensaje: 'Archivo no encontrado' });
    const accion = await AccionLlamada.findByPk(archivo.id_accion_llamada);
    const llamada = accion && (await LlamadaAdministrado.findByPk(accion.id_llamada));
    if (!llamada || !puedeLeerLlamada()) {
      return res.status(404).json({ mensaje: 'Archivo no encontrado' });
    }
    const ruta = path.join(CARPETA_ARCHIVOS, path.basename(archivo.nombre_guardado));
    if (!fs.existsSync(ruta)) return res.status(404).json({ mensaje: 'El archivo ya no está disponible' });
    res.download(ruta, archivo.nombre_original);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

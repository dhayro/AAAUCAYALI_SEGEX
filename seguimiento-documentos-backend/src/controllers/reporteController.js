const { Op } = require('sequelize');
const AsignacionExpediente = require('../models/AsignacionExpediente');
const LlamadaAdministrado = require('../models/LlamadaAdministrado');
const AccionLlamada = require('../models/AccionLlamada');
const HistorialLlamada = require('../models/HistorialLlamada');
const Usuario = require('../models/Usuario');
const Cargo = require('../models/Cargo');
const { hoyLima, sumarDiasCalendario } = require('../utils/fechas');
const { resumenPorAsignacion, tiempoRespuestaHoras, aLima, ESTADOS } = require('../services/estadoRespuestaService');

const diasEntre = (fecha, hoy) =>
  Math.round((Date.parse(`${String(fecha).slice(0, 10)}T00:00:00Z`) - Date.parse(`${hoy}T00:00:00Z`)) / 86400000);

const normalizar = (valor) => (valor === undefined || valor === null || String(valor).trim() === '' ? null : String(valor).trim());

const rangoFechas = (desde, hasta) => {
  const d = normalizar(desde);
  const h = normalizar(hasta);
  if (d && h) return { [Op.between]: [d, h] };
  if (d) return { [Op.gte]: d };
  if (h) return { [Op.lte]: h };
  return null;
};

// Rango para columnas con hora: desde 00:00:00 hasta 23:59:59 de los días indicados.
const rangoFechasHora = (desde, hasta) => {
  const d = normalizar(desde);
  const h = normalizar(hasta);
  const inicio = d ? `${d.slice(0, 10)} 00:00:00` : null;
  const fin = h ? `${h.slice(0, 10)} 23:59:59` : null;
  if (inicio && fin) return { [Op.between]: [inicio, fin] };
  if (inicio) return { [Op.gte]: inicio };
  if (fin) return { [Op.lte]: fin };
  return null;
};

// Reporte de asignaciones de expediente con respuestas y evaluación.
exports.asignaciones = async (req, res) => {
  try {
    const { cut, estado_respuesta } = req.query;
    // El perfil personal solo ve sus propias asignaciones.
    const id_usuario = req.user.perfil === 'personal' ? req.user.id : req.query.id_usuario;
    const where = { estado: true };
    const fecha = rangoFechas(req.query.desde, req.query.hasta);
    if (fecha) where.fecha_asignacion = fecha;
    if (normalizar(cut)) where.cut = { [Op.like]: `%${normalizar(cut).toUpperCase()}%` };
    if (normalizar(id_usuario)) where.id_usuario = parseInt(id_usuario, 10);

    const asignaciones = await AsignacionExpediente.findAll({
      where,
      include: [{ model: Usuario, as: 'asignado', attributes: ['id', 'nombre', 'apellido'], include: [{ model: Cargo, attributes: ['nombre'] }], required: false }],
      order: [['fecha_asignacion', 'DESC'], ['id', 'DESC']],
    });
    const hoy = hoyLima();
    const resumen = await resumenPorAsignacion(asignaciones.map((a) => a.id));

    let filas = asignaciones.map((a) => {
      const plain = a.get({ plain: true });
      const r = resumen.get(a.id);
      const vence = a.fecha_vencimiento_prorroga || a.fecha_vencimiento;
      // Una asignación reasignada queda cerrada para su dueño anterior: su cumplimiento se mide hasta su última respuesta.
      const reasignada = Boolean(a.motivo_cierre);
      const cerrada = reasignada || r.estado === ESTADOS.CERRADA;
      return {
        cut: a.cut,
        asignado: plain.asignado ? `${plain.asignado.nombre} ${plain.asignado.apellido}` : '',
        cargo: plain.asignado?.Cargo?.nombre || '',
        fecha_asignacion: a.fecha_asignacion,
        plazo_atencion: a.plazo_atencion,
        vence,
        prorroga: a.estado_prorroga || '',
        dias_restantes: cerrada ? null : diasEntre(vence, hoy),
        estado_respuesta: reasignada ? 'REASIGNADA' : r.estado,
        total_respuestas: r.total,
        ultima_respuesta: aLima(r.ultima_respuesta),
        tiempo_respuesta_horas: r.ultima_respuesta ? tiempoRespuestaHoras(a.fecha_asignacion, r.ultima_respuesta) : null,
        evaluador: r.evaluacion ? `${r.evaluacion.evaluador?.nombre || ''} ${r.evaluacion.evaluador?.apellido || ''}`.trim() : '',
        fecha_evaluacion: r.evaluacion ? aLima(r.evaluacion.fecha_evaluacion) : null,
        observacion_evaluacion: r.evaluacion?.observacion || '',
      };
    });

    if (normalizar(estado_respuesta)) filas = filas.filter((f) => f.estado_respuesta === estado_respuesta.toUpperCase());

    const contar = (estado) => filas.filter((f) => f.estado_respuesta === estado).length;
    res.json({
      filas,
      totales: {
        total: filas.length,
        sin_respuesta: contar(ESTADOS.SIN_RESPUESTA),
        por_evaluar: contar(ESTADOS.POR_EVALUAR),
        respondidas: contar(ESTADOS.RESPONDIDA),
        observadas: contar(ESTADOS.OBSERVADA),
        cerradas: contar(ESTADOS.CERRADA),
        reasignadas: contar('REASIGNADA'),
        vencidas: filas.filter((f) => f.dias_restantes !== null && f.dias_restantes < 0).length,
      },
    });
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

// Reporte de llamadas con plazo, responsable y acciones.
exports.llamadas = async (req, res) => {
  try {
    const { respondido, plazo } = req.query;
    // El perfil personal solo ve las llamadas a su cargo.
    const id_responsable = req.user.perfil === 'personal' ? req.user.id : req.query.id_responsable;
    const where = {};
    const fecha = rangoFechasHora(req.query.desde, req.query.hasta);
    if (fecha) where.fecha_llamada = fecha;
    if (normalizar(respondido)) where.respondido = respondido === 'true';
    if (normalizar(id_responsable)) where.id_responsable = parseInt(id_responsable, 10);
    if (normalizar(req.query.cut)) where.cut = { [Op.like]: `%${normalizar(req.query.cut).toUpperCase()}%` };
    if (req.query.tipo === 'LLAMADA' || req.query.tipo === 'PRESENCIAL') where.tipo_atencion = req.query.tipo;
    if (normalizar(req.query.nombre_llamante)) {
      where.nombre_llamante = { [Op.like]: `%${normalizar(req.query.nombre_llamante).toUpperCase()}%` };
    }

    const llamadas = await LlamadaAdministrado.findAll({
      where,
      include: [
        { model: Usuario, as: 'responsable', attributes: ['id', 'nombre', 'apellido'], required: false },
        { model: Usuario, as: 'creador', attributes: ['id', 'nombre', 'apellido'], required: false },
      ],
      order: [['fecha_llamada', 'DESC'], ['id', 'DESC']],
    });

    const ids = llamadas.map((l) => l.id);
    const acciones = ids.length
      ? await AccionLlamada.findAll({ attributes: ['id_llamada', 'estado'], where: { id_llamada: { [Op.in]: ids } }, raw: true })
      : [];
    const contarAcciones = {};
    acciones.forEach((a) => {
      const c = (contarAcciones[a.id_llamada] = contarAcciones[a.id_llamada] || { total: 0, ejecutadas: 0 });
      c.total += 1;
      if (a.estado === 'EJECUTADO') c.ejecutadas += 1;
    });

    const hoy = hoyLima();
    // Momento en que se marcó como respondida (último evento RESPONDIDO del historial).
    const respuestas = ids.length
      ? await HistorialLlamada.findAll({
          attributes: ['id_llamada', 'fecha_registro'],
          where: { id_llamada: { [Op.in]: ids }, tipo: 'RESPONDIDO' },
          raw: true,
        })
      : [];
    const respondidoEn = {};
    respuestas.forEach((h) => {
      const f = new Date(h.fecha_registro);
      if (!respondidoEn[h.id_llamada] || f > respondidoEn[h.id_llamada]) respondidoEn[h.id_llamada] = f;
    });

    let filas = llamadas.map((l) => {
      const plain = l.get({ plain: true });
      const acc = contarAcciones[l.id] || { total: 0, ejecutadas: 0 };
      const dias = l.fecha_respuesta ? diasEntre(l.fecha_respuesta, hoy) : null;
      let situacion = 'SIN_PLAZO';
      if (l.respondido) situacion = 'RESPONDIDA';
      else if (dias !== null && dias < 0) situacion = 'VENCIDA';
      else if (dias !== null && dias <= 5) situacion = 'POR_VENCER';
      else if (dias !== null) situacion = 'EN_PLAZO';
      return {
        fecha_llamada: aLima(l.fecha_llamada),
        cut: l.cut,
        nombre_llamante: l.nombre_llamante,
        tipo_atencion: l.tipo_atencion,
        telefono: l.telefono || '',
        motivo: l.motivo,
        responsable: plain.responsable ? `${plain.responsable.nombre} ${plain.responsable.apellido}` : '',
        registrada_por: plain.creador ? `${plain.creador.nombre} ${plain.creador.apellido}` : '',
        fecha_limite: l.fecha_respuesta,
        respondido_en: respondidoEn[l.id] ? aLima(respondidoEn[l.id]) : null,
        tiempo_respuesta_horas: respondidoEn[l.id]
          ? Math.round(((respondidoEn[l.id] - new Date(l.fecha_llamada)) / 3600000) * 10) / 10
          : null,
        dias_restantes: l.respondido ? null : dias,
        situacion,
        respondido: l.respondido,
        acciones_total: acc.total,
        acciones_ejecutadas: acc.ejecutadas,
        acciones_pendientes: acc.total - acc.ejecutadas,
      };
    });

    if (normalizar(plazo)) filas = filas.filter((f) => f.situacion === plazo.toUpperCase());

    const contar = (s) => filas.filter((f) => f.situacion === s).length;
    res.json({
      filas,
      totales: {
        total: filas.length,
        respondidas: contar('RESPONDIDA'),
        sin_respuesta: filas.filter((f) => !f.respondido).length,
        vencidas: contar('VENCIDA'),
        por_vencer: contar('POR_VENCER'),
        sin_plazo: contar('SIN_PLAZO'),
        llamadas: filas.filter((f) => f.tipo_atencion !== 'PRESENCIAL').length,
        presenciales: filas.filter((f) => f.tipo_atencion === 'PRESENCIAL').length,
        acciones_pendientes: filas.reduce((s, f) => s + f.acciones_pendientes, 0),
      },
    });
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

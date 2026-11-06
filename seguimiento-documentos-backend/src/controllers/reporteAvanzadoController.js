const { Op } = require('sequelize');
const AsignacionExpediente = require('../models/AsignacionExpediente');
const LlamadaAdministrado = require('../models/LlamadaAdministrado');
const AccionLlamada = require('../models/AccionLlamada');
const AccionAtencion = require('../models/AccionAtencion');
const ArchivoAccion = require('../models/ArchivoAccion');
const HistorialAsignacion = require('../models/HistorialAsignacion');
const HistorialLlamada = require('../models/HistorialLlamada');
const RespuestaAsignacion = require('../models/RespuestaAsignacion');
const ArchivoRespuestaAsignacion = require('../models/ArchivoRespuestaAsignacion');
const EvaluacionAsignacion = require('../models/EvaluacionAsignacion');
const Expediente = require('../models/Expediente');
const Usuario = require('../models/Usuario');
const Cargo = require('../models/Cargo');
const { hoyLima, sumarDiasCalendario } = require('../utils/fechas');
const { resumenPorAsignacion, tiempoRespuestaHoras, aLima, ESTADOS } = require('../services/estadoRespuestaService');

const DIAS_POR_VENCER = 5;

const normalizar = (valor) => (valor === undefined || valor === null || String(valor).trim() === '' ? null : String(valor).trim());

const diasEntre = (fecha, hoy) =>
  Math.round((Date.parse(`${String(fecha).slice(0, 10)}T00:00:00Z`) - Date.parse(`${hoy}T00:00:00Z`)) / 86400000);

// Rango para columnas solo de fecha (DATEONLY).
const rangoFecha = (desde, hasta) => {
  const d = normalizar(desde);
  const h = normalizar(hasta);
  if (d && h) return { [Op.between]: [d, h] };
  if (d) return { [Op.gte]: d };
  if (h) return { [Op.lte]: h };
  return null;
};

// Rango para columnas con hora: día completo.
const rangoFechaHora = (desde, hasta) => {
  const d = normalizar(desde);
  const h = normalizar(hasta);
  const inicio = d ? `${d.slice(0, 10)} 00:00:00` : null;
  const fin = h ? `${h.slice(0, 10)} 23:59:59` : null;
  if (inicio && fin) return { [Op.between]: [inicio, fin] };
  if (inicio) return { [Op.gte]: inicio };
  if (fin) return { [Op.lte]: fin };
  return null;
};

const nombreDe = (u) => (u ? `${u.nombre} ${u.apellido || ''}`.trim() : '');
const vencimientoVigente = (a) => a.fecha_vencimiento_prorroga || a.fecha_vencimiento;

// 1. Productividad por persona: asignaciones y llamadas de cada responsable.
exports.productividad = async (req, res) => {
  try {
    const hoy = hoyLima();
    const where = { estado: true };
    const rf = rangoFecha(req.query.desde, req.query.hasta);
    if (rf) where.fecha_asignacion = rf;
    const asignaciones = await AsignacionExpediente.findAll({
      where,
      include: [{ model: Usuario, as: 'asignado', attributes: ['id', 'nombre', 'apellido'], include: [{ model: Cargo, attributes: ['nombre'] }], required: false }],
    });
    const resumen = await resumenPorAsignacion(asignaciones.map((a) => a.id));

    const personas = new Map();
    const persona = (id, usuario) => {
      if (!personas.has(id)) {
        personas.set(id, {
          nombre: nombreDe(usuario),
          cargo: usuario?.Cargo?.nombre || usuario?.cargo || '',
          asignaciones: 0,
          cerradas: 0,
          reasignadas: 0,
          observadas: 0,
          sin_respuesta: 0,
          vencidas: 0,
          tiempos: [],
          llamadas: 0,
          presenciales: 0,
          llamadas_respondidas: 0,
          llamadas_vencidas: 0,
        });
      }
      return personas.get(id);
    };

    asignaciones.forEach((a) => {
      const p = persona(a.id_usuario, a.get({ plain: true }).asignado);
      const r = resumen.get(a.id);
      p.asignaciones += 1;
      // Reasignada: cerrada para su dueño anterior, con cumplimiento hasta su última respuesta.
      if (a.motivo_cierre) {
        p.cerradas += 1;
        p.reasignadas += 1;
      } else {
        if (r.estado === ESTADOS.CERRADA) p.cerradas += 1;
        if (r.estado === ESTADOS.OBSERVADA) p.observadas += 1;
        if (r.estado === ESTADOS.SIN_RESPUESTA) p.sin_respuesta += 1;
        const dias = diasEntre(vencimientoVigente(a), hoy);
        if (r.estado !== ESTADOS.CERRADA && dias < 0) p.vencidas += 1;
      }
      if (r.ultima_respuesta) p.tiempos.push(tiempoRespuestaHoras(a.fecha_asignacion, r.ultima_respuesta));
    });

    const rfh = rangoFechaHora(req.query.desde, req.query.hasta);
    const llamadasWhere = rfh ? { fecha_llamada: rfh } : {};
    const llamadas = await LlamadaAdministrado.findAll({
      where: llamadasWhere,
      attributes: ['id', 'id_responsable', 'tipo_atencion', 'respondido', 'fecha_respuesta'],
      include: [{ model: Usuario, as: 'responsable', attributes: ['id', 'nombre', 'apellido'], required: false }],
    });
    llamadas.forEach((l) => {
      if (!l.id_responsable) return;
      const p = persona(l.id_responsable, l.get({ plain: true }).responsable);
      p.llamadas += 1;
      if (l.tipo_atencion === 'PRESENCIAL') p.presenciales += 1;
      if (l.respondido) p.llamadas_respondidas += 1;
      else if (l.fecha_respuesta && l.fecha_respuesta < hoy) p.llamadas_vencidas += 1;
    });

    const media = (lista) => (lista.length ? Math.round((lista.reduce((s, h) => s + h, 0) / lista.length) * 10) / 10 : null);
    const filas = [...personas.values()]
      .map((p) => ({
        nombre: p.nombre,
        cargo: p.cargo,
        asignaciones: p.asignaciones,
        cerradas: p.cerradas,
        reasignadas: p.reasignadas,
        observadas: p.observadas,
        sin_respuesta: p.sin_respuesta,
        vencidas: p.vencidas,
        tiempo_promedio_horas: media(p.tiempos),
        llamadas: p.llamadas,
        presenciales: p.presenciales,
        llamadas_respondidas: p.llamadas_respondidas,
        llamadas_vencidas: p.llamadas_vencidas,
      }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));

    const suma = (campo) => filas.reduce((s, f) => s + f[campo], 0);
    res.json({
      filas,
      totales: {
        personas: filas.length,
        asignaciones: suma('asignaciones'),
        cerradas: suma('cerradas'),
        observadas: suma('observadas'),
        vencidas: suma('vencidas'),
        llamadas: suma('llamadas'),
        llamadas_respondidas: suma('llamadas_respondidas'),
      },
    });
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

// 2. Prórrogas: solicitudes, estado, quién solicitó y quién revisó.
exports.prorrogas = async (req, res) => {
  try {
    const hoy = hoyLima();
    const where = { estado: true, estado_prorroga: { [Op.ne]: null } };
    const rf = rangoFecha(req.query.desde, req.query.hasta);
    if (rf) where.fecha_prorroga = rf;
    if (normalizar(req.query.estado)) where.estado_prorroga = req.query.estado.toUpperCase();

    const asignaciones = await AsignacionExpediente.findAll({
      where,
      include: [{ model: Usuario, as: 'asignado', attributes: ['id', 'nombre', 'apellido'], include: [{ model: Cargo, attributes: ['nombre'] }], required: false }],
      order: [['fecha_prorroga', 'DESC'], ['id', 'DESC']],
    });
    const ids = asignaciones.map((a) => a.id);
    const historial = ids.length
      ? await HistorialAsignacion.findAll({
          where: { id_asignacion: { [Op.in]: ids }, tipo: { [Op.in]: ['SOLICITUD_PRORROGA', 'PRORROGA_ACEPTADA', 'PRORROGA_RECHAZADA'] } },
          include: [{ model: Usuario, as: 'usuario', attributes: ['nombre', 'apellido'], required: false }],
          order: [['id', 'ASC']],
        })
      : [];
    const solicitadaPor = {};
    const revisadaPor = {};
    historial.forEach((h) => {
      const plain = h.get({ plain: true });
      const registro = { nombre: nombreDe(plain.usuario), fecha: h.fecha_registro };
      if (h.tipo === 'SOLICITUD_PRORROGA') solicitadaPor[h.id_asignacion] = registro;
      else revisadaPor[h.id_asignacion] = registro;
    });

    const filas = asignaciones.map((a) => {
      const plain = a.get({ plain: true });
      const revision = revisadaPor[a.id];
      return {
        cut: a.cut,
        asignado: nombreDe(plain.asignado),
        cargo: plain.asignado?.Cargo?.nombre || '',
        fecha_solicitud: a.fecha_prorroga,
        plazo_prorroga: a.plazo_prorroga,
        motivo: a.motivo_prorroga || '',
        estado: a.estado_prorroga,
        solicitada_por: solicitadaPor[a.id]?.nombre || '',
        vence_original: a.fecha_vencimiento,
        vence_nueva: a.fecha_vencimiento_prorroga || null,
        revisada_por: revision?.nombre || '',
        fecha_revision: revision ? aLima(revision.fecha) : null,
        dias_restantes: a.fecha_vencimiento_prorroga ? diasEntre(a.fecha_vencimiento_prorroga, hoy) : null,
      };
    });

    const contar = (estado) => filas.filter((f) => f.estado === estado).length;
    res.json({
      filas,
      totales: { total: filas.length, pendientes: contar('PENDIENTE'), aceptadas: contar('ACEPTADA'), rechazadas: contar('RECHAZADA') },
    });
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

// 3. Expedientes registrados que todavía no tienen asignación activa.
exports.expedientesSinAsignar = async (req, res) => {
  try {
    const hoy = hoyLima();
    const where = {};
    const rfh = rangoFechaHora(req.query.desde, req.query.hasta);
    // El rango de fechas se aplica a la fecha de registro en SEGEX.
    if (rfh) where.fecha_creacion = rfh;
    const expedientes = await Expediente.findAll({
      where,
      attributes: ['cut', 'asunto', 'proced', 'feccrea', 'fecha_creacion', 'usurem', 'destinos'],
      include: [{ model: Usuario, as: 'creador', attributes: ['nombre', 'apellido'], required: false }],
      order: [['fecha_creacion', 'DESC']],
    });

    const cuts = [...new Set(expedientes.map((e) => e.cut))];
    const asignados = new Set();
    if (cuts.length) {
      const filasAsig = await AsignacionExpediente.findAll({
        attributes: ['cut'],
        where: { estado: true, cut: { [Op.in]: cuts } },
        raw: true,
      });
      filasAsig.forEach((a) => asignados.add(a.cut));
    }

    const vistos = new Set();
    const filas = [];
    expedientes.forEach((e) => {
      if (asignados.has(e.cut) || vistos.has(e.cut)) return;
      vistos.add(e.cut);
      // Fecha en que se registró el expediente en SEGEX.
      const fecha = e.fecha_creacion ? aLima(e.fecha_creacion) : null;
      filas.push({
        cut: e.cut,
        asunto: e.asunto || '',
        procedimiento: e.proced || '',
        creado_por: e.creador ? `${e.creador.nombre} ${e.creador.apellido}` : '',
        usuario_remitente: e.usurem || '',
        destino: String(e.destinos || '').replace(/\r/g, '').trim(),
        fecha_registro: fecha,
        // Días desde que el expediente se registró en SEGEX (fecha de creación local, hora de Lima).
        dias_sin_asignar: e.fecha_creacion ? diasEntre(hoy, aLima(e.fecha_creacion).slice(0, 10)) : null,
      });
    });

    res.json({ filas, totales: { total: filas.length } });
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

// 4. Acciones de llamada agrupadas por tipo de acción.
exports.acciones = async (req, res) => {
  try {
    const rfh = rangoFechaHora(req.query.desde, req.query.hasta);
    const llamadasWhere = rfh ? { fecha_llamada: rfh } : {};
    const llamadas = await LlamadaAdministrado.findAll({ where: llamadasWhere, attributes: ['id'], raw: true });
    const ids = llamadas.map((l) => l.id);

    const acciones = ids.length
      ? await AccionLlamada.findAll({
          where: { id_llamada: { [Op.in]: ids } },
          include: [{ model: AccionAtencion, as: 'accion', attributes: ['nombre'], required: false }],
        })
      : [];
    const archivos = ids.length
      ? await ArchivoAccion.findAll({
          attributes: ['id_accion_llamada'],
          where: { id_accion_llamada: { [Op.in]: acciones.map((a) => a.id) } },
          raw: true,
        })
      : [];
    const conArchivo = new Set(archivos.map((a) => a.id_accion_llamada));

    const grupos = new Map();
    acciones.forEach((a) => {
      const nombre = a.accion?.nombre || 'Sin tipo';
      if (!grupos.has(nombre)) grupos.set(nombre, { accion: nombre, total: 0, ejecutadas: 0, pendientes: 0, con_archivo: 0 });
      const g = grupos.get(nombre);
      g.total += 1;
      if (a.estado === 'EJECUTADO') g.ejecutadas += 1;
      else g.pendientes += 1;
      if (conArchivo.has(a.id)) g.con_archivo += 1;
    });

    const filas = [...grupos.values()].sort((x, y) => y.total - x.total || x.accion.localeCompare(y.accion));
    const suma = (campo) => filas.reduce((s, f) => s + f[campo], 0);
    res.json({
      filas,
      totales: { total: suma('total'), ejecutadas: suma('ejecutadas'), pendientes: suma('pendientes'), con_archivo: suma('con_archivo') },
    });
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

// 5. Historial completo de un CUT: asignaciones, respuestas, evaluaciones y llamadas en orden.
exports.historialCut = async (req, res) => {
  try {
    const cut = normalizar(req.query.cut);
    if (!cut) return res.status(400).json({ mensaje: 'Indique el CUT a consultar' });
    const cutMayuscula = cut.toUpperCase();

    const asignaciones = await AsignacionExpediente.findAll({
      where: { cut: cutMayuscula },
      include: [{ model: Usuario, as: 'asignado', attributes: ['nombre', 'apellido'], required: false }],
      order: [['id', 'ASC']],
    });
    const idsAsig = asignaciones.map((a) => a.id);

    const [historialAsig, respuestas, evaluaciones, llamadas] = await Promise.all([
      idsAsig.length
        ? HistorialAsignacion.findAll({ where: { id_asignacion: { [Op.in]: idsAsig } }, include: [{ model: Usuario, as: 'usuario', attributes: ['nombre', 'apellido'], required: false }] })
        : [],
      idsAsig.length
        ? RespuestaAsignacion.findAll({
            where: { id_asignacion: { [Op.in]: idsAsig } },
            include: [
              { model: Usuario, as: 'usuario', attributes: ['nombre', 'apellido'], required: false },
              { model: ArchivoRespuestaAsignacion, as: 'archivos', attributes: ['id', 'descripcion'], required: false },
            ],
          })
        : [],
      idsAsig.length
        ? EvaluacionAsignacion.findAll({ where: { id_asignacion: { [Op.in]: idsAsig } }, include: [{ model: Usuario, as: 'evaluador', attributes: ['nombre', 'apellido'], required: false }] })
        : [],
      LlamadaAdministrado.unscoped().findAll({
        where: { cut: cutMayuscula },
        include: [
          { model: Usuario, as: 'responsable', attributes: ['nombre', 'apellido'], required: false },
          { model: Usuario, as: 'creador', attributes: ['nombre', 'apellido'], required: false },
        ],
        order: [['fecha_llamada', 'ASC']],
      }),
    ]);
    const idsLlamadas = llamadas.map((l) => l.id);
    const historialLlamadas = idsLlamadas.length
      ? await HistorialLlamada.findAll({ where: { id_llamada: { [Op.in]: idsLlamadas } }, include: [{ model: Usuario, as: 'usuario', attributes: ['nombre', 'apellido'], required: false }] })
      : [];

    const eventos = [];
    historialAsig.forEach((h) => {
      const p = h.get({ plain: true });
      eventos.push({ fecha: h.fecha_registro, origen: 'ASIGNACION', tipo: h.tipo, detalle: h.observacion || (h.plazo ? `${h.plazo} días` : ''), usuario: nombreDe(p.usuario) });
    });
    respuestas.forEach((r) => {
      const p = r.get({ plain: true });
      const archivos = (p.archivos || []).length;
      eventos.push({
        fecha: r.fecha_creacion,
        origen: 'RESPUESTA',
        tipo: 'RESPUESTA',
        detalle: `${r.texto}${archivos ? ` · ${archivos} archivo(s)` : ''}`,
        usuario: nombreDe(p.usuario),
      });
    });
    evaluaciones.forEach((e) => {
      const p = e.get({ plain: true });
      eventos.push({ fecha: e.fecha_evaluacion, origen: 'EVALUACION', tipo: e.resultado, detalle: e.observacion || '', usuario: nombreDe(p.evaluador) });
    });
    llamadas.forEach((l) => {
      const p = l.get({ plain: true });
      const etiqueta = l.tipo_atencion === 'PRESENCIAL' ? 'Atención presencial' : 'Llamada';
      eventos.push({ fecha: l.fecha_llamada, origen: 'LLAMADA', tipo: 'REGISTRO', detalle: `${etiqueta} · ${p.nombre_llamante}: ${l.motivo}`, usuario: nombreDe(p.creador) });
    });
    historialLlamadas.forEach((h) => {
      const p = h.get({ plain: true });
      eventos.push({ fecha: h.fecha_registro, origen: 'LLAMADA', tipo: h.tipo, detalle: h.detalle || '', usuario: nombreDe(p.usuario) });
    });

    eventos.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    res.json({
      cut: cutMayuscula,
      asignaciones: asignaciones.map((a) => {
        const p = a.get({ plain: true });
        return {
          asignado: nombreDe(p.asignado),
          fecha_asignacion: a.fecha_asignacion,
          plazo_atencion: a.plazo_atencion,
          vence: vencimientoVigente(a),
          estado: a.motivo_cierre ? 'REASIGNADA' : a.estado ? 'ACTIVA' : 'INACTIVA',
        };
      }),
      llamadas: llamadas.length,
      eventos: eventos.map((e) => ({ ...e, fecha: aLima(e.fecha) })),
    });
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

// 6. Resumen del periodo: indicadores clave.
exports.resumen = async (req, res) => {
  try {
    const hoy = hoyLima();
    const rf = rangoFecha(req.query.desde, req.query.hasta);
    const rfh = rangoFechaHora(req.query.desde, req.query.hasta);

    const asignaciones = await AsignacionExpediente.findAll({
      where: { estado: true, ...(rf ? { fecha_asignacion: rf } : {}) },
      attributes: ['id', 'fecha_asignacion', 'fecha_vencimiento', 'fecha_vencimiento_prorroga', 'estado_prorroga', 'motivo_cierre'],
    });
    const resumen = await resumenPorAsignacion(asignaciones.map((a) => a.id));
    // Reasignada = cerrada para su dueño anterior: cuenta como cerrada y nunca como vencida.
    const cerradas = asignaciones.filter((a) => a.motivo_cierre || resumen.get(a.id).estado === ESTADOS.CERRADA).length;
    const reasignadas = asignaciones.filter((a) => a.motivo_cierre).length;
    const vencidas = asignaciones.filter((a) => !a.motivo_cierre && resumen.get(a.id).estado !== ESTADOS.CERRADA && diasEntre(vencimientoVigente(a), hoy) < 0).length;

    const llamadasWhere = rfh ? { fecha_llamada: rfh } : {};
    const todosRegistros = await LlamadaAdministrado.findAll({ where: llamadasWhere, attributes: ['id', 'respondido', 'fecha_respuesta', 'tipo_atencion'], raw: true });
    // Las llamadas telefónicas y las atenciones presenciales se cuentan por separado.
    const llamadas = todosRegistros.filter((l) => l.tipo_atencion !== 'PRESENCIAL');
    const presenciales = todosRegistros.length - llamadas.length;
    const idsLlamadas = todosRegistros.map((l) => l.id);
    const acciones = idsLlamadas.length
      ? await AccionLlamada.findAll({ attributes: ['estado'], where: { id_llamada: { [Op.in]: idsLlamadas } }, raw: true })
      : [];

    const prorrogas = await AsignacionExpediente.count({
      where: { estado: true, estado_prorroga: { [Op.ne]: null }, ...(rf ? { fecha_prorroga: rf } : {}) },
    });

    const indicadores = [
      { indicador: 'Asignaciones del periodo', valor: asignaciones.length },
      { indicador: 'Asignaciones cerradas', valor: cerradas },
      { indicador: 'Asignaciones reasignadas', valor: reasignadas },
      { indicador: 'Asignaciones vencidas (abiertas)', valor: vencidas },
      { indicador: 'Prórrogas solicitadas', valor: prorrogas },
      { indicador: 'Llamadas recibidas', valor: llamadas.length },
      { indicador: 'Atenciones presenciales', valor: presenciales },
      { indicador: 'Llamadas respondidas', valor: llamadas.filter((l) => l.respondido).length },
      { indicador: 'Llamadas vencidas sin respuesta', valor: llamadas.filter((l) => !l.respondido && l.fecha_respuesta && l.fecha_respuesta < hoy).length },
      { indicador: 'Acciones de llamada ejecutadas', valor: acciones.filter((a) => a.estado === 'EJECUTADO').length },
      { indicador: 'Acciones de llamada pendientes', valor: acciones.filter((a) => a.estado !== 'EJECUTADO').length },
    ];
    res.json({ filas: indicadores, totales: { total: indicadores.length } });
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

// Desempeño propio de quien inicia sesión: solo sus asignaciones y llamadas.
exports.miDesempeno = async (req, res) => {
  try {
    const yo = req.user.id;
    const hoy = hoyLima();

    const whereA = { estado: true, id_usuario: yo };
    const rf = rangoFecha(req.query.desde, req.query.hasta);
    if (rf) whereA.fecha_asignacion = rf;
    const asignaciones = await AsignacionExpediente.findAll({ where: whereA, order: [['fecha_asignacion', 'DESC'], ['id', 'DESC']] });
    const resumen = await resumenPorAsignacion(asignaciones.map((a) => a.id));
    const filasAsignaciones = asignaciones.map((a) => {
      const r = resumen.get(a.id);
      // Reasignada: cerrada para mí con mi última respuesta; se muestra como reasignada.
      const cerrada = Boolean(a.motivo_cierre) || r.estado === ESTADOS.CERRADA;
      const vence = vencimientoVigente(a);
      return {
        cut: a.cut,
        fecha_asignacion: a.fecha_asignacion,
        vence,
        estado: a.motivo_cierre ? 'REASIGNADA' : r.estado,
        total_respuestas: r.total,
        tiempo_respuesta_horas: r.ultima_respuesta ? tiempoRespuestaHoras(a.fecha_asignacion, r.ultima_respuesta) : null,
        dias_restantes: cerrada ? null : diasEntre(vence, hoy),
        cerrada,
      };
    });

    const whereL = { id_responsable: yo };
    const rfh = rangoFechaHora(req.query.desde, req.query.hasta);
    if (rfh) whereL.fecha_llamada = rfh;
    const llamadas = await LlamadaAdministrado.findAll({
      where: whereL,
      attributes: ['id', 'cut', 'nombre_llamante', 'motivo', 'tipo_atencion', 'fecha_llamada', 'fecha_respuesta', 'respondido'],
      order: [['fecha_llamada', 'DESC'], ['id', 'DESC']],
    });
    const idsL = llamadas.map((l) => l.id);
    const historialResp = idsL.length
      ? await HistorialLlamada.findAll({ attributes: ['id_llamada', 'fecha_registro'], where: { id_llamada: { [Op.in]: idsL }, tipo: 'RESPONDIDO' }, raw: true })
      : [];
    const respondidoEn = {};
    historialResp.forEach((h) => {
      const f = new Date(h.fecha_registro);
      if (!respondidoEn[h.id_llamada] || f > respondidoEn[h.id_llamada]) respondidoEn[h.id_llamada] = f;
    });
    const acciones = idsL.length
      ? await AccionLlamada.findAll({ attributes: ['id_llamada', 'estado'], where: { id_llamada: { [Op.in]: idsL } }, raw: true })
      : [];
    const pendientes = {};
    acciones.forEach((a) => {
      if (a.estado !== 'EJECUTADO') pendientes[a.id_llamada] = (pendientes[a.id_llamada] || 0) + 1;
    });

    const detalleAcciones = idsL.length
      ? await AccionLlamada.findAll({
          attributes: ['id', 'id_llamada', 'estado', 'observacion', 'fecha_ejecucion'],
          where: { id_llamada: { [Op.in]: idsL } },
          include: [{ model: AccionAtencion, as: 'accion', attributes: ['nombre'], required: false }],
          order: [['id', 'DESC']],
        })
      : [];
    const cutPorLlamada = Object.fromEntries(llamadas.map((l) => [l.id, l.cut]));

    const filasLlamadas = llamadas.map((l) => {
      const dias = l.fecha_respuesta ? diasEntre(l.fecha_respuesta, hoy) : null;
      let situacion = 'SIN_PLAZO';
      if (l.respondido) situacion = 'RESPONDIDA';
      else if (dias !== null && dias < 0) situacion = 'VENCIDA';
      else if (dias !== null && dias <= 5) situacion = 'POR_VENCER';
      else if (dias !== null) situacion = 'EN_PLAZO';
      return {
        fecha_llamada: aLima(l.fecha_llamada),
        tipo_atencion: l.tipo_atencion,
        cut: l.cut,
        nombre_llamante: l.nombre_llamante,
        motivo: l.motivo,
        fecha_limite: l.fecha_respuesta,
        dias_restantes: l.respondido ? null : dias,
        situacion,
        respondido: l.respondido,
        tiempo_respuesta_horas: respondidoEn[l.id] ? Math.round(((respondidoEn[l.id] - new Date(l.fecha_llamada)) / 3600000) * 10) / 10 : null,
        acciones_pendientes: pendientes[l.id] || 0,
      };
    });

    const tiempos = filasAsignaciones.map((f) => f.tiempo_respuesta_horas).filter((h) => h !== null);
    res.json({
      resumen: {
        asignaciones: filasAsignaciones.length,
        cerradas: filasAsignaciones.filter((f) => f.cerrada).length,
        observadas: filasAsignaciones.filter((f) => f.estado === ESTADOS.OBSERVADA).length,
        vencidas: filasAsignaciones.filter((f) => !f.cerrada && f.dias_restantes < 0).length,
        tiempo_promedio_horas: tiempos.length ? Math.round((tiempos.reduce((s, h) => s + h, 0) / tiempos.length) * 10) / 10 : null,
        llamadas: filasLlamadas.filter((f) => f.tipo_atencion !== 'PRESENCIAL').length,
        presenciales: filasLlamadas.filter((f) => f.tipo_atencion === 'PRESENCIAL').length,
        llamadas_respondidas: filasLlamadas.filter((f) => f.respondido).length,
        llamadas_vencidas: filasLlamadas.filter((f) => f.situacion === 'VENCIDA').length,
        acciones_pendientes: filasLlamadas.reduce((s, f) => s + f.acciones_pendientes, 0),
      },
      asignaciones: filasAsignaciones,
      llamadas: filasLlamadas,
      prorrogas: asignaciones
        .filter((a) => a.estado_prorroga)
        .map((a) => ({
          cut: a.cut,
          fecha_solicitud: a.fecha_prorroga,
          plazo_prorroga: a.plazo_prorroga,
          motivo: a.motivo_prorroga || '',
          estado: a.estado_prorroga,
          vence_original: a.fecha_vencimiento,
          vence_nueva: a.fecha_vencimiento_prorroga || null,
        })),
      acciones: detalleAcciones.map((a) => {
        const p = a.get({ plain: true });
        return {
          cut: cutPorLlamada[a.id_llamada] || '',
          accion: p.accion?.nombre || 'Sin tipo',
          estado: a.estado === 'EJECUTADO' ? 'Ejecutada' : 'Pendiente',
          observacion: a.observacion || '',
          fecha_ejecucion: a.fecha_ejecucion || null,
        };
      }),
    });
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

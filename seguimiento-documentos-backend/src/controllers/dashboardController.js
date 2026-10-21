const { Op } = require('sequelize');
const AsignacionExpediente = require('../models/AsignacionExpediente');
const LlamadaAdministrado = require('../models/LlamadaAdministrado');
const AccionLlamada = require('../models/AccionLlamada');
const { resumenPorAsignacion, tiempoRespuestaHoras, ESTADOS, aLima } = require('../services/estadoRespuestaService');
const { hoyLima, sumarDiasCalendario } = require('../utils/fechas');
const Usuario = require('../models/Usuario');

const PERFILES_GESTION = ['admin', 'jefe', 'secretaria'];
const esGestor = (usuario) => PERFILES_GESTION.includes(usuario.perfil);

const DIAS_POR_VENCER = 5;
const PRIORIDAD_MOTIVO = {
  OBSERVADA: 0,
  VENCIDA: 1,
  LLAMADA_VENCIDA: 1,
  POR_VENCER: 2,
  LLAMADA_POR_VENCER: 2,
  POR_EVALUAR: 3,
  RESPONDIDA: 4,
};

const diasEntre = (fecha, hoy) =>
  Math.round((Date.parse(`${String(fecha).slice(0, 10)}T00:00:00Z`) - Date.parse(`${hoy}T00:00:00Z`)) / 86400000);

const vencimientoVigente = (a) => (a.estado_prorroga === 'ACEPTADA' ? a.fecha_vencimiento_prorroga : a.fecha_vencimiento);

// Motivo por el que la asignación necesita atención de quien mira el dashboard.
const motivoDeAtencion = (fila, gestor) => {
  if (fila.estado_respuesta === ESTADOS.OBSERVADA) return 'OBSERVADA';
  if (fila.cerrada) return null;
  if (fila.dias < 0) return 'VENCIDA';
  if (fila.dias <= DIAS_POR_VENCER) return 'POR_VENCER';
  if (gestor && fila.estado_respuesta === ESTADOS.POR_EVALUAR) return 'POR_EVALUAR';
  if (gestor && fila.estado_respuesta === ESTADOS.RESPONDIDA) return 'RESPONDIDA';
  return null;
};

exports.resumen = async (req, res) => {
  try {
    const gestor = esGestor(req.user);
    const hoy = hoyLima();

    const whereAsignaciones = { estado: true };
    if (!gestor) whereAsignaciones.id_usuario = req.user.id;
    const asignaciones = await AsignacionExpediente.findAll({
      where: whereAsignaciones,
      attributes: ['id', 'cut', 'id_usuario', 'fecha_asignacion', 'fecha_vencimiento', 'estado_prorroga', 'fecha_vencimiento_prorroga'],
      include: [{ association: 'asignado', attributes: ['id', 'nombre', 'apellido'], required: false }],
    });
    const resumen = await resumenPorAsignacion(asignaciones.map((a) => a.id));

    const filas = asignaciones.map((a) => {
      const plain = a.get({ plain: true });
      const r = resumen.get(a.id);
      const vence = vencimientoVigente(a);
      const fila = {
        id: a.id,
        cut: a.cut,
        asignado: plain.asignado ? `${plain.asignado.nombre} ${plain.asignado.apellido}` : null,
        vence,
        dias: diasEntre(vence, hoy),
        estado_prorroga: a.estado_prorroga,
        estado_respuesta: r.estado,
        cerrada: r.estado === ESTADOS.CERRADA,
        tiempo_respuesta_horas: r.estado === ESTADOS.CERRADA ? tiempoRespuestaHoras(a.fecha_asignacion, r.ultima_respuesta) : null,
      };
      return { ...fila, motivo: motivoDeAtencion(fila, gestor) };
    });

    const abiertas = filas.filter((f) => !f.cerrada);
    const cerradas = filas.filter((f) => f.cerrada);
    const tiempos = cerradas.map((f) => f.tiempo_respuesta_horas).filter((h) => h !== null);
    const contar = (estado) => filas.filter((f) => f.estado_respuesta === estado).length;

    const whereLlamadas = gestor
      ? {}
      : { [Op.or]: [{ id_responsable: req.user.id }, { id_usuario_creador: req.user.id }] };
    const llamadas = await LlamadaAdministrado.findAll({
      where: whereLlamadas,
      attributes: ['id', 'cut', 'respondido', 'fecha_respuesta'],
      include: [{ model: Usuario, as: 'responsable', attributes: ['nombre', 'apellido'], required: false }],
    });
    const idsLlamadas = llamadas.map((l) => l.id);

    // Llamadas sin respuesta cuyo plazo ya venció, o que vencen en los próximos días.
    const limiteLlamada = sumarDiasCalendario(hoy, DIAS_POR_VENCER);
    const sinResponder = llamadas.filter((l) => !l.respondido && l.fecha_respuesta);
    const llamadasVencidas = sinResponder.filter((l) => l.fecha_respuesta < hoy);
    const llamadasPorVencer = sinResponder.filter((l) => l.fecha_respuesta >= hoy && l.fecha_respuesta <= limiteLlamada);
    const itemLlamada = (l, motivo) => {
      const plain = l.get({ plain: true });
      return {
        id: `llamada-${l.id}`,
        cut: l.cut,
        asignado: plain.responsable ? `${plain.responsable.nombre} ${plain.responsable.apellido}` : null,
        vence: l.fecha_respuesta,
        dias: diasEntre(l.fecha_respuesta, hoy),
        motivo,
      };
    };
    const accionesPendientes = idsLlamadas.length
      ? await AccionLlamada.count({ where: { estado: 'PENDIENTE', id_llamada: { [Op.in]: idsLlamadas } } })
      : 0;

    const itemsLlamadas = [
      ...llamadasVencidas.map((l) => itemLlamada(l, 'LLAMADA_VENCIDA')),
      ...llamadasPorVencer.map((l) => itemLlamada(l, 'LLAMADA_POR_VENCER')),
    ];
    const atencion = [...filas.filter((f) => f.motivo), ...itemsLlamadas]
      .sort((a, b) => PRIORIDAD_MOTIVO[a.motivo] - PRIORIDAD_MOTIVO[b.motivo] || a.dias - b.dias)
      .slice(0, 15)
      .map(({ id, cut, asignado, vence, dias, motivo }) => ({ id, cut, asignado, vence, dias, motivo }));

    res.json({
      alcance: gestor ? 'TODOS' : 'PERSONAL',
      asignaciones: {
        abiertas: abiertas.length,
        vencidas: abiertas.filter((f) => f.dias < 0).length,
        por_vencer: abiertas.filter((f) => f.dias >= 0 && f.dias <= DIAS_POR_VENCER).length,
        prorrogas_pendientes: filas.filter((f) => f.estado_prorroga === 'PENDIENTE').length,
        cerradas: cerradas.length,
        tiempo_promedio_horas: tiempos.length
          ? Math.round((tiempos.reduce((s, h) => s + h, 0) / tiempos.length) * 10) / 10
          : null,
      },
      respuestas: {
        sin_respuesta: contar(ESTADOS.SIN_RESPUESTA),
        por_evaluar: contar(ESTADOS.POR_EVALUAR),
        respondidas: contar(ESTADOS.RESPONDIDA),
        observadas: contar(ESTADOS.OBSERVADA),
        cerradas: contar(ESTADOS.CERRADA),
      },
      llamadas: {
        total: llamadas.length,
        respondidas: llamadas.filter((l) => l.respondido).length,
        sin_respuesta: llamadas.filter((l) => !l.respondido).length,
        vencidas: llamadasVencidas.length,
        por_vencer: llamadasPorVencer.length,
        acciones_pendientes: accionesPendientes,
      },
      atencion,
    });
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

// Llamadas sin respuesta, ordenadas por fecha límite (las vencidas primero). Mismo alcance por perfil.
exports.monitorLlamadas = async (req, res) => {
  try {
    // Monitor general: muestra todas las llamadas pendientes a cualquier usuario con sesión.
    const gestor = true;
    const hoy = hoyLima();
    const { q, responsable } = req.query;
    const condiciones = [];
    if (!gestor) condiciones.push({ [Op.or]: [{ id_responsable: req.user.id }, { id_usuario_creador: req.user.id }] });
    if (q && String(q).trim()) {
      const like = { [Op.like]: `%${String(q).trim().toUpperCase()}%` };
      condiciones.push({ [Op.or]: [{ cut: like }, { nombre_llamante: like }] });
    }
    if (responsable && !isNaN(parseInt(responsable, 10))) {
      condiciones.push({ id_responsable: parseInt(responsable, 10) });
    }
    const where = { respondido: false, ...(condiciones.length ? { [Op.and]: condiciones } : {}) };

    const llamadas = await LlamadaAdministrado.findAll({
      where,
      attributes: ['id', 'cut', 'nombre_llamante', 'telefono', 'motivo', 'fecha_llamada', 'fecha_respuesta'],
      include: [{ model: Usuario, as: 'responsable', attributes: ['id', 'nombre', 'apellido'], required: false }],
    });

    const ids = llamadas.map((l) => l.id);
    const pendientes = ids.length
      ? await AccionLlamada.findAll({
          attributes: ['id_llamada'],
          where: { estado: 'PENDIENTE', id_llamada: { [Op.in]: ids } },
          raw: true,
        })
      : [];
    const accionesPorLlamada = {};
    pendientes.forEach((a) => {
      accionesPorLlamada[a.id_llamada] = (accionesPorLlamada[a.id_llamada] || 0) + 1;
    });

    // Cuántas llamadas (sin importar si están respondidas) tiene cada CUT de la lista.
    const ambito = gestor ? {} : { [Op.or]: [{ id_responsable: req.user.id }, { id_usuario_creador: req.user.id }] };
    const cuts = [...new Set(llamadas.map((l) => l.cut))];
    const porCut = {};
    if (cuts.length) {
      const delCut = await LlamadaAdministrado.findAll({
        attributes: ['cut'],
        where: { cut: { [Op.in]: cuts }, ...ambito },
        raw: true,
      });
      delCut.forEach((f) => {
        porCut[f.cut] = (porCut[f.cut] || 0) + 1;
      });
    }

    const todas = llamadas
      .map((l) => {
        const plain = l.get({ plain: true });
        return {
          id: l.id,
          cut: l.cut,
          nombre_llamante: l.nombre_llamante,
          telefono: l.telefono,
          motivo: l.motivo,
          fecha_llamada: aLima(l.fecha_llamada),
          fecha_respuesta: l.fecha_respuesta,
          dias: l.fecha_respuesta ? diasEntre(l.fecha_respuesta, hoy) : null,
          responsable: plain.responsable,
          acciones_pendientes: accionesPorLlamada[l.id] || 0,
          total_del_cut: porCut[l.cut] || 1,
        };
      })
      .sort((a, b) => {
        if (a.dias === null && b.dias === null) return a.id - b.id;
        if (a.dias === null) return 1;
        if (b.dias === null) return -1;
        return a.dias - b.dias || a.id - b.id;
      });

    res.json({
      resumen: {
        total: todas.length,
        vencidas: todas.filter((f) => f.dias !== null && f.dias < 0).length,
        por_vencer: todas.filter((f) => f.dias !== null && f.dias >= 0 && f.dias <= DIAS_POR_VENCER).length,
        sin_plazo: todas.filter((f) => f.dias === null).length,
      },
      llamadas: todas.slice(0, 100),
    });
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

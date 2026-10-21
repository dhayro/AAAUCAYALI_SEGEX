const { Op } = require('sequelize');
const AsignacionExpediente = require('../models/AsignacionExpediente');
const LlamadaAdministrado = require('../models/LlamadaAdministrado');
const AccionLlamada = require('../models/AccionLlamada');
const { resumenPorAsignacion, tiempoRespuestaHoras, ESTADOS } = require('../services/estadoRespuestaService');
const { hoyLima } = require('../utils/fechas');

const PERFILES_GESTION = ['admin', 'jefe', 'secretaria'];
const esGestor = (usuario) => PERFILES_GESTION.includes(usuario.perfil);

const DIAS_POR_VENCER = 5;
const PRIORIDAD_MOTIVO = { OBSERVADA: 0, VENCIDA: 1, POR_VENCER: 2, POR_EVALUAR: 3, RESPONDIDA: 4 };

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
    const llamadas = await LlamadaAdministrado.findAll({ where: whereLlamadas, attributes: ['id', 'respondido'] });
    const idsLlamadas = llamadas.map((l) => l.id);
    const accionesPendientes = idsLlamadas.length
      ? await AccionLlamada.count({ where: { estado: 'PENDIENTE', id_llamada: { [Op.in]: idsLlamadas } } })
      : 0;

    const atencion = filas
      .filter((f) => f.motivo)
      .sort((a, b) => PRIORIDAD_MOTIVO[a.motivo] - PRIORIDAD_MOTIVO[b.motivo] || a.dias - b.dias)
      .slice(0, 10)
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
        sin_respuesta: llamadas.filter((l) => !l.respondido).length,
        acciones_pendientes: accionesPendientes,
      },
      atencion,
    });
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

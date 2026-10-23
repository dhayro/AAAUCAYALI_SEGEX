const { Op } = require('sequelize');
const sequelize = require('../config/database');
const UsuarioSisged = require('../models/UsuarioSisged');
const Usuario = require('../models/Usuario');
const { hoyLima } = require('../utils/fechas');

const errorConEstado = (mensaje, status = 400) => Object.assign(new Error(mensaje), { status });

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

// Valida y normaliza los datos del usuario de SISGED.
const datosValidos = (body) => {
  const usuarioSisged = String(body.usuario_sisged || '').trim();
  if (!usuarioSisged) throw errorConEstado('Indique el nombre de usuario de SISGED');
  const inicio = String(body.fecha_inicio || '').slice(0, 10);
  if (!FECHA.test(inicio)) throw errorConEstado('Indique la fecha de inicio');
  const fin = body.fecha_fin ? String(body.fecha_fin).slice(0, 10) : null;
  if (fin && !FECHA.test(fin)) throw errorConEstado('La fecha de fin no es válida');
  if (fin && fin < inicio) throw errorConEstado('La fecha de fin no puede ser anterior a la de inicio');
  return {
    usuario_sisged: usuarioSisged,
    fecha_inicio: inicio,
    fecha_fin: fin,
    observacion: body.observacion ? String(body.observacion).trim() : null,
  };
};

// Estado de vigencia: vigente, vencido (ya terminó) o futuro (aún no empieza).
const vigencia = (registro) => {
  const hoy = hoyLima();
  if (registro.fecha_inicio > hoy) return 'FUTURO';
  if (registro.fecha_fin && registro.fecha_fin < hoy) return 'VENCIDO';
  return 'VIGENTE';
};

const aPlano = (registro) => ({ ...registro.get({ plain: true }), vigencia: vigencia(registro) });

const usuarioExistente = async (id) => {
  const usuario = await Usuario.findByPk(id, { attributes: ['id'] });
  if (!usuario) throw errorConEstado('El usuario no existe', 404);
};

exports.listar = async (req, res) => {
  try {
    await usuarioExistente(req.params.id);
    const registros = await UsuarioSisged.findAll({
      where: { id_usuario: req.params.id },
      order: [['fecha_inicio', 'DESC'], ['id', 'DESC']],
    });
    res.json(registros.map(aPlano));
  } catch (error) {
    res.status(error.status || 500).json({ mensaje: error.message });
  }
};

// Día anterior a una fecha YYYY-MM-DD.
const diaAnterior = (fecha) => {
  const d = new Date(`${fecha}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
};

exports.crear = async (req, res) => {
  try {
    await usuarioExistente(req.params.id);
    const datos = datosValidos(req.body);
    const creado = await sequelize.transaction(async (t) => {
      const existentes = await UsuarioSisged.findAll({ where: { id_usuario: req.params.id }, transaction: t });
      const sinFin = '9999-12-31';
      for (const r of existentes) {
        // Solo choca si los periodos se cruzan; los periodos anteriores que no se cruzan se pueden registrar.
        const seCruzan = (r.fecha_fin || sinFin) >= datos.fecha_inicio && (datos.fecha_fin || sinFin) >= r.fecha_inicio;
        if (!seCruzan) continue;
        // Un usuario abierto que empezó antes termina el día antes de que empiece el nuevo.
        if (!r.fecha_fin && r.fecha_inicio < datos.fecha_inicio) {
          await r.update({ fecha_fin: diaAnterior(datos.fecha_inicio) }, { transaction: t });
          continue;
        }
        throw errorConEstado(
          `Las fechas se cruzan con el usuario de SISGED "${r.usuario_sisged}" (${r.fecha_inicio} a ${r.fecha_fin || 'sin fin'}). Ajuste las fechas`
        );
      }
      return UsuarioSisged.create({ ...datos, id_usuario: req.params.id }, { transaction: t });
    });
    res.status(201).json(aPlano(creado));
  } catch (error) {
    res.status(error.status || 400).json({ mensaje: error.message });
  }
};

exports.actualizar = async (req, res) => {
  try {
    const registro = await UsuarioSisged.findOne({ where: { id: req.params.sid, id_usuario: req.params.id } });
    if (!registro) return res.status(404).json({ mensaje: 'Registro no encontrado' });
    await registro.update(datosValidos(req.body));
    res.json(aPlano(registro));
  } catch (error) {
    res.status(error.status || 400).json({ mensaje: error.message });
  }
};

exports.eliminar = async (req, res) => {
  try {
    const registro = await UsuarioSisged.findOne({ where: { id: req.params.sid, id_usuario: req.params.id } });
    if (!registro) return res.status(404).json({ mensaje: 'Registro no encontrado' });
    await registro.destroy();
    res.json({ mensaje: 'Usuario de SISGED quitado' });
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

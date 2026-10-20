const DocumentoSisged = require('../models/DocumentoSisged');
const Expediente = require('../models/Expediente');
const { convertirFechaSisged } = require('../utils/fechas');

const CAMPOS_TEXTO = ['asunto', 'desofi', 'destip', 'dtipdoc', 'destino', 'estado', 'ext', 'flgori', 'nomarch', 'ndoc', 'remi'];
const CAMPOS_TAL_CUAL = ['adjunto'];
const CAMPOS_ENTERO = ['flganex', 'flgver', 'fol', 'iddocanex', 'iddocpad', 'iddocusu', 'iddocvin', 'iddocest', 'idofi', 'idtipdoc', 'flgpriv', 'iddochij'];

const texto = (valor) => {
  if (valor === undefined || valor === null) return null;
  const limpio = String(valor).trim().toUpperCase();
  return limpio === '' ? null : limpio;
};

const entero = (valor) => {
  if (valor === undefined || valor === null || valor === '') return null;
  const numero = parseInt(valor, 10);
  return isNaN(numero) ? null : numero;
};

const mapearFila = (fila) => {
  const valores = {};
  CAMPOS_TEXTO.forEach((campo) => { valores[campo] = texto(fila[campo]); });
  CAMPOS_TAL_CUAL.forEach((campo) => { valores[campo] = fila[campo] ? String(fila[campo]).trim() || null : null; });
  CAMPOS_ENTERO.forEach((campo) => { valores[campo] = entero(fila[campo]); });
  valores.stfecrea = convertirFechaSisged(fila.stfecrea);
  return valores;
};

const guardarTrazabilidad = async (cutEntrada, datos) => {
  const cut = texto(cutEntrada);
  const filas = (Array.isArray(datos) ? datos.flat() : [])
    .filter((fila) => fila && entero(fila.iddochij) !== null);

  const expediente = await Expediente.findOne({ where: { cut }, attributes: ['id'] });
  const idExpediente = expediente ? expediente.id : null;

  for (const fila of filas) {
    await DocumentoSisged.upsert({
      ...mapearFila(fila),
      cut,
      id_expediente: idExpediente,
    });
  }

  return filas.length;
};

const listarTrazabilidad = (cutEntrada) =>
  DocumentoSisged.findAll({
    where: { cut: texto(cutEntrada) },
    order: [['stfecrea', 'DESC'], ['id', 'ASC']],
  });

module.exports = { guardarTrazabilidad, listarTrazabilidad };

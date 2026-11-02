require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { convertirFechaSisged } = require('../utils/fechas');

const textoMayuscula = (valor) => (valor === undefined || valor === null || valor === '' ? null : String(valor).trim().toUpperCase());

const POSTMAN_API_KEY = process.env.POSTMAN_API_KEY;
const SISGED_BASE_URL = 'https://sisgedpiloto.ana.gob.pe/apiRestSG/api/SISGED';

// Cache de token con TTL de 25 minutos
let tokenCache = { token: null, expiresAt: null };

async function obtenerToken() {
  // Verificar si el token está en cache y sigue siendo válido
  if (tokenCache.token && tokenCache.expiresAt && Date.now() < tokenCache.expiresAt) {
    console.log('[SERVICE] ✅ Token obtenido del cache');
    return tokenCache.token;
  }

  // Intentar obtener token de BD primero
  try {
    const SisgedToken = require('../models/SisgedToken');
    const ahora = new Date();

    const tokenBD = await SisgedToken.findOne({
      where: {
        activo: true,
        fecha_vencimiento: {
          [require('sequelize').Op.gte]: ahora
        }
      },
      order: [['fecha_creacion', 'DESC']]
    });

    if (tokenBD) {
      console.log('[SERVICE] ✅ Token obtenido de BD (vencimiento:', tokenBD.fecha_vencimiento, ')');
      // Cachear el token de BD también
      tokenCache.token = tokenBD.token;
      tokenCache.expiresAt = Date.now() + (25 * 60 * 1000);
      return tokenBD.token;
    }
  } catch (error) {
    console.log('[SERVICE] No se pudo obtener token de BD:', error.message);
  }

  console.log('[SERVICE] 🔄 Obteniendo token desde Postman...');
  console.log('[SERVICE] Obteniendo token de Postman...');

  if (!POSTMAN_API_KEY) {
    throw new Error('POSTMAN_API_KEY no configurada en .env');
  }

  try {
    const collectionsRes = await fetch('https://api.getpostman.com/collections', {
      headers: { 'X-API-Key': POSTMAN_API_KEY }
    });

    if (!collectionsRes.ok) {
      throw new Error(`Error obteniendo colecciones: ${collectionsRes.status}`);
    }

    const collectionsData = await collectionsRes.json();
    const sisgedCollection = collectionsData.collections.find(c =>
      c.name.toLowerCase().includes('sisged')
    );

    if (!sisgedCollection) {
      throw new Error('Colección SISGED no encontrada');
    }

    const collectionRes = await fetch(
      `https://api.getpostman.com/collections/${sisgedCollection.uid}`,
      { headers: { 'X-API-Key': POSTMAN_API_KEY } }
    );

    const collectionDetails = await collectionRes.json();
    const sisgedRequest = collectionDetails.collection.item.find(item =>
      item.name.toLowerCase().includes('sisged') || item.name.toLowerCase().includes('general')
    );

    if (!sisgedRequest) {
      throw new Error('Petición SISGED no encontrada');
    }

    let token = null;
    if (sisgedRequest.request.header) {
      const authHeader = sisgedRequest.request.header.find(h =>
        h.key === 'Authorization' || h.key === 'authorization'
      );
      if (authHeader?.value) {
        token = authHeader.value.replace('Bearer ', '');
      }
    }

    if (!token) {
      throw new Error('Token no encontrado en la petición');
    }

    // Guardar token en cache con TTL de 25 minutos
    tokenCache.token = token;
    tokenCache.expiresAt = Date.now() + (25 * 60 * 1000);

    console.log('[SERVICE] Token obtenido y cacheado ✅');
    return token;

  } catch (error) {
    throw new Error(`Error obteniendo token: ${error.message}`);
  }
}

async function obtenerDatosDeSISGED(endpoint = 'general', params = {}, tokenPreferido = null) {
  console.log('[SERVICE] obtenerDatosDeSISGED iniciado - endpoint:', endpoint, '| type:', typeof endpoint);

  try {
    let token;

    if (tokenPreferido) {
      token = tokenPreferido;
      console.log('[SERVICE] Usando token proporcionado');
    } else {
      token = await obtenerToken();
    }

    let url, method = 'GET';

    console.log('[SERVICE] Evaluando endpoint:', endpoint);

    if (endpoint === 'trazabilidad') {
      console.log('[SERVICE] Rama: trazabilidad');
      const queryParams = new URLSearchParams({
        NRO_CUT: params.NRO_CUT || '',
        ID_OFICINA: params.ID_OFICINA || '92',
        ID_USUARIO: params.ID_USUARIO || '860',
        ID_PERFIL: params.ID_PERFIL || '16',
        FLG_ANULADO: params.FLG_ANULADO || '1'
      });
      url = `${SISGED_BASE_URL}/trazabilidad?${queryParams.toString()}`;
    } else if (endpoint === 'movimientos') {
      console.log('[SERVICE] Rama: movimientos');
      url = 'https://sisged.ana.gob.pe/SISGED/Firma/DocumentoMovimiento/DocumentoMovimiento_Listar';
      method = 'POST';
    } else if (endpoint === 'archivo') {
      console.log('[SERVICE] Rama: archivo');
      url = `https://sisged.ana.gob.pe/SISGED/Firma/Archivo/ArchivoVer?ID_DOCUMENTO=${params.ID_DOCUMENTO || 0}&ID_USUARIO=${params.ID_USUARIO || 1}&ID_OFICINA=${params.ID_OFICINA || 1}&ID_PERFIL=${params.ID_PERFIL || 1}&FLG_TIPO=${params.FLG_TIPO || 1}&FLG_FIRMA=${params.FLG_FIRMA || 1}&CODIGO_ADJUNTO=${params.CODIGO_ADJUNTO || '-'}`;
    } else {
      console.log('[SERVICE] Rama: general (default)');
      const queryParams = new URLSearchParams({
        CUT_MIDAGRI: params.CUT_MIDAGRI || '',
        NRO_DOCUMENTO: params.NRO_DOCUMENTO || '',
        ASUNTO: params.ASUNTO || '',
        ID_TIPO_DOCUMENTO: params.ID_TIPO_DOCUMENTO || '0',
        ID_ESTADO_DOCUMENTO: params.ID_ESTADO_DOCUMENTO || '0',
        ID_OFICINA: params.ID_OFICINA || '0',
        ID_USUARIO: params.ID_USUARIO || '0',
        FEC_INICIO: params.FEC_INICIO || '',
        FEC_FIN: params.FEC_FIN || '',
        NRO_CUT: params.NRO_CUT || '',
        NRO_TICKET: params.NRO_TICKET || '',
        REFERENCIA: params.REFERENCIA || '',
        DESTINOS: params.DESTINOS || '',
        USUARIO_REMITENTE: params.USUARIO_REMITENTE || '',
        ID_TUPA_REQUISITO: params.ID_TUPA_REQUISITO || '0',
        ID_TUPA: params.ID_TUPA || '0',
        NRO_EXPEDIENTE: params.NRO_EXPEDIENTE || '',
        ID_TIPO_PERSONA: params.ID_TIPO_PERSONA || '0',
        NRO_DOC_PERSONA: params.NRO_DOC_PERSONA || '',
        FLG_BORRADOR: params.FLG_BORRADOR || '0',
        FLG_ANEXO: params.FLG_ANEXO || '0'
      });
      url = `${SISGED_BASE_URL}/general?${queryParams.toString()}`;
    }

    console.log('[SERVICE] URL:', url.substring(0, 100) + '...');

    let requestOptions = {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': endpoint === 'archivo' ? 'application/pdf, application/octet-stream' : 'application/json'
      }
    };

    if (endpoint === 'movimientos') {
      requestOptions.headers['Content-Type'] = 'application/x-www-form-urlencoded';
      requestOptions.body = `ID_DOCUMENTO=${params.ID_DOCUMENTO || 0}`;
    }

    const response = await fetch(url, requestOptions);

    console.log('[SERVICE] Response status:', response.status);

    if (!response.ok) {
      throw new Error(`SISGED respondió con error: ${response.status}`);
    }

    if (endpoint === 'archivo') {
      const html = await response.text();

      // Buscar cualquier URL de repositoriosisged
      const urlRegex = /https:\/\/repositoriosisged\.ana\.gob\.pe\/Temporales\/[^\s'"<>]+\.pdf/;
      const pdfUrlMatch = html.match(urlRegex);

      if (pdfUrlMatch) {
        const pdfUrl = pdfUrlMatch[0];
        console.log('[SERVICE] URL PDF extraída:', pdfUrl);
        return { pdfUrl };
      }

      console.error('[SERVICE] No se encontró URL. HTML completo:', html);
      throw new Error('No se encontró URL del PDF en la respuesta');
    }

    const data = await response.json();

    if (endpoint === 'movimientos') {
      if (!data.OBJETO || !Array.isArray(data.OBJETO)) {
        throw new Error('Formato de respuesta Movimientos no válido');
      }
      console.log('[SERVICE] Movimientos obtenidos:', data.OBJETO.length, 'registros');
      return data.OBJETO;
    }

    if (!data.data || !Array.isArray(data.data)) {
      throw new Error('Formato de respuesta SISGED no válido');
    }

    console.log('[SERVICE] Datos obtenidos:', data.data.length, 'registros');
    return data.data;

  } catch (error) {
    console.error('[SERVICE] Error:', error.message);
    throw error;
  }
}

async function importarExpedientesABD(datosEntrada, models, idUsuario = 1) {
  const datos = Array.isArray(datosEntrada) ? datosEntrada.flat() : [];
  if (datos.length === 0) {
    return { exitosos: 0, errores: 0, total: 0 };
  }

  if (!models || !models.Expediente) {
    throw new Error('Expediente model not available');
  }

  let exitosos = 0;
  let errores = 0;
  const erroresList = [];

  for (let i = 0; i < datos.length; i++) {
    try {
      const item = datos[i];
      const cut = item.ncut || item.CUT || `EXP-${i}`;

      const [expediente, created] = await models.Expediente.findOrCreate({
        where: { cut },
        defaults: {
          idoc: item.idoc,
          cut,
          origen: textoMayuscula(item.origen),
          destip: textoMayuscula(item.destip),
          estupa: textoMayuscula(item.estupa),
          proced: textoMayuscula(item.proced),
          asunto: textoMayuscula(item.asunto),
          refe: textoMayuscula(item.refe),
          fol: item.fol,
          flgcut: item.flgcut,
          destinos: textoMayuscula(item.destinos),
          ndoc: textoMayuscula(item.ndoc),
          feccrea: convertirFechaSisged(item.feccrea),
          solfec: convertirFechaSisged(item.solfec),
          solhor: item.solhor || null,
          usurem: textoMayuscula(item.usurem),
          ofirem: textoMayuscula(item.ofirem),
          flgarc: item.flgarc,
          tema: textoMayuscula(item.tema),
          estado: true,
          id_usuario_creador: idUsuario,
          id_usuario_modificador: idUsuario,
        }
      });

      await models.Expediente.vincularAsignaciones(expediente);
      exitosos++;
      console.log(`[IMPORT] ${i + 1}/${datos.length}: ${cut} - ${created ? 'CREADO' : 'EXISTENTE'}`);
    } catch (err) {
      errores++;
      erroresList.push({ index: i, error: err.message });
      console.error(`[IMPORT] Error en registro ${i + 1}:`, err.message);
    }
  }

  return { exitosos, errores, total: datos.length, erroresList };
}

function limpiarCacheToken() {
  tokenCache = { token: null, expiresAt: null };
  console.log('[SERVICE] Cache de token limpiado');
}

// Documentos creados en SISGED (reporte "Documento Creado"), con los mismos criterios del reporte de SISGED.
const SISGED_DOCUMENTOS_CREADOS_URL = 'https://sisged.ana.gob.pe/SISGED/Reporte/Reporte/DocumentoCreado_Listar';
const USUARIO_REPORTE_SISGED = 860;
const PERFIL_REPORTE_SISGED = 16;
const OFICINA_POR_DEFECTO = 92;

// "2026-10-01" -> "01/10/2026"
const fechaParaSisged = (fecha) => {
  const [anio, mes, dia] = String(fecha).split('-');
  return `${dia}/${mes}/${anio}`;
};

const construirGridDocumentosCreados = ({ desde, hasta, tipo, oficina, filas, pagina = 1 }) => {
  const ofi = oficina || OFICINA_POR_DEFECTO;
  const inicio = fechaParaSisged(desde);
  const fin = fechaParaSisged(hasta);
  const reglas = [
    { field: 'UPPER(NRO_DOCUMENTO)', data: "'%' + '' + '%'", op: ' LIKE ' },
    { field: 'UPPER(NRO_CUT)', data: "'%' + '' + '%'", op: ' LIKE ' },
    { field: 'UPPER(ASUNTO)', data: "'%' + '' + '%'", op: ' LIKE ' },
  ];
  if (tipo) {
    reglas.push({ field: 'ID_TIPO_DOCUMENTO', data: `  ISNULL('${tipo}',ID_TIPO_DOCUMENTO) `, op: ' = ' });
  }
  reglas.push(
    { field: 'V.FLG_ORIGEN', data: "'I'", op: ' = ' },
    {
      field: '((V.ID_OFICINA_PROYECTADO ',
      data: `${ofi} AND V.ID_PERFIL_PROYECTADO IN (16,17))OR (V.ID_OFICINA = ${ofi} AND V.FLG_PROYECTADO = 0 AND V.ID_PERFIL IN (16,17))) `,
      op: ' = ',
    },
    { field: 'V.FLG_CORRELATIVO', data: 1, op: ' = ' },
    { field: 'ID_ESTADO_DOCUMENTO', data: 1, op: ' != ' },
    {
      field: '((CONVERT(DATE,FEC_CREACION, 103)',
      data: `  ISNULL(CONVERT(DATE,'${inicio}', 103), CONVERT(DATE,FEC_CREACION, 103)) AND ISNULL(CONVERT(DATE,'${fin}', 103), CONVERT(DATE,FEC_CREACION, 103)) ) OR (CONVERT(DATE,FEC_FIRMA, 103) BETWEEN  ISNULL(CONVERT(DATE,'${inicio}', 103), CONVERT(DATE,FEC_FIRMA, 103)) AND ISNULL(CONVERT(DATE,'${fin}', 103), CONVERT(DATE,FEC_FIRMA, 103)) ))  `,
      op: ' BETWEEN ',
    }
  );
  return {
    grid: {
      page: pagina,
      rows: String(filas),
      sidx: 'CORRELATIVO_DOCUMENTO',
      sord: 'desc',
      _search: false,
      filters: '',
      Rules: reglas,
      usu: String(USUARIO_REPORTE_SISGED),
      ofi: String(ofi),
      perfil: String(PERFIL_REPORTE_SISGED),
    },
  };
};

// Una página del reporte "Documento Creado" de SISGED.
async function pedirPaginaDocumentosCreados(token, parametros) {
  const response = await fetch(SISGED_DOCUMENTOS_CREADOS_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(construirGridDocumentosCreados(parametros)),
  });
  if (!response.ok) {
    // SISGED responde 404 o 401 cuando el token venció: se pide uno vigente en Admin Tokens SISGED.
    if ([401, 403, 404].includes(response.status)) {
      throw new Error('El token de SISGED está vencido o no es válido. Agregue un token vigente en Admin Tokens SISGED.');
    }
    throw new Error(`SISGED respondió con error: ${response.status}`);
  }
  const data = await response.json();
  if (!data || !Array.isArray(data.rows)) {
    throw new Error('Formato de respuesta de documentos creados no válido');
  }
  return data;
}

// Columnas del reporte: [1] id, [2] Nro CUT, [5] N° documento, [6] asunto, [7] referencia,
// [8] destinos, [9] fecha de creación, [10] tipo, [11] estado.
const filaDocumentoCreado = (fila) => {
  const c = fila.cell || [];
  return {
    id: fila.id,
    cut: c[2] || '',
    documento: c[5] || '',
    asunto: c[6] || '',
    referencia: c[7] || '',
    destinos: String(c[8] || '').replace(/\r/g, '').trim(),
    fecha_creacion: c[9] || '',
    tipo: c[10] || '',
    estado: c[11] || '',
  };
};

// Todas las filas del rango: pide página por página (de `filas` en `filas`) hasta completar el total de SISGED.
const MAX_PAGINAS_DOCUMENTOS_CREADOS = 200;
async function obtenerDocumentosCreados({ desde, hasta, tipo = '', oficina = '', filas = 15 } = {}) {
  const token = await obtenerToken();
  const lista = [];
  let total = 0;
  for (let pagina = 1; pagina <= MAX_PAGINAS_DOCUMENTOS_CREADOS; pagina++) {
    const data = await pedirPaginaDocumentosCreados(token, { desde, hasta, tipo, oficina, filas, pagina });
    total = Number(data.records) || 0;
    const paginaFilas = data.rows.map(filaDocumentoCreado);
    lista.push(...paginaFilas);
    if (paginaFilas.length === 0 || lista.length >= total) break;
  }
  return { total: total || lista.length, filas: lista };
}

module.exports = {
  obtenerDatosDeSISGED,
  obtenerDocumentosCreados,
  importarExpedientesABD,
  obtenerToken,
  limpiarCacheToken
};

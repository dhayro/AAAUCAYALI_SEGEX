const SISGED_BASE_URL = 'https://sisgedpiloto.ana.gob.pe/apiRestSG/api/SISGED';
const sisgedSyncService = require('../services/sisgedSyncService');

const fetchWithTimeout = (url, options = {}, timeout = 30000) => {
  return Promise.race([
    fetch(url, options),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), timeout)
    )
  ]);
};

exports.proxyRequest = async (req, res) => {
  let token;
  try {
    token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Token requerido en Authorization header' });
    }

    let url;
    try {
      url = req.body?.url || req.body?.[0]?.url;
    } catch (e) {
      url = null;
    }

    if (!url) {
      return res.status(400).json({ error: 'URL requerida en body como { "url": "..." }' });
    }

    console.log(`[PROXY] Request a: ${url.substring(0, 80)}...`);

    const response = await fetchWithTimeout(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'Node.js',
      },
    }, 30000);

    console.log(`[PROXY] Status: ${response.status}`);

    let data;
    try {
      data = await response.json();
    } catch (e) {
      data = await response.text();
    }

    return res.status(response.status).json({
      success: response.ok,
      statusCode: response.status,
      data,
    });
  } catch (error) {
    console.error('[PROXY] Error:', error.message);
    return res.status(502).json({
      success: false,
      error: error.message || 'Error al conectar con SISGED',
      statusCode: 502,
    });
  }
};

exports.getTestData = async (req, res) => {
  try {
    const mockData = {
      success: true,
      statusCode: 200,
      data: [
        {
          idoc: 1,
          ncut: '187610-2026',
          asunto: 'Solicitud de información sobre proyectos',
          proced: 'SOLICITUD',
          ndoc: 'DOC-001-2026',
          usurem: 'aliaga romayna',
          ofirem: 'ANA',
          estupa: 'NO TUPA',
        },
        {
          idoc: 2,
          ncut: '187611-2026',
          asunto: 'Consulta sobre permisos',
          proced: 'CONSULTA',
          ndoc: 'DOC-002-2026',
          usurem: 'juan perez',
          ofirem: 'ANA',
          estupa: 'TUPA',
        },
      ],
    };

    res.status(200).json(mockData);
  } catch (error) {
    console.error('[TEST] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

exports.getGeneral = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Token requerido' });
    }

    const params = new URLSearchParams();
    params.append('CUT_MIDAGRI', req.query.CUT_MIDAGRI || '');
    params.append('NRO_DOCUMENTO', req.query.NRO_DOCUMENTO || '');
    params.append('ASUNTO', req.query.ASUNTO || '');
    params.append('ID_TIPO_DOCUMENTO', req.query.ID_TIPO_DOCUMENTO || '0');
    params.append('ID_ESTADO_DOCUMENTO', req.query.ID_ESTADO_DOCUMENTO || '0');
    params.append('ID_OFICINA', req.query.ID_OFICINA || '0');
    params.append('ID_USUARIO', req.query.ID_USUARIO || '0');
    params.append('FEC_INICIO', req.query.FEC_INICIO || '');
    params.append('FEC_FIN', req.query.FEC_FIN || '');
    params.append('NRO_CUT', req.query.NRO_CUT || '');
    params.append('NRO_TICKET', req.query.NRO_TICKET || '');
    params.append('REFERENCIA', req.query.REFERENCIA || '');
    params.append('DESTINOS', req.query.DESTINOS || '');
    params.append('USUARIO_REMITENTE', req.query.USUARIO_REMITENTE || '');
    params.append('ID_TUPA_REQUISITO', req.query.ID_TUPA_REQUISITO || '0');
    params.append('ID_TUPA', req.query.ID_TUPA || '0');
    params.append('NRO_EXPEDIENTE', req.query.NRO_EXPEDIENTE || '');
    params.append('ID_TIPO_PERSONA', req.query.ID_TIPO_PERSONA || '0');
    params.append('NRO_DOC_PERSONA', req.query.NRO_DOC_PERSONA || '');
    params.append('FLG_BORRADOR', req.query.FLG_BORRADOR || '0');
    params.append('FLG_ANEXO', req.query.FLG_ANEXO || '0');

    const url = `${SISGED_BASE_URL}/general?${params.toString()}`;
    console.log(`[GENERAL] Fetching: ${url.substring(0, 100)}...`);

    const response = await fetchWithTimeout(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'Node.js',
      },
    }, 30000);

    console.log(`[GENERAL] Status: ${response.status}`);

    let data;
    try {
      data = await response.json();
    } catch (e) {
      data = await response.text();
    }

    return res.status(response.status).json({
      success: response.ok,
      statusCode: response.status,
      data,
    });
  } catch (error) {
    console.error('[GENERAL] Error:', error.message);
    return res.status(502).json({
      success: false,
      error: error.message || 'Error al conectar con SISGED',
      statusCode: 502,
    });
  }
};

exports.getTrazabilidad = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Token requerido' });
    }

    const params = new URLSearchParams();
    params.append('NRO_CUT', req.query.NRO_CUT || '');
    params.append('ID_OFICINA', req.query.ID_OFICINA || '92');
    params.append('ID_USUARIO', req.query.ID_USUARIO || '860');
    params.append('ID_PERFIL', req.query.ID_PERFIL || '16');
    params.append('FLG_ANULADO', req.query.FLG_ANULADO || '1');

    const url = `${SISGED_BASE_URL}/trazabilidad?${params.toString()}`;

    const response = await fetchWithTimeout(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'Node.js',
      },
    }, 30000);

    let data;
    try {
      data = await response.json();
    } catch (e) {
      data = await response.text();
    }

    return res.status(response.status).json({
      success: response.ok,
      statusCode: response.status,
      data,
    });
  } catch (error) {
    console.error('[TRAZABILIDAD] Error:', error.message);
    return res.status(502).json({
      success: false,
      error: error.message || 'Error al conectar con SISGED',
      statusCode: 502,
    });
  }
};

exports.sincronizar = async (req, res) => {
  try {
    console.log('[SINCRONIZAR] Iniciando sincronización...');

    // Obtener datos de SISGED
    const datos = await sisgedSyncService.obtenerDatosDeSISGED();

    if (!datos || datos.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No se obtuvieron datos de SISGED',
        data: []
      });
    }

    console.log(`[SINCRONIZAR] ${datos.length} registros obtenidos de SISGED`);

    // Importar a la BD
    const { Expediente } = req.app.get('models');
    const resultado = await sisgedSyncService.importarExpedientesABD(datos, { Expediente });

    res.status(200).json({
      success: true,
      message: 'Sincronización completada',
      resultado,
      datos: datos.slice(0, 5) // Primeros 5 registros como preview
    });
  } catch (error) {
    console.error('[SINCRONIZAR] Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

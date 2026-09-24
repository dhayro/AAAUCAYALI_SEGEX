const SISGED_BASE_URL = 'https://sisgedpiloto.ana.gob.pe/apiRestSG/api/SISGED';

exports.proxyRequest = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Token requerido en Authorization header' });
    }

    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL requerida en body' });
    }

    console.log(`[SISGED] Proxy request a: ${url.substring(0, 100)}...`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Accept-Language': 'es-ES,es;q=0.9',
        'Authorization': `Bearer ${token}`,
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    console.log(`[SISGED] Response status: ${response.status}`);

    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      const text = await response.text();
      data = { rawResponse: text.substring(0, 500) };
    }

    return res.status(response.status).json({
      success: response.ok,
      statusCode: response.status,
      data,
      contentType: response.headers.get('content-type'),
    });
  } catch (error) {
    console.error('[SISGED] Proxy error:', error.message);
    return res.status(500).json({
      error: error.message,
      type: error.name,
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
          id: 1,
          nroCut: '187610-2026',
          asunto: 'Solicitud de información sobre proyectos',
          remitente: 'aliaga romayna',
          numeroDocumento: 'DOC-001-2026',
          estado: 'En trámite',
          fechaIngreso: '2026-09-01',
        },
        {
          id: 2,
          nroCut: '187611-2026',
          asunto: 'Consulta sobre permisos',
          remitente: 'juan perez',
          numeroDocumento: 'DOC-002-2026',
          estado: 'En trámite',
          fechaIngreso: '2026-09-15',
        },
        {
          id: 3,
          nroCut: '187612-2026',
          asunto: 'Documentación requerida',
          remitente: 'maria garcia',
          numeroDocumento: 'DOC-003-2026',
          estado: 'Pendiente',
          fechaIngreso: '2026-09-20',
        },
      ],
      contentType: 'application/json',
      timestamp: new Date().toISOString(),
      note: 'This is test/mock data for development purposes',
    };

    res.status(200).json(mockData);
  } catch (error) {
    console.error('[SISGED] getTestData error:', error.message);
    res.status(500).json({
      error: error.message,
      type: error.name,
      timestamp: new Date().toISOString(),
    });
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
    console.log(`[SISGED] Fetching general: ${url.substring(0, 100)}...`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Accept-Language': 'es-ES,es;q=0.9',
        'Authorization': `Bearer ${token}`,
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    console.log(`[SISGED] Response status: ${response.status}`);

    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      console.error('[SISGED] JSON parse error:', parseError.message);
      const text = await response.text();
      data = { rawResponse: text.substring(0, 200) };
    }

    return res.status(response.status).json({
      success: response.ok,
      statusCode: response.status,
      data,
      contentType: response.headers.get('content-type'),
    });
  } catch (error) {
    console.error('[SISGED] getGeneral error:', error.message);
    return res.status(500).json({
      error: error.message,
      type: error.name,
      timestamp: new Date().toISOString(),
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
    console.log(`[SISGED] Fetching trazabilidad: ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Accept-Language': 'es-ES,es;q=0.9',
        'Authorization': `Bearer ${token}`,
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    console.log(`[SISGED] Response status: ${response.status}`);

    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      console.error('[SISGED] JSON parse error:', parseError.message);
      const text = await response.text();
      data = { rawResponse: text.substring(0, 200) };
    }

    return res.status(response.status).json({
      success: response.ok,
      statusCode: response.status,
      data,
      contentType: response.headers.get('content-type'),
    });
  } catch (error) {
    console.error('[SISGED] getTrazabilidad error:', error.message);
    return res.status(500).json({
      error: error.message,
      type: error.name,
      timestamp: new Date().toISOString(),
    });
  }
};

const SISGED_BASE_URL = 'https://sisgedpiloto.ana.gob.pe/apiRestSG/api/SISGED';

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

    const data = await response.json();

    res.status(response.status).json({
      success: response.ok,
      statusCode: response.status,
      data,
      contentType: response.headers.get('content-type'),
    });
  } catch (error) {
    console.error('SISGED getGeneral error:', error);
    res.status(500).json({
      error: error.message,
      type: error.name,
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

    const data = await response.json();

    res.status(response.status).json({
      success: response.ok,
      statusCode: response.status,
      data,
      contentType: response.headers.get('content-type'),
    });
  } catch (error) {
    console.error('SISGED getTrazabilidad error:', error);
    res.status(500).json({
      error: error.message,
      type: error.name,
    });
  }
};

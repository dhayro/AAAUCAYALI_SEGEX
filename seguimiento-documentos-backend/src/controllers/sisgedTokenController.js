const SisgedToken = require('../models/SisgedToken');

const expiracionDelJwt = (token) => {
  try {
    const partes = String(token).trim().split('.');
    if (partes.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(partes[1], 'base64url').toString('utf8'));
    return payload.exp ? new Date(payload.exp * 1000) : null;
  } catch {
    return null;
  }
};

exports.obtenerTokensActivos = async (req, res) => {
  try {
    const tokens = await SisgedToken.findAll({
      where: { activo: true },
      order: [['fecha_creacion', 'DESC']],
      attributes: ['id', 'fecha_vencimiento', 'dias_validez', 'notas', 'fecha_creacion']
    });

    res.status(200).json({
      success: true,
      total: tokens.length,
      data: tokens
    });
  } catch (error) {
    console.error('[TOKEN] Error obteniendo tokens:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

exports.agregarToken = async (req, res) => {
  console.log('[TOKEN] POST /agregar-token recibido');

  try {
    const { token, fecha_vencimiento, dias_validez, notas } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token es requerido'
      });
    }

    const vencimiento = expiracionDelJwt(token) || (fecha_vencimiento ? new Date(fecha_vencimiento) : null);
    if (!vencimiento || isNaN(vencimiento)) {
      return res.status(400).json({
        success: false,
        error: 'No se pudo determinar la fecha de vencimiento del token'
      });
    }

    // Desactivar tokens anteriores
    await SisgedToken.update(
      { activo: false },
      { where: { activo: true } }
    );

    // Crear nuevo token
    const nuevoToken = await SisgedToken.create({
      token,
      fecha_vencimiento: vencimiento,
      dias_validez: dias_validez || 30,
      activo: true,
      notas: notas || 'Token agregado manualmente'
    });

    console.log('[TOKEN] ✅ Token agregado:', nuevoToken.id);

    res.status(201).json({
      success: true,
      message: 'Token agregado correctamente',
      data: {
        id: nuevoToken.id,
        fecha_creacion: nuevoToken.fecha_creacion,
        fecha_vencimiento: nuevoToken.fecha_vencimiento,
        dias_validez: nuevoToken.dias_validez
      }
    });
  } catch (error) {
    console.error('[TOKEN] Error agregando token:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

exports.obtenerUltimoTokenActivo = async (req, res) => {
  try {
    const ahora = new Date();

    const token = await SisgedToken.findOne({
      where: {
        activo: true,
        fecha_vencimiento: {
          [require('sequelize').Op.gte]: ahora
        }
      },
      order: [['fecha_creacion', 'DESC']]
    });

    if (!token) {
      return res.status(404).json({
        success: false,
        error: 'No hay tokens activos o todos están vencidos'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        token: token.token,
        fecha_vencimiento: token.fecha_vencimiento,
        dias_valido: Math.ceil((token.fecha_vencimiento - ahora) / (1000 * 60 * 60 * 24))
      }
    });
  } catch (error) {
    console.error('[TOKEN] Error obteniendo último token:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

exports.desactivarToken = async (req, res) => {
  try {
    const { id } = req.params;

    await SisgedToken.update(
      { activo: false },
      { where: { id } }
    );

    res.status(200).json({
      success: true,
      message: 'Token desactivado'
    });
  } catch (error) {
    console.error('[TOKEN] Error desactivando token:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

exports.obtenerHistorialTokens = async (req, res) => {
  try {
    const tokens = await SisgedToken.findAll({
      order: [['fecha_creacion', 'DESC']],
      limit: 20,
      attributes: ['id', 'fecha_vencimiento', 'dias_validez', 'activo', 'notas', 'fecha_creacion']
    });

    res.status(200).json({
      success: true,
      total: tokens.length,
      data: tokens
    });
  } catch (error) {
    console.error('[TOKEN] Error obteniendo historial:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

exports.verificarTokenActual = async (req, res) => {
  try {
    const ahora = new Date();

    // Buscar token de BD
    const tokenBD = await SisgedToken.findOne({
      where: {
        activo: true,
        fecha_vencimiento: {
          [require('sequelize').Op.gte]: ahora
        }
      },
      order: [['fecha_creacion', 'DESC']],
      attributes: ['id', 'fecha_vencimiento', 'notas', 'fecha_creacion', 'token']
    });

    let diasValido = null;
    if (tokenBD) {
      const fechaVencimiento = new Date(tokenBD.fecha_vencimiento);
      diasValido = Math.ceil((fechaVencimiento - ahora) / (1000 * 60 * 60 * 24));
    }

    res.status(200).json({
      success: true,
      usando_token_de: tokenBD ? '✅ BASE DE DATOS' : '🔄 POSTMAN (Fallback)',
      token_actual: tokenBD ? {
        id: tokenBD.id,
        token: tokenBD.token.substring(0, 50) + '...',
        fecha_vencimiento: tokenBD.fecha_vencimiento,
        dias_valido: diasValido,
        horas_valido: tokenBD ? Math.ceil((new Date(tokenBD.fecha_vencimiento) - ahora) / (1000 * 60 * 60)) : null,
        notas: tokenBD.notas,
        creado: tokenBD.fecha_creacion
      } : null,
      fecha_actual: ahora
    });
  } catch (error) {
    console.error('[TOKEN] Error verificando token:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

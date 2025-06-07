const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');

exports.authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.status(401).json({ mensaje: 'Token de autenticación no proporcionado' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ mensaje: 'Token inválido o expirado' });
    req.user = user;
    next();
  });
};


exports.isAdmin = (req, res, next) => {
  if (req.user.perfil !== 'admin') {
    return res.status(403).json({ mensaje: 'Acceso restringido solo para administradores' });
  }
  next();
};

exports.isJefeOrAdmin = (req, res, next) => {
  if (req.user.perfil !== 'jefe' && req.user.perfil !== 'admin') {
    return res.status(403).json({ mensaje: 'Acceso restringido solo para jefes o administradores' });
  }
  next();
};

exports.isSecretariaOrAbove = (req, res, next) => {
  const allowedRoles = ['admin', 'jefe', 'secretaria'];
  if (!allowedRoles.includes(req.user.perfil)) {
    return res.status(403).json({ mensaje: 'Acceso restringido' });
  }
  next();
};

exports.checkAreaAccess = async (req, res, next) => {
  try {
    const usuario = await Usuario.findByPk(req.user.id);
    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    // Si es admin, tiene acceso a todas las áreas
    if (usuario.perfil === 'admin') {
      return next();
    }

    // Verificar si el usuario tiene acceso al área específica
    // Esto asume que tienes un parámetro de área en tu ruta o query
    const areaId = req.params.areaId || req.query.areaId;
    if (areaId && usuario.id_area !== parseInt(areaId)) {
      return res.status(403).json({ mensaje: 'No tienes acceso a esta área' });
    }

    next();
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al verificar acceso al área' });
  }
};
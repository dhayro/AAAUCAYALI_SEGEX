const jwt = require('jsonwebtoken');

exports.verifyToken = (req, res) => {
  const token = req.headers['authorization'];

  if (!token) {
    return res.status(403).json({ message: 'No token provided' });
  }

  jwt.verify(token.split(' ')[1], process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    res.json({ 
      message: 'Token is valid',
      user: {
        id: decoded.id,
        perfil: decoded.perfil,
        nombre: decoded.nombre,
        apellido: decoded.apellido,
        email: decoded.email
      }
    });
  });
};
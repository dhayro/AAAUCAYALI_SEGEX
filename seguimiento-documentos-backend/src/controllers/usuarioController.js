const Usuario = require('../models/Usuario');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.obtenerTodosLosUsuarios = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { count, rows } = await Usuario.findAndCountAll({
      limit: limit,
      offset: offset,
      order: [['id', 'ASC']],
      attributes: { exclude: ['password'] } // Excluimos la contraseña de los resultados
    });

    res.json({
      usuarios: rows,
      totalUsuarios: count,
      totalPaginas: Math.ceil(count / limit),
      paginaActual: page
    });
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

exports.obtenerUsuarioPorId = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id);
    if (usuario) {
      res.json(usuario);
    } else {
      res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

exports.crearUsuario = async (req, res) => {
  try {
    const { password, ...otrosDatos } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const nuevoUsuario = await Usuario.create({
      ...otrosDatos,
      password: hashedPassword
    });
    
    // Omitimos la contraseña en la respuesta
    const { password: _, ...usuarioSinPassword } = nuevoUsuario.toJSON();
    res.status(201).json(usuarioSinPassword);
  } catch (error) {
    res.status(400).json({ mensaje: error.message });
  }
};

exports.actualizarUsuario = async (req, res) => {
  try {
    const actualizado = await Usuario.update(req.body, {
      where: { id: req.params.id }
    });
    if (actualizado[0] === 1) {
      res.json({ mensaje: 'Usuario actualizado exitosamente' });
    } else {
      res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }
  } catch (error) {
    res.status(400).json({ mensaje: error.message });
  }
};

exports.eliminarUsuario = async (req, res) => {
  try {
    const eliminado = await Usuario.destroy({
      where: { id: req.params.id }
    });
    if (eliminado) {
      res.json({ mensaje: 'Usuario eliminado exitosamente' });
    } else {
      res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

exports.registrarUsuario = async (req, res) => {
  try {
    const { 
      usuario, 
      password, 
      email, 
      nombre, 
      apellido, 
      dni, 
      id_cargo, 
      id_area, 
      perfil, 
      telefono, 
      direccion, 
      fecha_nacimiento 
    } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const nuevoUsuario = await Usuario.create({
      usuario,
      password: hashedPassword,
      email,
      nombre,
      apellido,
      dni,
      id_cargo,
      id_area,
      perfil: perfil || 'personal', // Valor por defecto si no se proporciona
      telefono,
      direccion,
      fecha_nacimiento,
      estado: true // Por defecto, el usuario se crea activo
    });

    res.status(201).json({ 
      mensaje: 'Usuario registrado exitosamente', 
      id: nuevoUsuario.id 
    });
  } catch (error) {
    res.status(400).json({ mensaje: error.message });
  }
};

exports.loginUsuario = async (req, res) => {
  try {
    const { usuario, password } = req.body;
    const user = await Usuario.findOne({ where: { usuario } });
    if (user && await bcrypt.compare(password, user.password)) {
      const token = jwt.sign(
        { 
          id: user.id, 
          perfil: user.perfil,
          nombre: user.nombre,
          apellido: user.apellido,
          email: user.email
        },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
      res.json({ 
        token, 
        id: user.id,
        perfil: user.perfil,
        nombre: user.nombre,
        apellido: user.apellido,
        email: user.email
      });
    } else {
      res.status(400).json({ mensaje: 'Usuario o contraseña incorrectos' });
    }
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};
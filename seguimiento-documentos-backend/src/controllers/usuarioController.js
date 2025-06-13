const Usuario = require('../models/Usuario');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize'); // Import Op from Sequelize
const Cargo = require('../models/Cargo');
const Area = require('../models/Area');

exports.obtenerTodosLosUsuarios = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { nombre, email, cargo, area, filtro } = req.query;

    // Build the where clause for filtering
    let whereClause = {};

    // Include Cargo and Area models for filtering by name
    const include = [
      {
        model: Cargo,
        attributes: [], // Exclude Cargo attributes from the result
      },
      {
        model: Area,
        attributes: [], // Exclude Area attributes from the result
      }
    ];

    if (filtro) {
      whereClause[Op.or] = [
        { nombre: { [Op.like]: `%${filtro}%` } },
        { email: { [Op.like]: `%${filtro}%` } },
        { '$Cargo.nombre$': { [Op.like]: `%${filtro}%` } },
        { '$Area.nombre$': { [Op.like]: `%${filtro}%` } }
      ];
    } else {
      if (nombre) {
        whereClause.nombre = { [Op.like]: `%${nombre}%` };
      }
      if (email) {
        whereClause.email = { [Op.like]: `%${email}%` };
      }
    }

    if (cargo) {
      include[0].where = { nombre: { [Op.like]: `%${cargo}%` } };
    }

    if (area) {
      include[1].where = { nombre: { [Op.like]: `%${area}%` } };
    }

    const { count, rows } = await Usuario.findAndCountAll({
      where: whereClause,
      include: include,
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

    // Set the default password
    const defaultPassword = 'Autoridad1';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

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

exports.actualizarContrasena = async (req, res) => {
  try {
    const { id } = req.params; // Get user ID from the request parameters
    const { currentPassword, newPassword } = req.body;

    const user = await Usuario.findByPk(id);
    if (!user) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ mensaje: 'Contraseña actual incorrecta' });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the password in the database
    await Usuario.update({ password: hashedPassword }, { where: { id } });

    res.json({ mensaje: 'Contraseña actualizada exitosamente' });
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { id } = req.params; // Get user ID from the request parameters

    const user = await Usuario.findByPk(id);
    if (!user) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    // Set the default password
    const defaultPassword = 'Autoridad1';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    // Update the password in the database
    await Usuario.update({ password: hashedPassword }, { where: { id } });

    res.json({ mensaje: 'Contraseña restablecida exitosamente' });
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

exports.verificarUsuarioExistente = async (req, res) => {
  try {
    const { usuario, email } = req.params; // Access path parameters

    let user = null;
    let mensaje = '';
    let tipo = ''; // To store whether it was found by 'usuario' or 'email'

    // Check if the user exists by username
    if (usuario) {
      user = await Usuario.findOne({ where: { usuario } });
      if (user) {
        mensaje = 'El nombre de usuario ya existe';
        tipo = 'usuario';
      }
    }

    // If not found by username, check by email
    if (!user && email) {
      user = await Usuario.findOne({ where: { email } });
      if (user) {
        mensaje = 'El correo electrónico ya existe';
        tipo = 'email';
      }
    }

    if (user) {
      res.json({ existe: true, mensaje, tipo });
    } else {
      res.json({ existe: false, mensaje: 'El usuario no existe' });
    }
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

exports.obtenerUsuariosParaSelect = async (req, res) => {
  try {
    // Obtener solo los campos necesarios para un select
    const usuarios = await Usuario.findAll({
      attributes: ['id', 'nombre', 'apellido', 'usuario', 'perfil'],
      include: [
        {
          model: Cargo,
          attributes: ['id', 'nombre']
        }
      ],
      where: { estado: true }, // Solo usuarios activos
      order: [['nombre', 'ASC']]
    });

    // Formatear los datos para un select (id y nombre completo)
    const usuariosFormateados = usuarios.map(usuario => ({
      id: usuario.id,
      nombre: `${usuario.nombre} ${usuario.apellido}`,
      usuario: usuario.usuario,
      perfil: usuario.perfil,
      cargo: usuario.Cargo ? usuario.Cargo.nombre : null
    }));

    res.json(usuariosFormateados);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

exports.obtenerUsuariosPorArea = async (req, res) => {
  try {
    const { areaId } = req.params;
    
    // Verificar si el área existe
    const area = await Area.findByPk(areaId);
    if (!area) {
      return res.status(404).json({ mensaje: 'Área no encontrada' });
    }

    // Obtener usuarios del área específica
    const usuarios = await Usuario.findAll({
      where: { 
        id_area: areaId,
        estado: true // Solo usuarios activos
      },
      attributes: ['id', 'nombre', 'apellido', 'usuario', 'perfil', 'email'],
      include: [
        {
          model: Cargo,
          attributes: ['id', 'nombre']
        }
      ],
      order: [['nombre', 'ASC']]
    });

    // Formatear los datos para un select
    const usuariosFormateados = usuarios.map(usuario => ({
      id: usuario.id,
      nombre: `${usuario.nombre} ${usuario.apellido}`,
      usuario: usuario.usuario,
      perfil: usuario.perfil,
      email: usuario.email,
      cargo: usuario.Cargo ? usuario.Cargo.nombre : null
    }));

    res.json(usuariosFormateados);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};
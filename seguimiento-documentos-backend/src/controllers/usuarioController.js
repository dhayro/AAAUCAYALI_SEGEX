const Usuario = require('../models/Usuario');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize'); // Import Op from Sequelize
const Cargo = require('../models/Cargo');
const Area = require('../models/Area');

const formatDateForAPI = (date) => {
  if (!date) return null;
  if (typeof date === 'string') return date;
  // Ensure we return YYYY-MM-DD format in Lima timezone
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const normalizeUsuarioData = (data) => {
  const normalized = { ...data };
  // Convert to uppercase and trim all string fields except usuario and password
  const fieldsToUppercase = ['email', 'nombre', 'apellido', 'dni', 'telefono', 'direccion', 'perfil'];
  fieldsToUppercase.forEach((field) => {
    if (normalized[field]) {
      normalized[field] = String(normalized[field]).trim().toUpperCase();
    }
  });
  return normalized;
};

const formatUsuarioResponse = (usuario) => {
  const data = usuario.toJSON();
  if (data.fecha_nacimiento) {
    data.fecha_nacimiento = formatDateForAPI(data.fecha_nacimiento);
  }
  return data;
};

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
        attributes: ['id', 'nombre'], // Include Cargo name
      },
      {
        model: Area,
        attributes: ['id', 'nombre', 'descripcion'], // Include Area name and abbreviation
        include: [
          {
            association: 'AreaPadre',
            attributes: ['id', 'nombre', 'descripcion'],
            required: false
          }
        ]
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
      usuarios: rows.map(formatUsuarioResponse),
      totalUsuarios: count,
      totalPaginas: Math.ceil(count / limit),
      paginaActual: page
    });
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

// Regla de contraseña: más de 6 caracteres, al menos una mayúscula y un número.
const REGLA_PASSWORD = /^(?=.*[A-Z])(?=.*\d).{7,}$/;

// Cambio de contraseña por el propio usuario: exige la contraseña actual.
exports.cambiarMiPassword = async (req, res) => {
  try {
    const { actual, nueva, confirmar } = req.body;
    const usuario = await Usuario.findByPk(req.user.id);
    if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

    const coincide = await bcrypt.compare(String(actual || ''), usuario.password);
    if (!coincide) return res.status(400).json({ mensaje: 'La contraseña actual no es correcta' });
    if (!REGLA_PASSWORD.test(String(nueva || ''))) {
      return res.status(400).json({
        mensaje: 'La contraseña debe tener más de 6 caracteres, al menos una mayúscula y al menos un número',
      });
    }
    if (nueva !== confirmar) return res.status(400).json({ mensaje: 'La confirmación no coincide con la nueva contraseña' });

    usuario.password = await bcrypt.hash(nueva, 10);
    await usuario.save();
    res.json({ mensaje: 'Contraseña actualizada correctamente' });
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

// Consulta los nombres de una persona por su DNI en RENIEC (API de Decolecta).
exports.consultarDni = async (req, res) => {
  try {
    const dni = String(req.params.dni || '').trim();
    if (!/^\d{8}$/.test(dni)) return res.status(400).json({ mensaje: 'El DNI debe tener 8 dígitos' });
    // Primero la base local: si ya existe, no se consume la consulta a RENIEC.
    const local = await Usuario.findOne({ where: { dni }, attributes: ['dni', 'nombre', 'apellido'] });
    if (local) {
      return res.json({
        dni,
        nombre: local.nombre,
        apellido: local.apellido,
        nombre_completo: `${local.nombre} ${local.apellido}`,
        origen: 'LOCAL',
      });
    }

    const clave = process.env.DECOLECTA_API_KEY;
    if (!clave) return res.status(500).json({ mensaje: 'La consulta de RENIEC no está configurada' });

    const respuesta = await fetch(`https://api.decolecta.com/v1/reniec/dni?numero=${dni}`, {
      headers: { Authorization: `Bearer ${clave}`, 'Content-Type': 'application/json' },
    });
    if (respuesta.status === 404) return res.status(404).json({ mensaje: 'No se encontró el DNI en RENIEC' });
    if (!respuesta.ok) return res.status(502).json({ mensaje: 'RENIEC no respondió correctamente' });

    const datos = await respuesta.json();
    res.json({
      dni: datos.document_number || dni,
      nombre: datos.first_name || '',
      apellido: [datos.first_last_name, datos.second_last_name].filter(Boolean).join(' '),
      nombre_completo: datos.full_name || '',
      origen: 'RENIEC',
    });
  } catch (error) {
    res.status(502).json({ mensaje: 'No se pudo consultar RENIEC' });
  }
};

exports.obtenerUsuarioPorId = async (req, res) => {
  try {
    const usuarioId = parseInt(req.params.id);
    const usuarioActual = req.user.id;

    // Permitir que un usuario obtenga su propio perfil, o que admin/jefe obtenga cualquier usuario
    const esAdmin = req.user.perfil === 'admin';
    const esJefe = req.user.perfil === 'jefe';
    const esSuPropioUsuario = usuarioId === usuarioActual;

    if (!esAdmin && !esJefe && !esSuPropioUsuario) {
      return res.status(403).json({ mensaje: 'No tienes permiso para ver este usuario' });
    }

    const usuario = await Usuario.findByPk(usuarioId, {
      include: [
        { model: Cargo, attributes: ['id', 'nombre'], required: false },
        { model: Area, attributes: ['id', 'nombre'], required: false },
      ],
    });
    if (usuario) {
      const datos = formatUsuarioResponse(usuario);
      datos.cargo = usuario.Cargo ? usuario.Cargo.nombre : null;
      datos.area = usuario.Area ? usuario.Area.nombre : null;
      res.json(datos);
    } else {
      res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

exports.crearUsuario = async (req, res) => {
  try {
    // La contraseña inicial siempre es la predeterminada del sistema; no se toma del formulario.
    const { password: _ignorada, ...otrosDatos } = req.body;
    const normalizedData = normalizeUsuarioData(otrosDatos);
    const hashedPassword = await bcrypt.hash('Autoridad1', 10);

    const nuevoUsuario = await Usuario.create({
      ...normalizedData,
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
    const usuarioId = req.params.id;

    console.log('[UPDATE] Intentando actualizar usuario:', usuarioId);
    console.log('[UPDATE] Datos recibidos:', req.body);

    // Verificar que el usuario existe
    const usuarioExistente = await Usuario.findByPk(usuarioId);
    if (!usuarioExistente) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    // Preparar datos a actualizar (excluir campos especiales)
    const dataToUpdate = {};
    for (const [key, value] of Object.entries(req.body)) {
      // No actualizar campos especiales
      if (['password', 'estado', 'id'].includes(key)) {
        continue;
      }
      // Incluir otros campos
      dataToUpdate[key] = value;
    }

    // Normalizar datos (mayúscula y trim)
    const normalizedData = normalizeUsuarioData(dataToUpdate);

    console.log('[UPDATE] Datos a actualizar:', normalizedData);

    // Si no hay datos para actualizar, retornar error
    if (Object.keys(normalizedData).length === 0) {
      return res.status(400).json({ mensaje: 'No hay datos para actualizar' });
    }

    const actualizado = await Usuario.update(normalizedData, {
      where: { id: usuarioId }
    });

    console.log('[UPDATE] Resultado update:', actualizado);

    if (actualizado[0] === 1) {
      res.json({ mensaje: 'Usuario actualizado exitosamente' });
    } else if (actualizado[0] === 0) {
      // Si no se actualizó nada, probablemente los datos son idénticos
      res.json({ mensaje: 'Usuario sin cambios' });
    } else {
      res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }
  } catch (error) {
    console.error('[UPDATE] Error completo:', error);
    console.error('[UPDATE] Mensaje:', error.message);
    res.status(500).json({ mensaje: error.message || 'Error al actualizar el usuario' });
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

    // Normalizar datos
    const datosNormalizados = normalizeUsuarioData({
      email,
      nombre,
      apellido,
      dni,
      perfil: perfil || 'personal',
      telefono,
      direccion
    });

    const nuevoUsuario = await Usuario.create({
      usuario,
      password: hashedPassword,
      email: datosNormalizados.email,
      nombre: datosNormalizados.nombre,
      apellido: datosNormalizados.apellido,
      dni: datosNormalizados.dni,
      id_cargo,
      id_area,
      perfil: datosNormalizados.perfil,
      telefono: datosNormalizados.telefono,
      direccion: datosNormalizados.direccion,
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
    const { filtro, limit } = req.query;
    const where = { estado: true, usuario: { [Op.ne]: 'admin' } }; // Solo usuarios activos, sin el admin
    if (filtro) {
      const termino = `%${String(filtro).trim()}%`;
      where[Op.or] = [
        { nombre: { [Op.like]: termino } },
        { apellido: { [Op.like]: termino } },
        { usuario: { [Op.like]: termino } },
      ];
    }

    const usuarios = await Usuario.findAll({
      attributes: ['id', 'nombre', 'apellido', 'usuario', 'perfil'],
      include: [
        {
          model: Cargo,
          attributes: ['id', 'nombre']
        }
      ],
      where,
      order: [['nombre', 'ASC']],
      limit: parseInt(limit, 10) || undefined,
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

exports.cambiarPerfilUsuario = async (req, res) => {
  try {
    const { id } = req.params; // Get user ID from the request parameters
    const { nuevoPerfil } = req.body; // Get the new profile from the request body

    // Find the user by ID
    const user = await Usuario.findByPk(id);
    if (!user) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    // Update the user's profile
    user.perfil = nuevoPerfil;
    await user.save();

    res.json({ mensaje: 'Perfil del usuario actualizado exitosamente' });
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

exports.cambiarEstadoUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    const user = await Usuario.findByPk(id);
    if (!user) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    await Usuario.update({ estado }, { where: { id } });

    res.json({ mensaje: 'Estado del usuario actualizado exitosamente' });
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};
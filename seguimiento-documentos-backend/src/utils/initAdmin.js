const Usuario = require('../models/Usuario');
const Cargo = require('../models/Cargo');
const Area = require('../models/Area');
const bcryptjs = require('bcryptjs');

async function initAdmin() {
  try {
    // Verificar si ya existe un usuario admin
    const adminExistente = await Usuario.findOne({ where: { perfil: 'admin' } });
    if (adminExistente) {
      console.log('Usuario admin ya existe. No se creará uno nuevo.');
      return;
    }

    // Crear cargo de Administrador si no existe
    const [cargo, cargoCreado] = await Cargo.findOrCreate({
      where: { nombre: 'Administrador' },
      defaults: { descripcion: 'Cargo con máximos privilegios en el sistema' }
    });

    // Crear área de Administración si no existe
    const [area, areaCreada] = await Area.findOrCreate({
      where: { nombre: 'Administración' },
      defaults: { descripcion: 'Área de administración del sistema' }
    });

    // Crear usuario admin
    const salt = await bcryptjs.genSalt(10);
    const hashedPassword = await bcryptjs.hash('admin123', salt); // Cambia 'admin123' por una contraseña segura
    const nuevoAdmin = await Usuario.create({
      usuario: 'admin',
      password: hashedPassword,
      email: 'dhayro.kong@hotmail.com',
      nombre: 'Administrador',
      apellido: 'Sistema',
      dni: '00000000',
      id_cargo: cargo.id,
      id_area: area.id,
      perfil: 'admin',
      estado: true
    });

    console.log('Usuario admin creado exitosamente:', nuevoAdmin.usuario);
  } catch (error) {
    console.error('Error al crear usuario admin:', error);
  }
}

module.exports = initAdmin;
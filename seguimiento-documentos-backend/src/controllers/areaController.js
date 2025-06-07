const { Op, QueryTypes } = require('sequelize');
const Area = require('../models/Area');
const sequelize = Area.sequelize; // Asegúrate de que tu modelo Area tenga acceso a la instancia de sequelize

exports.obtenerTodasLasAreas = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const { nombre, descripcion, filtro } = req.query;

    let whereClause = {};

    if (filtro) {
      whereClause[Op.or] = [
        { nombre: { [Op.like]: `%${filtro}%` } },
        { descripcion: { [Op.like]: `%${filtro}%` } }
      ];
    } else {
      if (nombre) {
        whereClause.nombre = { [Op.like]: `%${nombre}%` };
      }

      if (descripcion) {
        whereClause.descripcion = { [Op.like]: `%${descripcion}%` };
      }
    }

    const { count, rows } = await Area.findAndCountAll({
      where: whereClause,
      limit: limit,
      offset: offset,
      order: [['id', 'ASC']]
    });

    res.json({
      areas: rows,
      totalAreas: count,
      totalPaginas: Math.ceil(count / limit),
      paginaActual: page
    });
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

exports.obtenerAreaPorId = async (req, res) => {
  try {
    const area = await Area.findByPk(req.params.id);
    if (area) {
      res.json(area);
    } else {
      res.status(404).json({ mensaje: 'Área no encontrada' });
    }
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

exports.crearArea = async (req, res) => {
  try {
    const nuevaArea = await Area.create(req.body);
    res.status(201).json(nuevaArea);
  } catch (error) {
    res.status(400).json({ mensaje: error.message });
  }
};

exports.actualizarArea = async (req, res) => {
  try {
    const actualizado = await Area.update(req.body, {
      where: { id: req.params.id }
    });
    if (actualizado[0] === 1) {
      res.json({ mensaje: 'Área actualizada exitosamente' });
    } else {
      res.status(404).json({ mensaje: 'Área no encontrada' });
    }
  } catch (error) {
    res.status(400).json({ mensaje: error.message });
  }
};

exports.eliminarArea = async (req, res) => {
  try {
    const areaId = req.params.id;

    // Primero, verificamos si el área tiene hijas
    const areasHijas = await Area.findOne({
      where: { id_padre: areaId }
    });

    if (areasHijas) {
      return res.status(400).json({ 
        mensaje: 'No se puede eliminar el área porque tiene sub-áreas asociadas. Elimine primero las sub-áreas.' 
      });
    }

    // Si no tiene áreas hijas, procedemos con la eliminación
    const eliminado = await Area.destroy({
      where: { id: areaId }
    });

    if (eliminado) {
      res.json({ mensaje: 'Área eliminada exitosamente' });
    } else {
      res.status(404).json({ mensaje: 'Área no encontrada' });
    }
  } catch (error) {
    console.error('Error al eliminar área:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor al eliminar el área' });
  }
};


exports.obtenerAreasHijas = async (req, res) => {
  try {
    const { idPadre } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const { nombre, descripcion, filtro } = req.query;

    let whereClause = {};

    if (idPadre === 'null' ) {
      // Buscar áreas de nivel superior (sin padre)
      whereClause.id_padre = null;
    } else {
      // Verificar si el área padre existe
      const areaPadre = await Area.findByPk(idPadre);
      if (!areaPadre) {
        return res.status(404).json({ mensaje: 'Área padre no encontrada' });
      }
      whereClause.id_padre = idPadre;
    }

    if (filtro) {
      whereClause[Op.or] = [
        { nombre: { [Op.like]: `%${filtro}%` } },
        { descripcion: { [Op.like]: `%${filtro}%` } }
      ];
    } else {
      if (nombre) {
        whereClause.nombre = { [Op.like]: `%${nombre}%` };
      }
      if (descripcion) {
        whereClause.descripcion = { [Op.like]: `%${descripcion}%` };
      }
    }

    const { count, rows } = await Area.findAndCountAll({
      where: whereClause,
      limit: limit,
      offset: offset,
      order: [['id', 'ASC']]
    });

    res.json({
      areas: rows,
      totalAreas: count,
      totalPaginas: Math.ceil(count / limit),
      paginaActual: page
    });
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

exports.obtenerAreasPrincipales = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const { nombre, descripcion, filtro } = req.query;

    let whereClause = { id_padre: null };

    if (filtro) {
      whereClause[Op.or] = [
        { nombre: { [Op.like]: `%${filtro}%` } },
        { descripcion: { [Op.like]: `%${filtro}%` } }
      ];
    } else {
      if (nombre) {
        whereClause.nombre = { [Op.like]: `%${nombre}%` };
      }
      if (descripcion) {
        whereClause.descripcion = { [Op.like]: `%${descripcion}%` };
      }
    }

    const { count, rows } = await Area.findAndCountAll({
      where: whereClause,
      limit: limit,
      offset: offset,
      order: [['id', 'ASC']]
    });

    if (rows.length === 0) {
      return res.status(404).json({ mensaje: 'No se encontraron áreas principales' });
    }

    res.json({
      areas: rows,
      totalAreas: count,
      totalPaginas: Math.ceil(count / limit),
      paginaActual: page
    });
  } catch (error) {
    console.error('Error en obtenerAreasPrincipales:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor al obtener áreas principales' });
  }
};
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const POSTMAN_API_KEY = process.env.POSTMAN_API_KEY;

async function obtenerDatosDeSISGED() {
  if (!POSTMAN_API_KEY) {
    throw new Error('POSTMAN_API_KEY no configurada en .env');
  }

  try {
    // 1. Obtener colecciones
    const collectionsRes = await fetch('https://api.getpostman.com/collections', {
      headers: {
        'X-API-Key': POSTMAN_API_KEY
      }
    });

    if (!collectionsRes.ok) {
      throw new Error(`Error obteniendo colecciones: ${collectionsRes.status}`);
    }

    const collectionsData = await collectionsRes.json();
    const sisgedCollection = collectionsData.collections.find(c =>
      c.name.toLowerCase().includes('sisged')
    );

    if (!sisgedCollection) {
      throw new Error('No se encontró colección SISGED en Postman');
    }

    // 2. Obtener detalles de la colección
    const collectionRes = await fetch(
      `https://api.getpostman.com/collections/${sisgedCollection.uid}`,
      {
        headers: {
          'X-API-Key': POSTMAN_API_KEY
        }
      }
    );

    const collectionDetails = await collectionRes.json();
    const sisgedRequest = collectionDetails.collection.item.find(item =>
      item.name.toLowerCase().includes('sisged') || item.name.toLowerCase().includes('general')
    );

    if (!sisgedRequest) {
      throw new Error('No se encontró petición SISGED en la colección');
    }

    // 3. Extraer token y URL
    let token = null;
    if (sisgedRequest.request.header) {
      const authHeader = sisgedRequest.request.header.find(h =>
        h.key === 'Authorization' || h.key === 'authorization'
      );
      if (authHeader?.value) {
        token = authHeader.value.replace('Bearer ', '');
      }
    }

    if (!token) {
      throw new Error('No se encontró token en la petición SISGED');
    }

    const url = typeof sisgedRequest.request.url === 'string'
      ? sisgedRequest.request.url
      : sisgedRequest.request.url.raw;

    // 4. Ejecutar la petición
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`SISGED respondió con error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.data || !Array.isArray(data.data)) {
      throw new Error('Formato de respuesta SISGED no válido');
    }

    return data.data;

  } catch (error) {
    throw new Error(`Error sincronizando con SISGED: ${error.message}`);
  }
}

async function importarExpedientesABD(datos, models) {
  if (!Array.isArray(datos) || datos.length === 0) {
    return { exitosos: 0, errores: 0, total: 0 };
  }

  let exitosos = 0;
  let errores = 0;

  for (let i = 0; i < datos.length; i++) {
    try {
      const item = datos[i];

      // Crear o actualizar expediente
      await models.Expediente.findOrCreate({
        where: { cut: item.ncut || item.CUT },
        defaults: {
          cut: item.ncut || item.CUT || `EXP-${i}`,
          asunto: item.asunto || item.ASUNTO || "Sin asunto",
          remitente: (item.usurem || item.USUARIO || "").split('\n')?.[0] || "Desconocido",
          numero_documento: item.ndoc || item.DOCUMENTO || "",
          tipo_procedimiento: item.proced || item.PROCEDIMIENTO || "SISGED",
          estupa: item.estupa || item.ESTUPA || "NO TUPA",
          periodo: new Date().getFullYear().toString(),
          id_usuario_creador: 1,
        }
      });

      exitosos++;
    } catch (err) {
      errores++;
    }
  }

  return { exitosos, errores, total: datos.length };
}

module.exports = {
  obtenerDatosDeSISGED,
  importarExpedientesABD
};

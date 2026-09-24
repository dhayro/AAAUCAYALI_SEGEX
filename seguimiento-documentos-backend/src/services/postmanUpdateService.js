require('dotenv').config();

const POSTMAN_API_KEY = process.env.POSTMAN_API_KEY;

async function actualizarColeccionPostman(parametros) {
  console.log('[POSTMAN UPDATE] Actualizando colección en Postman...');

  if (!POSTMAN_API_KEY) {
    throw new Error('POSTMAN_API_KEY no configurada');
  }

  try {
    // 1. Obtener colecciones
    const collectionsRes = await fetch('https://api.getpostman.com/collections', {
      headers: { 'X-API-Key': POSTMAN_API_KEY }
    });

    if (!collectionsRes.ok) {
      throw new Error(`Error obteniendo colecciones: ${collectionsRes.status}`);
    }

    const collectionsData = await collectionsRes.json();
    const sisgedCollection = collectionsData.collections.find(c =>
      c.name.toLowerCase().includes('sisged')
    );

    if (!sisgedCollection) {
      throw new Error('Colección SISGED no encontrada');
    }

    // 2. Obtener detalles de la colección
    const collectionRes = await fetch(
      `https://api.getpostman.com/collections/${sisgedCollection.uid}`,
      {
        headers: { 'X-API-Key': POSTMAN_API_KEY }
      }
    );

    const collectionDetails = await collectionRes.json();
    const sisgedRequest = collectionDetails.collection.item.find(item =>
      item.name.toLowerCase().includes('sisged') || item.name.toLowerCase().includes('general')
    );

    if (!sisgedRequest) {
      throw new Error('Petición SISGED no encontrada');
    }

    // 3. Actualizar parámetros en la petición
    if (parametros.params) {
      sisgedRequest.request.url.query = Object.entries(parametros.params).map(([key, value]) => ({
        key,
        value: String(value) || '',
        disabled: false
      }));
    }

    // 4. Actualizar Bearer token si se proporciona
    if (parametros.token) {
      if (!sisgedRequest.request.header) {
        sisgedRequest.request.header = [];
      }

      const authHeaderIndex = sisgedRequest.request.header.findIndex(h =>
        h.key === 'Authorization' || h.key === 'authorization'
      );

      if (authHeaderIndex >= 0) {
        sisgedRequest.request.header[authHeaderIndex].value = `Bearer ${parametros.token}`;
      } else {
        sisgedRequest.request.header.push({
          key: 'Authorization',
          value: `Bearer ${parametros.token}`,
          type: 'text'
        });
      }
    }

    // 5. Actualizar la colección en Postman
    const updateRes = await fetch(
      `https://api.getpostman.com/collections/${sisgedCollection.uid}`,
      {
        method: 'PUT',
        headers: {
          'X-API-Key': POSTMAN_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          collection: collectionDetails.collection
        })
      }
    );

    if (!updateRes.ok) {
      throw new Error(`Error actualizando colección: ${updateRes.status}`);
    }

    console.log('[POSTMAN UPDATE] ✅ Colección actualizada en Postman');
    return true;

  } catch (error) {
    console.error('[POSTMAN UPDATE] Error:', error.message);
    throw error;
  }
}

module.exports = {
  actualizarColeccionPostman
};

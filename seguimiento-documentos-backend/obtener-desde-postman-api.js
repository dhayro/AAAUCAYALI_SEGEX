require('dotenv').config();
const fs = require('fs');
const path = require('path');

const POSTMAN_API_KEY = process.env.POSTMAN_API_KEY;

if (!POSTMAN_API_KEY) {
  console.log('❌ POSTMAN_API_KEY no encontrada en .env');
  console.log('📝 Crea un archivo .env con:');
  console.log('POSTMAN_API_KEY=tu_clave_aqui');
  process.exit(1);
}

console.log('🚀 OBTENIENDO DATOS DESDE POSTMAN API\n');

(async () => {
  try {
    // 1. Obtener colecciones
    console.log('🔍 Buscando colección SISGED...\n');

    const collectionsRes = await fetch('https://api.getpostman.com/collections', {
      headers: {
        'X-API-Key': POSTMAN_API_KEY
      }
    });

    if (!collectionsRes.ok) {
      console.log('❌ Error obteniendo colecciones:', collectionsRes.status);
      console.log('📝 Verifica que tu API Key sea correcta');
      process.exit(1);
    }

    const collectionsData = await collectionsRes.json();
    const sisgedCollection = collectionsData.collections.find(c =>
      c.name.toLowerCase().includes('sisged')
    );

    if (!sisgedCollection) {
      console.log('❌ No se encontró colección SISGED');
      console.log('📋 Colecciones disponibles:');
      collectionsData.collections.forEach(c => console.log(`  - ${c.name}`));
      process.exit(1);
    }

    console.log(`✅ Colección encontrada: ${sisgedCollection.name}`);
    console.log(`📊 ID: ${sisgedCollection.uid}\n`);

    // 2. Obtener detalles de la colección
    console.log('⏳ Obteniendo peticiones...\n');

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
      console.log('❌ No se encontró petición SISGED en la colección');
      process.exit(1);
    }

    console.log(`✅ Petición encontrada: ${sisgedRequest.name}\n`);

    // 3. Ejecutar la petición
    console.log('🚀 Ejecutando petición a SISGED...\n');

    // Buscar token en múltiples lugares
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
      console.log('❌ No se encontró token Authorization en headers');
      console.log('📝 Headers disponibles:');
      if (sisgedRequest.request.header) {
        sisgedRequest.request.header.forEach(h => {
          console.log(`  - ${h.key}: ${h.value?.substring(0, 50)}...`);
        });
      }
      process.exit(1);
    }

    const url = typeof sisgedRequest.request.url === 'string'
      ? sisgedRequest.request.url
      : sisgedRequest.request.url.raw;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    console.log(`📊 Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      console.log('❌ SISGED respondió con error');
      process.exit(1);
    }

    const data = await response.json();

    console.log(`✅ Datos obtenidos: ${data.data?.length || 0} registros\n`);

    if (data.data && data.data.length > 0) {
      console.log('📋 Primeros 3 registros:');
      console.table(data.data.slice(0, 3));
    }

    // 4. Guardar
    const outputFile = path.join(__dirname, 'sisged-datos-postman-api.json');
    fs.writeFileSync(outputFile, JSON.stringify(data.data, null, 2));

    console.log(`\n💾 Guardado en: ${outputFile}`);
    console.log(`📦 Tamaño: ${(fs.statSync(outputFile).size / 1024).toFixed(2)} KB\n`);

    // 5. Importar a BD
    await importarABD(data.data);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();

async function importarABD(datos) {
  try {
    if (!Array.isArray(datos) || datos.length === 0) {
      console.log('⚠️ No hay datos para importar');
      return;
    }

    const expedientes = datos.map((item, index) => {
      return {
        cut: item.ncut || item.CUT || `EXP-${index}`,
        asunto: item.asunto || item.ASUNTO || "Sin asunto",
        remitente: (item.usurem || item.USUARIO || "")?.split('\n')?.[0] || "Desconocido",
        numero_documento: item.ndoc || item.DOCUMENTO || "",
        tipo_procedimiento: item.proced || item.PROCEDIMIENTO || "SISGED",
        estupa: item.estupa || item.ESTUPA || "NO TUPA",
        periodo: new Date().getFullYear().toString(),
        id_usuario_creador: 1,
      };
    });

    console.log(`🔄 Importando ${expedientes.length} expedientes a la BD...\n`);

    let exitosos = 0;
    let errores = 0;

    for (let i = 0; i < expedientes.length; i++) {
      try {
        const response = await fetch('http://localhost:3003/api/expedientes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy9uYW1lIjoicHJlbWdpZm8iLCJleHAiOjE3OTAzMTIzOTksImlzcyI6IlNJU0dFRElzc3VlciIsImF1ZCI6IlNJU0dFREF1ZGllbmNlIn0.9RFhp_68N9cFgBbUj199wxQlxjmtyAPexr4CZggmJj4',
          },
          body: JSON.stringify(expedientes[i]),
        });

        if (response.ok) {
          exitosos++;
        } else {
          errores++;
        }

        if ((i + 1) % 10 === 0 || i === expedientes.length - 1) {
          console.log(`  ✅ ${exitosos} | ❌ ${errores} | ${i + 1}/${expedientes.length}`);
        }
      } catch (err) {
        errores++;
      }
    }

    console.log(`\n✅ PROCESO COMPLETADO`);
    console.log(`📊 Importación: ${exitosos} exitosos, ${errores} errores`);
    console.log('🎉 ¡Los datos de SISGED están en tu sistema!\n');

  } catch (error) {
    console.error('❌ Error importando:', error.message);
  }
}

# 📚 DOCUMENTACIÓN COMPLETA - SISTEMA DE SEGUIMIENTO DE DOCUMENTOS

## 🌐 BASE URL
```
http://localhost:3003
```

---

## 📋 ENDPOINTS PRINCIPALES

### 1️⃣ EXPEDIENTES
**CRUD completo de expedientes**

#### GET - Listar expedientes
```
GET /api/expedientes
```
**Parámetros (Query):**
- `page`: Número de página (default: 1)
- `limit`: Registros por página (default: 10)
- `search`: Buscar por CUT o asunto

**Respuesta:**
```json
{
  "data": [
    {
      "id": 1,
      "cut": "187610-2026",
      "asunto": "Solicitud de información",
      "remitente": "Juan Pérez",
      "numero_documento": "DOC-001",
      "tipo_procedimiento": "SOLICITUD",
      "estupa": "NO TUPA",
      "periodo": "2026"
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 10
}
```

#### POST - Crear expediente
```
POST /api/expedientes
Content-Type: application/json
Authorization: Bearer [TOKEN]
```

**Body:**
```json
{
  "cut": "187610-2026",
  "asunto": "Solicitud de información",
  "remitente": "Juan Pérez",
  "numero_documento": "DOC-001",
  "tipo_procedimiento": "SOLICITUD",
  "estupa": "NO TUPA",
  "periodo": "2026",
  "id_usuario_creador": 1
}
```

#### PUT - Actualizar expediente
```
PUT /api/expedientes/:id
```

#### DELETE - Eliminar expediente
```
DELETE /api/expedientes/:id
```

---

### 2️⃣ DOCUMENTOS
**Gestión de documentos con asignación**

#### GET - Listar documentos
```
GET /api/documentos
```

**Respuesta:**
```json
{
  "data": [
    {
      "id": 1,
      "cut": "187610-2026",
      "numero_documento": "DOC-001",
      "fecha_documento": "2026-09-24",
      "fecha_vencimiento": "2026-10-24",
      "AsignacionDocumento": [
        {
          "id": 1,
          "fecha_asignacion": "2026-09-24",
          "asignado": {
            "id": 1,
            "nombre": "Juan Pérez"
          }
        }
      ]
    }
  ]
}
```

#### POST - Crear documento
```
POST /api/documentos
```

#### POST - Crear asignación
```
POST /api/asignaciones
```

**Body:**
```json
{
  "id_documento": 1,
  "id_usuario": 1,
  "fecha_asignacion": "2026-09-24"
}
```

---

### 3️⃣ RESPUESTAS DE DOCUMENTOS
**Documentos con respuesta**

#### POST - Registrar respuesta
```
POST /api/respuestas
```

**Body:**
```json
{
  "id_asignacion_documento": 1,
  "numero_respuesta": "RESP-001",
  "fecha_respuesta": "2026-09-30",
  "descripcion": "Respuesta al documento"
}
```

---

### 4️⃣ PRÓRROGA DE DOCUMENTOS
**Solicitudes de prórroga**

#### POST - Solicitar prórroga
```
POST /api/antecedentes
```

**Body:**
```json
{
  "id_asignacion_documento": 1,
  "fecha_solicitud": "2026-09-24",
  "dias_solicitados": 5,
  "motivo": "Necesita más tiempo para revisar"
}
```

---

### 5️⃣ USUARIOS
**Gestión de usuarios**

#### GET - Listar usuarios
```
GET /api/usuarios
```

#### POST - Crear usuario
```
POST /api/usuarios
```

**Body:**
```json
{
  "nombre": "Juan Pérez",
  "email": "juan@example.com",
  "password": "hashedpassword",
  "id_area": 1,
  "id_cargo": 1
}
```

#### POST - Login
```
POST /api/usuarios/login
```

**Body:**
```json
{
  "email": "juan@example.com",
  "password": "password123"
}
```

**Respuesta:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "nombre": "Juan Pérez",
    "email": "juan@example.com"
  }
}
```

---

### 6️⃣ ÁREAS
**Gestión de áreas/departamentos**

#### GET - Listar áreas
```
GET /api/areas
```

#### POST - Crear área
```
POST /api/areas
```

**Body:**
```json
{
  "nombre": "Área de Recursos Hídricos",
  "descripcion": "Gestión de recursos"
}
```

---

### 7️⃣ CARGOS
**Gestión de cargos/posiciones**

#### GET - Listar cargos
```
GET /api/cargos
```

#### POST - Crear cargo
```
POST /api/cargos
```

**Body:**
```json
{
  "nombre": "Especialista",
  "descripcion": "Especialista en recursos"
}
```

---

### 8️⃣ TIPOS DE DOCUMENTOS
**Catálogo de tipos de documento**

#### GET - Listar tipos
```
GET /api/tipoDocumentos
```

#### POST - Crear tipo
```
POST /api/tipoDocumentos
```

**Body:**
```json
{
  "nombre": "Informe",
  "descripcion": "Informes técnicos"
}
```

---

### 9️⃣ SISGED (Integración Externa)
**Proxy a SISGED**

#### GET - Test (sin autenticación)
```
GET /api/sisged/test
```

**Respuesta:** Datos de prueba locales

#### POST - Proxy de petición
```
POST /api/sisged/proxy
Authorization: Bearer [TOKEN_SISGED]
```

**Body:**
```json
{
  "url": "https://sisgedpiloto.ana.gob.pe/apiRestSG/api/SISGED/general?..."
}
```

#### GET - Consulta general (requiere token)
```
GET /api/sisged/general?CUT_MIDAGRI=&NRO_DOCUMENTO=...
Authorization: Bearer [TOKEN_SISGED]
```

#### GET - Trazabilidad (requiere token)
```
GET /api/sisged/trazabilidad?NRO_CUT=...
Authorization: Bearer [TOKEN_SISGED]
```

---

## 🔐 AUTENTICACIÓN

### Headers requeridos:
```
Authorization: Bearer [JWT_TOKEN]
Content-Type: application/json
```

### Token JWT:
- Se obtiene al login
- Se envía en Authorization header
- Contiene identificación del usuario
- Valida acceso a endpoints protegidos

---

## 📊 REPORTES

### GET - Reporte de asignaciones
```
GET /api/reportes/asignaciones
```

### GET - Reporte de respuestas
```
GET /api/reportes/respuestas
```

---

## ⚙️ CONFIGURACIÓN

### Puerto: 3003
### Base de datos: MySQL
### ORM: Sequelize
### Autenticación: JWT

---

## 🌍 CORSORIGINS

```javascript
'http://localhost:3003'
'http://localhost:3004'
'http://localhost:5173'
```

---

## 📱 FRONTEND

**URL:** http://localhost:3004

**Módulos disponibles:**
- Dashboard
- Documentos
- Expedientes
- Documentos Prórroga
- Documentos Respuestas
- Reportes
- Cargos, Áreas, Tipos Documentos, Usuarios

---

## 🔌 EJEMPLO DE CONSUMO

### JavaScript/Fetch:
```javascript
const response = await fetch('http://localhost:3003/api/expedientes', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
console.log(data);
```

### cURL:
```bash
curl -X GET "http://localhost:3003/api/expedientes" \
  -H "Authorization: Bearer eyJ..." \
  -H "Content-Type: application/json"
```

### Axios:
```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3003/api',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

const data = await api.get('/expedientes');
```

---

## 📝 NOTAS

- Todos los endpoints requieren autenticación excepto `/sisged/test`
- Los datos se devuelven en formato JSON
- La paginación está incluida en listados
- Las búsquedas son case-insensitive
- La timezone es America/Lima

---

**Última actualización:** 24 de Septiembre de 2026

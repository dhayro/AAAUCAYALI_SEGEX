# 🚀 INSTRUCCIONES DE INSTALACIÓN Y EJECUCIÓN

## **PASO 1: BACKEND**

El backend debe estar corriendo en `http://localhost:3003` para que el frontend pueda conectarse.

### Verificar que el backend esté corriendo:

```bash
# En la carpeta del backend
cd D:\AAAHUALLAGA\AAAHUALLAGA\seguimiento-documentos-backend

# Instalar dependencias (si no las tiene)
npm install

# Iniciar el servidor
npm start
# o
node src/index.js
```

**El backend debe mostrar un mensaje como:**
```
Servidor corriendo en puerto 3003
Conectado a la base de datos
```

---

## **PASO 2: VERIFICAR LA BASE DE DATOS**

Asegúrate de que la base de datos está corriendo:

```bash
# Si usas MySQL/MariaDB
# Abre MySQL Workbench o usa:
mysql -u root -p
```

La base de datos debe existir y contener las tablas necesarias.

---

## **PASO 3: FRONTEND**

Una vez el backend esté corriendo, inicia el frontend:

```bash
# En la carpeta del frontend
cd D:\AAAHUALLAGA\AAAHUALLAGA\seguimiento-documentos-frontend

# Instalar dependencias (ya realizado)
npm install

# Iniciar el servidor de desarrollo
npm run dev
```

**El frontend debe abrirse en:**
```
http://localhost:3003
```

---

## **PASO 4: LOGIN**

Usa las credenciales del usuario en la base de datos:

```
Usuario: admin
Contraseña: (la que creaste en la base de datos)
```

---

## **SOLUCIÓN DE PROBLEMAS**

### ❌ Error: "Cannot POST /api/usuarios/login"

**Causa:** El backend no está respondiendo o no existe el endpoint

**Solución:**
1. Verifica que el backend esté corriendo: `http://localhost:3003/api`
2. En la terminal del backend, deberías ver las peticiones llegando
3. Si no llegan, reinicia el backend

### ❌ Error: "Connection refused on localhost:3003"

**Causa:** El backend no está corriendo en el puerto 3003

**Solución:**
1. Abre una nueva terminal
2. Ve a la carpeta del backend
3. Ejecuta: `npm start`

### ❌ Error: "CORS error"

**Causa:** El backend no permite conexiones desde el frontend

**Solución:**
1. En el archivo de configuración del backend, asegúrate de tener CORS habilitado
2. El backend debe permitir peticiones desde `http://localhost:3003`

### ❌ Error: "400 Bad Request" en login

**Causa:** Las credenciales son incorrectas o el usuario no existe

**Solución:**
1. Verifica que el usuario existe en la base de datos
2. Verifica que la contraseña es correcta
3. Prueba con el usuario `admin`

---

## **VERIFICAR LA CONEXIÓN**

Para verificar que todo funciona correctamente, abre la consola del navegador (F12) y ejecuta:

```javascript
fetch('http://localhost:3003/api/usuarios/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ usuario: 'admin', password: 'tu_contraseña' })
})
.then(r => r.json())
.then(d => console.log(d))
```

---

## **RESUMEN DE PUERTOS**

| Servicio | Puerto | URL |
|----------|--------|-----|
| Backend API | 3003 | http://localhost:3003 |
| Frontend | 3003 | http://localhost:3003 |
| MySQL | 3306 | localhost:3306 |

---

## **COMANDOS RÁPIDOS**

```bash
# Terminal 1: Backend
cd D:\AAAHUALLAGA\AAAHUALLAGA\seguimiento-documentos-backend
npm start

# Terminal 2: Frontend
cd D:\AAAHUALLAGA\AAAHUALLAGA\seguimiento-documentos-frontend
npm run dev

# Terminal 3: MySQL (si es necesario)
mysql -u root -p
```

---

**Si aún tienes problemas, verifica:**
1. ✓ Backend está corriendo en puerto 3003
2. ✓ Base de datos está conectada
3. ✓ Usuario existe en la base de datos
4. ✓ Frontend está en puerto 3003

¡Listo para usar! 🚀

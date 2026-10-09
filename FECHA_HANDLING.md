# 📅 Manejo de Fechas - Sistema de Seguimiento de Documentos

## Zona Horaria
**SIEMPRE usar zona horaria de Lima, Perú (UTC-5)**

- Backend: Configurado en `src/app.js` con `process.env.TZ = 'America/Lima'`
- Frontend: Usar `dateUtils.ts` para todas las conversiones

## Frontend - Componentes de Fecha

### ✅ CORRECTO: Usar DatePickerLima
```tsx
import DatePickerLima from "@/components/form/DatePickerLima";

<DatePickerLima
  label="Fecha de Nacimiento"
  value={formData.fecha_nacimiento} // formato YYYY-MM-DD
  onChange={(date) => setFormData({ ...formData, fecha_nacimiento: date })}
/>
```

### ❌ NO USAR
- `input type="date"` - Problemas de zona horaria
- `react-datepicker` - Conflictos en modales
- `flatpickr` - Conversiones incorrectas de fecha
- `new Date()` - Interpreta en UTC, no en Lima

## Formato de Fechas

### En la Base de Datos
- Tipo: `DATE` (sin hora)
- Formato almacenado: `YYYY-MM-DD`
- Ejemplo: `1991-10-23`

### En el Frontend
- Almacenamiento: `YYYY-MM-DD` (string)
- Display: `DD/MM/YYYY` (formateado)
- Nunca convertir a objetos `Date` innecesariamente

### En el Backend
- Retornar siempre: `YYYY-MM-DD` string
- Usar funciones de `dateUtils.ts`:
  - `toISOLimaDate()` - Convertir a YYYY-MM-DD
  - `formatDate()` - Convertir a DD/MM/YYYY
  - `getCurrentLimaDateString()` - Fecha actual en Lima

## Ejemplo Backend Correcto

```javascript
// ❌ INCORRECTO
const fecha = new Date(); // Interpreta en UTC
res.json({ fecha }); // Retorna con zona horaria UTC

// ✅ CORRECTO
const { formatDateForAPI, getCurrentLimaDateString } = require('../utils/dateUtils');
const fecha = getCurrentLimaDateString(); // YYYY-MM-DD en Lima
res.json({ fecha }); // Retorna string correcto
```

## Reglas Importantes

1. **Nunca usar `new Date()` para convertir fechas recibidas**
   - Las fechas vienen como strings `YYYY-MM-DD`
   - Usar parse directo o funciones de `dateUtils.ts`

2. **Siempre serializar fechas como strings**
   - Backend: Retornar `"1991-10-23"` no `Date object`
   - Frontend: Almacenar como `"1991-10-23"` no como `Date`

3. **Para cálculos de fechas**
   - Usar funciones de `dateUtils.ts`:
     - `calculateDaysRemaining()`
     - `calculateBusinessDaysRemaining()`
     - `addCalendarDays()`
     - `addWorkDays()`

4. **Para mostrar en UI**
   - Usar `formatDate()` - Formato DD/MM/YYYY
   - Usar `formatDateSpanish()` - Formato "25 de octubre de 1991"
   - Usar `formatDateWithTime()` - Con hora

## Checklist para Nuevos Campos de Fecha

- [ ] Campo en BD tipo `DATE`
- [ ] Frontend: Usar `<DatePickerLima />`
- [ ] Backend: Retornar como `YYYY-MM-DD` string
- [ ] No usar `new Date()` para parsing
- [ ] Probar con fechas antes de 1970 y después de 2100
- [ ] Verificar que la fecha guardada = fecha mostrada

## Utilities Disponibles

### Frontend (src/utils/dateUtils.ts)
- `formatDate()` - DD/MM/YYYY
- `toISOLimaDate()` - YYYY-MM-DD
- `getCurrentLimaDateString()` - Hoy en Lima
- `calculateDaysRemaining()` - Días entre fechas
- `calculateBusinessDaysRemaining()` - Días hábiles

### Backend (src/controllers)
- Agregar `formatUsuarioResponse()` para serializar fechas
- Usar `new Date()` solo internamente, no retornar

## Ejemplo Completo: Usuario con Fecha

### Frontend (Usuarios/index.tsx)
```tsx
import DatePickerLima from "@/components/form/DatePickerLima";

<DatePickerLima
  label="Fecha de Nacimiento"
  value={formData.fecha_nacimiento}
  onChange={(date) => setFormData({ ...formData, fecha_nacimiento: date })}
/>
```

### Backend (usuarioController.js)
```javascript
const formatDateForAPI = (date) => {
  if (!date) return null;
  if (typeof date === 'string') return date;
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

exports.obtenerUsuarioPorId = async (req, res) => {
  const usuario = await Usuario.findByPk(req.params.id);
  if (usuario) {
    const data = usuario.toJSON();
    if (data.fecha_nacimiento) {
      data.fecha_nacimiento = formatDateForAPI(data.fecha_nacimiento);
    }
    res.json(data);
  }
};
```

---
**Última actualización:** 2026-10-09
**Responsable:** Sistema de Seguimiento de Documentos

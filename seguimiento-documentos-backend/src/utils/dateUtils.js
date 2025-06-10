/**
 * Formatea una fecha para la zona horaria de Lima, Perú
 * @param {Date|string|null} date - Fecha a formatear (puede ser un objeto Date, string o null)
 * @returns {string|null} - Fecha formateada en formato ISO para Lima o null si no se proporciona fecha
 */
function formatDateForLima(date) {
  if (!date) return null;
  
  // Si es string, convertir a objeto Date
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Crear un objeto de opciones para formatear la fecha
  const options = {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  };
  
  // Formatear la fecha según la zona horaria de Lima
  const formatter = new Intl.DateTimeFormat('es-PE', options);
  const parts = formatter.formatToParts(dateObj);
  
  // Construir la fecha en formato YYYY-MM-DD HH:MM:SS
  const year = parts.find(part => part.type === 'year').value;
  const month = parts.find(part => part.type === 'month').value;
  const day = parts.find(part => part.type === 'day').value;
  const hour = parts.find(part => part.type === 'hour').value;
  const minute = parts.find(part => part.type === 'minute').value;
  const second = parts.find(part => part.type === 'second').value;
  
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

module.exports = {
  formatDateForLima
};
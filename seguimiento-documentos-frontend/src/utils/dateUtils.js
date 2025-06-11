
// Zona horaria de Lima, Perú (UTC-5)
const LIMA_TIMEZONE_OFFSET = -5 * 60; // -5 horas en minutos

/**
 * Convierte una fecha a la zona horaria de Lima, Perú
 * @param {Date|string} date - Fecha a convertir
 * @returns {Date} Fecha en zona horaria de Lima
 */
export const toLimaTimezone = (date) => {
  if (!date) return null;
  
  // Si es string, convertir a objeto Date
  const dateObj = typeof date === 'string' ? new Date(date) : new Date(date);
  
  // Obtener la diferencia entre la zona horaria local y UTC en minutos
  const localOffset = dateObj.getTimezoneOffset();
  
  // Calcular el ajuste necesario para convertir a la zona horaria de Lima
  // (diferencia entre la zona horaria local y la de Lima)
  const offsetDiff = localOffset - LIMA_TIMEZONE_OFFSET;
  
  // Crear una nueva fecha ajustada a la zona horaria de Lima
  return new Date(dateObj.getTime() + offsetDiff * 60000);
};

/**
 * Formatea una fecha en formato DD/MM/YYYY según la zona horaria de Lima
 * @param {Date|string} date - Fecha a formatear
 * @returns {string} Fecha formateada
 */
export const formatDate = (date) => {
  if (!date) return '';
  
  const limaDate = toLimaTimezone(date);
  
  const day = String(limaDate.getDate()).padStart(2, '0');
  const month = String(limaDate.getMonth() + 1).padStart(2, '0');
  const year = limaDate.getFullYear();
  
  return `${day}/${month}/${year}`;
};

/**
 * Convierte una fecha a formato ISO pero en zona horaria de Lima
 * @param {Date} date - Fecha a convertir
 * @returns {string} Fecha en formato ISO
 */
export const toISOLimaDate = (date) => {
  if (!date) return null;
  
  const limaDate = toLimaTimezone(date);
  
  const year = limaDate.getFullYear();
  const month = String(limaDate.getMonth() + 1).padStart(2, '0');
  const day = String(limaDate.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * Formatea una fecha en formato DD/MM/YYYY HH:MM:SS según la zona horaria de Lima
 * @param {Date|string} date - Fecha a formatear
 * @returns {string} Fecha formateada con hora
 */
export const formatDateWithTime = (date) => {
  if (!date) return '';
  
  const limaDate = toLimaTimezone(date);
  
  const day = String(limaDate.getDate()).padStart(2, '0');
  const month = String(limaDate.getMonth() + 1).padStart(2, '0');
  const year = limaDate.getFullYear();
  
  const hours = String(limaDate.getHours()).padStart(2, '0');
  const minutes = String(limaDate.getMinutes()).padStart(2, '0');
  const seconds = String(limaDate.getSeconds()).padStart(2, '0');
  
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
};

/**
 * Parsea una fecha ISO a un objeto Date en zona horaria de Lima
 * @param {string} isoString - Fecha en formato ISO
 * @returns {Date} Objeto Date
 */
export const parseISOToLimaDate = (isoString) => {
  if (!isoString) return null;
  
  // Extraer año, mes y día del string ISO (YYYY-MM-DD)
  const [year, month, day] = isoString.substring(0, 10).split('-');
  
  // Crear una fecha UTC con estos componentes
  const date = new Date(Date.UTC(year, parseInt(month) - 1, day));
  
  // Ajustar a la zona horaria de Lima
  return toLimaTimezone(date);
};

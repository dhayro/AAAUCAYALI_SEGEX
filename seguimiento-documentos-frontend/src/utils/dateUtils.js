import { toZonedTime, formatInTimeZone } from 'date-fns-tz';

/**
 * Convierte una fecha a la zona horaria de Lima, Perú
 * @param {Date|string} date - Fecha a convertir
 * @returns {Date} Fecha en zona horaria de Lima
 */
export const toLimaTimezone = (date) => {
  if (!date) return null;

  const limaTimeZone = 'America/Lima';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const limaDate = toZonedTime(dateObj, limaTimeZone);

  return limaDate;
};

/**
 * Formatea una fecha en formato DD/MM/YYYY
 * @param {Date|string} date - Fecha a formatear
 * @returns {string} Fecha formateada
 */
export const formatDate = (date) => {
  if (!date) return '';

  // Formatear la fecha directamente en la zona horaria de Lima
  return formatInTimeZone(date, 'America/Lima', 'dd/MM/yyyy');
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
  const limaDate = toLimaTimezone(date); // Ensure it's in Lima timezone
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
export const parseISOToLimaDate = (isoDateString) => {
  if (!isoDateString) return null;

  // Convertir la fecha ISO directamente a la zona horaria de Lima
  const limaDate = toZonedTime(isoDateString, 'America/Lima');

  // console.log('Fecha original:', isoDateString);
  // console.log('Fecha convertida a Lima:', limaDate);

  return limaDate;
};
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import {
  parse,
  addDays,
  differenceInCalendarDays,
  differenceInBusinessDays,
  isWeekend,
  addBusinessDays,
} from "date-fns";

const LIMA_TIMEZONE = "America/Lima";

export const toLimaTimezone = (date: Date | string): Date => {
  const inputDate = typeof date === "string" ? new Date(date) : date;
  return toZonedTime(inputDate, LIMA_TIMEZONE);
};

export const formatDate = (date: Date | string): string => {
  if (!date) return "";
  const inputDate = typeof date === "string" ? new Date(date) : date;
  const limaDate = toLimaTimezone(inputDate);
  const day = String(limaDate.getDate()).padStart(2, "0");
  const month = String(limaDate.getMonth() + 1).padStart(2, "0");
  const year = limaDate.getFullYear();
  return `${day}/${month}/${year}`;
};

export const formatDateWithTime = (date: Date | string): string => {
  if (!date) return "";
  const inputDate = typeof date === "string" ? new Date(date) : date;
  const limaDate = toLimaTimezone(inputDate);
  const day = String(limaDate.getDate()).padStart(2, "0");
  const month = String(limaDate.getMonth() + 1).padStart(2, "0");
  const year = limaDate.getFullYear();
  const hours = String(limaDate.getHours()).padStart(2, "0");
  const minutes = String(limaDate.getMinutes()).padStart(2, "0");
  const seconds = String(limaDate.getSeconds()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
};

export const toISOLimaDate = (date: Date | string): string => {
  const inputDate = typeof date === "string" ? new Date(date) : date;
  const limaDate = toLimaTimezone(inputDate);
  const day = String(limaDate.getDate()).padStart(2, "0");
  const month = String(limaDate.getMonth() + 1).padStart(2, "0");
  const year = limaDate.getFullYear();
  return `${year}-${month}-${day}`;
};

export const toISOLimaDateTime = (date: Date | string): string => {
  const inputDate = typeof date === "string" ? new Date(date) : date;
  const limaDate = toLimaTimezone(inputDate);
  const day = String(limaDate.getDate()).padStart(2, "0");
  const month = String(limaDate.getMonth() + 1).padStart(2, "0");
  const year = limaDate.getFullYear();
  const hours = String(limaDate.getHours()).padStart(2, "0");
  const minutes = String(limaDate.getMinutes()).padStart(2, "0");
  const seconds = String(limaDate.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
};

export const parseISOToLimaDate = (dateString: string): Date => {
  if (!dateString) return new Date();

  let parsed: Date;
  if (dateString.includes('T')) {
    parsed = parse(dateString, "yyyy-MM-dd'T'HH:mm:ss", new Date());
  } else if (dateString.includes(' ')) {
    parsed = parse(dateString, "yyyy-MM-dd HH:mm:ss", new Date());
  } else {
    parsed = parse(dateString, "yyyy-MM-dd", new Date());
  }

  return fromZonedTime(parsed, LIMA_TIMEZONE);
};

export const calculateDaysRemaining = (
  startDate: Date | string,
  endDate: Date | string
): number => {
  const start = typeof startDate === "string" ? new Date(startDate) : startDate;
  const end = typeof endDate === "string" ? new Date(endDate) : endDate;

  const startLima = toLimaTimezone(start);
  const endLima = toLimaTimezone(end);

  return differenceInCalendarDays(endLima, startLima);
};

export const calculateBusinessDaysRemaining = (
  startDate: Date | string,
  endDate: Date | string
): number => {
  const start = typeof startDate === "string" ? new Date(startDate) : startDate;
  const end = typeof endDate === "string" ? new Date(endDate) : endDate;

  const startLima = toLimaTimezone(start);
  const endLima = toLimaTimezone(end);

  return differenceInBusinessDays(endLima, startLima);
};

export const addCalendarDays = (date: Date | string, days: number): Date => {
  const inputDate = typeof date === "string" ? new Date(date) : date;
  const limaDate = toLimaTimezone(inputDate);
  const newDate = addDays(limaDate, days);
  return fromZonedTime(newDate, LIMA_TIMEZONE);
};

export const addWorkDays = (date: Date | string, days: number): Date => {
  const inputDate = typeof date === "string" ? new Date(date) : date;
  const limaDate = toLimaTimezone(inputDate);
  const newDate = addBusinessDays(limaDate, days);
  return fromZonedTime(newDate, LIMA_TIMEZONE);
};

export const isWeekendDate = (date: Date | string): boolean => {
  const inputDate = typeof date === "string" ? new Date(date) : date;
  const limaDate = toLimaTimezone(inputDate);
  return isWeekend(limaDate);
};

export const getDayName = (date: Date | string): string => {
  const inputDate = typeof date === "string" ? new Date(date) : date;
  const limaDate = toLimaTimezone(inputDate);
  const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  return days[limaDate.getDay()];
};

export const getMonthName = (date: Date | string): string => {
  const inputDate = typeof date === "string" ? new Date(date) : date;
  const limaDate = toLimaTimezone(inputDate);
  const months = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Setiembre", "Octubre", "Noviembre", "Diciembre"
  ];
  return months[limaDate.getMonth()];
};

export const formatDateSpanish = (date: Date | string): string => {
  const inputDate = typeof date === "string" ? new Date(date) : date;
  const limaDate = toLimaTimezone(inputDate);
  const day = limaDate.getDate();
  const monthName = getMonthName(limaDate);
  const year = limaDate.getFullYear();
  return `${day} de ${monthName} de ${year}`;
};

export const getCurrentLimaDate = (): Date => {
  return toLimaTimezone(new Date());
};

export const getCurrentLimaDateString = (): string => {
  return toISOLimaDate(new Date());
};

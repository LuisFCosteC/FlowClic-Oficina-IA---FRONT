/**
 * Utilidades de fecha para FlowClic Oficina IA.
 * 
 * Regla crítica: obtener la fecha local del navegador con métodos locales
 * (getFullYear, getMonth, getDate). NUNCA usar conversión a UTC (como to-ISO-string)
 * porque en horario nocturno local da el día equivocado.
 */

/**
 * Devuelve la fecha local del navegador en formato YYYY-MM-DD.
 * Utiliza estrictamente los métodos locales getFullYear(), getMonth() y getDate().
 */
export function todayLocal(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parsea una fecha en formato YYYY-MM-DD a sus componentes numéricos locales.
 * month es 0-indexed (0 = enero, 11 = diciembre) para compatibilidad con Date de JavaScript.
 */
export function parseLocalDate(dateStr: string): { year: number; month: number; day: number } {
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  return {
    year: parseInt(yearStr || '2026', 10),
    month: Math.max(0, parseInt(monthStr || '1', 10) - 1),
    day: parseInt(dayStr || '1', 10),
  };
}

/**
 * Formatea una fecha YYYY-MM-DD o timestamp como día y mes corto local (ej. "23 Nov").
 */
export function formatDayMonthLocal(timeOrStr: number | string): string {
  let date: Date;
  if (typeof timeOrStr === 'string') {
    const { year, month, day } = parseLocalDate(timeOrStr);
    date = new Date(year, month, day);
  } else {
    date = new Date(timeOrStr);
  }
  const day = date.getDate();
  const monthNames = [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
  ];
  return `${String(day).padStart(2, '0')} ${monthNames[date.getMonth()]}`;
}

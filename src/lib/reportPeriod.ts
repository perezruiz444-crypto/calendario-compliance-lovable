import { endOfMonth, endOfQuarter, endOfYear, startOfMonth, startOfQuarter, startOfYear, subMonths, subQuarters } from 'date-fns';

/** El trimestre es el trimestre calendario anterior, cerrado, en la zona horaria local. */
export function getReportDateRange(period: string, now = new Date()) {
  switch (period) {
    case 'mes_anterior': {
      const previousMonth = subMonths(now, 1);
      return { startDate: startOfMonth(previousMonth), endDate: endOfMonth(previousMonth) };
    }
    case 'trimestre': {
      const previousQuarter = subQuarters(now, 1);
      return { startDate: startOfQuarter(previousQuarter), endDate: endOfQuarter(previousQuarter) };
    }
    case 'anio':
      return { startDate: startOfYear(now), endDate: endOfYear(now) };
    default:
      return { startDate: startOfMonth(now), endDate: endOfMonth(now) };
  }
}

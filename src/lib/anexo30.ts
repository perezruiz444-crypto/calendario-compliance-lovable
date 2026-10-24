import { validDateKey } from './obligationModel.js';

export const ANEXO30_DESCARGOS = '9e088c03-803f-4625-876a-e4d1d1b1f9b1';
export const ANEXO30_INICIAL = '0d34c8bc-b57b-43a2-ade9-401563e2f203';
export type Anexo30Frequency = 'inicial' | 'mensual' | 'bimestral';

/** Plazo base de Anexo 30. La prórroga por inhábiles se resuelve en servidor. */
export function anexo30BaseDate(origen: string, frecuencia: Anexo30Frequency): string | null {
  if (!validDateKey(origen) || !['inicial', 'mensual', 'bimestral'].includes(frecuencia) || Number(origen.slice(0, 4)) < 2000 || Number(origen.slice(0, 4)) > 2200) return null;
  const date = new Date(`${origen}T12:00:00Z`);
  if (frecuencia === 'inicial') date.setUTCDate(date.getUTCDate() + 30);
  else {
    if (date.getUTCDate() !== 1) return null;
    date.setUTCMonth(date.getUTCMonth() + (frecuencia === 'mensual' ? 2 : 3), 0);
  }
  return date.toISOString().slice(0, 10);
}

export function anexo30PeriodLabel(key: string): string | null {
  const match = /^anexo30:(\d{4}-\d{2}):(\d{4}-\d{2})$/.exec(key);
  if (!match || !validDateKey(`${match[1]}-01`) || !validDateKey(`${match[2]}-01`)) return null;
  const month = (value: string) => new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}-01T12:00:00Z`));
  return match[1] === match[2] ? month(match[1]) : `${month(match[1])} a ${month(match[2])}`;
}

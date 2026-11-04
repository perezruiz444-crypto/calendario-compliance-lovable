export interface ReminderRule {
  tipo: string;
  empresa_id: string | null;
  dias_antes: number;
  activa: boolean | null;
}

/** Las reglas particulares sustituyen las globales del mismo tipo.
 * Una configuración desactivada no reactiva los valores por defecto.
 */
export function reminderDays(rules: readonly ReminderRule[], tipo: string, empresaId: string, defaults: readonly number[] = [1, 7, 30]): number[] {
  const matching = rules.filter(r => r.tipo === tipo && (r.empresa_id === null || r.empresa_id === empresaId));
  const local = matching.filter(r => r.empresa_id === empresaId);
  const selected = local.length ? local : matching;
  return selected.length
    ? [...new Set(selected.filter(r => r.activa && Number.isInteger(r.dias_antes) && r.dias_antes > 0).map(r => r.dias_antes))].sort((a, b) => a - b)
    : [...defaults];
}

export function obligationReminderType(categoria: string | null): string {
  return categoria === 'cert_iva_ieps' ? 'certificacion' : categoria === 'immex' || categoria === 'prosec' ? categoria : 'general';
}

import { useState, ReactNode } from 'react';
import { ChevronDown, ShieldAlert, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { getVencimientoInfo } from '@/lib/obligaciones';
import { cn } from '@/lib/utils';

type UrgenciaStatus = 'vencido' | 'urgente' | 'proximo' | 'vigente';

const GROUP_ORDER: UrgenciaStatus[] = ['vencido', 'urgente', 'proximo', 'vigente'];

const GROUP_LABELS: Record<UrgenciaStatus, string> = {
  vencido: 'Vencidas',
  urgente: 'Urgentes',
  proximo: 'Próximas',
  vigente: 'Al día',
};

const GROUP_ICONS: Record<UrgenciaStatus, ReactNode> = {
  vencido: <ShieldAlert className="w-4 h-4" />,
  urgente: <AlertTriangle className="w-4 h-4" />,
  proximo: <Clock className="w-4 h-4" />,
  vigente: <CheckCircle2 className="w-4 h-4" />,
};

const GROUP_COLOR_CLASS: Record<UrgenciaStatus, string> = {
  vencido: 'text-destructive',
  urgente: 'text-[hsl(var(--urgent))]',
  proximo: 'text-warning',
  vigente: 'text-success',
};

interface ObligacionesPorUrgenciaProps<T> {
  items: T[];
  getFecha: (item: T) => string | null;
  getKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  /** Grupos expandidos por defecto (además de vencido/urgente, que siempre abren). */
  defaultOpenGroups?: UrgenciaStatus[];
}

/**
 * Agrupa una lista de ocurrencias por urgencia (vencido/urgente/próximo/al día)
 * usando getVencimientoInfo, y renderiza cada grupo como sección colapsable.
 * Reutilizado por ObligacionesActivasTab, DashboardObligacionesMensuales y el
 * panel de "Próximos 30 días" del calendario.
 */
export function ObligacionesPorUrgencia<T>({
  items, getFecha, getKey, renderItem, defaultOpenGroups = [],
}: ObligacionesPorUrgenciaProps<T>) {
  const groups: Record<UrgenciaStatus, T[]> = { vencido: [], urgente: [], proximo: [], vigente: [] };
  for (const item of items) {
    const info = getVencimientoInfo(getFecha(item));
    const status = info?.status ?? 'vigente';
    groups[status].push(item);
  }

  return (
    <div className="space-y-2">
      {GROUP_ORDER.filter(status => groups[status].length > 0).map(status => (
        <UrgenciaGroup
          key={status}
          status={status}
          items={groups[status]}
          getKey={getKey}
          renderItem={renderItem}
          defaultOpen={status === 'vencido' || status === 'urgente' || defaultOpenGroups.includes(status)}
        />
      ))}
    </div>
  );
}

function UrgenciaGroup<T>({
  status, items, getKey, renderItem, defaultOpen,
}: {
  status: UrgenciaStatus;
  items: T[];
  getKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="w-full flex items-center gap-2 px-1 py-2 text-sm font-semibold hover:opacity-80 transition-opacity"
        >
          <span className={GROUP_COLOR_CLASS[status]}>{GROUP_ICONS[status]}</span>
          <span className={cn('font-heading', GROUP_COLOR_CLASS[status])}>{GROUP_LABELS[status]}</span>
          <span className="text-muted-foreground font-normal">({items.length})</span>
          <ChevronDown className={cn('w-4 h-4 ml-auto text-muted-foreground transition-transform', open && 'rotate-180')} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-2 pt-1">
        {items.map(item => <div key={getKey(item)}>{renderItem(item)}</div>)}
      </CollapsibleContent>
    </Collapsible>
  );
}

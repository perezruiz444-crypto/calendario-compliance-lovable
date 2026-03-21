import { useEffect, useRef, useState, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import { EventClickArg, DatesSetArg, EventContentArg } from '@fullcalendar/core';
import esLocale from '@fullcalendar/core/locales/es';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Calendar, AlertCircle, Building2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { isPast, startOfDay, format } from 'date-fns';
import ObligacionDetailSheet from '@/components/obligaciones/ObligacionDetailSheet';

interface FcEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  extendedProps: {
    type: 'tarea' | 'documento' | 'programa' | 'obligacion';
    prioridad?: string;
    estado?: string;
    rawId?: string;
    empresaId?: string;
    data: any;
  };
}

interface DashboardCalendarProps {
  onEventClick?: (event: any) => void;
  height?: string;
}

function eventColor(type: string, prioridad?: string, isOverdue?: boolean): { bg: string; border: string } {
  if (isOverdue) return { bg: 'hsl(0 84% 60% / 0.15)', border: 'hsl(0 84% 60%)' };
  if (type === 'tarea') {
    if (prioridad === 'alta')  return { bg: 'hsl(25 95% 53% / 0.15)', border: 'hsl(25 95% 53%)' };
    if (prioridad === 'media') return { bg: 'hsl(48 96% 53% / 0.15)', border: 'hsl(48 96% 53%)' };
    if (prioridad === 'baja')  return { bg: 'hsl(142 71% 45% / 0.15)', border: 'hsl(142 71% 45%)' };
    return { bg: 'hsl(var(--primary) / 0.12)', border: 'hsl(var(--primary))' };
  }
  if (type === 'documento')  return { bg: 'hsl(221 83% 53% / 0.12)', border: 'hsl(221 83% 53%)' };
  if (type === 'programa')   return { bg: 'hsl(340 82% 52% / 0.12)', border: 'hsl(340 82% 52%)' };
  if (type === 'obligacion') return { bg: 'hsl(262 83% 58% / 0.12)', border: 'hsl(262 83% 58%)' };
  return { bg: 'hsl(var(--muted))', border: 'hsl(var(--border))' };
}

function EventContent({ eventInfo }: { eventInfo: EventContentArg }) {
  const { extendedProps, title } = eventInfo.event;
  const typeIcon = extendedProps.type === 'tarea'    ? '📋' :
                   extendedProps.type === 'documento' ? '📄' :
                   extendedProps.type === 'programa'  ? '🏭' : '⚖️';
  return (
    <div className="flex items-center gap-1 px-1.5 py-0.5 w-full overflow-hidden text-[11px] font-medium leading-tight">
      <span className="shrink-0 text-[10px]">{typeIcon}</span>
      <span className="truncate">{title}</span>
    </div>
  );
}

export default function DashboardCalendar({ onEventClick, height = '580px' }: DashboardCalendarProps) {
  const { user, role } = useAuth();
  const calRef = useRef<FullCalendar>(null);
  const [events, setEvents] = useState<FcEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date } | null>(null);
 const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedObId, setSelectedObId] = useState<string | null>(null);
  const [empresas, setEmpresas] = useState<{ id: string; razon_social: string }[]>([]);
  const [filterEmpresaId, setFilterEmpresaId] = useState<string>('all');

  useEffect(() => {
    supabase
      .from('empresas')
      .select('id, razon_social')
      .order('razon_social')
      .then(({ data }) => setEmpresas(data || []));
  }, []);

  const fetchEvents = useCallback(async (start: Date, end: Date) => {
    if (!user) return;
    setLoading(true);

    const startStr = format(start, 'yyyy-MM-dd');
    const endStr   = format(end,   'yyyy-MM-dd');
    const allEvents: FcEvent[] = [];
    const today = startOfDay(new Date());

    const { data: obs } = await supabase
      .from('obligaciones')
      .select('id, nombre, empresa_id, categoria, fecha_vencimiento, empresas(razon_social)')
      .eq('activa', true)
      .gte('fecha_vencimiento', startStr)
      .lte('fecha_vencimiento', endStr);

    (obs || []).forEach(ob => {
      const d = new Date(ob.fecha_vencimiento + 'T12:00:00');
      const overdue = d < today;
      const { bg, border } = eventColor('obligacion', undefined, overdue);
      allEvents.push({
        id: `ob-${ob.id}`,
        title: `${ob.nombre}${ob.empresas?.razon_social ? ` · ${ob.empresas.razon_social}` : ''}`,
        start: ob.fecha_vencimiento,
        backgroundColor: bg,
        borderColor: border,
        textColor: 'hsl(var(--foreground))',
        extendedProps: { type: 'obligacion', rawId: ob.id, empresaId: ob.empresa_id, data: ob },
      });
    });

    const { data: tareas } = await supabase
      .from('tareas')
      .select('id, titulo, prioridad, estado, fecha_vencimiento, empresa_id, empresas(razon_social)')
      .not('estado', 'in', '(completada,cancelada)')
      .gte('fecha_vencimiento', startStr)
      .lte('fecha_vencimiento', endStr);

    (tareas || []).forEach(t => {
      const d = new Date(t.fecha_vencimiento + 'T12:00:00');
      const overdue = d < today;
      const { bg, border } = eventColor('tarea', t.prioridad, overdue);
      allEvents.push({
        id: `tarea-${t.id}`,
        title: t.titulo,
        start: t.fecha_vencimiento,
        backgroundColor: bg,
        borderColor: border,
        textColor: 'hsl(var(--foreground))',
        extendedProps: { type: 'tarea', rawId: t.id, prioridad: t.prioridad, estado: t.estado, data: t },
      });
    });

    const { data: docs } = await supabase
      .from('documentos')
      .select('id, nombre, empresa_id, fecha_vencimiento, empresas(razon_social)')
      .not('fecha_vencimiento', 'is', null)
      .gte('fecha_vencimiento', startStr)
      .lte('fecha_vencimiento', endStr);

    (docs || []).forEach(doc => {
      const { bg, border } = eventColor('documento');
      allEvents.push({
        id: `doc-${doc.id}`,
        title: `${doc.nombre}${doc.empresas?.razon_social ? ` · ${doc.empresas.razon_social}` : ''}`,
        start: doc.fecha_vencimiento,
        backgroundColor: bg,
        borderColor: border,
        textColor: 'hsl(var(--foreground))',
        extendedProps: { type: 'documento', rawId: doc.id, empresaId: doc.empresa_id, data: doc },
      });
    });

    const { data: empresas } = await supabase
      .from('empresas')
      .select('id, razon_social, immex_fecha_fin, prosec_fecha_fin, cert_iva_ieps_fecha_vencimiento, matriz_seguridad_fecha_vencimiento');

    (empresas || []).forEach(e => {
      const progs = [
        { label: 'IMMEX',          date: e.immex_fecha_fin },
        { label: 'PROSEC',         date: e.prosec_fecha_fin },
        { label: 'Cert. IVA/IEPS', date: e.cert_iva_ieps_fecha_vencimiento },
        { label: 'Matriz Seg.',    date: e.matriz_seguridad_fecha_vencimiento },
      ];
      progs.forEach(({ label, date }) => {
        if (!date || date < startStr || date > endStr) return;
        const overdue = new Date(date + 'T12:00:00') < today;
        const { bg, border } = eventColor('programa', undefined, overdue);
        allEvents.push({
          id: `prog-${label}-${e.id}`,
          title: `${label} · ${e.razon_social}`,
          start: date,
          backgroundColor: bg,
          borderColor: border,
          textColor: 'hsl(var(--foreground))',
          extendedProps: { type: 'programa', empresaId: e.id, data: { tipo: label, empresa: e } },
        });
      });
    });

    const filtered = filterEmpresaId === 'all'
      ? allEvents
      : allEvents.filter(e => e.extendedProps.empresaId === filterEmpresaId);

    setEvents(filtered);
    setLoading(false);
  }, [user, filterEmpresaId]);

  const handleDatesSet = useCallback((arg: DatesSetArg) => {
    setDateRange({ start: arg.start, end: arg.end });
    fetchEvents(arg.start, arg.end);
  }, [fetchEvents]);

  const handleEventClick = useCallback((arg: EventClickArg) => {
    const { extendedProps } = arg.event;
    if (extendedProps.type === 'obligacion' && extendedProps.rawId) {
      setSelectedObId(extendedProps.rawId);
      setSheetOpen(true);
      return;
    }
    if (onEventClick) {
      onEventClick({ id: arg.event.id, title: arg.event.title, start: arg.event.start, end: arg.event.end, resource: extendedProps });
    } else {
      toast.info(arg.event.title, { description: `${extendedProps.type} · ${arg.event.start?.toLocaleDateString('es-MX')}` });
    }
  }, [onEventClick]);

  if (!user) return null;

  return (
    <>
      <Card className="gradient-card shadow-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-heading flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Calendario de Vencimientos
              </CardTitle>
              <CardDescription className="font-body">
                Obligaciones, tareas y programas · click para ver detalle
              </CardDescription>
            </div>
            {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />}
          </div>
          {empresas.length > 1 && (
            <div className="mt-3">
              <Select value={filterEmpresaId} onValueChange={(v) => {
                setFilterEmpresaId(v);
                if (dateRange) fetchEvents(dateRange.start, dateRange.end);
              }}>
                <SelectTrigger className="w-[220px] h-8 text-xs gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                  <SelectValue placeholder="Todas las empresas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las empresas</SelectItem>
                  {empresas.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.razon_social}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex flex-wrap gap-2 mt-2">
            
            {[
              { label: 'Vencido',    color: 'hsl(0 84% 60%)' },
              { label: 'Obligación', color: 'hsl(262 83% 58%)' },
              { label: 'Tarea alta', color: 'hsl(25 95% 53%)' },
              { label: 'Documento',  color: 'hsl(221 83% 53%)' },
              { label: 'Programa',   color: 'hsl(340 82% 52%)' },
            ].map(({ label, color }) => (
              <span key={label} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                {label}
              </span>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <div style={{ height }}>
            <FullCalendar
              ref={calRef}
              plugins={[dayGridPlugin, listPlugin, interactionPlugin]}
              locale={esLocale}
              initialView="dayGridMonth"
              headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,listMonth' }}
              buttonText={{ today: 'Hoy', month: 'Mes', listMonth: 'Agenda' }}
              events={events}
              eventContent={(info) => <EventContent eventInfo={info} />}
              eventClick={handleEventClick}
              datesSet={handleDatesSet}
              height="100%"
              dayMaxEvents={3}
              moreLinkText={n => `+${n} más`}
              nowIndicator
              eventDisplay="block"
              eventBorderWidth={0}
            />
          </div>
        </CardContent>
      </Card>

      <ObligacionDetailSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        obligacionId={selectedObId}
        onCumplimientoChange={() => { if (dateRange) fetchEvents(dateRange.start, dateRange.end); }}
      />

      <style>{`
        .fc { font-family: inherit; }
        .fc .fc-toolbar-title { font-size: 1.1rem; font-weight: 700; }
        .fc .fc-button {
          background: hsl(var(--background)) !important;
          border: 1px solid hsl(var(--border)) !important;
          color: hsl(var(--muted-foreground)) !important;
          border-radius: 9999px !important;
          padding: 5px 14px !important;
          font-size: 0.78rem !important;
          font-weight: 500 !important;
          box-shadow: none !important;
          transition: all 0.15s !important;
        }
        .fc .fc-button:hover { background: hsl(var(--muted)) !important; color: hsl(var(--foreground)) !important; }
        .fc .fc-button-active, .fc .fc-button-primary:not(:disabled).fc-button-active {
          background: hsl(var(--primary)) !important;
          color: hsl(var(--primary-foreground)) !important;
          border-color: hsl(var(--primary)) !important;
        }
        .fc .fc-button-group { gap: 3px; }
        .fc .fc-col-header-cell { background: transparent; }
        .fc .fc-col-header-cell-cushion {
          font-size: 0.68rem; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.06em;
          color: hsl(var(--muted-foreground)); padding: 8px 4px;
        }
        .fc .fc-daygrid-day { background: hsl(var(--card)); }
        .fc .fc-daygrid-day:hover { background: hsl(var(--muted) / 0.4); }
        .fc .fc-daygrid-day.fc-day-today { background: hsl(var(--primary) / 0.05); }
        .fc .fc-daygrid-day-number { font-size: 0.78rem; color: hsl(var(--foreground)); font-weight: 500; padding: 4px 6px; }
        .fc .fc-day-today .fc-daygrid-day-number { color: hsl(var(--primary)); font-weight: 700; }
        .fc td, .fc th { border-color: hsl(var(--border) / 0.5) !important; }
        .fc .fc-scrollgrid { border-color: hsl(var(--border) / 0.5) !important; border-radius: var(--radius); overflow: hidden; }
        .fc-event { border-radius: 5px !important; border-left-width: 3px !important; cursor: pointer !important; }
        .fc-event:hover { opacity: 0.85; transform: translateY(-1px); transition: all 0.1s; }
        .fc .fc-list-event:hover td { background: hsl(var(--muted) / 0.4) !important; cursor: pointer; }
        .fc .fc-list-day-cushion { background: hsl(var(--muted) / 0.6) !important; }
        .fc .fc-list-event-dot { border-radius: 50% !important; }
        .fc .fc-more-link { font-size: 0.72rem; color: hsl(var(--primary)); font-weight: 600; }
        .fc .fc-popover { background: hsl(var(--card)); border: 1px solid hsl(var(--border)); border-radius: var(--radius); box-shadow: 0 8px 24px hsl(var(--foreground) / 0.12); }
        .fc .fc-popover-header { background: hsl(var(--muted) / 0.5); border-radius: var(--radius) var(--radius) 0 0; }
      `}</style>
    </>
  );
}

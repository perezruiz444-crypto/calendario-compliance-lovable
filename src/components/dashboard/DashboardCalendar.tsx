import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar as BigCalendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Calendar, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const localizer = momentLocalizer(moment);

// Generate recurring dates within a range (up to 1 year ahead)
function generateRecurringDates(
  startDateStr: string,
  endDateStr: string | null,
  frecuencia: string,
  intervalo: number
): Date[] {
  const dates: Date[] = [];
  const start = new Date(startDateStr + 'T12:00:00');
  const now = new Date();
  const maxDate = endDateStr 
    ? new Date(endDateStr + 'T12:00:00') 
    : new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
  
  let current = new Date(start);
  const maxOccurrences = 365;
  let count = 0;

  while (current <= maxDate && count < maxOccurrences) {
    dates.push(new Date(current));
    count++;
    
    switch (frecuencia) {
      case 'diaria':
        current.setDate(current.getDate() + intervalo);
        break;
      case 'semanal':
        current.setDate(current.getDate() + 7 * intervalo);
        break;
      case 'quincenal':
        current.setDate(current.getDate() + 14 * intervalo);
        break;
      case 'mensual':
        current.setMonth(current.getMonth() + intervalo);
        break;
      case 'trimestral':
        current.setMonth(current.getMonth() + 3 * intervalo);
        break;
      case 'anual':
        current.setFullYear(current.getFullYear() + intervalo);
        break;
      default:
        current.setMonth(current.getMonth() + intervalo);
    }
  }

  return dates;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: {
    type: 'tarea' | 'documento' | 'programa';
    prioridad?: string;
    estado?: string;
    data: any;
  };
}

interface DashboardCalendarProps {
  onEventClick?: (event: CalendarEvent) => void;
  height?: string;
}

export default function DashboardCalendar({ onEventClick, height = '500px' }: DashboardCalendarProps) {
  const { user, role } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && role) {
      fetchCalendarEvents();
    }
  }, [user, role]);

  const fetchCalendarEvents = async () => {
    setLoading(true);
    try {
      const allEvents: CalendarEvent[] = [];

      // Fetch tareas
      const { data: tareas, error: tareasError } = await supabase
        .from('tareas')
        .select(`
          *,
          empresas(razon_social)
        `)
        .not('fecha_vencimiento', 'is', null)
        .order('fecha_vencimiento', { ascending: true });

      if (tareasError) throw tareasError;

      if (tareas) {
        tareas.forEach(tarea => {
          if (tarea.fecha_vencimiento) {
            const baseDate = new Date(tarea.fecha_vencimiento + 'T12:00:00');
            
            // If recurring, generate occurrences within a reasonable range
            if (tarea.es_recurrente && tarea.frecuencia_recurrencia) {
              const occurrences = generateRecurringDates(
                tarea.fecha_inicio_recurrencia || tarea.fecha_vencimiento,
                tarea.fecha_fin_recurrencia,
                tarea.frecuencia_recurrencia,
                tarea.intervalo_recurrencia || 1
              );
              occurrences.forEach((occDate, idx) => {
                allEvents.push({
                  id: `${tarea.id}-rec-${idx}`,
                  title: `🔄 ${tarea.titulo}`,
                  start: occDate,
                  end: occDate,
                  resource: {
                    type: 'tarea',
                    prioridad: tarea.prioridad,
                    estado: tarea.estado,
                    data: tarea
                  }
                });
              });
            } else {
              allEvents.push({
                id: tarea.id,
                title: `📋 ${tarea.titulo}`,
                start: baseDate,
                end: baseDate,
                resource: {
                  type: 'tarea',
                  prioridad: tarea.prioridad,
                  estado: tarea.estado,
                  data: tarea
                }
              });
            }
          }
        });
      }

      // Fetch documentos vencimiento
      const { data: documentos, error: docsError } = await supabase
        .from('documentos')
        .select(`
          *,
          empresas(razon_social)
        `)
        .not('fecha_vencimiento', 'is', null);

      if (docsError) throw docsError;

      if (documentos) {
        documentos.forEach(doc => {
          if (doc.fecha_vencimiento) {
            allEvents.push({
              id: doc.id,
              title: `📄 ${doc.nombre}`,
              start: new Date(doc.fecha_vencimiento + 'T12:00:00'),
              end: new Date(doc.fecha_vencimiento + 'T12:00:00'),
              resource: {
                type: 'documento',
                data: doc
              }
            });
          }
        });
      }

      // Fetch empresas programas vencimiento
      const { data: empresas, error: empresasError } = await supabase
        .from('empresas')
        .select('*');

      if (empresasError) throw empresasError;

      if (empresas) {
        empresas.forEach(empresa => {
          // IMMEX
          if (empresa.immex_fecha_fin) {
            allEvents.push({
              id: `immex-${empresa.id}`,
              title: `🏭 IMMEX - ${empresa.razon_social}`,
              start: new Date(empresa.immex_fecha_fin + 'T12:00:00'),
              end: new Date(empresa.immex_fecha_fin + 'T12:00:00'),
              resource: {
                type: 'programa',
                data: { tipo: 'IMMEX', empresa }
              }
            });
          }

          // PROSEC
          if (empresa.prosec_fecha_fin) {
            allEvents.push({
              id: `prosec-${empresa.id}`,
              title: `📊 PROSEC - ${empresa.razon_social}`,
              start: new Date(empresa.prosec_fecha_fin + 'T12:00:00'),
              end: new Date(empresa.prosec_fecha_fin + 'T12:00:00'),
              resource: {
                type: 'programa',
                data: { tipo: 'PROSEC', empresa }
              }
            });
          }

          // Certificación IVA/IEPS
          if (empresa.cert_iva_ieps_fecha_vencimiento) {
            allEvents.push({
              id: `cert-${empresa.id}`,
              title: `🛡️ Cert. IVA/IEPS - ${empresa.razon_social}`,
              start: new Date(empresa.cert_iva_ieps_fecha_vencimiento + 'T12:00:00'),
              end: new Date(empresa.cert_iva_ieps_fecha_vencimiento + 'T12:00:00'),
              resource: {
                type: 'programa',
                data: { tipo: 'Certificación', empresa }
              }
            });
          }

          // Matriz Seguridad
          if (empresa.matriz_seguridad_fecha_vencimiento) {
            allEvents.push({
              id: `matriz-${empresa.id}`,
              title: `🔐 Matriz Seg. - ${empresa.razon_social}`,
              start: new Date(empresa.matriz_seguridad_fecha_vencimiento + 'T12:00:00'),
              end: new Date(empresa.matriz_seguridad_fecha_vencimiento + 'T12:00:00'),
              resource: {
                type: 'programa',
                data: { tipo: 'Matriz Seguridad', empresa }
              }
            });
          }
        });
      }

      setEvents(allEvents);
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los eventos del calendario',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const eventStyleGetter = (event: CalendarEvent) => {
    let backgroundColor = 'hsl(var(--primary))';
    
    if (event.resource.type === 'tarea') {
      const prioridad = event.resource.prioridad;
      if (prioridad === 'urgente') {
        backgroundColor = 'hsl(var(--destructive))';
      } else if (prioridad === 'alta') {
        backgroundColor = 'hsl(25, 95%, 53%)';
      } else if (prioridad === 'media') {
        backgroundColor = 'hsl(var(--warning))';
      } else if (prioridad === 'baja') {
        backgroundColor = 'hsl(var(--success))';
      }
    } else if (event.resource.type === 'documento') {
      backgroundColor = 'hsl(221, 83%, 53%)';
    } else if (event.resource.type === 'programa') {
      backgroundColor = 'hsl(340, 82%, 52%)';
    }

    // Check if overdue
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eventDate = new Date(event.start);
    eventDate.setHours(0, 0, 0, 0);
    
    if (eventDate < today) {
      backgroundColor = 'hsl(var(--destructive))';
    }
    
    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.9,
        color: 'white',
        border: 'none',
        display: 'block',
        fontSize: '0.875rem'
      }
    };
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    if (onEventClick) {
      onEventClick(event);
    } else {
      // Default behavior - show toast with event info
      const eventInfo = event.resource.type === 'tarea' 
        ? `Tarea: ${event.title}\nEstado: ${event.resource.estado}\nPrioridad: ${event.resource.prioridad}`
        : event.resource.type === 'documento'
        ? `Documento: ${event.title}\nVence: ${event.start.toLocaleDateString()}`
        : `Programa: ${event.title}\nVence: ${event.start.toLocaleDateString()}`;
      
      toast({
        title: 'Evento del Calendario',
        description: eventInfo
      });
    }
  };

  if (loading) {
    return (
      <Card className="gradient-card shadow-card">
        <CardHeader>
          <CardTitle className="font-heading flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Calendario
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center" style={{ height }}>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="gradient-card shadow-card">
      <CardHeader>
        <CardTitle className="font-heading flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Calendario de Eventos
        </CardTitle>
        <CardDescription className="font-body">
          Tareas, vencimientos de documentos y programas
        </CardDescription>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground font-body">
              No hay eventos programados
            </p>
          </div>
        ) : (
          <div style={{ height }}>
            <BigCalendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              onSelectEvent={handleSelectEvent}
              views={['month', 'week', 'day', 'agenda']}
              defaultView="month"
              style={{ height: '100%' }}
              messages={{
                next: 'Siguiente',
                previous: 'Anterior',
                today: 'Hoy',
                month: 'Mes',
                week: 'Semana',
                day: 'Día',
                agenda: 'Agenda',
                date: 'Fecha',
                time: 'Hora',
                event: 'Evento',
                noEventsInRange: 'No hay eventos en este rango',
                allDay: 'Todo el día',
                showMore: (total) => `+${total} más`,
              }}
              eventPropGetter={eventStyleGetter}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

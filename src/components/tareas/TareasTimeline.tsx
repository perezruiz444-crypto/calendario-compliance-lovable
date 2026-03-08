import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format, differenceInDays, startOfDay, addDays, isBefore, isAfter, isSameDay, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { AlertCircle, CheckCircle2, Clock, Circle } from 'lucide-react';

interface TareasTimelineProps {
  tareas: any[];
  onTareaClick: (tareaId: string) => void;
}

const ESTADO_CONFIG: Record<string, { icon: typeof Circle; color: string; bg: string }> = {
  pendiente: { icon: Clock, color: 'text-warning', bg: 'bg-warning/15' },
  en_progreso: { icon: Circle, color: 'text-primary', bg: 'bg-primary/15' },
  completada: { icon: CheckCircle2, color: 'text-success', bg: 'bg-success/15' },
  cancelada: { icon: AlertCircle, color: 'text-destructive', bg: 'bg-destructive/15' },
};

const PRIORIDAD_COLORS: Record<string, string> = {
  alta: 'hsl(var(--destructive))',
  media: 'hsl(var(--warning))',
  baja: 'hsl(var(--success))',
};

export function TareasTimeline({ tareas, onTareaClick }: TareasTimelineProps) {
  const { timelineTareas, dateRange, dayWidth, totalDays } = useMemo(() => {
    const tareasWithDates = tareas.filter(t => t.fecha_vencimiento || t.created_at);
    if (tareasWithDates.length === 0) {
      return { timelineTareas: [], dateRange: [], dayWidth: 40, totalDays: 0 };
    }

    const now = startOfDay(new Date());
    
    // Calculate range: from earliest created_at to latest fecha_vencimiento (or +30 days)
    let minDate = now;
    let maxDate = addDays(now, 30);

    tareasWithDates.forEach(t => {
      const created = startOfDay(new Date(t.created_at));
      const due = t.fecha_vencimiento ? startOfDay(parseISO(t.fecha_vencimiento)) : null;
      if (isBefore(created, minDate)) minDate = created;
      if (due && isAfter(due, maxDate)) maxDate = due;
    });

    // Add padding
    minDate = addDays(minDate, -2);
    maxDate = addDays(maxDate, 5);

    const totalDays = differenceInDays(maxDate, minDate) + 1;
    const dayWidth = 40;

    const dateRange: Date[] = [];
    for (let i = 0; i < totalDays; i++) {
      dateRange.push(addDays(minDate, i));
    }

    // Sort tasks by created_at
    const sorted = [...tareasWithDates].sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    const timelineTareas = sorted.map(t => {
      const start = startOfDay(new Date(t.created_at));
      const end = t.fecha_vencimiento ? startOfDay(parseISO(t.fecha_vencimiento)) : addDays(start, 3);
      const startOffset = Math.max(0, differenceInDays(start, minDate));
      const duration = Math.max(1, differenceInDays(end, start) + 1);
      const isOverdue = t.fecha_vencimiento && isBefore(parseISO(t.fecha_vencimiento), now) && t.estado !== 'completada';

      return { ...t, startOffset, duration, isOverdue };
    });

    return { timelineTareas, dateRange, dayWidth, totalDays };
  }, [tareas]);

  const todayOffset = useMemo(() => {
    if (dateRange.length === 0) return -1;
    const now = startOfDay(new Date());
    return dateRange.findIndex(d => isSameDay(d, now));
  }, [dateRange]);

  const getInitials = (name: string) =>
    name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  if (timelineTareas.length === 0) {
    return (
      <Card className="gradient-card shadow-card">
        <CardContent className="py-12 text-center text-muted-foreground">
          <Clock className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">Sin tareas para mostrar en timeline</p>
          <p className="text-xs mt-1">Las tareas aparecerán aquí cuando tengan fechas</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="gradient-card shadow-card">
      <CardHeader>
        <CardTitle className="font-heading flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Timeline de Tareas
        </CardTitle>
        <CardDescription>{timelineTareas.length} tareas con fechas</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="w-full">
          <div className="min-w-max">
            {/* Header: date labels */}
            <div className="flex border-b sticky top-0 bg-card z-10">
              <div className="w-[220px] min-w-[220px] border-r px-3 py-2 text-xs font-heading font-medium text-muted-foreground">
                Tarea
              </div>
              <div className="flex">
                {dateRange.map((date, i) => {
                  const isToday = i === todayOffset;
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                  const isFirstOfMonth = date.getDate() === 1;
                  return (
                    <div
                      key={i}
                      className={`flex flex-col items-center justify-center border-r text-[10px] ${
                        isToday ? 'bg-primary/10 font-bold text-primary' : 
                        isWeekend ? 'bg-muted/40 text-muted-foreground' : 'text-muted-foreground'
                      } ${isFirstOfMonth ? 'border-l-2 border-l-primary/30' : ''}`}
                      style={{ width: dayWidth, minWidth: dayWidth }}
                    >
                      {(i === 0 || isFirstOfMonth || date.getDate() % 5 === 0) && (
                        <span className="font-medium">{format(date, 'dd', { locale: es })}</span>
                      )}
                      {(i === 0 || isFirstOfMonth) && (
                        <span className="uppercase text-[8px]">{format(date, 'MMM', { locale: es })}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Rows */}
            {timelineTareas.map((tarea) => {
              const config = ESTADO_CONFIG[tarea.estado] || ESTADO_CONFIG.pendiente;
              const Icon = config.icon;
              const barColor = PRIORIDAD_COLORS[tarea.prioridad] || PRIORIDAD_COLORS.media;

              return (
                <div key={tarea.id} className="flex border-b hover:bg-accent/30 transition-colors group">
                  {/* Task label */}
                  <div
                    className="w-[220px] min-w-[220px] border-r px-3 py-2 flex items-center gap-2 cursor-pointer"
                    onClick={() => onTareaClick(tarea.id)}
                  >
                    <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${config.color}`} />
                    <span className="text-xs font-medium truncate flex-1">{tarea.titulo}</span>
                    {tarea.isOverdue && (
                      <AlertCircle className="w-3 h-3 text-destructive flex-shrink-0" />
                    )}
                  </div>

                  {/* Timeline bar */}
                  <div className="flex relative" style={{ minHeight: 36 }}>
                    {/* Grid cells */}
                    {dateRange.map((date, i) => {
                      const isToday = i === todayOffset;
                      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                      return (
                        <div
                          key={i}
                          className={`border-r ${
                            isToday ? 'bg-primary/5' : isWeekend ? 'bg-muted/20' : ''
                          }`}
                          style={{ width: dayWidth, minWidth: dayWidth }}
                        />
                      );
                    })}

                    {/* Today indicator line */}
                    {todayOffset >= 0 && (
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-primary/60 z-10"
                        style={{ left: todayOffset * dayWidth + dayWidth / 2 }}
                      />
                    )}

                    {/* Task bar */}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className="absolute top-1.5 h-5 rounded-full cursor-pointer transition-all hover:scale-y-125 hover:shadow-md"
                            style={{
                              left: tarea.startOffset * dayWidth + 4,
                              width: Math.max(dayWidth - 8, tarea.duration * dayWidth - 8),
                              backgroundColor: `color-mix(in srgb, ${barColor} 25%, transparent)`,
                              border: `2px solid ${barColor}`,
                            }}
                            onClick={() => onTareaClick(tarea.id)}
                          >
                            {tarea.duration > 2 && (
                              <span className="text-[9px] font-medium truncate px-2 leading-4 block" style={{ color: barColor }}>
                                {tarea.titulo}
                              </span>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[250px]">
                          <div className="space-y-1">
                            <p className="font-medium text-sm">{tarea.titulo}</p>
                            <div className="flex gap-2 text-xs">
                              <Badge variant="outline" className={`text-[10px] ${config.bg} ${config.color}`}>
                                {tarea.estado}
                              </Badge>
                              <span>{tarea.prioridad}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(tarea.created_at), 'dd MMM', { locale: es })}
                              {tarea.fecha_vencimiento && ` → ${format(parseISO(tarea.fecha_vencimiento), 'dd MMM', { locale: es })}`}
                            </p>
                            {tarea.isOverdue && (
                              <p className="text-xs text-destructive font-medium">⚠ Vencida</p>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

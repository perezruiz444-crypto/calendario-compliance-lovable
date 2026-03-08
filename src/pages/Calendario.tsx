import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DashboardCalendar from '@/components/dashboard/DashboardCalendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar as CalendarIcon } from 'lucide-react';

export default function Calendario() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <DashboardLayout currentPage="/calendario">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground mb-2">
            Calendario de Eventos
          </h1>
          <p className="text-muted-foreground font-body">
            Vista completa de tareas, vencimientos y eventos importantes
          </p>
        </div>

        {/* Dashboard Calendar */}
        <DashboardCalendar 
          height="700px"
          onEventClick={(event) => {
            if (event.resource.type === 'tarea') {
              navigate('/tareas');
            } else if (event.resource.type === 'documento') {
              navigate(`/empresas/${event.resource.data.empresa_id}`);
            } else if (event.resource.type === 'programa') {
              navigate(`/empresas/${event.resource.data.empresa.id}`);
            }
          }}
        />

        {/* Legend as inline chips */}
        <div className="flex flex-wrap items-center gap-3 px-1">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Leyenda:</span>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-destructive/10 text-destructive border border-destructive/20">
              <span className="w-2 h-2 rounded-full bg-destructive" />
              Urgente / Vencida
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: 'hsl(25, 95%, 53%, 0.1)', color: 'hsl(25, 95%, 40%)', border: '1px solid hsl(25, 95%, 53%, 0.2)' }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'hsl(25, 95%, 53%)' }} />
              Alta Prioridad
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-warning/10 text-warning border border-warning/20">
              <span className="w-2 h-2 rounded-full bg-warning" />
              Media Prioridad
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-success/10 text-success border border-success/20">
              <span className="w-2 h-2 rounded-full bg-success" />
              Baja Prioridad
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: 'hsl(221, 83%, 53%, 0.1)', color: 'hsl(221, 83%, 40%)', border: '1px solid hsl(221, 83%, 53%, 0.2)' }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'hsl(221, 83%, 53%)' }} />
              Documentos
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: 'hsl(340, 82%, 52%, 0.1)', color: 'hsl(340, 82%, 40%)', border: '1px solid hsl(340, 82%, 52%, 0.2)' }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'hsl(340, 82%, 52%)' }} />
              Programas / Certificaciones
            </span>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

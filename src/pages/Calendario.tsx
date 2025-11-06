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

        {/* Legend */}
        <Card className="gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="font-heading text-lg">Leyenda de Colores</CardTitle>
            <CardDescription className="font-body">
              Tipos de eventos en el calendario
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(var(--destructive))' }}></div>
                <span className="text-sm font-body">Tareas Urgentes / Vencidas</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(25, 95%, 53%)' }}></div>
                <span className="text-sm font-body">Tareas Alta Prioridad</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(var(--warning))' }}></div>
                <span className="text-sm font-body">Tareas Media Prioridad</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(var(--success))' }}></div>
                <span className="text-sm font-body">Tareas Baja Prioridad</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(221, 83%, 53%)' }}></div>
                <span className="text-sm font-body">Documentos</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(340, 82%, 52%)' }}></div>
                <span className="text-sm font-body">Programas / Certificaciones</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

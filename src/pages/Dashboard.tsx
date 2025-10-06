import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, CheckSquare, Users, TrendingUp } from 'lucide-react';

export default function Dashboard() {
  const { user, role, loading } = useAuth();
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

  const stats = [
    {
      title: 'Empresas',
      value: '0',
      description: 'Empresas registradas',
      icon: Building2,
      color: 'text-primary',
      bgColor: 'bg-primary-light',
    },
    {
      title: 'Tareas',
      value: '0',
      description: 'Tareas pendientes',
      icon: CheckSquare,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
    {
      title: 'Usuarios',
      value: '0',
      description: 'Usuarios activos',
      icon: Users,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      title: 'Cumplimiento',
      value: '0%',
      description: 'Promedio de cumplimiento',
      icon: TrendingUp,
      color: 'text-primary',
      bgColor: 'bg-primary-light',
    },
  ];

  return (
    <DashboardLayout currentPage="/dashboard">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground mb-2">
            Dashboard
          </h1>
          <p className="text-muted-foreground font-body">
            Bienvenido al sistema de gestión de consultoría
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} className="gradient-card shadow-elegant hover:shadow-card transition-smooth">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-heading font-medium">
                    {stat.title}
                  </CardTitle>
                  <div className={`${stat.bgColor} p-2 rounded-lg`}>
                    <Icon className={`w-4 h-4 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-heading font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground font-body mt-1">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="font-heading">Actividad Reciente</CardTitle>
            <CardDescription className="font-body">
              Las últimas actualizaciones del sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground font-body">
              <p>No hay actividad reciente para mostrar</p>
              <p className="text-sm mt-2">Las actividades aparecerán aquí cuando comiences a usar el sistema</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

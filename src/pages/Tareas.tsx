import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, CheckSquare } from 'lucide-react';

export default function Tareas() {
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
    <DashboardLayout currentPage="/tareas">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground mb-2">
              Gestión de Tareas
            </h1>
            <p className="text-muted-foreground font-body">
              Administra y da seguimiento a las tareas
            </p>
          </div>
          <Button className="gradient-primary shadow-elegant hover:shadow-lg transition-smooth font-heading">
            <Plus className="w-4 h-4 mr-2" />
            Nueva Tarea
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="gradient-card shadow-elegant">
            <CardHeader>
              <CardTitle className="font-heading text-sm">Pendientes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-heading font-bold text-warning">0</div>
              <p className="text-xs text-muted-foreground font-body mt-1">tareas pendientes</p>
            </CardContent>
          </Card>

          <Card className="gradient-card shadow-elegant">
            <CardHeader>
              <CardTitle className="font-heading text-sm">En Progreso</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-heading font-bold text-primary">0</div>
              <p className="text-xs text-muted-foreground font-body mt-1">en progreso</p>
            </CardContent>
          </Card>

          <Card className="gradient-card shadow-elegant">
            <CardHeader>
              <CardTitle className="font-heading text-sm">Completadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-heading font-bold text-success">0</div>
              <p className="text-xs text-muted-foreground font-body mt-1">completadas</p>
            </CardContent>
          </Card>
        </div>

        <Card className="gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="font-heading">Todas las Tareas</CardTitle>
            <CardDescription className="font-body">
              Lista completa de tareas del sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <div className="mx-auto w-20 h-20 bg-primary-light rounded-2xl flex items-center justify-center mb-4">
                <CheckSquare className="w-10 h-10 text-primary" />
              </div>
              <p className="text-muted-foreground font-body mb-4">
                No hay tareas registradas todavía
              </p>
              <Button className="gradient-primary shadow-elegant font-heading">
                <Plus className="w-4 h-4 mr-2" />
                Crear Primera Tarea
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

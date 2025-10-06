import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Building2 } from 'lucide-react';

export default function Empresas() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
    if (!loading && role && !['administrador', 'consultor'].includes(role)) {
      navigate('/dashboard');
    }
  }, [user, role, loading, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <DashboardLayout currentPage="/empresas">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground mb-2">
              Gestión de Empresas
            </h1>
            <p className="text-muted-foreground font-body">
              Administra las empresas y sus datos fiscales
            </p>
          </div>
          <Button className="gradient-primary shadow-elegant hover:shadow-lg transition-smooth font-heading">
            <Plus className="w-4 h-4 mr-2" />
            Nueva Empresa
          </Button>
        </div>

        <Card className="gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="font-heading">Empresas Registradas</CardTitle>
            <CardDescription className="font-body">
              Lista de todas las empresas en el sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <div className="mx-auto w-20 h-20 bg-primary-light rounded-2xl flex items-center justify-center mb-4">
                <Building2 className="w-10 h-10 text-primary" />
              </div>
              <p className="text-muted-foreground font-body mb-4">
                No hay empresas registradas todavía
              </p>
              <Button className="gradient-primary shadow-elegant font-heading">
                <Plus className="w-4 h-4 mr-2" />
                Registrar Primera Empresa
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

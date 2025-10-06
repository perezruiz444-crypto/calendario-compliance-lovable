import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Building2, CheckSquare, Users, TrendingUp, ArrowRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const features = [
    {
      icon: Building2,
      title: 'Gestión de Empresas',
      description: 'Administra empresas, datos fiscales y documentación de cumplimiento',
    },
    {
      icon: CheckSquare,
      title: 'Control de Tareas',
      description: 'Asigna y da seguimiento a tareas con prioridades y fechas límite',
    },
    {
      icon: Users,
      title: 'Gestión de Usuarios',
      description: 'Roles definidos para administradores, consultores y clientes',
    },
    {
      icon: TrendingUp,
      title: 'Reportes y Analytics',
      description: 'Genera reportes personalizados y monitorea el progreso',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/10">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary rounded-3xl shadow-card mb-6">
            <Building2 className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-5xl md:text-6xl font-heading font-bold text-foreground mb-6">
            Sistema ERP de Consultoría
          </h1>
          <p className="text-xl text-muted-foreground font-body mb-8 max-w-2xl mx-auto">
            Plataforma integral para la gestión de consultoría de cumplimiento regulatorio. 
            Administra empresas, tareas y usuarios en un solo lugar.
          </p>
          <div className="flex gap-4 justify-center">
            <Button 
              size="lg" 
              className="gradient-primary shadow-elegant hover:shadow-lg transition-smooth font-heading"
              onClick={() => navigate('/auth')}
            >
              Iniciar Sesión
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="font-heading shadow-elegant hover:shadow-md transition-smooth"
              onClick={() => navigate('/auth')}
            >
              Registrarse
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div 
                key={feature.title}
                className="bg-card rounded-2xl p-6 shadow-card hover:shadow-xl transition-smooth gradient-card"
              >
                <div className="w-12 h-12 bg-primary-light rounded-xl flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-heading font-semibold text-lg mb-2 text-foreground">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground font-body text-sm">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Index;

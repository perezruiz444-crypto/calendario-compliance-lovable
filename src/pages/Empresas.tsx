import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Building2, Users, Pencil } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import CreateEmpresaDialog from '@/components/empresas/CreateEmpresaDialog';
import ManageConsultoresDialog from '@/components/empresas/ManageConsultoresDialog';
import EditEmpresaDialog from '@/components/empresas/EditEmpresaDialog';
import { Badge } from '@/components/ui/badge';

export default function Empresas() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [loadingEmpresas, setLoadingEmpresas] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [consultoresDialogOpen, setConsultoresDialogOpen] = useState(false);
  const [selectedEmpresa, setSelectedEmpresa] = useState<{ id: string; nombre: string } | null>(null);
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
    if (!loading && role && !['administrador', 'consultor'].includes(role)) {
      navigate('/dashboard');
    }
  }, [user, role, loading, navigate]);

  const fetchEmpresas = async () => {
    setLoadingEmpresas(true);
    try {
      const { data, error } = await supabase
        .from('empresas')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEmpresas(data || []);
    } catch (error) {
      console.error('Error fetching empresas:', error);
    } finally {
      setLoadingEmpresas(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchEmpresas();
    }
  }, [user]);

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
          <Button 
            onClick={() => setDialogOpen(true)}
            className="gradient-primary shadow-elegant hover:shadow-lg transition-smooth font-heading"
          >
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
            {loadingEmpresas ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : empresas.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                  <Building2 className="w-10 h-10 text-primary" />
                </div>
                <p className="text-muted-foreground font-body mb-4">
                  No hay empresas registradas todavía
                </p>
                <Button 
                  onClick={() => setDialogOpen(true)}
                  className="gradient-primary shadow-elegant font-heading"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Registrar Primera Empresa
                </Button>
              </div>
            ) : (
              <div className="grid gap-4">
                {empresas.map((empresa) => (
                  <div 
                    key={empresa.id} 
                    className="border rounded-lg p-4 hover:border-primary transition-colors hover-scale"
                  >
                    <div className="flex items-start justify-between">
                      <div 
                        className="space-y-1 flex-1 cursor-pointer"
                        onClick={() => navigate(`/empresas/${empresa.id}`)}
                      >
                        <h3 className="font-heading font-semibold text-lg">{empresa.razon_social}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground font-body">
                          <Badge variant="outline">{empresa.rfc}</Badge>
                          {empresa.telefono && <span>• {empresa.telefono}</span>}
                        </div>
                        <p className="text-sm text-muted-foreground font-body mt-2">
                          {empresa.domicilio_fiscal}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {role === 'administrador' && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="font-heading"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEmpresa({ id: empresa.id, nombre: empresa.razon_social });
                              setConsultoresDialogOpen(true);
                            }}
                          >
                            <Users className="w-4 h-4 mr-2" />
                            Consultores
                          </Button>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="font-heading"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEmpresaId(empresa.id);
                            setEditDialogOpen(true);
                          }}
                        >
                          <Pencil className="w-4 h-4 mr-2" />
                          Editar
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="font-heading"
                          onClick={() => navigate(`/empresas/${empresa.id}`)}
                        >
                          Ver Detalles
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <CreateEmpresaDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onEmpresaCreated={fetchEmpresas}
      />

      {selectedEmpresaId && (
        <EditEmpresaDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          empresaId={selectedEmpresaId}
          onEmpresaUpdated={fetchEmpresas}
        />
      )}

      {selectedEmpresa && (
        <ManageConsultoresDialog
          open={consultoresDialogOpen}
          onOpenChange={setConsultoresDialogOpen}
          empresaId={selectedEmpresa.id}
          empresaNombre={selectedEmpresa.nombre}
        />
      )}
    </DashboardLayout>
  );
}

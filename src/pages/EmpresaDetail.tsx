import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Building2, 
  FileText, 
  MapPin, 
  Users, 
  Ship, 
  ArrowLeft,
  Calendar,
  Phone,
  Hash
} from 'lucide-react';

export default function EmpresaDetail() {
  const { id } = useParams();
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const [empresa, setEmpresa] = useState<any>(null);
  const [domicilios, setDomicilios] = useState<any[]>([]);
  const [miembros, setMiembros] = useState<any[]>([]);
  const [agentes, setAgentes] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (id && user) {
      fetchEmpresaData();
    }
  }, [id, user]);

  const fetchEmpresaData = async () => {
    setLoadingData(true);
    try {
      // Fetch empresa
      const { data: empresaData, error: empresaError } = await supabase
        .from('empresas')
        .select('*')
        .eq('id', id)
        .single();

      if (empresaError) throw empresaError;
      setEmpresa(empresaData);

      // Fetch related data
      const [domiciliosRes, miembrosRes, agentesRes] = await Promise.all([
        supabase.from('domicilios_operacion').select('*').eq('empresa_id', id),
        supabase.from('miembros_socios').select('*').eq('empresa_id', id),
        supabase.from('agentes_aduanales').select('*').eq('empresa_id', id)
      ]);

      setDomicilios(domiciliosRes.data || []);
      setMiembros(miembrosRes.data || []);
      setAgentes(agentesRes.data || []);
    } catch (error: any) {
      toast.error('Error al cargar la empresa');
      console.error(error);
    } finally {
      setLoadingData(false);
    }
  };

  if (loading || loadingData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!empresa) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Empresa no encontrada</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout currentPage="/empresas">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/empresas')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-heading font-bold text-foreground mb-2">
              {empresa.razon_social}
            </h1>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Badge variant="outline">{empresa.rfc}</Badge>
              {empresa.telefono && (
                <span className="flex items-center gap-1">
                  <Phone className="w-4 h-4" />
                  {empresa.telefono}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="programas">Programas</TabsTrigger>
            <TabsTrigger value="domicilios">Domicilios</TabsTrigger>
            <TabsTrigger value="relacionados">Relacionados</TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general" className="space-y-4 animate-fade-in">
            <Card className="gradient-card shadow-card">
              <CardHeader>
                <CardTitle className="font-heading flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Información General
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-heading font-medium text-muted-foreground">Razón Social</label>
                  <p className="font-body mt-1">{empresa.razon_social}</p>
                </div>
                <div>
                  <label className="text-sm font-heading font-medium text-muted-foreground">RFC</label>
                  <p className="font-body mt-1">{empresa.rfc}</p>
                </div>
                <div>
                  <label className="text-sm font-heading font-medium text-muted-foreground">Domicilio Fiscal</label>
                  <p className="font-body mt-1">{empresa.domicilio_fiscal}</p>
                </div>
                {empresa.telefono && (
                  <div>
                    <label className="text-sm font-heading font-medium text-muted-foreground">Teléfono</label>
                    <p className="font-body mt-1">{empresa.telefono}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="gradient-card shadow-card">
              <CardHeader>
                <CardTitle className="font-heading">Acta Constitutiva</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {empresa.numero_escritura && (
                    <div>
                      <label className="text-sm font-heading font-medium text-muted-foreground">Número de Escritura</label>
                      <p className="font-body mt-1">{empresa.numero_escritura}</p>
                    </div>
                  )}
                  {empresa.fecha_constitucion && (
                    <div>
                      <label className="text-sm font-heading font-medium text-muted-foreground">Fecha de Constitución</label>
                      <p className="font-body mt-1">{new Date(empresa.fecha_constitucion).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>
                {empresa.datos_notario && (
                  <div>
                    <label className="text-sm font-heading font-medium text-muted-foreground">Datos del Notario</label>
                    <p className="font-body mt-1">{empresa.datos_notario}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="gradient-card shadow-card">
              <CardHeader>
                <CardTitle className="font-heading">Representante Legal</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {empresa.representante_legal_nombre && (
                  <div>
                    <label className="text-sm font-heading font-medium text-muted-foreground">Nombre</label>
                    <p className="font-body mt-1">{empresa.representante_legal_nombre}</p>
                  </div>
                )}
                {empresa.representante_legal_poder && (
                  <div>
                    <label className="text-sm font-heading font-medium text-muted-foreground">Número de Poder</label>
                    <p className="font-body mt-1">{empresa.representante_legal_poder}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Programas Tab */}
          <TabsContent value="programas" className="space-y-4 animate-fade-in">
            {/* IMMEX */}
            <Card className="gradient-card shadow-card">
              <CardHeader>
                <CardTitle className="font-heading flex items-center gap-2">
                  <Ship className="w-5 h-5" />
                  Programa IMMEX
                </CardTitle>
              </CardHeader>
              <CardContent>
                {empresa.immex_numero ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-heading font-medium text-muted-foreground">Número</label>
                        <p className="font-body mt-1">{empresa.immex_numero}</p>
                      </div>
                      <div>
                        <label className="text-sm font-heading font-medium text-muted-foreground">Tipo</label>
                        <p className="font-body mt-1 capitalize">{empresa.immex_tipo}</p>
                      </div>
                      {empresa.immex_fecha_inicio && (
                        <div>
                          <label className="text-sm font-heading font-medium text-muted-foreground">Fecha Inicio</label>
                          <p className="font-body mt-1">{new Date(empresa.immex_fecha_inicio).toLocaleDateString()}</p>
                        </div>
                      )}
                      {empresa.immex_fecha_fin && (
                        <div>
                          <label className="text-sm font-heading font-medium text-muted-foreground">Fecha Fin</label>
                          <p className="font-body mt-1">{new Date(empresa.immex_fecha_fin).toLocaleDateString()}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground font-body">No registrado</p>
                )}
              </CardContent>
            </Card>

            {/* PROSEC */}
            <Card className="gradient-card shadow-card">
              <CardHeader>
                <CardTitle className="font-heading">Programa PROSEC</CardTitle>
              </CardHeader>
              <CardContent>
                {empresa.prosec_numero ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-heading font-medium text-muted-foreground">Número</label>
                        <p className="font-body mt-1">{empresa.prosec_numero}</p>
                      </div>
                      <div>
                        <label className="text-sm font-heading font-medium text-muted-foreground">Sector</label>
                        <p className="font-body mt-1">{empresa.prosec_sector}</p>
                      </div>
                      {empresa.prosec_fecha_inicio && (
                        <div>
                          <label className="text-sm font-heading font-medium text-muted-foreground">Fecha Inicio</label>
                          <p className="font-body mt-1">{new Date(empresa.prosec_fecha_inicio).toLocaleDateString()}</p>
                        </div>
                      )}
                      {empresa.prosec_fecha_fin && (
                        <div>
                          <label className="text-sm font-heading font-medium text-muted-foreground">Fecha Fin</label>
                          <p className="font-body mt-1">{new Date(empresa.prosec_fecha_fin).toLocaleDateString()}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground font-body">No registrado</p>
                )}
              </CardContent>
            </Card>

            {/* Anexo 24 */}
            <Card className="gradient-card shadow-card">
              <CardHeader>
                <CardTitle className="font-heading">Anexo 24</CardTitle>
              </CardHeader>
              <CardContent>
                {empresa.anexo24_proveedor_software ? (
                  <div>
                    <label className="text-sm font-heading font-medium text-muted-foreground">Proveedor de Software</label>
                    <p className="font-body mt-1">{empresa.anexo24_proveedor_software}</p>
                  </div>
                ) : (
                  <p className="text-muted-foreground font-body">No registrado</p>
                )}
              </CardContent>
            </Card>

            {/* Padrón General */}
            <Card className="gradient-card shadow-card">
              <CardHeader>
                <CardTitle className="font-heading">Padrón de Importadores</CardTitle>
              </CardHeader>
              <CardContent>
                {empresa.padron_general_numero ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-heading font-medium text-muted-foreground">Número</label>
                      <p className="font-body mt-1">{empresa.padron_general_numero}</p>
                    </div>
                    <div>
                      <label className="text-sm font-heading font-medium text-muted-foreground">Estado</label>
                      <Badge variant={empresa.padron_general_estado === 'activo' ? 'default' : 'secondary'}>
                        {empresa.padron_general_estado}
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground font-body">No registrado</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Domicilios Tab */}
          <TabsContent value="domicilios" className="space-y-4 animate-fade-in">
            <Card className="gradient-card shadow-card">
              <CardHeader>
                <CardTitle className="font-heading flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Domicilios de Operación
                </CardTitle>
                <CardDescription className="font-body">
                  {domicilios.length} domicilio(s) registrado(s)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {domicilios.length > 0 ? (
                  <div className="space-y-4">
                    {domicilios.map((domicilio) => (
                      <div key={domicilio.id} className="border rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <MapPin className="w-5 h-5 text-primary mt-0.5" />
                          <div className="flex-1">
                            {domicilio.tipo && (
                              <Badge variant="outline" className="mb-2">{domicilio.tipo}</Badge>
                            )}
                            <p className="font-body">{domicilio.domicilio}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground font-body text-center py-8">
                    No hay domicilios adicionales registrados
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Relacionados Tab */}
          <TabsContent value="relacionados" className="space-y-4 animate-fade-in">
            {/* Miembros y Socios */}
            <Card className="gradient-card shadow-card">
              <CardHeader>
                <CardTitle className="font-heading flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Miembros y Socios
                </CardTitle>
                <CardDescription className="font-body">
                  {miembros.length} miembro(s) registrado(s)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {miembros.length > 0 ? (
                  <div className="space-y-3">
                    {miembros.map((miembro) => (
                      <div key={miembro.id} className="flex items-center justify-between border rounded-lg p-3">
                        <div>
                          <p className="font-heading font-medium">{miembro.nombre_completo}</p>
                          <p className="text-sm text-muted-foreground font-body">{miembro.rfc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground font-body text-center py-8">
                    No hay miembros registrados
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Agentes Aduanales */}
            <Card className="gradient-card shadow-card">
              <CardHeader>
                <CardTitle className="font-heading flex items-center gap-2">
                  <Hash className="w-5 h-5" />
                  Agentes Aduanales
                </CardTitle>
                <CardDescription className="font-body">
                  {agentes.length} agente(s) registrado(s)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {agentes.length > 0 ? (
                  <div className="space-y-3">
                    {agentes.map((agente) => (
                      <div key={agente.id} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-heading font-medium">{agente.nombre_agente}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline">Patente: {agente.numero_patente}</Badge>
                              {agente.estado && <Badge variant="secondary">{agente.estado}</Badge>}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground font-body text-center py-8">
                    No hay agentes aduanales registrados
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

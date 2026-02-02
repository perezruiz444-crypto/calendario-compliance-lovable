import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ManageConsultoresDialog from '@/components/empresas/ManageConsultoresDialog';
import CreateTareaDialog from '@/components/tareas/CreateTareaDialog';
import TareaDetailDialog from '@/components/tareas/TareaDetailDialog';
import { EmpresaGeneralCard } from '@/components/empresas/EmpresaGeneralCard';
import { EmpresaIMMEXCard } from '@/components/empresas/EmpresaIMMEXCard';
import { EmpresaCertificacionCard } from '@/components/empresas/EmpresaCertificacionCard';
import { EmpresaObligacionesCard } from '@/components/empresas/EmpresaObligacionesCard';
import { 
  Building2, 
  MapPin, 
  Users, 
  Ship, 
  ArrowLeft,
  Phone,
  Hash,
  Shield,
  Scale,
  UserCog,
  CheckSquare,
  Plus,
  Repeat
} from 'lucide-react';

export default function EmpresaDetail() {
  const { id } = useParams();
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const [empresa, setEmpresa] = useState<any>(null);
  const [domicilios, setDomicilios] = useState<any[]>([]);
  const [miembros, setMiembros] = useState<any[]>([]);
  const [agentes, setAgentes] = useState<any[]>([]);
  const [apoderados, setApoderados] = useState<any[]>([]);
  const [tareas, setTareas] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [consultoresDialogOpen, setConsultoresDialogOpen] = useState(false);
  const [createTareaDialogOpen, setCreateTareaDialogOpen] = useState(false);
  const [detailTareaDialogOpen, setDetailTareaDialogOpen] = useState(false);
  const [selectedTareaId, setSelectedTareaId] = useState<string | null>(null);

  const canEdit = role === 'administrador' || role === 'consultor';

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
      const { data: empresaData, error: empresaError } = await supabase
        .from('empresas')
        .select('*')
        .eq('id', id)
        .single();

      if (empresaError) throw empresaError;
      setEmpresa(empresaData);

      const [domiciliosRes, miembrosRes, agentesRes, apoderadosRes, tareasRes] = await Promise.all([
        supabase.from('domicilios_operacion').select('*').eq('empresa_id', id),
        supabase.from('miembros_socios').select('*').eq('empresa_id', id),
        supabase.from('agentes_aduanales').select('*').eq('empresa_id', id),
        supabase.from('apoderados_legales').select('*').eq('empresa_id', id),
        supabase.from('tareas').select(`
          *,
          profiles:consultor_asignado_id(nombre_completo),
          categorias_tareas(nombre, color)
        `).eq('empresa_id', id).order('created_at', { ascending: false }).limit(10)
      ]);

      setDomicilios(domiciliosRes.data || []);
      setMiembros(miembrosRes.data || []);
      setAgentes(agentesRes.data || []);
      setApoderados(apoderadosRes.data || []);
      setTareas(tareasRes.data || []);
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

  const pendientes = tareas.filter(t => t.estado === 'pendiente').length;
  const enProgreso = tareas.filter(t => t.estado === 'en_progreso').length;
  const completadas = tareas.filter(t => t.estado === 'completada').length;

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
          {role === 'administrador' && (
            <Button 
              variant="outline"
              onClick={() => setConsultoresDialogOpen(true)}
            >
              <UserCog className="w-4 h-4 mr-2" />
              Consultores
            </Button>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="gradient-card">
            <CardContent className="pt-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-warning">{pendientes}</p>
                <p className="text-sm text-muted-foreground">Pendientes</p>
              </div>
            </CardContent>
          </Card>
          <Card className="gradient-card">
            <CardContent className="pt-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{enProgreso}</p>
                <p className="text-sm text-muted-foreground">En Progreso</p>
              </div>
            </CardContent>
          </Card>
          <Card className="gradient-card">
            <CardContent className="pt-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-success">{completadas}</p>
                <p className="text-sm text-muted-foreground">Completadas</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Obligaciones Section - Full Width */}
        <EmpresaObligacionesCard empresa={empresa} />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Company Info */}
          <div className="space-y-6">
            <EmpresaGeneralCard empresa={empresa} canEdit={canEdit} onUpdate={fetchEmpresaData} />
            <EmpresaIMMEXCard empresa={empresa} canEdit={canEdit} onUpdate={fetchEmpresaData} />
            <EmpresaCertificacionCard empresa={empresa} canEdit={canEdit} onUpdate={fetchEmpresaData} />
          </div>

          {/* Right Column - Related Data */}
          <div className="space-y-6">
            {/* Recent Tasks */}
            <Card className="gradient-card shadow-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="font-heading flex items-center gap-2">
                    <CheckSquare className="w-5 h-5" />
                    Tareas Recientes
                  </CardTitle>
                  <CardDescription>{tareas.length} tarea(s)</CardDescription>
                </div>
                {canEdit && (
                  <Button size="sm" onClick={() => setCreateTareaDialogOpen(true)} className="gradient-primary">
                    <Plus className="w-4 h-4 mr-1" />
                    Nueva
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {tareas.length > 0 ? (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {tareas.slice(0, 5).map((tarea) => (
                      <div
                        key={tarea.id}
                        onClick={() => {
                          setSelectedTareaId(tarea.id);
                          setDetailTareaDialogOpen(true);
                        }}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{tarea.titulo}</p>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline" className={`text-xs ${
                              tarea.estado === 'pendiente' ? 'border-warning text-warning' :
                              tarea.estado === 'en_progreso' ? 'border-primary text-primary' :
                              'border-success text-success'
                            }`}>
                              {tarea.estado === 'pendiente' ? 'Pendiente' :
                               tarea.estado === 'en_progreso' ? 'En Progreso' : 'Completada'}
                            </Badge>
                            {tarea.es_recurrente && (
                              <Badge variant="secondary" className="text-xs">
                                <Repeat className="w-3 h-3 mr-1" />
                                Recurrente
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CheckSquare className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground text-sm">Sin tareas</p>
                    {canEdit && (
                      <Button size="sm" variant="outline" className="mt-2" onClick={() => setCreateTareaDialogOpen(true)}>
                        <Plus className="w-4 h-4 mr-1" />
                        Crear Tarea
                      </Button>
                    )}
                  </div>
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
                <CardDescription>{agentes.length} agente(s)</CardDescription>
              </CardHeader>
              <CardContent>
                {agentes.length > 0 ? (
                  <div className="space-y-2">
                    {agentes.map((agente) => (
                      <div key={agente.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{agente.nombre_agente}</p>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">Patente: {agente.numero_patente}</Badge>
                            {agente.estado && <Badge variant="secondary" className="text-xs">{agente.estado}</Badge>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">Sin agentes registrados</p>
                )}
              </CardContent>
            </Card>

            {/* Apoderados Legales */}
            <Card className="gradient-card shadow-card">
              <CardHeader>
                <CardTitle className="font-heading flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Apoderados Legales
                </CardTitle>
                <CardDescription>{apoderados.length} apoderado(s)</CardDescription>
              </CardHeader>
              <CardContent>
                {apoderados.length > 0 ? (
                  <div className="space-y-2">
                    {apoderados.map((apoderado) => (
                      <div key={apoderado.id} className="p-3 border rounded-lg">
                        <p className="font-medium">{apoderado.nombre}</p>
                        {apoderado.tipo_apoderado && (
                          <Badge variant="outline" className="mt-1 text-xs">Tipo {apoderado.tipo_apoderado}</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">Sin apoderados registrados</p>
                )}
              </CardContent>
            </Card>

            {/* Domicilios */}
            <Card className="gradient-card shadow-card">
              <CardHeader>
                <CardTitle className="font-heading flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Domicilios de Operación
                </CardTitle>
                <CardDescription>{domicilios.length} domicilio(s)</CardDescription>
              </CardHeader>
              <CardContent>
                {domicilios.length > 0 ? (
                  <div className="space-y-2">
                    {domicilios.map((domicilio) => (
                      <div key={domicilio.id} className="p-3 border rounded-lg">
                        {domicilio.tipo && <Badge variant="outline" className="mb-2 text-xs">{domicilio.tipo}</Badge>}
                        <p className="text-sm">{domicilio.domicilio}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">Sin domicilios adicionales</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <ManageConsultoresDialog
        open={consultoresDialogOpen}
        onOpenChange={setConsultoresDialogOpen}
        empresaId={id!}
        empresaNombre={empresa?.razon_social || ''}
      />

      <CreateTareaDialog 
        open={createTareaDialogOpen} 
        onOpenChange={(open) => {
          setCreateTareaDialogOpen(open);
          if (!open) fetchEmpresaData();
        }}
        onTareaCreated={fetchEmpresaData}
        defaultEmpresaId={id}
      />

      {selectedTareaId && (
        <TareaDetailDialog
          open={detailTareaDialogOpen}
          onOpenChange={(open) => {
            setDetailTareaDialogOpen(open);
            if (!open) {
              fetchEmpresaData();
              setSelectedTareaId(null);
            }
          }}
          tareaId={selectedTareaId}
        />
      )}
    </DashboardLayout>
  );
}

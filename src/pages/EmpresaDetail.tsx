import { useEffect, useState, useRef, KeyboardEvent } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ManageConsultoresDialog from '@/components/empresas/ManageConsultoresDialog';
import CreateTareaSheet from '@/components/tareas/CreateTareaSheet';
import TareaDetailSheet from '@/components/tareas/TareaDetailSheet';
import { EmpresaGeneralCard } from '@/components/empresas/EmpresaGeneralCard';
import { EmpresaIMMEXCard } from '@/components/empresas/EmpresaIMMEXCard';
import { EmpresaPROSECCard } from '@/components/empresas/EmpresaPROSECCard';
import { EmpresaCertificacionCard } from '@/components/empresas/EmpresaCertificacionCard';
import { EmpresaObligacionesCard } from '@/components/empresas/EmpresaObligacionesCard';
import { ObligacionesManager } from '@/components/obligaciones/ObligacionesManager';
import { AgentesAduanalesCard } from '@/components/empresas/AgentesAduanalesCard';
import { EmpresaObligacionesActivasCard } from '@/components/empresas/EmpresaObligacionesActivasCard';
import { ApoderadosCard } from '@/components/empresas/ApoderadosCard';
import { DomiciliosCard } from '@/components/empresas/DomiciliosCard';
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator
} from '@/components/ui/breadcrumb';
import { 
  Phone, UserCog, CheckSquare, Plus, Repeat, Pencil, Clock, AlertTriangle,
  Building2, FileText, Users, ClipboardList, TrendingUp, X
} from 'lucide-react';
import { differenceInDays } from 'date-fns';

export default function EmpresaDetail() {
  const { id } = useParams();
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const [empresa, setEmpresa] = useState<any>(null);
  const [domicilios, setDomicilios] = useState<any[]>([]);
  const [agentes, setAgentes] = useState<any[]>([]);
  const [apoderados, setApoderados] = useState<any[]>([]);
  const [tareas, setTareas] = useState<any[]>([]);
  const [obligacionesProximas, setObligacionesProximas] = useState(0);
  const [loadingData, setLoadingData] = useState(true);
  const [consultoresDialogOpen, setConsultoresDialogOpen] = useState(false);
  const [createTareaSheetOpen, setCreateTareaSheetOpen] = useState(false);
  const [detailTareaSheetOpen, setDetailTareaSheetOpen] = useState(false);
  const [selectedTareaId, setSelectedTareaId] = useState<string | null>(null);

  // Inline editing state
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const canEdit = role === 'administrador' || role === 'consultor';

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
    if (!loading && role === 'cliente') {
      toast.info('Redirigido a tu empresa');
      navigate('/mi-empresa');
    }
  }, [user, role, loading, navigate]);

  useEffect(() => {
    if (id && user) fetchEmpresaData();
  }, [id, user]);

  useEffect(() => {
    if (editingField && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingField]);

  const fetchEmpresaData = async () => {
    setLoadingData(true);
    try {
      const { data: empresaData, error: empresaError } = await supabase
        .from('empresas').select('*').eq('id', id).maybeSingle();

      if (empresaError) throw empresaError;
      if (!empresaData) { toast.error('Empresa no encontrada'); navigate('/empresas'); return; }
      setEmpresa(empresaData);

      const [domiciliosRes, agentesRes, apoderadosRes, tareasRes, obligacionesRes] = await Promise.all([
        supabase.from('domicilios_operacion').select('*').eq('empresa_id', id),
        supabase.from('agentes_aduanales').select('*').eq('empresa_id', id),
        supabase.from('apoderados_legales').select('*').eq('empresa_id', id),
        supabase.from('tareas').select(`*, profiles:consultor_asignado_id(nombre_completo), categorias_tareas(nombre, color)`)
          .eq('empresa_id', id).order('created_at', { ascending: false }).limit(10),
        supabase.from('obligaciones').select('fecha_vencimiento').eq('empresa_id', id!).eq('activa', true),
      ]);

      setDomicilios(domiciliosRes.data || []);
      setAgentes(agentesRes.data || []);
      setApoderados(apoderadosRes.data || []);
      setTareas(tareasRes.data || []);

      // Count obligations expiring within 90 days
      const now = new Date();
      const proximas = (obligacionesRes.data || []).filter(o => {
        if (!o.fecha_vencimiento) return false;
        const diff = differenceInDays(new Date(o.fecha_vencimiento), now);
        return diff >= 0 && diff <= 90;
      });
      setObligacionesProximas(proximas.length);
    } catch (error: any) {
      toast.error('Error al cargar la empresa');
      console.error(error);
    } finally {
      setLoadingData(false);
    }
  };

  const startEditing = (field: string, currentValue: string) => {
    if (!canEdit) return;
    setEditingField(field);
    setEditValue(currentValue || '');
  };

  const cancelEditing = () => {
    setEditingField(null);
    setEditValue('');
  };

  const saveField = async () => {
    if (!editingField || !empresa) return;
    try {
      const { error } = await supabase
        .from('empresas')
        .update({ [editingField]: editValue })
        .eq('id', empresa.id);
      if (error) throw error;
      setEmpresa({ ...empresa, [editingField]: editValue });
      toast.success('Actualizado');
    } catch {
      toast.error('Error al guardar');
    } finally {
      cancelEditing();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') saveField();
    if (e.key === 'Escape') cancelEditing();
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
        <div className="text-center py-12"><p className="text-muted-foreground">Empresa no encontrada</p></div>
      </DashboardLayout>
    );
  }

  const pendientes = tareas.filter(t => t.estado === 'pendiente').length;
  const enProgreso = tareas.filter(t => t.estado === 'en_progreso').length;
  const completadas = tareas.filter(t => t.estado === 'completada').length;

  const initials = (empresa.razon_social || '')
    .split(' ')
    .slice(0, 2)
    .map((w: string) => w[0])
    .join('')
    .toUpperCase();

  const renderEditableField = (field: string, value: string | null, displayClass: string) => {
    if (editingField === field) {
      return (
        <div className="flex items-center gap-2">
          <Input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={saveField}
            className="h-8 text-sm bg-background/80 border-primary/30"
          />
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={cancelEditing}>
            <X className="w-3 h-3" />
          </Button>
        </div>
      );
    }
    return (
      <span
        className={`${displayClass} ${canEdit ? 'cursor-pointer hover:text-primary transition-colors group/field' : ''}`}
        onClick={() => canEdit && startEditing(field, value || '')}
      >
        {value || '-'}
        {canEdit && <Pencil className="w-3 h-3 ml-1.5 inline opacity-0 group-hover/field:opacity-60 transition-opacity" />}
      </span>
    );
  };

  const stats = [
    { label: 'Pendientes', value: pendientes, icon: Clock, color: 'text-warning', bg: 'bg-warning/10' },
    { label: 'En Progreso', value: enProgreso, icon: TrendingUp, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Completadas', value: completadas, icon: CheckSquare, color: 'text-success', bg: 'bg-success/10' },
    { label: 'Obl. por Vencer', value: obligacionesProximas, icon: AlertTriangle, color: obligacionesProximas > 0 ? 'text-destructive' : 'text-muted-foreground', bg: obligacionesProximas > 0 ? 'bg-destructive/10' : 'bg-muted' },
  ];

  return (
    <DashboardLayout currentPage="/empresas">
      <div className="space-y-6">
        {/* Breadcrumbs */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild><Link to="/empresas">Empresas</Link></BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{empresa.razon_social}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Hero Header */}
        <Card className="overflow-hidden border-0 shadow-lg">
          <div className="bg-gradient-to-r from-primary to-primary/80 p-6 text-primary-foreground">
            <div className="flex items-start gap-5">
              {/* Avatar */}
              <div className="h-16 w-16 rounded-xl bg-primary-foreground/20 backdrop-blur-sm flex items-center justify-center text-2xl font-bold tracking-tight shrink-0">
                {initials}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-2">
                  {renderEditableField('razon_social', empresa.razon_social, 'text-2xl font-heading font-bold truncate')}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-primary-foreground/80">
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    {renderEditableField('rfc', empresa.rfc, '')}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" />
                    {renderEditableField('telefono', empresa.telefono, '')}
                  </span>
                  {empresa.actividad_economica && (
                    <span className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5" />
                      <span className="truncate max-w-[240px]">{empresa.actividad_economica}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                {canEdit && (
                  <Button size="sm" variant="secondary" onClick={() => setCreateTareaSheetOpen(true)}>
                    <Plus className="w-4 h-4 mr-1" />Tarea
                  </Button>
                )}
                {role === 'administrador' && (
                  <Button size="sm" variant="secondary" onClick={() => setConsultoresDialogOpen(true)}>
                    <UserCog className="w-4 h-4 mr-1" />Consultores
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Stats Bar */}
          <CardContent className="p-0">
            <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-border">
              {stats.map((s) => (
                <div key={s.label} className="flex items-center gap-3 p-4">
                  <div className={`h-10 w-10 rounded-lg ${s.bg} flex items-center justify-center shrink-0`}>
                    <s.icon className={`w-5 h-5 ${s.color}`} />
                  </div>
                  <div>
                    <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="resumen" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="resumen" className="gap-1.5">
              <ClipboardList className="w-4 h-4 hidden sm:block" />Resumen
            </TabsTrigger>
            <TabsTrigger value="informacion" className="gap-1.5">
              <Building2 className="w-4 h-4 hidden sm:block" />Información
            </TabsTrigger>
            <TabsTrigger value="contactos" className="gap-1.5">
              <Users className="w-4 h-4 hidden sm:block" />Contactos
            </TabsTrigger>
            <TabsTrigger value="obligaciones" className="gap-1.5">
              <FileText className="w-4 h-4 hidden sm:block" />Obligaciones
            </TabsTrigger>
          </TabsList>

          {/* Resumen Tab */}
          <TabsContent value="resumen" className="space-y-6">
            <EmpresaObligacionesCard empresa={empresa} canEdit={canEdit} onUpdate={fetchEmpresaData} />

            {/* Recent Tasks */}
            <Card className="shadow-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="font-heading flex items-center gap-2">
                    <CheckSquare className="w-5 h-5" />Tareas Recientes
                  </CardTitle>
                  <CardDescription>{tareas.length} tarea(s)</CardDescription>
                </div>
                {canEdit && (
                  <Button size="sm" onClick={() => setCreateTareaSheetOpen(true)} className="bg-primary hover:bg-primary/90">
                    <Plus className="w-4 h-4 mr-1" />Nueva
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {tareas.length > 0 ? (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {tareas.slice(0, 5).map((tarea) => (
                      <div
                        key={tarea.id}
                        onClick={() => { setSelectedTareaId(tarea.id); setDetailTareaSheetOpen(true); }}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/10 cursor-pointer transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{tarea.titulo}</p>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline" className={`text-xs ${
                              tarea.estado === 'pendiente' ? 'border-warning text-warning' :
                              tarea.estado === 'en_progreso' ? 'border-primary text-primary' : 'border-success text-success'
                            }`}>
                              {tarea.estado === 'pendiente' ? 'Pendiente' : tarea.estado === 'en_progreso' ? 'En Progreso' : 'Completada'}
                            </Badge>
                            {tarea.es_recurrente && (
                              <Badge variant="secondary" className="text-xs"><Repeat className="w-3 h-3 mr-1" />Recurrente</Badge>
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
                      <Button size="sm" variant="outline" className="mt-2" onClick={() => setCreateTareaSheetOpen(true)}>
                        <Plus className="w-4 h-4 mr-1" />Crear Tarea
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Active Obligations */}
            <EmpresaObligacionesActivasCard empresaId={id!} canEdit={canEdit} />
          </TabsContent>

          {/* Información Tab */}
          <TabsContent value="informacion" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <EmpresaGeneralCard empresa={empresa} canEdit={canEdit} onUpdate={fetchEmpresaData} />
              <EmpresaIMMEXCard empresa={empresa} canEdit={canEdit} onUpdate={fetchEmpresaData} />
              <EmpresaPROSECCard empresa={empresa} canEdit={canEdit} onUpdate={fetchEmpresaData} />
              <EmpresaCertificacionCard empresa={empresa} canEdit={canEdit} onUpdate={fetchEmpresaData} />
            </div>
          </TabsContent>

          {/* Contactos Tab */}
          <TabsContent value="contactos" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AgentesAduanalesCard empresaId={id!} agentes={agentes} canEdit={canEdit} onUpdate={fetchEmpresaData} />
              <ApoderadosCard empresaId={id!} apoderados={apoderados} canEdit={canEdit} onUpdate={fetchEmpresaData} />
            </div>
            <DomiciliosCard empresaId={id!} domicilios={domicilios} canEdit={canEdit} onUpdate={fetchEmpresaData} />
          </TabsContent>

          {/* Obligaciones Tab */}
          <TabsContent value="obligaciones" className="space-y-6">
            <EmpresaObligacionesCard empresa={empresa} canEdit={canEdit} onUpdate={fetchEmpresaData} />
            <ObligacionesManager empresaId={id!} canEdit={canEdit} />
          </TabsContent>
        </Tabs>
      </div>

      <ManageConsultoresDialog open={consultoresDialogOpen} onOpenChange={setConsultoresDialogOpen} empresaId={id!} empresaNombre={empresa?.razon_social || ''} />

      <CreateTareaSheet
        open={createTareaSheetOpen}
        onOpenChange={(open) => { setCreateTareaSheetOpen(open); if (!open) fetchEmpresaData(); }}
        onTareaCreated={fetchEmpresaData}
        defaultEmpresaId={id}
      />

      {selectedTareaId && (
        <TareaDetailSheet
          open={detailTareaSheetOpen}
          onOpenChange={(open) => { setDetailTareaSheetOpen(open); if (!open) { fetchEmpresaData(); setSelectedTareaId(null); } }}
          tareaId={selectedTareaId}
          onUpdate={fetchEmpresaData}
        />
      )}
    </DashboardLayout>
  );
}

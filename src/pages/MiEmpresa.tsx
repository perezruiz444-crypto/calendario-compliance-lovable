import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Building2, Calendar, FileText, Shield, AlertCircle, CheckCircle, ClipboardList, ChevronDown, TrendingUp, ListTodo, Loader2, Search, History, User } from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { DocumentosManager } from '@/components/documentos/DocumentosManager';
import { SolicitudesServicio } from '@/components/solicitudes/SolicitudesServicio';
import DashboardCalendar from '@/components/dashboard/DashboardCalendar';
import { toast } from 'sonner';
import { getCurrentPeriodKey, getPeriodLabel, CATEGORIA_LABELS, CATEGORIA_COLORS } from '@/lib/obligaciones';
import { CumplimientoHistorial } from '@/components/obligaciones/CumplimientoHistorial';
import { EvidenciaCumplimiento } from '@/components/obligaciones/EvidenciaCumplimiento';
import { ExportarCumplimientoButton } from '@/components/obligaciones/ExportarCumplimientoButton';

export default function MiEmpresa() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const [empresa, setEmpresa] = useState<any>(null);
  const [apoderados, setApoderados] = useState<any[]>([]);
  const [domicilios, setDomicilios] = useState<any[]>([]);
  const [obligaciones, setObligaciones] = useState<any[]>([]);
  const [cumplimientos, setCumplimientos] = useState<Record<string, boolean>>({});
  const [responsables, setResponsables] = useState<Record<string, { nombre: string; tipo: string }>>({});
  const [tareas, setTareas] = useState<any[]>([]);
  const [completingTarea, setCompletingTarea] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState<string>('todos');
  const [filterCategoria, setFilterCategoria] = useState<string>('todas');

  // Dialogs
  const [historialObl, setHistorialObl] = useState<any | null>(null);
  const [evidenciaObl, setEvidenciaObl] = useState<any | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
    if (!loading && role !== 'cliente') navigate('/dashboard');
  }, [user, role, loading, navigate]);

  useEffect(() => {
    if (user && role === 'cliente') fetchEmpresaData();
  }, [user, role]);

  const fetchEmpresaData = async () => {
    setLoadingData(true);
    try {
      const { data: profile } = await supabase
        .from('profiles').select('empresa_id').eq('id', user?.id).maybeSingle();
      if (!profile?.empresa_id) { setLoadingData(false); return; }

      const [empresaRes, apoderadosRes, domiciliosRes, obligacionesRes, tareasRes] = await Promise.all([
        supabase.from('empresas').select('*').eq('id', profile.empresa_id).maybeSingle(),
        supabase.from('apoderados_legales').select('*').eq('empresa_id', profile.empresa_id),
        supabase.from('domicilios_operacion').select('*').eq('empresa_id', profile.empresa_id),
        supabase.from('obligacion_responsables').select('obligacion_id').eq('user_id', user.id),
        supabase.from('tareas').select('*').eq('empresa_id', profile.empresa_id).neq('estado', 'completada').order('fecha_vencimiento', { ascending: true, nullsFirst: false }),
      ]);

      setEmpresa(empresaRes.data);
      setApoderados(apoderadosRes.data || []);
      setDomicilios(domiciliosRes.data || []);
      setTareas(tareasRes.data || []);
      const idsAsignadas = (obligacionesRes.data || []).map((r: any) => r.obligacion_id);
      let obs: any[] = [];
      if (idsAsignadas.length > 0) {
        const { data: obsData } = await supabase
          .from('obligaciones')
          .select('*')
          .in('id', idsAsignadas)
          .eq('activa', true)
          .order('fecha_vencimiento', { ascending: true, nullsFirst: false });
        obs = obsData || [];
      }
      setObligaciones(obs);

      // Fetch responsable names
      const responsableIds = [...new Set(obs.filter((o: any) => o.responsable_id).map((o: any) => o.responsable_id))];
      if (responsableIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, nombre_completo')
          .in('id', responsableIds);
        if (profilesData) {
          const rMap: Record<string, { nombre: string; tipo: string }> = {};
          profilesData.forEach((p: any) => {
            const ob = obs.find((o: any) => o.responsable_id === p.id);
            rMap[p.id] = { nombre: p.nombre_completo, tipo: ob?.responsable_tipo || 'consultor' };
          });
          setResponsables(rMap);
        }
      }

      if (obs.length > 0) {
        const obIds = obs.map((o: any) => o.id);
        const { data: cData } = await supabase
          .from('obligacion_cumplimientos')
          .select('obligacion_id, periodo_key')
          .in('obligacion_id', obIds);
        if (cData) {
          const map: Record<string, boolean> = {};
          cData.forEach((c: any) => { map[`${c.obligacion_id}:${c.periodo_key}`] = true; });
          setCumplimientos(map);
        }
      }
    } catch (error) {
      console.error('Error fetching empresa data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const toggleCumplimiento = async (obligacionId: string, presentacion: string | null) => {
    if (!user) return;
    const periodKey = getCurrentPeriodKey(presentacion);
    const mapKey = `${obligacionId}:${periodKey}`;
    const isCompleted = cumplimientos[mapKey];

    if (isCompleted) {
      const { error } = await supabase.from('obligacion_cumplimientos').delete()
        .eq('obligacion_id', obligacionId).eq('periodo_key', periodKey);
      if (error) { toast.error('Error al desmarcar'); return; }
      setCumplimientos(prev => ({ ...prev, [mapKey]: false }));
      toast.success('Cumplimiento desmarcado');
    } else {
      // Show evidence dialog instead of direct insert
      const ob = obligaciones.find((o: any) => o.id === obligacionId);
      setEvidenciaObl({ id: obligacionId, presentacion, periodoKey: periodKey, nombre: ob?.nombre });
    }
  };

  const handleEvidenciaCompleted = () => {
    if (evidenciaObl) {
      const mapKey = `${evidenciaObl.id}:${evidenciaObl.periodoKey}`;
      setCumplimientos(prev => ({ ...prev, [mapKey]: true }));
      setEvidenciaObl(null);
    }
  };

  const getVencimientoAlert = (fecha: string | null) => {
    if (!fecha) return null;
    const dias = differenceInDays(parseISO(fecha), new Date());
    if (dias < 0) return { color: 'destructive', icon: AlertCircle, text: 'Vencido' };
    if (dias <= 30) return { color: 'warning', icon: AlertCircle, text: `${dias} días` };
    if (dias <= 90) return { color: 'default', icon: Calendar, text: `${dias} días` };
    return { color: 'success', icon: CheckCircle, text: `${dias} días` };
  };

  // Filtered obligations
  const filteredObligaciones = obligaciones.filter((ob: any) => {
    if (searchTerm && !ob.nombre.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (filterCategoria !== 'todas' && ob.categoria !== filterCategoria) return false;
    if (filterEstado !== 'todos') {
      const pk = getCurrentPeriodKey(ob.presentacion);
      const isCompleted = cumplimientos[`${ob.id}:${pk}`] || false;
      if (filterEstado === 'cumplida' && !isCompleted) return false;
      if (filterEstado === 'pendiente' && isCompleted) return false;
    }
    return true;
  });

  const categorias = [...new Set(obligaciones.map((o: any) => o.categoria))];

  if (loading || loadingData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!empresa) {
    return (
      <DashboardLayout currentPage="/mi-empresa">
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No se encontró información de tu empresa</p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout currentPage="/mi-empresa">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground mb-2">Mi Empresa</h1>
          <p className="text-muted-foreground font-body">Información y documentación de tu empresa</p>
        </div>

        {/* Info General */}
        <Card className="gradient-card shadow-elegant">
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              {empresa.razon_social}
            </CardTitle>
            <CardDescription className="font-body">
              RFC: {empresa.rfc} {empresa.telefono && `• Tel: ${empresa.telefono}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-heading font-medium text-muted-foreground">Domicilio Fiscal</p>
                <p className="text-sm font-body">{empresa.domicilio_fiscal}</p>
              </div>
              {empresa.actividad_economica && (
                <div>
                  <p className="text-sm font-heading font-medium text-muted-foreground">Actividad Económica</p>
                  <p className="text-sm font-body">{empresa.actividad_economica}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Alertas */}
        <Card className="gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Alertas y Vencimientos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: 'Certificación IVA/IEPS', fecha: empresa.cert_iva_ieps_fecha_vencimiento },
              { label: 'Matriz de Seguridad', fecha: empresa.matriz_seguridad_fecha_vencimiento },
              { label: 'Programa IMMEX', fecha: empresa.immex_fecha_fin },
              { label: 'Programa PROSEC', fecha: empresa.prosec_fecha_siguiente_renovacion },
            ].filter(a => a.fecha).map((alerta, i) => {
              const alert = getVencimientoAlert(alerta.fecha);
              const Icon = alert?.icon || Calendar;
              return (
                <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-heading font-medium text-sm">{alerta.label}</p>
                    <p className="text-xs text-muted-foreground font-body">
                      Vence: {format(parseISO(alerta.fecha!), 'dd/MM/yyyy', { locale: es })}
                    </p>
                  </div>
                  <Badge variant={alert?.color as any} className="flex items-center gap-1">
                    <Icon className="w-3 h-3" />{alert?.text}
                  </Badge>
                </div>
              );
            })}
            {!empresa.cert_iva_ieps_fecha_vencimiento && !empresa.matriz_seguridad_fecha_vencimiento && !empresa.immex_fecha_fin && !empresa.prosec_fecha_siguiente_renovacion && (
              <p className="text-center text-muted-foreground text-sm py-4">No hay alertas de vencimiento</p>
            )}
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="obligaciones" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="obligaciones" className="font-heading">Obligaciones</TabsTrigger>
            <TabsTrigger value="tareas" className="font-heading flex items-center gap-1.5">
              Tareas
              {tareas.length > 0 && <Badge variant="secondary" className="text-xs h-5 px-1.5">{tareas.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="programas" className="font-heading">Programas</TabsTrigger>
            <TabsTrigger value="certificaciones" className="font-heading">Certificaciones</TabsTrigger>
            <TabsTrigger value="domicilios" className="font-heading">Domicilios</TabsTrigger>
          </TabsList>

          {/* Obligaciones Tab */}
          <TabsContent value="obligaciones" className="space-y-4">
            {/* Progress Summary Cards */}
            {obligaciones.length > 0 && (() => {
              const completadas = obligaciones.filter((ob: any) => {
                const pk = getCurrentPeriodKey(ob.presentacion);
                return cumplimientos[`${ob.id}:${pk}`];
              }).length;
              const total = obligaciones.length;
              const porVencer = obligaciones.filter((ob: any) => {
                if (!ob.fecha_vencimiento) return false;
                const dias = differenceInDays(parseISO(ob.fecha_vencimiento), new Date());
                return dias >= 0 && dias <= 30;
              }).length;
              const pct = total > 0 ? Math.round((completadas / total) * 100) : 0;

              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card className="bg-success/5 border-success/20">
                      <CardContent className="pt-4 pb-4 flex items-center gap-3">
                        <div className="bg-success/10 p-2 rounded-lg"><CheckCircle className="w-5 h-5 text-success" /></div>
                        <div>
                          <p className="text-2xl font-heading font-bold text-success">{completadas}</p>
                          <p className="text-xs text-muted-foreground">Completadas este periodo</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-warning/5 border-warning/20">
                      <CardContent className="pt-4 pb-4 flex items-center gap-3">
                        <div className="bg-warning/10 p-2 rounded-lg"><ClipboardList className="w-5 h-5 text-warning" /></div>
                        <div>
                          <p className="text-2xl font-heading font-bold text-warning">{total - completadas}</p>
                          <p className="text-xs text-muted-foreground">Pendientes</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-destructive/5 border-destructive/20">
                      <CardContent className="pt-4 pb-4 flex items-center gap-3">
                        <div className="bg-destructive/10 p-2 rounded-lg"><AlertCircle className="w-5 h-5 text-destructive" /></div>
                        <div>
                          <p className="text-2xl font-heading font-bold text-destructive">{porVencer}</p>
                          <p className="text-xs text-muted-foreground">Próximas a vencer</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  {/* Progress Bar */}
                  <Card>
                    <CardContent className="pt-4 pb-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-heading font-medium flex items-center gap-1.5">
                          <TrendingUp className="w-4 h-4" /> Cumplimiento del Periodo
                        </span>
                        <span className="text-lg font-heading font-bold text-primary">{pct}%</span>
                      </div>
                      <Progress value={pct} className="h-3" />
                    </CardContent>
                  </Card>
                </div>
              );
            })()}

            {/* Filters Bar */}
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                  <div className="relative flex-1 w-full sm:max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar obligación..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={filterEstado} onValueChange={setFilterEstado}>
                    <SelectTrigger className="w-full sm:w-[150px]">
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="pendiente">Pendientes</SelectItem>
                      <SelectItem value="cumplida">Cumplidas</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterCategoria} onValueChange={setFilterCategoria}>
                    <SelectTrigger className="w-full sm:w-[160px]">
                      <SelectValue placeholder="Categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas</SelectItem>
                      {categorias.map(cat => (
                        <SelectItem key={cat} value={cat}>{CATEGORIA_LABELS[cat] || cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <ExportarCumplimientoButton
                    obligaciones={obligaciones}
                    cumplimientos={cumplimientos}
                    empresaNombre={empresa.razon_social}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Grouped by Category */}
            <Card>
              <CardHeader>
                <CardTitle className="font-heading flex items-center gap-2">
                  <ClipboardList className="w-5 h-5" />
                  Mis Obligaciones
                  <Badge variant="secondary" className="ml-2">{filteredObligaciones.length}</Badge>
                </CardTitle>
                <CardDescription>Marca como completadas las obligaciones del periodo actual</CardDescription>
              </CardHeader>
              <CardContent>
                {filteredObligaciones.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    {obligaciones.length === 0 ? 'No hay obligaciones asignadas' : 'No se encontraron obligaciones con los filtros aplicados'}
                  </p>
                ) : (() => {
                  const grouped = filteredObligaciones.reduce((acc: Record<string, any[]>, ob: any) => {
                    const cat = ob.categoria || 'otro';
                    if (!acc[cat]) acc[cat] = [];
                    acc[cat].push(ob);
                    return acc;
                  }, {});

                  return (
                    <div className="space-y-3">
                      {Object.entries(grouped).map(([cat, obs]) => (
                        <Collapsible key={cat} defaultOpen>
                          <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 hover:bg-muted/50 rounded px-2 transition-colors">
                            <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform [&[data-state=open]]:rotate-180" />
                            <Badge variant="outline" className={`text-xs ${CATEGORIA_COLORS[cat] || ''}`}>
                              {CATEGORIA_LABELS[cat] || cat}
                            </Badge>
                            <span className="text-xs text-muted-foreground">({(obs as any[]).length})</span>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="pl-6 space-y-2 mt-1">
                            {(obs as any[]).map((ob: any) => {
                              const periodKey = getCurrentPeriodKey(ob.presentacion);
                              const mapKey = `${ob.id}:${periodKey}`;
                              const isCompleted = cumplimientos[mapKey] || false;
                              const resp = ob.responsable_id ? responsables[ob.responsable_id] : null;

                              return (
                                <div key={ob.id} className={`flex items-center gap-3 p-3 border rounded-lg transition-colors ${isCompleted ? 'bg-success/10 border-success/30' : ''}`}>
                                  <Checkbox
                                    checked={isCompleted}
                                    onCheckedChange={() => toggleCumplimiento(ob.id, ob.presentacion)}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className={`font-heading font-medium text-sm ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                                      {ob.nombre}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                      {ob.presentacion && (
                                        <Badge variant="outline" className="text-xs">{ob.presentacion}</Badge>
                                      )}
                                      <span className="text-xs text-muted-foreground">
                                        {getPeriodLabel(ob.presentacion, periodKey)}
                                      </span>
                                      {ob.fecha_vencimiento && (() => {
                                        const dias = differenceInDays(parseISO(ob.fecha_vencimiento), new Date());
                                        if (dias < 0) return <Badge variant="destructive" className="text-xs">Vencido</Badge>;
                                        if (dias <= 30) return <Badge className="bg-destructive/20 text-destructive text-xs">{dias}d</Badge>;
                                        return null;
                                      })()}
                                      {resp && (
                                        <Badge variant="outline" className={`text-xs gap-1 ${resp.tipo === 'cliente' ? 'bg-accent/10 text-accent-foreground' : 'bg-primary/10 text-primary'}`}>
                                          <User className="w-3 h-3" />
                                          {resp.nombre.length > 15 ? resp.nombre.substring(0, 15) + '…' : resp.nombre}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 shrink-0"
                                    title="Ver historial"
                                    onClick={() => setHistorialObl(ob)}
                                  >
                                    <History className="w-3.5 h-3.5" />
                                  </Button>
                                  {isCompleted && <CheckCircle className="w-5 h-5 text-success shrink-0" />}
                                </div>
                              );
                            })}
                          </CollapsibleContent>
                        </Collapsible>
                      ))}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tareas Tab */}
          <TabsContent value="tareas" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="font-heading flex items-center gap-2">
                  <ListTodo className="w-5 h-5" />
                  Mis Tareas Pendientes
                  <Badge variant="secondary" className="ml-2">{tareas.length}</Badge>
                </CardTitle>
                <CardDescription>Tareas asignadas a tu empresa que puedes marcar como completadas</CardDescription>
              </CardHeader>
              <CardContent>
                {tareas.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No hay tareas pendientes 🎉</p>
                ) : (
                  <div className="space-y-2">
                    {tareas.map(tarea => {
                      const isCompleting = completingTarea === tarea.id;
                      const prioridadColors: Record<string, string> = {
                        alta: 'bg-destructive/10 text-destructive border-destructive/30',
                        media: 'bg-warning/10 text-warning border-warning/30',
                        baja: 'bg-muted text-muted-foreground',
                      };
                      return (
                        <div key={tarea.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                          <Checkbox
                            disabled={isCompleting}
                            onCheckedChange={async () => {
                              setCompletingTarea(tarea.id);
                              const { error } = await supabase
                                .from('tareas')
                                .update({ estado: 'completada' })
                                .eq('id', tarea.id);
                              if (error) {
                                toast.error('Error al completar tarea');
                              } else {
                                setTareas(prev => prev.filter(t => t.id !== tarea.id));
                                toast.success('Tarea completada');
                              }
                              setCompletingTarea(null);
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-heading font-medium text-sm truncate">{tarea.titulo}</p>
                            {tarea.descripcion && (
                              <p className="text-xs text-muted-foreground truncate mt-0.5">{tarea.descripcion}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {tarea.prioridad && (
                                <Badge variant="outline" className={`text-xs ${prioridadColors[tarea.prioridad] || ''}`}>
                                  {tarea.prioridad}
                                </Badge>
                              )}
                              {tarea.fecha_vencimiento && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {format(parseISO(tarea.fecha_vencimiento), 'dd/MM/yyyy', { locale: es })}
                                </span>
                              )}
                              <Badge variant="outline" className="text-xs">
                                {tarea.estado === 'en_progreso' ? 'En progreso' : 'Pendiente'}
                              </Badge>
                            </div>
                          </div>
                          {isCompleting && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Programas Tab */}
          <TabsContent value="programas" className="space-y-4">
            {empresa.immex_numero && (
              <Card className="gradient-card">
                <CardHeader><CardTitle className="font-heading text-lg">Programa IMMEX</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div><p className="text-xs font-heading text-muted-foreground">Número</p><p className="text-sm font-body">{empresa.immex_numero}</p></div>
                    {empresa.immex_tipo && <div><p className="text-xs font-heading text-muted-foreground">Tipo</p><p className="text-sm font-body">{empresa.immex_tipo}</p></div>}
                    {empresa.immex_modalidad && <div><p className="text-xs font-heading text-muted-foreground">Modalidad</p><p className="text-sm font-body">{empresa.immex_modalidad}</p></div>}
                  </div>
                </CardContent>
              </Card>
            )}
            {empresa.prosec_numero && (
              <Card className="gradient-card">
                <CardHeader><CardTitle className="font-heading text-lg">Programa PROSEC</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div><p className="text-xs font-heading text-muted-foreground">Número</p><p className="text-sm font-body">{empresa.prosec_numero}</p></div>
                    {empresa.prosec_modalidad && <div><p className="text-xs font-heading text-muted-foreground">Modalidad</p><p className="text-sm font-body">{empresa.prosec_modalidad}</p></div>}
                    {empresa.prosec_fecha_ultima_renovacion && <div><p className="text-xs font-heading text-muted-foreground">Última Renovación</p><p className="text-sm font-body">{format(parseISO(empresa.prosec_fecha_ultima_renovacion), 'dd/MM/yyyy', { locale: es })}</p></div>}
                    {empresa.prosec_fecha_siguiente_renovacion && <div><p className="text-xs font-heading text-muted-foreground">Siguiente Renovación</p><p className="text-sm font-body">{format(parseISO(empresa.prosec_fecha_siguiente_renovacion), 'dd/MM/yyyy', { locale: es })}</p></div>}
                  </div>
                </CardContent>
              </Card>
            )}
            {empresa.padron_general_numero && (
              <Card className="gradient-card">
                <CardHeader><CardTitle className="font-heading text-lg">Padrón de Importadores</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div><p className="text-xs font-heading text-muted-foreground">Número</p><p className="text-sm font-body">{empresa.padron_general_numero}</p></div>
                    {empresa.padron_general_estado && <div><p className="text-xs font-heading text-muted-foreground">Estado</p><Badge>{empresa.padron_general_estado}</Badge></div>}
                  </div>
                </CardContent>
              </Card>
            )}
            {!empresa.immex_numero && !empresa.prosec_numero && !empresa.padron_general_numero && (
              <Card><CardContent className="py-12 text-center"><FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" /><p className="text-muted-foreground">No hay programas registrados</p></CardContent></Card>
            )}
          </TabsContent>

          {/* Certificaciones Tab */}
          <TabsContent value="certificaciones" className="space-y-4">
            {empresa.cert_iva_ieps_oficio ? (
              <Card className="gradient-card">
                <CardHeader>
                  <CardTitle className="font-heading text-lg flex items-center gap-2"><Shield className="w-5 h-5" />Certificación IVA/IEPS</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div><p className="text-xs font-heading text-muted-foreground">Oficio</p><p className="text-sm font-body">{empresa.cert_iva_ieps_oficio}</p></div>
                    {empresa.cert_iva_ieps_fecha_autorizacion && (
                      <div><p className="text-xs font-heading text-muted-foreground">Fecha Autorización</p><p className="text-sm font-body">{format(parseISO(empresa.cert_iva_ieps_fecha_autorizacion), 'dd/MM/yyyy', { locale: es })}</p></div>
                    )}
                  </div>
                  {apoderados.length > 0 && (
                    <div className="pt-3 border-t">
                      <p className="text-xs font-heading text-muted-foreground mb-2">Apoderados Legales</p>
                      <div className="space-y-2">
                        {apoderados.map(a => (
                          <div key={a.id} className="text-sm font-body">
                            {a.nombre}{a.tipo_apoderado && <Badge variant="outline" className="ml-2">{a.tipo_apoderado}</Badge>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card><CardContent className="py-12 text-center"><Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" /><p className="text-muted-foreground">No hay certificaciones registradas</p></CardContent></Card>
            )}
          </TabsContent>

          {/* Domicilios Tab */}
          <TabsContent value="domicilios" className="space-y-4">
            {domicilios.length > 0 ? domicilios.map(d => (
              <Card key={d.id} className="gradient-card">
                <CardHeader><CardTitle className="font-heading text-lg">{d.tipo || 'Domicilio de Operación'}</CardTitle></CardHeader>
                <CardContent><p className="text-sm font-body">{d.domicilio}</p></CardContent>
              </Card>
            )) : (
              <Card><CardContent className="py-12 text-center"><Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" /><p className="text-muted-foreground">No hay domicilios registrados</p></CardContent></Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Calendario */}
        <DashboardCalendar height="500px" onEventClick={(event) => {
          if (event.resource.type === 'documento') {
            document.querySelector('[data-section="documentos"]')?.scrollIntoView({ behavior: 'smooth' });
          }
        }} />

        {/* Documentos y Solicitudes */}
        <div className="mt-6 space-y-6" data-section="documentos">
          <Card>
            <CardHeader>
              <CardTitle className="font-heading">Documentos</CardTitle>
              <CardDescription>Documentos y archivos de tu empresa</CardDescription>
            </CardHeader>
            <CardContent>
              {empresa && <DocumentosManager empresaId={empresa.id} empresaNombre={empresa.razon_social} />}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="font-heading">Solicitudes de Servicio</CardTitle>
              <CardDescription>Crea y gestiona tus solicitudes de atención</CardDescription>
            </CardHeader>
            <CardContent>
              {empresa && <SolicitudesServicio empresaId={empresa.id} />}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Historial Dialog */}
      {historialObl && (
        <CumplimientoHistorial
          open={!!historialObl}
          onOpenChange={(open) => { if (!open) setHistorialObl(null); }}
          obligacionId={historialObl.id}
          obligacionNombre={historialObl.nombre}
          presentacion={historialObl.presentacion}
        />
      )}

      {/* Evidencia Dialog */}
      {evidenciaObl && user && (
        <EvidenciaCumplimiento
          open={!!evidenciaObl}
          onOpenChange={(open) => { if (!open) setEvidenciaObl(null); }}
          obligacionId={evidenciaObl.id}
          periodoKey={evidenciaObl.periodoKey}
          userId={user.id}
          onCompleted={handleEvidenciaCompleted}
        />
      )}
    </DashboardLayout>
  );
}

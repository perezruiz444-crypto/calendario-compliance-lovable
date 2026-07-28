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
import { AgentesAduanalesCard } from '@/components/empresas/AgentesAduanalesCard';
import { DocumentosManager } from '@/components/documentos/DocumentosManager';
import { SolicitudesServicio } from '@/components/solicitudes/SolicitudesServicio';
import DashboardCalendar from '@/components/dashboard/DashboardCalendar';
import { toast } from 'sonner';
import { getPeriodLabel, CATEGORIA_LABELS, CATEGORIA_COLORS } from '@/lib/obligaciones';
import { CumplimientoHistorial } from '@/components/obligaciones/CumplimientoHistorial';
import { EvidenciaCumplimiento } from '@/components/obligaciones/EvidenciaCumplimiento';
import { ExportarCumplimientoButton } from '@/components/obligaciones/ExportarCumplimientoButton';
import MisVencimientos from '@/components/empresas/MisVencimientos';
import MisDocumentos from '@/components/empresas/MisDocumentos';
import { logger } from '@/lib/logger';

export default function MiEmpresa() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const [empresa, setEmpresa] = useState<any>(null);
  const [apoderados, setApoderados] = useState<any[]>([]);
  const [domicilios, setDomicilios] = useState<any[]>([]);
  const [agentesAduanales, setAgentesAduanales] = useState<any[]>([]);
  const [obligaciones, setObligaciones] = useState<any[]>([]);
  const [misAsignaciones, setMisAsignaciones] = useState<Set<string>>(new Set());
  const [cumplimientos, setCumplimientos] = useState<Record<string, boolean>>({});
  const [responsables, setResponsables] = useState<Record<string, { nombre: string; tipo: string }>>({});
  const [tareas, setTareas] = useState<any[]>([]);
  const [completingTarea, setCompletingTarea] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState<string>('todos');
  const [filterCategoria, setFilterCategoria] = useState<string>('todas');
  const [filterAsignacion, setFilterAsignacion] = useState<'todas' | 'mias'>('todas');


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
    if (!user) { setLoadingData(false); return; }
    setLoadingData(true);
    try {
      const { data: profile } = await supabase
        .from('profiles').select('empresa_id').eq('id', user.id).maybeSingle();
      if (!profile?.empresa_id) { setLoadingData(false); return; }

      const [empresaRes, apoderadosRes, domiciliosRes, agentesRes, obligacionesRes, misAsigRes, tareasRes] = await Promise.all([
        supabase.from('empresas').select('*').eq('id', profile.empresa_id).maybeSingle(),
        supabase.from('apoderados_legales').select('*').eq('empresa_id', profile.empresa_id),
        supabase.from('domicilios_operacion').select('*').eq('empresa_id', profile.empresa_id),
        supabase.from('agentes_aduanales').select('*').eq('empresa_id', profile.empresa_id),
        supabase
          .from('obligacion_ocurrencias')
          .select('*, obligaciones(id, nombre, categoria, presentacion, descripcion, responsable_id, responsable_tipo)')
          .eq('empresa_id', profile.empresa_id)
          .order('fecha_vencimiento', { ascending: true, nullsFirst: false }),
        supabase.from('obligacion_responsables').select('obligacion_id').eq('user_id', user.id),
        supabase.from('tareas').select('*').eq('empresa_id', profile.empresa_id).neq('estado', 'completada').order('fecha_vencimiento', { ascending: true, nullsFirst: false }),
      ]);

      setEmpresa(empresaRes.data);
      setApoderados(apoderadosRes.data || []);
      setDomicilios(domiciliosRes.data || []);
      setAgentesAduanales(agentesRes.data || []);
      setTareas(tareasRes.data || []);

      // Fase 2: cada fila es una OCURRENCIA con su obligación. La aplanamos a un
      // shape compatible con el render (ob.nombre, ob.categoria, ...), pero cada
      // "ob" es en realidad una ocurrencia: su `id` es el ocurrencia_id, y
      // `obligacion_id` apunta a la obligación padre (para asignaciones/historial).
      const ocs = obligacionesRes.data || [];
      const obs = ocs.map((oc: any) => ({
        // Identidad de la ocurrencia (para cumplimiento y key de lista)
        id: oc.id,                       // ocurrencia_id
        obligacion_id: oc.obligacion_id, // obligación padre
        periodo_key: oc.periodo_key,
        fecha_vencimiento: oc.fecha_vencimiento,
        estado_ocurrencia: oc.estado,
        // Datos heredados de la obligación (para render)
        nombre: oc.obligaciones?.nombre ?? 'Obligación',
        categoria: oc.obligaciones?.categoria ?? 'otro',
        presentacion: oc.obligaciones?.presentacion ?? null,
        descripcion: oc.obligaciones?.descripcion ?? null,
        responsable_id: oc.obligaciones?.responsable_id ?? null,
        responsable_tipo: oc.obligaciones?.responsable_tipo ?? null,
      }));
      setObligaciones(obs);

      // Las asignaciones son por OBLIGACIÓN padre.
      const asignSet = new Set<string>((misAsigRes.data || []).map((r: any) => r.obligacion_id));
      setMisAsignaciones(asignSet);

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

      // Cumplimientos vigentes ligados a estas ocurrencias -> map por ocurrencia_id.
      if (obs.length > 0) {
        const ocIds = obs.map((o: any) => o.id);
        const { data: cData } = await supabase
          .from('obligacion_cumplimientos')
          .select('ocurrencia_id, completada, vigente')
          .eq('empresa_id', profile.empresa_id)
          .in('ocurrencia_id', ocIds);
        if (cData) {
          const map: Record<string, boolean> = {};
          cData.forEach((c: any) => { if (c.vigente && c.ocurrencia_id) map[c.ocurrencia_id] = c.completada; });
          setCumplimientos(map);
        }
      }
    } catch (error) {
      logger.error('Error fetching empresa data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  // Fase 2: `ob` es una ocurrencia aplanada (id = ocurrencia_id, obligacion_id = padre).
  const toggleCumplimiento = async (ob: any) => {
    if (!user) return;
    if (!misAsignaciones.has(ob.obligacion_id)) {
      toast.error('Solo puedes marcar las obligaciones asignadas a ti');
      return;
    }
    const ocurrenciaId = ob.id;
    const isCompleted = cumplimientos[ocurrenciaId];

    if (isCompleted) {
      // Desmarcar = corrección append-only (nunca DELETE). Busca el cumplimiento vigente.
      const { data: existing } = await supabase
        .from('obligacion_cumplimientos')
        .select('id')
        .eq('ocurrencia_id', ocurrenciaId)
        .eq('vigente', true)
        .maybeSingle();
      if (!existing?.id) { toast.error('No se encontró el cumplimiento'); return; }
      const { error } = await supabase.rpc('corregir_cumplimiento', {
        p_cumplimiento_id: existing.id,
        p_completada: false,

      });
      if (error) { toast.error('Error al desmarcar'); return; }
      setCumplimientos(prev => ({ ...prev, [ocurrenciaId]: false }));
      toast.success('Cumplimiento desmarcado');
    } else {
      // Mostrar dialog de evidencia (inserta contra ocurrencia_id).
      setEvidenciaObl({
        id: ob.obligacion_id,
        ocurrenciaId,
        presentacion: ob.presentacion,
        periodoKey: ob.periodo_key,
        nombre: ob.nombre,
      });
    }
  };


  const handleEvidenciaCompleted = () => {
    if (evidenciaObl) {
      setCumplimientos(prev => ({ ...prev, [evidenciaObl.ocurrenciaId]: true }));
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
    if (filterAsignacion === 'mias' && !misAsignaciones.has(ob.id)) return false;
    if (searchTerm && !ob.nombre.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (filterCategoria !== 'todas' && ob.categoria !== filterCategoria) return false;
    if (filterEstado !== 'todos') {
      const isCompleted = cumplimientos[ob.id] || false;
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

  const completadas = obligaciones.filter((ob: any) => cumplimientos[ob.id]).length;
  const total = obligaciones.length;
  const pendientes = total - completadas;
  const porVencer = obligaciones.filter((ob: any) => {
    if (!ob.fecha_vencimiento) return false;
    const dias = differenceInDays(parseISO(ob.fecha_vencimiento), new Date());
    return dias >= 0 && dias <= 30 && !cumplimientos[ob.id];
  }).length;
  const score = total > 0 ? Math.round((completadas / total) * 100) : 0;
  
  const upcomingObligations = [...obligaciones]
    .filter(ob => !cumplimientos[ob.id] && ob.fecha_vencimiento)
    .sort((a, b) => new Date(a.fecha_vencimiento).getTime() - new Date(b.fecha_vencimiento).getTime())
    .slice(0, 8);

  return (
    <DashboardLayout currentPage="/mi-empresa">
      <div className="space-y-6">
        
        {/* HERO BANNER */}
        <div className="relative overflow-hidden rounded-2xl bg-primary text-primary-foreground shadow-elegant">
          {/* Radial gradient background */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent"></div>
          
          <div className="relative p-6 sm:p-8 flex flex-col md:flex-row gap-6 items-start md:items-center">
            {/* Avatar */}
            <div className="flex-shrink-0 w-20 h-20 bg-white/15 rounded-xl flex items-center justify-center text-3xl font-heading font-bold shadow-inner">
              {empresa.razon_social?.substring(0, 2).toUpperCase() || 'EM'}
            </div>
            
            <div className="flex-1 space-y-2">
              <h1 className="text-3xl sm:text-4xl font-heading font-bold text-white tracking-tight">
                {empresa.razon_social}
              </h1>
              <div className="flex flex-wrap gap-4 text-white/70 font-body text-sm">
                <span className="flex items-center gap-1.5"><FileText className="w-4 h-4" /> RFC: {empresa.rfc}</span>
                <span className="flex items-center gap-1.5"><Building2 className="w-4 h-4" /> {empresa.domicilio_fiscal}</span>
              </div>
              
              {/* Program Badges */}
              <div className="flex flex-wrap gap-2 mt-3">
                {empresa.immex_numero && <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-xs font-medium border border-white/10">IMMEX: {empresa.immex_numero}</span>}
                {empresa.prosec_numero && <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-xs font-medium border border-white/10">PROSEC: {empresa.prosec_numero}</span>}
                {empresa.padron_general_numero && <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-xs font-medium border border-white/10">Padrón: {empresa.padron_general_numero}</span>}
                {empresa.cert_iva_ieps_oficio && <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-xs font-medium border border-white/10">Cert IVA/IEPS</span>}
              </div>
            </div>
          </div>
          
          {/* KPI Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/10 border-t border-white/10 bg-black/10">
            <div className="p-4 flex flex-col items-center justify-center">
              <span className="text-3xl font-heading font-bold">{completadas}</span>
              <span className="text-xs text-white/70 uppercase tracking-wider font-medium mt-1">Completadas</span>
            </div>
            <div className="p-4 flex flex-col items-center justify-center">
              <span className="text-3xl font-heading font-bold">{pendientes}</span>
              <span className="text-xs text-white/70 uppercase tracking-wider font-medium mt-1">Pendientes</span>
            </div>
            <div className="p-4 flex flex-col items-center justify-center">
              <span className="text-3xl font-heading font-bold text-destructive-foreground">{porVencer}</span>
              <span className="text-xs text-white/70 uppercase tracking-wider font-medium mt-1">Por Vencer</span>
            </div>
            <div className="p-4 flex flex-col items-center justify-center">
              <span className="text-3xl font-heading font-bold">{tareas.length}</span>
              <span className="text-xs text-white/70 uppercase tracking-wider font-medium mt-1">Tareas</span>
            </div>
          </div>
        </div>

        {/* Command Center Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT: Score & Programs */}
          <div className="space-y-6">
            <Card className="card-editorial shadow-card">
              <CardHeader className="pb-2">
                <CardTitle className="font-heading text-lg">Compliance Score</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center py-6">
                <div className="relative w-32 h-32 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-muted/20" />
                    <circle 
                      cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="8" fill="transparent"
                      strokeDasharray={`${251.2}`} 
                      strokeDashoffset={251.2 - (251.2 * score) / 100}
                      className="text-primary transition-all duration-1000 ease-out" 
                      strokeLinecap="round" 
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-heading font-bold text-primary">{score}%</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-4 font-body text-center">Nivel de cumplimiento actual</p>
              </CardContent>
            </Card>
            
            <Card className="card-editorial shadow-card">
              <CardHeader className="pb-2">
                <CardTitle className="font-heading text-lg">Programas Activos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: 'Certificación IVA/IEPS', fecha: empresa.cert_iva_ieps_fecha_vencimiento, active: !!empresa.cert_iva_ieps_oficio },
                  { label: 'Matriz de Seguridad', fecha: empresa.matriz_seguridad_fecha_vencimiento, active: !!empresa.matriz_seguridad_fecha_vencimiento },
                  { label: 'Programa IMMEX', fecha: empresa.immex_fecha_fin, active: !!empresa.immex_numero },
                  { label: 'Programa PROSEC', fecha: empresa.prosec_fecha_siguiente_renovacion, active: !!empresa.prosec_numero },
                ].filter(p => p.active).map((prog, i) => {
                  const alert = getVencimientoAlert(prog.fecha);
                  const Icon = alert?.icon || Calendar;
                  return (
                    <div key={i} className="flex flex-col gap-1 p-3 border rounded-lg bg-card hover:bg-muted/30 transition-colors">
                      <div className="flex justify-between items-start">
                        <span className="font-medium text-sm">{prog.label}</span>
                        {prog.fecha && <Badge variant={alert?.color as any} className="text-[10px] h-4 px-1"><Icon className="w-3 h-3 mr-1" />{alert?.text}</Badge>}
                      </div>
                      {prog.fecha && <span className="text-xs text-muted-foreground">Vence: {format(parseISO(prog.fecha), 'dd/MM/yyyy', { locale: es })}</span>}
                    </div>
                  );
                })}
                {!empresa.cert_iva_ieps_oficio && !empresa.matriz_seguridad_fecha_vencimiento && !empresa.immex_numero && !empresa.prosec_numero && (
                  <p className="text-sm text-muted-foreground text-center py-2">Sin programas registrados</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* CENTER: Upcoming Obligations */}
          <div className="space-y-6">
            <Card className="card-editorial shadow-card h-full">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="font-heading text-lg">Próximas a Vencer</CardTitle>
                  <CardDescription>Obligaciones pendientes más urgentes</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                {upcomingObligations.length > 0 ? (
                  <div className="space-y-3">
                    {upcomingObligations.map(ob => {
                      const dias = differenceInDays(parseISO(ob.fecha_vencimiento), new Date());
                      const statusClass = dias < 0 ? 'status-vencida' : dias <= 15 ? 'status-pendiente' : 'status-cumplida';
                      const urgencyColor = dias < 0 ? 'bg-destructive' : dias <= 15 ? 'bg-warning' : 'bg-success';
                      return (
                        <div key={ob.id} className="flex gap-3 items-start p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                          <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${urgencyColor}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium leading-tight truncate">{ob.nombre}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className={`text-[10px] h-4 px-1.5 py-0 border-0 shadow-none font-medium ${statusClass}`}>
                                {dias < 0 ? 'Vencido' : `${dias} días`}
                              </Badge>
                              <span className="text-xs text-muted-foreground">Vence: {format(parseISO(ob.fecha_vencimiento), 'dd MMM yyyy', { locale: es })}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-40 text-center">
                    <CheckCircle className="w-8 h-8 text-success/50 mb-2" />
                    <p className="text-muted-foreground text-sm">No hay obligaciones próximas a vencer</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* RIGHT: Tasks */}
          <div className="space-y-6">
            <Card className="card-editorial shadow-card h-full flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="font-heading text-lg flex items-center justify-between">
                  <span>Tareas Pendientes</span>
                  {tareas.length > 0 && <Badge variant="secondary">{tareas.length}</Badge>}
                </CardTitle>
                <CardDescription>Acciones requeridas para tu empresa</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 overflow-auto max-h-[400px]">
                {tareas.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-8">
                    <ListTodo className="w-8 h-8 text-muted-foreground/50 mb-2" />
                    <p className="text-muted-foreground text-sm">No hay tareas pendientes 🎉</p>
                  </div>
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
                        <div key={tarea.id} className="flex items-start gap-3 p-3 border rounded-lg bg-card hover:bg-muted/30 transition-colors">
                          <div className="pt-0.5">
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
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-heading font-medium text-sm leading-tight">{tarea.titulo}</p>
                            {tarea.descripcion && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{tarea.descripcion}</p>
                            )}
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              {tarea.prioridad && (
                                <Badge variant="outline" className={`text-[10px] h-4 px-1 py-0 ${prioridadColors[tarea.prioridad] || ''}`}>
                                  {tarea.prioridad}
                                </Badge>
                              )}
                              {tarea.fecha_vencimiento && (
                                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {format(parseISO(tarea.fecha_vencimiento), 'dd/MM/yyyy', { locale: es })}
                                </span>
                              )}
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
          </div>
        </div>

        {/* Tabs - 4 Tabs */}
        <Tabs defaultValue="obligaciones" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto p-1">
            <TabsTrigger value="obligaciones" className="font-heading py-2">Obligaciones</TabsTrigger>
            <TabsTrigger value="documentos" className="font-heading py-2">Documentos</TabsTrigger>
            <TabsTrigger value="programas" className="font-heading py-2">Programas</TabsTrigger>
            <TabsTrigger value="contactos" className="font-heading py-2">Contactos</TabsTrigger>
          </TabsList>

          {/* Obligaciones Tab */}
          <TabsContent value="obligaciones" className="space-y-4">
            <Card className="shadow-card">
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
                  <Select value={filterAsignacion} onValueChange={(v: any) => setFilterAsignacion(v)}>
                    <SelectTrigger className="w-full sm:w-[170px]">
                      <SelectValue placeholder="Asignación" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas de la empresa</SelectItem>
                      <SelectItem value="mias">Solo asignadas a mí</SelectItem>
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

            <Card className="card-editorial shadow-card">
              <CardHeader>
                <CardTitle className="font-heading flex items-center gap-2">
                  <ClipboardList className="w-5 h-5" />
                  Obligaciones de la Empresa
                  <Badge variant="secondary" className="ml-2">{filteredObligaciones.length}</Badge>
                </CardTitle>
                <CardDescription>
                  Ves todas las obligaciones activas de tu empresa. Solo puedes marcar como cumplidas las que tienen el badge <span className="font-semibold text-primary">"Asignada a ti"</span>.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredObligaciones.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    {obligaciones.length === 0 ? 'Tu empresa aún no tiene obligaciones activas' : 'No se encontraron obligaciones con los filtros aplicados'}
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
                          <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 hover:bg-muted/50 rounded px-2 transition-colors [&[data-state=open]>svg]:rotate-180">
                            <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform" />
                            <Badge variant="outline" className={`text-xs ${CATEGORIA_COLORS[cat] || ''}`}>
                              {CATEGORIA_LABELS[cat] || cat}
                            </Badge>
                            <span className="text-xs text-muted-foreground">({(obs as any[]).length})</span>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="pl-6 space-y-2 mt-1">
                            {(obs as any[]).map((ob: any) => {
                              const periodKey = ob.periodo_key;
                              const isCompleted = cumplimientos[ob.id] || false;
                              const resp = ob.responsable_id ? responsables[ob.responsable_id] : null;
                              const esMia = misAsignaciones.has(ob.obligacion_id);

                              return (
                                <div key={ob.id} className={`flex items-center gap-3 p-3 border rounded-lg transition-colors ${isCompleted ? 'bg-success/10 border-success/30' : esMia ? 'border-primary/30' : 'opacity-80'}`}>
                                  {esMia ? (
                                    <Checkbox
                                      checked={isCompleted}
                                      onCheckedChange={() => toggleCumplimiento(ob)}
                                    />
                                  ) : (
                                    <div className="w-4 h-4 shrink-0" aria-hidden />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className={`font-heading font-medium text-sm ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                                      {ob.nombre}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                      {esMia && (
                                        <Badge className="text-[10px] h-4 px-1.5 py-0 bg-primary/15 text-primary border-primary/30 hover:bg-primary/15">
                                          Asignada a ti
                                        </Badge>
                                      )}
                                      {ob.presentacion && (
                                        <Badge variant="outline" className="text-[10px] h-4 px-1.5 py-0">{ob.presentacion}</Badge>
                                      )}
                                      <span className="text-xs text-muted-foreground">
                                        {getPeriodLabel(ob.presentacion, periodKey)}
                                      </span>
                                      {ob.fecha_vencimiento && (() => {
                                        const dias = differenceInDays(parseISO(ob.fecha_vencimiento), new Date());
                                        if (dias < 0) return <Badge variant="destructive" className="text-[10px] h-4 px-1.5 py-0">Vencido</Badge>;
                                        if (dias <= 30) return <Badge className="bg-destructive/20 text-destructive text-[10px] h-4 px-1.5 py-0 border-transparent">{dias}d</Badge>;
                                        return null;
                                      })()}
                                      {resp && (
                                        <Badge variant="outline" className={`text-[10px] h-4 px-1.5 py-0 gap-1 ${resp.tipo === 'cliente' ? 'bg-accent/10 text-accent-foreground' : 'bg-primary/10 text-primary'}`}>
                                          <User className="w-3 h-3" />
                                          {resp.nombre.length > 15 ? resp.nombre.substring(0, 15) + '…' : resp.nombre}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  <Button
                                    aria-label="Ver historial"
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

          {/* Documentos Tab */}
          <TabsContent value="documentos" className="space-y-6">
            <Card className="card-editorial shadow-card">
              <CardHeader>
                <CardTitle className="font-heading text-lg">Documentos</CardTitle>
                <CardDescription>Documentos y archivos de tu empresa</CardDescription>
              </CardHeader>
              <CardContent>
                {empresa && <DocumentosManager empresaId={empresa.id} empresaNombre={empresa.razon_social} />}
              </CardContent>
            </Card>
            <Card className="card-editorial shadow-card">
              <CardHeader>
                <CardTitle className="font-heading text-lg">Solicitudes de Servicio</CardTitle>
                <CardDescription>Crea y gestiona tus solicitudes de atención</CardDescription>
              </CardHeader>
              <CardContent>
                {empresa && <SolicitudesServicio empresaId={empresa.id} />}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Programas Tab (Merged Programas + Certificaciones) */}
          <TabsContent value="programas" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* IMMEX */}
              {empresa.immex_numero && (
                <Card className="gradient-card shadow-sm border-primary/10">
                  <CardHeader className="pb-3"><CardTitle className="font-heading text-base flex items-center gap-2"><Shield className="w-4 h-4 text-primary"/>Programa IMMEX</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-y-3 gap-x-2">
                      <div><p className="eyebrow-primary text-muted-foreground">Número</p><p className="text-sm font-body font-medium">{empresa.immex_numero}</p></div>
                      {empresa.immex_tipo && <div><p className="eyebrow-primary text-muted-foreground">Tipo</p><p className="text-sm font-body">{empresa.immex_tipo}</p></div>}
                      {empresa.immex_modalidad && <div className="col-span-2"><p className="eyebrow-primary text-muted-foreground">Modalidad</p><p className="text-sm font-body">{empresa.immex_modalidad}</p></div>}
                    </div>
                  </CardContent>
                </Card>
              )}
              {/* PROSEC */}
              {empresa.prosec_numero && (
                <Card className="gradient-card shadow-sm border-primary/10">
                  <CardHeader className="pb-3"><CardTitle className="font-heading text-base flex items-center gap-2"><Shield className="w-4 h-4 text-primary"/>Programa PROSEC</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-y-3 gap-x-2">
                      <div><p className="eyebrow-primary text-muted-foreground">Número</p><p className="text-sm font-body font-medium">{empresa.prosec_numero}</p></div>
                      {empresa.prosec_modalidad && <div><p className="eyebrow-primary text-muted-foreground">Modalidad</p><p className="text-sm font-body">{empresa.prosec_modalidad}</p></div>}
                      {empresa.prosec_fecha_ultima_renovacion && <div><p className="eyebrow-primary text-muted-foreground">Última Ren.</p><p className="text-sm font-body">{format(parseISO(empresa.prosec_fecha_ultima_renovacion), 'dd/MM/yyyy', { locale: es })}</p></div>}
                      {empresa.prosec_fecha_siguiente_renovacion && <div><p className="eyebrow-primary text-muted-foreground">Siguiente Ren.</p><p className="text-sm font-body">{format(parseISO(empresa.prosec_fecha_siguiente_renovacion), 'dd/MM/yyyy', { locale: es })}</p></div>}
                    </div>
                  </CardContent>
                </Card>
              )}
              {/* Padrón */}
              {empresa.padron_general_numero && (
                <Card className="gradient-card shadow-sm border-primary/10">
                  <CardHeader className="pb-3"><CardTitle className="font-heading text-base flex items-center gap-2"><Shield className="w-4 h-4 text-primary"/>Padrón de Importadores</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-y-3 gap-x-2">
                      <div><p className="eyebrow-primary text-muted-foreground">Número</p><p className="text-sm font-body font-medium">{empresa.padron_general_numero}</p></div>
                      {empresa.padron_general_estado && <div><p className="eyebrow-primary text-muted-foreground">Estado</p><Badge variant="outline" className="mt-0.5">{empresa.padron_general_estado}</Badge></div>}
                    </div>
                  </CardContent>
                </Card>
              )}
              {/* Certificación IVA/IEPS */}
              {empresa.cert_iva_ieps_oficio && (
                <Card className="gradient-card shadow-sm border-primary/10">
                  <CardHeader className="pb-3">
                    <CardTitle className="font-heading text-base flex items-center gap-2"><Shield className="w-4 h-4 text-primary" />Certificación IVA/IEPS</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-y-3 gap-x-2">
                      <div><p className="eyebrow-primary text-muted-foreground">Oficio</p><p className="text-sm font-body font-medium">{empresa.cert_iva_ieps_oficio}</p></div>
                      {empresa.cert_iva_ieps_fecha_autorizacion && (
                        <div><p className="eyebrow-primary text-muted-foreground">Autorización</p><p className="text-sm font-body">{format(parseISO(empresa.cert_iva_ieps_fecha_autorizacion), 'dd/MM/yyyy', { locale: es })}</p></div>
                      )}
                    </div>
                    {apoderados.length > 0 && (
                      <div className="pt-3 border-t">
                        <p className="eyebrow-primary text-muted-foreground mb-2">Apoderados Legales</p>
                        <div className="space-y-1.5">
                          {apoderados.map(a => (
                            <div key={a.id} className="text-sm font-body flex items-center justify-between">
                              <span>{a.nombre}</span>
                              {a.tipo_apoderado && <Badge variant="secondary" className="text-[10px] px-1.5 h-4 py-0">{a.tipo_apoderado}</Badge>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
              
              {!empresa.immex_numero && !empresa.prosec_numero && !empresa.padron_general_numero && !empresa.cert_iva_ieps_oficio && (
                <div className="col-span-full">
                  <Card className="shadow-none bg-muted/20 border-dashed">
                    <CardContent className="py-10 text-center">
                      <FileText className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
                      <p className="text-muted-foreground text-sm">No hay programas ni certificaciones registrados</p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Contactos Tab (Merged Domicilios + Agentes) */}
          <TabsContent value="contactos" className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-heading font-medium flex items-center gap-2"><Building2 className="w-5 h-5" /> Domicilios</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {domicilios.length > 0 ? domicilios.map(d => (
                  <Card key={d.id} className="gradient-card shadow-sm border-primary/5">
                    <CardHeader className="pb-2"><CardTitle className="font-heading text-base">{d.tipo || 'Domicilio de Operación'}</CardTitle></CardHeader>
                    <CardContent><p className="text-sm font-body text-muted-foreground">{d.domicilio}</p></CardContent>
                  </Card>
                )) : (
                  <div className="col-span-full py-6 text-center border border-dashed rounded-lg bg-muted/10">
                    <p className="text-muted-foreground text-sm">No hay domicilios registrados</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-border/50">
              <h3 className="text-lg font-heading font-medium flex items-center gap-2"><User className="w-5 h-5" /> Agentes Aduanales</h3>
              <AgentesAduanalesCard
                empresaId={empresa.id}
                agentes={agentesAduanales}
                canEdit={false}
                onUpdate={fetchEmpresaData}
              />
            </div>
          </TabsContent>
        </Tabs>

        {/* Calendario completo */}
        <details className="rounded-xl border border-border/50 bg-card shadow-sm overflow-hidden [&[open]>summary>svg]:rotate-180">
          <summary className="cursor-pointer px-5 py-4 text-sm font-heading font-medium hover:bg-muted/30 select-none flex items-center justify-between">
            Ver calendario completo del año
            <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform" />
          </summary>
          <div className="p-5 pt-0 border-t border-border/50">
            <DashboardCalendar height="500px" onEventClick={(event) => {
              if (event.resource.type === 'documento') {
                const trigger = document.querySelector('[value="documentos"]') as HTMLElement;
                if (trigger) trigger.click();
              }
            }} />
          </div>
        </details>
      </div>

      {/* Historial Dialog */}
      {historialObl && (
        <CumplimientoHistorial
          open={!!historialObl}
          onOpenChange={(open) => { if (!open) setHistorialObl(null); }}
          obligacionId={historialObl.obligacion_id}
          obligacionNombre={historialObl.nombre}
          presentacion={historialObl.presentacion}
        />
      )}

      {/* Evidencia Dialog */}
      {evidenciaObl && user && empresa && (
        <EvidenciaCumplimiento
          open={!!evidenciaObl}
          onOpenChange={(open) => { if (!open) setEvidenciaObl(null); }}
          empresaId={empresa.id}
          obligacionId={evidenciaObl.id}
          ocurrenciaId={evidenciaObl.ocurrenciaId}
          periodoKey={evidenciaObl.periodoKey}
          userId={user.id}
          onCompleted={handleEvidenciaCompleted}
        />
      )}
    </DashboardLayout>
  );
}


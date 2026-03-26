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
import { CatalogoActivacionSection } from '@/components/obligaciones/CatalogoActivacionSection';
import { AgentesAduanalesCard } from '@/components/empresas/AgentesAduanalesCard';
import { EmpresaObligacionesActivasCard } from '@/components/empresas/EmpresaObligacionesActivasCard';
import { ApoderadosCard } from '@/components/empresas/ApoderadosCard';
import { DomiciliosCard } from '@/components/empresas/DomiciliosCard';
import { CumplimientoResumenEmpresa } from '@/components/obligaciones/CumplimientoResumenEmpresa';
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator
} from '@/components/ui/breadcrumb';
import {
  Phone, UserCog, CheckSquare, Plus, Pencil, Clock, AlertTriangle,
  Building2, FileText, Users, TrendingUp, X, CheckCircle2,
  ShieldCheck, AlertCircle, CalendarDays, ChevronRight, MapPin,
  Target, BarChart3
} from 'lucide-react';
import { differenceInDays, format, isValid } from 'date-fns';
import { es } from 'date-fns/locale';

// ── Program badge helper ──────────────────────────────────────────────

interface ProgramStatus {
  label: string;
  numero: string | null;
  fecha_fin: string | null;
  color: string;
}

function ProgramBadge({ p }: { p: ProgramStatus }) {
  if (!p.numero) return null;
  const dias = p.fecha_fin ? differenceInDays(new Date(p.fecha_fin), new Date()) : null;
  const urgent = dias !== null && dias <= 60;
  const expired = dias !== null && dias < 0;

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${
      expired ? 'border-destructive/30 bg-destructive/5' :
      urgent  ? 'border-amber-400/40 bg-amber-50/50 dark:bg-amber-950/20' :
                'border-success/30 bg-success/5'
    }`}>
      <div className={`w-2 h-2 rounded-full shrink-0 ${
        expired ? 'bg-destructive' : urgent ? 'bg-amber-500' : 'bg-success'
      }`} />
      <div className="min-w-0">
        <p className="font-semibold text-xs text-foreground">{p.label}</p>
        <p className="text-[10px] text-muted-foreground truncate">{p.numero}</p>
      </div>
      {p.fecha_fin && (
        <div className="ml-auto text-right shrink-0">
          <p className={`text-[10px] font-bold ${expired ? 'text-destructive' : urgent ? 'text-amber-600' : 'text-muted-foreground'}`}>
            {expired ? 'Vencido' : `${dias}d`}
          </p>
          <p className="text-[9px] text-muted-foreground">
            {format(new Date(p.fecha_fin), 'dd MMM yy', { locale: es })}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Compliance score ──────────────────────────────────────────────────

function ComplianceScore({ score, total, pendientes, vencidas }: {
  score: number; total: number; pendientes: number; vencidas: number;
}) {
  const color = score >= 80 ? '#16a34a' : score >= 50 ? '#d97706' : '#dc2626';
  const r = 28;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;

  return (
    <div className="flex items-center gap-4">
      <div className="relative w-20 h-20 shrink-0">
        <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
          <circle cx="32" cy="32" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
          <circle cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="6"
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.6s ease' }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold" style={{ color }}>{score}%</span>
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">Cumplimiento</p>
        <p className="text-xs text-muted-foreground">{total} obligaciones activas</p>
        {vencidas > 0 && (
          <p className="text-xs text-destructive font-medium flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> {vencidas} vencida{vencidas > 1 ? 's' : ''}
          </p>
        )}
        {pendientes > 0 && vencidas === 0 && (
          <p className="text-xs text-amber-600 font-medium flex items-center gap-1">
            <Clock className="w-3 h-3" /> {pendientes} pendiente{pendientes > 1 ? 's' : ''}
          </p>
        )}
        {pendientes === 0 && (
          <p className="text-xs text-success font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Al día
          </p>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────

export default function EmpresaDetail() {
  const { id } = useParams();
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const [empresa, setEmpresa] = useState<any>(null);
  const [domicilios, setDomicilios] = useState<any[]>([]);
  const [agentes, setAgentes] = useState<any[]>([]);
  const [apoderados, setApoderados] = useState<any[]>([]);
  const [tareas, setTareas] = useState<any[]>([]);
  const [obligaciones, setObligaciones] = useState<any[]>([]);
  const [cumplimientoKeys, setCumplimientoKeys] = useState<Set<string>>(new Set());
  const [loadingData, setLoadingData] = useState(true);
  const [consultoresDialogOpen, setConsultoresDialogOpen] = useState(false);
  const [createTareaSheetOpen, setCreateTareaSheetOpen] = useState(false);
  const [detailTareaSheetOpen, setDetailTareaSheetOpen] = useState(false);
  const [selectedTareaId, setSelectedTareaId] = useState<string | null>(null);

  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const canEdit = role === 'administrador' || role === 'consultor';

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
    if (!loading && role === 'cliente') { toast.info('Redirigido a tu empresa'); navigate('/mi-empresa'); }
  }, [user, role, loading, navigate]);

  useEffect(() => { if (id && user) fetchEmpresaData(); }, [id, user]);
  useEffect(() => { if (editingField && inputRef.current) { inputRef.current.focus(); inputRef.current.select(); } }, [editingField]);

  const fetchEmpresaData = async () => {
    setLoadingData(true);
    try {
      const { data: empresaData, error } = await supabase.from('empresas').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      if (!empresaData) { toast.error('Empresa no encontrada'); navigate('/empresas'); return; }
      setEmpresa(empresaData);

      const [domRes, agRes, apRes, tarRes, obsRes] = await Promise.all([
        supabase.from('domicilios_operacion').select('*').eq('empresa_id', id),
        supabase.from('agentes_aduanales').select('*').eq('empresa_id', id),
        supabase.from('apoderados_legales').select('*').eq('empresa_id', id),
        supabase.from('tareas').select('*, profiles:consultor_asignado_id(nombre_completo), categorias_tareas(nombre, color)')
          .eq('empresa_id', id).order('fecha_vencimiento', { ascending: true }).limit(10),
        supabase.from('obligaciones').select('*').eq('empresa_id', id).eq('activa', true).order('fecha_vencimiento', { ascending: true, nullsFirst: false }),
      ]);

      setDomicilios(domRes.data || []);
      setAgentes(agRes.data || []);
      setApoderados(apRes.data || []);
      setTareas(tarRes.data || []);
      setObligaciones(obsRes.data || []);

      // Fetch cumplimientos
      const obsIds = (obsRes.data || []).map((o: any) => o.id);
      if (obsIds.length > 0) {
        const { data: cumplData } = await supabase
          .from('obligacion_cumplimientos')
          .select('obligacion_id, periodo_key')
          .in('obligacion_id', obsIds);
        setCumplimientoKeys(new Set((cumplData || []).map((c: any) => `${c.obligacion_id}:${c.periodo_key}`)));
      }
    } catch (e: any) {
      toast.error('Error al cargar la empresa');
    } finally {
      setLoadingData(false);
    }
  };

  const startEditing = (field: string, value: string) => { if (!canEdit) return; setEditingField(field); setEditValue(value || ''); };
  const cancelEditing = () => { setEditingField(null); setEditValue(''); };
  const saveField = async () => {
    if (!editingField || !empresa) return;
    try {
      const { error } = await supabase.from('empresas').update({ [editingField]: editValue }).eq('id', empresa.id);
      if (error) throw error;
      setEmpresa({ ...empresa, [editingField]: editValue });
      toast.success('Actualizado');
    } catch { toast.error('Error al guardar'); }
    finally { cancelEditing(); }
  };
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') saveField();
    if (e.key === 'Escape') cancelEditing();
  };

  if (loading || loadingData) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
    </div>
  );

  if (!empresa) return (
    <DashboardLayout>
      <div className="text-center py-12"><p className="text-muted-foreground">Empresa no encontrada</p></div>
    </DashboardLayout>
  );

  // ── Computed stats ─────────────────────────────────────────────────
  const now = new Date();

  const obsVencidas   = obligaciones.filter(o => o.fecha_vencimiento && new Date(o.fecha_vencimiento) < now);
  const obsSemana     = obligaciones.filter(o => {
    if (!o.fecha_vencimiento) return false;
    const d = differenceInDays(new Date(o.fecha_vencimiento), now);
    return d >= 0 && d <= 7;
  });
  const obsMes        = obligaciones.filter(o => {
    if (!o.fecha_vencimiento) return false;
    const d = differenceInDays(new Date(o.fecha_vencimiento), now);
    return d > 7 && d <= 30;
  });

  const totalObs      = obligaciones.length;
  const pendientesObs = obsVencidas.length + obsSemana.length;
  const cumplScore    = totalObs === 0 ? 100 : Math.round(((totalObs - pendientesObs) / totalObs) * 100);

  const tareasPend    = tareas.filter(t => t.estado === 'pendiente').length;
  const tareasEn      = tareas.filter(t => t.estado === 'en_progreso').length;
  const tareasComp    = tareas.filter(t => t.estado === 'completada').length;

  const initials = (empresa.razon_social || '').split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();

  const programs: ProgramStatus[] = [
    { label: 'IMMEX',         numero: empresa.immex_numero,                   fecha_fin: empresa.immex_fecha_fin,                     color: 'blue'   },
    { label: 'PROSEC',        numero: empresa.prosec_numero,                  fecha_fin: empresa.prosec_fecha_fin,                    color: 'purple' },
    { label: 'Padrón',        numero: empresa.padron_general_numero,          fecha_fin: null,                                        color: 'green'  },
    { label: 'Cert. IVA/IEPS',numero: empresa.cert_iva_ieps_numero,           fecha_fin: empresa.cert_iva_ieps_fecha_vencimiento,     color: 'orange' },
    { label: 'OEA',           numero: empresa.matriz_seguridad_numero || null, fecha_fin: empresa.matriz_seguridad_fecha_vencimiento,  color: 'gold'   },
  ].filter(p => p.numero);

  const renderEditable = (field: string, value: string | null, className: string) => {
    if (editingField === field) return (
      <div className="flex items-center gap-2">
        <Input ref={inputRef} value={editValue} onChange={e => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown} onBlur={saveField} className="h-7 text-sm" />
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={cancelEditing}><X className="w-3 h-3" /></Button>
      </div>
    );
    return (
      <span className={`${className} ${canEdit ? 'cursor-pointer hover:text-primary group/f' : ''}`}
        onClick={() => canEdit && startEditing(field, value || '')}>
        {value || '—'}
        {canEdit && <Pencil className="w-3 h-3 ml-1 inline opacity-0 group-hover/f:opacity-50 transition-opacity" />}
      </span>
    );
  };

  return (
    <DashboardLayout currentPage="/empresas">
      <div className="space-y-5">

        {/* Breadcrumb */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem><BreadcrumbLink asChild><Link to="/empresas">Empresas</Link></BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbPage>{empresa.razon_social}</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* ── HERO ── */}
        <div className="relative overflow-hidden rounded-2xl border border-border shadow-lg">
          {/* Background */}
          <div className="absolute inset-0" style={{ background: 'hsl(var(--primary))' }} />
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, white 0%, transparent 60%)' }} />
          <div className="absolute top-0 left-0 w-1 h-full bg-red-500 opacity-80" />

          <div className="relative px-6 py-5">
            <div className="flex items-start gap-5">
              {/* Avatar */}
              <div className="w-14 h-14 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center text-xl font-bold text-white shrink-0">
                {initials}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-3 flex-wrap">
                  {renderEditable('razon_social', empresa.razon_social, 'text-xl font-bold text-white')}
                  {programs.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap mt-0.5">
                      {programs.map(p => (
                        <span key={p.label} className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-white/15 text-white/80 border border-white/20">
                          {p.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-sm text-white/70">
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    {renderEditable('rfc', empresa.rfc, 'text-white/80')}
                  </span>
                  {empresa.telefono && (
                    <span className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" />
                      {renderEditable('telefono', empresa.telefono, 'text-white/80')}
                    </span>
                  )}
                  {empresa.domicilio_fiscal && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      <span className="truncate max-w-[260px] text-white/70">{empresa.domicilio_fiscal}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 shrink-0">
                {canEdit && (
                  <Button size="sm" variant="secondary" onClick={() => setCreateTareaSheetOpen(true)} className="gap-1.5">
                    <Plus className="w-3.5 h-3.5" /> Tarea
                  </Button>
                )}
                {role === 'administrador' && (
                  <Button size="sm" variant="secondary" onClick={() => setConsultoresDialogOpen(true)} className="gap-1.5">
                    <UserCog className="w-3.5 h-3.5" /> Consultores
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* KPI strip */}
          <div className="relative grid grid-cols-2 lg:grid-cols-4 bg-card/95 backdrop-blur border-t border-border/60">
            {[
              { label: 'Obligaciones vencidas', value: obsVencidas.length, color: obsVencidas.length > 0 ? 'text-destructive' : 'text-muted-foreground', urgent: obsVencidas.length > 0 },
              { label: 'Vencen esta semana',    value: obsSemana.length,   color: obsSemana.length > 0 ? 'text-amber-600' : 'text-muted-foreground',   urgent: false },
              { label: 'Tareas pendientes',     value: tareasPend,          color: tareasPend > 0 ? 'text-primary' : 'text-muted-foreground',           urgent: false },
              { label: 'Completadas',           value: tareasComp,          color: 'text-success',                                                       urgent: false },
            ].map((s, i) => (
              <div key={s.label} className={`flex items-center gap-3 px-5 py-3.5 ${i < 3 ? 'border-r border-border/50' : ''}`}>
                <div className="min-w-0">
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-muted-foreground leading-tight">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── COMMAND CENTER GRID ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* LEFT — Compliance + Programs */}
          <div className="space-y-4">

            {/* Compliance score */}
            <Card className="shadow-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" /> Score de Cumplimiento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ComplianceScore
                  score={cumplScore}
                  total={totalObs}
                  pendientes={pendientesObs}
                  vencidas={obsVencidas.length}
                />
              </CardContent>
            </Card>

            {/* Programs */}
            {programs.length > 0 && (
              <Card className="shadow-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-primary" /> Programas Activos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {programs.map(p => <ProgramBadge key={p.label} p={p} />)}
                </CardContent>
              </Card>
            )}

            {/* Quick stats tareas */}
            <Card className="shadow-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary" /> Tareas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {[
                  { label: 'Pendientes',  value: tareasPend, color: 'bg-amber-500' },
                  { label: 'En progreso', value: tareasEn,   color: 'bg-primary'   },
                  { label: 'Completadas', value: tareasComp, color: 'bg-success'   },
                ].map(s => (
                  <div key={s.label} className="flex items-center gap-3">
                    <div className="flex-1 flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${s.color}`} />
                      <span className="text-sm text-muted-foreground">{s.label}</span>
                    </div>
                    <span className="text-sm font-bold">{s.value}</span>
                    <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full ${s.color}`}
                        style={{ width: `${tareas.length ? (s.value / tareas.length) * 100 : 0}%` }} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* CENTER — Upcoming obligations */}
          <div className="space-y-4">
            <Card className="shadow-card">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-primary" /> Próximas Obligaciones
                </CardTitle>
                <Badge variant="outline" className="text-xs">{obligaciones.length} activas</Badge>
              </CardHeader>
              <CardContent className="space-y-0 p-0">
                {obligaciones.length === 0 ? (
                  <div className="text-center py-8 px-4">
                    <CheckCircle2 className="w-8 h-8 text-success mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Sin obligaciones activas</p>
                  </div>
                ) : (
                  <div className="max-h-[340px] overflow-y-auto">
                    {obligaciones.slice(0, 12).map((ob, i) => {
                      const d = ob.fecha_vencimiento ? differenceInDays(new Date(ob.fecha_vencimiento), now) : null;
                      const vencida = d !== null && d < 0;
                      const urgente = d !== null && d <= 7 && !vencida;
                      return (
                        <div key={ob.id} className={`flex items-start gap-3 px-4 py-3 border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors ${vencida ? 'bg-destructive/3' : ''}`}>
                          <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${vencida ? 'bg-destructive' : urgente ? 'bg-amber-500' : 'bg-success'}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium leading-tight truncate">{ob.nombre}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">{ob.presentacion || 'Única'}</p>
                          </div>
                          {ob.fecha_vencimiento && (
                            <div className="shrink-0 text-right">
                              <p className={`text-xs font-bold ${vencida ? 'text-destructive' : urgente ? 'text-amber-600' : 'text-muted-foreground'}`}>
                                {vencida ? `−${Math.abs(d!)}d` : d === 0 ? 'Hoy' : `${d}d`}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {format(new Date(ob.fecha_vencimiento), 'dd MMM', { locale: es })}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* RIGHT — Recent tasks */}
          <div className="space-y-4">
            <Card className="shadow-card">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-primary" /> Tareas Recientes
                </CardTitle>
                {canEdit && (
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setCreateTareaSheetOpen(true)}>
                    <Plus className="w-3 h-3" /> Nueva
                  </Button>
                )}
              </CardHeader>
              <CardContent className="p-0">
                {tareas.length === 0 ? (
                  <div className="text-center py-8 px-4">
                    <CheckSquare className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Sin tareas</p>
                  </div>
                ) : (
                  <div className="max-h-[340px] overflow-y-auto">
                    {tareas.slice(0, 8).map(t => {
                      const dT = t.fecha_vencimiento ? differenceInDays(new Date(t.fecha_vencimiento), now) : null;
                      return (
                        <div key={t.id}
                          onClick={() => { setSelectedTareaId(t.id); setDetailTareaSheetOpen(true); }}
                          className="flex items-center gap-3 px-4 py-3 border-b border-border/50 last:border-0 hover:bg-muted/30 cursor-pointer transition-colors group">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${
                            t.estado === 'completada' ? 'bg-success' :
                            t.estado === 'en_progreso' ? 'bg-primary' : 'bg-amber-500'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${t.estado === 'completada' ? 'line-through text-muted-foreground' : ''}`}>
                              {t.titulo}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Badge variant="outline" className={`text-[10px] py-0 h-4 ${
                                t.prioridad === 'alta' ? 'border-destructive/40 text-destructive' :
                                t.prioridad === 'media' ? 'border-amber-400/40 text-amber-600' : 'border-success/40 text-success'
                              }`}>
                                {t.prioridad}
                              </Badge>
                              {t.profiles?.nombre_completo && (
                                <span className="text-[10px] text-muted-foreground truncate">{t.profiles.nombre_completo}</span>
                              )}
                            </div>
                          </div>
                          {dT !== null && (
                            <span className={`text-[10px] font-bold shrink-0 ${dT < 0 ? 'text-destructive' : dT <= 3 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                              {dT < 0 ? `−${Math.abs(dT)}d` : dT === 0 ? 'Hoy' : `${dT}d`}
                            </span>
                          )}
                          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-muted-foreground" />
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ── TABS para detalle ── */}
        <Tabs defaultValue="obligaciones" className="space-y-4">
          <TabsList className="w-full lg:w-auto lg:inline-flex">
            <TabsTrigger value="obligaciones" className="gap-1.5">
              <FileText className="w-4 h-4 hidden sm:block" /> Obligaciones
            </TabsTrigger>
            <TabsTrigger value="historial" className="gap-1.5">
              <BarChart3 className="w-4 h-4 hidden sm:block" /> Historial
            </TabsTrigger>
            <TabsTrigger value="informacion" className="gap-1.5">
              <Building2 className="w-4 h-4 hidden sm:block" /> Información
            </TabsTrigger>
            <TabsTrigger value="contactos" className="gap-1.5">
              <Users className="w-4 h-4 hidden sm:block" /> Contactos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="obligaciones" className="space-y-5">
            <EmpresaObligacionesActivasCard empresaId={id!} canEdit={canEdit} />
            <EmpresaObligacionesCard empresa={empresa} canEdit={canEdit} onUpdate={fetchEmpresaData} />
            <CatalogoActivacionSection empresaId={id!} canEdit={canEdit} />
            <ObligacionesManager empresaId={id!} canEdit={canEdit} />
          </TabsContent>

          <TabsContent value="historial" className="space-y-5">
            <Card className="shadow-card">
              <CardHeader className="pb-3">
                <CardTitle className="font-heading text-base flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" /> Historial de Cumplimiento
                </CardTitle>
                <CardDescription>Últimos 6 periodos por obligación</CardDescription>
              </CardHeader>
              <CardContent>
                <CumplimientoResumenEmpresa empresaId={id!} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="informacion" className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <EmpresaGeneralCard empresa={empresa} canEdit={canEdit} onUpdate={fetchEmpresaData} />
              <EmpresaIMMEXCard empresa={empresa} canEdit={canEdit} onUpdate={fetchEmpresaData} />
              <EmpresaPROSECCard empresa={empresa} canEdit={canEdit} onUpdate={fetchEmpresaData} />
              <EmpresaCertificacionCard empresa={empresa} canEdit={canEdit} onUpdate={fetchEmpresaData} />
            </div>
          </TabsContent>

          <TabsContent value="contactos" className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <AgentesAduanalesCard empresaId={id!} agentes={agentes} canEdit={canEdit} onUpdate={fetchEmpresaData} />
              <ApoderadosCard empresaId={id!} apoderados={apoderados} canEdit={canEdit} onUpdate={fetchEmpresaData} />
            </div>
            <DomiciliosCard empresaId={id!} domicilios={domicilios} canEdit={canEdit} onUpdate={fetchEmpresaData} />
          </TabsContent>
        </Tabs>
      </div>

      <ManageConsultoresDialog open={consultoresDialogOpen} onOpenChange={setConsultoresDialogOpen} empresaId={id!} empresaNombre={empresa?.razon_social || ''} />
      <CreateTareaSheet open={createTareaSheetOpen} onOpenChange={o => { setCreateTareaSheetOpen(o); if (!o) fetchEmpresaData(); }} onTareaCreated={fetchEmpresaData} defaultEmpresaId={id} />
      {selectedTareaId && (
        <TareaDetailSheet open={detailTareaSheetOpen} onOpenChange={o => { setDetailTareaSheetOpen(o); if (!o) { fetchEmpresaData(); setSelectedTareaId(null); } }} tareaId={selectedTareaId} onUpdate={fetchEmpresaData} />
      )}
    </DashboardLayout>
  );
}

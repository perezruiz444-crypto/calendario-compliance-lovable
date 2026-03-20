import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { differenceInDays, isPast } from 'date-fns';
import { 
  Plus, Upload, Trash2, Pencil, Search, 
  Calendar, AlertCircle, CheckCircle2, ClipboardList, Filter, BookOpen, FileDown,
  Zap, User, Users, ToggleLeft, ToggleRight, RefreshCw
} from 'lucide-react';
import { ObligacionFormDialog, type ObligacionFormData } from './ObligacionFormDialog';
import { BulkImportDialog, type ParsedRow } from './BulkImportDialog';
import { CatalogoObligacionesDialog } from './CatalogoObligacionesDialog';
import { generateObligacionesPDF } from '@/lib/pdfGenerator';
import * as XLSX from 'xlsx';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  CATEGORIA_LABELS, CATEGORIA_COLORS,
  getCurrentPeriodKey, getPeriodLabel, formatDateShort, getVencimientoInfo, programaToCategoria,
  getNextVencimiento, isRecurring,
} from '@/lib/obligaciones';
import { format } from 'date-fns';

interface Props {
  empresaId: string;
  canEdit: boolean;
}

function getVencimientoBadge(fecha: string | null) {
  const info = getVencimientoInfo(fecha);
  if (!info) return null;
  if (info.status === 'vencido') return <Badge variant="destructive" className="text-xs gap-1"><AlertCircle className="w-3 h-3" />Vencido</Badge>;
  if (info.status === 'urgente') return <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-xs gap-1"><AlertCircle className="w-3 h-3" />{info.days}d</Badge>;
  if (info.status === 'proximo') return <Badge className="bg-warning/20 text-warning border-warning/30 text-xs gap-1"><Calendar className="w-3 h-3" />{info.days}d</Badge>;
  return <Badge className="bg-success/20 text-success border-success/30 text-xs gap-1"><CheckCircle2 className="w-3 h-3" />Vigente</Badge>;
}

export function ObligacionesManager({ empresaId, canEdit }: Props) {
  const { user } = useAuth();
  const [obligaciones, setObligaciones] = useState<any[]>([]);
  const [cumplimientoKeys, setCumplimientoKeys] = useState<Set<string>>(new Set());
  const [cumplimientos, setCumplimientos] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [editData, setEditData] = useState<ObligacionFormData | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filterResponsable, setFilterResponsable] = useState('all');
  const [profiles, setProfiles] = useState<Record<string, string>>({});

  const fetchObligaciones = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('obligaciones')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false });
    if (error) { toast.error('Error al cargar obligaciones'); console.error(error); }
    else {
      setObligaciones(data || []);
      // Fetch cumplimientos for current periods
      if (data && data.length > 0) {
        await fetchCumplimientos(data);
      }
    }
    setLoading(false);
  };

  const fetchCumplimientos = async (obs: any[]) => {
    const periodKeys = obs.map(ob => ({
      id: ob.id,
      key: getCurrentPeriodKey(ob.presentacion)
    }));

    const obIds = obs.map(ob => ob.id);
    const { data, error } = await supabase
      .from('obligacion_cumplimientos')
      .select('obligacion_id, periodo_key')
      .in('obligacion_id', obIds);

    if (!error && data) {
      const map: Record<string, boolean> = {};
      const keys = new Set<string>();
      data.forEach(c => {
        const k = `${c.obligacion_id}:${c.periodo_key}`;
        map[k] = true;
        keys.add(k);
      });
      setCumplimientos(map);
      setCumplimientoKeys(keys);
    }
  };

  useEffect(() => { fetchObligaciones(); }, [empresaId]);

  // Fetch responsable names from junction table
  const [responsablesMap, setResponsablesMap] = useState<Record<string, { id: string; nombre: string; tipo: string }[]>>({});
  
  useEffect(() => {
    if (obligaciones.length === 0) return;
    const fetchResponsables = async () => {
      const obIds = obligaciones.map(o => o.id);
      const { data } = await supabase
        .from('obligacion_responsables')
        .select('obligacion_id, user_id, tipo')
        .in('obligacion_id', obIds);
      if (!data || data.length === 0) {
        // Fallback: check legacy responsable_id
        const legacyIds = obligaciones.filter(o => o.responsable_id).map(o => o.responsable_id);
        if (legacyIds.length > 0) {
          const { data: pData } = await supabase.from('profiles').select('id, nombre_completo').in('id', [...new Set(legacyIds)]);
          if (pData) {
            const map: Record<string, string> = {};
            pData.forEach(p => { map[p.id] = p.nombre_completo; });
            setProfiles(map);
          }
        }
        return;
      }
      const userIds = [...new Set(data.map(r => r.user_id))];
      const { data: pData } = await supabase.from('profiles').select('id, nombre_completo').in('id', userIds);
      const profileMap: Record<string, string> = {};
      if (pData) pData.forEach(p => { profileMap[p.id] = p.nombre_completo; });
      setProfiles(profileMap);
      
      const rMap: Record<string, { id: string; nombre: string; tipo: string }[]> = {};
      data.forEach(r => {
        if (!rMap[r.obligacion_id]) rMap[r.obligacion_id] = [];
        rMap[r.obligacion_id].push({ id: r.user_id, nombre: profileMap[r.user_id] || '', tipo: r.tipo });
      });
      setResponsablesMap(rMap);
    };
    fetchResponsables();
  }, [obligaciones]);

  const toggleCumplimiento = async (obligacionId: string, presentacion: string | null) => {
    if (!user) return;
    const periodKey = getCurrentPeriodKey(presentacion);
    const mapKey = `${obligacionId}:${periodKey}`;
    const isCompleted = cumplimientos[mapKey];

    if (isCompleted) {
      // Remove completion
      const { error } = await supabase
        .from('obligacion_cumplimientos')
        .delete()
        .eq('obligacion_id', obligacionId)
        .eq('periodo_key', periodKey);
      if (error) { toast.error('Error al desmarcar'); return; }
      setCumplimientos(prev => ({ ...prev, [mapKey]: false }));
      toast.success('Cumplimiento desmarcado');
    } else {
      // Add completion
      const { error } = await supabase
        .from('obligacion_cumplimientos')
        .insert({
          obligacion_id: obligacionId,
          periodo_key: periodKey,
          completada_por: user.id,
        });
      if (error) { toast.error('Error al marcar cumplimiento'); return; }
      setCumplimientos(prev => ({ ...prev, [mapKey]: true }));
      toast.success(`Marcada como completada - ${getPeriodLabel(presentacion, periodKey)}`);
    }
  };


  const syncResponsables = async (obligacionId: string, responsableIds: string[], usuarios?: { id: string; nombre: string; tipo: string }[]) => {
    // Delete existing
    await supabase.from('obligacion_responsables').delete().eq('obligacion_id', obligacionId);
    // Insert new
    if (responsableIds.length > 0) {
      const inserts = responsableIds.map(uid => ({
        obligacion_id: obligacionId,
        user_id: uid,
        tipo: 'responsable',
      }));
      await supabase.from('obligacion_responsables').insert(inserts);
    }
  };

  const handleCreate = async (data: ObligacionFormData) => {
    setSaving(true);
    const { data: inserted, error } = await supabase.from('obligaciones').insert({
      empresa_id: empresaId,
      categoria: data.categoria,
      nombre: data.nombre,
      descripcion: data.descripcion || null,
      articulos: data.articulos || null,
      presentacion: data.presentacion || null,
      fecha_autorizacion: data.fecha_autorizacion || null,
      fecha_vencimiento: data.fecha_vencimiento || null,
      fecha_renovacion: data.fecha_renovacion || null,
      fecha_inicio: data.fecha_inicio || null,
      fecha_fin: data.fecha_fin || null,
      numero_oficio: data.numero_oficio || null,
      estado: data.estado,
      notas: data.notas || null,
      activa: data.activa || !!data.fecha_vencimiento,
      responsable_tipo: null,
      responsable_id: null,
    }).select();
    if (error) { toast.error('Error al crear obligación'); setSaving(false); return; }
    // Sync responsables
    if (inserted && inserted.length > 0 && data.responsable_ids?.length > 0) {
      await syncResponsables(inserted[0].id, data.responsable_ids);
    }
    setSaving(false);
    toast.success('Obligación creada');
    setFormOpen(false);
    fetchObligaciones();
  };

  const handleUpdate = async (data: ObligacionFormData) => {
    if (!data.id) return;
    setSaving(true);
    const { error } = await supabase.from('obligaciones').update({
      categoria: data.categoria,
      nombre: data.nombre,
      descripcion: data.descripcion || null,
      articulos: data.articulos || null,
      presentacion: data.presentacion || null,
      fecha_autorizacion: data.fecha_autorizacion || null,
      fecha_vencimiento: data.fecha_vencimiento || null,
      fecha_renovacion: data.fecha_renovacion || null,
      fecha_inicio: data.fecha_inicio || null,
      fecha_fin: data.fecha_fin || null,
      numero_oficio: data.numero_oficio || null,
      estado: data.estado,
      notas: data.notas || null,
      activa: data.activa || !!data.fecha_vencimiento,
      responsable_tipo: data.responsable_tipo || null,
      responsable_id: data.responsable_id || null,
    }).eq('id', data.id);
    setSaving(false);
    if (error) { toast.error('Error al actualizar'); return; }
    toast.success('Obligación actualizada');
    setFormOpen(false);
    setEditData(null);
    fetchObligaciones();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('obligaciones').delete().eq('id', deleteId);
    if (error) { toast.error('Error al eliminar'); return; }
    toast.success('Obligación eliminada');
    setDeleteId(null);
    fetchObligaciones();
  };

  const handleBulkImport = async (rows: ParsedRow[], saveToCatalog: boolean) => {
    setSaving(true);

    const inserts = rows.map(r => ({
      empresa_id: empresaId,
      categoria: programaToCategoria(r.programa),
      nombre: r.nombre,
      descripcion: r.descripcion || null,
      articulos: r.articulos || null,
      presentacion: r.presentacion || null,
      estado: 'vigente',
    }));

    const { error } = await supabase.from('obligaciones').insert(inserts);
    if (error) { toast.error('Error en importación masiva'); console.error(error); setSaving(false); return; }

    if (saveToCatalog) {
      const catalogInserts = rows.map(r => ({
        programa: r.programa,
        nombre: r.nombre,
        articulos: r.articulos || null,
        descripcion: r.descripcion || null,
        presentacion: r.presentacion || null,
      }));
      await supabase.from('obligaciones_catalogo').insert(catalogInserts);
    }

    setSaving(false);
    toast.success(`${rows.length} obligaciones importadas`);
    setBulkOpen(false);
    fetchObligaciones();
  };

  const handleAssignFromCatalog = async (catalogItems: any[]) => {
    if (catalogItems.length === 0) return;
    setSaving(true);

    const inserts = catalogItems.map(item => ({
      empresa_id: empresaId,
      categoria: programaToCategoria(item.programa),
      nombre: item.nombre,
      descripcion: item.descripcion || null,
      articulos: item.articulos || null,
      presentacion: item.presentacion || null,
      estado: 'vigente',
    }));

    const { error } = await supabase.from('obligaciones').insert(inserts);
    setSaving(false);
    if (error) { toast.error('Error al asignar obligaciones'); return; }
    toast.success(`${catalogItems.length} obligaciones asignadas desde catálogo`);
    setCatalogOpen(false);
    fetchObligaciones();
  };

  const openEdit = (ob: any) => {
    setEditData({
      id: ob.id, categoria: ob.categoria, nombre: ob.nombre,
      descripcion: ob.descripcion || '', articulos: ob.articulos || '',
      presentacion: ob.presentacion || '',
      fecha_autorizacion: ob.fecha_autorizacion || '', fecha_vencimiento: ob.fecha_vencimiento || '',
      fecha_renovacion: ob.fecha_renovacion || '', fecha_inicio: ob.fecha_inicio || '',
      fecha_fin: ob.fecha_fin || '', numero_oficio: ob.numero_oficio || '',
      estado: ob.estado, notas: ob.notas || '',
      activa: ob.activa || false,
      responsable_tipo: ob.responsable_tipo || '',
      responsable_id: ob.responsable_id || '',
    });
    setFormOpen(true);
  };

  const handleExportPDF = async () => {
    // Fetch empresa info
    const { data: empresa } = await supabase.from('empresas').select('razon_social, rfc').eq('id', empresaId).single();
    if (!empresa) { toast.error('Error al obtener datos de la empresa'); return; }

    generateObligacionesPDF(
      empresa,
      filtered.map(ob => ({
        ...ob,
        completada_periodo: cumplimientos[`${ob.id}:${getCurrentPeriodKey(ob.presentacion)}`] || false,
        periodo_actual: getPeriodLabel(ob.presentacion, getCurrentPeriodKey(ob.presentacion)),
      }))
    );
    toast.success('Reporte PDF generado');
  };

  const handleExportExcel = () => {
    const rows = filtered.map(ob => {
      const periodKey = getCurrentPeriodKey(ob.presentacion);
      const mapKey = `${ob.id}:${periodKey}`;
      const isCompleted = cumplimientos[mapKey] || false;

      return {
        'Categoría': CATEGORIA_LABELS[ob.categoria] || ob.categoria,
        'Nombre': ob.nombre,
        'Artículos': ob.articulos || '-',
        'Presentación': ob.presentacion || '-',
        'Período Actual': ob.presentacion && ob.presentacion !== 'unica' 
          ? getPeriodLabel(ob.presentacion, periodKey) : '-',
        'Vencimiento': ob.fecha_vencimiento ? formatDateShort(ob.fecha_vencimiento) : '-',
        'Estado': ob.estado,
        'Activa': ob.activa ? 'Sí' : 'No',
        'Cumplida': isCompleted ? 'Sí' : 'No',
        'Responsable': ob.responsable_id ? (profiles[ob.responsable_id] || ob.responsable_tipo || '-') : (ob.responsable_tipo || '-'),
        'Notas': ob.notas || '',
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Obligaciones');
    
    // Auto-size columns
    const colWidths = Object.keys(rows[0] || {}).map(key => ({
      wch: Math.max(key.length, ...rows.map(r => String((r as any)[key] || '').length)).toString().length + 2
    }));
    ws['!cols'] = colWidths;

    XLSX.writeFile(wb, `obligaciones_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success('Reporte Excel generado');
  };

  const filtered = obligaciones.filter(ob => {
    if (filterCategoria !== 'all' && ob.categoria !== filterCategoria) return false;
    if (filterResponsable === 'cliente' && ob.responsable_tipo !== 'cliente') return false;
    if (filterResponsable === 'consultor' && ob.responsable_tipo !== 'consultor') return false;
    if (filterResponsable === 'sin_asignar' && ob.responsable_tipo) return false;
    if (filterResponsable === 'activas' && !ob.activa) return false;
    if (search && !ob.nombre.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const vencidosCount = obligaciones.filter(ob => ob.fecha_vencimiento && isPast(new Date(ob.fecha_vencimiento))).length;
  const porVencerCount = obligaciones.filter(ob => {
    if (!ob.fecha_vencimiento) return false;
    const days = differenceInDays(new Date(ob.fecha_vencimiento), new Date());
    return days >= 0 && days <= 90;
  }).length;

  return (
    <Card className="gradient-card shadow-card col-span-1 lg:col-span-2">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <CardTitle className="font-heading flex items-center gap-2">
            <ClipboardList className="w-5 h-5" />
            Gestión de Obligaciones
            <Badge variant="secondary" className="ml-2">{obligaciones.length}</Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            {vencidosCount > 0 && (
              <Badge variant="destructive" className="gap-1"><AlertCircle className="w-3 h-3" />{vencidosCount} vencido(s)</Badge>
            )}
            {porVencerCount > 0 && (
              <Badge className="bg-warning/20 text-warning border-warning/30 gap-1"><Calendar className="w-3 h-3" />{porVencerCount} próximo(s)</Badge>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mt-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar obligación..." className="pl-9" />
          </div>
          <Select value={filterCategoria} onValueChange={setFilterCategoria}>
            <SelectTrigger className="w-[160px]">
              <Filter className="w-4 h-4 mr-1" /><SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {Object.entries(CATEGORIA_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterResponsable} onValueChange={setFilterResponsable}>
            <SelectTrigger className="w-[160px]">
              <Users className="w-4 h-4 mr-1" /><SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="activas">Solo activas</SelectItem>
              <SelectItem value="cliente">Cliente</SelectItem>
              <SelectItem value="consultor">Consultor</SelectItem>
              <SelectItem value="sin_asignar">Sin asignar</SelectItem>
            </SelectContent>
          </Select>
          {filtered.length > 0 && (
            <div className="flex items-center gap-1">
              <Button size="sm" variant="outline" onClick={handleExportPDF}>
                <FileDown className="w-4 h-4 mr-1" />PDF
              </Button>
              <Button size="sm" variant="outline" onClick={handleExportExcel}>
                <FileDown className="w-4 h-4 mr-1" />Excel
              </Button>
            </div>
          )}
          {canEdit && (
            <>
              <Button size="sm" variant="outline" onClick={() => setCatalogOpen(true)}>
                <BookOpen className="w-4 h-4 mr-1" />Catálogo
              </Button>
              <Button size="sm" variant="outline" onClick={() => setBulkOpen(true)}>
                <Upload className="w-4 h-4 mr-1" />Masivo
              </Button>
              <Button size="sm" onClick={() => { setEditData(null); setFormOpen(true); }}>
                <Plus className="w-4 h-4 mr-1" />Nueva
              </Button>
            </>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10">
            <ClipboardList className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">{obligaciones.length === 0 ? 'Sin obligaciones registradas' : 'Sin resultados para el filtro'}</p>
            {canEdit && obligaciones.length === 0 && (
              <div className="flex justify-center gap-2 mt-4">
                <Button size="sm" variant="outline" onClick={() => setCatalogOpen(true)}><BookOpen className="w-4 h-4 mr-1" />Desde Catálogo</Button>
                <Button size="sm" variant="outline" onClick={() => setBulkOpen(true)}><Upload className="w-4 h-4 mr-1" />Importar</Button>
                <Button size="sm" onClick={() => { setEditData(null); setFormOpen(true); }}><Plus className="w-4 h-4 mr-1" />Agregar</Button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                   {canEdit && <th className="text-center p-2 font-heading font-medium text-muted-foreground w-10">✓</th>}
                   <th className="text-left p-2 font-heading font-medium text-muted-foreground">Categoría</th>
                   <th className="text-left p-2 font-heading font-medium text-muted-foreground">Nombre</th>
                   <th className="text-left p-2 font-heading font-medium text-muted-foreground hidden md:table-cell">Responsable</th>
                   <th className="text-left p-2 font-heading font-medium text-muted-foreground hidden md:table-cell">Presentación</th>
                   <th className="text-left p-2 font-heading font-medium text-muted-foreground hidden lg:table-cell">Período Actual</th>
                   <th className="text-left p-2 font-heading font-medium text-muted-foreground">Vencimiento</th>
                   <th className="text-left p-2 font-heading font-medium text-muted-foreground">Estado</th>
                   {canEdit && <th className="text-right p-2 font-heading font-medium text-muted-foreground">Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map(ob => {
                  const recurring = isRecurring(ob.presentacion);
                  const next = getNextVencimiento(ob.fecha_vencimiento, ob.presentacion, cumplimientoKeys, ob.id);
                  const periodKey = next?.periodKey || getCurrentPeriodKey(ob.presentacion);
                  const mapKey = `${ob.id}:${periodKey}`;
                  const isCompleted = cumplimientos[mapKey] || false;
                  const displayDate = next ? format(next.date, 'dd/MM/yyyy') : formatDateShort(ob.fecha_vencimiento);
                  const vencInfo = next ? getVencimientoInfo(format(next.date, 'yyyy-MM-dd')) : getVencimientoInfo(ob.fecha_vencimiento);

                  return (
                    <tr key={ob.id} className={`border-b last:border-0 hover:bg-muted/50 transition-colors ${isCompleted ? 'bg-success/5' : ''}`}>
                      {canEdit && (
                        <td className="p-2 text-center">
                          <Checkbox
                            checked={isCompleted}
                            onCheckedChange={() => toggleCumplimiento(ob.id, ob.presentacion)}
                            aria-label="Marcar como completada"
                          />
                        </td>
                      )}
                      <td className="p-2">
                        <Badge variant="outline" className={`text-xs ${CATEGORIA_COLORS[ob.categoria] || ''}`}>
                          {CATEGORIA_LABELS[ob.categoria] || ob.categoria}
                        </Badge>
                      </td>
                      <td className="p-2">
                        <div className="flex items-center gap-1.5">
                          {ob.activa && <Zap className="w-3.5 h-3.5 text-primary shrink-0" />}
                          <div>
                            <p className={`font-medium ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>{ob.nombre}</p>
                            {ob.descripcion && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{ob.descripcion}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="p-2 hidden md:table-cell">
                        {ob.responsable_tipo ? (
                          <div className="flex items-center gap-1">
                            {ob.responsable_tipo === 'cliente' ? <User className="w-3 h-3 text-muted-foreground" /> : <Users className="w-3 h-3 text-muted-foreground" />}
                            <span className="text-xs capitalize">{ob.responsable_id ? (profiles[ob.responsable_id] || ob.responsable_tipo) : ob.responsable_tipo}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-2 hidden md:table-cell">
                        <div className="flex items-center gap-1">
                          {recurring && <RefreshCw className="w-3 h-3 text-muted-foreground" />}
                          <span className="text-muted-foreground capitalize">{ob.presentacion || '-'}</span>
                        </div>
                      </td>
                      <td className="p-2 hidden lg:table-cell">
                        {ob.presentacion && ob.presentacion !== 'unica' ? (
                          <Badge variant={isCompleted ? 'default' : 'outline'} className={`text-xs ${isCompleted ? 'bg-success text-success-foreground' : ''}`}>
                            {isCompleted ? '✓ ' : ''}{getPeriodLabel(ob.presentacion, periodKey)}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </td>
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          <span>{displayDate}</span>
                          {vencInfo && getVencimientoBadge(next ? format(next.date, 'yyyy-MM-dd') : ob.fecha_vencimiento)}
                        </div>
                      </td>
                      <td className="p-2"><Badge variant="outline" className="text-xs capitalize">{ob.estado}</Badge></td>
                      {canEdit && (
                        <td className="p-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className={`h-7 w-7 ${ob.activa ? 'text-primary' : 'text-muted-foreground'}`}
                              title={ob.activa ? 'Desactivar' : 'Activar'}
                              onClick={async () => {
                                const { error } = await supabase.from('obligaciones').update({ activa: !ob.activa }).eq('id', ob.id);
                                if (error) { toast.error('Error al cambiar estado'); return; }
                                toast.success(ob.activa ? 'Obligación desactivada' : 'Obligación activada');
                                fetchObligaciones();
                              }}
                            >
                              {ob.activa ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(ob)}><Pencil className="w-3.5 h-3.5" /></Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(ob.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <ObligacionFormDialog
        open={formOpen}
        onOpenChange={(v) => { setFormOpen(v); if (!v) setEditData(null); }}
        onSubmit={editData?.id ? handleUpdate : handleCreate}
        initialData={editData}
        loading={saving}
        empresaId={empresaId}
      />

      <BulkImportDialog open={bulkOpen} onOpenChange={setBulkOpen} onImport={handleBulkImport} loading={saving} />

      <CatalogoObligacionesDialog
        open={catalogOpen}
        onOpenChange={setCatalogOpen}
        onAssign={handleAssignFromCatalog}
        loading={saving}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar obligación?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

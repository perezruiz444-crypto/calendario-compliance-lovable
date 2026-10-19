import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useObligationOverview } from '@/hooks/useObligationOverview';
import { useQueryClient } from '@tanstack/react-query';
import { managementFollowupLabel } from '@/lib/obligationModel';
import { toast } from 'sonner';
import {
  Plus, Trash2, Pencil, Search,
  ClipboardList, Filter, FileDown,
  Zap, User, Users, ToggleLeft, ToggleRight, BookOpen
} from 'lucide-react';
import { ObligacionFormDialog, type ObligacionFormData } from './ObligacionFormDialog';
import { CrearObligacionChooser } from './CrearObligacionChooser';
import { ActivarObligacionDialog } from './ActivarObligacionDialog';
import { generateObligacionesPDF } from '@/lib/pdfGenerator';
import { exportToExcel } from '@/lib/excelExport';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CATEGORIA_LABELS, CATEGORIA_COLORS, formatDateShort } from '@/lib/obligaciones';
import { CumplimientoHistorial } from './CumplimientoHistorial';
import { logger } from '@/lib/logger';
import { nombresPerfiles } from '@/lib/perfiles';
import type { Obligacion } from '@/types/domain';

interface Props {
  empresaId: string;
  canEdit: boolean;
}

interface CatalogoMinItem {
  id: string;
  nombre: string;
  programa: string;
  presentacion: string | null;
}

export function ObligacionesManager({ empresaId, canEdit }: Props) {
  const queryClient = useQueryClient();
  const overview = useObligationOverview(empresaId);
  const [obligaciones, setObligaciones] = useState<Obligacion[]>([]);
  const [history, setHistory] = useState<Obligacion | null>(null);
  const [filterEstado, setFilterEstado] = useState('activas');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editData, setEditData] = useState<ObligacionFormData | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filterResponsable, setFilterResponsable] = useState('all');
  const [filterOrigen, setFilterOrigen] = useState<'all' | 'manual' | 'catalogo'>('all');
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [chooserOpen, setChooserOpen] = useState(false);
  const [sugerenciaCatalogoItem, setSugerenciaCatalogoItem] = useState<CatalogoMinItem | null>(null);
  const [sugerenciaDialogOpen, setSugerenciaDialogOpen] = useState(false);

  const fetchObligaciones = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('obligaciones')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false });
    if (error) { toast.error('Error al cargar obligaciones'); logger.error('Error en la operación', error); }
    else {
      setObligaciones(data || []);
    }
    setLoading(false);
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
        const legacyIds = obligaciones.flatMap(o => (o.responsable_id ? [o.responsable_id] : []));
        if (legacyIds.length > 0) {
          const pData = await nombresPerfiles(legacyIds);
          const map: Record<string, string> = {};
          pData.forEach(p => { map[p.id] = p.nombre_completo; });
          setProfiles(map);
        }
        return;
      }
      const pData = await nombresPerfiles(data.map(r => r.user_id));
      const profileMap: Record<string, string> = {};
      pData.forEach(p => { profileMap[p.id] = p.nombre_completo; });
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
    void queryClient.invalidateQueries({ queryKey: ['obligation-overview'] });
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
      responsable_tipo: null,
      responsable_id: null,
    }).eq('id', data.id);
    if (error) { toast.error('Error al actualizar'); setSaving(false); return; }
    // Sync responsables
    await syncResponsables(data.id, data.responsable_ids || []);
    setSaving(false);
    void queryClient.invalidateQueries({ queryKey: ['obligation-overview'] });
    toast.success('Obligación actualizada');
    setFormOpen(false);
    setEditData(null);
    fetchObligaciones();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('obligaciones').delete().eq('id', deleteId);
    if (error) { toast.error('Error al eliminar'); return; }
    void queryClient.invalidateQueries({ queryKey: ['obligation-overview'] });
    toast.success('Obligación eliminada');
    setDeleteId(null);
    fetchObligaciones();
  };

  const openEdit = (ob: Obligacion) => {
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
      responsable_ids: [],
    });
    setFormOpen(true);
  };

  const followup = (ob: Obligacion) => managementFollowupLabel(
    ob.activa,
    overview.data?.obligaciones.find(item => item.id === ob.id)?.regla ?? null,
    !!overview.data?.metadataReady && !overview.isError,
  );

  const handleExportPDF = async () => {
    const { data: empresa } = await supabase.from('empresas').select('razon_social, rfc').eq('id', empresaId).single();
    if (!empresa) { toast.error('Error al obtener datos de la empresa'); return; }
    generateObligacionesPDF(empresa, filtered.map(ob => ({ ...ob, seguimiento: followup(ob) })));
    toast.success('Inventario PDF generado');
  };

  const handleExportExcel = async () => {
    await exportToExcel(filtered.map(ob => ({
      'Categoría': CATEGORIA_LABELS[ob.categoria] || ob.categoria,
      'Nombre': ob.nombre,
      'Referencias capturadas': ob.articulos || '-',
      'Presentación capturada': ob.presentacion || '-',
      'Fecha registrada (por revisar)': ob.fecha_vencimiento ? formatDateShort(ob.fecha_vencimiento) : '-',
      'Seguimiento': followup(ob),
      'Activa': ob.activa ? 'Sí' : 'No',
      'Responsable': ob.responsable_id ? (profiles[ob.responsable_id] || ob.responsable_tipo || '-') : (ob.responsable_tipo || '-'),
      'Notas': ob.notas || '',
    })), 'Inventario', `inventario_obligaciones_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success('Inventario Excel generado');
  };

  const filtered = obligaciones.filter(ob => {
    if (filterCategoria !== 'all' && ob.categoria !== filterCategoria) return false;
    if (filterResponsable === 'cliente' && ob.responsable_tipo !== 'cliente') return false;
    if (filterResponsable === 'consultor' && ob.responsable_tipo !== 'consultor') return false;
    if (filterResponsable === 'sin_asignar' && ob.responsable_tipo) return false;
    if (filterEstado === 'activas' && !ob.activa) return false;
    if (filterEstado === 'inactivas' && ob.activa) return false;
    if (search && !ob.nombre.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterOrigen === 'manual' && ob.catalogo_id) return false;
    if (filterOrigen === 'catalogo' && !ob.catalogo_id) return false;
    return true;
  });

  const handleDesdeCatalogo = () => {
    const el = document.getElementById('catalogo-activacion-section');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSugerirCatalogo = (item: CatalogoMinItem) => {
    setFormOpen(false);
    setEditData(null);
    setSugerenciaCatalogoItem(item);
    setSugerenciaDialogOpen(true);
  };

  return (
    <Card role="region" aria-label="Configuración e historial de obligaciones" className="shadow-card col-span-1 lg:col-span-2">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <CardTitle className="font-heading flex items-center gap-2">
            <ClipboardList className="w-5 h-5" />
            Configuración e historial de obligaciones
            <Badge variant="secondary" className="ml-2">{filtered.length}</Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
          </div>
        </div>

        <p className="text-sm text-muted-foreground mt-2">Configura los registros y consulta su historial. Atiende entregas, eventos y revisiones en el panel de seguimiento superior.</p>
        <p className="text-xs text-muted-foreground mt-1">Las fechas y presentaciones capturadas no acreditan vencimientos ni validación normativa.</p>
        {overview.isError && <p role="alert" className="text-sm text-warning mt-2">No se pudo confirmar el tipo de seguimiento. Los registros y su historial siguen disponibles.</p>}
        <div className="flex flex-col sm:flex-row flex-wrap gap-2 mt-3">
          <div className="relative flex-1 min-w-[200px]">
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
          <Select value={filterEstado} onValueChange={setFilterEstado}>
            <SelectTrigger className="w-[160px]" aria-label="Estado de los registros"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="activas">Solo activas</SelectItem>
              <SelectItem value="inactivas">Solo inactivas</SelectItem>
              <SelectItem value="todas">Activas e inactivas</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterResponsable} onValueChange={setFilterResponsable}>
            <SelectTrigger className="w-[160px]">
              <Users className="w-4 h-4 mr-1" /><SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="cliente">Cliente</SelectItem>
              <SelectItem value="consultor">Consultor</SelectItem>
              <SelectItem value="sin_asignar">Sin asignar</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterOrigen} onValueChange={(v) => setFilterOrigen(v as 'all' | 'manual' | 'catalogo')}>
            <SelectTrigger className="w-[160px]">
              <BookOpen className="w-4 h-4 mr-1" /><SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="manual">Solo manuales</SelectItem>
              <SelectItem value="catalogo">Solo catálogo</SelectItem>
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
            <Button size="sm" onClick={() => setChooserOpen(true)}>
              <Plus className="w-4 h-4 mr-1" />Nueva
            </Button>
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
                <Button size="sm" onClick={() => { setEditData(null); setFormOpen(true); }}><Plus className="w-4 h-4 mr-1" />Agregar manualmente</Button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                   <th className="text-left p-2 font-heading font-medium text-muted-foreground">Categoría</th>
                   <th className="text-left p-2 font-heading font-medium text-muted-foreground">Nombre</th>
                   <th className="text-left p-2 font-heading font-medium text-muted-foreground hidden md:table-cell">Responsable</th>
                   <th className="text-left p-2 font-heading font-medium text-muted-foreground hidden md:table-cell">Presentación capturada</th>
                   <th className="text-left p-2 font-heading font-medium text-muted-foreground">Fecha registrada</th>
                   <th className="text-left p-2 font-heading font-medium text-muted-foreground">Seguimiento</th>
                   {canEdit && <th className="text-right p-2 font-heading font-medium text-muted-foreground">Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map(ob => {
                  return (
                    <tr key={ob.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="p-2">
                        <Badge variant="outline" className={`text-xs ${CATEGORIA_COLORS[ob.categoria] || ''}`}>
                          {CATEGORIA_LABELS[ob.categoria] || ob.categoria}
                        </Badge>
                      </td>
                      <td className="p-2">
                        <div className="flex items-center gap-1.5">
                          {ob.activa && <Zap className="w-3.5 h-3.5 text-primary shrink-0" />}
                          <div>
                           <button
  className="font-medium text-left hover:text-primary transition-colors"
  title="Consultar historial de cumplimientos"
  onClick={() => setHistory(ob)}
>
  {ob.nombre}
</button>
{!ob.catalogo_id && (
  <Badge variant="outline" className="text-[10px] text-muted-foreground ml-1 align-middle">
    Manual
  </Badge>
)}
{ob.descripcion && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{ob.descripcion}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="p-2 hidden md:table-cell">
                        {(responsablesMap[ob.id]?.length > 0) ? (
                          <div className="flex flex-wrap gap-1">
                            {responsablesMap[ob.id].map(r => (
                              <Badge key={r.id} variant="outline" className="text-xs gap-1">
                                <User className="w-3 h-3" />
                                {r.nombre || r.tipo}
                              </Badge>
                            ))}
                          </div>
                        ) : ob.responsable_id ? (
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs">{profiles[ob.responsable_id] || ob.responsable_tipo || '-'}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-2 hidden md:table-cell">
                        <span className="text-muted-foreground">{ob.presentacion || '-'}</span>
                      </td>
                      <td className="p-2"><span>{ob.fecha_vencimiento ? formatDateShort(ob.fecha_vencimiento) : '-'}</span></td>
                      <td className="p-2"><Badge variant="outline" className="text-xs">{followup(ob)}</Badge></td>
                      {canEdit && (
                        <td className="p-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              aria-label={ob.activa ? 'Desactivar' : 'Activar'}
                              size="icon"
                              variant="ghost"
                              className={`h-7 w-7 ${ob.activa ? 'text-primary' : 'text-muted-foreground'}`}
                              title={ob.activa ? 'Desactivar' : 'Activar'}
                              onClick={async () => {
                                const { error } = await supabase.from('obligaciones').update({ activa: !ob.activa }).eq('id', ob.id);
                                if (error) { toast.error('Error al cambiar estado'); return; }
                                void queryClient.invalidateQueries({ queryKey: ['obligation-overview'] });
                                toast.success(ob.activa ? 'Obligación desactivada' : 'Obligación activada');
                                fetchObligaciones();
                              }}
                            >
                              {ob.activa ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                            </Button>
                            <Button aria-label="Editar obligación" size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(ob)}><Pencil className="w-3.5 h-3.5" /></Button>
                            <Button aria-label="Eliminar obligación" size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(ob.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
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
        onSugerirCatalogo={handleSugerirCatalogo}
      />

      {history && <CumplimientoHistorial
        open onOpenChange={open => { if (!open) setHistory(null); }}
        obligacionId={history.id} obligacionNombre={history.nombre} presentacion={history.presentacion}
      />}
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

      <CrearObligacionChooser
        open={chooserOpen}
        onOpenChange={setChooserOpen}
        onDesdeCatalogo={handleDesdeCatalogo}
        onPersonalizada={() => { setEditData(null); setFormOpen(true); }}
      />
      <ActivarObligacionDialog
        open={sugerenciaDialogOpen}
        onOpenChange={setSugerenciaDialogOpen}
        item={sugerenciaCatalogoItem as Parameters<typeof ActivarObligacionDialog>[0]['item']}
        empresaId={empresaId}
        onActivated={() => {
          setSugerenciaCatalogoItem(null);
          void queryClient.invalidateQueries({ queryKey: ['obligation-overview'] });
          fetchObligaciones();
        }}
      />
    </Card>
  );
}

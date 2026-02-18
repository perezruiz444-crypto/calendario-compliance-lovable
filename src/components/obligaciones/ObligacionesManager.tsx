import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format, differenceInDays, isPast, isValid } from 'date-fns';
import { 
  Plus, Upload, Trash2, Pencil, Search, 
  Calendar, AlertCircle, CheckCircle2, ClipboardList, Filter, BookOpen
} from 'lucide-react';
import { ObligacionFormDialog, type ObligacionFormData } from './ObligacionFormDialog';
import { BulkImportDialog, type ParsedRow } from './BulkImportDialog';
import { CatalogoObligacionesDialog } from './CatalogoObligacionesDialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Props {
  empresaId: string;
  canEdit: boolean;
}

const CATEGORIA_LABELS: Record<string, string> = {
  general: 'General', cert_iva_ieps: 'Cert. IVA/IEPS', immex: 'IMMEX',
  prosec: 'PROSEC', padron: 'Padrón', otro: 'Otro',
};

const CATEGORIA_COLORS: Record<string, string> = {
  general: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  cert_iva_ieps: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  immex: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  prosec: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  padron: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  otro: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300',
};

function getVencimientoBadge(fecha: string | null) {
  if (!fecha) return null;
  const date = new Date(fecha);
  if (!isValid(date)) return null;
  const days = differenceInDays(date, new Date());
  if (isPast(date)) return <Badge variant="destructive" className="text-xs gap-1"><AlertCircle className="w-3 h-3" />Vencido</Badge>;
  if (days <= 30) return <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-xs gap-1"><AlertCircle className="w-3 h-3" />{days}d</Badge>;
  if (days <= 90) return <Badge className="bg-warning/20 text-warning border-warning/30 text-xs gap-1"><Calendar className="w-3 h-3" />{days}d</Badge>;
  return <Badge className="bg-success/20 text-success border-success/30 text-xs gap-1"><CheckCircle2 className="w-3 h-3" />Vigente</Badge>;
}

function formatDateShort(fecha: string | null) {
  if (!fecha) return '-';
  const d = new Date(fecha);
  return isValid(d) ? format(d, 'dd/MM/yyyy') : '-';
}

export function ObligacionesManager({ empresaId, canEdit }: Props) {
  const { user } = useAuth();
  const [obligaciones, setObligaciones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [editData, setEditData] = useState<ObligacionFormData | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchObligaciones = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('obligaciones')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('fecha_vencimiento', { ascending: true, nullsFirst: false });
    if (error) { toast.error('Error al cargar obligaciones'); console.error(error); }
    else setObligaciones(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchObligaciones(); }, [empresaId]);

  // Map presentacion to recurrence frequency for tasks
  const presentacionToFrecuencia = (presentacion: string | null): string | null => {
    if (!presentacion) return null;
    const lower = presentacion.toLowerCase();
    if (lower === 'semanal') return 'semanal';
    if (lower === 'quincenal') return 'quincenal';
    if (lower === 'mensual') return 'mensual';
    if (lower === 'bimestral') return 'mensual'; // interval 2
    if (lower === 'trimestral') return 'trimestral';
    if (lower === 'semestral') return 'mensual'; // interval 6
    if (lower === 'anual') return 'anual';
    return null;
  };

  const presentacionToIntervalo = (presentacion: string | null): number => {
    if (!presentacion) return 1;
    const lower = presentacion.toLowerCase();
    if (lower === 'bimestral') return 2;
    if (lower === 'semestral') return 6;
    return 1;
  };

  const isRecurring = (presentacion: string | null): boolean => {
    return presentacionToFrecuencia(presentacion) !== null && presentacion?.toLowerCase() !== 'unica';
  };

  const createTaskForObligation = async (data: ObligacionFormData, obligacionId: string) => {
    if (!user) return;
    const frecuencia = presentacionToFrecuencia(data.presentacion);
    if (!frecuencia || data.presentacion?.toLowerCase() === 'unica') return;

    const today = new Date().toISOString().split('T')[0];
    const { error } = await supabase.from('tareas').insert({
      titulo: `[Obligación] ${data.nombre}`,
      descripcion: `Obligación recurrente: ${data.nombre}${data.articulos ? ` - Art. ${data.articulos}` : ''}`,
      empresa_id: empresaId,
      creado_por: user.id,
      es_recurrente: true,
      frecuencia_recurrencia: frecuencia,
      intervalo_recurrencia: presentacionToIntervalo(data.presentacion),
      fecha_inicio_recurrencia: data.fecha_inicio || today,
      fecha_fin_recurrencia: data.fecha_fin || null,
      fecha_vencimiento: data.fecha_vencimiento || null,
      estado: 'pendiente',
      prioridad: 'media',
    });
    if (error) {
      console.error('Error creating task for obligation:', error);
      toast.error('Obligación creada, pero hubo un error al generar la tarea recurrente');
    } else {
      toast.success('Tarea recurrente generada automáticamente');
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
    }).select('id').single();
    setSaving(false);
    if (error) { toast.error('Error al crear obligación'); return; }
    toast.success('Obligación creada');
    
    // Auto-generate recurring task if applicable
    if (inserted && isRecurring(data.presentacion)) {
      await createTaskForObligation(data, inserted.id);
    }
    
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

    // Map programa text to categoria key
    const programaToCategoria = (programa: string): string => {
      const lower = programa.toLowerCase();
      if (lower.includes('immex')) return 'immex';
      if (lower.includes('prosec')) return 'prosec';
      if (lower.includes('cert') || lower.includes('iva') || lower.includes('ieps')) return 'cert_iva_ieps';
      if (lower.includes('padr')) return 'padron';
      if (lower.includes('general')) return 'general';
      return 'otro';
    };

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

    // Save to catalog if requested
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

    const programaToCategoria = (programa: string): string => {
      const lower = programa.toLowerCase();
      if (lower.includes('immex')) return 'immex';
      if (lower.includes('prosec')) return 'prosec';
      if (lower.includes('cert') || lower.includes('iva') || lower.includes('ieps')) return 'cert_iva_ieps';
      if (lower.includes('padr')) return 'padron';
      if (lower.includes('general')) return 'general';
      return 'otro';
    };

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
    });
    setFormOpen(true);
  };

  const filtered = obligaciones.filter(ob => {
    if (filterCategoria !== 'all' && ob.categoria !== filterCategoria) return false;
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
                  <th className="text-left p-2 font-heading font-medium text-muted-foreground">Categoría</th>
                  <th className="text-left p-2 font-heading font-medium text-muted-foreground">Nombre</th>
                  <th className="text-left p-2 font-heading font-medium text-muted-foreground hidden md:table-cell">Artículo(s)</th>
                  <th className="text-left p-2 font-heading font-medium text-muted-foreground hidden md:table-cell">Presentación</th>
                  <th className="text-left p-2 font-heading font-medium text-muted-foreground">Vencimiento</th>
                  <th className="text-left p-2 font-heading font-medium text-muted-foreground">Estado</th>
                  {canEdit && <th className="text-right p-2 font-heading font-medium text-muted-foreground">Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map(ob => (
                  <tr key={ob.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                    <td className="p-2">
                      <Badge variant="outline" className={`text-xs ${CATEGORIA_COLORS[ob.categoria] || ''}`}>
                        {CATEGORIA_LABELS[ob.categoria] || ob.categoria}
                      </Badge>
                    </td>
                    <td className="p-2">
                      <p className="font-medium">{ob.nombre}</p>
                      {ob.descripcion && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{ob.descripcion}</p>}
                    </td>
                    <td className="p-2 hidden md:table-cell text-muted-foreground">{ob.articulos || '-'}</td>
                    <td className="p-2 hidden md:table-cell text-muted-foreground">{ob.presentacion || '-'}</td>
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <span>{formatDateShort(ob.fecha_vencimiento)}</span>
                        {getVencimientoBadge(ob.fecha_vencimiento)}
                      </div>
                    </td>
                    <td className="p-2"><Badge variant="outline" className="text-xs capitalize">{ob.estado}</Badge></td>
                    {canEdit && (
                      <td className="p-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(ob)}><Pencil className="w-3.5 h-3.5" /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(ob.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
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

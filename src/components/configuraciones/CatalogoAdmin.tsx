import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Trash2, BookOpen, Pencil, X, Check, Eye, EyeOff, AlertTriangle, Activity } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CATEGORIA_COLORS, PROGRAMA_LABELS } from '@/lib/obligaciones';

const PERIODICIDADES_COMUNES = [
  'mensual', 'bimestral', 'trimestral', 'semestral', 'anual', 'única',
  'En todo momento', 'Al destruir desperdicios', 'Cuando aplique',
];

type FrecuenciaTipo = 'MENSUAL' | 'BIMESTRAL' | 'TRIMESTRAL' | 'SEMESTRAL' | 'ANUAL' | 'EVENTUAL' | 'SEMANAL' | 'ULTIMO_DIA_MES';

const FRECUENCIA_OPTIONS: { value: FrecuenciaTipo; label: string; ocurrencias: number }[] = [
  { value: 'MENSUAL',        label: 'Mensual',                    ocurrencias: 12 },
  { value: 'BIMESTRAL',      label: 'Bimestral',                  ocurrencias: 6  },
  { value: 'TRIMESTRAL',     label: 'Trimestral',                 ocurrencias: 4  },
  { value: 'SEMESTRAL',      label: 'Semestral',                  ocurrencias: 2  },
  { value: 'ANUAL',          label: 'Anual',                      ocurrencias: 1  },
  { value: 'SEMANAL',        label: 'Semanal',                    ocurrencias: 52 },
  { value: 'ULTIMO_DIA_MES', label: 'Último día de cada mes',     ocurrencias: 12 },
  { value: 'EVENTUAL',       label: 'Eventual / sin recurrencia', ocurrencias: 0  },
];

const MESES_NOMBRES = [
  'enero','febrero','marzo','abril','mayo','junio',
  'julio','agosto','septiembre','octubre','noviembre','diciembre',
];

function presentacionMencionaMes(presentacion: string): boolean {
  const lower = presentacion.toLowerCase();
  return MESES_NOMBRES.some(m => lower.includes(`de ${m}`));
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

interface CatalogoItem {
  id: string;
  programa: string;
  categoria: string | null;
  nombre: string;
  articulos: string | null;
  descripcion: string | null;
  presentacion: string | null;
  obligatorio: boolean;
  activo: boolean;
  orden: number;
  notas_internas: string | null;
  frecuencia_tipo: FrecuenciaTipo | null;
  dia_vencimiento: number | null;
  mes_vencimiento: number | null;
}

interface CatalogoCoverage {
  id: string;
  nombre: string;
  programa: string;
  frecuencia_tipo: FrecuenciaTipo | null;
  presentacion: string | null;
  empresas_activas: number;
  ocurrencias_anio: number;
}

interface BanderaRoja {
  id: string;
  nombre: string;
  tipo: 'frecuencia_inconsistente' | 'sin_empresas' | 'sin_frecuencia';
  mensaje: string;
}

interface FormData {
  programa: string;
  nombre: string;
  articulos: string;
  descripcion: string;
  presentacion: string;
  obligatorio: boolean;
  activo: boolean;
  notas_internas: string;
  frecuencia_tipo: FrecuenciaTipo | '';
  dia_vencimiento: string;
  mes_vencimiento: string;
}

const EMPTY: FormData = {
  programa: 'immex',
  nombre: '',
  articulos: '',
  descripcion: '',
  presentacion: 'mensual',
  obligatorio: false,
  activo: true,
  notas_internas: '',
  frecuencia_tipo: '',
  dia_vencimiento: '',
  mes_vencimiento: '',
};

const ORDEN_PROGRAMAS = Object.keys(PROGRAMA_LABELS);
const FALLBACK_COLOR = 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300';

export function CatalogoAdmin() {
  const [items, setItems]           = useState<CatalogoItem[]>([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [search, setSearch]         = useState('');
  const [filterProg, setFilterProg] = useState('all');
  const [showInactive, setShowInactive] = useState(false);
  const [showForm, setShowForm]     = useState(false);
  const [editId, setEditId]         = useState<string | null>(null);
  const [form, setForm]             = useState<FormData>(EMPTY);

  const [coverage, setCoverage]           = useState<CatalogoCoverage[]>([]);
  const [loadingHealth, setLoadingHealth] = useState(false);

  useEffect(() => { fetchItems(); }, []);

  const fetchHealth = async () => {
    setLoadingHealth(true);
    const anio = new Date().getFullYear();
    const { data: cats } = await supabase
      .from('obligaciones_catalogo')
      .select('id, nombre, programa, frecuencia_tipo, presentacion, activo')
      .eq('activo', true);
    if (!cats) { setLoadingHealth(false); return; }
    const { data: obligs } = await supabase
      .from('obligaciones')
      .select('catalogo_id, empresa_id, fecha_vencimiento')
      .not('catalogo_id', 'is', null)
      .eq('activa', true)
      .gte('fecha_vencimiento', `${anio}-01-01`)
      .lte('fecha_vencimiento', `${anio}-12-31`);
    const coverageData: CatalogoCoverage[] = cats.map((cat: any) => {
      const filas = (obligs || []).filter((o: any) => o.catalogo_id === cat.id);
      const empresasSet = new Set(filas.map((o: any) => o.empresa_id));
      return {
        id: cat.id,
        nombre: cat.nombre,
        programa: cat.programa,
        frecuencia_tipo: cat.frecuencia_tipo,
        presentacion: cat.presentacion,
        empresas_activas: empresasSet.size,
        ocurrencias_anio: filas.length,
      };
    });
    setCoverage(coverageData);
    setLoadingHealth(false);
  };

  const calcBanderas = (cov: CatalogoCoverage[]): BanderaRoja[] => {
    const banderas: BanderaRoja[] = [];
    for (const cat of cov) {
      if (
        cat.frecuencia_tipo === 'ULTIMO_DIA_MES' &&
        cat.presentacion &&
        presentacionMencionaMes(cat.presentacion)
      ) {
        banderas.push({
          id: cat.id, nombre: cat.nombre, tipo: 'frecuencia_inconsistente',
          mensaje: `"${cat.nombre}" genera fechas todo el año pero su descripción menciona un mes específico. Considera cambiar la frecuencia a Anual.`,
        });
      }
      if (cat.empresas_activas === 0) {
        banderas.push({
          id: cat.id, nombre: cat.nombre, tipo: 'sin_empresas',
          mensaje: `"${cat.nombre}" está activa en el catálogo pero ninguna empresa la tiene asignada.`,
        });
      }
      if ((!cat.frecuencia_tipo || cat.frecuencia_tipo === 'EVENTUAL') && cat.ocurrencias_anio > 0) {
        banderas.push({
          id: cat.id, nombre: cat.nombre, tipo: 'sin_frecuencia',
          mensaje: `"${cat.nombre}" no tiene recurrencia configurada — sus obligaciones solo aparecen una vez en el calendario.`,
        });
      }
    }
    return banderas;
  };

  const fetchItems = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('obligaciones_catalogo')
      .select('*')
      .order('orden')
      .order('nombre');
    setItems((data as unknown as CatalogoItem[]) || []);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.nombre.trim() || !form.programa) {
      toast.error('Nombre y programa son requeridos');
      return;
    }
    setSaving(true);
    const dia = form.dia_vencimiento ? parseInt(form.dia_vencimiento, 10) : null;
    const mes = form.mes_vencimiento ? parseInt(form.mes_vencimiento, 10) : null;
    if (dia !== null && (isNaN(dia) || dia < 1 || dia > 31)) {
      toast.error('Día de vencimiento debe estar entre 1 y 31');
      setSaving(false);
      return;
    }
    if (
      form.frecuencia_tipo === 'ULTIMO_DIA_MES' &&
      form.presentacion &&
      presentacionMencionaMes(form.presentacion)
    ) {
      toast.warning(
        'El texto de presentación menciona un mes específico. Considera cambiar la frecuencia a "Anual" para que solo genere una fecha al año.'
      );
    }
    const payload = {
      programa:        form.programa,
      categoria:       form.programa,
      nombre:          form.nombre.trim(),
      articulos:       form.articulos.trim() || null,
      descripcion:     form.descripcion.trim() || null,
      presentacion:    form.presentacion.trim() || null,
      obligatorio:     form.obligatorio,
      activo:          form.activo,
      notas_internas:  form.notas_internas.trim() || null,
      frecuencia_tipo: form.frecuencia_tipo || null,
      dia_vencimiento: form.frecuencia_tipo && form.frecuencia_tipo !== 'EVENTUAL' ? dia : null,
      mes_vencimiento: form.frecuencia_tipo === 'ANUAL' ? mes : null,
    };
    if (editId) {
      const { error } = await supabase.from('obligaciones_catalogo').update(payload as any).eq('id', editId);
      if (error) { toast.error('Error al actualizar: ' + error.message); setSaving(false); return; }
      toast.success('Obligación actualizada');
    } else {
      const { error } = await supabase.from('obligaciones_catalogo').insert(payload as any);
      if (error) { toast.error('Error al crear: ' + error.message); setSaving(false); return; }
      toast.success('Obligación agregada al catálogo');
    }
    setForm(EMPTY);
    setEditId(null);
    setShowForm(false);
    setSaving(false);
    fetchItems();
  };

  const handleEdit = (item: CatalogoItem) => {
    setForm({
      programa:        item.programa,
      nombre:          item.nombre,
      articulos:       item.articulos || '',
      descripcion:     item.descripcion || '',
      presentacion:    item.presentacion || '',
      obligatorio:     item.obligatorio,
      activo:          item.activo,
      notas_internas:  item.notas_internas || '',
      frecuencia_tipo: item.frecuencia_tipo || '',
      dia_vencimiento: item.dia_vencimiento?.toString() || '',
      mes_vencimiento: item.mes_vencimiento?.toString() || '',
    });
    setEditId(item.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleActivo = async (item: CatalogoItem) => {
    const nuevoEstado = !item.activo;
    const { error } = await supabase
      .from('obligaciones_catalogo')
      .update({ activo: nuevoEstado } as any)
      .eq('id', item.id);
    if (error) { toast.error('Error al actualizar estado'); return; }
    toast.success(nuevoEstado ? 'Obligación reactivada' : 'Obligación desactivada');
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, activo: nuevoEstado } : i));
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Eliminar permanentemente esta obligación del catálogo? Esta acción no se puede deshacer.')) return;
    const { error } = await supabase.from('obligaciones_catalogo').delete().eq('id', id);
    if (error) { toast.error('Error al eliminar'); return; }
    toast.success('Eliminado del catálogo');
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const handleCancel = () => {
    setForm(EMPTY);
    setEditId(null);
    setShowForm(false);
  };

  const filtered = items.filter(i => {
    const matchSearch = !search ||
      i.nombre.toLowerCase().includes(search.toLowerCase()) ||
      (i.programa || '').toLowerCase().includes(search.toLowerCase()) ||
      (i.articulos || '').toLowerCase().includes(search.toLowerCase());
    const matchProg   = filterProg === 'all' || i.programa === filterProg;
    const matchActivo = showInactive ? true : i.activo;
    return matchSearch && matchProg && matchActivo;
  });

  // Agrupación dinámica ordenada según PROGRAMA_LABELS
  const grouped = filtered.reduce((acc, item) => {
    const prog = item.programa || 'otro';
    if (!acc[prog]) acc[prog] = [];
    acc[prog].push(item);
    return acc;
  }, {} as Record<string, CatalogoItem[]>);

  const sortedGroups = Object.entries(grouped).sort(([a], [b]) => {
    const ia = ORDEN_PROGRAMAS.indexOf(a);
    const ib = ORDEN_PROGRAMAS.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

  const totalActivas = items.filter(i => i.activo).length;
  const totalInactivas = items.filter(i => !i.activo).length;

  return (
    <Card className="gradient-card shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="font-heading flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              Catálogo Maestro de Obligaciones
            </CardTitle>
            <CardDescription className="font-body mt-1">
              Define las obligaciones disponibles para asignar a empresas. Solo administradores pueden modificar este catálogo.
            </CardDescription>
            <div className="flex gap-2 mt-2">
              <Badge variant="secondary" className="text-xs">{totalActivas} activas</Badge>
              {totalInactivas > 0 && (
                <Badge variant="outline" className="text-xs text-muted-foreground">{totalInactivas} inactivas</Badge>
              )}
            </div>
          </div>
          <Button onClick={() => { setShowForm(true); setEditId(null); setForm(EMPTY); }} className="gap-2" size="sm">
            <Plus className="w-4 h-4" /> Nueva obligación
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <Tabs defaultValue="catalogo" onValueChange={(v) => { if (v === 'salud') fetchHealth(); }}>
          <TabsList className="mb-4">
            <TabsTrigger value="catalogo" className="gap-1.5">
              <BookOpen className="w-3.5 h-3.5" /> Catálogo
            </TabsTrigger>
            <TabsTrigger value="salud" className="gap-1.5">
              <Activity className="w-3.5 h-3.5" /> Salud
            </TabsTrigger>
          </TabsList>

          <TabsContent value="catalogo" className="space-y-4">
        {/* Formulario */}
        {showForm && (
          <div className="border border-primary/20 rounded-xl p-4 bg-primary/5 space-y-4">
            <p className="font-semibold text-sm">{editId ? 'Editar obligación' : 'Nueva obligación al catálogo'}</p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Programa *</Label>
                <Select value={form.programa} onValueChange={v => setForm(p => ({ ...p, programa: v }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PROGRAMA_LABELS).map(([val, label]) => (
                      <SelectItem key={val} value={val}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Periodicidad</Label>
                <Input
                  className="mt-1"
                  list="periodicidades-sugeridas"
                  value={form.presentacion}
                  onChange={e => setForm(p => ({ ...p, presentacion: e.target.value }))}
                  placeholder="ej. mensual, anual, En todo momento..."
                />
                <datalist id="periodicidades-sugeridas">
                  {PERIODICIDADES_COMUNES.map(p => <option key={p} value={p} />)}
                </datalist>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nombre de la obligación *</Label>
              <Input
                className="mt-1"
                value={form.nombre}
                onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
                placeholder="Ej. Reporte Mensual de Producción IMMEX"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fundamento legal</Label>
              <Input
                className="mt-1"
                value={form.articulos}
                onChange={e => setForm(p => ({ ...p, articulos: e.target.value }))}
                placeholder="Ej. Art. 25 Decreto IMMEX"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Descripción</Label>
              <Textarea
                className="mt-1 resize-none"
                rows={2}
                value={form.descripcion}
                onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
                placeholder="Descripción breve de la obligación"
              />
            </div>

            {/* Motor de recurrencia matemático */}
            <div className="rounded-lg border border-primary/20 bg-background/50 p-3 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">Motor de recurrencia automática</p>
              <p className="text-[11px] text-muted-foreground -mt-2">
                Al activar esta obligación en una empresa, el sistema generará automáticamente las ocurrencias del año actual.
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Frecuencia</Label>
                  <Select
                    value={form.frecuencia_tipo || 'none'}
                    onValueChange={v => setForm(p => ({
                      ...p,
                      frecuencia_tipo: v === 'none' ? '' : v as FrecuenciaTipo,
                      ...(v === 'EVENTUAL' || v === 'none' ? { dia_vencimiento: '', mes_vencimiento: '' } : {}),
                      ...(v !== 'ANUAL' ? { mes_vencimiento: '' } : {}),
                    }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Sin definir" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin definir</SelectItem>
                      {FRECUENCIA_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {form.frecuencia_tipo && form.frecuencia_tipo !== 'EVENTUAL' && (
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Día (1-31)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={31}
                      className="mt-1"
                      value={form.dia_vencimiento}
                      onChange={e => setForm(p => ({ ...p, dia_vencimiento: e.target.value }))}
                      placeholder="ej. 17"
                    />
                  </div>
                )}
                {form.frecuencia_tipo === 'ANUAL' && (
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mes</Label>
                    <Select
                      value={form.mes_vencimiento}
                      onValueChange={v => setForm(p => ({ ...p, mes_vencimiento: v }))}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Selecciona" />
                      </SelectTrigger>
                      <SelectContent>
                        {MESES.map((mes, i) => (
                          <SelectItem key={i + 1} value={(i + 1).toString()}>{mes}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notas internas (solo admins)</Label>
              <Textarea
                className="mt-1 resize-none"
                rows={2}
                value={form.notas_internas}
                onChange={e => setForm(p => ({ ...p, notas_internas: e.target.value }))}
                placeholder="Notas de uso interno, contexto, excepciones..."
              />
            </div>

            <div className="flex flex-wrap gap-6 pt-1">
              <div className="flex items-center gap-2">
                <Switch
                  id="obligatorio"
                  checked={form.obligatorio}
                  onCheckedChange={v => setForm(p => ({ ...p, obligatorio: v }))}
                />
                <Label htmlFor="obligatorio" className="text-sm cursor-pointer">
                  Obligatoria para toda empresa del programa
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="activo"
                  checked={form.activo}
                  onCheckedChange={v => setForm(p => ({ ...p, activo: v }))}
                />
                <Label htmlFor="activo" className="text-sm cursor-pointer">
                  Activa en catálogo
                </Label>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={handleCancel} className="gap-1.5">
                <X className="w-3.5 h-3.5" /> Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving} className="gap-1.5">
                <Check className="w-3.5 h-3.5" /> {saving ? 'Guardando...' : editId ? 'Actualizar' : 'Agregar'}
              </Button>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="flex gap-3 flex-wrap items-center">
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre, programa o fundamento..."
            className="flex-1 min-w-[200px]"
          />
          <Select value={filterProg} onValueChange={setFilterProg}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Todos los programas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los programas</SelectItem>
              {Object.entries(PROGRAMA_LABELS).map(([val, label]) => (
                <SelectItem key={val} value={val}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Switch id="show-inactive" checked={showInactive} onCheckedChange={setShowInactive} />
            <Label htmlFor="show-inactive" className="text-xs text-muted-foreground whitespace-nowrap cursor-pointer">
              Ver inactivas
            </Label>
          </div>
          <Badge variant="outline" className="text-xs self-center">{filtered.length} obligaciones</Badge>
        </div>

        {/* Lista agrupada */}
        {loading ? (
          <div className="animate-pulse space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="h-10 bg-muted rounded" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No hay obligaciones en el catálogo.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {sortedGroups.map(([prog, list]) => (
              <div key={prog}>
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={`text-xs font-bold ${CATEGORIA_COLORS[prog] ?? FALLBACK_COLOR}`}>
                    {PROGRAMA_LABELS[prog] ?? prog}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {list.filter(i => i.activo).length} activas
                    {list.some(i => !i.activo) && ` · ${list.filter(i => !i.activo).length} inactivas`}
                  </span>
                </div>
                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-2.5 font-medium text-muted-foreground text-xs">Nombre</th>
                        <th className="text-left p-2.5 font-medium text-muted-foreground text-xs hidden md:table-cell">Fundamento</th>
                        <th className="text-left p-2.5 font-medium text-muted-foreground text-xs">Periodicidad</th>
                        <th className="p-2.5 w-24 text-right"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map(item => (
                        <tr
                          key={item.id}
                          className={`border-t border-border/50 hover:bg-muted/30 transition-colors ${!item.activo ? 'opacity-50' : ''}`}
                        >
                          <td className="p-2.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`font-medium ${!item.activo ? 'line-through text-muted-foreground' : ''}`}>
                                {item.nombre}
                              </span>
                              {item.obligatorio && (
                                <Badge className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-0 px-1.5 py-0">
                                  Obligatoria
                                </Badge>
                              )}
                              {!item.activo && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                  Inactiva
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="p-2.5 text-muted-foreground hidden md:table-cell text-xs">
                            {item.articulos || '—'}
                          </td>
                          <td className="p-2.5">
                            <Badge variant="outline" className="text-[10px]">
                              {item.presentacion || '—'}
                            </Badge>
                          </td>
                          <td className="p-2.5">
                            <div className="flex items-center gap-1 justify-end">
                              <Button
                                size="icon" variant="ghost" className="h-7 w-7"
                                onClick={() => handleEdit(item)}
                                title="Editar"
                              >
                                <Pencil className="w-3 h-3" />
                              </Button>
                              <Button
                                size="icon" variant="ghost"
                                className={`h-7 w-7 ${item.activo ? 'text-muted-foreground' : 'text-success'}`}
                                onClick={() => handleToggleActivo(item)}
                                title={item.activo ? 'Desactivar' : 'Reactivar'}
                              >
                                {item.activo ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                              </Button>
                              {!item.activo && (
                                <Button
                                  size="icon" variant="ghost"
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                  onClick={() => handleDelete(item.id)}
                                  title="Eliminar permanentemente"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
          </TabsContent>

          <TabsContent value="salud" className="space-y-6">
            {loadingHealth ? (
              <p className="text-sm text-muted-foreground">Cargando diagnóstico...</p>
            ) : (
              <>
                {calcBanderas(coverage).length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      Puntos a revisar
                    </p>
                    {calcBanderas(coverage).map((b) => (
                      <div key={`${b.id}-${b.tipo}`} className="flex items-start justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-3">
                        <p className="text-sm text-amber-800 dark:text-amber-300">{b.mensaje}</p>
                        <Button
                          size="sm" variant="outline" className="shrink-0 text-xs"
                          onClick={() => { const item = items.find(i => i.id === b.id); if (item) handleEdit(item); }}
                        >
                          Revisar
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                {calcBanderas(coverage).length === 0 && coverage.length > 0 && (
                  <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
                    <Check className="w-4 h-4" /> Todo en orden — no se detectaron inconsistencias.
                  </p>
                )}
                <div className="space-y-2">
                  <p className="text-sm font-semibold">Cobertura {new Date().getFullYear()}</p>
                  <div className="rounded-lg border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium text-muted-foreground">Obligación</th>
                          <th className="text-center px-3 py-2 font-medium text-muted-foreground">Empresas</th>
                          <th className="text-center px-3 py-2 font-medium text-muted-foreground">Fechas {new Date().getFullYear()}</th>
                          <th className="text-center px-3 py-2 font-medium text-muted-foreground">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {coverage.map((cat) => (
                          <tr key={cat.id} className="hover:bg-muted/30">
                            <td className="px-3 py-2">
                              <p className="font-medium">{cat.nombre}</p>
                              <p className="text-xs text-muted-foreground">{cat.frecuencia_tipo ?? 'Sin frecuencia'}</p>
                            </td>
                            <td className="px-3 py-2 text-center">{cat.empresas_activas}</td>
                            <td className="px-3 py-2 text-center">{cat.ocurrencias_anio}</td>
                            <td className="px-3 py-2 text-center">
                              {cat.empresas_activas === 0
                                ? <Badge variant="outline" className="text-amber-600 border-amber-300">Sin uso</Badge>
                                : <Badge variant="outline" className="text-green-600 border-green-300">Activa</Badge>
                              }
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

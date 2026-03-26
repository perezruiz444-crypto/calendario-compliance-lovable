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
import { Plus, Trash2, BookOpen, Pencil, X, Check, Eye, EyeOff } from 'lucide-react';
import { CATEGORIA_COLORS, PROGRAMA_LABELS } from '@/lib/obligaciones';

const PERIODICIDADES_COMUNES = [
  'mensual', 'bimestral', 'trimestral', 'semestral', 'anual', 'única',
  'En todo momento', 'Al destruir desperdicios', 'Cuando aplique',
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

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('obligaciones_catalogo')
      .select('*')
      .order('orden')
      .order('nombre');
    setItems((data as CatalogoItem[]) || []);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.nombre.trim() || !form.programa) {
      toast.error('Nombre y programa son requeridos');
      return;
    }
    setSaving(true);
    const payload = {
      programa:       form.programa,
      categoria:      form.programa,
      nombre:         form.nombre.trim(),
      articulos:      form.articulos.trim() || null,
      descripcion:    form.descripcion.trim() || null,
      presentacion:   form.presentacion.trim() || null,
      obligatorio:    form.obligatorio,
      activo:         form.activo,
      notas_internas: form.notas_internas.trim() || null,
    };
    if (editId) {
      const { error } = await supabase.from('obligaciones_catalogo').update(payload).eq('id', editId);
      if (error) { toast.error('Error al actualizar: ' + error.message); setSaving(false); return; }
      toast.success('Obligación actualizada');
    } else {
      const { error } = await supabase.from('obligaciones_catalogo').insert(payload);
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
      programa:       item.programa,
      nombre:         item.nombre,
      articulos:      item.articulos || '',
      descripcion:    item.descripcion || '',
      presentacion:   item.presentacion || '',
      obligatorio:    item.obligatorio,
      activo:         item.activo,
      notas_internas: item.notas_internas || '',
    });
    setEditId(item.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleActivo = async (item: CatalogoItem) => {
    const nuevoEstado = !item.activo;
    const { error } = await supabase
      .from('obligaciones_catalogo')
      .update({ activo: nuevoEstado })
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
      </CardContent>
    </Card>
  );
}

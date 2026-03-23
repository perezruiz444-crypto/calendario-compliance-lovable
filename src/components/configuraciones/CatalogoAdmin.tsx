import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Trash2, BookOpen, Pencil, X, Check } from 'lucide-react';

const PROGRAMAS = ['IMMEX', 'PROSEC', 'Padrón', 'Cert. IVA/IEPS', 'OEA', 'General'];
const PERIODICIDADES = ['Mensual', 'Bimestral', 'Trimestral', 'Semestral', 'Anual', 'Única'];

interface CatalogoItem {
  id: string;
  programa: string;
  nombre: string;
  articulos: string | null;
  descripcion: string | null;
  presentacion: string | null;
}

interface FormData {
  programa: string;
  nombre: string;
  articulos: string;
  descripcion: string;
  presentacion: string;
}

const EMPTY: FormData = { programa: 'General', nombre: '', articulos: '', descripcion: '', presentacion: 'Mensual' };

export function CatalogoAdmin() {
  const [items, setItems]       = useState<CatalogoItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [search, setSearch]     = useState('');
  const [filterProg, setFilterProg] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId]     = useState<string | null>(null);
  const [form, setForm]         = useState<FormData>(EMPTY);

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('obligaciones_catalogo')
      .select('*')
      .order('programa')
      .order('nombre');
    setItems(data || []);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.nombre.trim() || !form.programa) {
      toast.error('Nombre y programa son requeridos');
      return;
    }
    setSaving(true);
    if (editId) {
      const { error } = await supabase
        .from('obligaciones_catalogo')
        .update({ ...form })
        .eq('id', editId);
      if (error) { toast.error('Error al actualizar'); setSaving(false); return; }
      toast.success('Obligación actualizada');
    } else {
      const { error } = await supabase
        .from('obligaciones_catalogo')
        .insert({ ...form });
      if (error) { toast.error('Error al crear'); setSaving(false); return; }
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
      programa: item.programa,
      nombre: item.nombre,
      articulos: item.articulos || '',
      descripcion: item.descripcion || '',
      presentacion: item.presentacion || 'Mensual',
    });
    setEditId(item.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
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
      i.programa.toLowerCase().includes(search.toLowerCase());
    const matchProg = filterProg === 'all' || i.programa === filterProg;
    return matchSearch && matchProg;
  });

  // Group by programa
  const grouped = PROGRAMAS.reduce((acc, prog) => {
    const list = filtered.filter(i => i.programa === prog);
    if (list.length > 0) acc[prog] = list;
    return acc;
  }, {} as Record<string, CatalogoItem[]>);

  return (
    <Card className="gradient-card shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="font-heading flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              Catálogo Maestro de Obligaciones
            </CardTitle>
            <CardDescription className="font-body mt-1">
              Define las obligaciones disponibles para asignar a empresas. Solo administradores pueden modificar este catálogo.
            </CardDescription>
          </div>
          <Button onClick={() => { setShowForm(true); setEditId(null); setForm(EMPTY); }} className="gap-2" size="sm">
            <Plus className="w-4 h-4" /> Nueva obligación
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Formulario */}
        {showForm && (
          <div className="border border-primary/20 rounded-xl p-4 bg-primary/3 space-y-4">
            <p className="font-semibold text-sm">{editId ? 'Editar obligación' : 'Nueva obligación al catálogo'}</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Programa *</Label>
                <Select value={form.programa} onValueChange={v => setForm(p => ({ ...p, programa: v }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROGRAMAS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Periodicidad</Label>
                <Select value={form.presentacion} onValueChange={v => setForm(p => ({ ...p, presentacion: v }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PERIODICIDADES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nombre de la obligación *</Label>
              <Input className="mt-1" value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} placeholder="Ej. Reporte Mensual de Producción IMMEX" />
            </div>
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fundamento legal</Label>
              <Input className="mt-1" value={form.articulos} onChange={e => setForm(p => ({ ...p, articulos: e.target.value }))} placeholder="Ej. Art. 25 Decreto IMMEX" />
            </div>
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Descripción</Label>
              <Input className="mt-1" value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))} placeholder="Descripción breve de la obligación" />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={handleCancel} className="gap-1.5"><X className="w-3.5 h-3.5" /> Cancelar</Button>
              <Button onClick={handleSave} disabled={saving} className="gap-1.5">
                <Check className="w-3.5 h-3.5" /> {saving ? 'Guardando...' : editId ? 'Actualizar' : 'Agregar'}
              </Button>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar obligación..." className="pl-3" />
          </div>
          <Select value={filterProg} onValueChange={setFilterProg}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Todos los programas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {PROGRAMAS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Badge variant="outline" className="self-center text-xs">{filtered.length} obligaciones</Badge>
        </div>

        {/* Lista agrupada */}
        {loading ? (
          <div className="animate-pulse space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-10 bg-muted rounded" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No hay obligaciones en el catálogo.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(grouped).map(([prog, list]) => (
              <div key={prog}>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary" className="text-xs font-bold">{prog}</Badge>
                  <span className="text-xs text-muted-foreground">{list.length} obligaciones</span>
                </div>
                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-2.5 font-medium text-muted-foreground text-xs">Nombre</th>
                        <th className="text-left p-2.5 font-medium text-muted-foreground text-xs hidden md:table-cell">Fundamento</th>
                        <th className="text-left p-2.5 font-medium text-muted-foreground text-xs">Periodicidad</th>
                        <th className="p-2.5 w-16"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map(item => (
                        <tr key={item.id} className="border-t border-border/50 hover:bg-muted/30">
                          <td className="p-2.5 font-medium">{item.nombre}</td>
                          <td className="p-2.5 text-muted-foreground hidden md:table-cell text-xs">{item.articulos || '—'}</td>
                          <td className="p-2.5">
                            <Badge variant="outline" className="text-[10px]">{item.presentacion || '—'}</Badge>
                          </td>
                          <td className="p-2.5">
                            <div className="flex items-center gap-1 justify-end">
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(item)}>
                                <Pencil className="w-3 h-3" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(item.id)}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
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

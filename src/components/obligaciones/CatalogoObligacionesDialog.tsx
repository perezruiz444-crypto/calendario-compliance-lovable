import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { BookOpen, Search, Trash2, Plus } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssign: (items: any[]) => void;
  loading?: boolean;
  empresaId?: string;
}

export function CatalogoObligacionesDialog({ open, onOpenChange, onAssign, loading, empresaId }: Props) {
  const { role } = useAuth();
  const [catalogo, setCatalogo] = useState<any[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [yaAsignados, setYaAsignados] = useState<Set<string>>(new Set());

  const fetchCatalogo = async () => {
    setLoadingCatalog(true);
    const { data, error } = await supabase
      .from('obligaciones_catalogo')
      .select('*')
      .order('programa', { ascending: true });
    if (error) { toast.error('Error al cargar catálogo'); console.error(error); }
    else setCatalogo(data || []);
    setLoadingCatalog(false);
  };

 useEffect(() => {
    if (open) {
      fetchCatalogo();
      setSelected(new Set());
      setSearch('');
      if (empresaId) fetchYaAsignados();
    }
  }, [open]);

  const fetchYaAsignados = async () => {
    if (!empresaId) return;
    const { data } = await supabase
      .from('obligaciones')
      .select('nombre')
      .eq('empresa_id', empresaId)
      .eq('activa', true);
    setYaAsignados(new Set((data || []).map(o => o.nombre)));
  };
  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(c => c.id)));
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('obligaciones_catalogo').delete().eq('id', id);
    if (error) { toast.error('Error al eliminar'); return; }
    toast.success('Eliminado del catálogo');
    setCatalogo(prev => prev.filter(c => c.id !== id));
    setSelected(prev => { const n = new Set(prev); n.delete(id); return n; });
  };

  const handleAssign = () => {
    const items = catalogo.filter(c => selected.has(c.id));
    onAssign(items);
  };

  const filtered = catalogo.filter(c =>
    !search || c.nombre.toLowerCase().includes(search.toLowerCase()) || c.programa.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Catálogo de Obligaciones
          </DialogTitle>
          <DialogDescription>
            Selecciona obligaciones del catálogo para asignarlas a esta empresa.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar en catálogo..." className="pl-9" />
          </div>

          {loadingCatalog ? (
            <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
          ) : catalogo.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p>El catálogo está vacío. Importa obligaciones masivamente y marca "Guardar en catálogo".</p>
            </div>
          ) : (
            <div className="border rounded-lg max-h-[400px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="p-2 w-8">
                      <Checkbox checked={selected.size === filtered.length && filtered.length > 0} onCheckedChange={toggleAll} />
                    </th>
                    <th className="p-2 text-left">Programa</th>
                    <th className="p-2 text-left">Nombre</th>
                    <th className="p-2 text-left hidden md:table-cell">Artículo(s)</th>
                    <th className="p-2 text-left hidden md:table-cell">Presentación</th>
                    <th className="p-2 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(item => {
                    const yaAsignada = yaAsignados.has(item.nombre);
                    return (
                    <tr key={item.id} className={`border-t cursor-pointer ${yaAsignada ? 'bg-success/5 opacity-60' : 'hover:bg-muted/50'}`}
                      onClick={() => !yaAsignada && toggleSelect(item.id)}>
                      <td className="p-2" onClick={e => e.stopPropagation()}>
                        <Checkbox checked={selected.has(item.id)} onCheckedChange={() => toggleSelect(item.id)} />
                      </td>
                      <td className="p-2"><Badge variant="outline" className="text-xs">{item.programa}</Badge></td>
                    <td className="p-2 font-medium">
                        <div className="flex items-center gap-2">
                          {item.nombre}
                          {yaAsignada && (
                            <span className="text-[10px] font-semibold text-success bg-success/10 px-1.5 py-0.5 rounded">
                              Ya asignada
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-2 hidden md:table-cell text-muted-foreground">{item.articulos || '-'}</td>
                      <td className="p-2 hidden md:table-cell text-muted-foreground">{item.presentacion || '-'}</td>
                     <td className="p-2" onClick={e => e.stopPropagation()}>
                        {role === 'administrador' && (
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => handleDelete(item.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </td>
                   </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleAssign} disabled={loading || selected.size === 0}>
            {loading ? 'Asignando...' : `Asignar ${selected.size} Obligaciones`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, BookOpen } from 'lucide-react';
import { CATEGORIA_COLORS, PROGRAMA_LABELS } from '@/lib/obligaciones';

interface CatalogoItem {
  id: string;
  programa: string;
  categoria: string | null;
  nombre: string;
  articulos: string | null;
  descripcion: string | null;
  presentacion: string | null;
  obligatorio: boolean;
}

interface Usuario {
  id: string;
  nombre: string;
  tipo: 'cliente' | 'consultor';
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: CatalogoItem | null;
  empresaId: string;
  onActivated: () => void;
}

const FALLBACK_COLOR = 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300';

export function ActivarObligacionDialog({ open, onOpenChange, item, empresaId, onActivated }: Props) {
  const [fechaVencimiento, setFechaVencimiento] = useState<Date | undefined>();
  const [fechaInicio, setFechaInicio]           = useState<Date | undefined>();
  const [notas, setNotas]                       = useState('');
  const [responsableIds, setResponsableIds]     = useState<string[]>([]);
  const [usuarios, setUsuarios]                 = useState<Usuario[]>([]);
  const [saving, setSaving]                     = useState(false);

  useEffect(() => {
    if (open && empresaId) {
      fetchUsuarios();
      setFechaVencimiento(undefined);
      setFechaInicio(undefined);
      setNotas('');
      setResponsableIds([]);
    }
  }, [open, empresaId]);

  const fetchUsuarios = async () => {
    try {
      const results: Usuario[] = [];

      const { data: clientProfiles } = await supabase
        .from('profiles').select('id, nombre_completo').eq('empresa_id', empresaId);
      if (clientProfiles?.length) {
        const { data: roleData } = await supabase
          .from('user_roles').select('user_id').eq('role', 'cliente')
          .in('user_id', clientProfiles.map(p => p.id));
        const clientIds = new Set((roleData || []).map(r => r.user_id));
        clientProfiles
          .filter(p => clientIds.has(p.id))
          .forEach(p => results.push({ id: p.id, nombre: p.nombre_completo, tipo: 'cliente' }));
      }

      const { data: assignments } = await supabase
        .from('consultor_empresa_asignacion').select('consultor_id').eq('empresa_id', empresaId);
      if (assignments?.length) {
        const { data: consultorProfiles } = await supabase
          .from('profiles').select('id, nombre_completo')
          .in('id', assignments.map(a => a.consultor_id));
        (consultorProfiles || []).forEach(p =>
          results.push({ id: p.id, nombre: p.nombre_completo, tipo: 'consultor' })
        );
      }

      setUsuarios(results);
    } catch {
      toast.error('Error al cargar responsables');
    }
  };

  const toggleResponsable = (id: string) => {
    setResponsableIds(prev =>
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const handleActivar = async () => {
    if (!item) return;
    if (!fechaVencimiento) { toast.error('La fecha de vencimiento es requerida'); return; }

    setSaving(true);
    try {
      const { data: oblig, error } = await supabase
        .from('obligaciones')
        .insert({
          empresa_id:       empresaId,
          catalogo_id:      item.id,
          categoria:        item.categoria ?? item.programa,
          nombre:           item.nombre,
          descripcion:      item.descripcion,
          articulos:        item.articulos,
          presentacion:     item.presentacion,
          fecha_vencimiento: format(fechaVencimiento, 'yyyy-MM-dd'),
          fecha_inicio:     fechaInicio ? format(fechaInicio, 'yyyy-MM-dd') : null,
          notas:            notas.trim() || null,
          estado:           'vigente',
          activa:           true,
        })
        .select('id')
        .single();

      if (error) throw error;

      if (responsableIds.length > 0) {
        await supabase.from('obligacion_responsables').insert(
          responsableIds.map(uid => ({
            obligacion_id: oblig.id,
            user_id:       uid,
            tipo:          usuarios.find(u => u.id === uid)?.tipo ?? 'consultor',
          }))
        );
      }

      toast.success(`"${item.nombre}" activada correctamente`);
      onOpenChange(false);
      onActivated();
    } catch (e: any) {
      toast.error('Error al activar: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!item) return null;

  const programaColor = CATEGORIA_COLORS[item.programa] ?? FALLBACK_COLOR;
  const programaLabel = PROGRAMA_LABELS[item.programa] ?? item.programa;

  const clientes   = usuarios.filter(u => u.tipo === 'cliente');
  const consultores = usuarios.filter(u => u.tipo === 'consultor');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Activar obligación
          </DialogTitle>
          <DialogDescription>
            Configura la fecha y responsables para esta empresa. El nombre y fundamento legal vienen del catálogo y no se pueden modificar aquí.
          </DialogDescription>
        </DialogHeader>

        {/* Info del catálogo — solo lectura */}
        <div className="rounded-lg border bg-muted/40 p-3 space-y-1.5">
          <Badge className={`text-xs ${programaColor}`}>{programaLabel}</Badge>
          <p className="font-semibold text-sm leading-snug">{item.nombre}</p>
          {item.articulos && (
            <p className="text-xs text-muted-foreground">{item.articulos}</p>
          )}
          {item.presentacion && (
            <Badge variant="outline" className="text-[10px]">{item.presentacion}</Badge>
          )}
        </div>

        <div className="space-y-4">
          {/* Fecha de vencimiento */}
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Fecha de vencimiento *
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full mt-1 justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {fechaVencimiento
                    ? format(fechaVencimiento, 'PPP', { locale: es })
                    : <span className="text-muted-foreground">Selecciona una fecha</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={fechaVencimiento}
                  onSelect={setFechaVencimiento}
                  locale={es}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Fecha de inicio (opcional) */}
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Fecha de inicio (opcional)
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full mt-1 justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {fechaInicio
                    ? format(fechaInicio, 'PPP', { locale: es })
                    : <span className="text-muted-foreground">Sin fecha de inicio</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={fechaInicio}
                  onSelect={setFechaInicio}
                  locale={es}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Responsables */}
          {usuarios.length > 0 && (
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Responsables
              </Label>
              <div className="mt-2 space-y-3">
                {clientes.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">Clientes</p>
                    <div className="space-y-1.5">
                      {clientes.map(u => (
                        <label key={u.id} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={responsableIds.includes(u.id)}
                            onCheckedChange={() => toggleResponsable(u.id)}
                          />
                          <span className="text-sm">{u.nombre}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                {consultores.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">Consultores</p>
                    <div className="space-y-1.5">
                      {consultores.map(u => (
                        <label key={u.id} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={responsableIds.includes(u.id)}
                            onCheckedChange={() => toggleResponsable(u.id)}
                          />
                          <span className="text-sm">{u.nombre}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notas */}
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Notas (opcional)
            </Label>
            <Textarea
              className="mt-1 resize-none"
              rows={2}
              value={notas}
              onChange={e => setNotas(e.target.value)}
              placeholder="Observaciones específicas para esta empresa..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleActivar} disabled={saving || !fechaVencimiento}>
            {saving ? 'Activando...' : 'Activar obligación'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

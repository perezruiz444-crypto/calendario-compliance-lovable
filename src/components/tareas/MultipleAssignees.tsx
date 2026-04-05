import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, X, Users, User } from 'lucide-react';
import { toast } from 'sonner';

interface MultipleAssigneesProps {
  tareaId: string;
  empresaId?: string;
  canEdit?: boolean;
}

export function MultipleAssignees({ tareaId, empresaId, canEdit = true }: MultipleAssigneesProps) {
  const [asignaciones, setAsignaciones] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<{ id: string; nombre: string; tipo: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAsignaciones();
    fetchUsuarios();
  }, [tareaId, empresaId]);

  const fetchAsignaciones = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('tarea_asignaciones')
      .select('*, profiles:consultor_id(nombre_completo)')
      .eq('tarea_id', tareaId);
    setAsignaciones(data || []);
    setLoading(false);
  };

  const fetchUsuarios = async () => {
    const results: { id: string; nombre: string; tipo: string }[] = [];

    // Fetch all consultors in one query via user_roles + profiles join
    const { data: consultorRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'consultor');

    if (consultorRoles && consultorRoles.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, nombre_completo')
        .in('id', consultorRoles.map(r => r.user_id));
      (profiles || []).forEach(p => results.push({ id: p.id, nombre: p.nombre_completo, tipo: 'consultor' }));
    }

    // Fetch all clients efficiently — get client role user_ids first, then filter by empresa
    const { data: clientRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'cliente');

    if (clientRoles && clientRoles.length > 0) {
      let query = supabase
        .from('profiles')
        .select('id, nombre_completo')
        .in('id', clientRoles.map(r => r.user_id));

      if (empresaId) {
        query = query.eq('empresa_id', empresaId);
      }

      const { data: clientProfiles } = await query;
      (clientProfiles || []).forEach(p => results.push({ id: p.id, nombre: p.nombre_completo, tipo: 'cliente' }));
    }

    setUsuarios(results);
  };

  const isAsignado = (userId: string) => asignaciones.some(a => a.consultor_id === userId);

  const toggle = async (userId: string) => {
    setSaving(true);
    try {
      if (isAsignado(userId)) {
        await supabase
          .from('tarea_asignaciones')
          .delete()
          .eq('tarea_id', tareaId)
          .eq('consultor_id', userId);
        toast.success('Asignación eliminada');
      } else {
        await supabase
          .from('tarea_asignaciones')
          .insert({ tarea_id: tareaId, consultor_id: userId, rol: 'colaborador' });
        toast.success('Persona asignada');
      }
      await fetchAsignaciones();
    } catch (e: any) {
      toast.error('Error: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (nombre: string) =>
    nombre.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

  const consultores = usuarios.filter(u => u.tipo === 'consultor');
  const clientes = usuarios.filter(u => u.tipo === 'cliente');

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5" />
          Asignados
          {asignaciones.length > 0 && (
            <Badge variant="secondary" className="text-xs">{asignaciones.length}</Badge>
          )}
        </p>
        {canEdit && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs gap-1"
            onClick={() => setOpen(!open)}
          >
            <Plus className="w-3 h-3" />
            {open ? 'Cerrar' : 'Agregar'}
          </Button>
        )}
      </div>

      {/* Asignados actuales */}
      {asignaciones.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {asignaciones.map(a => {
            const nombre = a.profiles?.nombre_completo || 'Usuario';
            const u = usuarios.find(u => u.id === a.consultor_id);
            return (
              <div
                key={a.id}
                className="flex items-center gap-1.5 bg-muted rounded-full pl-1 pr-2 py-0.5"
              >
                <Avatar className="w-5 h-5">
                  <AvatarFallback className={`text-[10px] ${u?.tipo === 'cliente' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                    {getInitials(nombre)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs font-medium">{nombre.split(' ')[0]}</span>
                {u?.tipo && (
                  <span className={`text-[10px] px-1 rounded ${u.tipo === 'cliente' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                    {u.tipo === 'cliente' ? 'C' : 'Con'}
                  </span>
                )}
                {canEdit && (
                  <button
                    onClick={() => toggle(a.consultor_id)}
                    className="text-muted-foreground hover:text-destructive transition-colors ml-0.5"
                    disabled={saving}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Selector desplegable */}
      {open && canEdit && (
        <div className="border border-border rounded-lg overflow-hidden">
          {consultores.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground px-3 py-1.5 bg-muted/50 flex items-center gap-1">
                <Users className="w-3 h-3" /> Consultores
              </p>
              {consultores.map(u => (
                <label key={u.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-muted/40 cursor-pointer transition-colors">
                  <Checkbox
                    checked={isAsignado(u.id)}
                    onCheckedChange={() => toggle(u.id)}
                    disabled={saving}
                  />
                  <Avatar className="w-6 h-6">
                    <AvatarFallback className="text-[10px] bg-purple-100 text-purple-700">
                      {getInitials(u.nombre)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{u.nombre}</span>
                </label>
              ))}
            </div>
          )}
          {clientes.length > 0 && (
            <div className="border-t border-border">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground px-3 py-1.5 bg-muted/50 flex items-center gap-1">
                <User className="w-3 h-3" /> Clientes
              </p>
              {clientes.map(u => (
                <label key={u.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-muted/40 cursor-pointer transition-colors">
                  <Checkbox
                    checked={isAsignado(u.id)}
                    onCheckedChange={() => toggle(u.id)}
                    disabled={saving}
                  />
                  <Avatar className="w-6 h-6">
                    <AvatarFallback className="text-[10px] bg-blue-100 text-blue-700">
                      {getInitials(u.nombre)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{u.nombre}</span>
                </label>
              ))}
            </div>
          )}
          {consultores.length === 0 && clientes.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">
              No hay usuarios disponibles
            </p>
          )}
        </div>
      )}
    </div>
  );
}

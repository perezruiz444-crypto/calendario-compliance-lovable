import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Users, Crown, Eye, Wrench } from 'lucide-react';
import { toast } from 'sonner';

interface MultipleAssigneesProps {
  tareaId: string;
}

export function MultipleAssignees({ tareaId }: MultipleAssigneesProps) {
  const [asignaciones, setAsignaciones] = useState<any[]>([]);
  const [consultores, setConsultores] = useState<any[]>([]);
  const [selectedConsultor, setSelectedConsultor] = useState('');
  const [selectedRol, setSelectedRol] = useState<'responsable' | 'colaborador' | 'revisor'>('colaborador');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAsignaciones();
    fetchConsultores();
  }, [tareaId]);

  const fetchAsignaciones = async () => {
    try {
      const { data, error } = await supabase
        .from('tarea_asignaciones')
        .select('*, profiles:consultor_id(nombre_completo)')
        .eq('tarea_id', tareaId);

      if (error) throw error;
      setAsignaciones(data || []);
    } catch (error) {
      console.error('Error fetching asignaciones:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchConsultores = async () => {
    try {
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'consultor');

      const consultorIds = rolesData?.map(r => r.user_id) || [];
      
      if (consultorIds.length > 0) {
        const { data } = await supabase
          .from('profiles')
          .select('id, nombre_completo')
          .in('id', consultorIds);
        
        setConsultores(data || []);
      }
    } catch (error) {
      console.error('Error fetching consultores:', error);
    }
  };

  const handleAdd = async () => {
    if (!selectedConsultor) return;

    try {
      const { error } = await supabase
        .from('tarea_asignaciones')
        .insert({
          tarea_id: tareaId,
          consultor_id: selectedConsultor,
          rol: selectedRol,
          asignado_por: (await supabase.auth.getUser()).data.user?.id
        });

      if (error) throw error;
      
      setSelectedConsultor('');
      setSelectedRol('colaborador');
      fetchAsignaciones();
      toast.success('Asignación agregada');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('tarea_asignaciones')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchAsignaciones();
      toast.success('Asignación eliminada');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleUpdateRol = async (id: string, newRol: string) => {
    try {
      const { error } = await supabase
        .from('tarea_asignaciones')
        .update({ rol: newRol })
        .eq('id', id);

      if (error) throw error;
      fetchAsignaciones();
      toast.success('Rol actualizado');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  };

  const getRolIcon = (rol: string) => {
    switch (rol) {
      case 'responsable':
        return <Crown className="w-3 h-3" />;
      case 'revisor':
        return <Eye className="w-3 h-3" />;
      default:
        return <Wrench className="w-3 h-3" />;
    }
  };

  const getRolColor = (rol: string) => {
    switch (rol) {
      case 'responsable':
        return 'default';
      case 'revisor':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-heading flex items-center gap-2">
          <Users className="w-4 h-4" />
          Equipo Asignado
        </CardTitle>
        <CardDescription>
          Múltiples personas pueden colaborar en esta tarea
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new assignee */}
        <div className="flex gap-2">
          <Select value={selectedConsultor} onValueChange={setSelectedConsultor}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Selecciona consultor..." />
            </SelectTrigger>
            <SelectContent>
              {consultores
                .filter(c => !asignaciones.some(a => a.consultor_id === c.id))
                .map((consultor) => (
                  <SelectItem key={consultor.id} value={consultor.id}>
                    {consultor.nombre_completo}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          
          <Select value={selectedRol} onValueChange={(value: any) => setSelectedRol(value)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="responsable">Responsable</SelectItem>
              <SelectItem value="colaborador">Colaborador</SelectItem>
              <SelectItem value="revisor">Revisor</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={handleAdd} size="sm" disabled={!selectedConsultor}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Assignees list */}
        {loading ? (
          <div className="text-center py-4 text-muted-foreground">Cargando...</div>
        ) : asignaciones.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No hay asignaciones aún</p>
            <p className="text-xs mt-1">Agrega consultores para trabajar en equipo</p>
          </div>
        ) : (
          <div className="space-y-2">
            {asignaciones.map((asignacion) => (
              <div
                key={asignacion.id}
                className="flex items-center gap-3 p-3 border rounded hover:bg-accent/50 transition-colors group"
              >
                <Avatar className="h-9 w-9">
                  <AvatarFallback>
                    {getInitials(asignacion.profiles?.nombre_completo)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1">
                  <p className="font-medium text-sm">{asignacion.profiles?.nombre_completo}</p>
                  <Select
                    value={asignacion.rol}
                    onValueChange={(value) => handleUpdateRol(asignacion.id, value)}
                  >
                    <SelectTrigger className="w-[130px] h-7 text-xs mt-1">
                      <SelectValue>
                        <div className="flex items-center gap-1">
                          {getRolIcon(asignacion.rol)}
                          <span className="capitalize">{asignacion.rol}</span>
                        </div>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="responsable">
                        <div className="flex items-center gap-2">
                          <Crown className="w-3 h-3" />
                          Responsable
                        </div>
                      </SelectItem>
                      <SelectItem value="colaborador">
                        <div className="flex items-center gap-2">
                          <Wrench className="w-3 h-3" />
                          Colaborador
                        </div>
                      </SelectItem>
                      <SelectItem value="revisor">
                        <div className="flex items-center gap-2">
                          <Eye className="w-3 h-3" />
                          Revisor
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(asignacion.id)}
                  className="opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
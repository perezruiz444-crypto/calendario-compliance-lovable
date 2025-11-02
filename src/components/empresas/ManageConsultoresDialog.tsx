import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, UserPlus, UserMinus, Users } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ManageConsultoresDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empresaId: string;
  empresaNombre: string;
}

interface Consultor {
  id: string;
  nombre_completo: string;
  email: string;
}

interface ConsultorAsignado extends Consultor {
  asignado_por: string;
  created_at: string;
}

export default function ManageConsultoresDialog({
  open,
  onOpenChange,
  empresaId,
  empresaNombre,
}: ManageConsultoresDialogProps) {
  const [loading, setLoading] = useState(false);
  const [consultores, setConsultores] = useState<Consultor[]>([]);
  const [consultoresAsignados, setConsultoresAsignados] = useState<ConsultorAsignado[]>([]);
  const [selectedConsultor, setSelectedConsultor] = useState<string>('');

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, empresaId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all consultores
      const { data: consultoresData, error: consultoresError } = await supabase.functions.invoke('list-users');

      if (consultoresError) throw consultoresError;
      if (consultoresData?.error) throw new Error(consultoresData.error);

      const consultoresList = consultoresData?.users?.filter((u: any) => u.role === 'consultor') || [];
      
      // Fetch assigned consultores for this empresa
      const { data: asignacionesData, error: asignacionesError } = await supabase
        .from('consultor_empresa_asignacion')
        .select('consultor_id, asignado_por, created_at')
        .eq('empresa_id', empresaId);

      if (asignacionesError) throw asignacionesError;

      const asignados = asignacionesData?.map((a: any) => {
        const consultor = consultoresList.find((c: any) => c.id === a.consultor_id);
        return {
          id: a.consultor_id,
          nombre_completo: consultor?.nombre_completo || 'Desconocido',
          email: consultor?.email || '',
          asignado_por: a.asignado_por,
          created_at: a.created_at,
        };
      }) || [];

      setConsultoresAsignados(asignados);
      
      // Filter out already assigned consultores
      const disponibles = consultoresList.filter(
        (c: any) => !asignados.some(a => a.id === c.id)
      );
      setConsultores(disponibles);

    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('Error al cargar consultores');
    } finally {
      setLoading(false);
    }
  };

  const handleAsignar = async () => {
    if (!selectedConsultor) {
      toast.error('Selecciona un consultor');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('consultor_empresa_asignacion')
        .insert({
          consultor_id: selectedConsultor,
          empresa_id: empresaId,
          asignado_por: user?.id,
        });

      if (error) throw error;

      toast.success('Consultor asignado correctamente');
      setSelectedConsultor('');
      fetchData();
    } catch (error: any) {
      console.error('Error assigning consultor:', error);
      toast.error('Error al asignar consultor');
    } finally {
      setLoading(false);
    }
  };

  const handleDesasignar = async (consultorId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('consultor_empresa_asignacion')
        .delete()
        .eq('consultor_id', consultorId)
        .eq('empresa_id', empresaId);

      if (error) throw error;

      toast.success('Consultor desasignado correctamente');
      fetchData();
    } catch (error: any) {
      console.error('Error unassigning consultor:', error);
      toast.error('Error al desasignar consultor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" aria-describedby="manage-consultores-description">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <Users className="w-5 h-5" />
            Gestionar Consultores
          </DialogTitle>
          <DialogDescription id="manage-consultores-description" className="font-body">
            Asignar o desasignar consultores para <strong>{empresaNombre}</strong>
          </DialogDescription>
        </DialogHeader>

        {loading && !consultoresAsignados.length ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Asignar nuevo consultor */}
            <div className="space-y-3">
              <h3 className="font-heading font-medium flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                Asignar Consultor
              </h3>
              <div className="flex gap-2">
                <Select value={selectedConsultor} onValueChange={setSelectedConsultor}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecciona un consultor" />
                  </SelectTrigger>
                  <SelectContent>
                    {consultores.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground text-center">
                        No hay consultores disponibles
                      </div>
                    ) : (
                      consultores.map((consultor) => (
                        <SelectItem key={consultor.id} value={consultor.id}>
                          {consultor.nombre_completo} ({consultor.email})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <Button 
                  onClick={handleAsignar} 
                  disabled={!selectedConsultor || loading}
                  className="gradient-primary"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Asignar
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Lista de consultores asignados */}
            <div className="space-y-3">
              <h3 className="font-heading font-medium flex items-center gap-2">
                <Users className="w-4 h-4" />
                Consultores Asignados ({consultoresAsignados.length})
              </h3>
              {consultoresAsignados.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6 font-body">
                  No hay consultores asignados a esta empresa
                </p>
              ) : (
                <div className="space-y-2">
                  {consultoresAsignados.map((consultor) => (
                    <div 
                      key={consultor.id} 
                      className="flex items-center justify-between p-3 border rounded-lg bg-background/50"
                    >
                      <div className="flex-1">
                        <p className="font-heading font-medium">{consultor.nombre_completo}</p>
                        <p className="text-sm text-muted-foreground font-body">{consultor.email}</p>
                        <Badge variant="outline" className="mt-1">
                          Asignado: {new Date(consultor.created_at).toLocaleDateString('es-MX')}
                        </Badge>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDesasignar(consultor.id)}
                        disabled={loading}
                      >
                        <UserMinus className="w-4 h-4 mr-2" />
                        Desasignar
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

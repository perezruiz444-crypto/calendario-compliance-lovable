import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AgenteAduanal {
  id?: string;
  nombre_agente: string;
  numero_patente: string;
  estado: string;
}

interface EmpresaFormAgentesAduanalesProps {
  empresaId?: string;
}

const ESTADOS_AGENTE = ['Aceptado', 'Pendiente'];

export default function EmpresaFormAgentesAduanales({ empresaId }: EmpresaFormAgentesAduanalesProps) {
  const [agentes, setAgentes] = useState<AgenteAduanal[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (empresaId) {
      fetchAgentes();
    }
  }, [empresaId]);

  const fetchAgentes = async () => {
    if (!empresaId) return;
    
    const { data, error } = await supabase
      .from('agentes_aduanales')
      .select('*')
      .eq('empresa_id', empresaId);

    if (error) {
      console.error('Error fetching agentes:', error);
    } else {
      setAgentes(data || []);
    }
  };

  const addAgente = () => {
    setAgentes([
      ...agentes,
      {
        nombre_agente: '',
        numero_patente: '',
        estado: ''
      }
    ]);
  };

  const removeAgente = async (index: number) => {
    const agente = agentes[index];
    
    if (agente.id && empresaId) {
      setLoading(true);
      const { error } = await supabase
        .from('agentes_aduanales')
        .delete()
        .eq('id', agente.id);

      if (error) {
        toast.error('Error al eliminar agente aduanal');
        setLoading(false);
        return;
      }
      toast.success('Agente aduanal eliminado');
      setLoading(false);
    }
    
    setAgentes(agentes.filter((_, i) => i !== index));
  };

  const updateAgente = (index: number, field: keyof AgenteAduanal, value: string) => {
    const updated = [...agentes];
    updated[index] = { ...updated[index], [field]: value };
    setAgentes(updated);
  };

  const saveAgente = async (index: number) => {
    if (!empresaId) return;
    
    const agente = agentes[index];
    
    if (!agente.nombre_agente || !agente.numero_patente) {
      toast.error('El nombre y número de patente son requeridos');
      return;
    }
    
    setLoading(true);

    if (agente.id) {
      const { error } = await supabase
        .from('agentes_aduanales')
        .update({
          nombre_agente: agente.nombre_agente,
          numero_patente: agente.numero_patente,
          estado: agente.estado || null
        })
        .eq('id', agente.id);

      if (error) {
        toast.error('Error al actualizar agente aduanal');
      } else {
        toast.success('Agente aduanal actualizado');
      }
    } else {
      const { data, error } = await supabase
        .from('agentes_aduanales')
        .insert({
          empresa_id: empresaId,
          nombre_agente: agente.nombre_agente,
          numero_patente: agente.numero_patente,
          estado: agente.estado || null
        })
        .select()
        .single();

      if (error) {
        toast.error('Error al guardar agente aduanal');
      } else {
        toast.success('Agente aduanal guardado');
        const updated = [...agentes];
        updated[index].id = data.id;
        setAgentes(updated);
      }
    }
    
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-heading font-semibold">Agentes Aduanales</h3>

      {agentes.length === 0 ? (
        <p className="text-center text-muted-foreground font-body py-8">
          No hay agentes aduanales registrados
        </p>
      ) : (
        <div className="space-y-4">
          {agentes.map((agente, index) => (
            <Card key={index}>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="font-heading">Nombre del Agente *</Label>
                    <Input
                      value={agente.nombre_agente}
                      onChange={(e) => updateAgente(index, 'nombre_agente', e.target.value)}
                      placeholder="Nombre completo"
                      className="font-body"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-heading">Número de Patente *</Label>
                    <Input
                      value={agente.numero_patente}
                      onChange={(e) => updateAgente(index, 'numero_patente', e.target.value)}
                      placeholder="Ej: 1234"
                      className="font-body"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-heading">Estado</Label>
                    <Select
                      value={agente.estado || ''}
                      onValueChange={(value) => updateAgente(index, 'estado', value)}
                    >
                      <SelectTrigger className="font-body">
                        <SelectValue placeholder="Selecciona estado" />
                      </SelectTrigger>
                      <SelectContent>
                        {ESTADOS_AGENTE.map((estado) => (
                          <SelectItem key={estado} value={estado}>
                            {estado}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  {empresaId && (
                    <Button
                      type="button"
                      onClick={() => saveAgente(index)}
                      disabled={loading || !agente.nombre_agente || !agente.numero_patente}
                      size="sm"
                    >
                      Guardar
                    </Button>
                  )}
                  <Button
                    type="button"
                    onClick={() => removeAgente(index)}
                    variant="destructive"
                    size="sm"
                    disabled={loading}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Botón Agregar al final */}
      <div className="flex justify-center pt-2">
        <Button type="button" onClick={addAgente} variant="outline" className="w-full max-w-xs">
          <Plus className="w-4 h-4 mr-2" />
          Agregar Agente
        </Button>
      </div>
    </div>
  );
}

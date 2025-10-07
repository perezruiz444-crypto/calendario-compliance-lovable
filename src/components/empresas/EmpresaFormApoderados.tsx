import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Apoderado {
  id?: string;
  nombre: string;
  tipo_apoderado: string;
  poder_notarial_instrumento: string;
  poder_notarial_libro: string;
  poder_notarial_anio: number | null;
}

interface EmpresaFormApoderadosProps {
  empresaId?: string;
}

export default function EmpresaFormApoderados({ empresaId }: EmpresaFormApoderadosProps) {
  const [apoderados, setApoderados] = useState<Apoderado[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (empresaId) {
      fetchApoderados();
    }
  }, [empresaId]);

  const fetchApoderados = async () => {
    if (!empresaId) return;
    
    const { data, error } = await supabase
      .from('apoderados_legales')
      .select('*')
      .eq('empresa_id', empresaId);

    if (error) {
      console.error('Error fetching apoderados:', error);
    } else {
      setApoderados(data || []);
    }
  };

  const addApoderado = () => {
    setApoderados([
      ...apoderados,
      {
        nombre: '',
        tipo_apoderado: '',
        poder_notarial_instrumento: '',
        poder_notarial_libro: '',
        poder_notarial_anio: null
      }
    ]);
  };

  const removeApoderado = async (index: number) => {
    const apoderado = apoderados[index];
    
    if (apoderado.id && empresaId) {
      setLoading(true);
      const { error } = await supabase
        .from('apoderados_legales')
        .delete()
        .eq('id', apoderado.id);

      if (error) {
        toast.error('Error al eliminar apoderado');
        setLoading(false);
        return;
      }
      toast.success('Apoderado eliminado');
      setLoading(false);
    }
    
    setApoderados(apoderados.filter((_, i) => i !== index));
  };

  const updateApoderado = (index: number, field: keyof Apoderado, value: any) => {
    const updated = [...apoderados];
    updated[index] = { ...updated[index], [field]: value };
    setApoderados(updated);
  };

  const saveApoderado = async (index: number) => {
    if (!empresaId) return;
    
    const apoderado = apoderados[index];
    setLoading(true);

    if (apoderado.id) {
      // Update existing
      const { error } = await supabase
        .from('apoderados_legales')
        .update({
          nombre: apoderado.nombre,
          tipo_apoderado: apoderado.tipo_apoderado,
          poder_notarial_instrumento: apoderado.poder_notarial_instrumento,
          poder_notarial_libro: apoderado.poder_notarial_libro,
          poder_notarial_anio: apoderado.poder_notarial_anio
        })
        .eq('id', apoderado.id);

      if (error) {
        toast.error('Error al actualizar apoderado');
      } else {
        toast.success('Apoderado actualizado');
      }
    } else {
      // Create new
      const { data, error } = await supabase
        .from('apoderados_legales')
        .insert({
          empresa_id: empresaId,
          nombre: apoderado.nombre,
          tipo_apoderado: apoderado.tipo_apoderado,
          poder_notarial_instrumento: apoderado.poder_notarial_instrumento,
          poder_notarial_libro: apoderado.poder_notarial_libro,
          poder_notarial_anio: apoderado.poder_notarial_anio
        })
        .select()
        .single();

      if (error) {
        toast.error('Error al guardar apoderado');
      } else {
        toast.success('Apoderado guardado');
        const updated = [...apoderados];
        updated[index].id = data.id;
        setApoderados(updated);
      }
    }
    
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-heading font-semibold">Apoderados Legales</h3>
        <Button type="button" onClick={addApoderado} size="sm" variant="outline">
          <Plus className="w-4 h-4 mr-2" />
          Agregar Apoderado
        </Button>
      </div>

      <div className="space-y-4">
        {apoderados.map((apoderado, index) => (
          <Card key={index}>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-heading">Nombre</Label>
                  <Input
                    value={apoderado.nombre}
                    onChange={(e) => updateApoderado(index, 'nombre', e.target.value)}
                    className="font-body"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-heading">Tipo de Apoderado</Label>
                  <Input
                    value={apoderado.tipo_apoderado}
                    onChange={(e) => updateApoderado(index, 'tipo_apoderado', e.target.value)}
                    placeholder="Ej: A, B, C"
                    className="font-body"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="font-heading">Asociado al poder notarial general</Label>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="font-heading text-sm">Instrumento</Label>
                    <Input
                      value={apoderado.poder_notarial_instrumento}
                      onChange={(e) => updateApoderado(index, 'poder_notarial_instrumento', e.target.value)}
                      className="font-body"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-heading text-sm">Libro</Label>
                    <Input
                      value={apoderado.poder_notarial_libro}
                      onChange={(e) => updateApoderado(index, 'poder_notarial_libro', e.target.value)}
                      className="font-body"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-heading text-sm">Año</Label>
                    <Input
                      type="number"
                      value={apoderado.poder_notarial_anio || ''}
                      onChange={(e) => updateApoderado(index, 'poder_notarial_anio', e.target.value ? parseInt(e.target.value) : null)}
                      className="font-body"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                {empresaId && (
                  <Button
                    type="button"
                    onClick={() => saveApoderado(index)}
                    disabled={loading || !apoderado.nombre}
                    size="sm"
                  >
                    Guardar
                  </Button>
                )}
                <Button
                  type="button"
                  onClick={() => removeApoderado(index)}
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

      {apoderados.length === 0 && (
        <p className="text-center text-muted-foreground font-body py-8">
          No hay apoderados registrados
        </p>
      )}
    </div>
  );
}
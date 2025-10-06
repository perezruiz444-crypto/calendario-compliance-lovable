import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface CreateTareaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTareaCreated: () => void;
}

export default function CreateTareaDialog({ open, onOpenChange, onTareaCreated }: CreateTareaDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [consultores, setConsultores] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    prioridad: 'media' as 'alta' | 'media' | 'baja',
    fecha_vencimiento: '',
    empresa_id: '',
    consultor_asignado_id: ''
  });

  useEffect(() => {
    if (open) {
      fetchEmpresas();
      fetchConsultores();
    }
  }, [open]);

  const fetchEmpresas = async () => {
    try {
      const { data, error } = await supabase
        .from('empresas')
        .select('id, razon_social')
        .order('razon_social');

      if (error) throw error;
      setEmpresas(data || []);
    } catch (error) {
      console.error('Error fetching empresas:', error);
    }
  };

  const fetchConsultores = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          nombre_completo,
          user_roles!inner(role)
        `)
        .eq('user_roles.role', 'consultor')
        .order('nombre_completo');

      if (error) throw error;
      setConsultores(data || []);
    } catch (error) {
      console.error('Error fetching consultores:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('tareas')
        .insert({
          ...formData,
          creado_por: user?.id
        });

      if (error) throw error;

      toast.success('Tarea creada exitosamente');
      setFormData({
        titulo: '',
        descripcion: '',
        prioridad: 'media',
        fecha_vencimiento: '',
        empresa_id: '',
        consultor_asignado_id: ''
      });
      onOpenChange(false);
      onTareaCreated();
    } catch (error: any) {
      toast.error(error.message || 'Error al crear tarea');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="font-heading">Nueva Tarea</DialogTitle>
          <DialogDescription className="font-body">
            Crea una nueva tarea y asígnala a un consultor
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="titulo" className="font-heading">Título *</Label>
              <Input
                id="titulo"
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                required
                className="font-body"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descripcion" className="font-heading">Descripción</Label>
              <Textarea
                id="descripcion"
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                className="font-body"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prioridad" className="font-heading">Prioridad *</Label>
                <Select
                  value={formData.prioridad}
                  onValueChange={(value: any) => setFormData({ ...formData, prioridad: value })}
                >
                  <SelectTrigger className="font-body">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="media">Media</SelectItem>
                    <SelectItem value="baja">Baja</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fecha_vencimiento" className="font-heading">Fecha de Vencimiento</Label>
                <Input
                  id="fecha_vencimiento"
                  type="date"
                  value={formData.fecha_vencimiento}
                  onChange={(e) => setFormData({ ...formData, fecha_vencimiento: e.target.value })}
                  className="font-body"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="empresa_id" className="font-heading">Empresa *</Label>
              <Select
                value={formData.empresa_id}
                onValueChange={(value) => setFormData({ ...formData, empresa_id: value })}
              >
                <SelectTrigger className="font-body">
                  <SelectValue placeholder="Selecciona una empresa" />
                </SelectTrigger>
                <SelectContent>
                  {empresas.map((empresa) => (
                    <SelectItem key={empresa.id} value={empresa.id}>
                      {empresa.razon_social}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="consultor_asignado_id" className="font-heading">Consultor Asignado</Label>
              <Select
                value={formData.consultor_asignado_id}
                onValueChange={(value) => setFormData({ ...formData, consultor_asignado_id: value })}
              >
                <SelectTrigger className="font-body">
                  <SelectValue placeholder="Selecciona un consultor" />
                </SelectTrigger>
                <SelectContent>
                  {consultores.map((consultor) => (
                    <SelectItem key={consultor.id} value={consultor.id}>
                      {consultor.nombre_completo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="font-heading">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="gradient-primary shadow-elegant font-heading">
              {loading ? 'Creando...' : 'Crear Tarea'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

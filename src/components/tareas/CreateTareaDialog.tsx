import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { tareaSchema } from '@/lib/validation';
import { z } from 'zod';
import { CategorySelector } from './CategorySelector';
import { FileAttachments } from './FileAttachments';
import { Repeat } from 'lucide-react';

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
    consultor_asignado_id: '',
    categoria_id: '',
    es_recurrente: false,
    frecuencia_recurrencia: 'mensual',
    intervalo_recurrencia: 1,
    fecha_inicio_recurrencia: '',
    fecha_fin_recurrencia: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [attachments, setAttachments] = useState<any[]>([]);

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
    setErrors({});
    
    // Validate form data
    try {
      tareaSchema.parse(formData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(fieldErrors);
        toast.error('Por favor corrige los errores en el formulario');
        return;
      }
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('tareas')
        .insert({
          titulo: formData.titulo.trim(),
          descripcion: formData.descripcion.trim() || null,
          prioridad: formData.prioridad,
          empresa_id: formData.empresa_id,
          consultor_asignado_id: formData.consultor_asignado_id || null,
          fecha_vencimiento: formData.fecha_vencimiento || null,
          categoria_id: formData.categoria_id || null,
          archivos_adjuntos: attachments.length > 0 ? attachments : null,
          creado_por: user?.id,
          es_recurrente: formData.es_recurrente,
          frecuencia_recurrencia: formData.es_recurrente ? formData.frecuencia_recurrencia : null,
          intervalo_recurrencia: formData.es_recurrente ? formData.intervalo_recurrencia : null,
          fecha_inicio_recurrencia: formData.es_recurrente ? formData.fecha_inicio_recurrencia : null,
          fecha_fin_recurrencia: formData.es_recurrente ? formData.fecha_fin_recurrencia : null
        });

      if (error) throw error;

      toast.success('Tarea creada exitosamente');
      setFormData({
        titulo: '',
        descripcion: '',
        prioridad: 'media',
        fecha_vencimiento: '',
        empresa_id: '',
        consultor_asignado_id: '',
        categoria_id: '',
        es_recurrente: false,
        frecuencia_recurrencia: 'mensual',
        intervalo_recurrencia: 1,
        fecha_inicio_recurrencia: '',
        fecha_fin_recurrencia: ''
      });
      setAttachments([]);
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
                maxLength={200}
                className="font-body"
              />
              {errors.titulo && <p className="text-sm text-destructive font-body">{errors.titulo}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="descripcion" className="font-heading">Descripción</Label>
              <Textarea
                id="descripcion"
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                maxLength={2000}
                className="font-body"
                rows={3}
              />
              {errors.descripcion && <p className="text-sm text-destructive font-body">{errors.descripcion}</p>}
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
              <Label htmlFor="categoria" className="font-heading">Categoría</Label>
              <CategorySelector
                value={formData.categoria_id}
                onValueChange={(value) => setFormData({ ...formData, categoria_id: value })}
              />
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

            <div className="space-y-2">
              <Label className="font-heading">Archivos Adjuntos</Label>
              <FileAttachments
                attachments={attachments}
                onAttachmentsChange={setAttachments}
              />
            </div>

            <div className="border-t pt-4 space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="es_recurrente"
                  checked={formData.es_recurrente}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, es_recurrente: checked as boolean })
                  }
                />
                <Label htmlFor="es_recurrente" className="font-heading flex items-center gap-2 cursor-pointer">
                  <Repeat className="w-4 h-4" />
                  Tarea recurrente
                </Label>
              </div>

              {formData.es_recurrente && (
                <div className="space-y-4 pl-6 border-l-2 border-primary/20">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="frecuencia" className="font-heading">Frecuencia</Label>
                      <Select
                        value={formData.frecuencia_recurrencia}
                        onValueChange={(value) => setFormData({ ...formData, frecuencia_recurrencia: value })}
                      >
                        <SelectTrigger className="font-body">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="diaria">Diaria</SelectItem>
                          <SelectItem value="semanal">Semanal</SelectItem>
                          <SelectItem value="mensual">Mensual</SelectItem>
                          <SelectItem value="trimestral">Trimestral</SelectItem>
                          <SelectItem value="anual">Anual</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="intervalo" className="font-heading">Cada</Label>
                      <Input
                        id="intervalo"
                        type="number"
                        min="1"
                        value={formData.intervalo_recurrencia}
                        onChange={(e) => setFormData({ ...formData, intervalo_recurrencia: parseInt(e.target.value) || 1 })}
                        className="font-body"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fecha_inicio_rec" className="font-heading">Fecha Inicio</Label>
                      <Input
                        id="fecha_inicio_rec"
                        type="date"
                        value={formData.fecha_inicio_recurrencia}
                        onChange={(e) => setFormData({ ...formData, fecha_inicio_recurrencia: e.target.value })}
                        className="font-body"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="fecha_fin_rec" className="font-heading">Fecha Fin</Label>
                      <Input
                        id="fecha_fin_rec"
                        type="date"
                        value={formData.fecha_fin_recurrencia}
                        onChange={(e) => setFormData({ ...formData, fecha_fin_recurrencia: e.target.value })}
                        className="font-body"
                      />
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground font-body">
                    Esta tarea se repetirá cada {formData.intervalo_recurrencia} 
                    {formData.frecuencia_recurrencia === 'diaria' && ' día(s)'}
                    {formData.frecuencia_recurrencia === 'semanal' && ' semana(s)'}
                    {formData.frecuencia_recurrencia === 'mensual' && ' mes(es)'}
                    {formData.frecuencia_recurrencia === 'trimestral' && ' trimestre(s)'}
                    {formData.frecuencia_recurrencia === 'anual' && ' año(s)'}
                    {formData.fecha_inicio_recurrencia && ` desde ${new Date(formData.fecha_inicio_recurrencia).toLocaleDateString()}`}
                    {formData.fecha_fin_recurrencia && ` hasta ${new Date(formData.fecha_fin_recurrencia).toLocaleDateString()}`}
                  </p>
                </div>
              )}
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

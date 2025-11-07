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
import { Zap, Maximize2, Minimize2, Repeat } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { TemplateSelector } from './TemplateSelector';
import { CustomFieldInput } from './CustomFieldInput';

interface QuickCreateTareaProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTareaCreated: () => void;
  defaultEmpresaId?: string;
}

export default function QuickCreateTarea({ open, onOpenChange, onTareaCreated, defaultEmpresaId }: QuickCreateTareaProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fullMode, setFullMode] = useState(false);
  const [createAnother, setCreateAnother] = useState(false);
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [consultores, setConsultores] = useState<any[]>([]);
  const [customFields, setCustomFields] = useState<any[]>([]);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    prioridad: 'media' as 'alta' | 'media' | 'baja',
    fecha_vencimiento: '',
    empresa_id: defaultEmpresaId || '',
    consultor_asignado_id: '',
    categoria_id: ''
  });

  useEffect(() => {
    if (open) {
      fetchEmpresas();
      fetchCustomFields();
      if (defaultEmpresaId && !formData.empresa_id) {
        setFormData(prev => ({ ...prev, empresa_id: defaultEmpresaId }));
      }
    }
  }, [open, defaultEmpresaId]);

  useEffect(() => {
    if (open && formData.empresa_id) {
      fetchConsultores();
    }
  }, [open, formData.empresa_id]);

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
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'consultor');

      const consultorIds = rolesData?.map(r => r.user_id) || [];
      if (consultorIds.length === 0) {
        setConsultores([]);
        return;
      }

      let query = supabase
        .from('profiles')
        .select('id, nombre_completo')
        .in('id', consultorIds)
        .order('nombre_completo');

      if (formData.empresa_id) {
        const { data: asignacionesData } = await supabase
          .from('consultor_empresa_asignacion')
          .select('consultor_id')
          .eq('empresa_id', formData.empresa_id);

        const consultoresAsignadosIds = asignacionesData?.map(a => a.consultor_id) || [];
        if (consultoresAsignadosIds.length > 0) {
          query = query.in('id', consultoresAsignadosIds);
        } else {
          setConsultores([]);
          return;
        }
      }

      const { data } = await query;
      setConsultores(data || []);
    } catch (error) {
      console.error('Error fetching consultores:', error);
    }
  };

  const fetchCustomFields = async () => {
    try {
      const { data, error } = await supabase
        .from('custom_fields')
        .select('*')
        .eq('activo', true)
        .order('orden');
      if (error) throw error;
      setCustomFields(data || []);
    } catch (error) {
      console.error('Error fetching custom fields:', error);
    }
  };

  const handleTemplateSelect = (template: any) => {
    setFormData(prev => ({
      ...prev,
      titulo: template.titulo_template.replace('[EMPRESA]', empresas.find(e => e.id === prev.empresa_id)?.razon_social || ''),
      descripcion: template.descripcion_template || '',
      prioridad: template.prioridad,
      categoria_id: template.categoria_id || ''
    }));
    
    if (template.duracion_dias && !formData.fecha_vencimiento) {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() + template.duracion_dias);
      setFormData(prev => ({
        ...prev,
        fecha_vencimiento: fecha.toISOString().split('T')[0]
      }));
    }
  };

  const resetForm = () => {
    setFormData({
      titulo: '',
      descripcion: '',
      prioridad: 'media',
      fecha_vencimiento: '',
      empresa_id: defaultEmpresaId || '',
      consultor_asignado_id: '',
      categoria_id: ''
    });
    setCustomFieldValues({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.titulo.trim() || !formData.empresa_id) {
      toast.error('Por favor completa los campos requeridos');
      return;
    }

    setLoading(true);

    try {
      const { data: tareaData, error: tareaError } = await supabase
        .from('tareas')
        .insert({
          titulo: formData.titulo.trim(),
          descripcion: formData.descripcion.trim() || null,
          prioridad: formData.prioridad,
          empresa_id: formData.empresa_id,
          consultor_asignado_id: formData.consultor_asignado_id || null,
          fecha_vencimiento: formData.fecha_vencimiento || null,
          categoria_id: formData.categoria_id || null,
          creado_por: user?.id
        })
        .select()
        .single();

      if (tareaError) throw tareaError;

      // Save custom field values if any
      if (tareaData && Object.keys(customFieldValues).length > 0) {
        const valuesToInsert = Object.entries(customFieldValues)
          .filter(([_, value]) => value !== '')
          .map(([fieldId, value]) => ({
            tarea_id: tareaData.id,
            custom_field_id: fieldId,
            valor: value
          }));

        if (valuesToInsert.length > 0) {
          const { error: valuesError } = await supabase
            .from('tarea_custom_field_values')
            .insert(valuesToInsert);
          
          if (valuesError) console.error('Error saving custom field values:', valuesError);
        }
      }

      toast.success('Tarea creada exitosamente');
      onTareaCreated();

      if (createAnother) {
        resetForm();
      } else {
        onOpenChange(false);
      }
    } catch (error: any) {
      toast.error(error.message || 'Error al crear tarea');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${fullMode ? 'sm:max-w-[700px]' : 'sm:max-w-[500px]'} max-h-[90vh] flex flex-col`}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="font-heading flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                Quick Create
              </DialogTitle>
              <DialogDescription className="font-body">
                Crea tareas rápidamente con campos esenciales
              </DialogDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setFullMode(!fullMode)}
              className="gap-2"
            >
              {fullMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              {fullMode ? 'Compacto' : 'Completo'}
            </Button>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="space-y-4 py-4 overflow-y-auto pr-2">
            {/* Template Selector */}
            {fullMode && (
              <div className="space-y-2">
                <Label className="font-heading">Usar Template</Label>
                <TemplateSelector onSelect={handleTemplateSelect} />
              </div>
            )}

            {/* Título */}
            <div className="space-y-2">
              <Label htmlFor="titulo" className="font-heading">Título *</Label>
              <Input
                id="titulo"
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                placeholder="¿Qué necesitas hacer?"
                required
                maxLength={200}
                className="font-body"
                autoFocus
              />
            </div>

            {/* Empresa */}
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

            {/* Campos adicionales en modo completo */}
            {fullMode && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="descripcion" className="font-heading">Descripción</Label>
                  <Textarea
                    id="descripcion"
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    placeholder="Detalles adicionales..."
                    maxLength={2000}
                    className="font-body"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="prioridad" className="font-heading">Prioridad</Label>
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
                    <Label htmlFor="fecha_vencimiento" className="font-heading">Vencimiento</Label>
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
                  <Label htmlFor="consultor_asignado_id" className="font-heading">Asignar a</Label>
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

                {/* Custom Fields */}
                {customFields.length > 0 && (
                  <div className="space-y-3 border-t pt-4">
                    <Label className="font-heading">Campos Personalizados</Label>
                    {customFields.map(field => (
                      <CustomFieldInput
                        key={field.id}
                        field={field}
                        value={customFieldValues[field.id] || ''}
                        onChange={(value) => setCustomFieldValues({
                          ...customFieldValues,
                          [field.id]: value
                        })}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter className="flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="createAnother"
                checked={createAnother}
                onChange={(e) => setCreateAnother(e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="createAnother" className="text-sm font-body cursor-pointer">
                Crear otra
              </Label>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="font-heading">
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} className="gradient-primary shadow-elegant font-heading">
                {loading ? 'Creando...' : 'Crear'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
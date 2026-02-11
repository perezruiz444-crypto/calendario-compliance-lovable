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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, FileText, Users, Repeat } from 'lucide-react';

interface ManageTemplatesProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ManageTemplates({ open, onOpenChange }: ManageTemplatesProps) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    titulo_template: '',
    descripcion_template: '',
    prioridad: 'media' as 'alta' | 'media' | 'baja',
    categoria_id: '',
    duracion_dias: '',
    es_publico: false,
    es_recurrente: false,
    frecuencia_recurrencia: 'mensual',
    intervalo_recurrencia: 1,
  });

  useEffect(() => {
    if (open) {
      fetchTemplates();
      fetchCategorias();
    }
  }, [open]);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('tarea_templates')
        .select('*, categorias_tareas(nombre)')
        .order('veces_usado', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Error al cargar templates');
    }
  };

  const fetchCategorias = async () => {
    try {
      const { data, error } = await supabase
        .from('categorias_tareas')
        .select('*')
        .order('nombre');

      if (error) throw error;
      setCategorias(data || []);
    } catch (error) {
      console.error('Error fetching categorias:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      descripcion: '',
      titulo_template: '',
      descripcion_template: '',
      prioridad: 'media',
      categoria_id: '',
      duracion_dias: '',
      es_publico: false,
      es_recurrente: false,
      frecuencia_recurrencia: 'mensual',
      intervalo_recurrencia: 1,
    });
    setEditingTemplate(null);
    setShowForm(false);
  };

  const handleEdit = (template: any) => {
    setEditingTemplate(template);
    setFormData({
      nombre: template.nombre,
      descripcion: template.descripcion || '',
      titulo_template: template.titulo_template,
      descripcion_template: template.descripcion_template || '',
      prioridad: template.prioridad,
      categoria_id: template.categoria_id || '',
      duracion_dias: template.duracion_dias?.toString() || '',
      es_publico: template.es_publico,
      es_recurrente: template.campos_personalizados?.es_recurrente || false,
      frecuencia_recurrencia: template.campos_personalizados?.frecuencia_recurrencia || 'mensual',
      intervalo_recurrencia: template.campos_personalizados?.intervalo_recurrencia || 1,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const templateData = {
        nombre: formData.nombre,
        descripcion: formData.descripcion || null,
        titulo_template: formData.titulo_template,
        descripcion_template: formData.descripcion_template || null,
        prioridad: formData.prioridad,
        categoria_id: formData.categoria_id || null,
        duracion_dias: formData.duracion_dias ? parseInt(formData.duracion_dias) : null,
        es_publico: formData.es_publico,
        campos_personalizados: formData.es_recurrente ? {
          es_recurrente: true,
          frecuencia_recurrencia: formData.frecuencia_recurrencia,
          intervalo_recurrencia: formData.intervalo_recurrencia,
        } : null,
      };

      if (editingTemplate) {
        const { error } = await supabase
          .from('tarea_templates')
          .update(templateData)
          .eq('id', editingTemplate.id);

        if (error) throw error;
        toast.success('Template actualizado exitosamente');
      } else {
        const { error } = await supabase
          .from('tarea_templates')
          .insert(templateData);

        if (error) throw error;
        toast.success('Template creado exitosamente');
      }

      resetForm();
      fetchTemplates();
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar template');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm('¿Estás seguro de eliminar este template?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('tarea_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;
      toast.success('Template eliminado exitosamente');
      fetchTemplates();
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar template');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-heading">Gestionar Templates</DialogTitle>
          <DialogDescription className="font-body">
            Crea templates reutilizables para agilizar la creación de tareas
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 py-4">
          {!showForm ? (
            <>
              <Button
                onClick={() => setShowForm(true)}
                className="w-full gradient-primary shadow-elegant font-heading gap-2"
              >
                <Plus className="w-4 h-4" />
                Nuevo Template
              </Button>

              <div className="space-y-2">
                {templates.map((template) => (
                  <Card key={template.id}>
                    <CardHeader className="py-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-2 flex-1">
                          <FileText className="w-5 h-5 text-primary mt-1" />
                          <div className="flex-1">
                            <CardTitle className="text-base font-heading flex items-center gap-2 flex-wrap">
                              {template.nombre}
                              {template.es_publico && (
                                <Badge variant="secondary" className="text-xs gap-1">
                                  <Users className="w-3 h-3" />
                                  Público
                                </Badge>
                              )}
                              <Badge variant="outline" className="text-xs">
                                {template.veces_usado} usos
                              </Badge>
                            </CardTitle>
                            {template.descripcion && (
                              <CardDescription className="text-sm font-body mt-1">
                                {template.descripcion}
                              </CardDescription>
                            )}
                            <div className="flex gap-2 mt-2 flex-wrap">
                              <Badge variant="outline" className="text-xs">
                                {template.prioridad === 'alta' ? 'Alta' : template.prioridad === 'media' ? 'Media' : 'Baja'} prioridad
                              </Badge>
                              {template.duracion_dias && (
                                <Badge variant="outline" className="text-xs">
                                  {template.duracion_dias} días
                                </Badge>
                              )}
                              {template.categorias_tareas && (
                                <Badge variant="outline" className="text-xs">
                                  {template.categorias_tareas.nombre}
                                </Badge>
                              )}
                              {template.campos_personalizados?.es_recurrente && (
                                <Badge variant="outline" className="text-xs gap-1">
                                  <Repeat className="w-3 h-3" />
                                  Recurrente
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(template)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(template.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
                {templates.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No hay templates. Crea uno para comenzar.
                  </div>
                )}
              </div>
            </>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nombre" className="font-heading">Nombre del Template *</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  required
                  placeholder="Ej: Renovación IMMEX"
                  className="font-body"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descripcion" className="font-heading">Descripción</Label>
                <Textarea
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  placeholder="Descripción del template y cuándo usarlo"
                  className="font-body"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="titulo_template" className="font-heading">Título por Defecto *</Label>
                <Input
                  id="titulo_template"
                  value={formData.titulo_template}
                  onChange={(e) => setFormData({ ...formData, titulo_template: e.target.value })}
                  required
                  placeholder="Usa [EMPRESA] como placeholder"
                  className="font-body"
                />
                <p className="text-xs text-muted-foreground">
                  Usa [EMPRESA] y se reemplazará automáticamente
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descripcion_template" className="font-heading">Descripción por Defecto</Label>
                <Textarea
                  id="descripcion_template"
                  value={formData.descripcion_template}
                  onChange={(e) => setFormData({ ...formData, descripcion_template: e.target.value })}
                  placeholder="Descripción que tendrán las tareas creadas"
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
                  <Label htmlFor="duracion_dias" className="font-heading">Duración (días)</Label>
                  <Input
                    id="duracion_dias"
                    type="number"
                    value={formData.duracion_dias}
                    onChange={(e) => setFormData({ ...formData, duracion_dias: e.target.value })}
                    placeholder="30"
                    className="font-body"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="categoria_id" className="font-heading">Categoría</Label>
                <Select
                  value={formData.categoria_id}
                  onValueChange={(value) => setFormData({ ...formData, categoria_id: value })}
                >
                  <SelectTrigger className="font-body">
                    <SelectValue placeholder="Selecciona una categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="es_publico"
                  checked={formData.es_publico}
                  onCheckedChange={(checked) => setFormData({ ...formData, es_publico: checked as boolean })}
                />
                <Label htmlFor="es_publico" className="font-body cursor-pointer">
                  Template público (visible para todos)
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="es_recurrente_tpl"
                  checked={formData.es_recurrente}
                  onCheckedChange={(checked) => setFormData({ ...formData, es_recurrente: checked as boolean })}
                />
                <Label htmlFor="es_recurrente_tpl" className="font-body cursor-pointer flex items-center gap-2">
                  <Repeat className="w-4 h-4" />
                  Tarea recurrente
                </Label>
              </div>

              {formData.es_recurrente && (
                <div className="space-y-3 pl-6 border-l-2 border-primary/20">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="font-heading">Frecuencia</Label>
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
                          <SelectItem value="quincenal">Quincenal</SelectItem>
                          <SelectItem value="mensual">Mensual</SelectItem>
                          <SelectItem value="trimestral">Trimestral</SelectItem>
                          <SelectItem value="anual">Anual</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="font-heading">Cada</Label>
                      <Input
                        type="number"
                        min="1"
                        value={formData.intervalo_recurrencia}
                        onChange={(e) => setFormData({ ...formData, intervalo_recurrencia: parseInt(e.target.value) || 1 })}
                        className="font-body"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  className="flex-1 font-heading"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 gradient-primary shadow-elegant font-heading"
                >
                  {loading ? 'Guardando...' : editingTemplate ? 'Actualizar' : 'Crear'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
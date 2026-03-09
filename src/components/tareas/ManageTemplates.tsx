import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  Plus, Edit, Trash2, FileText, Users, Repeat, ChevronDown,
  Tag, Clock, ListChecks, Sparkles, GripVertical, X, ArrowLeft
} from 'lucide-react';

interface ManageTemplatesProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SubtareaTemplate {
  titulo: string;
  descripcion?: string;
}

const RECURRENCE_PRESETS = [
  { label: 'Diaria', frecuencia: 'diaria', intervalo: 1 },
  { label: 'Semanal', frecuencia: 'semanal', intervalo: 1 },
  { label: 'Quincenal', frecuencia: 'quincenal', intervalo: 1 },
  { label: 'Mensual', frecuencia: 'mensual', intervalo: 1 },
  { label: 'Trimestral', frecuencia: 'trimestral', intervalo: 1 },
  { label: 'Anual', frecuencia: 'anual', intervalo: 1 },
] as const;

const PRIORITY_STYLES: Record<string, string> = {
  alta: 'bg-destructive/10 text-destructive border-destructive/20',
  media: 'bg-warning/10 text-warning-foreground border-warning/20',
  baja: 'bg-success/10 text-success-foreground border-success/20',
};

function SectionHeader({ icon: Icon, title, isOpen, onToggle, badge }: {
  icon: React.ElementType;
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "flex items-center gap-2.5 w-full py-2.5 px-3 rounded-lg text-sm transition-all group",
        isOpen ? "bg-primary/5 text-foreground" : "hover:bg-muted/60 text-muted-foreground hover:text-foreground"
      )}
    >
      <div className={cn(
        "h-7 w-7 rounded-md flex items-center justify-center shrink-0 transition-colors",
        isOpen ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
      )}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <span className="font-heading font-medium">{title}</span>
      {badge && !isOpen && (
        <span className="ml-auto mr-2 text-xs text-muted-foreground">{badge}</span>
      )}
      <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 ml-auto transition-transform text-muted-foreground", isOpen && "rotate-180")} />
    </button>
  );
}

export default function ManageTemplates({ open, onOpenChange }: ManageTemplatesProps) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);

  // Section states
  const [identityOpen, setIdentityOpen] = useState(true);
  const [contentOpen, setContentOpen] = useState(false);
  const [schedulingOpen, setSchedulingOpen] = useState(false);
  const [subtareasOpen, setSubtareasOpen] = useState(false);

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

  const [subtareasTemplate, setSubtareasTemplate] = useState<SubtareaTemplate[]>([]);
  const [newSubtarea, setNewSubtarea] = useState('');

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
        .select('*, categorias_tareas(nombre, color)')
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
      nombre: '', descripcion: '', titulo_template: '', descripcion_template: '',
      prioridad: 'media', categoria_id: '', duracion_dias: '', es_publico: false,
      es_recurrente: false, frecuencia_recurrencia: 'mensual', intervalo_recurrencia: 1,
    });
    setSubtareasTemplate([]);
    setNewSubtarea('');
    setEditingTemplate(null);
    setShowForm(false);
    setIdentityOpen(true);
    setContentOpen(false);
    setSchedulingOpen(false);
    setSubtareasOpen(false);
  };

  const handleEdit = (template: any) => {
    setEditingTemplate(template);
    setFormData({
      nombre: template.nombre,
      descripcion: template.descripcion || '',
      titulo_template: template.titulo_template,
      descripcion_template: template.descripcion_template || '',
      prioridad: template.prioridad || 'media',
      categoria_id: template.categoria_id || '',
      duracion_dias: template.duracion_dias?.toString() || '',
      es_publico: template.es_publico || false,
      es_recurrente: template.campos_personalizados?.es_recurrente || false,
      frecuencia_recurrencia: template.campos_personalizados?.frecuencia_recurrencia || 'mensual',
      intervalo_recurrencia: template.campos_personalizados?.intervalo_recurrencia || 1,
    });
    setSubtareasTemplate((template.subtareas_template as SubtareaTemplate[]) || []);
    setShowForm(true);
    setIdentityOpen(true);
    setContentOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim() || !formData.titulo_template.trim()) {
      toast.error('Nombre y título por defecto son requeridos');
      return;
    }
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
        subtareas_template: (subtareasTemplate.length > 0 ? subtareasTemplate : []) as unknown as Json,
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
        toast.success('Template actualizado');
      } else {
        const { error } = await supabase
          .from('tarea_templates')
          .insert(templateData);
        if (error) throw error;
        toast.success('Template creado');
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
    if (!confirm('¿Eliminar este template?')) return;
    try {
      const { error } = await supabase.from('tarea_templates').delete().eq('id', templateId);
      if (error) throw error;
      toast.success('Template eliminado');
      fetchTemplates();
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar');
    }
  };

  const addSubtarea = () => {
    if (!newSubtarea.trim()) return;
    setSubtareasTemplate(prev => [...prev, { titulo: newSubtarea.trim() }]);
    setNewSubtarea('');
  };

  const removeSubtarea = (index: number) => {
    setSubtareasTemplate(prev => prev.filter((_, i) => i !== index));
  };

  const activeRecurrencePreset = RECURRENCE_PRESETS.find(
    p => p.frecuencia === formData.frecuencia_recurrencia && p.intervalo === formData.intervalo_recurrencia
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-3">
          <SheetTitle className="font-heading text-lg flex items-center gap-2">
            {showForm && (
              <Button variant="ghost" size="icon" className="h-7 w-7 mr-1" onClick={resetForm}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <Sparkles className="h-5 w-5 text-primary" />
            {showForm ? (editingTemplate ? 'Editar Template' : 'Nuevo Template') : 'Templates'}
          </SheetTitle>
          <SheetDescription className="font-body">
            {showForm ? 'Define los valores predeterminados del template' : 'Templates reutilizables para crear tareas'}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 px-6">
          <div className="space-y-3 pb-6">
            {!showForm ? (
              <>
                <Button
                  onClick={() => setShowForm(true)}
                  className="w-full gradient-primary shadow-elegant font-heading gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Nuevo Template
                </Button>

                <div className="space-y-1.5">
                  {templates.map((template) => {
                    const subtareasCount = (template.subtareas_template as any[])?.length || 0;
                    return (
                      <Card key={template.id} className="p-3 hover:shadow-sm transition-shadow">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 flex-1 min-w-0">
                            <FileText className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-sm font-heading flex items-center gap-1.5 flex-wrap">
                                <span className="truncate">{template.nombre}</span>
                                {template.es_publico && (
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-0.5">
                                    <Users className="w-2.5 h-2.5" />
                                    Público
                                  </Badge>
                                )}
                              </CardTitle>
                              {template.descripcion && (
                                <CardDescription className="text-xs mt-0.5 line-clamp-1">
                                  {template.descripcion}
                                </CardDescription>
                              )}
                              <div className="flex gap-1 mt-1.5 flex-wrap">
                                <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", PRIORITY_STYLES[template.prioridad] || '')}>
                                  {template.prioridad === 'alta' ? 'Alta' : template.prioridad === 'media' ? 'Media' : 'Baja'}
                                </Badge>
                                {template.duracion_dias && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5">
                                    <Clock className="w-2.5 h-2.5" />{template.duracion_dias}d
                                  </Badge>
                                )}
                                {template.categorias_tareas && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                    {template.categorias_tareas.nombre}
                                  </Badge>
                                )}
                                {template.campos_personalizados?.es_recurrente && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5">
                                    <Repeat className="w-2.5 h-2.5" />Recurrente
                                  </Badge>
                                )}
                                {subtareasCount > 0 && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5">
                                    <ListChecks className="w-2.5 h-2.5" />{subtareasCount}
                                  </Badge>
                                )}
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                  {template.veces_usado} usos
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-0.5 shrink-0">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(template)}>
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDelete(template.id)}>
                              <Trash2 className="w-3.5 h-3.5 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                  {templates.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No hay templates. Crea uno para comenzar.
                    </div>
                  )}
                </div>
              </>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-2">
                {/* Section 1: Identity */}
                <SectionHeader
                  icon={FileText}
                  title="Identidad"
                  isOpen={identityOpen}
                  onToggle={() => setIdentityOpen(!identityOpen)}
                  badge={formData.nombre || undefined}
                />
                {identityOpen && (
                  <div className="space-y-3 pl-3 border-l-2 border-primary/10 ml-3.5">
                    <div>
                      <Label className="text-xs text-muted-foreground">Nombre del Template *</Label>
                      <Input
                        value={formData.nombre}
                        onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                        placeholder="Ej: Renovación IMMEX"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Descripción</Label>
                      <Textarea
                        value={formData.descripcion}
                        onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                        placeholder="¿Cuándo usar este template?"
                        rows={2}
                        className="mt-1"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="es_publico"
                        checked={formData.es_publico}
                        onCheckedChange={(checked) => setFormData({ ...formData, es_publico: checked as boolean })}
                      />
                      <Label htmlFor="es_publico" className="text-xs cursor-pointer flex items-center gap-1">
                        <Users className="w-3 h-3" /> Público (visible para todos)
                      </Label>
                    </div>
                  </div>
                )}

                {/* Section 2: Content */}
                <SectionHeader
                  icon={Tag}
                  title="Contenido"
                  isOpen={contentOpen}
                  onToggle={() => setContentOpen(!contentOpen)}
                  badge={formData.titulo_template || undefined}
                />
                {contentOpen && (
                  <div className="space-y-3 pl-3 border-l-2 border-primary/10 ml-3.5">
                    <div>
                      <Label className="text-xs text-muted-foreground">Título por Defecto *</Label>
                      <Input
                        value={formData.titulo_template}
                        onChange={(e) => setFormData({ ...formData, titulo_template: e.target.value })}
                        placeholder="Usa [EMPRESA] como placeholder"
                        className="mt-1"
                      />
                      <p className="text-[10px] text-muted-foreground mt-0.5">[EMPRESA] se reemplaza automáticamente</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Descripción por Defecto</Label>
                      <Textarea
                        value={formData.descripcion_template}
                        onChange={(e) => setFormData({ ...formData, descripcion_template: e.target.value })}
                        placeholder="Descripción de las tareas creadas"
                        rows={2}
                        className="mt-1"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">Prioridad</Label>
                        <div className="flex gap-1 mt-1">
                          {(['alta', 'media', 'baja'] as const).map(p => (
                            <button
                              key={p}
                              type="button"
                              onClick={() => setFormData({ ...formData, prioridad: p })}
                              className={cn(
                                "flex-1 text-xs py-1.5 rounded-md border transition-all font-medium",
                                formData.prioridad === p
                                  ? PRIORITY_STYLES[p] + ' ring-1 ring-offset-1'
                                  : 'border-border hover:bg-muted/60'
                              )}
                            >
                              {p === 'alta' ? 'Alta' : p === 'media' ? 'Media' : 'Baja'}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Categoría</Label>
                        <Select
                          value={formData.categoria_id}
                          onValueChange={(value) => setFormData({ ...formData, categoria_id: value })}
                        >
                          <SelectTrigger className="mt-1 text-xs h-8">
                            <SelectValue placeholder="Sin categoría" />
                          </SelectTrigger>
                          <SelectContent>
                            {categorias.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id} className="text-xs">
                                {cat.nombre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Section 3: Scheduling */}
                <SectionHeader
                  icon={Clock}
                  title="Programación"
                  isOpen={schedulingOpen}
                  onToggle={() => setSchedulingOpen(!schedulingOpen)}
                  badge={formData.duracion_dias ? `${formData.duracion_dias} días` : formData.es_recurrente ? activeRecurrencePreset?.label : undefined}
                />
                {schedulingOpen && (
                  <div className="space-y-3 pl-3 border-l-2 border-primary/10 ml-3.5">
                    <div>
                      <Label className="text-xs text-muted-foreground">Duración (días)</Label>
                      <Input
                        type="number"
                        value={formData.duracion_dias}
                        onChange={(e) => setFormData({ ...formData, duracion_dias: e.target.value })}
                        placeholder="30"
                        className="mt-1 h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground flex items-center gap-1 mb-1.5">
                        <Repeat className="w-3 h-3" /> Recurrencia
                      </Label>
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, es_recurrente: false })}
                          className={cn(
                            "text-xs px-2.5 py-1 rounded-md border transition-all",
                            !formData.es_recurrente
                              ? "bg-primary/10 border-primary/30 text-primary font-medium"
                              : "border-border hover:bg-muted/60"
                          )}
                        >
                          Sin repetir
                        </button>
                        {RECURRENCE_PRESETS.map(preset => (
                          <button
                            key={preset.frecuencia}
                            type="button"
                            onClick={() => {
                              setFormData({
                                ...formData,
                                es_recurrente: true,
                                frecuencia_recurrencia: preset.frecuencia,
                                intervalo_recurrencia: preset.intervalo,
                              });
                            }}
                            className={cn(
                              "text-xs px-2.5 py-1 rounded-md border transition-all",
                              formData.es_recurrente && formData.frecuencia_recurrencia === preset.frecuencia
                                ? "bg-primary/10 border-primary/30 text-primary font-medium"
                                : "border-border hover:bg-muted/60"
                            )}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Section 4: Subtareas */}
                <SectionHeader
                  icon={ListChecks}
                  title="Subtareas"
                  isOpen={subtareasOpen}
                  onToggle={() => setSubtareasOpen(!subtareasOpen)}
                  badge={subtareasTemplate.length > 0 ? `${subtareasTemplate.length} subtareas` : undefined}
                />
                {subtareasOpen && (
                  <div className="space-y-2 pl-3 border-l-2 border-primary/10 ml-3.5">
                    {subtareasTemplate.map((sub, idx) => (
                      <div key={idx} className="flex items-center gap-2 group">
                        <GripVertical className="w-3 h-3 text-muted-foreground/40" />
                        <span className="text-sm flex-1 truncate">{sub.titulo}</span>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeSubtarea(idx)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <Input
                        value={newSubtarea}
                        onChange={(e) => setNewSubtarea(e.target.value)}
                        placeholder="Nueva subtarea..."
                        className="h-8 text-sm"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addSubtarea();
                          }
                        }}
                      />
                      <Button type="button" size="sm" variant="outline" className="h-8 px-2" onClick={addSubtarea}>
                        <Plus className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Estas subtareas se crearán automáticamente al usar el template
                    </p>
                  </div>
                )}

                {/* Preview */}
                {(formData.titulo_template || subtareasTemplate.length > 0) && (
                  <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-heading mb-2">Vista previa</p>
                    <p className="text-sm font-medium">{formData.titulo_template || 'Sin título'}</p>
                    {formData.descripcion_template && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{formData.descripcion_template}</p>
                    )}
                    <div className="flex gap-1 mt-2 flex-wrap">
                      <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", PRIORITY_STYLES[formData.prioridad])}>
                        {formData.prioridad === 'alta' ? 'Alta' : formData.prioridad === 'media' ? 'Media' : 'Baja'}
                      </Badge>
                      {formData.duracion_dias && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">{formData.duracion_dias}d</Badge>
                      )}
                      {formData.es_recurrente && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5">
                          <Repeat className="w-2.5 h-2.5" />{activeRecurrencePreset?.label}
                        </Badge>
                      )}
                    </div>
                    {subtareasTemplate.length > 0 && (
                      <div className="mt-2 space-y-0.5">
                        {subtareasTemplate.map((sub, i) => (
                          <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <div className="h-3 w-3 rounded border border-border" />
                            {sub.titulo}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-4 sticky bottom-0 bg-background pb-2">
                  <Button type="button" variant="outline" onClick={resetForm} className="flex-1 font-heading">
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={loading} className="flex-1 gradient-primary shadow-elegant font-heading">
                    {loading ? 'Guardando...' : editingTemplate ? 'Actualizar' : 'Crear'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

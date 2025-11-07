import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { tareaSchema } from '@/lib/validation';
import { z } from 'zod';
import { CategorySelector } from './CategorySelector';
import { FileAttachments } from './FileAttachments';
import { TareaPreview } from './TareaPreview';
import { Repeat, Save, Eye, AlertCircle } from 'lucide-react';

interface CreateTareaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTareaCreated: () => void;
  defaultEmpresaId?: string;
  duplicateData?: any;
}

export default function CreateTareaDialog({ open, onOpenChange, onTareaCreated, defaultEmpresaId, duplicateData }: CreateTareaDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [consultores, setConsultores] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    prioridad: 'media' as 'alta' | 'media' | 'baja',
    fecha_vencimiento: '',
    empresa_id: defaultEmpresaId || '',
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
      fetchCategorias();
      loadDraft();
      // Set empresa_id if provided
      if (defaultEmpresaId && !formData.empresa_id) {
        setFormData(prev => ({ ...prev, empresa_id: defaultEmpresaId }));
      }
      // Apply duplicate data if provided
      if (duplicateData) {
        setFormData(duplicateData);
      }
    }
  }, [open, defaultEmpresaId, duplicateData]);

  // Refetch consultores when empresa changes
  useEffect(() => {
    if (open) {
      fetchConsultores();
    }
  }, [open, formData.empresa_id]);

  // Auto-save draft
  useEffect(() => {
    if (open && formData.titulo) {
      const timeoutId = setTimeout(() => {
        saveDraft();
      }, 2000); // Auto-save after 2 seconds of inactivity
      return () => clearTimeout(timeoutId);
    }
  }, [formData, open]);

  // Real-time validation
  useEffect(() => {
    if (formData.titulo || formData.empresa_id) {
      validateForm();
    }
  }, [formData.titulo, formData.empresa_id, formData.prioridad]);

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

  const loadDraft = async () => {
    try {
      const { data, error } = await supabase
        .from('tareas_borradores')
        .select('*')
        .eq('user_id', user?.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setCurrentDraftId(data.id);
        setFormData({
          titulo: data.titulo || '',
          descripcion: data.descripcion || '',
          prioridad: (data.prioridad as 'alta' | 'media' | 'baja') || 'media',
          fecha_vencimiento: data.fecha_vencimiento || '',
          empresa_id: data.empresa_id || '',
          consultor_asignado_id: data.consultor_asignado_id || '',
          categoria_id: data.categoria_id || '',
          es_recurrente: false,
          frecuencia_recurrencia: 'mensual',
          intervalo_recurrencia: 1,
          fecha_inicio_recurrencia: '',
          fecha_fin_recurrencia: ''
        });
      }
    } catch (error) {
      console.error('Error loading draft:', error);
    }
  };

  const saveDraft = async () => {
    if (!user?.id || !formData.titulo) return;

    setSavingDraft(true);
    try {
      const draftData = {
        user_id: user.id,
        titulo: formData.titulo.trim(),
        descripcion: formData.descripcion.trim() || null,
        prioridad: formData.prioridad,
        empresa_id: formData.empresa_id || null,
        consultor_asignado_id: formData.consultor_asignado_id || null,
        fecha_vencimiento: formData.fecha_vencimiento || null,
        categoria_id: formData.categoria_id || null,
        custom_fields: {},
        archivos_adjuntos: attachments
      };

      if (currentDraftId) {
        const { error } = await supabase
          .from('tareas_borradores')
          .update(draftData)
          .eq('id', currentDraftId);
        
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('tareas_borradores')
          .insert(draftData)
          .select()
          .single();
        
        if (error) throw error;
        setCurrentDraftId(data.id);
      }
    } catch (error) {
      console.error('Error saving draft:', error);
    } finally {
      setSavingDraft(false);
    }
  };

  const deleteDraft = async () => {
    if (!currentDraftId) return;
    
    try {
      await supabase
        .from('tareas_borradores')
        .delete()
        .eq('id', currentDraftId);
      
      setCurrentDraftId(null);
    } catch (error) {
      console.error('Error deleting draft:', error);
    }
  };

  const validateForm = () => {
    try {
      tareaSchema.parse(formData);
      setErrors({});
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.issues.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(fieldErrors);
      }
    }
  };

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
      // First get all user IDs with 'consultor' role
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'consultor');

      if (rolesError) throw rolesError;

      const consultorIds = rolesData?.map(r => r.user_id) || [];
      
      if (consultorIds.length === 0) {
        setConsultores([]);
        return;
      }

      // If there's a selected empresa, filter by consultores assigned to that empresa
      let query = supabase
        .from('profiles')
        .select('id, nombre_completo')
        .in('id', consultorIds)
        .order('nombre_completo');

      // If empresa is selected, filter by assigned consultores
      if (formData.empresa_id) {
        const { data: asignacionesData, error: asignacionesError } = await supabase
          .from('consultor_empresa_asignacion')
          .select('consultor_id')
          .eq('empresa_id', formData.empresa_id);

        if (asignacionesError) throw asignacionesError;

        const consultoresAsignadosIds = asignacionesData?.map(a => a.consultor_id) || [];
        
        // Only filter if there are assigned consultores
        if (consultoresAsignadosIds.length > 0) {
          query = query.in('id', consultoresAsignadosIds);
        } else {
          // If no consultores are assigned to this empresa, show none
          setConsultores([]);
          return;
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      setConsultores(data || []);
    } catch (error) {
      console.error('Error fetching consultores:', error);
      toast.error('Error al cargar consultores');
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
        error.issues.forEach((err) => {
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

      // Delete draft after successful creation
      await deleteDraft();

      toast.success('Tarea creada exitosamente');
      setFormData({
        titulo: '',
        descripcion: '',
        prioridad: 'media',
        fecha_vencimiento: '',
        empresa_id: defaultEmpresaId || '',
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
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="font-heading">Nueva Tarea</DialogTitle>
              <DialogDescription className="font-body">
                Crea una nueva tarea y asígnala a un consultor
              </DialogDescription>
            </div>
            {savingDraft && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Save className="w-3 h-3 animate-pulse" />
                <span>Guardando borrador...</span>
              </div>
            )}
          </div>
        </DialogHeader>
        
        <Tabs defaultValue="form" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="form">Formulario</TabsTrigger>
            <TabsTrigger value="preview">
              <Eye className="w-4 h-4 mr-2" />
              Previsualización
            </TabsTrigger>
          </TabsList>

          <TabsContent value="form" className="flex-1 overflow-hidden">
            <form onSubmit={handleSubmit} className="flex flex-col h-full">
              <div className="space-y-4 py-4 overflow-y-auto pr-2">
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
              <DialogFooter className="mt-4">
                <Button type="button" variant="outline" onClick={async () => { await saveDraft(); toast.success('Borrador guardado'); }} className="font-heading gap-2">
                  <Save className="w-4 h-4" />
                  Guardar Borrador
                </Button>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="font-heading">
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading || Object.keys(errors).length > 0} className="gradient-primary shadow-elegant font-heading">
                  {loading ? 'Creando...' : 'Crear Tarea'}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>

          <TabsContent value="preview" className="flex-1 overflow-y-auto py-4">
            <TareaPreview
              formData={formData}
              empresas={empresas}
              consultores={consultores}
              categorias={categorias}
            />
            {Object.keys(errors).length > 0 && (
              <div className="mt-4 p-4 border border-destructive/50 rounded bg-destructive/10">
                <div className="flex items-center gap-2 text-destructive font-medium mb-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>Corrige los siguientes errores:</span>
                </div>
                <ul className="text-sm text-destructive space-y-1 list-disc list-inside">
                  {Object.entries(errors).map(([field, error]) => (
                    <li key={field}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="font-heading">
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={loading || Object.keys(errors).length > 0} className="gradient-primary shadow-elegant font-heading">
                {loading ? 'Creando...' : 'Crear Tarea'}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

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
import { Plus, Edit, Trash2, GripVertical } from 'lucide-react';

interface ManageCustomFieldsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ManageCustomFields({ open, onOpenChange }: ManageCustomFieldsProps) {
  const [fields, setFields] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingField, setEditingField] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    tipo: 'text' as 'text' | 'number' | 'date' | 'select' | 'checkbox' | 'currency',
    opciones: '',
    requerido: false,
    activo: true
  });

  useEffect(() => {
    if (open) {
      fetchFields();
    }
  }, [open]);

  const fetchFields = async () => {
    try {
      const { data, error } = await supabase
        .from('custom_fields')
        .select('*')
        .order('orden');

      if (error) throw error;
      setFields(data || []);
    } catch (error) {
      console.error('Error fetching custom fields:', error);
      toast.error('Error al cargar campos personalizados');
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      descripcion: '',
      tipo: 'text',
      opciones: '',
      requerido: false,
      activo: true
    });
    setEditingField(null);
    setShowForm(false);
  };

  const handleEdit = (field: any) => {
    setEditingField(field);
    setFormData({
      nombre: field.nombre,
      descripcion: field.descripcion || '',
      tipo: field.tipo,
      opciones: Array.isArray(field.opciones) ? field.opciones.join(', ') : '',
      requerido: field.requerido,
      activo: field.activo
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const opciones = formData.tipo === 'select' && formData.opciones
        ? formData.opciones.split(',').map(o => o.trim()).filter(o => o)
        : null;

      if (editingField) {
        const { error } = await supabase
          .from('custom_fields')
          .update({
            nombre: formData.nombre,
            descripcion: formData.descripcion || null,
            tipo: formData.tipo,
            opciones: opciones,
            requerido: formData.requerido,
            activo: formData.activo
          })
          .eq('id', editingField.id);

        if (error) throw error;
        toast.success('Campo actualizado exitosamente');
      } else {
        const { error } = await supabase
          .from('custom_fields')
          .insert({
            nombre: formData.nombre,
            descripcion: formData.descripcion || null,
            tipo: formData.tipo,
            opciones: opciones,
            requerido: formData.requerido,
            activo: formData.activo,
            orden: fields.length
          });

        if (error) throw error;
        toast.success('Campo creado exitosamente');
      }

      resetForm();
      fetchFields();
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar campo');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (fieldId: string) => {
    if (!confirm('¿Estás seguro de eliminar este campo? Se perderán todos los valores asociados.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('custom_fields')
        .delete()
        .eq('id', fieldId);

      if (error) throw error;
      toast.success('Campo eliminado exitosamente');
      fetchFields();
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar campo');
    }
  };

  const getTypeLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      text: 'Texto',
      number: 'Número',
      date: 'Fecha',
      select: 'Selección',
      checkbox: 'Checkbox',
      currency: 'Moneda'
    };
    return labels[tipo] || tipo;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-heading">Gestionar Campos Personalizados</DialogTitle>
          <DialogDescription className="font-body">
            Crea y administra campos personalizados para tus tareas
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
                Nuevo Campo
              </Button>

              <div className="space-y-2">
                {fields.map((field) => (
                  <Card key={field.id}>
                    <CardHeader className="py-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-2 flex-1">
                          <GripVertical className="w-4 h-4 text-muted-foreground mt-1" />
                          <div className="flex-1">
                            <CardTitle className="text-base font-heading flex items-center gap-2">
                              {field.nombre}
                              {field.requerido && <Badge variant="destructive" className="text-xs">Requerido</Badge>}
                              {!field.activo && <Badge variant="secondary" className="text-xs">Inactivo</Badge>}
                            </CardTitle>
                            {field.descripcion && (
                              <CardDescription className="text-sm font-body mt-1">
                                {field.descripcion}
                              </CardDescription>
                            )}
                            <div className="flex gap-2 mt-2">
                              <Badge variant="outline" className="text-xs">
                                {getTypeLabel(field.tipo)}
                              </Badge>
                              {field.tipo === 'select' && field.opciones && (
                                <span className="text-xs text-muted-foreground">
                                  {Array.isArray(field.opciones) 
                                    ? field.opciones.length 
                                    : 0} opciones
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(field)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(field.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
                {fields.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No hay campos personalizados. Crea uno para comenzar.
                  </div>
                )}
              </div>
            </>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nombre" className="font-heading">Nombre del Campo *</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  required
                  placeholder="Ej: Número de Pedimento"
                  className="font-body"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descripcion" className="font-heading">Descripción</Label>
                <Textarea
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  placeholder="Descripción o instrucciones para el campo"
                  className="font-body"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo" className="font-heading">Tipo de Campo *</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value: any) => setFormData({ ...formData, tipo: value })}
                >
                  <SelectTrigger className="font-body">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Texto</SelectItem>
                    <SelectItem value="number">Número</SelectItem>
                    <SelectItem value="date">Fecha</SelectItem>
                    <SelectItem value="select">Selección</SelectItem>
                    <SelectItem value="checkbox">Checkbox</SelectItem>
                    <SelectItem value="currency">Moneda</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.tipo === 'select' && (
                <div className="space-y-2">
                  <Label htmlFor="opciones" className="font-heading">Opciones *</Label>
                  <Textarea
                    id="opciones"
                    value={formData.opciones}
                    onChange={(e) => setFormData({ ...formData, opciones: e.target.value })}
                    placeholder="Separa las opciones con comas. Ej: Opción 1, Opción 2, Opción 3"
                    className="font-body"
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    Separa cada opción con una coma
                  </p>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="requerido"
                  checked={formData.requerido}
                  onCheckedChange={(checked) => setFormData({ ...formData, requerido: checked as boolean })}
                />
                <Label htmlFor="requerido" className="font-body cursor-pointer">
                  Campo requerido
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="activo"
                  checked={formData.activo}
                  onCheckedChange={(checked) => setFormData({ ...formData, activo: checked as boolean })}
                />
                <Label htmlFor="activo" className="font-body cursor-pointer">
                  Campo activo
                </Label>
              </div>

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
                  {loading ? 'Guardando...' : editingField ? 'Actualizar' : 'Crear'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
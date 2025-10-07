import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Pencil, Palette, Tag } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Category {
  id: string;
  nombre: string;
  descripcion: string | null;
  color: string;
  created_at: string;
}

interface ManageCategoriesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCategoryChange?: () => void;
}

export default function ManageCategoriesDialog({ open, onOpenChange, onCategoryChange }: ManageCategoriesDialogProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    color: '#6366f1'
  });

  const colorOptions = [
    { value: '#6366f1', label: 'Índigo' },
    { value: '#8b5cf6', label: 'Violeta' },
    { value: '#ec4899', label: 'Rosa' },
    { value: '#f59e0b', label: 'Ámbar' },
    { value: '#10b981', label: 'Verde' },
    { value: '#3b82f6', label: 'Azul' },
    { value: '#ef4444', label: 'Rojo' },
    { value: '#14b8a6', label: 'Turquesa' }
  ];

  useEffect(() => {
    if (open) {
      fetchCategories();
    }
  }, [open]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categorias_tareas')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Error al cargar categorías');
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      descripcion: '',
      color: '#6366f1'
    });
    setEditingCategory(null);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      nombre: category.nombre,
      descripcion: category.descripcion || '',
      color: category.color
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nombre.trim()) {
      toast.error('El nombre es requerido');
      return;
    }

    setLoading(true);

    try {
      if (editingCategory) {
        // Update existing category
        const { error } = await supabase
          .from('categorias_tareas')
          .update({
            nombre: formData.nombre,
            descripcion: formData.descripcion || null,
            color: formData.color
          })
          .eq('id', editingCategory.id);

        if (error) throw error;
        toast.success('Categoría actualizada');
      } else {
        // Create new category
        const { error } = await supabase
          .from('categorias_tareas')
          .insert({
            nombre: formData.nombre,
            descripcion: formData.descripcion || null,
            color: formData.color
          });

        if (error) throw error;
        toast.success('Categoría creada');
      }

      resetForm();
      fetchCategories();
      onCategoryChange?.();
    } catch (error: any) {
      console.error('Error saving category:', error);
      toast.error(error.message || 'Error al guardar categoría');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <Tag className="w-5 h-5" />
            Gestionar Categorías
          </DialogTitle>
          <DialogDescription className="font-body">
            Crea y edita categorías para organizar tus tareas
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6 py-4">
          {/* Form Section */}
          <div>
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="font-heading text-lg">
                  {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
                </CardTitle>
                <CardDescription className="font-body text-sm">
                  {editingCategory ? 'Modifica los datos de la categoría' : 'Completa el formulario'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="nombre" className="font-heading">
                      Nombre *
                    </Label>
                    <Input
                      id="nombre"
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      placeholder="Ej: Fiscal, Legal, Administrativo"
                      required
                      className="font-body"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="descripcion" className="font-heading">
                      Descripción
                    </Label>
                    <Textarea
                      id="descripcion"
                      value={formData.descripcion}
                      onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                      placeholder="Describe el tipo de tareas..."
                      rows={3}
                      className="font-body resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="font-heading flex items-center gap-2">
                      <Palette className="w-4 h-4" />
                      Color
                    </Label>
                    <div className="grid grid-cols-4 gap-2">
                      {colorOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setFormData({ ...formData, color: option.value })}
                          className={`h-10 rounded-lg border-2 transition-all hover:scale-105 ${
                            formData.color === option.value
                              ? 'border-foreground ring-2 ring-offset-2 ring-foreground'
                              : 'border-border'
                          }`}
                          style={{ backgroundColor: option.value }}
                          title={option.label}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    {editingCategory && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={resetForm}
                        className="font-heading"
                      >
                        Cancelar
                      </Button>
                    )}
                    <Button
                      type="submit"
                      disabled={loading}
                      className="flex-1 gradient-primary shadow-elegant font-heading"
                    >
                      {editingCategory ? (
                        <>
                          <Pencil className="w-4 h-4 mr-2" />
                          Actualizar
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-2" />
                          Crear Categoría
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Categories List Section */}
          <div>
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="font-heading text-lg">
                  Categorías Existentes
                </CardTitle>
                <CardDescription className="font-body text-sm">
                  {categories.length} {categories.length === 1 ? 'categoría' : 'categorías'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] pr-4">
                  {categories.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3">
                        <Tag className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground font-body">
                        No hay categorías todavía
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {categories.map((category) => (
                        <Card
                          key={category.id}
                          className="hover:shadow-md transition-smooth cursor-pointer"
                          onClick={() => handleEdit(category)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div
                                className="w-4 h-4 rounded-full flex-shrink-0 mt-1"
                                style={{ backgroundColor: category.color }}
                              />
                              <div className="flex-1 min-w-0">
                                <h4 className="font-heading font-semibold text-sm mb-1">
                                  {category.nombre}
                                </h4>
                                {category.descripcion && (
                                  <p className="text-xs text-muted-foreground font-body line-clamp-2">
                                    {category.descripcion}
                                  </p>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEdit(category);
                                }}
                                className="flex-shrink-0"
                              >
                                <Pencil className="w-3 h-3" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

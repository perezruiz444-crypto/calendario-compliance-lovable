import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, Plus, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CategorySelectorProps {
  value: string;
  onValueChange: (value: string) => void;
}

interface Category {
  id: string;
  nombre: string;
  descripcion: string | null;
  color: string;
}

export function CategorySelector({ value, onValueChange }: CategorySelectorProps) {
  const [open, setOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCategory, setNewCategory] = useState({
    nombre: '',
    descripcion: '',
    color: '#6366f1'
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('categorias_tareas')
        .select('*')
        .order('nombre');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Error al cargar categorías');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategory.nombre.trim()) {
      toast.error('El nombre de la categoría es requerido');
      return;
    }

    setCreating(true);
    try {
      const { data, error } = await supabase
        .from('categorias_tareas')
        .insert({
          nombre: newCategory.nombre.trim(),
          descripcion: newCategory.descripcion.trim() || null,
          color: newCategory.color
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          toast.error('Ya existe una categoría con ese nombre');
        } else {
          throw error;
        }
        return;
      }

      toast.success('Categoría creada exitosamente');
      setCategories([...categories, data]);
      onValueChange(data.id);
      setDialogOpen(false);
      setNewCategory({ nombre: '', descripcion: '', color: '#6366f1' });
      fetchCategories();
    } catch (error: any) {
      toast.error(error.message || 'Error al crear categoría');
    } finally {
      setCreating(false);
    }
  };

  const selectedCategory = categories.find(cat => cat.id === value);

  const colorOptions = [
    { value: '#6366f1', label: 'Azul' },
    { value: '#ef4444', label: 'Rojo' },
    { value: '#f59e0b', label: 'Naranja' },
    { value: '#10b981', label: 'Verde' },
    { value: '#8b5cf6', label: 'Morado' },
    { value: '#ec4899', label: 'Rosa' },
    { value: '#06b6d4', label: 'Cyan' },
    { value: '#f97316', label: 'Amber' }
  ];

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 border rounded-md">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
        <span className="text-sm font-body">Cargando...</span>
      </div>
    );
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-body"
          >
            <div className="flex items-center gap-2">
              {selectedCategory ? (
                <>
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: selectedCategory.color }}
                  />
                  <span className="truncate">{selectedCategory.nombre}</span>
                </>
              ) : (
                <>
                  <Tag className="w-4 h-4" />
                  <span>Seleccionar categoría...</span>
                </>
              )}
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0 z-50 bg-popover">
          <Command>
            <CommandInput placeholder="Buscar categoría..." className="font-body" />
            <CommandEmpty className="font-body p-2">
              <p className="text-sm text-muted-foreground mb-2">No se encontró la categoría</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setOpen(false);
                  setDialogOpen(true);
                }}
                className="w-full font-heading"
              >
                <Plus className="w-4 h-4 mr-2" />
                Crear Nueva
              </Button>
            </CommandEmpty>
            <CommandGroup className="max-h-[200px] overflow-auto">
              {categories.map((category) => (
                <CommandItem
                  key={category.id}
                  value={category.nombre}
                  onSelect={() => {
                    onValueChange(category.id);
                    setOpen(false);
                  }}
                  className="font-body"
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === category.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: category.color }}
                  />
                  <div className="flex-1">
                    <p className="font-medium">{category.nombre}</p>
                    {category.descripcion && (
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {category.descripcion}
                      </p>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            <div className="border-t p-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setOpen(false);
                  setDialogOpen(true);
                }}
                className="w-full font-heading"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nueva Categoría
              </Button>
            </div>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Create Category Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="font-heading">Crear Nueva Categoría</DialogTitle>
            <DialogDescription className="font-body">
              Define una nueva categoría para clasificar tus tareas
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nombre" className="font-heading">Nombre *</Label>
              <Input
                id="nombre"
                value={newCategory.nombre}
                onChange={(e) => setNewCategory({ ...newCategory, nombre: e.target.value })}
                placeholder="Ej: Fiscal, IMMEX, Aduanas..."
                maxLength={50}
                className="font-body"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="descripcion" className="font-heading">Descripción</Label>
              <Textarea
                id="descripcion"
                value={newCategory.descripcion}
                onChange={(e) => setNewCategory({ ...newCategory, descripcion: e.target.value })}
                placeholder="Breve descripción de la categoría..."
                maxLength={200}
                rows={3}
                className="font-body"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-heading">Color</Label>
              <div className="grid grid-cols-4 gap-2">
                {colorOptions.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setNewCategory({ ...newCategory, color: color.value })}
                    className={cn(
                      'h-10 rounded-md border-2 transition-all hover:scale-105',
                      newCategory.color === color.value
                        ? 'border-foreground ring-2 ring-primary ring-offset-2'
                        : 'border-transparent'
                    )}
                    style={{ backgroundColor: color.value }}
                    title={color.label}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="font-heading"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateCategory}
              disabled={creating || !newCategory.nombre.trim()}
              className="gradient-primary shadow-elegant font-heading"
            >
              {creating ? 'Creando...' : 'Crear Categoría'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useInlineEdit(
  recordId: string | undefined,
  tableName: string,
  onLocalUpdate: (field: string, value: string) => void,
  canEdit: boolean
) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingField && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingField]);

  const startEditing = (field: string, value: string) => {
    if (!canEdit) return;
    setEditingField(field);
    setEditValue(value || '');
  };

  const cancelEditing = () => {
    setEditingField(null);
    setEditValue('');
  };

  const saveField = async () => {
    if (!editingField || !recordId) return;
    try {
      const { error } = await supabase
        .from(tableName as any)
        .update({ [editingField]: editValue })
        .eq('id', recordId);
      if (error) throw error;
      onLocalUpdate(editingField, editValue);
      toast.success('Actualizado');
    } catch {
      toast.error('Error al guardar');
    } finally {
      cancelEditing();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') saveField();
    if (e.key === 'Escape') cancelEditing();
  };

  return {
    editingField,
    editValue,
    setEditValue,
    inputRef,
    startEditing,
    cancelEditing,
    saveField,
    handleKeyDown,
  };
}

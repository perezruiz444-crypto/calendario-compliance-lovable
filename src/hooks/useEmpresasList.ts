import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useEmpresasList(enabled = true) {
  const [empresas, setEmpresas] = useState<Array<{ id: string; razon_social: string }>>([]);

  useEffect(() => {
    if (!enabled) return;
    supabase
      .from('empresas')
      .select('id, razon_social')
      .order('razon_social')
      .then(({ data, error }) => {
        if (error) {
          toast.error('No se pudieron cargar las empresas. Recarga la página.');
          return;
        }
        setEmpresas(data || []);
      });
  }, [enabled]);

  return { empresas };
}

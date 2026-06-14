import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys } from '@/lib/queryKeys';
import { logger } from '@/lib/logger';

type EmpresaListItem = { id: string; razon_social: string };

export function useEmpresasList(enabled = true) {
  const { data: empresas = [] } = useQuery({
    queryKey: queryKeys.empresas.list({ select: 'id,razon_social' }),
    enabled,
    queryFn: async (): Promise<EmpresaListItem[]> => {
      const { data, error } = await supabase
        .from('empresas')
        .select('id, razon_social')
        .order('razon_social');
      if (error) {
        logger.error('No se pudieron cargar las empresas', error);
        throw error;
      }
      return data ?? [];
    },
  });

  return { empresas };
}

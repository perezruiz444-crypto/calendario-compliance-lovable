import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Layers } from 'lucide-react';
import { ProgramaRow } from './ProgramaRow';

import { PROGRAMAS_ORDEN } from '@/lib/obligaciones';

export interface EmpresaPrograma {
  id: string;
  programa: string;
  activo: boolean;
  fecha_inicio: string | null;
  sectores: string[] | null;
}

interface EmpresaProgramasTabProps {
  empresaId: string;
  canEdit: boolean;
}

export function EmpresaProgramasTab({ empresaId, canEdit }: EmpresaProgramasTabProps) {
  const [registros, setRegistros] = useState<EmpresaPrograma[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRegistros = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('empresa_programas')
      .select('id, programa, activo, fecha_inicio, sectores')
      .eq('empresa_id', empresaId);
    setRegistros((data || []) as EmpresaPrograma[]);
    setLoading(false);
  }, [empresaId]);

  useEffect(() => { fetchRegistros(); }, [fetchRegistros]);

  const getRegistros = (programa: string) =>
    registros.filter(r => r.programa === programa);

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary" /> Programas Activos
        </CardTitle>
        <CardDescription className="text-xs">
          Al activar un programa se generan automáticamente las obligaciones del año en el calendario.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Cargando...</div>
        ) : (
          <div>
            {PROGRAMAS_ORDEN.map(programa => (
              <ProgramaRow
                key={programa}
                programa={programa}
                registros={getRegistros(programa)}
                empresaId={empresaId}
                canEdit={canEdit}
                onUpdate={fetchRegistros}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

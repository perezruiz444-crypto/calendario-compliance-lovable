import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { FileText, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';

interface Doc {
  id: string;
  nombre: string;
  tipo_documento: string;
  fecha_vencimiento: string | null;
}

interface Props {
  empresaId: string;
  onVerTodos?: () => void;
}

export default function MisDocumentos({ empresaId, onVerTodos }: Props) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!empresaId) return;
    let cancelled = false;
    (async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data } = await supabase
        .from('documentos')
        .select('id, nombre, tipo_documento, fecha_vencimiento')
        .eq('empresa_id', empresaId)
        .not('fecha_vencimiento', 'is', null)
        .gte('fecha_vencimiento', today)
        .order('fecha_vencimiento', { ascending: true })
        .limit(5);
      if (!cancelled) {
        setDocs(data || []);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [empresaId]);

  if (loading) return null;

  return (
    <Card className="gradient-card shadow-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="font-heading flex items-center gap-2">
              <FileText className="w-5 h-5" /> Documentos por vencer
            </CardTitle>
            <CardDescription>Pasaportes, certificados y contratos próximos a expirar.</CardDescription>
          </div>
          {onVerTodos && (
            <Button variant="ghost" size="sm" onClick={onVerTodos}>
              Ver todos <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {docs.length === 0 ? (
          <div className="py-6 text-center">
            <CheckCircle2 className="w-8 h-8 text-success mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No hay documentos próximos a vencer.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {docs.map(d => {
              const fecha = parseISO(d.fecha_vencimiento!);
              const dias = differenceInDays(fecha, new Date());
              const urgente = dias <= 30;
              return (
                <div
                  key={d.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    urgente ? 'bg-destructive/5 border-destructive/20' : 'bg-card border-border'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{d.nombre}</p>
                    <p className="text-xs text-muted-foreground">{d.tipo_documento}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant={urgente ? 'destructive' : 'outline'} className="gap-1">
                      {urgente && <AlertCircle className="w-3 h-3" />}
                      {format(fecha, "d MMM yyyy", { locale: es })}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

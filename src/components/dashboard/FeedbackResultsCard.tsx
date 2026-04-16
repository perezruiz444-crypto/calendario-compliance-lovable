import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { MessageSquareHeart, ChevronDown, Star, Users } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

interface FeedbackRow {
  id: string;
  user_id: string;
  q1_razon_login: string;
  q2_semaforo_rating: number;
  q3_friccion: string | null;
  q4_varita_magica: string | null;
  q5_retencion: string;
  created_at: string;
  profiles?: { nombre_completo: string; email: string | null } | null;
}

const retencionColor: Record<string, string> = {
  'Muy decepcionado': 'bg-success text-success-foreground',
  'Algo decepcionado': 'bg-warning text-warning-foreground',
  'Nada decepcionado': 'bg-destructive text-destructive-foreground',
};

export default function FeedbackResultsCard() {
  const [data, setData] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchFeedback = async () => {
      const { data: rows, error } = await supabase
        .from('feedback_clientes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && rows) {
        // Fetch profiles for each user_id
        const userIds = [...new Set(rows.map(r => r.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, nombre_completo, email')
          .in('id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        const enriched = rows.map(r => ({
          ...r,
          profiles: profileMap.get(r.user_id) || null,
        }));
        setData(enriched as unknown as FeedbackRow[]);
      }
      setLoading(false);
    };
    fetchFeedback();
  }, []);

  if (loading) {
    return (
      <Card className="gradient-card shadow-card">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) return null;

  const avgRating = data.reduce((sum, r) => sum + r.q2_semaforo_rating, 0) / data.length;
  const muyDecepcionado = data.filter(r => r.q5_retencion === 'Muy decepcionado').length;
  const pctMuyDecepcionado = Math.round((muyDecepcionado / data.length) * 100);

  return (
    <Card className="gradient-card shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="font-heading flex items-center gap-2">
              <MessageSquareHeart className="w-5 h-5 text-primary" />
              Customer Discovery
            </CardTitle>
            <CardDescription className="font-body">
              {data.length} respuesta{data.length !== 1 ? 's' : ''} de clientes
            </CardDescription>
          </div>
          <div className="flex gap-3 text-sm">
            <div className="text-center">
              <div className="font-heading font-bold text-lg text-primary">{avgRating.toFixed(1)}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-0.5"><Star className="w-3 h-3" /> Avg Rating</div>
            </div>
            <div className="text-center">
              <div className="font-heading font-bold text-lg text-success">{pctMuyDecepcionado}%</div>
              <div className="text-xs text-muted-foreground flex items-center gap-0.5"><Users className="w-3 h-3" /> PMF Score</div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {data.map((row) => (
            <Collapsible
              key={row.id}
              open={expandedId === row.id}
              onOpenChange={(open) => setExpandedId(open ? row.id : null)}
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between h-auto py-3 px-3 hover:bg-muted/50 text-left"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-heading font-medium text-sm truncate">
                          {(row.profiles as any)?.nombre_completo || 'Usuario'}
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          {row.q1_razon_login}
                        </Badge>
                        <Badge className={retencionColor[row.q5_retencion] || 'bg-muted'}>
                          {row.q5_retencion}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground font-body mt-0.5">
                        {format(new Date(row.created_at), "d MMM yyyy, HH:mm", { locale: es })}
                        {' · '}Semáforo: {'⭐'.repeat(row.q2_semaforo_rating)}
                      </div>
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="px-3 pb-3">
                <div className="bg-muted/30 rounded-lg p-3 space-y-3 text-sm font-body">
                  {row.q3_friccion && (
                    <div>
                      <p className="font-heading font-medium text-xs text-muted-foreground mb-1">🔍 Fricción identificada</p>
                      <p className="text-foreground">{row.q3_friccion}</p>
                    </div>
                  )}
                  {row.q4_varita_magica && (
                    <div>
                      <p className="font-heading font-medium text-xs text-muted-foreground mb-1">✨ Varita mágica</p>
                      <p className="text-foreground">{row.q4_varita_magica}</p>
                    </div>
                  )}
                  {!row.q3_friccion && !row.q4_varita_magica && (
                    <p className="text-muted-foreground italic">No proporcionó respuestas abiertas.</p>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

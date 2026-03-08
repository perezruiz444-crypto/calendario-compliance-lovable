import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Shield, Search, RefreshCw, Activity, Database, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface AuditLog {
  id: string;
  action: string;
  table_name: string;
  record_id: string | null;
  created_at: string;
  user_id: string | null;
}

const actionColors: Record<string, string> = {
  INSERT: 'bg-green-500/10 text-green-700 border-green-500/20',
  UPDATE: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
  DELETE: 'bg-red-500/10 text-red-700 border-red-500/20',
};

const actionLabels: Record<string, string> = {
  INSERT: 'Creación',
  UPDATE: 'Actualización',
  DELETE: 'Eliminación',
};

export default function SecurityAuditSection() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('id, action, table_name, record_id, created_at, user_id')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      setLogs(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return log.table_name.toLowerCase().includes(q) || log.action.toLowerCase().includes(q);
  });

  const tableStats = logs.reduce((acc, log) => {
    acc[log.table_name] = (acc[log.table_name] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topTables = Object.entries(tableStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Overview Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="group hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-primary/10 group-hover:bg-primary/15 transition-colors">
              <Activity className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{logs.length}</p>
              <p className="text-xs text-muted-foreground">Eventos registrados</p>
            </div>
          </CardContent>
        </Card>
        <Card className="group hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-primary/10 group-hover:bg-primary/15 transition-colors">
              <Database className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{Object.keys(tableStats).length}</p>
              <p className="text-xs text-muted-foreground">Tablas monitoreadas</p>
            </div>
          </CardContent>
        </Card>
        <Card className="group hover:shadow-md transition-shadow">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-primary/10 group-hover:bg-primary/15 transition-colors">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {logs[0] ? format(new Date(logs[0].created_at), 'HH:mm', { locale: es }) : '--'}
              </p>
              <p className="text-xs text-muted-foreground">Último evento</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top tables */}
      {topTables.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" />
              Tablas más activas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {topTables.map(([table, count]) => (
                <Badge key={table} variant="secondary" className="gap-1.5 py-1 px-2.5">
                  {table}
                  <span className="text-[10px] bg-primary/10 text-primary rounded-full px-1.5">{count}</span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Audit Log List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Registro de Auditoría
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Filtrar por tabla..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 w-48 text-sm"
                />
              </div>
              <Button variant="outline" size="sm" onClick={fetchLogs} className="gap-1.5 h-8">
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No hay eventos de auditoría registrados
            </p>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-1">
                {filteredLogs.map((log, i) => (
                  <div key={log.id}>
                    {i > 0 && <Separator className="my-1" />}
                    <div className="flex items-center gap-3 py-2 px-1 rounded hover:bg-muted/50 transition-colors">
                      <Badge variant="outline" className={`text-[10px] shrink-0 ${actionColors[log.action] || ''}`}>
                        {actionLabels[log.action] || log.action}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{log.table_name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {log.record_id ? `ID: ${log.record_id.slice(0, 8)}...` : 'Sin ID'}
                        </p>
                      </div>
                      <span className="text-[11px] text-muted-foreground shrink-0">
                        {format(new Date(log.created_at), 'dd MMM HH:mm', { locale: es })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

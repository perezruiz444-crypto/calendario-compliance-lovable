import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Search, Mail, Smartphone, Bell, RefreshCw, XCircle, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface NotificationLog {
  id: string;
  user_id: string;
  tipo: string;
  titulo: string;
  contenido: string | null;
  canal: 'email' | 'push' | 'in_app';
  estado: 'enviada' | 'fallida' | 'pendiente';
  error_mensaje: string | null;
  referencia_id: string | null;
  referencia_tipo: string | null;
  created_at: string;
}

const CANALES = [
  { value: 'all', label: 'Todos los canales' },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'push', label: 'Push', icon: Smartphone },
  { value: 'in_app', label: 'En app', icon: Bell },
];

const ESTADOS = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'enviada', label: 'Enviada' },
  { value: 'fallida', label: 'Fallida' },
  { value: 'pendiente', label: 'Pendiente' },
];

export function NotificationHistory() {
  const { role } = useAuth();
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCanal, setFilterCanal] = useState('all');
  const [filterEstado, setFilterEstado] = useState('all');

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const query = (supabase as any)
        .from('notification_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      const { data, error } = await query;

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error loading notification logs:', error);
      toast.error('Error al cargar historial');
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = !searchTerm || 
      log.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.contenido?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.tipo.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCanal = filterCanal === 'all' || log.canal === filterCanal;
    const matchesEstado = filterEstado === 'all' || log.estado === filterEstado;

    return matchesSearch && matchesCanal && matchesEstado;
  });

  const getCanalIcon = (canal: string) => {
    switch (canal) {
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'push':
        return <Smartphone className="h-4 w-4" />;
      case 'in_app':
        return <Bell className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'enviada':
        return (
          <Badge variant="outline" className="gap-1 bg-primary/10 text-primary border-primary/20">
            <CheckCircle className="h-3 w-3" />
            Enviada
          </Badge>
        );
      case 'fallida':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Fallida
          </Badge>
        );
      case 'pendiente':
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            Pendiente
          </Badge>
        );
      default:
        return <Badge variant="secondary">{estado}</Badge>;
    }
  };

  const getTipoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      tarea_asignada: 'Tarea asignada',
      tarea_vencida: 'Tarea vencida',
      tarea_completada: 'Tarea completada',
      comentario: 'Comentario',
      mensaje: 'Mensaje',
      solicitud: 'Solicitud',
      certificacion: 'Certificación',
      documento: 'Documento',
      resumen_diario: 'Resumen diario',
      tarea_desbloqueada: 'Tarea desbloqueada',
    };
    return labels[tipo] || tipo;
  };

  // Stats
  const stats = {
    total: logs.length,
    enviadas: logs.filter(l => l.estado === 'enviada').length,
    fallidas: logs.filter(l => l.estado === 'fallida').length,
    pendientes: logs.filter(l => l.estado === 'pendiente').length,
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total enviadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-primary">{stats.enviadas}</div>
            <p className="text-xs text-muted-foreground">Exitosas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-destructive">{stats.fallidas}</div>
            <p className="text-xs text-muted-foreground">Fallidas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-muted-foreground">{stats.pendientes}</div>
            <p className="text-xs text-muted-foreground">Pendientes</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Historial de Notificaciones</CardTitle>
              <CardDescription>
                Registro de todas las notificaciones enviadas
              </CardDescription>
            </div>
            <Button variant="outline" onClick={loadLogs} className="gap-2 shrink-0">
              <RefreshCw className="h-4 w-4" />
              Actualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por título o contenido..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterCanal} onValueChange={setFilterCanal}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CANALES.map(canal => (
                  <SelectItem key={canal.value} value={canal.value}>
                    {canal.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterEstado} onValueChange={setFilterEstado}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ESTADOS.map(estado => (
                  <SelectItem key={estado.value} value={estado.value}>
                    {estado.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay notificaciones en el historial</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Canal</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-sm">
                            {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: es })}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{getTipoLabel(log.tipo)}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[200px]">
                          <p className="font-medium truncate">{log.titulo}</p>
                          {log.contenido && (
                            <p className="text-xs text-muted-foreground truncate">
                              {log.contenido}
                            </p>
                          )}
                          {log.error_mensaje && (
                            <p className="text-xs text-destructive truncate">
                              Error: {log.error_mensaje}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getCanalIcon(log.canal)}
                          <span className="text-sm capitalize">{log.canal}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getEstadoBadge(log.estado)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

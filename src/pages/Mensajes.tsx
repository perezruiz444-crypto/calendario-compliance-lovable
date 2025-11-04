import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Mail, MailOpen, Plus, Send, Inbox } from 'lucide-react';
import { format } from 'date-fns';
import { CreateMensajeDialog } from '@/components/mensajes/CreateMensajeDialog';
import { MensajeDetailDialog } from '@/components/mensajes/MensajeDetailDialog';
export default function Mensajes() {
  const {
    user,
    loading
  } = useAuth();
  const navigate = useNavigate();
  const [mensajes, setMensajes] = useState<any[]>([]);
  const [loadingMensajes, setLoadingMensajes] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedMensajeId, setSelectedMensajeId] = useState<string | null>(null);
  const [tab, setTab] = useState<'recibidos' | 'enviados'>('recibidos');
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);
  useEffect(() => {
    if (user) {
      fetchMensajes();

      // Subscribe to real-time updates
      const channel = supabase.channel('mensajes-changes').on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'mensajes',
        filter: `destinatario_id=eq.${user.id}`
      }, () => {
        fetchMensajes();
      }).subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);
  const fetchMensajes = async () => {
    setLoadingMensajes(true);
    try {
      const {
        data,
        error
      } = await supabase.from('mensajes').select(`
          *,
          remitente:profiles!mensajes_remitente_id_fkey(nombre_completo),
          destinatario:profiles!mensajes_destinatario_id_fkey(nombre_completo),
          empresas(razon_social)
        `).or(`remitente_id.eq.${user?.id},destinatario_id.eq.${user?.id}`).order('created_at', {
        ascending: false
      });
      if (error) throw error;
      setMensajes(data || []);
    } catch (error) {
      console.error('Error fetching mensajes:', error);
      toast.error('Error al cargar mensajes');
    } finally {
      setLoadingMensajes(false);
    }
  };
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };
  const mensajesRecibidos = mensajes.filter(m => m.destinatario_id === user?.id);
  const mensajesEnviados = mensajes.filter(m => m.remitente_id === user?.id);
  const mensajesNoLeidos = mensajesRecibidos.filter(m => !m.leido).length;
  const displayMensajes = tab === 'recibidos' ? mensajesRecibidos : mensajesEnviados;
  if (loading || loadingMensajes) {
    return <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>;
  }
  return <DashboardLayout currentPage="/mensajes">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground mb-2">
              Mensajería Interna
            </h1>
            
          </div>
          <Button onClick={() => setDialogOpen(true)} className="gradient-primary shadow-elegant hover:shadow-lg transition-smooth font-heading">
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Mensaje
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="gradient-card shadow-elegant">
            <CardHeader className="pb-3">
              <CardTitle className="font-heading text-sm">Recibidos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-heading font-bold">{mensajesRecibidos.length}</div>
            </CardContent>
          </Card>
          <Card className="gradient-card shadow-elegant">
            <CardHeader className="pb-3">
              <CardTitle className="font-heading text-sm">Enviados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-heading font-bold">{mensajesEnviados.length}</div>
            </CardContent>
          </Card>
          <Card className="gradient-card shadow-elegant">
            <CardHeader className="pb-3">
              <CardTitle className="font-heading text-sm">Sin Leer</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-heading font-bold text-warning">{mensajesNoLeidos}</div>
            </CardContent>
          </Card>
        </div>

        {/* Messages List */}
        <Card className="gradient-card shadow-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-heading">Mensajes</CardTitle>
              <div className="flex gap-2">
                <Button variant={tab === 'recibidos' ? 'default' : 'outline'} size="sm" onClick={() => setTab('recibidos')} className="font-heading">
                  <Inbox className="w-4 h-4 mr-2" />
                  Recibidos
                  {mensajesNoLeidos > 0 && <Badge className="ml-2 bg-warning text-warning-foreground">{mensajesNoLeidos}</Badge>}
                </Button>
                <Button variant={tab === 'enviados' ? 'default' : 'outline'} size="sm" onClick={() => setTab('enviados')} className="font-heading">
                  <Send className="w-4 h-4 mr-2" />
                  Enviados
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {displayMensajes.length === 0 ? <div className="text-center py-12">
                <Mail className="w-16 h-16 mx-auto text-muted-foreground mb-4 opacity-50" />
                <p className="text-muted-foreground font-body mb-4">
                  {tab === 'recibidos' ? 'No tienes mensajes recibidos' : 'No has enviado mensajes'}
                </p>
                <Button onClick={() => setDialogOpen(true)} className="gradient-primary shadow-elegant font-heading">
                  <Plus className="w-4 h-4 mr-2" />
                  Enviar Primer Mensaje
                </Button>
              </div> : <div className="space-y-3">
                {displayMensajes.map(mensaje => <div key={mensaje.id} className={`border rounded-lg p-4 hover:border-primary transition-colors cursor-pointer hover-scale animate-fade-in ${!mensaje.leido && mensaje.destinatario_id === user?.id ? 'bg-primary/5 border-primary/20' : ''}`} onClick={() => {
              setSelectedMensajeId(mensaje.id);
              setDetailDialogOpen(true);
            }}>
                    <div className="flex items-start gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-primary text-primary-foreground font-heading">
                          {getInitials(tab === 'recibidos' ? mensaje.remitente?.nombre_completo || 'U' : mensaje.destinatario?.nombre_completo || 'U')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-heading font-semibold truncate">
                              {tab === 'recibidos' ? mensaje.remitente?.nombre_completo : mensaje.destinatario?.nombre_completo}
                            </span>
                            {!mensaje.leido && mensaje.destinatario_id === user?.id && <Badge variant="default" className="bg-warning text-warning-foreground">
                                Nuevo
                              </Badge>}
                          </div>
                          <div className="flex items-center gap-2">
                            {tab === 'recibidos' ? mensaje.leido ? <MailOpen className="w-4 h-4 text-muted-foreground" /> : <Mail className="w-4 h-4 text-primary" /> : <Send className="w-4 h-4 text-muted-foreground" />}
                            <span className="text-xs text-muted-foreground font-body">
                              {format(new Date(mensaje.created_at), 'dd/MM/yyyy HH:mm')}
                            </span>
                          </div>
                        </div>
                        <h4 className="font-heading font-medium mb-1">{mensaje.asunto}</h4>
                        <p className="text-sm text-muted-foreground font-body line-clamp-2">
                          {mensaje.contenido}
                        </p>
                        {mensaje.empresas && <Badge variant="outline" className="mt-2">
                            {mensaje.empresas.razon_social}
                          </Badge>}
                      </div>
                    </div>
                  </div>)}
              </div>}
          </CardContent>
        </Card>
      </div>

      <CreateMensajeDialog open={dialogOpen} onOpenChange={setDialogOpen} onMensajeCreated={fetchMensajes} />

      {selectedMensajeId && <MensajeDetailDialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen} mensajeId={selectedMensajeId} onUpdate={fetchMensajes} />}
    </DashboardLayout>;
}
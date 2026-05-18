import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Mail, MailOpen, Plus, Send, Inbox } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { CreateMensajeDialog } from '@/components/mensajes/CreateMensajeDialog';
import { MensajeDetailDialog } from '@/components/mensajes/MensajeDetailDialog';
import { PageHeader } from '@/components/layout/PageHeader';
import { KpiCard } from '@/components/ui/KpiCard';
import { EmptyState } from '@/components/ui/EmptyState';

export default function Mensajes() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mensajes, setMensajes] = useState<any[]>([]);
  const [loadingMensajes, setLoadingMensajes] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedMensajeId, setSelectedMensajeId] = useState<string | null>(null);
  const [tab, setTab] = useState<'recibidos' | 'enviados'>('recibidos');

  useEffect(() => { if (!loading && !user) navigate('/auth'); }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    fetchMensajes();
    const channel = supabase.channel('mensajes-changes').on('postgres_changes', {
      event: '*', schema: 'public', table: 'mensajes',
      filter: `destinatario_id=eq.${user.id}`,
    }, () => fetchMensajes()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const fetchMensajes = async () => {
    setLoadingMensajes(true);
    try {
      const { data, error } = await supabase.from('mensajes').select(`
        *,
        remitente:profiles!mensajes_remitente_id_fkey(nombre_completo),
        destinatario:profiles!mensajes_destinatario_id_fkey(nombre_completo),
        empresas(razon_social)
      `).or(`remitente_id.eq.${user?.id},destinatario_id.eq.${user?.id}`)
       .order('created_at', { ascending: false });
      if (error) throw error;
      setMensajes(data || []);
    } catch (error) {
      console.error('Error fetching mensajes:', error);
      toast.error('Error al cargar mensajes');
    } finally {
      setLoadingMensajes(false);
    }
  };

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const mensajesRecibidos = mensajes.filter(m => m.destinatario_id === user?.id);
  const mensajesEnviados = mensajes.filter(m => m.remitente_id === user?.id);
  const mensajesNoLeidos = mensajesRecibidos.filter(m => !m.leido).length;
  const displayMensajes = tab === 'recibidos' ? mensajesRecibidos : mensajesEnviados;

  if (loading || loadingMensajes) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <DashboardLayout currentPage="/mensajes">
      <div className="space-y-8">
        <PageHeader
          eyebrow="Bandeja · Comunicación interna"
          title="Mensajería"
          description="Conversaciones con el equipo y clientes asociados a tus empresas."
          actions={
            <Button onClick={() => setDialogOpen(true)} size="sm" className="gap-1.5 shadow-editorial">
              <Plus className="w-4 h-4" /> Nuevo Mensaje
            </Button>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KpiCard index={0} title="Recibidos" value={mensajesRecibidos.length} icon={Inbox} tone="primary" sub="Total en bandeja" />
          <KpiCard index={1} title="Enviados" value={mensajesEnviados.length} icon={Send} tone="primary" sub="Historial de envíos" />
          <KpiCard index={2} title="Sin leer" value={mensajesNoLeidos} icon={Mail} tone={mensajesNoLeidos > 0 ? 'warning' : 'success'} sub="Requieren tu atención" />
        </div>

        {/* Tabs editoriales */}
        <div className="flex items-center gap-1 border-b border-border-subtle">
          {(['recibidos', 'enviados'] as const).map(t => {
            const active = tab === t;
            const count = t === 'recibidos' ? mensajesRecibidos.length : mensajesEnviados.length;
            const Icon = t === 'recibidos' ? Inbox : Send;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`relative flex items-center gap-2 px-4 py-3 text-sm font-heading font-medium transition-colors ${
                  active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="capitalize">{t}</span>
                <span className="text-xs font-mono text-muted-foreground/70">({count})</span>
                {t === 'recibidos' && mensajesNoLeidos > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-warning text-warning-foreground text-[10px] font-bold">
                    {mensajesNoLeidos}
                  </span>
                )}
                {active && (
                  <motion.span
                    layoutId="msgs-tab-underline"
                    className="absolute left-0 right-0 -bottom-px h-0.5 bg-primary"
                    transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Lista */}
        {displayMensajes.length === 0 ? (
          <EmptyState
            icon={Mail}
            eyebrow={tab === 'recibidos' ? 'Bandeja vacía' : 'Sin envíos'}
            title={tab === 'recibidos' ? 'No tienes mensajes recibidos' : 'No has enviado mensajes todavía'}
            description="Inicia una conversación con tu equipo o un cliente."
            action={
              <Button onClick={() => setDialogOpen(true)} size="sm" className="gap-1.5 shadow-editorial">
                <Plus className="w-4 h-4" /> Enviar primer mensaje
              </Button>
            }
          />
        ) : (
          <div className="space-y-2">
            {displayMensajes.map((mensaje, idx) => {
              const unread = !mensaje.leido && mensaje.destinatario_id === user?.id;
              const personName = tab === 'recibidos'
                ? mensaje.remitente?.nombre_completo || 'Usuario'
                : mensaje.destinatario?.nombre_completo || 'Usuario';
              return (
                <motion.div
                  key={mensaje.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: Math.min(idx * 0.02, 0.3) }}
                  onClick={() => { setSelectedMensajeId(mensaje.id); setDetailDialogOpen(true); }}
                  className={`group card-editorial cursor-pointer px-5 py-4 flex items-start gap-4 hover-lift ${
                    unread ? 'border-l-4 border-l-primary' : ''
                  }`}
                >
                  <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-heading font-semibold text-sm ${
                    unread ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'
                  }`}>
                    {getInitials(personName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`font-heading text-sm truncate ${unread ? 'font-bold text-foreground' : 'font-medium text-foreground'}`}>
                          {personName}
                        </span>
                        {unread && <span className="text-[10px] font-mono uppercase tracking-wider text-primary font-bold">Nuevo</span>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {tab === 'recibidos'
                          ? (mensaje.leido
                              ? <MailOpen className="w-3.5 h-3.5 text-muted-foreground/60" />
                              : <Mail className="w-3.5 h-3.5 text-primary" />)
                          : <Send className="w-3.5 h-3.5 text-muted-foreground/60" />}
                        <span className="text-[11px] font-mono text-muted-foreground" title={format(new Date(mensaje.created_at), 'dd/MM/yyyy HH:mm')}>
                          {formatDistanceToNow(new Date(mensaje.created_at), { addSuffix: true, locale: es })}
                        </span>
                      </div>
                    </div>
                    <h4 className={`font-heading text-[15px] mb-1 truncate ${unread ? 'font-semibold text-foreground' : 'text-foreground/90'}`}>
                      {mensaje.asunto}
                    </h4>
                    <p className="text-sm text-muted-foreground line-clamp-1 leading-relaxed">
                      {mensaje.contenido}
                    </p>
                    {mensaje.empresas && (
                      <Badge variant="outline" className="mt-2 text-[10px] font-mono uppercase tracking-wider">
                        {mensaje.empresas.razon_social}
                      </Badge>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <CreateMensajeDialog open={dialogOpen} onOpenChange={setDialogOpen} onMensajeCreated={fetchMensajes} />
      {selectedMensajeId && (
        <MensajeDetailDialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen} mensajeId={selectedMensajeId} onUpdate={fetchMensajes} />
      )}
    </DashboardLayout>
  );
}

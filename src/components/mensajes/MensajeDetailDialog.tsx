import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Mail, Clock, Building2 } from 'lucide-react';
import { format } from 'date-fns';

interface MensajeDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mensajeId: string;
  onUpdate: () => void;
}

export function MensajeDetailDialog({ open, onOpenChange, mensajeId, onUpdate }: MensajeDetailDialogProps) {
  const { user } = useAuth();
  const [mensaje, setMensaje] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && mensajeId) {
      fetchMensaje();
    }
  }, [open, mensajeId]);

  const fetchMensaje = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('mensajes')
        .select(`
          *,
          remitente:profiles!mensajes_remitente_id_fkey(nombre_completo),
          destinatario:profiles!mensajes_destinatario_id_fkey(nombre_completo),
          empresas(razon_social)
        `)
        .eq('id', mensajeId)
        .single();

      if (error) throw error;
      setMensaje(data);

      // Mark as read if user is recipient and message is unread
      if (data.destinatario_id === user?.id && !data.leido) {
        await supabase
          .from('mensajes')
          .update({ leido: true })
          .eq('id', mensajeId);
        onUpdate();
      }
    } catch (error: any) {
      toast.error('Error al cargar mensaje');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!mensaje) return null;

  const isRecipient = mensaje.destinatario_id === user?.id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl">{mensaje.asunto}</DialogTitle>
          <DialogDescription className="font-body space-y-2">
            <div className="flex items-center gap-2 mt-3">
              {mensaje.empresas && (
                <Badge variant="outline" className="gap-1">
                  <Building2 className="w-3 h-3" />
                  {mensaje.empresas.razon_social}
                </Badge>
              )}
              <Badge variant={mensaje.leido ? 'secondary' : 'default'}>
                {mensaje.leido ? 'Leído' : 'Sin leer'}
              </Badge>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Sender/Recipient Info */}
          <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg">
            <Avatar className="w-12 h-12">
              <AvatarFallback className="bg-primary text-primary-foreground font-heading">
                {getInitials(
                  isRecipient
                    ? mensaje.remitente?.nombre_completo || 'U'
                    : mensaje.destinatario?.nombre_completo || 'U'
                )}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-heading font-semibold">
                  {isRecipient ? 'De:' : 'Para:'}
                </span>
                <span className="font-body">
                  {isRecipient
                    ? mensaje.remitente?.nombre_completo
                    : mensaje.destinatario?.nombre_completo}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground font-body">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {format(new Date(mensaje.created_at), 'dd/MM/yyyy HH:mm')}
                </span>
              </div>
            </div>
          </div>

          {/* Message Content */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="w-4 h-4" />
              <span className="font-heading text-sm font-medium">Mensaje</span>
            </div>
            <div className="p-4 bg-background border rounded-lg">
              <p className="font-body text-foreground whitespace-pre-wrap leading-relaxed">
                {mensaje.contenido}
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

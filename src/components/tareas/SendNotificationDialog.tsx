import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Bell, Send } from 'lucide-react';

interface SendNotificationDialogProps {
  tareaId?: string;
  consultorId?: string;
}

export default function SendNotificationDialog({ tareaId, consultorId }: SendNotificationDialogProps) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [notificationType, setNotificationType] = useState<'reminder' | 'assignment' | 'overdue'>('reminder');

  const handleSendNotification = async () => {
    try {
      setSending(true);
      
      const { data, error } = await supabase.functions.invoke('send-task-notifications', {
        body: {
          tareaId,
          consultorId,
          type: notificationType
        }
      });

      if (error) throw error;

      toast({
        title: "Notificación enviada",
        description: data?.message || "La notificación ha sido enviada exitosamente"
      });

      setOpen(false);
    } catch (err: any) {
      console.error('Error sending notification:', err);
      toast({
        title: "Error",
        description: err.message || "No se pudo enviar la notificación",
        variant: "destructive"
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Bell className="w-4 h-4 mr-2" />
          Enviar Notificación
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <Send className="w-5 h-5" />
            Enviar Notificación por Email
          </DialogTitle>
          <DialogDescription className="font-body">
            Envía un recordatorio por email al consultor asignado sobre {tareaId ? 'esta tarea' : 'sus tareas pendientes'}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-heading font-medium mb-2 block">
              Tipo de Notificación
            </label>
            <Select value={notificationType} onValueChange={(value: any) => setNotificationType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="reminder">🔔 Recordatorio - Tareas Pendientes</SelectItem>
                <SelectItem value="assignment">✅ Nueva Asignación - Tarea Asignada</SelectItem>
                <SelectItem value="overdue">⚠️ Urgente - Tareas Vencidas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm text-muted-foreground font-body">
              {notificationType === 'reminder' && 'Se enviará un recordatorio amigable sobre las tareas pendientes.'}
              {notificationType === 'assignment' && 'Se notificará sobre la nueva tarea asignada con todos los detalles.'}
              {notificationType === 'overdue' && 'Se enviará una notificación urgente sobre tareas que han vencido.'}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={sending}>
            Cancelar
          </Button>
          <Button onClick={handleSendNotification} disabled={sending}>
            {sending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Enviando...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Enviar Notificación
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

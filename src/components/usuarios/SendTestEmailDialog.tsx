import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Mail } from 'lucide-react';

interface SendTestEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  userEmail: string;
}

export default function SendTestEmailDialog({
  open,
  onOpenChange,
  userId,
  userName,
  userEmail,
}: SendTestEmailDialogProps) {
  const [loading, setLoading] = useState(false);
  const [subject, setSubject] = useState('Correo de Prueba');
  const [message, setMessage] = useState('Este es un mensaje de prueba del sistema.\n\nSi recibes este correo, la configuración de email está funcionando correctamente.');

  const handleSendEmail = async () => {
    if (!subject.trim() || !message.trim()) {
      toast.error('Por favor completa todos los campos');
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('No estás autenticado');
        return;
      }

      const { data, error } = await supabase.functions.invoke('send-test-email', {
        body: { 
          userId,
          subject: subject.trim(),
          message: message.trim()
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      
      if (data?.error) {
        throw new Error(data.error);
      }

      toast.success(`Correo de prueba enviado a ${userEmail} via SMTP Supabase`);
      onOpenChange(false);
      
      // Reset form
      setSubject('Correo de Prueba');
      setMessage('Este es un mensaje de prueba del sistema.\n\nSi recibes este correo, la configuración de email está funcionando correctamente.');
    } catch (error: any) {
      console.error('Error sending test email:', error);
      toast.error(error.message || 'Error al enviar correo de prueba');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" aria-describedby="send-test-email-description">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Enviar Correo de Prueba (SMTP Supabase)
          </DialogTitle>
          <DialogDescription id="send-test-email-description" className="font-body">
            Enviar un magic link de prueba a <strong>{userName}</strong> ({userEmail})
          </DialogDescription>
        </DialogHeader>

        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>ℹ️ Nota:</strong> Se enviará un magic link de prueba usando el SMTP configurado en Supabase. 
            Configura tu SMTP en: <a href="https://supabase.com/dashboard/project/svozqrjhwaohfmbkhpig/auth/providers" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-900">Auth Settings</a>.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject" className="font-heading">
              Asunto
            </Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Asunto del correo"
              className="font-body"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message" className="font-heading">
              Nota interna (no se envía en el email)
            </Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Nota sobre esta prueba de email..."
              rows={4}
              className="font-body resize-none"
              disabled
            />
            <p className="text-xs text-muted-foreground">
              El email enviado será un magic link estándar de Supabase. Este campo es solo informativo.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="font-heading"
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSendEmail}
            disabled={loading}
            className="gradient-primary font-heading"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Mail className="w-4 h-4 mr-2" />
                Enviar Correo
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { Send } from 'lucide-react';

interface CreateMensajeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMensajeCreated: () => void;
}

export function CreateMensajeDialog({ open, onOpenChange, onMensajeCreated }: CreateMensajeDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    destinatario_id: '',
    empresa_id: '',
    asunto: '',
    contenido: ''
  });

  useEffect(() => {
    if (open) {
      fetchUsuarios();
      fetchEmpresas();
    }
  }, [open]);

  const fetchUsuarios = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nombre_completo')
        .neq('id', user?.id)
        .order('nombre_completo');

      if (error) throw error;
      setUsuarios(data || []);
    } catch (error) {
      console.error('Error fetching usuarios:', error);
    }
  };

  const fetchEmpresas = async () => {
    try {
      const { data, error } = await supabase
        .from('empresas')
        .select('id, razon_social')
        .order('razon_social');

      if (error) throw error;
      setEmpresas(data || []);
    } catch (error) {
      console.error('Error fetching empresas:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.destinatario_id || !formData.asunto.trim() || !formData.contenido.trim()) {
      toast.error('Por favor completa todos los campos requeridos');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('mensajes')
        .insert({
          remitente_id: user?.id,
          destinatario_id: formData.destinatario_id,
          empresa_id: formData.empresa_id || null,
          asunto: formData.asunto.trim(),
          contenido: formData.contenido.trim()
        });

      if (error) throw error;

      toast.success('Mensaje enviado exitosamente');
      setFormData({
        destinatario_id: '',
        empresa_id: '',
        asunto: '',
        contenido: ''
      });
      onOpenChange(false);
      onMensajeCreated();
    } catch (error: any) {
      toast.error(error.message || 'Error al enviar mensaje');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="font-heading">Nuevo Mensaje</DialogTitle>
          <DialogDescription className="font-body">
            Envía un mensaje a otro usuario del sistema
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="destinatario" className="font-heading">Para *</Label>
              <Select
                value={formData.destinatario_id}
                onValueChange={(value) => setFormData({ ...formData, destinatario_id: value })}
              >
                <SelectTrigger className="font-body">
                  <SelectValue placeholder="Selecciona un destinatario" />
                </SelectTrigger>
                <SelectContent>
                  {usuarios.map((usuario) => (
                    <SelectItem key={usuario.id} value={usuario.id}>
                      {usuario.nombre_completo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="empresa" className="font-heading">Empresa (opcional)</Label>
              <Select
                value={formData.empresa_id}
                onValueChange={(value) => setFormData({ ...formData, empresa_id: value })}
              >
                <SelectTrigger className="font-body">
                  <SelectValue placeholder="Selecciona una empresa" />
                </SelectTrigger>
                <SelectContent>
                  {empresas.map((empresa) => (
                    <SelectItem key={empresa.id} value={empresa.id}>
                      {empresa.razon_social}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="asunto" className="font-heading">Asunto *</Label>
              <Input
                id="asunto"
                value={formData.asunto}
                onChange={(e) => setFormData({ ...formData, asunto: e.target.value })}
                placeholder="Asunto del mensaje"
                required
                maxLength={200}
                className="font-body"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contenido" className="font-heading">Mensaje *</Label>
              <Textarea
                id="contenido"
                value={formData.contenido}
                onChange={(e) => setFormData({ ...formData, contenido: e.target.value })}
                placeholder="Escribe tu mensaje aquí..."
                required
                maxLength={2000}
                rows={6}
                className="font-body"
              />
              <p className="text-xs text-muted-foreground font-body">
                {formData.contenido.length}/2000 caracteres
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="font-heading">
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="gradient-primary shadow-elegant font-heading"
            >
              <Send className="w-4 h-4 mr-2" />
              {loading ? 'Enviando...' : 'Enviar Mensaje'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

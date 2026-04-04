import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { MessageSquarePlus, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface SolicitudesServicioProps {
  empresaId: string;
}

export function SolicitudesServicio({ empresaId }: SolicitudesServicioProps) {
  const { user, role } = useAuth();
  const [solicitudes, setSolicitudes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    asunto: '',
    descripcion: '',
    prioridad: 'media'
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchSolicitudes();
  }, [empresaId]);

  const fetchSolicitudes = async () => {
    try {
      const query = supabase
        .from('solicitudes_servicio')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      setSolicitudes(data || []);
    } catch (error) {
      console.error('Error fetching solicitudes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.asunto || !formData.descripcion) {
      toast({
        title: 'Error',
        description: 'Por favor completa todos los campos requeridos',
        variant: 'destructive'
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('solicitudes_servicio')
        .insert({
          empresa_id: empresaId,
          solicitante_id: user?.id,
          asunto: formData.asunto,
          descripcion: formData.descripcion,
          prioridad: formData.prioridad,
          estado: 'pendiente'
        });

      if (error) throw error;

      toast({
        title: 'Éxito',
        description: 'Solicitud creada correctamente'
      });

      setDialogOpen(false);
      setFormData({
        asunto: '',
        descripcion: '',
        prioridad: 'media'
      });
      fetchSolicitudes();
    } catch (error: any) {
      console.error('Error creating solicitud:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo crear la solicitud',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case 'completada':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'en_proceso':
      case 'en_revision':
        return <Clock className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'completada':
        return 'success';
      case 'en_proceso':
        return 'primary';
      case 'en_revision':
        return 'warning';
      case 'cancelada':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getEstadoLabel = (estado: string) => {
    const labels: Record<string, string> = {
      pendiente: 'Pendiente',
      en_revision: 'En Revisión',
      en_proceso: 'En Proceso',
      completada: 'Completada',
      cancelada: 'Cancelada'
    };
    return labels[estado] || estado;
  };

  const getPrioridadColor = (prioridad: string) => {
    switch (prioridad) {
      case 'alta':
        return 'destructive';
      case 'media':
        return 'warning';
      case 'baja':
        return 'success';
      default:
        return 'secondary';
    }
  };

  if (loading) {
    return <div className="text-center py-8">Cargando solicitudes...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-heading font-semibold">Solicitudes de Servicio</h3>
          <p className="text-sm text-muted-foreground">Gestiona tus solicitudes de atención</p>
        </div>
        {role === 'cliente' && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <MessageSquarePlus className="w-4 h-4" />
                Nueva Solicitud
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nueva Solicitud de Servicio</DialogTitle>
                <DialogDescription>
                  Describe tu solicitud y nuestro equipo la atenderá a la brevedad
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="asunto">Asunto *</Label>
                  <Input
                    id="asunto"
                    value={formData.asunto}
                    onChange={(e) => setFormData({ ...formData, asunto: e.target.value })}
                    placeholder="Ej: Renovación de certificado"
                  />
                </div>

                <div>
                  <Label htmlFor="descripcion">Descripción *</Label>
                  <Textarea
                    id="descripcion"
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    placeholder="Describe tu solicitud en detalle..."
                    rows={5}
                  />
                </div>

                <div>
                  <Label htmlFor="prioridad">Prioridad</Label>
                  <Select
                    value={formData.prioridad}
                    onValueChange={(value) => setFormData({ ...formData, prioridad: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baja">Baja</SelectItem>
                      <SelectItem value="media">Media</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                    disabled={submitting}
                  >
                    Cancelar
                  </Button>
                  <Button onClick={handleSubmit} disabled={submitting}>
                    {submitting ? 'Enviando...' : 'Enviar Solicitud'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {solicitudes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquarePlus className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              No hay solicitudes registradas
            </p>
            {role === 'cliente' && (
              <p className="text-sm text-muted-foreground mt-2">
                Crea una solicitud para recibir atención de nuestro equipo
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {solicitudes.map((solicitud) => (
            <Card key={solicitud.id} className="hover:border-primary transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base">{solicitud.asunto}</CardTitle>
                    <CardDescription className="mt-1">
                      {format(new Date(solicitud.created_at), "dd 'de' MMMM, yyyy", { locale: es })}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getPrioridadColor(solicitud.prioridad) as any}>
                      {solicitud.prioridad}
                    </Badge>
                    <Badge variant={getEstadoColor(solicitud.estado) as any} className="gap-1">
                      {getEstadoIcon(solicitud.estado)}
                      {getEstadoLabel(solicitud.estado)}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">{solicitud.descripcion}</p>
                {solicitud.respuesta && (
                  <div className="mt-4 p-3 bg-muted rounded-lg">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Respuesta:</p>
                    <p className="text-sm">{solicitud.respuesta}</p>
                    {solicitud.fecha_respuesta && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {format(new Date(solicitud.fecha_respuesta), "dd/MM/yyyy HH:mm", { locale: es })}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
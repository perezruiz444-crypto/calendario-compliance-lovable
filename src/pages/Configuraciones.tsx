import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Loader2, Mail, Shield } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useNavigate } from 'react-router-dom';

interface NotificationSetting {
  id: string;
  notification_key: string;
  enabled: boolean;
  name: string;
  description: string | null;
  category: string;
}

const categoryIcons: Record<string, any> = {
  tareas: '📋',
  certificaciones: '🏆',
  documentos: '📄',
  solicitudes: '🔔',
  usuarios: '👥',
  mensajes: '💬',
  reportes: '📊'
};

const categoryNames: Record<string, string> = {
  tareas: 'Tareas',
  certificaciones: 'Certificaciones',
  documentos: 'Documentos',
  solicitudes: 'Solicitudes de Servicio',
  usuarios: 'Usuarios',
  mensajes: 'Mensajes',
  reportes: 'Reportes'
};

export default function Configuraciones() {
  const { role } = useAuth();
  const navigate = useNavigate();
  const [settings, setSettings] = useState<NotificationSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    // Verificar que solo admins puedan acceder
    if (role !== 'administrador') {
      navigate('/');
      return;
    }

    fetchSettings();
  }, [role, navigate]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('notification_settings')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      setSettings(data || []);
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Error al cargar configuraciones');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (id: string, currentValue: boolean) => {
    setUpdating(id);
    try {
      const { error } = await (supabase as any)
        .from('notification_settings')
        .update({ enabled: !currentValue })
        .eq('id', id);

      if (error) throw error;

      setSettings(prev =>
        prev.map(s => s.id === id ? { ...s, enabled: !currentValue } : s)
      );

      toast.success(!currentValue ? 'Notificación activada' : 'Notificación desactivada');
    } catch (error) {
      console.error('Error updating setting:', error);
      toast.error('Error al actualizar configuración');
    } finally {
      setUpdating(null);
    }
  };

  // Agrupar por categoría
  const groupedSettings = settings.reduce((acc, setting) => {
    if (!acc[setting.category]) {
      acc[setting.category] = [];
    }
    acc[setting.category].push(setting);
    return acc;
  }, {} as Record<string, NotificationSetting[]>);

  if (role !== 'administrador') {
    return null;
  }

  return (
    <DashboardLayout currentPage="configuraciones">
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Configuración de Notificaciones</h1>
            <p className="text-muted-foreground">
              Administra qué notificaciones automáticas por correo se envían
            </p>
          </div>
        </div>

        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-amber-600" />
              <CardTitle className="text-amber-900">Acceso Administrativo</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-amber-800">
              Solo los administradores pueden ver y modificar estas configuraciones. 
              Los cambios se aplican inmediatamente a todo el sistema.
            </p>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedSettings).map(([category, categorySettings]) => (
              <Card key={category}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-2xl">{categoryIcons[category]}</span>
                    {categoryNames[category] || category}
                  </CardTitle>
                  <CardDescription>
                    Notificaciones relacionadas con {categoryNames[category]?.toLowerCase() || category}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {categorySettings.map((setting, index) => (
                    <div key={setting.id}>
                      {index > 0 && <Separator className="my-4" />}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-1">
                          <Label htmlFor={setting.id} className="text-base font-medium cursor-pointer">
                            {setting.name}
                          </Label>
                          {setting.description && (
                            <p className="text-sm text-muted-foreground">
                              {setting.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {updating === setting.id && (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          )}
                          <Switch
                            id={setting.id}
                            checked={setting.enabled}
                            onCheckedChange={() => handleToggle(setting.id, setting.enabled)}
                            disabled={updating === setting.id}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

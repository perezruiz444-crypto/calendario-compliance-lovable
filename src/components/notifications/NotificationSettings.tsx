import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Bell, BellOff } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface NotificationPreference {
  id: string;
  notification_key: string;
  name: string;
  description: string;
  category: string;
  enabled: boolean;
}

export function NotificationSettings() {
  const { user } = useAuth();
  const { isSupported, permission, isSubscribed, requestPermission, unsubscribe } = usePushNotifications();
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadPreferences();
    }
  }, [user]);

  const loadPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .order('category', { ascending: true });

      if (error) throw error;
      setPreferences(data || []);
    } catch (error) {
      console.error('Error loading notification preferences:', error);
      toast.error('Error al cargar las preferencias');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePush = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await requestPermission();
    }
  };

  const handleTogglePreference = async (id: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('notification_settings')
        .update({ enabled })
        .eq('id', id);

      if (error) throw error;

      setPreferences(prev =>
        prev.map(p => p.id === id ? { ...p, enabled } : p)
      );
      
      toast.success('Preferencia actualizada');
    } catch (error) {
      console.error('Error updating preference:', error);
      toast.error('Error al actualizar preferencia');
    }
  };

  const groupedPreferences = preferences.reduce((acc, pref) => {
    if (!acc[pref.category]) {
      acc[pref.category] = [];
    }
    acc[pref.category].push(pref);
    return acc;
  }, {} as Record<string, NotificationPreference[]>);

  const categoryNames: Record<string, string> = {
    tareas: 'Tareas',
    mensajes: 'Mensajes',
    empresas: 'Empresas',
    solicitudes: 'Solicitudes',
    documentos: 'Documentos',
    sistema: 'Sistema'
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">Cargando preferencias...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notificaciones Push
          </CardTitle>
          <CardDescription>
            Recibe notificaciones en tiempo real en tu navegador
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isSupported && (
            <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
              Las notificaciones push no están disponibles en este navegador
            </div>
          )}
          
          {isSupported && (
            <>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="push-enabled" className="text-base">
                    Notificaciones del navegador
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {permission === 'granted' 
                      ? 'Activadas y funcionando' 
                      : permission === 'denied'
                      ? 'Bloqueadas por el navegador'
                      : 'No activadas'}
                  </p>
                </div>
                <Button
                  variant={isSubscribed ? 'outline' : 'default'}
                  onClick={handleTogglePush}
                  disabled={permission === 'denied'}
                  className="gap-2"
                >
                  {isSubscribed ? (
                    <>
                      <BellOff className="h-4 w-4" />
                      Desactivar
                    </>
                  ) : (
                    <>
                      <Bell className="h-4 w-4" />
                      Activar
                    </>
                  )}
                </Button>
              </div>

              {permission === 'denied' && (
                <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
                  Has bloqueado las notificaciones. Para activarlas, debes cambiar la configuración en tu navegador.
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preferencias de notificaciones</CardTitle>
          <CardDescription>
            Controla qué tipos de notificaciones quieres recibir
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {Object.entries(groupedPreferences).map(([category, prefs]) => (
            <div key={category} className="space-y-4">
              <h3 className="font-semibold text-sm">{categoryNames[category] || category}</h3>
              <div className="space-y-3">
                {prefs.map((pref) => (
                  <div key={pref.id} className="flex items-center justify-between">
                    <div className="space-y-0.5 flex-1">
                      <Label htmlFor={pref.id} className="text-sm font-normal">
                        {pref.name}
                      </Label>
                      {pref.description && (
                        <p className="text-xs text-muted-foreground">
                          {pref.description}
                        </p>
                      )}
                    </div>
                    <Switch
                      id={pref.id}
                      checked={pref.enabled}
                      onCheckedChange={(checked) => handleTogglePreference(pref.id, checked)}
                    />
                  </div>
                ))}
              </div>
              <Separator />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

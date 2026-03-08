import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, Mail, Shield, Palette, Bell, Settings, Clock, History, Paintbrush } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { UserNotificationPreferences } from '@/components/notifications/UserNotificationPreferences';
import { ReminderRulesManager } from '@/components/notifications/ReminderRulesManager';
import { NotificationHistory } from '@/components/notifications/NotificationHistory';
import ThemeEditor from '@/components/configuraciones/ThemeEditor';

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
  const [searchParams, setSearchParams] = useSearchParams();
  const { theme, setTheme } = useTheme();
  const { isSupported, permission, isSubscribed, requestPermission, unsubscribe } = usePushNotifications();
  const [settings, setSettings] = useState<NotificationSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const activeTab = searchParams.get('tab') || 'general';

  useEffect(() => {
    fetchSettings();
  }, []);

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

  const handleThemeChange = (checked: boolean) => {
    setTheme(checked ? 'dark' : 'light');
    toast.success(`Tema ${checked ? 'oscuro' : 'claro'} activado`);
  };

  const handleTogglePush = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await requestPermission();
    }
  };

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  // Agrupar por categoría
  const groupedSettings = settings.reduce((acc, setting) => {
    if (!acc[setting.category]) {
      acc[setting.category] = [];
    }
    acc[setting.category].push(setting);
    return acc;
  }, {} as Record<string, NotificationSetting[]>);

  const isAdmin = role === 'administrador';

  return (
    <DashboardLayout currentPage="/configuraciones">
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Settings className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Configuraciones</h1>
            <p className="text-muted-foreground">
              Personaliza tu experiencia y preferencias del sistema
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
            <TabsTrigger value="general" className="gap-2">
              <Palette className="h-4 w-4" />
              <span className="hidden sm:inline">General</span>
            </TabsTrigger>
            <TabsTrigger value="notificaciones" className="gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Mis Notificaciones</span>
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="recordatorios" className="gap-2">
                <Clock className="h-4 w-4" />
                <span className="hidden sm:inline">Recordatorios</span>
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger value="historial" className="gap-2">
                <History className="h-4 w-4" />
                <span className="hidden sm:inline">Historial</span>
              </TabsTrigger>
            )}
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Appearance Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    Apariencia
                  </CardTitle>
                  <CardDescription>
                    Personaliza cómo se ve la aplicación
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="dark-mode" className="text-base">
                        Modo oscuro
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Activa el tema oscuro para reducir el brillo
                      </p>
                    </div>
                    <Switch
                      id="dark-mode"
                      checked={theme === 'dark'}
                      onCheckedChange={handleThemeChange}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Push Notifications */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Notificaciones Push
                  </CardTitle>
                  <CardDescription>
                    Recibe alertas en tiempo real en tu navegador
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!isSupported ? (
                    <p className="text-sm text-muted-foreground">
                      Las notificaciones push no están disponibles en este navegador
                    </p>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="push-notifications" className="text-base">
                          Notificaciones del navegador
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {permission === 'granted' 
                            ? 'Activadas' 
                            : permission === 'denied'
                            ? 'Bloqueadas'
                            : 'No activadas'}
                        </p>
                      </div>
                      <Switch
                        id="push-notifications"
                        checked={isSubscribed}
                        onCheckedChange={handleTogglePush}
                        disabled={permission === 'denied'}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Admin-only: Global notification settings */}
            {isAdmin && (
              <>
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-primary" />
                      <CardTitle className="text-primary">Configuración Global (Administrador)</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Los cambios en esta sección afectan a todos los usuarios del sistema.
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
              </>
            )}
          </TabsContent>

          {/* My Notifications Tab */}
          <TabsContent value="notificaciones">
            <UserNotificationPreferences />
          </TabsContent>

          {/* Reminder Rules Tab (Admin only) */}
          {isAdmin && (
            <TabsContent value="recordatorios">
              <ReminderRulesManager />
            </TabsContent>
          )}

          {/* Notification History Tab (Admin only) */}
          {isAdmin && (
            <TabsContent value="historial">
              <NotificationHistory />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

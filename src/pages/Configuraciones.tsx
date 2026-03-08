import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Loader2, Shield, Palette, Bell, Settings, Clock, History, Paintbrush, Search, ChevronRight, User, Lock } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useSearchParams } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { UserNotificationPreferences } from '@/components/notifications/UserNotificationPreferences';
import { ReminderRulesManager } from '@/components/notifications/ReminderRulesManager';
import { NotificationHistory } from '@/components/notifications/NotificationHistory';
import ThemeEditor from '@/components/configuraciones/ThemeEditor';
import ColorPreviewMini from '@/components/configuraciones/ColorPreviewMini';
import ProfileSection from '@/components/configuraciones/ProfileSection';
import SecurityAuditSection from '@/components/configuraciones/SecurityAuditSection';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface NotificationSetting {
  id: string;
  notification_key: string;
  enabled: boolean;
  name: string;
  description: string | null;
  category: string;
}

const categoryIcons: Record<string, any> = {
  tareas: '📋', certificaciones: '🏆', documentos: '📄',
  solicitudes: '🔔', usuarios: '👥', mensajes: '💬', reportes: '📊'
};

const categoryNames: Record<string, string> = {
  tareas: 'Tareas', certificaciones: 'Certificaciones', documentos: 'Documentos',
  solicitudes: 'Solicitudes de Servicio', usuarios: 'Usuarios', mensajes: 'Mensajes', reportes: 'Reportes'
};

interface SectionItem {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

export default function Configuraciones() {
  const { role } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { theme, setTheme } = useTheme();
  const { isSupported, permission, isSubscribed, requestPermission, unsubscribe } = usePushNotifications();
  const [settings, setSettings] = useState<NotificationSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const isMobile = useIsMobile();

  const activeSection = searchParams.get('tab') || 'perfil';
  const isAdmin = role === 'administrador';

  const sections: SectionItem[] = [
    { id: 'perfil', label: 'Mi Perfil', description: 'Nombre, contacto y contraseña', icon: <User className="h-5 w-5" /> },
    { id: 'general', label: 'General', description: 'Apariencia y notificaciones push', icon: <Settings className="h-5 w-5" /> },
    { id: 'colores', label: 'Colores', description: 'Personaliza la paleta de colores', icon: <Paintbrush className="h-5 w-5" />, adminOnly: true },
    { id: 'notificaciones', label: 'Mis Notificaciones', description: 'Preferencias de alertas', icon: <Bell className="h-5 w-5" /> },
    { id: 'recordatorios', label: 'Recordatorios', description: 'Reglas de recordatorio automáticas', icon: <Clock className="h-5 w-5" />, adminOnly: true },
    { id: 'historial', label: 'Historial', description: 'Registro de notificaciones enviadas', icon: <History className="h-5 w-5" />, adminOnly: true },
    { id: 'seguridad', label: 'Seguridad', description: 'Auditoría y actividad del sistema', icon: <Lock className="h-5 w-5" />, adminOnly: true },
  ];

  const visibleSections = sections.filter(s => {
    if (s.adminOnly && !isAdmin) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return s.label.toLowerCase().includes(q) || s.description.toLowerCase().includes(q);
    }
    return true;
  });

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
      setSettings(prev => prev.map(s => s.id === id ? { ...s, enabled: !currentValue } : s));
      toast.success(!currentValue ? 'Notificación activada' : 'Notificación desactivada');
    } catch {
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
    if (isSubscribed) await unsubscribe();
    else await requestPermission();
  };

  const handleSectionChange = (id: string) => {
    setSearchParams({ tab: id });
  };

  const groupedSettings = settings.reduce((acc, setting) => {
    if (!acc[setting.category]) acc[setting.category] = [];
    acc[setting.category].push(setting);
    return acc;
  }, {} as Record<string, NotificationSetting[]>);

  const enabledCount = settings.filter(s => s.enabled).length;

  return (
    <DashboardLayout currentPage="/configuraciones">
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 animate-fade-in">
          <div className="p-2.5 bg-primary/10 rounded-xl">
            <Settings className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Configuraciones</h1>
            <p className="text-muted-foreground">
              Personaliza tu experiencia y preferencias del sistema
            </p>
          </div>
        </div>

        {/* Mobile nav */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide md:hidden">
          {visibleSections.map((section) => (
            <button
              key={section.id}
              onClick={() => handleSectionChange(section.id)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all shrink-0",
                activeSection === section.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {section.icon}
              {section.label}
            </button>
          ))}
        </div>

        {/* Two-column layout */}
        <div className="flex gap-6">
          {/* Sidebar */}
          <aside className="hidden md:block w-64 shrink-0">
            <div className="sticky top-6 space-y-3 animate-fade-in">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar sección..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-sm bg-muted/50 border-border/50"
                />
              </div>

              <nav className="space-y-1">
                {visibleSections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => handleSectionChange(section.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all group",
                      activeSection === section.id
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "hover:bg-muted text-foreground"
                    )}
                  >
                    <div className={cn(
                      "shrink-0 transition-colors",
                      activeSection === section.id ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                    )}>
                      {section.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{section.label}</span>
                        {section.adminOnly && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-primary/30 text-primary shrink-0">
                            Admin
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">{section.description}</p>
                    </div>
                    <ChevronRight className={cn(
                      "h-4 w-4 shrink-0 transition-all",
                      activeSection === section.id
                        ? "text-primary opacity-100"
                        : "text-muted-foreground/0 group-hover:text-muted-foreground/60"
                    )} />
                  </button>
                ))}
              </nav>

              {isAdmin && (
                <Card className="bg-muted/50 border-border/50">
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">Notificaciones globales</p>
                    <p className="text-lg font-bold text-foreground">{enabledCount} <span className="text-xs font-normal text-muted-foreground">/ {settings.length} activas</span></p>
                  </CardContent>
                </Card>
              )}
            </div>
          </aside>

          {/* Content area with transition */}
          <main className="flex-1 min-w-0">
            <div key={activeSection} className="animate-fade-in">
              {/* Profile */}
              {activeSection === 'perfil' && <ProfileSection />}

              {/* General */}
              {activeSection === 'general' && (
                <div className="space-y-6">
                  <div className="grid gap-4 lg:grid-cols-2">
                    <Card className="group hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/15 transition-colors">
                            <Palette className="h-4 w-4 text-primary" />
                          </div>
                          Apariencia
                        </CardTitle>
                        <CardDescription>Personaliza cómo se ve la aplicación</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label htmlFor="dark-mode" className="text-sm font-medium">Modo oscuro</Label>
                            <p className="text-xs text-muted-foreground">Activa el tema oscuro para reducir el brillo</p>
                          </div>
                          <Switch id="dark-mode" checked={theme === 'dark'} onCheckedChange={handleThemeChange} />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="group hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/15 transition-colors">
                            <Bell className="h-4 w-4 text-primary" />
                          </div>
                          Notificaciones Push
                        </CardTitle>
                        <CardDescription>Recibe alertas en tiempo real en tu navegador</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {!isSupported ? (
                          <p className="text-sm text-muted-foreground">Las notificaciones push no están disponibles en este navegador</p>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label htmlFor="push-notifications" className="text-sm font-medium">Notificaciones del navegador</Label>
                              <p className="text-xs text-muted-foreground">
                                {permission === 'granted' ? 'Activadas' : permission === 'denied' ? 'Bloqueadas' : 'No activadas'}
                              </p>
                            </div>
                            <Switch id="push-notifications" checked={isSubscribed} onCheckedChange={handleTogglePush} disabled={permission === 'denied'} />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {isAdmin && (
                    <>
                      <Card className="border-primary/20 bg-primary/5">
                        <CardHeader className="pb-3">
                          <div className="flex items-center gap-2">
                            <Shield className="h-5 w-5 text-primary" />
                            <CardTitle className="text-primary text-base">Configuración Global (Administrador)</CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground">Los cambios en esta sección afectan a todos los usuarios del sistema.</p>
                        </CardContent>
                      </Card>

                      {loading ? (
                        <div className="flex justify-center items-center py-12">
                          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {Object.entries(groupedSettings).map(([category, categorySettings]) => (
                            <Card key={category} className="hover:shadow-md transition-shadow">
                              <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-base">
                                  <span className="text-xl">{categoryIcons[category]}</span>
                                  {categoryNames[category] || category}
                                  <Badge variant="secondary" className="ml-auto text-[10px]">
                                    {categorySettings.filter(s => s.enabled).length}/{categorySettings.length}
                                  </Badge>
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-3">
                                {categorySettings.map((setting, index) => (
                                  <div key={setting.id}>
                                    {index > 0 && <Separator className="my-3" />}
                                    <div className="flex items-start justify-between gap-4">
                                      <div className="flex-1 space-y-0.5">
                                        <Label htmlFor={setting.id} className="text-sm font-medium cursor-pointer">{setting.name}</Label>
                                        {setting.description && <p className="text-xs text-muted-foreground">{setting.description}</p>}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {updating === setting.id && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                                        <Switch id={setting.id} checked={setting.enabled} onCheckedChange={() => handleToggle(setting.id, setting.enabled)} disabled={updating === setting.id} />
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
                </div>
              )}

              {/* Colors with live preview */}
              {activeSection === 'colores' && (
                <div className="space-y-6">
                  <ColorPreviewMini />
                  <ThemeEditor />
                </div>
              )}

              {/* My Notifications */}
              {activeSection === 'notificaciones' && <UserNotificationPreferences />}

              {/* Reminder Rules (Admin) */}
              {activeSection === 'recordatorios' && isAdmin && <ReminderRulesManager />}

              {/* Notification History (Admin) */}
              {activeSection === 'historial' && isAdmin && <NotificationHistory />}

              {/* Security & Audit (Admin) */}
              {activeSection === 'seguridad' && isAdmin && <SecurityAuditSection />}
            </div>
          </main>
        </div>
      </div>
    </DashboardLayout>
  );
}

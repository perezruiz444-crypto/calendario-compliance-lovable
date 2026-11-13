import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { CatalogoAdmin } from '@/components/configuraciones/CatalogoAdmin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, Shield, Bell, Settings, Clock, History, Search, ChevronRight, User, Lock, BookOpen } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useSearchParams } from 'react-router-dom';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { ReminderRulesManager } from '@/components/notifications/ReminderRulesManager';
import ProfileSection from '@/components/configuraciones/ProfileSection';
import SecurityAuditSection from '@/components/configuraciones/SecurityAuditSection';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

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
  const { isSupported, permission, isSubscribed, requestPermission, unsubscribe } = usePushNotifications();
  const [searchQuery, setSearchQuery] = useState('');
  const isMobile = useIsMobile();

  const activeSection = searchParams.get('tab') || 'perfil';
  const isAdmin = role === 'administrador';

  const sections: SectionItem[] = [
    { id: 'perfil', label: 'Mi Perfil', description: 'Nombre, contacto y contraseña', icon: <User className="h-5 w-5" /> },
    { id: 'general', label: 'General', description: 'Notificaciones push', icon: <Settings className="h-5 w-5" /> },
    { id: 'recordatorios', label: 'Recordatorios', description: 'Reglas de recordatorio automáticas', icon: <Clock className="h-5 w-5" />, adminOnly: true },
    { id: 'seguridad', label: 'Seguridad', description: 'Auditoría y actividad del sistema', icon: <Lock className="h-5 w-5" />, adminOnly: true },
    { id: 'catalogo', label: 'Catálogo', description: 'Catálogo maestro de obligaciones', icon: <BookOpen className="h-5 w-5" />, adminOnly: true },
  ];

  const visibleSections = sections.filter(s => {
    if (s.adminOnly && !isAdmin) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return s.label.toLowerCase().includes(q) || s.description.toLowerCase().includes(q);
    }
    return true;
  });

  const handleTogglePush = async () => {
    if (isSubscribed) await unsubscribe();
    else await requestPermission();
  };

  const handleSectionChange = (id: string) => {
    setSearchParams({ tab: id });
  };


  return (
    <DashboardLayout currentPage="/configuraciones">
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 animate-fade-in">
          <div className="p-2.5 bg-primary/10 rounded-xl">
            <Settings className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="h2">Configuraciones</h1>
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

                </div>
              )}

              {/* Reminder Rules (Admin) */}
              {activeSection === 'recordatorios' && isAdmin && <ReminderRulesManager />}

              {/* Security & Audit (Admin) */}
              {activeSection === 'seguridad' && isAdmin && <SecurityAuditSection />}

              {/* Catálogo de Obligaciones (Admin) */}
              {activeSection === 'catalogo' && isAdmin && <CatalogoAdmin />}
            </div>          </main>
        </div>
      </div>
    </DashboardLayout>
  );
}

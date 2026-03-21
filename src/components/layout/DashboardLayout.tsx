import { ReactNode, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useEmpresaContext } from '@/hooks/useEmpresaContext';
import { supabase } from '@/integrations/supabase/client';
import {
  Building2, LayoutDashboard, CheckSquare, Users, LogOut,
  Menu, Calendar as CalendarIcon, MessageSquare, FileText,
  Settings, ChevronRight,
} from 'lucide-react';
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';
import { GlobalSearch } from '@/components/search/GlobalSearch';
import { PushNotificationPrompt } from '@/components/notifications/PushNotificationPrompt';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { EmpresaSelectorDropdown } from '@/components/empresas/EmpresaSelectorDropdown';

interface DashboardLayoutProps {
  children: ReactNode;
  currentPage?: string;
}

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard',      path: '/dashboard',      roles: ['administrador', 'consultor', 'cliente'] },
  { icon: Building2,       label: 'Empresas',        path: '/empresas',       roles: ['administrador', 'consultor'] },
  { icon: Building2,       label: 'Mi Empresa',      path: '/mi-empresa',     roles: ['cliente'] },
  { icon: CheckSquare,     label: 'Tareas',          path: '/tareas',         roles: ['administrador', 'consultor', 'cliente'] },
  { icon: CalendarIcon,    label: 'Calendario',      path: '/calendario',     roles: ['administrador', 'consultor', 'cliente'] },
  { icon: MessageSquare,   label: 'Mensajes',        path: '/mensajes',       roles: ['administrador', 'consultor', 'cliente'] },
  { icon: FileText,        label: 'Reportes',        path: '/reportes',       roles: ['administrador', 'consultor'] },
  { icon: Users,           label: 'Usuarios',        path: '/usuarios',       roles: ['administrador'] },
  { icon: Settings,        label: 'Configuraciones', path: '/configuraciones', roles: ['administrador', 'consultor', 'cliente'] },
];

const roleLabel: Record<string, string> = {
  administrador: 'Administrador',
  consultor: 'Consultor',
  cliente: 'Cliente',
};

export default function DashboardLayout({ children, currentPage }: DashboardLayoutProps) {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const { selectedEmpresaId, setSelectedEmpresaId } = useEmpresaContext();
  const [empresaInfo, setEmpresaInfo] = useState<{ razon_social: string } | null>(null);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const fetch = async () => {
      if (!user) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('nombre_completo, empresa_id')
        .eq('id', user.id)
        .maybeSingle();
      if (profile?.nombre_completo) setUserName(profile.nombre_completo);
      if (role === 'cliente' && profile?.empresa_id) {
        const { data: empresa } = await supabase
          .from('empresas').select('razon_social').eq('id', profile.empresa_id).maybeSingle();
        setEmpresaInfo(empresa);
      }
    };
    fetch();
  }, [role, user, selectedEmpresaId]);

  const handleSignOut = async () => { await signOut(); navigate('/auth'); };

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const filteredNav = navItems.filter(item => role && item.roles.includes(role));

const SidebarContent = () => (
    <div className="flex flex-col h-full" style={{ background: 'hsl(var(--sidebar-background))' }}>

      {/* Brand header */}
      <div className="relative overflow-hidden px-5 pt-6 pb-5">
        {/* Decorative background */}
        <div className="absolute inset-0 opacity-[0.07]"
          style={{ background: 'radial-gradient(ellipse at top left, hsl(var(--primary)) 0%, transparent 70%)' }} />
        <div className="absolute top-0 left-0 w-1 h-full bg-primary" />

        <div className="flex items-center gap-3 mb-5 relative">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-lg shrink-0">
            <Building2 className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <p className="font-heading font-bold text-sm text-sidebar-foreground leading-tight">
              Calendario Compliance
            </p>
            <p className="text-[10px] text-sidebar-foreground/50 uppercase tracking-widest font-medium">
              Comercio Exterior
            </p>
          </div>
        </div>

        {/* Empresa selector */}
        {(role === 'consultor' || role === 'administrador') && (
          <EmpresaSelectorDropdown
            selectedEmpresaId={selectedEmpresaId}
            onEmpresaSelect={setSelectedEmpresaId}
          />
        )}
        {role === 'cliente' && empresaInfo && (
          <div className="px-3 py-2 rounded-lg bg-sidebar-accent/60 border border-sidebar-border/40">
            <p className="text-[10px] font-semibold text-sidebar-foreground/50 uppercase tracking-wide mb-0.5">Mi Empresa</p>
            <p className="text-sm font-semibold text-sidebar-foreground truncate">{empresaInfo.razon_social}</p>
          </div>
        )}
      </div>

      {/* Nav section label */}
      <div className="px-5 pb-1">
        <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-sidebar-foreground/35">Menú principal</p>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-1 space-y-0.5 overflow-y-auto">
        {filteredNav.map(item => {
          const Icon = item.icon;
          const isActive = currentPage === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group relative ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
              }`}
            >
              {/* Active indicator */}
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary-foreground/60 rounded-r-full" />
              )}
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-primary-foreground' : 'text-sidebar-foreground/50 group-hover:text-sidebar-foreground'}`} />
              <span className="flex-1 text-left">{item.label}</span>
              {isActive && <ChevronRight className="w-3 h-3 text-primary-foreground/60" />}
            </button>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="px-3 py-3 border-t border-sidebar-border/40 mt-auto">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-sidebar-accent/50 mb-2">
          <Avatar className="w-8 h-8 shrink-0">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
              {getInitials(userName || user?.email || 'U')}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-sidebar-foreground truncate">
              {userName || user?.email}
            </p>
            <p className="text-[10px] text-sidebar-foreground/50 capitalize">
              {roleLabel[role || ''] || role}
            </p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-sidebar-foreground/50 hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Cerrar sesión
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 border-r border-border/60 shadow-sm overflow-visible">
        <SidebarContent />
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur border-b border-border shadow-sm">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
              <Building2 className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-heading font-bold text-sm">Compliance</span>
          </div>
          <div className="flex items-center gap-2">
            <NotificationDropdown />
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64">
                <SidebarContent />
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      {/* Desktop topbar */}
      <div
        className="hidden lg:flex fixed top-0 right-0 z-40 h-14 items-center gap-3 px-6 border-b border-border/60 bg-background/95 backdrop-blur"
        style={{ left: '16rem' }}
      >
        <GlobalSearch />
        <div className="ml-auto flex items-center gap-2">
          <NotificationDropdown />
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-auto pt-14">
        <div className="container mx-auto p-6 max-w-7xl">
          {children}
        </div>
      </main>

      <PushNotificationPrompt />
    </div>
  );
}

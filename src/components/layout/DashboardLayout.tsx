import { ReactNode, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PageTransition } from './PageTransition';
import { useAuth } from '@/hooks/useAuth';
import { useEmpresaContext } from '@/hooks/useEmpresaContext';
import { supabase } from '@/integrations/supabase/client';
import {
  Building2, LayoutDashboard, CheckSquare, Users, LogOut,
  Menu, Calendar as CalendarIcon, FileText,
  Settings, ChevronRight, Eye, RefreshCw, Landmark,
  HelpCircle, PlayCircle,
} from 'lucide-react';
import { toast } from 'sonner';
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
  onReopenTour?: () => void;
}

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard',       path: '/dashboard',       roles: ['administrador', 'consultor', 'cliente'] },
  { icon: Building2,       label: 'Empresas',         path: '/empresas',        roles: ['administrador', 'consultor'] },
  { icon: Landmark,        label: 'Mi Empresa',       path: '/mi-empresa',      roles: ['cliente'] },
  { icon: CheckSquare,     label: 'Tareas',           path: '/tareas',          roles: ['administrador', 'consultor', 'cliente'] },
  { icon: CalendarIcon,    label: 'Calendario',       path: '/calendario',      roles: ['administrador', 'consultor', 'cliente'] },
  { icon: FileText,        label: 'Reportes',         path: '/reportes',        roles: ['administrador', 'consultor'] },
  { icon: Users,           label: 'Usuarios',         path: '/usuarios',        roles: ['administrador'] },
  { icon: HelpCircle,      label: 'Ayuda',            path: '/ayuda',           roles: ['administrador', 'consultor', 'cliente'] },
  { icon: Settings,        label: 'Configuraciones',  path: '/configuraciones', roles: ['administrador', 'consultor', 'cliente'] },
];

const roleLabel: Record<string, string> = {
  administrador: 'Administrador',
  consultor: 'Consultor',
  cliente: 'Cliente',
};

// ── SidebarContent como componente SEPARADO (fuera del padre) ──────────
// Esto es crítico: si se define adentro, React lo destruye y recrea en
// cada render, rompiendo el estado del Popover del selector de empresa.

interface SidebarProps {
  role: string | null;
  userName: string;
  userEmail: string;
  currentPage?: string;
  empresaInfo: { razon_social: string } | null;
  selectedEmpresaId: string | null;
  setSelectedEmpresaId: (id: string | null) => void;
  onNavigate: (path: string) => void;
  onSignOut: () => void;
  actualRole: string | null;
  simulatedRole: string | null;
  setSimulatedRole: (role: any) => void;
  onReopenTour?: () => void;
}

function SidebarContent({
  role, userName, userEmail, currentPage,
  empresaInfo, selectedEmpresaId, setSelectedEmpresaId,
  onNavigate, onSignOut,
  actualRole, simulatedRole, setSimulatedRole,
  onReopenTour,
}: SidebarProps) {
  const filteredNav = navItems.filter(item => role && item.roles.includes(role));
  const initials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="flex flex-col h-full" style={{ background: 'hsl(var(--sidebar-background))' }}>

      {/* Brand header */}
      <div className="relative px-5 pt-6 pb-5">
        <div className="absolute inset-0 opacity-[0.07]"
          style={{ background: 'radial-gradient(ellipse at top left, hsl(var(--primary)) 0%, transparent 70%)' }} />
        <div className="absolute top-0 left-0 w-1 h-full bg-primary" />

        <div className="flex items-center gap-3 mb-5 relative">
          <div className="w-9 h-9 rounded-xl gradient-hero flex items-center justify-center shadow-md shrink-0">
            <Building2 className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <p className="eyebrow text-[9px] mb-0.5">Compliance Suite</p>
            <p className="font-heading font-bold text-[15px] text-sidebar-foreground leading-tight tracking-tight">
              Calendario
            </p>
          </div>
        </div>

        {(role === 'consultor' || role === 'administrador') && (
          <EmpresaSelectorDropdown
            selectedEmpresaId={selectedEmpresaId}
            onEmpresaSelect={(id) => {
              setSelectedEmpresaId(id);
              if (id && id !== 'all') onNavigate(`/empresas/${id}`);
              else if (id === 'all') onNavigate('/empresas');
            }}
          />
        )}
        {role === 'cliente' && empresaInfo && (
          <div className="px-3 py-2 rounded-lg bg-sidebar-accent/60 border border-sidebar-border/40">
            <p className="text-[10px] font-semibold text-sidebar-foreground/50 uppercase tracking-wide mb-0.5">Mi Empresa</p>
            <p className="text-sm font-semibold text-sidebar-foreground truncate">{empresaInfo.razon_social}</p>
          </div>
        )}
      </div>

      {/* Nav label */}
      <div className="px-5 pb-1">
        <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-sidebar-foreground/35">Menú principal</p>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-1 space-y-0.5 overflow-y-auto min-h-[280px]">
        {filteredNav.length === 0 && [...Array(6)].map((_, i) => (
          <div key={i} className="h-9 rounded-lg bg-sidebar-accent/40 animate-pulse mx-0" />
        ))}
        {filteredNav.map((item, idx) => {
          const Icon = item.icon;
          const isActive = currentPage === item.path;
          return (
            <motion.button
              key={item.path}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.28, delay: 0.04 + idx * 0.035, ease: [0.4, 0, 0.2, 1] }}
              onClick={() => onNavigate(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group relative ${
                isActive
                  ? 'bg-primary/10 text-primary font-semibold shadow-[0_0_0_1px_hsl(var(--primary)/0.08)]'
                  : 'font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground hover:translate-x-0.5'
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="sidebar-active-indicator"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full"
                  style={{ background: 'var(--gradient-hero)' }}
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-primary' : 'text-sidebar-foreground/50 group-hover:text-sidebar-foreground'}`} />
              <span className="flex-1 text-left">{item.label}</span>
              {isActive && <ChevronRight className="w-3 h-3 text-primary/60" />}
            </motion.button>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="px-3 py-3 border-t border-sidebar-border/40 mt-auto">
        {actualRole === 'administrador' && !simulatedRole && (
          <button
            onClick={() => setSimulatedRole('cliente')}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 transition-all mb-3 shadow-[0_0_0_1px_hsl(var(--primary)/0.08)]"
          >
            <Eye className="w-3.5 h-3.5" />
            Ver como Cliente (Simular)
          </button>
        )}
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-sidebar-accent/50 mb-2">
          <Avatar className="w-8 h-8 shrink-0">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
              {initials(userName || userEmail || 'U')}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-sidebar-foreground truncate">
              {userName || userEmail}
            </p>
            <p className="text-[10px] text-sidebar-foreground/50 capitalize">
              {roleLabel[role || ''] || role}
            </p>
          </div>
        </div>
        {role === 'cliente' && onReopenTour && (
          <button
            onClick={onReopenTour}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors mb-1"
          >
            <PlayCircle className="w-3.5 h-3.5" />
            Ver tutorial
          </button>
        )}
        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-sidebar-foreground/50 hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}

// ── Layout principal ───────────────────────────────────────────────────

export default function DashboardLayout({ children, currentPage, onReopenTour }: DashboardLayoutProps) {
  const { user, role, signOut, actualRole, simulatedRole, setSimulatedRole } = useAuth();
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
  }, [role, user]);

  const handleSignOut = async () => { await signOut(); navigate('/auth'); };

  const location = useLocation();
  const todayLabel = new Date().toLocaleDateString('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  const sidebarProps: SidebarProps = {
    role,
    userName,
    userEmail: user?.email || '',
    currentPage,
    empresaInfo,
    selectedEmpresaId,
    setSelectedEmpresaId,
    onNavigate: navigate,
    onSignOut: handleSignOut,
    actualRole,
    simulatedRole,
    setSimulatedRole,
    onReopenTour,
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-border/60 shadow-sm">
        <SidebarContent {...sidebarProps} />
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
                <SidebarContent {...sidebarProps} />
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      {/* Desktop topbar */}
      <div
        className="hidden lg:flex fixed top-0 right-0 z-40 h-14 items-center gap-4 px-6 border-b border-border-subtle bg-background/80 backdrop-blur-xl"
        style={{ left: '16rem' }}
      >
        <div className="hidden lg:flex items-center gap-2 text-[11px]">
          <span className="live-dot" />
          <span className="eyebrow text-[10px] capitalize">{todayLabel}</span>
        </div>
        <div className="flex-1 max-w-[480px] mx-auto">
          <GlobalSearch />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <NotificationDropdown />
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-auto pt-14">
        {simulatedRole && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-amber-600 font-medium sticky top-0 z-50 backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <span>
                <strong>Modo Simulación Activo (Cliente):</strong> Estás explorando la plataforma exactamente como la vería un Cliente.
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => {
                  if (user) {
                    localStorage.removeItem(`compliance_onboarding_done_${user.id}`);
                    toast.success('Estado del onboarding restablecido.');
                    setTimeout(() => window.location.reload(), 800);
                  }
                }}
                className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/35 transition-colors font-bold uppercase tracking-wider text-[9px] flex items-center gap-1.5 text-amber-700"
              >
                <RefreshCw className="w-3 h-3 animate-spin-slow" /> Restablecer Onboarding
              </button>
              <button 
                onClick={() => setSimulatedRole(null)}
                className="px-2.5 py-1 rounded bg-amber-600 text-white hover:bg-amber-700 transition-colors font-bold uppercase tracking-wider text-[9px]"
              >
                Volver a Administrador
              </button>
            </div>
          </div>
        )}
        <div className="container mx-auto p-6 max-w-7xl">
          <AnimatePresence mode="wait">
            <PageTransition key={location.pathname}>
              {children}
            </PageTransition>
          </AnimatePresence>
        </div>
      </main>

      <PushNotificationPrompt />
    </div>
  );
}

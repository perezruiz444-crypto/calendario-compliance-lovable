import { ReactNode, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Building2, LayoutDashboard, CheckSquare, Users, LogOut, Menu, Calendar as CalendarIcon, MessageSquare, FileText, Settings } from 'lucide-react';
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';
import { GlobalSearch } from '@/components/search/GlobalSearch';
import { PushNotificationPrompt } from '@/components/notifications/PushNotificationPrompt';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { EmpresaSelectorDropdown } from '@/components/empresas/EmpresaSelectorDropdown';
interface DashboardLayoutProps {
  children: ReactNode;
  currentPage?: string;
}
export default function DashboardLayout({
  children,
  currentPage
}: DashboardLayoutProps) {
  const {
    user,
    role,
    signOut
  } = useAuth();
  const navigate = useNavigate();
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<string | null>(null);
  const [empresaInfo, setEmpresaInfo] = useState<{
    razon_social: string;
  } | null>(null);
  const [consultorEmpresaInfo, setConsultorEmpresaInfo] = useState<{
    razon_social: string;
  } | null>(null);

  // Fetch empresa info
  useEffect(() => {
    const fetchEmpresaInfo = async () => {
      if (role === 'cliente' && user) {
        const {
          data: profile
        } = await supabase.from('profiles').select('empresa_id').eq('id', user.id).maybeSingle();
        if (profile?.empresa_id) {
          const {
            data: empresa
          } = await supabase.from('empresas').select('razon_social').eq('id', profile.empresa_id).maybeSingle();
          setEmpresaInfo(empresa);
        }
      } else if ((role === 'consultor' || role === 'administrador') && selectedEmpresaId && selectedEmpresaId !== 'all') {
        const {
          data: empresa
        } = await supabase.from('empresas').select('razon_social').eq('id', selectedEmpresaId).maybeSingle();
        setConsultorEmpresaInfo(empresa);
      } else {
        setConsultorEmpresaInfo(null);
      }
    };
    fetchEmpresaInfo();
  }, [role, user, selectedEmpresaId]);
  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };
  const navItems = [{
    icon: LayoutDashboard,
    label: 'Dashboard',
    path: '/dashboard',
    roles: ['administrador', 'consultor', 'cliente']
  }, {
    icon: Building2,
    label: 'Empresas',
    path: '/empresas',
    roles: ['administrador', 'consultor']
  }, {
    icon: Building2,
    label: 'Mi Empresa',
    path: '/mi-empresa',
    roles: ['cliente']
  }, {
    icon: CheckSquare,
    label: 'Tareas',
    path: '/tareas',
    roles: ['administrador', 'consultor', 'cliente']
  }, {
    icon: CalendarIcon,
    label: 'Calendario',
    path: '/calendario',
    roles: ['administrador', 'consultor', 'cliente']
  }, {
    icon: MessageSquare,
    label: 'Mensajes',
    path: '/mensajes',
    roles: ['administrador', 'consultor', 'cliente']
  }, {
    icon: FileText,
    label: 'Reportes',
    path: '/reportes',
    roles: ['administrador', 'consultor']
  }, {
    icon: Users,
    label: 'Usuarios',
    path: '/usuarios',
    roles: ['administrador']
  }];
  const filteredNavItems = navItems.filter(item => role && item.roles.includes(role));
  const SidebarContent = () => <div className="flex flex-col h-full bg-sidebar overflow-hidden">
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-sidebar-primary rounded-xl flex items-center justify-center shadow-elegant">
            <Building2 className="w-6 h-6 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-sidebar-foreground">Calendario Compliance</h2>
            <p className="text-xs text-sidebar-foreground/60 font-body">{role || 'Usuario'}</p>
          </div>
        </div>
        
        {/* Empresa Selector for Consultores and Admins */}
        {(role === 'consultor' || role === 'administrador') && <div className="mt-4">
            <EmpresaSelectorDropdown selectedEmpresaId={selectedEmpresaId} onEmpresaSelect={setSelectedEmpresaId} />
          </div>}
        
        {/* Empresa Info for Clientes */}
        {role === 'cliente' && empresaInfo && <div className="mt-4 p-3 bg-sidebar-accent rounded-lg">
            <label className="text-xs font-heading font-medium text-sidebar-foreground/60 mb-1 block">
              Mi Empresa
            </label>
            <p className="text-sm font-body text-sidebar-foreground font-semibold truncate">
              {empresaInfo.razon_social}
            </p>
          </div>}
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {filteredNavItems.map(item => {
        const Icon = item.icon;
        const isActive = currentPage === item.path;
        return <Button key={item.path} variant={isActive ? "default" : "ghost"} className={`w-full justify-start gap-3 transition-smooth font-heading ${isActive ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-elegant' : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}`} onClick={() => navigate(item.path)}>
              <Icon className="w-5 h-5" />
              {item.label}
            </Button>;
      })}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-sidebar-accent">
          <Avatar className="w-10 h-10">
            <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground font-heading">
              {user?.email ? getInitials(user.email) : 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate font-heading">
              {user?.email}
            </p>
            <p className="text-xs text-sidebar-foreground/60 font-body capitalize">
              {role}
            </p>
          </div>
        </div>
        {role === 'administrador' && (
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-smooth font-heading mb-2" 
            onClick={() => navigate('/configuraciones')}
          >
            <Settings className="w-5 h-5" />
            Configuraciones
          </Button>
        )}
        <Button variant="ghost" className="w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-smooth font-heading" onClick={handleSignOut}>
          <LogOut className="w-5 h-5" />
          Cerrar Sesión
        </Button>
      </div>
    </div>;
  return <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-72 border-r border-border shadow-elegant">
        <SidebarContent />
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border shadow-md">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary-foreground" />
            </div>
            <h2 className="font-heading font-bold text-foreground">Calendario Compliance </h2>
          </div>
          <div className="flex items-center gap-2">
            <NotificationDropdown />
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="w-6 h-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72">
                <SidebarContent />
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      {/* Desktop Header with Search and Notifications */}
      <div className="hidden lg:flex fixed top-0 right-0 z-40 p-4 gap-3 items-center" style={{
      left: '18rem'
    }}>
        <GlobalSearch />
        <NotificationDropdown />
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-auto lg:pt-16 pt-16">
        <div className="container mx-auto p-6 max-w-7xl">
          {children}
        </div>
      </main>
      
      <PushNotificationPrompt />
    </div>;
}
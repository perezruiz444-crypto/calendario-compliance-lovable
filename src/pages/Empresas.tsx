import { logger } from '@/lib/logger';
import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Building2, Copy, Trash2, MoreHorizontal, Search, Users, Eye, CheckSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import OnboardingEmpresaWizard from '@/components/empresas/OnboardingEmpresaWizard';
import ManageConsultoresDialog from '@/components/empresas/ManageConsultoresDialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function Empresas() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [loadingEmpresas, setLoadingEmpresas] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [consultoresDialogOpen, setConsultoresDialogOpen] = useState(false);
  const [selectedEmpresa, setSelectedEmpresa] = useState<{ id: string; nombre: string } | null>(null);
  const [deleteEmpresaId, setDeleteEmpresaId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [taskCounts, setTaskCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
    if (!loading && role && !['administrador', 'consultor'].includes(role)) navigate('/dashboard');
  }, [user, role, loading, navigate]);

  const fetchEmpresas = async () => {
    setLoadingEmpresas(true);
    try {
      const { data, error } = await supabase
        .from('empresas')
        .select('id, razon_social, rfc, immex_numero, prosec_numero, cert_iva_ieps_oficio, padron_general_numero, domicilio_fiscal, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setEmpresas(data || []);

      // Fetch pending task counts per empresa
      if (data && data.length > 0) {
        const { data: tareasData } = await supabase
          .from('tareas')
          .select('empresa_id')
          .in('estado', ['pendiente', 'en_progreso']);
        if (tareasData) {
          const counts: Record<string, number> = {};
          tareasData.forEach(t => {
            counts[t.empresa_id] = (counts[t.empresa_id] || 0) + 1;
          });
          setTaskCounts(counts);
        }
      }
    } catch (error) {
      logger.error('Error fetching empresas:', error);
    } finally {
      setLoadingEmpresas(false);
    }
  };

  const handleDuplicateEmpresa = async (empresaId: string) => {
    try {
      const { data: original, error: fetchError } = await supabase
        .from('empresas').select('*').eq('id', empresaId).maybeSingle();
      if (fetchError || !original) throw fetchError || new Error('Empresa no encontrada');

      const { id: _id, created_at: _ca, updated_at: _ua, ...empresaData } = original;
      const copySuffix = ` (Copia ${Date.now().toString().slice(-4)})`;
      const { data: newEmpresa, error: insertError } = await supabase
        .from('empresas')
        .insert({
          ...empresaData,
          razon_social: `${empresaData.razon_social}${copySuffix}`,
          rfc: empresaData.rfc.slice(0, 10) + 'C' + Math.floor(Math.random() * 100).toString().padStart(2, '0'),
          created_by: user?.id
        })
        .select().single();
      if (insertError) throw insertError;

      toast.success('Empresa duplicada exitosamente');
      fetchEmpresas();
      navigate(`/empresas/${newEmpresa.id}`);
    } catch (error: any) {
      toast.error(error.message || 'Error al duplicar empresa');
    }
  };

  const handleDeleteEmpresa = async () => {
    if (!deleteEmpresaId) return;
    try {
      // First delete obligacion_cumplimientos (depends on obligaciones)
      const { data: obligs } = await supabase.from('obligaciones').select('id').eq('empresa_id', deleteEmpresaId);
      if (obligs && obligs.length > 0) {
        const obligIds = obligs.map(o => o.id);
        await supabase.from('obligacion_cumplimientos').delete().in('obligacion_id', obligIds);
      }

      await Promise.all([
        supabase.from('obligaciones').delete().eq('empresa_id', deleteEmpresaId),
        supabase.from('tareas').delete().eq('empresa_id', deleteEmpresaId),
        supabase.from('agentes_aduanales').delete().eq('empresa_id', deleteEmpresaId),
        supabase.from('consultor_empresa_asignacion').delete().eq('empresa_id', deleteEmpresaId),
        supabase.from('documentos').delete().eq('empresa_id', deleteEmpresaId),
        supabase.from('apoderados_legales').delete().eq('empresa_id', deleteEmpresaId),
        supabase.from('domicilios_operacion').delete().eq('empresa_id', deleteEmpresaId),
        supabase.from('miembros_socios').delete().eq('empresa_id', deleteEmpresaId),
        supabase.from('solicitudes_servicio').delete().eq('empresa_id', deleteEmpresaId),
        supabase.from('client_invitations').delete().eq('empresa_id', deleteEmpresaId),
      ]);
      const { error } = await supabase.from('empresas').delete().eq('id', deleteEmpresaId);
      if (error) throw error;
      toast.success('Empresa eliminada exitosamente');
      setDeleteEmpresaId(null);
      fetchEmpresas();
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar empresa');
    }
  };

  useEffect(() => { if (user && role) fetchEmpresas(); }, [user, role]);

  const filtered = useMemo(() => {
    if (!search) return empresas;
    const s = search.toLowerCase();
    return empresas.filter(e =>
      e.razon_social?.toLowerCase().includes(s) || e.rfc?.toLowerCase().includes(s)
    );
  }, [empresas, search]);

  const getStatusBadges = (empresa: any) => {
    const badges: { label: string; variant: 'default' | 'secondary' | 'outline' }[] = [];
    if (empresa.immex_numero) badges.push({ label: 'IMMEX', variant: 'default' });
    if (empresa.prosec_numero) badges.push({ label: 'PROSEC', variant: 'secondary' });
    if (empresa.cert_iva_ieps_oficio) badges.push({ label: 'Cert. IVA/IEPS', variant: 'secondary' });
    if (empresa.padron_general_numero) badges.push({ label: 'Padrón', variant: 'outline' });
    return badges;
  };

  if (loadingEmpresas) {
    return (
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-[0.625rem] border bg-card p-5 space-y-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout currentPage="/empresas">
      <div className="space-y-8">
        <PageHeader
          eyebrow="Cartera · Empresas registradas"
          title="Gestión de Empresas"
          description="Administra empresas, sus datos fiscales y certificaciones de comercio exterior."
          actions={
            <Button onClick={() => setDialogOpen(true)} size="sm" className="gap-1.5 shadow-editorial">
              <Plus className="w-4 h-4" /> Nueva Empresa
            </Button>
          }
        />

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por razón social o RFC..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-card border-border-subtle"
            />
          </div>
          <p className="eyebrow text-[10px]">
            {filtered.length} <span className="text-muted-foreground/60">de</span> {empresas.length} empresa{empresas.length === 1 ? '' : 's'}
          </p>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={Building2}
            eyebrow={search ? 'Sin resultados' : 'Cartera vacía'}
            title={search ? 'No se encontraron empresas' : 'Aún no hay empresas registradas'}
            description={search ? 'Prueba con otro criterio de búsqueda.' : 'Comienza registrando la primera empresa de tu cartera.'}
            action={!search ? (
              <Button onClick={() => setDialogOpen(true)} size="sm" className="gap-1.5 shadow-editorial">
                <Plus className="w-4 h-4" /> Registrar primera empresa
              </Button>
            ) : undefined}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((empresa, idx) => {
              const badges = getStatusBadges(empresa);
              return (
                <motion.div
                  key={empresa.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: Math.min(idx * 0.03, 0.3), ease: [0.4, 0, 0.2, 1] }}
                  onClick={() => navigate(`/empresas/${empresa.id}`)}
                  className="card-editorial card-accent-left p-5 cursor-pointer group hover-lift"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0 flex-1">
                      <p className="eyebrow text-[10px] mb-1.5">RFC · <span className="font-mono normal-case tracking-normal text-foreground/70">{empresa.rfc}</span></p>
                      <h3 className="font-heading font-bold text-base text-foreground leading-tight truncate">
                        {empresa.razon_social}
                      </h3>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button aria-label="Más opciones" variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem onClick={() => navigate(`/empresas/${empresa.id}`)}>
                          <Eye className="w-4 h-4 mr-2" />Ver Detalles
                        </DropdownMenuItem>
                        {role === 'administrador' && (
                          <DropdownMenuItem onClick={() => {
                            setSelectedEmpresa({ id: empresa.id, nombre: empresa.razon_social });
                            setConsultoresDialogOpen(true);
                          }}>
                            <Users className="w-4 h-4 mr-2" />Consultores
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handleDuplicateEmpresa(empresa.id)}>
                          <Copy className="w-4 h-4 mr-2" />Duplicar
                        </DropdownMenuItem>
                        {role === 'administrador' && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => setDeleteEmpresaId(empresa.id)}>
                              <Trash2 className="w-4 h-4 mr-2" />Eliminar
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap mb-3">
                    {badges.map((b, i) => (
                      <Badge key={i} variant={b.variant} className="text-[10px] font-mono uppercase tracking-wider">{b.label}</Badge>
                    ))}
                    {taskCounts[empresa.id] > 0 && (
                      <Badge variant="outline" className="text-[10px] gap-1 border-warning/40 text-warning">
                        <CheckSquare className="w-3 h-3" />
                        {taskCounts[empresa.id]} pendiente{taskCounts[empresa.id] > 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>

                  {empresa.domicilio_fiscal && (
                    <p className="text-xs text-muted-foreground line-clamp-1 leading-relaxed">{empresa.domicilio_fiscal}</p>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <OnboardingEmpresaWizard
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onEmpresaCreated={(empresaId) => {
          fetchEmpresas();
          if (empresaId) navigate(`/empresas/${empresaId}`);
        }}
      />

      {selectedEmpresa && (
        <ManageConsultoresDialog
          open={consultoresDialogOpen}
          onOpenChange={setConsultoresDialogOpen}
          empresaId={selectedEmpresa.id}
          empresaNombre={selectedEmpresa.nombre}
        />
      )}

      <AlertDialog open={!!deleteEmpresaId} onOpenChange={(v) => !v && setDeleteEmpresaId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar empresa?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminarán todos los datos relacionados. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEmpresa} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar Empresa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}

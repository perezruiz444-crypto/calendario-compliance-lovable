import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Plus, Building2, Copy, Trash2, MoreHorizontal, Search, Users, Eye, CheckSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import QuickCreateEmpresa from '@/components/empresas/QuickCreateEmpresa';
import ManageConsultoresDialog from '@/components/empresas/ManageConsultoresDialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
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
        .select('*')
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
      console.error('Error fetching empresas:', error);
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

  useEffect(() => { if (user) fetchEmpresas(); }, [user]);

  const filtered = empresas.filter(e =>
    !search || e.razon_social?.toLowerCase().includes(search.toLowerCase()) || e.rfc?.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadges = (empresa: any) => {
    const badges: { label: string; variant: 'default' | 'secondary' | 'outline' }[] = [];
    if (empresa.immex_numero) badges.push({ label: 'IMMEX', variant: 'default' });
    if (empresa.prosec_numero) badges.push({ label: 'PROSEC', variant: 'secondary' });
    if (empresa.cert_iva_ieps_oficio) badges.push({ label: 'Cert. IVA/IEPS', variant: 'secondary' });
    if (empresa.padron_general_numero) badges.push({ label: 'Padrón', variant: 'outline' });
    return badges;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <DashboardLayout currentPage="/empresas">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground mb-2">Gestión de Empresas</h1>
            <p className="text-muted-foreground font-body">Administra las empresas y sus datos fiscales</p>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="gradient-primary shadow-elegant hover:shadow-lg transition-smooth font-heading">
            <Plus className="w-4 h-4 mr-2" />
            Nueva Empresa
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por razón social o RFC..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Card className="gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="font-heading">Empresas Registradas</CardTitle>
            <CardDescription className="font-body">
              {filtered.length} de {empresas.length} empresa(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingEmpresas ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                  <Building2 className="w-10 h-10 text-primary" />
                </div>
                <p className="text-muted-foreground font-body mb-4">
                  {search ? 'No se encontraron empresas' : 'No hay empresas registradas todavía'}
                </p>
                {!search && (
                  <Button onClick={() => setDialogOpen(true)} className="gradient-primary shadow-elegant font-heading">
                    <Plus className="w-4 h-4 mr-2" />
                    Registrar Primera Empresa
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid gap-3">
                {filtered.map((empresa) => {
                  const badges = getStatusBadges(empresa);
                  return (
                    <div
                      key={empresa.id}
                      className="border rounded-lg p-4 hover:border-primary/50 transition-all cursor-pointer group"
                      onClick={() => navigate(`/empresas/${empresa.id}`)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <h3 className="font-heading font-semibold text-lg truncate">{empresa.razon_social}</h3>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="font-mono text-xs">{empresa.rfc}</Badge>
                            {badges.map((b, i) => (
                              <Badge key={i} variant={b.variant} className="text-xs">{b.label}</Badge>
                            ))}
                          </div>
                          {empresa.domicilio_fiscal && (
                            <p className="text-sm text-muted-foreground font-body truncate">{empresa.domicilio_fiscal}</p>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
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
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <QuickCreateEmpresa
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

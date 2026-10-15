import { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, Building2, RefreshCw } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { ConnectedObligacionesOverview } from '@/components/obligaciones/ConnectedObligacionesOverview';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useEmpresaContext } from '@/hooks/useEmpresaContext';
import { supabase } from '@/integrations/supabase/client';
import { obligationsV2Enabled } from '@/lib/obligationFeature';

export default function Pendientes() {
  const { user, role, loading } = useAuth();
  const { selectedEmpresaId } = useEmpresaContext();
  const navigate = useNavigate();
  const profile = useQuery({ queryKey: ['pendientes-company', user?.id], enabled: !!user && role === 'cliente' && obligationsV2Enabled, retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('empresa_id').eq('id', user!.id).maybeSingle();
      if (error) throw error;
      return data?.empresa_id ?? null;
    },
  });
  useEffect(() => { if (!loading && !user) navigate('/auth'); }, [loading,user,navigate]);
  if (!obligationsV2Enabled) return <Navigate to="/dashboard" replace />;
  if (loading || !user) return <p role="status" className="p-8">Cargando acceso…</p>;
  const empresaId = role === 'cliente' ? profile.data : selectedEmpresaId !== 'all' ? selectedEmpresaId : null;
  return <DashboardLayout currentPage="/pendientes">
    <div className="max-w-5xl mx-auto space-y-5">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"><div><h1 className="font-heading text-3xl font-semibold normal-case">Pendientes</h1><p className="text-sm text-muted-foreground mt-1">Qué necesita atención, quién lo atiende y qué falta.</p></div><Button variant="outline" onClick={() => navigate('/calendario')}><CalendarDays className="h-4 w-4 mr-2" />Ver calendario</Button></header>
      {!role ? <p role="alert" className="text-sm">Tu cuenta necesita un rol asignado. Contacta al administrador.</p> : role === 'cliente' && profile.isPending ? <p role="status" className="text-sm">Buscando tu empresa…</p> : profile.isError && role === 'cliente' ? <div role="alert" className="border rounded-lg p-6 space-y-3"><p>No pudimos cargar tu empresa.</p><Button variant="outline" onClick={() => void profile.refetch()}><RefreshCw className="h-4 w-4 mr-2" />Reintentar</Button></div> : empresaId ? <ConnectedObligacionesOverview key={`${user.id}:${empresaId}`} empresaId={empresaId} /> : <div className="border rounded-lg p-6 space-y-2"><Building2 className="h-6 w-6 text-muted-foreground" /><h2 className="text-lg font-medium">{role === 'cliente' ? 'Tu empresa todavía no está asignada' : 'Selecciona una empresa'}</h2><p className="text-sm text-muted-foreground">{role === 'cliente' ? 'Contacta a tu consultor para vincular tu cuenta y consultar tus pendientes.' : 'Usa el selector de empresa para revisar sus obligaciones.'}</p></div>}
    </div>
  </DashboardLayout>;
}

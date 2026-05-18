import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DashboardCalendar from '@/components/dashboard/DashboardCalendar';
import { useEmpresaContext } from '@/hooks/useEmpresaContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Building2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';

export default function Calendario() {
  const { user, role, loading } = useAuth();
  const { selectedEmpresaId, setSelectedEmpresaId } = useEmpresaContext();
  const navigate = useNavigate();
  const [empresas, setEmpresas] = useState<{ id: string; razon_social: string }[]>([]);

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  useEffect(() => {
    if (role === 'cliente') return; // clientes no eligen empresa
    supabase
      .from('empresas')
      .select('id, razon_social')
      .order('razon_social')
      .then(({ data }) => setEmpresas(data || []));
  }, [role]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const showEmpresaSelector = role !== 'cliente';

  return (
    <DashboardLayout currentPage="/calendario">
      <div className="space-y-6">
        <PageHeader
          eyebrow="Agenda · Vencimientos"
          title="Calendario de Cumplimiento"
          description="Obligaciones, tareas y documentos en una sola línea de tiempo. Filtra por empresa o tipo de evento para enfocar lo que importa."
          actions={
            showEmpresaSelector ? (
              <div className="flex items-center gap-2 bg-card border border-border-subtle rounded-xl px-3 py-1.5 shadow-elegant">
                <Building2 className="w-3.5 h-3.5 text-primary" />
                <Select
                  value={selectedEmpresaId ?? 'all'}
                  onValueChange={(v) => setSelectedEmpresaId(v === 'all' ? null : v)}
                >
                  <SelectTrigger className="w-[240px] border-0 shadow-none p-0 h-auto font-mono text-xs uppercase tracking-wider focus:ring-0">
                    <SelectValue placeholder="Todas las empresas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las empresas</SelectItem>
                    {empresas.map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.razon_social}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : undefined
          }
        />

        <DashboardCalendar
          height="700px"
          filterEmpresaId={selectedEmpresaId}
          onEventClick={(event) => {
            if (event.resource.type === 'tarea') {
              navigate('/tareas');
            } else if (event.resource.type === 'documento') {
              navigate(`/empresas/${event.resource.data.empresa_id}`);
            } else if (event.resource.type === 'programa') {
              navigate(`/empresas/${event.resource.data.empresa.id}`);
            }
          }}
        />
      </div>
    </DashboardLayout>
  );
}

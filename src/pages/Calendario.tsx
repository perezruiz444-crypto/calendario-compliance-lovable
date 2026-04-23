import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DashboardCalendar from '@/components/dashboard/DashboardCalendar';
import { useEmpresaContext } from '@/hooks/useEmpresaContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Building2 } from 'lucide-react';

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
        {/* Header con selector de empresa */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground mb-2">
              Calendario de Vencimientos
            </h1>
            <p className="text-muted-foreground font-body">
              Filtra por empresa o por tipo de evento para ver solo lo que importa.
            </p>
          </div>

          {showEmpresaSelector && (
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <Select
                value={selectedEmpresaId ?? 'all'}
                onValueChange={(v) => setSelectedEmpresaId(v === 'all' ? null : v)}
              >
                <SelectTrigger className="w-[260px]">
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
          )}
        </div>

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

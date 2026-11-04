import { buildCalendarIcs, type CalendarExportItem } from '@/lib/calendarIcs';
import { obligationOverviewClient } from '@/hooks/useObligationOverview';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { lazy, Suspense, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DashboardCalendar from '@/components/dashboard/DashboardCalendar';
import { useEmpresaContext } from '@/hooks/useEmpresaContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Building2, Download } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
const TareaDetailSheet = lazy(() => import('@/components/tareas/TareaDetailSheet'));
const DocumentoDetailSheet = lazy(() => import('@/components/documentos/DocumentoDetailSheet'));

export default function Calendario() {
  const { user, role, loading } = useAuth();
  const { selectedEmpresaId, setSelectedEmpresaId } = useEmpresaContext();
  const navigate = useNavigate();
  const [empresas, setEmpresas] = useState<{ id: string; razon_social: string }[]>([]);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

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

  const [exportItems, setExportItems] = useState<CalendarExportItem[] | null>(null);
  const [exporting, setExporting] = useState(false);
  const exportCalendar = async () => {
    if (!exportItems?.length || exporting) return;
    setExporting(true);
    try {
      const { data, error } = await obligationOverviewClient.rpc('dias_recordatorio_calendario',
        selectedEmpresaId && selectedEmpresaId !== 'all' ? { p_empresa_id: selectedEmpresaId } : {});
      if (error) throw error;
      const ics = buildCalendarIcs(exportItems, data ?? []);
      const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'obligaciones-pendientes.ics';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      toast.error('No pudimos exportar el calendario con sus recordatorios. Intenta de nuevo.');
    } finally { setExporting(false); }
  };

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
          description="Revisa tus vencimientos y registra entregas sin salir del calendario."
          actions={
            <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => void exportCalendar()} disabled={exporting || !exportItems?.length} title="Descargar obligaciones pendientes de la vista actual con sus recordatorios">
              <Download className="w-3.5 h-3.5 mr-1.5" />{exporting ? 'Exportando…' : 'Descargar .ics'}
            </Button>
            {showEmpresaSelector ? (
              <div className="flex items-center gap-2 bg-card border border-border-subtle rounded-xl px-3 py-1.5 shadow-elegant">
                <Building2 className="w-3.5 h-3.5 text-primary" />
                <Select
                  value={selectedEmpresaId ?? 'all'}
                  onValueChange={(v) => setSelectedEmpresaId(v)}
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
            ) : null}
            </div>
          }
        />

        <DashboardCalendar
          height="700px"
          refreshKey={refreshKey}
          onExportItemsChange={setExportItems}
          filterEmpresaId={selectedEmpresaId}
          onEventClick={(event) => {
            const { type, data } = event.resource;
            if (type === 'tarea') {
              setTaskId(event.resource.rawId ?? data?.id ?? null);
            } else if (type === 'documento' && data) {
              setDocumentId(data.id);
            }
          }}
        />
        <Suspense fallback={<p role="status">Cargando detalle…</p>}>
          {taskId && <TareaDetailSheet tareaId={taskId} open onOpenChange={open => { if (!open) setTaskId(null); }} onUpdate={() => setRefreshKey(value => value + 1)} />}
          {documentId && <DocumentoDetailSheet id={documentId} onClose={() => setDocumentId(null)} />}
        </Suspense>
      </div>
    </DashboardLayout>
  );
}

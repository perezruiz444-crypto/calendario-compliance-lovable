import { useEffect, useState, useMemo } from 'react';
import { Building2, Globe } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEmpresaContext } from '@/hooks/useEmpresaContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface EmpresaSelectorProps {
  onEmpresaSelect?: (empresaId: string | null) => void;
  selectedEmpresaId?: string | null;
}

function hashColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return `${Math.abs(hash) % 360} 45% 45%`;
}

function getInitials(name: string): string {
  return name.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export function EmpresaSelectorDropdown({
  onEmpresaSelect: externalOnSelect,
  selectedEmpresaId: externalSelectedId,
}: EmpresaSelectorProps) {
  const { user, role } = useAuth();
  const empresaContext = useEmpresaContext();

  const selectedEmpresaId = externalSelectedId ?? empresaContext.selectedEmpresaId;
  const onEmpresaSelect   = externalOnSelect   ?? empresaContext.setSelectedEmpresaId;

  const [empresas, setEmpresas] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (user && role) fetchEmpresas();
  }, [user, role]);

  const fetchEmpresas = async () => {
    setLoading(true);
    try {
      let data: any[] = [];
      if (role === 'administrador') {
        const { data: d } = await supabase
          .from('empresas').select('id, razon_social').order('razon_social');
        data = d || [];
      } else {
        const { data: asig } = await supabase
          .from('consultor_empresa_asignacion')
          .select('empresa_id')
          .eq('consultor_id', user?.id);
        const ids = asig?.map(a => a.empresa_id) || [];
        if (ids.length > 0) {
          const { data: d } = await supabase
            .from('empresas').select('id, razon_social').in('id', ids).order('razon_social');
          data = d || [];
        }
      }
      setEmpresas(data);
      if (!selectedEmpresaId && data.length > 0) onEmpresaSelect(data[0].id);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const selectedEmpresa = empresas.find(e => e.id === selectedEmpresaId);
  const isAll = selectedEmpresaId === 'all';

  if (loading) {
    return (
      <div className="flex items-center gap-3 p-2 rounded-lg bg-sidebar-accent/50 animate-pulse">
        <div className="w-9 h-9 rounded-lg bg-sidebar-foreground/10" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 w-24 rounded bg-sidebar-foreground/10" />
          <div className="h-2.5 w-16 rounded bg-sidebar-foreground/10" />
        </div>
      </div>
    );
  }

  if (empresas.length === 0) {
    return (
      <div className="flex items-center gap-3 p-2 rounded-lg bg-sidebar-accent/50">
        <div className="w-9 h-9 rounded-lg bg-sidebar-foreground/10 flex items-center justify-center">
          <Building2 className="w-4 h-4 text-sidebar-foreground/40" />
        </div>
        <span className="text-xs text-sidebar-foreground/50">Sin empresas asignadas</span>
      </div>
    );
  }

  return (
    <Select
      value={selectedEmpresaId || ''}
      onValueChange={(val) => onEmpresaSelect(val === 'all' ? 'all' : val)}
    >
      <SelectTrigger className="w-full h-auto p-2 rounded-lg bg-sidebar-accent/50 hover:bg-sidebar-accent border-0 shadow-none focus:ring-0 focus:ring-offset-0">
        <div className="flex items-center gap-3 w-full min-w-0">
          {isAll ? (
            <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
              <Globe className="w-4 h-4 text-primary" />
            </div>
          ) : (
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
              style={{ backgroundColor: `hsl(${selectedEmpresa ? hashColor(selectedEmpresa.razon_social) : '0 0% 50%'})` }}
            >
              {selectedEmpresa ? getInitials(selectedEmpresa.razon_social) : '?'}
            </div>
          )}
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-semibold text-sidebar-foreground truncate leading-tight">
              {isAll ? 'Todas las empresas' : selectedEmpresa?.razon_social || 'Seleccionar...'}
            </p>
            <p className="text-[11px] text-sidebar-foreground/50 leading-tight">
              {isAll ? 'Vista consolidada' : 'Empresa activa'} · {empresas.length} empresa{empresas.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </SelectTrigger>
      <SelectContent className="z-[99999]">
        {role === 'administrador' && (
          <SelectItem value="all">
            <div className="flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-primary" />
              <span>Todas las empresas</span>
            </div>
          </SelectItem>
        )}
        {empresas.map(e => (
          <SelectItem key={e.id} value={e.id}>
            <div className="flex items-center gap-2">
              <div
                className="w-5 h-5 rounded flex items-center justify-center text-white text-[9px] font-bold shrink-0"
                style={{ backgroundColor: `hsl(${hashColor(e.razon_social)})` }}
              >
                {getInitials(e.razon_social)}
              </div>
              <span>{e.razon_social}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

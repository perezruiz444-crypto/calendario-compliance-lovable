import { useEffect, useState, useMemo, useRef } from 'react';
import { Check, ChevronsUpDown, Building2, Globe, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEmpresaContext } from '@/hooks/useEmpresaContext';

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

  const [open, setOpen]       = useState(false);
  const [search, setSearch]   = useState('');
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const containerRef          = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (user && role) fetchEmpresas();
  }, [user, role]);

  const fetchEmpresas = async () => {
    setLoading(true);
    try {
      let data: any[] = [];
      if (role === 'administrador') {
        const { data: d } = await supabase.from('empresas').select('id, razon_social').order('razon_social');
        data = d || [];
      } else {
        const { data: asig } = await supabase
          .from('consultor_empresa_asignacion').select('empresa_id').eq('consultor_id', user?.id);
        const ids = asig?.map(a => a.empresa_id) || [];
        if (ids.length > 0) {
          const { data: d } = await supabase.from('empresas').select('id, razon_social').in('id', ids).order('razon_social');
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
  const isAll           = selectedEmpresaId === 'all';
  const displayName     = isAll ? 'Todas las empresas' : selectedEmpresa?.razon_social || 'Seleccionar...';
  const avatarColor     = isAll ? '220 15% 40%' : selectedEmpresa ? hashColor(selectedEmpresa.razon_social) : '0 0% 50%';
  const avatarInitials  = isAll ? '✦' : selectedEmpresa ? getInitials(selectedEmpresa.razon_social) : '?';

  const filtered = empresas.filter(e =>
    e.razon_social.toLowerCase().includes(search.toLowerCase())
  );

  const select = (id: string | null) => {
    onEmpresaSelect(id);
    setOpen(false);
    setSearch('');
  };

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
      <div className="flex items-center gap-3 p-2 rounded-lg bg-sidebar-accent/50 text-sidebar-foreground/50">
        <div className="w-9 h-9 rounded-lg bg-sidebar-foreground/10 flex items-center justify-center">
          <Building2 className="w-4 h-4" />
        </div>
        <span className="text-xs">Sin empresas asignadas</span>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 p-2 rounded-lg bg-sidebar-accent/50 hover:bg-sidebar-accent transition-colors text-left group"
      >
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
          style={{ backgroundColor: `hsl(${avatarColor})` }}
        >
          {avatarInitials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-sidebar-foreground truncate leading-tight">
            {displayName}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
            <span className="text-[11px] text-sidebar-foreground/50">
              {isAll ? 'Vista consolidada' : 'Empresa activa'} · {empresas.length} empresa{empresas.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        <ChevronsUpDown className="w-3.5 h-3.5 text-sidebar-foreground/30 group-hover:text-sidebar-foreground/60 shrink-0" />
      </button>

      {/* Dropdown — posicionado con fixed para salir de cualquier overflow */}
      {open && (
        <div
          className="fixed z-[99999] w-72 rounded-xl border border-border bg-popover shadow-xl overflow-hidden"
          style={{
            top: (() => {
              const r = containerRef.current?.getBoundingClientRect();
              return r ? r.bottom + 4 : 0;
            })(),
            left: (() => {
              const r = containerRef.current?.getBoundingClientRect();
              return r ? r.left : 0;
            })(),
          }}
        >
          {/* Search */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
            <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar empresa..."
              className="flex-1 text-sm bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div className="max-h-64 overflow-y-auto">
            {/* Todas las empresas (solo admin) */}
            {role === 'administrador' && (
              <>
                <button
                  onClick={() => select('all')}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                    <Globe className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">Todas las empresas</p>
                    <p className="text-[11px] text-muted-foreground">Vista consolidada</p>
                  </div>
                  {isAll && <Check className="w-4 h-4 text-primary shrink-0" />}
                </button>
                <div className="h-px bg-border mx-3" />
              </>
            )}

            {/* Lista de empresas */}
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No se encontró la empresa</p>
            ) : (
              filtered.map(empresa => {
                const isSelected = selectedEmpresaId === empresa.id;
                const color      = hashColor(empresa.razon_social);
                const initials   = getInitials(empresa.razon_social);
                return (
                  <button
                    key={empresa.id}
                    onClick={() => select(empresa.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors text-left"
                  >
                    <div
                      className="w-7 h-7 rounded-md flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                      style={{ backgroundColor: `hsl(${color})` }}
                    >
                      {initials}
                    </div>
                    <span className="flex-1 text-sm truncate">{empresa.razon_social}</span>
                    {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

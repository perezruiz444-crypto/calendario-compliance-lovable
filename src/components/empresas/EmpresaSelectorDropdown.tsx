import { useEffect, useState, useMemo } from 'react';
import { Check, ChevronsUpDown, Building2, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
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
  const hue = Math.abs(hash) % 360;
  return `${hue} 45% 45%`;
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function EmpresaSelectorDropdown({ onEmpresaSelect: externalOnSelect, selectedEmpresaId: externalSelectedId }: EmpresaSelectorProps) {
  const { user, role } = useAuth();
  const empresaContext = useEmpresaContext();
  
  // Use context by default, allow prop override
  const selectedEmpresaId = externalSelectedId ?? empresaContext.selectedEmpresaId;
  const onEmpresaSelect = externalOnSelect ?? empresaContext.setSelectedEmpresaId;
  
  const [open, setOpen] = useState(false);
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && role) fetchEmpresas();
  }, [user, role]);

  const fetchEmpresas = async () => {
    setLoading(true);
    try {
      let empresasData;
      if (role === 'administrador') {
        const { data, error } = await supabase
          .from('empresas')
          .select('id, razon_social')
          .order('razon_social');
        if (error) throw error;
        empresasData = data;
      } else {
        const { data: asignaciones, error: asignacionesError } = await supabase
          .from('consultor_empresa_asignacion')
          .select('empresa_id')
          .eq('consultor_id', user?.id);
        if (asignacionesError) throw asignacionesError;
        const empresaIds = asignaciones?.map((a) => a.empresa_id) || [];
        if (empresaIds.length > 0) {
          const { data, error: empresasError } = await supabase
            .from('empresas')
            .select('id, razon_social')
            .in('id', empresaIds)
            .order('razon_social');
          if (empresasError) throw empresasError;
          empresasData = data;
        }
      }
      setEmpresas(empresasData || []);
      if (!selectedEmpresaId && empresasData && empresasData.length > 0) {
        onEmpresaSelect(empresasData[0].id);
      }
    } catch (error) {
      console.error('Error fetching empresas:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedEmpresa = empresas.find((e) => e.id === selectedEmpresaId);
  const isAllSelected = selectedEmpresaId === 'all';

  const displayName = isAllSelected
    ? 'Todas las empresas'
    : selectedEmpresa?.razon_social || 'Seleccionar...';

  const avatarColor = useMemo(
    () => (isAllSelected ? '220 15% 40%' : selectedEmpresa ? hashColor(selectedEmpresa.razon_social) : '0 0% 50%'),
    [selectedEmpresa, isAllSelected]
  );

  const avatarInitials = isAllSelected ? '✦' : selectedEmpresa ? getInitials(selectedEmpresa.razon_social) : '?';

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
        <span className="text-xs font-body">Sin empresas asignadas</span>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="w-full flex items-center gap-3 p-2 rounded-lg bg-sidebar-accent/50 hover:bg-sidebar-accent transition-colors cursor-pointer text-left group"
        >
          {/* Avatar */}
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-heading font-bold shrink-0 shadow-sm"
            style={{ backgroundColor: `hsl(${avatarColor})` }}
          >
            {avatarInitials}
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-heading font-semibold text-sidebar-foreground truncate leading-tight">
              {displayName}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
              <span className="text-[11px] font-body text-sidebar-foreground/50 leading-tight">
                {isAllSelected ? 'Vista consolidada' : 'Empresa activa'}
                {' · '}
                {empresas.length} empresa{empresas.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          <ChevronsUpDown className="w-3.5 h-3.5 text-sidebar-foreground/30 group-hover:text-sidebar-foreground/60 transition-colors shrink-0" />
        </button>
      </PopoverTrigger>

  <PopoverContent className="w-[280px] p-0" align="start" side="bottom" sideOffset={4} style={{ zIndex: 9999 }}>
        <Command>
          <CommandInput placeholder="Buscar empresa..." className="font-body text-sm" />
          <CommandEmpty className="font-body text-sm py-4">No se encontró la empresa.</CommandEmpty>

          {role === 'administrador' && (
            <>
              <CommandGroup>
                <CommandItem
                  value="todas-empresas"
                  onSelect={() => {
                    
                    onEmpresaSelect('all');
                    setOpen(false);
                  }}
                  className="font-body gap-3"
                >
                  <div className="w-7 h-7 rounded-md bg-sidebar-primary/15 flex items-center justify-center shrink-0">
                    <Globe className="w-3.5 h-3.5 text-sidebar-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">Todas las empresas</p>
                    <p className="text-[11px] text-muted-foreground">Vista consolidada</p>
                  </div>
                  <Check className={cn('w-4 h-4 shrink-0', isAllSelected ? 'opacity-100 text-primary' : 'opacity-0')} />
                </CommandItem>
              </CommandGroup>
              <Separator />
            </>
          )}

          <ScrollArea className="max-h-[220px]">
            <CommandGroup>
              {empresas.map((empresa) => {
                const initials = getInitials(empresa.razon_social);
                const color = hashColor(empresa.razon_social);
                const isSelected = selectedEmpresaId === empresa.id;

                return (
                  <CommandItem
                    key={empresa.id}
                    value={empresa.razon_social}
                    onSelect={() => {
                      
                      onEmpresaSelect(empresa.id);
                      setOpen(false);
                    }}
                    className="font-body gap-3"
                  >
                    <div
                      className="w-7 h-7 rounded-md flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                      style={{ backgroundColor: `hsl(${color})` }}
                    >
                      {initials}
                    </div>
                    <span className="flex-1 text-sm truncate">{empresa.razon_social}</span>
                    <Check className={cn('w-4 h-4 shrink-0', isSelected ? 'opacity-100 text-primary' : 'opacity-0')} />
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </ScrollArea>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

import { useEffect, useState } from 'react';
import { Check, ChevronsUpDown, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
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
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface EmpresaSelectorProps {
  onEmpresaSelect: (empresaId: string | null) => void;
  selectedEmpresaId: string | null;
}

export function EmpresaSelectorDropdown({ onEmpresaSelect, selectedEmpresaId }: EmpresaSelectorProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchEmpresas();
    }
  }, [user]);

  const fetchEmpresas = async () => {
    setLoading(true);
    try {
      // Get user role
      const { data: userData } = await supabase.auth.getUser();
      const userRole = userData?.user?.user_metadata?.role;

      let empresasData;
      
      if (userRole === 'administrador') {
        // Admins can see all empresas
        const { data, error } = await supabase
          .from('empresas')
          .select('id, razon_social')
          .order('razon_social');
        
        if (error) throw error;
        empresasData = data;
      } else {
        // Consultores only see their assigned empresas
        const { data: asignaciones, error: asignacionesError } = await supabase
          .from('consultor_empresa_asignacion')
          .select('empresa_id')
          .eq('consultor_id', user?.id);

        if (asignacionesError) throw asignacionesError;

        const empresaIds = asignaciones?.map(a => a.empresa_id) || [];

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
      
      // Auto-select first empresa if none selected
      if (!selectedEmpresaId && empresasData && empresasData.length > 0) {
        onEmpresaSelect(empresasData[0].id);
      }
    } catch (error) {
      console.error('Error fetching empresas:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedEmpresa = empresas.find(e => e.id === selectedEmpresaId);

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
        <span className="text-sm font-body">Cargando...</span>
      </div>
    );
  }

  if (empresas.length === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-muted-foreground">
        <Building2 className="w-4 h-4" />
        <span className="text-sm font-body">Sin empresas asignadas</span>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-body"
        >
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            <span className="truncate">
              {selectedEmpresa?.razon_social || 'Seleccionar empresa...'}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput placeholder="Buscar empresa..." className="font-body" />
          <CommandEmpty className="font-body">No se encontró la empresa.</CommandEmpty>
          <CommandGroup>
            {empresas.map((empresa) => (
              <CommandItem
                key={empresa.id}
                value={empresa.razon_social}
                onSelect={() => {
                  onEmpresaSelect(empresa.id);
                  setOpen(false);
                }}
                className="font-body"
              >
                <Check
                  className={cn(
                    'mr-2 h-4 w-4',
                    selectedEmpresaId === empresa.id ? 'opacity-100' : 'opacity-0'
                  )}
                />
                {empresa.razon_social}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

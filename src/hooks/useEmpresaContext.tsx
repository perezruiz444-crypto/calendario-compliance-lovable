import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

// UUID v4 regex — rejects tampered non-UUID values before hitting the DB
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface EmpresaContextType {
  selectedEmpresaId: string | null;
  setSelectedEmpresaId: (id: string | null) => void;
}

const EmpresaContext = createContext<EmpresaContextType>({
  selectedEmpresaId: null,
  setSelectedEmpresaId: () => {},
});

export function EmpresaProvider({ children }: { children: ReactNode }) {
  const [selectedEmpresaId, setSelectedEmpresaIdState] = useState<string | null>(() => {
    const stored = localStorage.getItem('selectedEmpresaId');
    // Reject malformed values immediately — no network call needed
    if (stored && !UUID_REGEX.test(stored)) {
      localStorage.removeItem('selectedEmpresaId');
      return null;
    }
    return stored || null;
  });

  // Server-side validation: verify the stored empresaId is actually accessible
  // by the current user (RLS will reject unauthorized rows). If not, clear it.
  useEffect(() => {
    if (!selectedEmpresaId) return;

    supabase
      .from('empresas')
      .select('id')
      .eq('id', selectedEmpresaId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) {
          // RLS denied access or empresa doesn't exist — clear the stored ID
          localStorage.removeItem('selectedEmpresaId');
          setSelectedEmpresaIdState(null);
        }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount — intentionally not re-running on selectedEmpresaId changes

  const setSelectedEmpresaId = (id: string | null) => {
    setSelectedEmpresaIdState(id);
    if (id) {
      localStorage.setItem('selectedEmpresaId', id);
    } else {
      localStorage.removeItem('selectedEmpresaId');
    }
  };

  return (
    <EmpresaContext.Provider value={{ selectedEmpresaId, setSelectedEmpresaId }}>
      {children}
    </EmpresaContext.Provider>
  );
}

export function useEmpresaContext() {
  return useContext(EmpresaContext);
}

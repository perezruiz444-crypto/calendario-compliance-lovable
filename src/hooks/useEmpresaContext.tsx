import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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
    return localStorage.getItem('selectedEmpresaId') || null;
  });

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

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { EmpresaProvider } from "@/hooks/useEmpresaContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import SetPassword from "./pages/SetPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Empresas from "./pages/Empresas";
import EmpresaDetail from "./pages/EmpresaDetail";
import MiEmpresa from "./pages/MiEmpresa";
import Tareas from "./pages/Tareas";
import Usuarios from "./pages/Usuarios";
import Calendario from "./pages/Calendario";
import Mensajes from "./pages/Mensajes";
import Reportes from "./pages/Reportes";
import NotFound from "./pages/NotFound";
import Configuraciones from "./pages/Configuraciones";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <EmpresaProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/set-password" element={<SetPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/empresas" element={<Empresas />} />
            <Route path="/empresas/:id" element={<EmpresaDetail />} />
            <Route path="/mi-empresa" element={<MiEmpresa />} />
            <Route path="/tareas" element={<Tareas />} />
            <Route path="/calendario" element={<Calendario />} />
            <Route path="/mensajes" element={<Mensajes />} />
            <Route path="/reportes" element={<Reportes />} />
            <Route path="/usuarios" element={<Usuarios />} />
            <Route path="/configuraciones" element={<Configuraciones />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </EmpresaProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

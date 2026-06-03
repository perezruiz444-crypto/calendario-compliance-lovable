import { lazy, Suspense } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { EmpresaProvider } from "@/hooks/useEmpresaContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import SetPassword from "./pages/SetPassword";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Empresas = lazy(() => import("./pages/Empresas"));
const EmpresaDetail = lazy(() => import("./pages/EmpresaDetail"));
const MiEmpresa = lazy(() => import("./pages/MiEmpresa"));
const Tareas = lazy(() => import("./pages/Tareas"));
const Usuarios = lazy(() => import("./pages/Usuarios"));
const Calendario = lazy(() => import("./pages/Calendario"));
const Mensajes = lazy(() => import("./pages/Mensajes"));
const Reportes = lazy(() => import("./pages/Reportes"));
const Configuraciones = lazy(() => import("./pages/Configuraciones"));
const Ayuda = lazy(() => import("./pages/Ayuda"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  },
});

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <EmpresaProvider>
        <ErrorBoundary>
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
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
                <Route path="/ayuda" element={<Ayuda />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </ErrorBoundary>
      </EmpresaProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

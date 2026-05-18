import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background surface-mesh px-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        className="max-w-lg w-full text-center"
      >
        <p className="eyebrow-primary mb-4">Error 404 · Ruta no encontrada</p>
        <h1 className="font-heading font-bold text-[clamp(6rem,18vw,11rem)] leading-none tracking-tight text-primary">
          404
        </h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-md mx-auto leading-relaxed">
          La página que buscas no existe o fue movida. Verifica la URL o vuelve al inicio.
        </p>
        <p className="mt-2 text-xs font-mono text-muted-foreground/60 truncate">{location.pathname}</p>
        <Button onClick={() => navigate('/dashboard')} className="mt-8 gap-2 shadow-editorial">
          <ArrowLeft className="w-4 h-4" /> Volver al dashboard
        </Button>
      </motion.div>
    </div>
  );
};

export default NotFound;

import { Button } from '@/components/ui/button';
import { Mail, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MensajeNoLeido } from '@/hooks/useAnalytics';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'framer-motion';

interface DashboardMensajesProps {
  mensajes: MensajeNoLeido[];
  totalNoLeidos: number;
}

export default function DashboardMensajes({ mensajes, totalNoLeidos }: DashboardMensajesProps) {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.15 }}
      className="card-editorial p-6"
    >
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="eyebrow-primary mb-1.5 flex items-center gap-1.5">
            <Mail className="w-3 h-3" /> Bandeja · Sin leer
          </p>
          <h3 className="font-heading text-xl font-bold tracking-tight flex items-center gap-2">
            Mensajes
            {totalNoLeidos > 0 && (
              <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-warning text-warning-foreground text-[11px] font-bold font-mono">
                {totalNoLeidos}
              </span>
            )}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">Comunicación reciente del equipo</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate('/mensajes')} className="gap-1 font-heading">
          Ver todos <ArrowRight className="w-3 h-3" />
        </Button>
      </div>

      {mensajes.length === 0 ? (
        <div className="text-center py-10">
          <Mail className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Sin mensajes nuevos por ahora.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {mensajes.map((msg) => (
            <div
              key={msg.id}
              className="flex items-start gap-3 p-3 border border-border-subtle rounded-lg hover:border-primary/40 hover:bg-muted/30 transition-all cursor-pointer"
              onClick={() => navigate('/mensajes')}
            >
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-xs font-heading font-bold text-primary">
                  {msg.remitente_nombre.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-heading font-semibold text-sm truncate text-foreground">{msg.asunto}</p>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                  <span className="truncate">{msg.remitente_nombre}</span>
                  <span>·</span>
                  <span className="font-mono shrink-0">
                    {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true, locale: es })}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

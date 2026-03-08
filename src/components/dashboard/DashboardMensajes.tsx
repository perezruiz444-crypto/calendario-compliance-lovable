import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MensajeNoLeido } from '@/hooks/useAnalytics';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface DashboardMensajesProps {
  mensajes: MensajeNoLeido[];
  totalNoLeidos: number;
}

export default function DashboardMensajes({ mensajes, totalNoLeidos }: DashboardMensajesProps) {
  const navigate = useNavigate();

  return (
    <Card className="gradient-card shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="font-heading flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Mensajes
              {totalNoLeidos > 0 && (
                <span className="bg-destructive text-destructive-foreground text-xs rounded-full px-2 py-0.5 font-bold">
                  {totalNoLeidos}
                </span>
              )}
            </CardTitle>
            <CardDescription className="font-body">
              Mensajes sin leer
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/mensajes')} className="gap-1">
            Ver todos <ArrowRight className="w-3 h-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {mensajes.length === 0 ? (
          <div className="text-center py-6">
            <Mail className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No hay mensajes nuevos</p>
          </div>
        ) : (
          <div className="space-y-3">
            {mensajes.map((msg) => (
              <div
                key={msg.id}
                className="flex items-start gap-3 p-3 border rounded-lg hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => navigate('/mensajes')}
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-primary">
                    {msg.remitente_nombre.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-heading font-medium text-sm truncate">{msg.asunto}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{msg.remitente_nombre}</span>
                    <span>·</span>
                    <span>
                      {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true, locale: es })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

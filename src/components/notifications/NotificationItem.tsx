import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Bell, CheckSquare, MessageSquare, AlertCircle } from 'lucide-react';
import { Notification } from '@/hooks/useNotifications';

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onNavigate: (notification: Notification) => void;
}

export function NotificationItem({ notification, onMarkAsRead, onNavigate }: NotificationItemProps) {
  const getIcon = () => {
    switch (notification.tipo) {
      case 'mensaje':
        return <MessageSquare className="w-4 h-4 text-primary" />;
      case 'tarea_asignada':
        return <CheckSquare className="w-4 h-4 text-success" />;
      case 'tarea_vencimiento':
        return <AlertCircle className="w-4 h-4 text-warning" />;
      case 'comentario':
        return <MessageSquare className="w-4 h-4 text-accent-foreground" />;
      default:
        return <Bell className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const handleClick = () => {
    if (!notification.leida) {
      onMarkAsRead(notification.id);
    }
    onNavigate(notification);
  };

  return (
    <div
      onClick={handleClick}
      className={`p-3 rounded-lg cursor-pointer transition-smooth hover:bg-accent/50 ${
        !notification.leida ? 'bg-primary/5 border border-primary/20' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${!notification.leida ? 'bg-primary/10' : 'bg-muted'}`}>
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={`text-sm font-heading font-semibold ${!notification.leida ? 'text-foreground' : 'text-muted-foreground'}`}>
              {notification.titulo}
            </p>
            {!notification.leida && (
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            )}
          </div>
          {notification.contenido && (
            <p className="text-xs text-muted-foreground font-body mt-1 line-clamp-2">
              {notification.contenido}
            </p>
          )}
          <p className="text-xs text-muted-foreground font-body mt-1">
            {formatDistanceToNow(new Date(notification.created_at), { 
              addSuffix: true,
              locale: es 
            })}
          </p>
        </div>
      </div>
    </div>
  );
}

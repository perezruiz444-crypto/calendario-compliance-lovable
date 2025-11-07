import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { usePushNotifications } from './usePushNotifications';

export interface Notification {
  id: string;
  user_id: string;
  tipo: string;
  titulo: string;
  contenido: string | null;
  referencia_id: string | null;
  referencia_tipo: string | null;
  leida: boolean;
  created_at: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const { showNotification, permission } = usePushNotifications();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    fetchNotifications();
    const cleanup = subscribeToNotifications();
    return cleanup;
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;

    try {
      const { data, error } = await (supabase as any)
        .from('notificaciones')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount(data?.filter((n: any) => !n.leida).length || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToNotifications = () => {
    if (!user) return () => {};

    const channel = supabase
      .channel('notificaciones-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notificaciones',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Notification change:', payload);
          
          if (payload.eventType === 'INSERT') {
            const newNotification = payload.new as Notification;
            setNotifications(prev => [newNotification, ...prev]);
            setUnreadCount(prev => prev + 1);
            
            // Show push notification
            if (permission === 'granted') {
              showNotification(newNotification.titulo, {
                body: newNotification.contenido || '',
                tag: newNotification.id,
                data: {
                  referencia_id: newNotification.referencia_id,
                  referencia_tipo: newNotification.referencia_tipo,
                  url: getNotificationUrl(newNotification)
                }
              });
            }
          } else if (payload.eventType === 'UPDATE') {
            setNotifications(prev => 
              prev.map(n => n.id === payload.new.id ? payload.new as Notification : n)
            );
            if ((payload.new as Notification).leida && !(payload.old as Notification).leida) {
              setUnreadCount(prev => Math.max(0, prev - 1));
            }
          } else if (payload.eventType === 'DELETE') {
            setNotifications(prev => prev.filter(n => n.id !== payload.old.id));
            if (!(payload.old as Notification).leida) {
              setUnreadCount(prev => Math.max(0, prev - 1));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('notificaciones')
        .update({ leida: true })
        .eq('id', notificationId);

      if (error) throw error;
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const { error } = await (supabase as any)
        .from('notificaciones')
        .update({ leida: true })
        .eq('user_id', user.id)
        .eq('leida', false);

      if (error) throw error;

      setNotifications(prev => prev.map(n => ({ ...n, leida: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const getNotificationUrl = (notification: Notification): string => {
    const { referencia_tipo, referencia_id } = notification;
    
    if (!referencia_tipo || !referencia_id) return '/dashboard';
    
    switch (referencia_tipo) {
      case 'tarea':
        return `/tareas?tarea=${referencia_id}`;
      case 'mensaje':
        return `/mensajes?mensaje=${referencia_id}`;
      case 'solicitud':
        return `/dashboard?solicitud=${referencia_id}`;
      case 'empresa':
        return `/empresas/${referencia_id}`;
      default:
        return '/dashboard';
    }
  };

  return {
    notifications,
    loading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications
  };
}

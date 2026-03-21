import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { usePushNotifications } from './usePushNotifications';
import { differenceInDays, isValid } from 'date-fns';

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

async function insertVencimientoAlerts(userId: string) {
  try {
    const { data: obs } = await (supabase as any)
      .from('obligaciones')
      .select('id, nombre, empresa_id, fecha_vencimiento, empresas(razon_social)')
      .eq('activa', true)
      .not('fecha_vencimiento', 'is', null);

    if (!obs || obs.length === 0) return;

    const UMBRALES = [1, 7, 30];
    const today = new Date();

    for (const ob of obs) {
      const d = new Date(ob.fecha_vencimiento);
      if (!isValid(d)) continue;
      const daysLeft = differenceInDays(d, today);

      for (const umbral of UMBRALES) {
        if (daysLeft !== umbral) continue;

        const { data: existing } = await (supabase as any)
          .from('notificaciones')
          .select('id')
          .eq('user_id', userId)
          .eq('referencia_id', ob.id)
          .eq('tipo', `vencimiento_${umbral}d`)
          .maybeSingle();

        if (existing) continue;

        const label = daysLeft === 1 ? 'mañana' : `en ${daysLeft} días`;
        await (supabase as any).from('notificaciones').insert({
          user_id: userId,
          tipo: `vencimiento_${umbral}d`,
          titulo: `Vence ${label}: ${ob.nombre}`,
          contenido: ob.empresas?.razon_social
            ? `Empresa: ${ob.empresas.razon_social} · ${d.toLocaleDateString('es-MX')}`
            : d.toLocaleDateString('es-MX'),
          referencia_id: ob.id,
          referencia_tipo: 'obligacion',
          leida: false,
        });
      }
    }
  } catch (e) {
    console.warn('insertVencimientoAlerts:', e);
  }
}

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const pushNotifications = usePushNotifications();
  const showNotification = pushNotifications?.showNotification;
  const permission = pushNotifications?.permission || 'default';

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await (supabase as any)
        .from('notificaciones')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(25);

      if (error) throw error;
      setNotifications(data || []);
      setUnreadCount(data?.filter((n: any) => !n.leida).length || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    fetchNotifications();
    insertVencimientoAlerts(user.id);

    const channel = (supabase as any)
      .channel('notificaciones-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notificaciones', filter: `user_id=eq.${user.id}` },
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            const n = payload.new as Notification;
            setNotifications(prev => [n, ...prev]);
            setUnreadCount(prev => prev + 1);
            if (permission === 'granted' && showNotification) {
              showNotification(n.titulo, {
                body: n.contenido || '',
                tag: n.id,
                data: { referencia_id: n.referencia_id, referencia_tipo: n.referencia_tipo, url: getNotificationUrl(n) },
              });
            }
          } else if (payload.eventType === 'UPDATE') {
            setNotifications(prev => prev.map(n => n.id === payload.new.id ? payload.new as Notification : n));
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

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const markAsRead = async (notificationId: string) => {
    try {
      await (supabase as any)
        .from('notificaciones')
        .update({ leida: true })
        .eq('id', notificationId);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    try {
      await (supabase as any)
        .from('notificaciones')
        .update({ leida: true })
        .eq('user_id', user.id)
        .eq('leida', false);
      setNotifications(prev => prev.map(n => ({ ...n, leida: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  return { notifications, loading, unreadCount, markAsRead, markAllAsRead, refetch: fetchNotifications };
}

function getNotificationUrl(notification: Notification): string {
  const { referencia_tipo, referencia_id } = notification;
  if (!referencia_tipo || !referencia_id) return '/dashboard';
  switch (referencia_tipo) {
    case 'tarea':      return `/tareas?tarea=${referencia_id}`;
    case 'mensaje':    return `/mensajes?mensaje=${referencia_id}`;
    case 'solicitud':  return `/dashboard?solicitud=${referencia_id}`;
    case 'empresa':    return `/empresas/${referencia_id}`;
    case 'obligacion': return `/empresas`;
    default:           return '/dashboard';
  }
}

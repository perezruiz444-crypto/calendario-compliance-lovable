import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

const vapidPublicKey = import.meta.env.VITE_WEB_PUSH_VAPID_PUBLIC_KEY as string | undefined;

function urlBase64ToUint8Array(value: string): Uint8Array {
  const padding = '='.repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(window.atob(base64), (character) => character.charCodeAt(0));
}

export function usePushNotifications() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Check if notifications are supported
    if ('Notification' in window && 'serviceWorker' in navigator) {
      setIsSupported(true);
      setPermission(Notification.permission);
      
      // Register service worker
      registerServiceWorker();
    }
    setIsInitialized(true);
  }, []);

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/'
      });
      // Check if already subscribed
      if ('pushManager' in registration) {
        const subscription = await (registration as any).pushManager.getSubscription();
        setIsSubscribed(!!subscription);
      }
    } catch (error) {
      logger.error('Service Worker registration failed:', error);
    }
  };

  const requestPermission = async () => {
    if (!isSupported) {
      toast.error('Las notificaciones push no están disponibles en este navegador');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === 'granted') {
        toast.success('Notificaciones activadas correctamente');
        await subscribeToPushNotifications();
        return true;
      } else if (result === 'denied') {
        toast.error('Permisos de notificación denegados');
        return false;
      }
      return false;
    } catch (error) {
      logger.error('Error requesting notification permission:', error);
      toast.error('Error al solicitar permisos de notificación');
      return false;
    }
  };

  const subscribeToPushNotifications = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      
      if (!user) throw new Error('Debes iniciar sesión para activar notificaciones');
      if (!vapidPublicKey) throw new Error('Falta configurar VITE_WEB_PUSH_VAPID_PUBLIC_KEY');

      const existing = await registration.pushManager.getSubscription();
      const subscription = existing ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
      const json = subscription.toJSON();
      // Generated Supabase types are refreshed after the migration is applied.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: subscriptionError } = await (supabase as any)
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          endpoint: subscription.endpoint,
          p256dh: json.keys?.p256dh,
          auth: json.keys?.auth,
          user_agent: navigator.userAgent,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,endpoint' });
      if (subscriptionError) {
        if (!existing) await subscription.unsubscribe();
        throw subscriptionError;
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ notificaciones_activas: true })
        .eq('id', user.id);
      if (profileError) throw profileError;
      setIsSubscribed(true);
    } catch (error) {
      logger.error('Error subscribing to push notifications:', error);
      toast.error('Error al suscribirse a notificaciones');
    }
  };

  const unsubscribe = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = 'pushManager' in registration ? await (registration as any).pushManager.getSubscription() : null;
      
      if (subscription) {
        if (user) {
          // Generated Supabase types are refreshed after the migration is applied.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error } = await (supabase as any)
            .from('push_subscriptions')
            .delete()
            .eq('user_id', user.id)
            .eq('endpoint', subscription.endpoint);
          if (error) throw error;
        }
        await subscription.unsubscribe();
      }
      
      setIsSubscribed(false);
      
      // Update database
      if (user) {
        const { error } = await supabase
          .from('profiles')
          .update({ notificaciones_activas: false })
          .eq('id', user.id);
        if (error) throw error;
      }
      
      toast.success('Notificaciones desactivadas');
    } catch (error) {
      logger.error('Error unsubscribing from push notifications:', error);
      toast.error('Error al desactivar notificaciones');
    }
  };

  const showNotification = async (title: string, options?: NotificationOptions) => {
    if (permission !== 'granted') return;

    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options
      });
    } catch (error) {
      logger.error('Error showing notification:', error);
    }
  };

  return {
    isSupported,
    permission,
    isSubscribed,
    isInitialized,
    requestPermission,
    unsubscribe,
    showNotification
  };
}

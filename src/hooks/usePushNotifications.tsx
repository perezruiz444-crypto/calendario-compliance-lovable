import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

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
      console.log('Service Worker registered:', registration);
      
      // Check if already subscribed
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error('Service Worker registration failed:', error);
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
      console.error('Error requesting notification permission:', error);
      toast.error('Error al solicitar permisos de notificación');
      return false;
    }
  };

  const subscribeToPushNotifications = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      
      // For now, we'll just mark as subscribed
      // In production, you'd generate a VAPID key and subscribe with pushManager
      setIsSubscribed(true);
      
      // Store subscription preference in database
      if (user) {
        await supabase
          .from('profiles')
          .update({ notificaciones_activas: true })
          .eq('id', user.id);
      }
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      toast.error('Error al suscribirse a notificaciones');
    }
  };

  const unsubscribe = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
      }
      
      setIsSubscribed(false);
      
      // Update database
      if (user) {
        await supabase
          .from('profiles')
          .update({ notificaciones_activas: false })
          .eq('id', user.id);
      }
      
      toast.success('Notificaciones desactivadas');
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      toast.error('Error al desactivar notificaciones');
    }
  };

  const showNotification = async (title: string, options?: NotificationOptions) => {
    if (permission !== 'granted') {
      console.log('Notification permission not granted');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options
      });
    } catch (error) {
      console.error('Error showing notification:', error);
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

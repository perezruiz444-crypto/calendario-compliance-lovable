import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, Mail, Smartphone, Clock, RotateCcw, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface NotificationPreference {
  notification_key: string;
  email_enabled: boolean;
  push_enabled: boolean;
}

interface ProfileSettings {
  resumen_frecuencia: string;
  resumen_hora: number;
  notificaciones_activas: boolean;
}

const NOTIFICATION_CATEGORIES = {
  tareas: {
    icon: '📋',
    name: 'Tareas',
    items: [
      { key: 'tarea_asignada', name: 'Tarea asignada', description: 'Cuando te asignan una nueva tarea' },
      { key: 'tarea_vencida', name: 'Tarea vencida', description: 'Cuando una tarea pasa su fecha límite' },
      { key: 'tarea_comentario', name: 'Nuevo comentario', description: 'Cuando alguien comenta en tu tarea' },
      { key: 'tarea_completada', name: 'Tarea completada', description: 'Cuando se completa una tarea' },
    ]
  },
  certificaciones: {
    icon: '🏆',
    name: 'Certificaciones y Vencimientos',
    items: [
      { key: 'cert_90_dias', name: 'Vencimiento 90 días', description: 'Alerta temprana de vencimiento' },
      { key: 'cert_30_dias', name: 'Vencimiento 30 días', description: 'Recordatorio mensual' },
      { key: 'cert_15_dias', name: 'Vencimiento 15 días', description: 'Recordatorio quincenal urgente' },
      { key: 'cert_7_dias', name: 'Vencimiento 7 días', description: 'Alerta crítica semanal' },
    ]
  },
  documentos: {
    icon: '📄',
    name: 'Documentos',
    items: [
      { key: 'doc_nuevo', name: 'Documento subido', description: 'Cuando se sube un nuevo documento' },
      { key: 'doc_vencimiento', name: 'Documento por vencer', description: 'Documentos próximos a expirar' },
    ]
  },
  mensajes: {
    icon: '💬',
    name: 'Mensajes',
    items: [
      { key: 'mensaje_nuevo', name: 'Nuevo mensaje', description: 'Cuando recibes un mensaje' },
    ]
  },
  solicitudes: {
    icon: '🔔',
    name: 'Solicitudes',
    items: [
      { key: 'solicitud_nueva', name: 'Nueva solicitud', description: 'Cuando se crea una solicitud de servicio' },
      { key: 'solicitud_respuesta', name: 'Respuesta a solicitud', description: 'Cuando responden tu solicitud' },
    ]
  }
};

const HOURS = Array.from({ length: 24 }, (_, i) => ({
  value: i.toString(),
  label: `${i.toString().padStart(2, '0')}:00`
}));

export function UserNotificationPreferences() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<Record<string, NotificationPreference>>({});
  const [profileSettings, setProfileSettings] = useState<ProfileSettings>({
    resumen_frecuencia: 'diario',
    resumen_hora: 8,
    notificaciones_activas: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      loadPreferences();
    }
  }, [user]);

  const loadPreferences = async () => {
    try {
      // Load user notification preferences
      const { data: prefsData, error: prefsError } = await (supabase as any)
        .from('user_notification_preferences')
        .select('*')
        .eq('user_id', user?.id);

      if (prefsError) throw prefsError;

      const prefsMap: Record<string, NotificationPreference> = {};
      (prefsData || []).forEach((pref: any) => {
        prefsMap[pref.notification_key] = {
          notification_key: pref.notification_key,
          email_enabled: pref.email_enabled,
          push_enabled: pref.push_enabled
        };
      });
      setPreferences(prefsMap);

      // Load profile settings
      const { data: profileData, error: profileError } = await (supabase as any)
        .from('profiles')
        .select('resumen_frecuencia, resumen_hora, notificaciones_activas')
        .eq('id', user?.id)
        .single();

      if (profileError) throw profileError;

      if (profileData) {
        setProfileSettings({
          resumen_frecuencia: profileData.resumen_frecuencia || 'diario',
          resumen_hora: profileData.resumen_hora || 8,
          notificaciones_activas: profileData.notificaciones_activas ?? true
        });
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
      toast.error('Error al cargar preferencias');
    } finally {
      setLoading(false);
    }
  };

  const getPreference = (key: string): NotificationPreference => {
    return preferences[key] || {
      notification_key: key,
      email_enabled: true,
      push_enabled: true
    };
  };

  const handleToggle = async (key: string, field: 'email_enabled' | 'push_enabled', value: boolean) => {
    const currentPref = getPreference(key);
    const updatedPref = { ...currentPref, [field]: value };

    // Optimistic update
    setPreferences(prev => ({ ...prev, [key]: updatedPref }));

    try {
      const { error } = await (supabase as any)
        .from('user_notification_preferences')
        .upsert({
          user_id: user?.id,
          notification_key: key,
          email_enabled: updatedPref.email_enabled,
          push_enabled: updatedPref.push_enabled
        }, {
          onConflict: 'user_id,notification_key'
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error updating preference:', error);
      // Revert on error
      setPreferences(prev => ({ ...prev, [key]: currentPref }));
      toast.error('Error al actualizar preferencia');
    }
  };

  const handleProfileSettingChange = async (field: keyof ProfileSettings, value: any) => {
    const oldValue = profileSettings[field];
    setProfileSettings(prev => ({ ...prev, [field]: value }));

    try {
      const { error } = await (supabase as any)
        .from('profiles')
        .update({ [field]: value })
        .eq('id', user?.id);

      if (error) throw error;
      toast.success('Preferencia actualizada');
    } catch (error) {
      console.error('Error updating profile setting:', error);
      setProfileSettings(prev => ({ ...prev, [field]: oldValue }));
      toast.error('Error al actualizar preferencia');
    }
  };

  const handleResetDefaults = async () => {
    setSaving(true);
    try {
      // Delete all user preferences to reset to defaults
      const { error } = await (supabase as any)
        .from('user_notification_preferences')
        .delete()
        .eq('user_id', user?.id);

      if (error) throw error;

      // Reset profile settings
      await (supabase as any)
        .from('profiles')
        .update({
          resumen_frecuencia: 'diario',
          resumen_hora: 8,
          notificaciones_activas: true
        })
        .eq('id', user?.id);

      setPreferences({});
      setProfileSettings({
        resumen_frecuencia: 'diario',
        resumen_hora: 8,
        notificaciones_activas: true
      });

      toast.success('Preferencias restauradas a valores predeterminados');
    } catch (error) {
      console.error('Error resetting preferences:', error);
      toast.error('Error al restaurar preferencias');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Master Toggle & Summary Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Configuración General
          </CardTitle>
          <CardDescription>
            Controla cómo y cuándo recibes notificaciones
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base font-medium">Notificaciones activas</Label>
              <p className="text-sm text-muted-foreground">
                Activa o desactiva todas las notificaciones
              </p>
            </div>
            <Switch
              checked={profileSettings.notificaciones_activas}
              onCheckedChange={(checked) => handleProfileSettingChange('notificaciones_activas', checked)}
            />
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Frecuencia de resumen
              </Label>
              <Select
                value={profileSettings.resumen_frecuencia}
                onValueChange={(value) => handleProfileSettingChange('resumen_frecuencia', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="diario">Diario</SelectItem>
                  <SelectItem value="semanal">Semanal</SelectItem>
                  <SelectItem value="nunca">Nunca</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Hora de envío
              </Label>
              <Select
                value={profileSettings.resumen_hora.toString()}
                onValueChange={(value) => handleProfileSettingChange('resumen_hora', parseInt(value))}
                disabled={profileSettings.resumen_frecuencia === 'nunca'}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HOURS.map(hour => (
                    <SelectItem key={hour.value} value={hour.value}>
                      {hour.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Categories */}
      {Object.entries(NOTIFICATION_CATEGORIES).map(([categoryKey, category]) => (
        <Card key={categoryKey}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">{category.icon}</span>
              {category.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {/* Header */}
              <div className="hidden sm:grid grid-cols-[1fr,80px,80px] gap-4 pb-2 text-xs font-medium text-muted-foreground uppercase">
                <div>Notificación</div>
                <div className="text-center flex items-center justify-center gap-1">
                  <Mail className="h-3 w-3" />
                  Email
                </div>
                <div className="text-center flex items-center justify-center gap-1">
                  <Smartphone className="h-3 w-3" />
                  Push
                </div>
              </div>

              <Separator className="hidden sm:block" />

              {/* Items */}
              {category.items.map((item, index) => {
                const pref = getPreference(item.key);
                return (
                  <div key={item.key}>
                    {index > 0 && <Separator className="my-3" />}
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr,80px,80px] gap-4 items-center py-2">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-medium">{item.name}</Label>
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      </div>
                      <div className="flex sm:justify-center items-center gap-2">
                        <span className="text-xs text-muted-foreground sm:hidden">Email:</span>
                        <Switch
                          checked={pref.email_enabled}
                          onCheckedChange={(checked) => handleToggle(item.key, 'email_enabled', checked)}
                          disabled={!profileSettings.notificaciones_activas}
                        />
                      </div>
                      <div className="flex sm:justify-center items-center gap-2">
                        <span className="text-xs text-muted-foreground sm:hidden">Push:</span>
                        <Switch
                          checked={pref.push_enabled}
                          onCheckedChange={(checked) => handleToggle(item.key, 'push_enabled', checked)}
                          disabled={!profileSettings.notificaciones_activas}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Reset Button */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={handleResetDefaults}
          disabled={saving}
          className="gap-2"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RotateCcw className="h-4 w-4" />
          )}
          Restaurar Predeterminados
        </Button>
      </div>
    </div>
  );
}

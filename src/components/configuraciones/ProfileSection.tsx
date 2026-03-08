import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, User, Mail, Phone, Key, Shield, Save } from 'lucide-react';

export default function ProfileSection() {
  const { user, role } = useAuth();
  const [profile, setProfile] = useState({ nombre_completo: '', telefono: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (user) fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('nombre_completo, telefono')
        .eq('id', user!.id)
        .single();
      if (data) setProfile({ nombre_completo: data.nombre_completo || '', telefono: data.telefono || '' });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ nombre_completo: profile.nombre_completo, telefono: profile.telefono })
        .eq('id', user!.id);
      if (error) throw error;
      toast.success('Perfil actualizado correctamente');
    } catch {
      toast.error('Error al actualizar perfil');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.new !== passwordData.confirm) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    if (passwordData.new.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: passwordData.new });
      if (error) throw error;
      toast.success('Contraseña actualizada correctamente');
      setPasswordData({ current: '', new: '', confirm: '' });
    } catch {
      toast.error('Error al cambiar la contraseña');
    } finally {
      setChangingPassword(false);
    }
  };

  const roleLabels: Record<string, string> = {
    administrador: 'Administrador',
    consultor: 'Consultor',
    cliente: 'Cliente',
  };

  const roleColors: Record<string, string> = {
    administrador: 'bg-destructive/10 text-destructive border-destructive/20',
    consultor: 'bg-primary/10 text-primary border-primary/20',
    cliente: 'bg-accent/10 text-accent-foreground border-accent/20',
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* User Info Card */}
      <Card className="group hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/15 transition-colors">
              <User className="h-4 w-4 text-primary" />
            </div>
            Información Personal
          </CardTitle>
          <CardDescription>Actualiza tu nombre y datos de contacto</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Role & Email display */}
          <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{user?.email}</span>
            </div>
            <Badge variant="outline" className={roleColors[role || ''] || ''}>
              <Shield className="h-3 w-3 mr-1" />
              {roleLabels[role || ''] || role}
            </Badge>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="nombre" className="text-sm font-medium">Nombre completo</Label>
              <Input
                id="nombre"
                value={profile.nombre_completo}
                onChange={(e) => setProfile(p => ({ ...p, nombre_completo: e.target.value }))}
                placeholder="Tu nombre"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefono" className="text-sm font-medium">
                <Phone className="h-3.5 w-3.5 inline mr-1" />
                Teléfono
              </Label>
              <Input
                id="telefono"
                value={profile.telefono}
                onChange={(e) => setProfile(p => ({ ...p, telefono: e.target.value }))}
                placeholder="+52 ..."
              />
            </div>
          </div>

          <Button onClick={handleSaveProfile} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar cambios
          </Button>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card className="group hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/15 transition-colors">
              <Key className="h-4 w-4 text-primary" />
            </div>
            Cambiar Contraseña
          </CardTitle>
          <CardDescription>Actualiza tu contraseña de acceso</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="new-pass" className="text-sm font-medium">Nueva contraseña</Label>
              <Input
                id="new-pass"
                type="password"
                value={passwordData.new}
                onChange={(e) => setPasswordData(p => ({ ...p, new: e.target.value }))}
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-pass" className="text-sm font-medium">Confirmar contraseña</Label>
              <Input
                id="confirm-pass"
                type="password"
                value={passwordData.confirm}
                onChange={(e) => setPasswordData(p => ({ ...p, confirm: e.target.value }))}
                placeholder="••••••••"
              />
            </div>
          </div>
          <Button
            onClick={handleChangePassword}
            disabled={changingPassword || !passwordData.new}
            variant="outline"
            className="gap-2"
          >
            {changingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}
            Cambiar contraseña
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

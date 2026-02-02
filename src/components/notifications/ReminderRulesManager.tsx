import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Edit2, Trash2, Clock, Building2, Loader2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface ReminderRule {
  id: string;
  nombre: string;
  tipo: string;
  dias_antes: number;
  activa: boolean;
  empresa_id: string | null;
  empresa_nombre?: string;
  ultima_ejecucion: string | null;
  created_at: string;
}

interface Empresa {
  id: string;
  razon_social: string;
}

const TIPOS = [
  { value: 'certificacion', label: 'Certificación IVA/IEPS', icon: '🏆' },
  { value: 'immex', label: 'Programa IMMEX', icon: '📋' },
  { value: 'prosec', label: 'Programa PROSEC', icon: '📊' },
  { value: 'documento', label: 'Documentos', icon: '📄' },
  { value: 'matriz_seguridad', label: 'Matriz de Seguridad', icon: '🛡️' },
  { value: 'general', label: 'General', icon: '🔔' },
];

const DIAS_SUGERIDOS = [1, 3, 7, 15, 30, 60, 90, 180];

export function ReminderRulesManager() {
  const { user } = useAuth();
  const [rules, setRules] = useState<ReminderRule[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ReminderRule | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    nombre: '',
    tipo: 'certificacion',
    dias_antes: 30,
    activa: true,
    empresa_id: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load rules
      const { data: rulesData, error: rulesError } = await (supabase as any)
        .from('reminder_rules')
        .select('*')
        .order('tipo', { ascending: true })
        .order('dias_antes', { ascending: false });

      if (rulesError) throw rulesError;

      // Load empresas for reference
      const { data: empresasData, error: empresasError } = await supabase
        .from('empresas')
        .select('id, razon_social')
        .order('razon_social');

      if (empresasError) throw empresasError;

      // Map empresa names to rules
      const empresaMap = new Map(empresasData?.map(e => [e.id, e.razon_social]) || []);
      const rulesWithEmpresas = (rulesData || []).map((rule: ReminderRule) => ({
        ...rule,
        empresa_nombre: rule.empresa_id ? empresaMap.get(rule.empresa_id) : null
      }));

      setRules(rulesWithEmpresas);
      setEmpresas(empresasData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error al cargar reglas');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (rule?: ReminderRule) => {
    if (rule) {
      setEditingRule(rule);
      setFormData({
        nombre: rule.nombre,
        tipo: rule.tipo,
        dias_antes: rule.dias_antes,
        activa: rule.activa,
        empresa_id: rule.empresa_id || ''
      });
    } else {
      setEditingRule(null);
      setFormData({
        nombre: '',
        tipo: 'certificacion',
        dias_antes: 30,
        activa: true,
        empresa_id: ''
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        nombre: formData.nombre,
        tipo: formData.tipo,
        dias_antes: formData.dias_antes,
        activa: formData.activa,
        empresa_id: formData.empresa_id || null,
        created_by: user?.id
      };

      if (editingRule) {
        const { error } = await (supabase as any)
          .from('reminder_rules')
          .update(payload)
          .eq('id', editingRule.id);

        if (error) throw error;
        toast.success('Regla actualizada');
      } else {
        const { error } = await (supabase as any)
          .from('reminder_rules')
          .insert(payload);

        if (error) throw error;
        toast.success('Regla creada');
      }

      setDialogOpen(false);
      loadData();
    } catch (error) {
      console.error('Error saving rule:', error);
      toast.error('Error al guardar regla');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (rule: ReminderRule) => {
    try {
      const { error } = await (supabase as any)
        .from('reminder_rules')
        .update({ activa: !rule.activa })
        .eq('id', rule.id);

      if (error) throw error;

      setRules(prev => prev.map(r => 
        r.id === rule.id ? { ...r, activa: !r.activa } : r
      ));

      toast.success(rule.activa ? 'Regla desactivada' : 'Regla activada');
    } catch (error) {
      console.error('Error toggling rule:', error);
      toast.error('Error al actualizar regla');
    }
  };

  const handleDelete = async (rule: ReminderRule) => {
    try {
      const { error } = await (supabase as any)
        .from('reminder_rules')
        .delete()
        .eq('id', rule.id);

      if (error) throw error;

      setRules(prev => prev.filter(r => r.id !== rule.id));
      toast.success('Regla eliminada');
    } catch (error) {
      console.error('Error deleting rule:', error);
      toast.error('Error al eliminar regla');
    }
  };

  const getTipoInfo = (tipo: string) => {
    return TIPOS.find(t => t.value === tipo) || { label: tipo, icon: '🔔' };
  };

  // Group rules by tipo
  const groupedRules = rules.reduce((acc, rule) => {
    if (!acc[rule.tipo]) {
      acc[rule.tipo] = [];
    }
    acc[rule.tipo].push(rule);
    return acc;
  }, {} as Record<string, ReminderRule[]>);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Reglas de Recordatorio</h2>
          <p className="text-sm text-muted-foreground">
            Configura cuántos días antes se envían alertas de vencimiento
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()} className="gap-2">
              <Plus className="h-4 w-4" />
              Nueva Regla
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingRule ? 'Editar Regla' : 'Nueva Regla de Recordatorio'}
              </DialogTitle>
              <DialogDescription>
                Configura cuándo se debe enviar la alerta de vencimiento
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre de la regla</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                  placeholder="Ej: Certificación IVA - 30 días"
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="tipo">Tipo de vencimiento</Label>
                  <Select
                    value={formData.tipo}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, tipo: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS.map(tipo => (
                        <SelectItem key={tipo.value} value={tipo.value}>
                          <span className="flex items-center gap-2">
                            <span>{tipo.icon}</span>
                            {tipo.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dias_antes">Días de anticipación</Label>
                  <Select
                    value={formData.dias_antes.toString()}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, dias_antes: parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DIAS_SUGERIDOS.map(dias => (
                        <SelectItem key={dias} value={dias.toString()}>
                          {dias} {dias === 1 ? 'día' : 'días'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="empresa_id">Aplica a empresa</Label>
                <Select
                  value={formData.empresa_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, empresa_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas las empresas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todas las empresas</SelectItem>
                    {empresas.map(empresa => (
                      <SelectItem key={empresa.id} value={empresa.id}>
                        {empresa.razon_social}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="activa">Regla activa</Label>
                <Switch
                  id="activa"
                  checked={formData.activa}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, activa: checked }))}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingRule ? 'Guardar Cambios' : 'Crear Regla'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {rules.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-1">No hay reglas configuradas</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Crea reglas para recibir alertas antes de los vencimientos
            </p>
            <Button onClick={() => handleOpenDialog()} className="gap-2">
              <Plus className="h-4 w-4" />
              Crear Primera Regla
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedRules).map(([tipo, tipoRules]) => {
            const tipoInfo = getTipoInfo(tipo);
            return (
              <Card key={tipo}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <span className="text-xl">{tipoInfo.icon}</span>
                    {tipoInfo.label}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {tipoRules.map(rule => (
                    <div
                      key={rule.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        rule.activa 
                          ? 'bg-card' 
                          : 'bg-muted/50 opacity-60'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium truncate">{rule.nombre}</span>
                          <Badge variant={rule.activa ? 'default' : 'secondary'} className="shrink-0">
                            {rule.activa ? 'Activa' : 'Inactiva'}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {rule.dias_antes} días antes
                          </span>
                          {rule.empresa_nombre ? (
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {rule.empresa_nombre}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              Todas las empresas
                            </span>
                          )}
                          {rule.ultima_ejecucion && (
                            <span>
                              Última ejecución: {formatDistanceToNow(new Date(rule.ultima_ejecucion), { addSuffix: true, locale: es })}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <Switch
                          checked={rule.activa}
                          onCheckedChange={() => handleToggleActive(rule)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(rule)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar regla?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción no se puede deshacer. Se eliminará permanentemente la regla "{rule.nombre}".
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(rule)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Zap, Plus, Trash2, Edit, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface AutomationRule {
  id: string;
  nombre: string;
  descripcion: string | null;
  trigger_type: string;
  condiciones: any;
  acciones: any;
  activa: boolean;
  prioridad: number;
}

export function ManageAutomations() {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);

  // Form state
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [triggerType, setTriggerType] = useState('tarea_creada');
  const [prioridad, setPrioridad] = useState(0);
  const [activa, setActiva] = useState(true);

  // Condition state
  const [condicionCampo, setCondicionCampo] = useState('estado');
  const [condicionValor, setCondicionValor] = useState('');

  // Action state
  const [accionTipo, setAccionTipo] = useState('asignar_consultor');
  const [accionValor, setAccionValor] = useState('');

  const [consultores, setConsultores] = useState<any[]>([]);

  useEffect(() => {
    fetchRules();
    fetchConsultores();
  }, []);

  const fetchRules = async () => {
    try {
      const { data, error } = await supabase
        .from('automation_rules')
        .select('*')
        .order('prioridad', { ascending: false });

      if (error) throw error;
      setRules((data || []) as AutomationRule[]);
    } catch (error) {
      console.error('Error fetching rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchConsultores = async () => {
    try {
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'consultor');

      const consultorIds = userRoles?.map(r => r.user_id) || [];
      
      if (consultorIds.length > 0) {
        const { data } = await supabase
          .from('profiles')
          .select('id, nombre_completo')
          .in('id', consultorIds);
        
        setConsultores(data || []);
      }
    } catch (error) {
      console.error('Error fetching consultores:', error);
    }
  };

  const handleSubmit = async () => {
    if (!nombre || !triggerType) {
      toast.error('Nombre y tipo de disparador son requeridos');
      return;
    }

    try {
      const condiciones = condicionCampo && condicionValor 
        ? { [condicionCampo]: condicionValor }
        : {};

      const acciones = accionTipo && accionValor
        ? [{ tipo: accionTipo, valor: accionValor }]
        : [];

      const ruleData = {
        nombre,
        descripcion,
        trigger_type: triggerType,
        condiciones,
        acciones,
        prioridad,
        activa,
        created_by: (await supabase.auth.getUser()).data.user?.id
      };

      if (editingRule) {
        const { error } = await supabase
          .from('automation_rules')
          .update(ruleData)
          .eq('id', editingRule.id);

        if (error) throw error;
        toast.success('Regla actualizada');
      } else {
        const { error } = await supabase
          .from('automation_rules')
          .insert(ruleData);

        if (error) throw error;
        toast.success('Regla creada');
      }

      resetForm();
      setDialogOpen(false);
      fetchRules();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('automation_rules')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchRules();
      toast.success('Regla eliminada');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleToggleActive = async (rule: AutomationRule) => {
    try {
      const { error } = await supabase
        .from('automation_rules')
        .update({ activa: !rule.activa })
        .eq('id', rule.id);

      if (error) throw error;
      fetchRules();
      toast.success(rule.activa ? 'Regla desactivada' : 'Regla activada');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleEdit = (rule: AutomationRule) => {
    setEditingRule(rule);
    setNombre(rule.nombre);
    setDescripcion(rule.descripcion || '');
    setTriggerType(rule.trigger_type);
    setPrioridad(rule.prioridad);
    setActiva(rule.activa);
    
    // Load first condition if exists
    const firstCondition = Object.entries(rule.condiciones || {})[0];
    if (firstCondition) {
      setCondicionCampo(firstCondition[0]);
      setCondicionValor(firstCondition[1] as string);
    }

    // Load first action if exists
    if (rule.acciones && Array.isArray(rule.acciones) && rule.acciones.length > 0) {
      setAccionTipo(rule.acciones[0].tipo);
      setAccionValor(rule.acciones[0].valor);
    }

    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingRule(null);
    setNombre('');
    setDescripcion('');
    setTriggerType('tarea_creada');
    setPrioridad(0);
    setActiva(true);
    setCondicionCampo('estado');
    setCondicionValor('');
    setAccionTipo('asignar_consultor');
    setAccionValor('');
  };

  const getTriggerLabel = (trigger: string) => {
    const labels: Record<string, string> = {
      'tarea_creada': 'Tarea Creada',
      'tarea_actualizada': 'Tarea Actualizada',
      'estado_cambiado': 'Estado Cambiado',
      'fecha_vencimiento': 'Fecha Vencimiento'
    };
    return labels[trigger] || trigger;
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={(open) => {
      setDialogOpen(open);
      if (!open) resetForm();
    }}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-heading font-semibold flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Automatizaciones
            </h3>
            <p className="text-sm text-muted-foreground">
              Crea reglas para automatizar acciones en las tareas
            </p>
          </div>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Regla
            </Button>
          </DialogTrigger>
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Cargando...</div>
        ) : rules.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Zap className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No hay reglas de automatización</p>
              <p className="text-xs mt-1">Crea tu primera regla para empezar</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {rules.map((rule) => (
              <Card key={rule.id} className={!rule.activa ? 'opacity-60' : ''}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-heading font-medium">{rule.nombre}</h4>
                        <Badge variant={rule.activa ? 'default' : 'secondary'}>
                          {rule.activa ? 'Activa' : 'Inactiva'}
                        </Badge>
                        <Badge variant="outline">{getTriggerLabel(rule.trigger_type)}</Badge>
                      </div>
                      {rule.descripcion && (
                        <p className="text-sm text-muted-foreground mb-2">{rule.descripcion}</p>
                      )}
                      <div className="flex flex-wrap gap-2 text-xs">
                        {Object.entries(rule.condiciones || {}).length > 0 && (
                          <Badge variant="outline" className="font-normal">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            {Object.entries(rule.condiciones || {}).map(([key, value]) => 
                              `${key}: ${value}`
                            ).join(', ')}
                          </Badge>
                        )}
                        {rule.acciones && Array.isArray(rule.acciones) && rule.acciones.length > 0 && (
                          <Badge variant="outline" className="font-normal">
                            <Zap className="w-3 h-3 mr-1" />
                            {rule.acciones.map((a: any) => a.tipo).join(', ')}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={rule.activa}
                        onCheckedChange={() => handleToggleActive(rule)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(rule)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(rule.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingRule ? 'Editar' : 'Nueva'} Regla de Automatización</DialogTitle>
          <DialogDescription>
            Define cuándo y cómo se ejecutará la automatización
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre de la Regla *</Label>
            <Input
              id="nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Auto-asignar tareas urgentes"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea
              id="descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Describe qué hace esta regla..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="trigger">Disparador *</Label>
              <Select value={triggerType} onValueChange={setTriggerType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tarea_creada">Tarea Creada</SelectItem>
                  <SelectItem value="tarea_actualizada">Tarea Actualizada</SelectItem>
                  <SelectItem value="estado_cambiado">Estado Cambiado</SelectItem>
                  <SelectItem value="fecha_vencimiento">Fecha Vencimiento</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="prioridad">Prioridad</Label>
              <Input
                id="prioridad"
                type="number"
                value={prioridad}
                onChange={(e) => setPrioridad(parseInt(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Condición (opcional)</Label>
            <div className="grid grid-cols-2 gap-2">
              <Select value={condicionCampo} onValueChange={setCondicionCampo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="estado">Estado</SelectItem>
                  <SelectItem value="prioridad">Prioridad</SelectItem>
                  <SelectItem value="categoria">Categoría</SelectItem>
                </SelectContent>
              </Select>
              <Input
                value={condicionValor}
                onChange={(e) => setCondicionValor(e.target.value)}
                placeholder="Valor..."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Acción (opcional)</Label>
            <div className="grid grid-cols-2 gap-2">
              <Select value={accionTipo} onValueChange={setAccionTipo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asignar_consultor">Asignar Consultor</SelectItem>
                  <SelectItem value="cambiar_estado">Cambiar Estado</SelectItem>
                  <SelectItem value="cambiar_prioridad">Cambiar Prioridad</SelectItem>
                  <SelectItem value="enviar_notificacion">Enviar Notificación</SelectItem>
                </SelectContent>
              </Select>
              {accionTipo === 'asignar_consultor' ? (
                <Select value={accionValor} onValueChange={setAccionValor}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona consultor" />
                  </SelectTrigger>
                  <SelectContent>
                    {consultores.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nombre_completo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={accionValor}
                  onChange={(e) => setAccionValor(e.target.value)}
                  placeholder="Valor de acción..."
                />
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="activa"
              checked={activa}
              onCheckedChange={setActiva}
            />
            <Label htmlFor="activa">Regla activa</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setDialogOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>
            {editingRule ? 'Actualizar' : 'Crear'} Regla
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

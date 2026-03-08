import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  ClipboardCheck, FileCheck, Ship, Factory, Calendar as CalendarIcon,
  AlertCircle, CheckCircle2, RefreshCw, Pencil, StickyNote, Check, X
} from 'lucide-react';
import { format, differenceInDays, isPast, isValid, addYears } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface EmpresaObligacionesCardProps {
  empresa: any;
  canEdit?: boolean;
  onUpdate?: () => void;
}

interface ObligacionItem {
  label: string;
  fecha?: string | null;
  tipo: 'vencimiento' | 'renovacion' | 'info';
  field: string; // empresa field name for updating
}

interface ObligacionSection {
  title: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  items: ObligacionItem[];
  hasData: boolean;
  noteField?: string;
  noteValue?: string | null;
}

function getStatusBadge(fecha: string | null | undefined) {
  if (!fecha) return null;
  const date = new Date(fecha);
  if (!isValid(date)) return null;
  const today = new Date();
  const daysUntil = differenceInDays(date, today);

  if (isPast(date)) {
    return (
      <Badge variant="destructive" className="text-xs gap-1">
        <AlertCircle className="w-3 h-3" />Vencido
      </Badge>
    );
  }
  if (daysUntil <= 30) {
    return (
      <Badge className="bg-warning/20 text-warning border-warning/30 text-xs gap-1">
        <AlertCircle className="w-3 h-3" />{daysUntil} días
      </Badge>
    );
  }
  if (daysUntil <= 90) {
    return (
      <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30 text-xs gap-1">
        <CalendarIcon className="w-3 h-3" />{daysUntil} días
      </Badge>
    );
  }
  return (
    <Badge className="bg-success/20 text-success border-success/30 text-xs gap-1">
      <CheckCircle2 className="w-3 h-3" />Vigente
    </Badge>
  );
}

function formatDate(fecha: string | null | undefined) {
  if (!fecha) return 'No registrado';
  const date = new Date(fecha);
  if (!isValid(date)) return 'Fecha inválida';
  return format(date, "d 'de' MMMM, yyyy", { locale: es });
}

function ObligacionRow({ 
  item, canEdit, empresaId, onUpdate 
}: { 
  item: ObligacionItem; canEdit?: boolean; empresaId: string; onUpdate?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    item.fecha ? new Date(item.fecha) : undefined
  );
  const [saving, setSaving] = useState(false);

  const handleSaveDate = async (date: Date | undefined) => {
    if (!date) return;
    setSaving(true);
    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      const { error } = await supabase
        .from('empresas')
        .update({ [item.field]: dateStr + 'T12:00:00' })
        .eq('id', empresaId);
      if (error) throw error;
      toast.success('Fecha actualizada');
      setEditing(false);
      onUpdate?.();
    } catch {
      toast.error('Error al actualizar fecha');
    } finally {
      setSaving(false);
    }
  };

  const handleRenew = async () => {
    if (!item.fecha) return;
    const currentDate = new Date(item.fecha);
    const newDate = addYears(currentDate, 1);
    await handleSaveDate(newDate);
  };

  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0 group">
      <span className="text-sm text-muted-foreground">{item.label}</span>
      <div className="flex items-center gap-2">
        {editing ? (
          <Popover open={true} onOpenChange={(open) => !open && setEditing(false)}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="text-xs h-7" disabled={saving}>
                {selectedDate ? format(selectedDate, 'dd/MM/yyyy') : 'Seleccionar'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  setSelectedDate(date);
                  if (date) handleSaveDate(date);
                }}
                initialFocus
                captionLayout="dropdown-buttons"
                fromYear={1990}
                toYear={2100}
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        ) : (
          <>
            <span className="text-sm font-medium">{formatDate(item.fecha)}</span>
            {item.tipo === 'vencimiento' && getStatusBadge(item.fecha)}
            {canEdit && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setEditing(true)}
                  title="Editar fecha"
                >
                  <Pencil className="w-3 h-3" />
                </Button>
                {item.tipo === 'vencimiento' && item.fecha && isPast(new Date(item.fecha)) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-success hover:text-success hover:bg-success/10"
                    onClick={handleRenew}
                    title="Renovar (+1 año)"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function SectionNotes({
  empresaId, noteField, noteValue, canEdit, onUpdate
}: {
  empresaId: string; noteField: string; noteValue?: string | null; canEdit?: boolean; onUpdate?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState(noteValue || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('empresas')
        .update({ [noteField]: note || null })
        .eq('id', empresaId);
      if (error) throw error;
      toast.success('Nota guardada');
      setEditing(false);
      onUpdate?.();
    } catch {
      toast.error('Error al guardar nota');
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className="mt-3 pt-3 border-t border-dashed space-y-2">
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Agregar nota..."
          className="text-sm min-h-[60px]"
          autoFocus
        />
        <div className="flex gap-1 justify-end">
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setEditing(false); setNote(noteValue || ''); }}>
            <X className="w-3 h-3 mr-1" />Cancelar
          </Button>
          <Button size="sm" className="h-7 text-xs" onClick={handleSave} disabled={saving}>
            <Check className="w-3 h-3 mr-1" />Guardar
          </Button>
        </div>
      </div>
    );
  }

  if (noteValue) {
    return (
      <div className="mt-3 pt-3 border-t border-dashed">
        <div className="flex items-start gap-2 group/note">
          <StickyNote className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground flex-1">{noteValue}</p>
          {canEdit && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 opacity-0 group-hover/note:opacity-100 transition-opacity"
              onClick={() => setEditing(true)}
            >
              <Pencil className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (canEdit) {
    return (
      <div className="mt-3 pt-3 border-t border-dashed">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs text-muted-foreground w-full"
          onClick={() => setEditing(true)}
        >
          <StickyNote className="w-3 h-3 mr-1" />Agregar nota
        </Button>
      </div>
    );
  }

  return null;
}

function ObligacionSectionCard({ 
  section, canEdit, empresaId, onUpdate 
}: { 
  section: ObligacionSection; canEdit?: boolean; empresaId: string; onUpdate?: () => void;
}) {
  if (!section.hasData) {
    return (
      <div className={`rounded-lg border-2 border-dashed p-4 ${section.bgColor}`}>
        <div className="flex items-center gap-3 mb-2">
          <div className={`p-2 rounded-lg ${section.color}`}>{section.icon}</div>
          <h4 className="font-heading font-semibold">{section.title}</h4>
        </div>
        <p className="text-sm text-muted-foreground text-center py-2">Sin información registrada</p>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border p-4 ${section.bgColor}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2 rounded-lg ${section.color}`}>{section.icon}</div>
        <h4 className="font-heading font-semibold">{section.title}</h4>
      </div>
      <div className="space-y-1">
        {section.items.map((item, idx) => (
          <ObligacionRow key={idx} item={item} canEdit={canEdit} empresaId={empresaId} onUpdate={onUpdate} />
        ))}
      </div>
      {section.noteField && (
        <SectionNotes
          empresaId={empresaId}
          noteField={section.noteField}
          noteValue={section.noteValue}
          canEdit={canEdit}
          onUpdate={onUpdate}
        />
      )}
    </div>
  );
}

export function EmpresaObligacionesCard({ empresa, canEdit, onUpdate }: EmpresaObligacionesCardProps) {
  const sections: ObligacionSection[] = [
    {
      title: 'Obligaciones Generales',
      icon: <ClipboardCheck className="w-5 h-5 text-blue-600" />,
      color: 'bg-blue-100 dark:bg-blue-900/30',
      bgColor: 'bg-blue-50/50 dark:bg-blue-950/20',
      hasData: !!(empresa.matriz_seguridad_fecha_vencimiento || empresa.matriz_seguridad_fecha_renovar),
      items: [
        { label: 'Matriz Seguridad - Vencimiento', fecha: empresa.matriz_seguridad_fecha_vencimiento, tipo: 'vencimiento', field: 'matriz_seguridad_fecha_vencimiento' },
        { label: 'Matriz Seguridad - Renovar', fecha: empresa.matriz_seguridad_fecha_renovar, tipo: 'renovacion', field: 'matriz_seguridad_fecha_renovar' },
      ]
    },
    {
      title: 'Certificación IVA/IEPS',
      icon: <FileCheck className="w-5 h-5 text-emerald-600" />,
      color: 'bg-emerald-100 dark:bg-emerald-900/30',
      bgColor: 'bg-emerald-50/50 dark:bg-emerald-950/20',
      hasData: !!(empresa.cert_iva_ieps_oficio || empresa.cert_iva_ieps_fecha_vencimiento || empresa.cert_iva_ieps_fecha_autorizacion),
      noteField: 'cert_iva_ieps_nota',
      noteValue: empresa.cert_iva_ieps_nota,
      items: [
        { label: 'Autorización', fecha: empresa.cert_iva_ieps_fecha_autorizacion, tipo: 'info', field: 'cert_iva_ieps_fecha_autorizacion' },
        { label: 'Última Renovación', fecha: empresa.cert_iva_ieps_fecha_ultima_renovacion, tipo: 'info', field: 'cert_iva_ieps_fecha_ultima_renovacion' },
        { label: 'Vencimiento', fecha: empresa.cert_iva_ieps_fecha_vencimiento, tipo: 'vencimiento', field: 'cert_iva_ieps_fecha_vencimiento' },
        { label: 'Fecha para Renovar', fecha: empresa.cert_iva_ieps_fecha_renovar, tipo: 'renovacion', field: 'cert_iva_ieps_fecha_renovar' },
      ]
    },
    {
      title: 'Programa IMMEX',
      icon: <Ship className="w-5 h-5 text-purple-600" />,
      color: 'bg-purple-100 dark:bg-purple-900/30',
      bgColor: 'bg-purple-50/50 dark:bg-purple-950/20',
      hasData: !!(empresa.immex_numero || empresa.immex_fecha_autorizacion),
      items: [
        { label: 'Autorización', fecha: empresa.immex_fecha_autorizacion, tipo: 'info', field: 'immex_fecha_autorizacion' },
        { label: 'Inicio Vigencia', fecha: empresa.immex_fecha_inicio, tipo: 'info', field: 'immex_fecha_inicio' },
        { label: 'Fin Vigencia', fecha: empresa.immex_fecha_fin, tipo: 'vencimiento', field: 'immex_fecha_fin' },
      ]
    },
    {
      title: 'Programa PROSEC',
      icon: <Factory className="w-5 h-5 text-amber-600" />,
      color: 'bg-amber-100 dark:bg-amber-900/30',
      bgColor: 'bg-amber-50/50 dark:bg-amber-950/20',
      hasData: !!(empresa.prosec_numero || empresa.prosec_fecha_autorizacion),
      items: [
        { label: 'Autorización', fecha: empresa.prosec_fecha_autorizacion, tipo: 'info', field: 'prosec_fecha_autorizacion' },
        { label: 'Inicio Vigencia', fecha: empresa.prosec_fecha_inicio, tipo: 'info', field: 'prosec_fecha_inicio' },
        { label: 'Fin Vigencia', fecha: empresa.prosec_fecha_fin, tipo: 'vencimiento', field: 'prosec_fecha_fin' },
      ]
    },
  ];

  const upcomingCount = sections.reduce((count, section) => {
    return count + section.items.filter(item => {
      if (item.tipo !== 'vencimiento' || !item.fecha) return false;
      const date = new Date(item.fecha);
      if (!isValid(date)) return false;
      const daysUntil = differenceInDays(date, new Date());
      return daysUntil >= 0 && daysUntil <= 90;
    }).length;
  }, 0);

  const expiredCount = sections.reduce((count, section) => {
    return count + section.items.filter(item => {
      if (item.tipo !== 'vencimiento' || !item.fecha) return false;
      const date = new Date(item.fecha);
      if (!isValid(date)) return false;
      return isPast(date);
    }).length;
  }, 0);

  return (
    <Card className="gradient-card shadow-card col-span-1 lg:col-span-2">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="font-heading flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Control de Obligaciones
          </CardTitle>
          <div className="flex items-center gap-2">
            {expiredCount > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertCircle className="w-3 h-3" />{expiredCount} vencido(s)
              </Badge>
            )}
            {upcomingCount > 0 && (
              <Badge className="bg-warning/20 text-warning border-warning/30 gap-1">
                <CalendarIcon className="w-3 h-3" />{upcomingCount} próximo(s)
              </Badge>
            )}
            {expiredCount === 0 && upcomingCount === 0 && (
              <Badge className="bg-success/20 text-success border-success/30 gap-1">
                <CheckCircle2 className="w-3 h-3" />Todo en orden
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sections.map((section, idx) => (
            <ObligacionSectionCard key={idx} section={section} canEdit={canEdit} empresaId={empresa.id} onUpdate={onUpdate} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

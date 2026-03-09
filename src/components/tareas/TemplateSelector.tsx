import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { FileText, Repeat, Clock, Check, ChevronRight } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface TemplateSelectorProps {
  onSelect: (template: any) => void;
}

const PRIORITY_STYLES: Record<string, string> = {
  alta: 'bg-destructive/10 text-destructive border-destructive/20',
  media: 'bg-warning/10 text-warning-foreground border-warning/20',
  baja: 'bg-success/10 text-success-foreground border-success/20',
};

export function TemplateSelector({ onSelect }: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('tarea_templates')
        .select('*, categorias_tareas(nombre, color)')
        .order('veces_usado', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (template: any) => {
    setSelectedId(template.id);
    onSelect(template);

    // Increment usage counter
    try {
      await supabase.rpc('increment_template_usage', { template_id: template.id });
    } catch (error) {
      console.error('Error incrementing template usage:', error);
    }

    // Reset animation after delay
    setTimeout(() => {
      setSelectedId(null);
      setIsOpen(false);
    }, 600);
  };

  if (loading || templates.length === 0) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center gap-2 w-full py-2 px-3 rounded-lg text-sm transition-all group",
            "hover:bg-primary/5 text-muted-foreground hover:text-foreground",
            isOpen && "bg-primary/5 text-foreground"
          )}
        >
          <div className={cn(
            "h-7 w-7 rounded-md flex items-center justify-center shrink-0 transition-colors",
            isOpen ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
          )}>
            <FileText className="h-3.5 w-3.5" />
          </div>
          <span className="font-heading font-medium">Usar Template</span>
          <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
            {templates.length}
          </Badge>
          <ChevronRight className={cn(
            "h-3.5 w-3.5 ml-auto transition-transform text-muted-foreground",
            isOpen && "rotate-90"
          )} />
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent className="pt-2">
        <div className="grid gap-1.5 max-h-[200px] overflow-y-auto pr-1">
          {templates.map((template) => {
            const isSelected = selectedId === template.id;
            const hasRecurrence = template.campos_personalizados?.es_recurrente;
            const subtareasCount = (template.subtareas_template as any[])?.length || 0;

            return (
              <button
                key={template.id}
                type="button"
                onClick={() => handleSelect(template)}
                className={cn(
                  "w-full text-left px-3 py-2.5 rounded-lg border transition-all",
                  "hover:border-primary/30 hover:bg-primary/5 hover:shadow-sm",
                  isSelected
                    ? "border-success/50 bg-success/10 scale-[0.98]"
                    : "border-border bg-card"
                )}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {isSelected ? (
                        <Check className="h-3.5 w-3.5 text-success shrink-0 animate-in zoom-in-50" />
                      ) : (
                        <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      )}
                      <span className="font-heading font-medium text-sm truncate">
                        {template.nombre}
                      </span>
                    </div>
                    {template.descripcion && (
                      <p className="text-xs text-muted-foreground mt-0.5 ml-5 line-clamp-1">
                        {template.descripcion}
                      </p>
                    )}
                    <div className="flex items-center gap-1 mt-1.5 ml-5 flex-wrap">
                      <Badge
                        variant="outline"
                        className={cn("text-[10px] px-1.5 py-0 border", PRIORITY_STYLES[template.prioridad] || '')}
                      >
                        {template.prioridad === 'alta' ? 'Alta' : template.prioridad === 'media' ? 'Media' : 'Baja'}
                      </Badge>
                      {template.duracion_dias && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5">
                          <Clock className="h-2.5 w-2.5" />
                          {template.duracion_dias}d
                        </Badge>
                      )}
                      {hasRecurrence && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5">
                          <Repeat className="h-2.5 w-2.5" />
                          Recurrente
                        </Badge>
                      )}
                      {template.categorias_tareas && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {template.categorias_tareas.nombre}
                        </Badge>
                      )}
                      {subtareasCount > 0 && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {subtareasCount} subtareas
                        </Badge>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">
                    {template.veces_usado} usos
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

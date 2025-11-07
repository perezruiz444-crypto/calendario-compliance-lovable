import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { FileText } from 'lucide-react';

interface TemplateSelectorProps {
  onSelect: (template: any) => void;
}

export function TemplateSelector({ onSelect }: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('tarea_templates')
        .select('*')
        .order('veces_usado', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      onSelect(template);
      
      // Increment usage counter
      try {
        await supabase.rpc('increment_template_usage', { template_id: templateId });
      } catch (error) {
        console.error('Error incrementing template usage:', error);
      }
    }
  };

  if (loading || templates.length === 0) {
    return null;
  }

  return (
    <Select onValueChange={handleSelect}>
      <SelectTrigger className="font-body">
        <SelectValue placeholder="Selecciona un template..." />
      </SelectTrigger>
      <SelectContent>
        {templates.map((template) => (
          <SelectItem key={template.id} value={template.id}>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <div>
                <p className="font-medium">{template.nombre}</p>
                {template.descripcion && (
                  <p className="text-xs text-muted-foreground">{template.descripcion}</p>
                )}
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Building2, User, AlertCircle, Tag } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface TareaPreviewProps {
  formData: {
    titulo: string;
    descripcion: string;
    prioridad: string;
    fecha_vencimiento: string;
    empresa_id: string;
    consultor_asignado_id: string;
    categoria_id: string;
  };
  empresas: any[];
  consultores: any[];
  categorias?: any[];
}

export function TareaPreview({ formData, empresas, consultores, categorias = [] }: TareaPreviewProps) {
  const empresa = empresas.find(e => e.id === formData.empresa_id);
  const consultor = consultores.find(c => c.id === formData.consultor_asignado_id);
  const categoria = categorias.find(c => c.id === formData.categoria_id);

  const getPrioridadColor = (prioridad: string) => {
    switch (prioridad) {
      case 'alta': return 'destructive';
      case 'media': return 'default';
      case 'baja': return 'secondary';
      default: return 'outline';
    }
  };

  const getPrioridadLabel = (prioridad: string) => {
    switch (prioridad) {
      case 'alta': return 'Alta';
      case 'media': return 'Media';
      case 'baja': return 'Baja';
      default: return prioridad;
    }
  };

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <CardTitle className="text-lg font-heading line-clamp-2">
              {formData.titulo || 'Sin título'}
            </CardTitle>
            {formData.descripcion && (
              <CardDescription className="mt-2 line-clamp-3">
                {formData.descripcion}
              </CardDescription>
            )}
          </div>
          <Badge variant={getPrioridadColor(formData.prioridad)}>
            {getPrioridadLabel(formData.prioridad)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {empresa && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Building2 className="w-4 h-4" />
            <span>{empresa.razon_social}</span>
          </div>
        )}
        
        {consultor && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="w-4 h-4" />
            <span>{consultor.nombre_completo}</span>
          </div>
        )}

        {categoria && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Tag className="w-4 h-4" />
            <span>{categoria.nombre}</span>
          </div>
        )}
        
        {formData.fecha_vencimiento && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>
              Vence: {format(new Date(formData.fecha_vencimiento), 'PPP', { locale: es })}
            </span>
          </div>
        )}

        {!formData.titulo && (
          <div className="flex items-center gap-2 text-warning">
            <AlertCircle className="w-4 h-4" />
            <span className="text-xs">Completa el título para continuar</span>
          </div>
        )}

        {!empresa && (
          <div className="flex items-center gap-2 text-warning">
            <AlertCircle className="w-4 h-4" />
            <span className="text-xs">Selecciona una empresa</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

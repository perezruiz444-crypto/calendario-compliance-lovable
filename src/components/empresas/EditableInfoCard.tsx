import { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pencil, X, Check, Loader2, LucideIcon } from 'lucide-react';

interface EditableInfoCardProps {
  title: string;
  icon: LucideIcon;
  canEdit: boolean;
  isEditing: boolean;
  isSaving: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  children: ReactNode;
}

/**
 * Card reutilizable para secciones editables (PROSEC, IMMEX, Certificación, Padrón).
 * Encapsula el header con botones Pencil/X/Check y el wrapper visual.
 * El contenido (form/view) se pasa como children.
 */
export function EditableInfoCard({
  title,
  icon: Icon,
  canEdit,
  isEditing,
  isSaving,
  onEdit,
  onCancel,
  onSave,
  children,
}: EditableInfoCardProps) {
  return (
    <Card className="gradient-card shadow-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="font-heading flex items-center gap-2">
          <Icon className="w-5 h-5" />
          {title}
        </CardTitle>
        {canEdit && (
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button variant="ghost" size="sm" onClick={onCancel} disabled={isSaving}>
                  <X className="w-4 h-4" />
                </Button>
                <Button size="sm" onClick={onSave} disabled={isSaving} className="gradient-primary">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                </Button>
              </>
            ) : (
              <Button variant="ghost" size="sm" onClick={onEdit}>
                <Pencil className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

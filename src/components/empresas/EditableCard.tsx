import { useState, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pencil, X, Check, Loader2 } from 'lucide-react';

interface EditableCardProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  editForm?: ReactNode;
  onSave?: () => Promise<void>;
  canEdit?: boolean;
  className?: string;
}

export function EditableCard({
  title,
  icon,
  children,
  editForm,
  onSave,
  canEdit = true,
  className = ''
}: EditableCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!onSave) return;
    setIsSaving(true);
    try {
      await onSave();
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  return (
    <Card className={`gradient-card shadow-card ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="font-heading flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
        {canEdit && editForm && (
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancel}
                  disabled={isSaving}
                >
                  <X className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="gradient-primary"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                </Button>
              </>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                <Pencil className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {isEditing && editForm ? editForm : children}
      </CardContent>
    </Card>
  );
}

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface InlineEditFieldProps {
  label: string;
  value: string | null | undefined;
  isEditing: boolean;
  onChange: (value: string) => void;
  type?: 'text' | 'textarea' | 'date' | 'tel';
  placeholder?: string;
}

export function InlineEditField({
  label,
  value,
  isEditing,
  onChange,
  type = 'text',
  placeholder
}: InlineEditFieldProps) {
  if (isEditing) {
    return (
      <div>
        <label className="text-sm font-heading font-medium text-muted-foreground">{label}</label>
        {type === 'textarea' ? (
          <Textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder || label}
            className="mt-1"
          />
        ) : (
          <Input
            type={type}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder || label}
            className="mt-1"
          />
        )}
      </div>
    );
  }

  return (
    <div>
      <label className="text-sm font-heading font-medium text-muted-foreground">{label}</label>
      <p className="font-body mt-1">{value || '-'}</p>
    </div>
  );
}

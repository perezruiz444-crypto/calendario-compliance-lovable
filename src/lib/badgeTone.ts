import type { VariantProps } from 'class-variance-authority';
import type { badgeVariants } from '@/components/ui/badge';

export type BadgeTone = 'destructive' | 'warning' | 'success' | 'primary' | 'secondary' | 'default';

/**
 * `Badge` solo define las variantes default | secondary | destructive | outline.
 * Los tonos semánticos warning y success se resuelven con `outline` + color de texto/borde.
 */
export function badgeTone(tone: string): { variant: NonNullable<VariantProps<typeof badgeVariants>['variant']>; className: string } {
  switch (tone as BadgeTone) {
    case 'destructive': return { variant: 'destructive', className: '' };
    case 'warning': return { variant: 'outline', className: 'border-warning text-warning' };
    case 'success': return { variant: 'outline', className: 'border-success text-success' };
    case 'primary': return { variant: 'default', className: '' };
    case 'secondary': return { variant: 'secondary', className: '' };
    default: return { variant: 'outline', className: '' };
  }
}

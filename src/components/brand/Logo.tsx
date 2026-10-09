import { cn } from '@/lib/utils';

interface BrandMarkProps {
  className?: string;
  /** Muestra la retícula interna. En tamaños < 24px conviene ocultarla. */
  detailed?: boolean;
}

/**
 * Identificador "Expediente": hoja de calendario + sello de cumplido.
 * El trazo usa currentColor (tinta o papel según el fondo); el sello usa --sello.
 */
export function BrandMark({ className, detailed = true }: BrandMarkProps) {
  return (
    <svg viewBox="0 0 84 84" fill="none" aria-hidden="true" className={cn('h-8 w-8 shrink-0', className)}>
      <rect x="3" y="3" width="78" height="78" stroke="currentColor" strokeWidth="5" />
      <line x1="3" y1="24" x2="81" y2="24" stroke="currentColor" strokeWidth="5" />
      {detailed && (
        <>
          <line x1="29" y1="24" x2="29" y2="81" stroke="currentColor" strokeWidth="2.5" />
          <line x1="55" y1="24" x2="55" y2="40" stroke="currentColor" strokeWidth="2.5" />
          <line x1="3" y1="52" x2="38" y2="52" stroke="currentColor" strokeWidth="2.5" />
        </>
      )}
      <circle cx="57" cy="57" r="18" fill="hsl(var(--sello))" />
      <path d="M49 57l6 6 11-12" stroke="hsl(var(--sello-foreground))" strokeWidth="4.5" />
    </svg>
  );
}

interface LogoProps {
  className?: string;
  markClassName?: string;
  /** `stacked`: CALENDARIO / COMPLIANCE en dos líneas. `inline`: una línea. */
  variant?: 'stacked' | 'inline';
  /** Rótulo de folio bajo el wordmark (solo en `stacked`). */
  tagline?: string;
}

export function Logo({ className, markClassName, variant = 'stacked', tagline }: LogoProps) {
  if (variant === 'inline') {
    return (
      <span className={cn('inline-flex items-center gap-2.5', className)}>
        <BrandMark className={cn('h-7 w-7', markClassName)} detailed={false} />
        <span className="font-heading text-[15px] font-bold uppercase leading-none tracking-[0.04em]">
          Calendario Compliance
        </span>
      </span>
    );
  }

  return (
    <span className={cn('inline-flex items-center gap-3', className)}>
      <BrandMark className={cn('h-10 w-10', markClassName)} />
      <span className="flex flex-col">
        <span className="font-heading text-[17px] font-bold uppercase leading-none tracking-[0.03em]">Calendario</span>
        <span className="font-heading text-[17px] font-medium uppercase leading-none tracking-[0.03em]">Compliance</span>
        {tagline && <span className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.06em] opacity-70">{tagline}</span>}
      </span>
    </span>
  );
}

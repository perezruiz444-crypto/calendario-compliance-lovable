import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { AnimatedNumber } from './AnimatedNumber';

export type KpiTone = 'primary' | 'destructive' | 'success' | 'warning';

interface KpiCardProps {
  title: string;
  value: number;
  suffix?: string;
  icon: LucideIcon;
  tone?: KpiTone;
  sub?: string;
  index?: number;
}

const toneMap: Record<KpiTone, { num: string; chip: string; accent: string }> = {
  primary:     { num: 'text-foreground',  chip: 'bg-primary/10 text-primary',         accent: 'card-accent-left' },
  destructive: { num: 'text-destructive', chip: 'bg-destructive/10 text-destructive', accent: 'card-accent-danger' },
  success:     { num: 'text-success',     chip: 'bg-success/10 text-success',         accent: 'card-accent-success' },
  warning:     { num: 'text-warning',     chip: 'bg-warning/10 text-warning',         accent: 'card-accent-warning' },
};

export function KpiCard({ title, value, suffix, icon: Icon, tone = 'primary', sub, index = 0 }: KpiCardProps) {
  const t = toneMap[tone];
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.05 + index * 0.06, ease: [0.4, 0, 0.2, 1] }}
      className={`card-editorial ${t.accent} p-5 group`}
    >
      <div className="flex items-start justify-between mb-4">
        <p className="eyebrow text-[10px]">{title}</p>
        <div className={`${t.chip} p-2 rounded-lg transition-transform group-hover:scale-110`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
      </div>
      <div className="flex items-baseline gap-1">
        <AnimatedNumber value={value} className={`font-heading text-4xl font-bold tracking-tight ${t.num}`} />
        {suffix && <span className={`font-heading text-2xl font-bold ${t.num}`}>{suffix}</span>}
      </div>
      {sub && <p className="text-[11px] text-muted-foreground mt-2">{sub}</p>}
    </motion.div>
  );
}

export default KpiCard;

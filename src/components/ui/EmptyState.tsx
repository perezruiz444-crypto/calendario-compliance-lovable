import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface EmptyStateProps {
  icon?: LucideIcon;
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, eyebrow, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      className={`flex flex-col items-center justify-center text-center py-14 px-6 ${className}`}
    >
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-primary/8 border border-primary/10 flex items-center justify-center mb-5">
          <Icon className="w-6 h-6 text-primary" strokeWidth={1.5} />
        </div>
      )}
      {eyebrow && <p className="eyebrow-primary mb-2">{eyebrow}</p>}
      <h3 className="font-heading text-lg font-semibold text-foreground mb-1.5 tracking-tight">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm leading-relaxed mb-5">{description}</p>
      )}
      {action}
    </motion.div>
  );
}

export default EmptyState;

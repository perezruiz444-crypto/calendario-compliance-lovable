import { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      className="mb-8 pb-6 border-b border-border-subtle"
    >
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div className="space-y-2 max-w-2xl">
          {eyebrow && <p className="eyebrow-primary">{eyebrow}</p>}
          <h1 className="display-2 text-foreground">{title}</h1>
          {description && (
            <p className="text-[15px] text-muted-foreground leading-relaxed">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </motion.header>
  );
}

export default PageHeader;

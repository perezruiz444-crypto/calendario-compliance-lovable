import { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface PageTransitionProps {
  children: ReactNode;
}

/**
 * Wrap individual page content for editorial fade+slide entrance.
 * Used per-route to avoid lazy/Suspense conflicts with AnimatePresence.
 */
export function PageTransition({ children }: PageTransitionProps) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0, y: reduced ? 0 : 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: reduced ? 0 : -4 }}
      transition={{ duration: reduced ? 0 : 0.32, ease: [0.4, 0, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}

export default PageTransition;

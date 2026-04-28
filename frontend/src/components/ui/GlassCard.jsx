import React from 'react';
import { cn } from '../../lib/utils';
import { motion } from 'framer-motion';

export const GlassCard = ({ className, children, ...props }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={cn("glass rounded-2xl p-6", className)}
      {...props}
    >
      {children}
    </motion.div>
  );
};

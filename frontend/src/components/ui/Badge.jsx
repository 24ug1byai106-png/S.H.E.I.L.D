import React from 'react';
import { cn } from '../../lib/utils';

export const Badge = ({ children, level = 'Medium', className, ...props }) => {
  const colors = {
    Low: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    Medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    High: 'bg-brand-red/10 text-brand-red border-brand-red/20',
    Critical: 'bg-red-500/20 text-red-400 border-red-500/30',
    Moderate: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    Infrastructure: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
        colors[level] || colors.Medium,
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};

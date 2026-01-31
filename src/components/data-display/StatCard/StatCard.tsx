import { forwardRef, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Card, type CardProps } from '../Card';
import { slideUp, slideUpTransition } from '@/components/motion/transitions';

export interface StatCardProps extends Omit<CardProps, 'children'> {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  change?: {
    value: number;
    label?: string;
  };
  trend?: 'up' | 'down' | 'neutral';
  loading?: boolean;
}

export const StatCard = forwardRef<HTMLDivElement, StatCardProps>(
  (
    { label, value, icon, change, trend = 'neutral', loading = false, className, ...props },
    ref,
  ) => {
    const trendColors = {
      up: 'text-success-400',
      down: 'text-error-400',
      neutral: 'text-dark-400',
    };

    const trendIcon = {
      up: '↑',
      down: '↓',
      neutral: '→',
    };

    return (
      <Card ref={ref} className={cn('relative', className)} size="md" {...props}>
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            {/* Label */}
            <p className="truncate text-sm font-medium text-dark-400">{label}</p>

            {/* Value */}
            {loading ? (
              <div className="mt-2 h-8 w-24 animate-pulse rounded bg-dark-800" />
            ) : (
              <motion.p
                className="mt-1 text-2xl font-bold text-dark-100 sm:text-3xl"
                variants={slideUp}
                initial="initial"
                animate="animate"
                transition={slideUpTransition}
              >
                {value}
              </motion.p>
            )}

            {/* Change indicator */}
            {change && !loading && (
              <div className={cn('mt-2 flex items-center gap-1 text-sm', trendColors[trend])}>
                <span>{trendIcon[trend]}</span>
                <span>
                  {change.value > 0 ? '+' : ''}
                  {change.value}%
                </span>
                {change.label && <span className="text-dark-500">{change.label}</span>}
              </div>
            )}
          </div>

          {/* Icon */}
          {icon && (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-linear bg-dark-800/80 text-dark-400">
              {icon}
            </div>
          )}
        </div>
      </Card>
    );
  },
);

StatCard.displayName = 'StatCard';

import React from 'react';
import { cn } from '@/lib/utils';

export function HoverBorderGradient({
  children,
  containerClassName,
  className,
  as: Tag = 'button',
  ...props
}: React.PropsWithChildren<
  {
    as?: React.ElementType;
    containerClassName?: string;
    className?: string;
  } & React.HTMLAttributes<HTMLElement>
>) {
  return (
    <Tag
      className={cn(
        'group relative flex items-center justify-center overflow-hidden rounded-xl p-[1.5px]',
        containerClassName,
      )}
      {...props}
    >
      {/* Rotating conic gradient — pure CSS transform, always smooth */}
      <div
        className="absolute inset-[-50%] z-0 animate-border-spin"
        style={{
          background:
            'conic-gradient(from 0deg, transparent 0%, transparent 40%, rgb(var(--color-accent-400)) 50%, transparent 60%, transparent 100%)',
        }}
      />
      {/* Inner content */}
      <div
        className={cn(
          'relative z-10 w-auto rounded-[inherit] bg-dark-900 px-4 py-2.5 text-sm font-medium text-white transition-colors duration-300 group-hover:bg-dark-850',
          className,
        )}
      >
        {children}
      </div>
    </Tag>
  );
}

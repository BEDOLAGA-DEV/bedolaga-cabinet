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
        'hover-border-gradient group flex items-center justify-center rounded-xl text-sm font-medium text-white',
        containerClassName,
      )}
      {...props}
    >
      <span className={cn('relative z-10 flex items-center justify-center', className)}>
        {children}
      </span>
    </Tag>
  );
}

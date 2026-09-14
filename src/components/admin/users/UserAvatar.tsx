import { cn } from '@/lib/utils';

interface UserAvatarProps {
  firstName: string | null | undefined;
  username: string | null | undefined;
  /** Заблокированные и удалённые — серые, чтобы не спорить с чипом статуса. */
  muted?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-xl',
} as const;

/** Кружок с первой буквой имени: текст на заливке — токен `text-on-accent`, не белый. */
export function UserAvatar({
  firstName,
  username,
  muted,
  size = 'md',
  className,
}: UserAvatarProps) {
  const initial = (firstName?.trim()[0] || username?.trim()[0] || '?').toUpperCase();
  return (
    <div
      aria-hidden="true"
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full font-bold',
        muted
          ? 'bg-dark-700 text-dark-300'
          : 'bg-gradient-to-br from-accent-500 to-accent-700 text-on-accent',
        SIZE[size],
        className,
      )}
    >
      {initial}
    </div>
  );
}

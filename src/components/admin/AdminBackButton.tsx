import { Link } from 'react-router-dom';
import { usePlatform } from '@/platform';
import { BackIcon } from './icons';

interface AdminBackButtonProps {
  to?: string;
  className?: string;
}

/**
 * Back button for admin pages.
 * Hidden in Telegram Mini App since native back button is used instead.
 */
export function AdminBackButton({ to = '/admin', className }: AdminBackButtonProps) {
  const { platform } = usePlatform();

  // In Telegram Mini App, we use native back button
  if (platform === 'telegram') {
    return null;
  }

  return (
    <Link
      to={to}
      className={
        className ||
        'flex h-10 w-10 items-center justify-center rounded-xl border border-dark-700 bg-dark-800 transition-colors hover:border-dark-600'
      }
    >
      <BackIcon />
    </Link>
  );
}

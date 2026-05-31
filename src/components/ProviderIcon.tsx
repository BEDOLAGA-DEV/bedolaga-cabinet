import { cn } from '@/lib/utils';
import { EmailIcon as CentralEmailIcon } from '@/components/icons';
import OAuthProviderIcon from './OAuthProviderIcon';

export function TelegramIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.28-.02-.12.03-2.02 1.28-5.69 3.77-.54.37-1.03.55-1.47.54-.48-.01-1.41-.27-2.1-.5-.85-.28-1.52-.43-1.46-.91.03-.25.38-.51 1.05-.78 4.12-1.79 6.87-2.97 8.26-3.54 3.93-1.62 4.75-1.9 5.28-1.91.12 0 .37.03.54.17.14.12.18.28.2.46-.01.06.01.24 0 .37z"
        fill="#29B6F6"
      />
    </svg>
  );
}

export function EmailIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return <CentralEmailIcon className={className} />;
}

export default function ProviderIcon({
  provider,
  className,
}: {
  provider: string;
  className?: string;
}) {
  switch (provider) {
    case 'telegram':
      return <TelegramIcon className={className ?? 'h-6 w-6'} />;
    case 'email':
      return <EmailIcon className={cn('text-dark-300', className ?? 'h-6 w-6')} />;
    default:
      return <OAuthProviderIcon provider={provider} className={className ?? 'h-6 w-6'} />;
  }
}

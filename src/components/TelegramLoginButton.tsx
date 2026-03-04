import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

interface TelegramLoginButtonProps {
  botUsername: string;
}

export default function TelegramLoginButton({
  botUsername,
}: TelegramLoginButtonProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);

  // Load widget script
  useEffect(() => {
    if (!containerRef.current || !botUsername) return;

    // Clear previous widget using safe DOM API
    while (containerRef.current.firstChild) {
      containerRef.current.removeChild(containerRef.current.firstChild);
    }

    // Get current URL for redirect
    const redirectUrl = `${window.location.origin}/auth/telegram/callback`;

    // Create script element for Telegram Login Widget
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', botUsername);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-radius', '8');
    script.setAttribute('data-auth-url', redirectUrl);
    script.setAttribute('data-request-access', 'write');
    script.async = true;

    containerRef.current.appendChild(script);
  }, [botUsername]);

  if (!botUsername || botUsername === 'your_bot') {
    return (
      <div className="py-4 text-center text-sm text-gray-500">
        {t('auth.telegramNotConfigured')}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Telegram Widget will be inserted here */}
      <div ref={containerRef} className="flex justify-center" />
    </div>
  );
}

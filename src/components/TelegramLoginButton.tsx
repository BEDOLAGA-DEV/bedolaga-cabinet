import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

interface TelegramLoginButtonProps {
  botUsername: string
}

export default function TelegramLoginButton({
  botUsername,
}: TelegramLoginButtonProps) {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)

  // Load widget script
  useEffect(() => {
    if (!containerRef.current || !botUsername) return

    // Clear previous widget using safe DOM API
    while (containerRef.current.firstChild) {
      containerRef.current.removeChild(containerRef.current.firstChild)
    }

    // Get current URL for redirect
    const redirectUrl = `${window.location.origin}/auth/telegram/callback`

    // Create script element for Telegram Login Widget
    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.setAttribute('data-telegram-login', botUsername)
    script.setAttribute('data-size', 'large')
    script.setAttribute('data-radius', '8')
    script.setAttribute('data-auth-url', redirectUrl)
    script.setAttribute('data-request-access', 'write')
    script.async = true

    containerRef.current.appendChild(script)
  }, [botUsername])

  if (!botUsername || botUsername === 'your_bot') {
    return (
      <div className="text-center text-gray-500 text-sm py-4">
        {t('auth.telegramNotConfigured')}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Telegram Widget will be inserted here */}
      <div ref={containerRef} className="flex justify-center" />

      {/* Fallback link for mobile */}
      <div className="text-center">
        <p className="text-xs text-gray-500 mb-2">{t('auth.orOpenInApp')}</p>
        <a
          href={`https://t.me/${botUsername}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center text-sm text-telegram-blue hover:underline"
        >
          <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
          </svg>
          @{botUsername}
        </a>
      </div>
    </div>
  )
}

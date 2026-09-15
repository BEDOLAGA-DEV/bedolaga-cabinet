import { useTranslation } from 'react-i18next';

interface LegalLink {
  href: string;
  labelKey: string;
  fallback: string;
}

const LINKS: LegalLink[] = [
  { href: '/offer', labelKey: 'footer.offer', fallback: 'Публичная оферта' },
  { href: '/privacy', labelKey: 'footer.privacy', fallback: 'Политика конфиденциальности' },
  { href: '/recurrent-payments', labelKey: 'footer.recurrent', fallback: 'Рекуррентные платежи' },
];

interface LegalFooterProps {
  className?: string;
}

export default function LegalFooter({ className = '' }: LegalFooterProps) {
  const { t } = useTranslation();

  return (
    // Ссылки разведены зазором, без «·» между ними: на узком экране ряд
    // переносится, и точка оставалась висеть в конце первой строки.
    <footer
      className={`flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-center text-[11px] leading-relaxed text-dark-500 ${className}`}
    >
      {LINKS.map((link) => (
        <a
          key={link.href}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className="transition-colors hover:text-accent-400"
        >
          {t(link.labelKey, link.fallback)}
        </a>
      ))}
    </footer>
  );
}

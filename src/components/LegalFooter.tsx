import { Fragment } from 'react';
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
    <footer
      className={`flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-center text-[11px] leading-relaxed text-dark-500 ${className}`}
    >
      {LINKS.map((link, index) => (
        <Fragment key={link.href}>
          {index > 0 && (
            <span className="text-dark-700" aria-hidden="true">
              ·
            </span>
          )}
          <a
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-accent-400"
          >
            {t(link.labelKey, link.fallback)}
          </a>
        </Fragment>
      ))}
    </footer>
  );
}

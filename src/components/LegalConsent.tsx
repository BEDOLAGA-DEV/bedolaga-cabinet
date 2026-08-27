import { useTranslation } from 'react-i18next';

// Галочки «ознакомлен» для НОВОГО пользователя. Набор документов приходит с бэка
// (GET /cabinet/info/legal-consent) — там же решается, включён ли гейт вообще и
// какие документы реально заполнены. Здесь только отрисовка и ссылки: адреса
// публичных страниц знает фронт, бэк отдаёт лишь ключи.

export const LEGAL_DOCUMENT_LINKS: Record<string, string> = {
  public_offer: '/offer',
  privacy_policy: '/privacy',
};

const LEGAL_DOCUMENT_LABELS: Record<string, { key: string; fallback: string }> = {
  public_offer: { key: 'footer.offer', fallback: 'Публичная оферта' },
  privacy_policy: { key: 'footer.privacy', fallback: 'Политика конфиденциальности' },
};

interface LegalConsentProps {
  documents: string[];
  accepted: Record<string, boolean>;
  onChange: (document: string, value: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export default function LegalConsent({
  documents,
  accepted,
  onChange,
  disabled = false,
  className = '',
}: LegalConsentProps) {
  const { t } = useTranslation();

  if (documents.length === 0) return null;

  return (
    <div className={`space-y-2.5 ${className}`}>
      {documents.map((document) => {
        // Неизвестный ключ всё равно показываем: он обязателен на бэке, и молча
        // спрятанный чекбокс превратился бы в «кнопка не работает без объяснений».
        const label = LEGAL_DOCUMENT_LABELS[document];
        const href = LEGAL_DOCUMENT_LINKS[document];
        const title = label ? t(label.key, label.fallback) : document;
        const inputId = `legal-consent-${document}`;

        return (
          <label
            key={document}
            htmlFor={inputId}
            className="flex cursor-pointer items-start gap-2.5 text-xs leading-relaxed text-dark-400"
          >
            <input
              id={inputId}
              type="checkbox"
              checked={Boolean(accepted[document])}
              disabled={disabled}
              onChange={(e) => onChange(document, e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-dark-600 bg-dark-800 text-accent-500 focus:ring-accent-500"
            />
            <span>
              {t('auth.legalConsentPrefix', 'Я ознакомлен(а) с документом')}{' '}
              {href ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent-400 underline underline-offset-2 transition-colors hover:text-accent-300"
                  onClick={(e) => e.stopPropagation()}
                >
                  {title}
                </a>
              ) : (
                <span className="text-dark-200">{title}</span>
              )}
            </span>
          </label>
        );
      })}
    </div>
  );
}

import { useTranslation } from 'react-i18next';
import {
  SUPPORTED_LOCALES,
  LOCALE_META,
  type SupportedLocale,
  type LocaleDict,
} from '../../api/landings';
import { cn } from '../../lib/utils';

interface LocaleTabsProps {
  activeLocale: SupportedLocale;
  onChange: (locale: SupportedLocale) => void;
  /** Pass locale dicts to show a green dot indicator when content exists */
  contentIndicators?: LocaleDict[];
  className?: string;
}

/**
 * Horizontal locale tab bar for the admin landing editor.
 * Shows a green dot on tabs that have content filled in.
 */
export function LocaleTabs({
  activeLocale,
  onChange,
  contentIndicators,
  className,
}: LocaleTabsProps) {
  const { t } = useTranslation();

  const hasContent = (locale: SupportedLocale): boolean => {
    if (!contentIndicators || contentIndicators.length === 0) return false;
    return contentIndicators.some((dict) => {
      const value = dict[locale];
      return typeof value === 'string' && value.trim().length > 0;
    });
  };

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center gap-1.5">
        {SUPPORTED_LOCALES.map((locale) => {
          const meta = LOCALE_META[locale];
          const isActive = locale === activeLocale;
          const filled = hasContent(locale);
          const isRtl = meta.rtl;

          return (
            <button
              key={locale}
              type="button"
              onClick={() => onChange(locale)}
              dir={isRtl ? 'rtl' : 'ltr'}
              className={cn(
                'relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                isActive
                  ? 'bg-accent-500/15 text-accent-400 ring-1 ring-accent-500/30'
                  : 'bg-dark-800/50 text-dark-400 hover:bg-dark-700/50 hover:text-dark-300',
              )}
              aria-label={`${t('admin.landings.localeTab')}: ${meta.name}`}
              aria-pressed={isActive}
            >
              <span>{meta.flag}</span>
              <span>{meta.name}</span>
              {filled && !isActive && (
                <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-success-500" />
              )}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-dark-500">{t('admin.landings.localeHint')}</p>
    </div>
  );
}

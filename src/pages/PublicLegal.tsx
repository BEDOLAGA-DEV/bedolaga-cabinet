import { uiLocale } from '@/utils/uiLocale';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { infoApi } from '../api/info';
import { formatContent } from '../utils/legalContent';
import LanguageSwitcher from '../components/LanguageSwitcher';

export type PublicLegalDoc = 'offer' | 'privacy' | 'recurrent';

interface PublicLegalProps {
  doc: PublicLegalDoc;
}

const DOC_CONFIG: Record<
  PublicLegalDoc,
  {
    queryKey: string;
    titleKey: string;
    titleFallback: string;
    fetch: () => Promise<{ content: string; updated_at: string | null }>;
  }
> = {
  offer: {
    queryKey: 'public-offer',
    titleKey: 'footer.offer',
    titleFallback: 'Публичная оферта',
    fetch: infoApi.getPublicOffer,
  },
  privacy: {
    queryKey: 'privacy-policy',
    titleKey: 'footer.privacy',
    titleFallback: 'Политика конфиденциальности',
    fetch: infoApi.getPrivacyPolicy,
  },
  recurrent: {
    queryKey: 'recurrent-payments',
    titleKey: 'footer.recurrent',
    titleFallback: 'Рекуррентные платежи',
    fetch: infoApi.getRecurrentPayments,
  },
};

// Public, unauthenticated viewer for the legal documents linked from the login
// footer. Reads the same public /cabinet/info endpoints the authenticated Info page
// uses, so the pages are reachable before login instead of bouncing to /login.
export default function PublicLegal({ doc }: PublicLegalProps) {
  const { t } = useTranslation();
  const config = DOC_CONFIG[doc];

  const { data, isLoading, isError } = useQuery({
    queryKey: ['public-legal', config.queryKey],
    queryFn: config.fetch,
    staleTime: 5 * 60 * 1000,
  });

  const title = t(config.titleKey, config.titleFallback);

  return (
    <div className="min-h-viewport bg-dark-950 px-4 py-8 sm:py-12">
      <div className="fixed right-4 top-4 z-50">
        <LanguageSwitcher />
      </div>

      <div className="mx-auto w-full max-w-3xl">
        <h1 className="mb-6 text-2xl font-semibold text-dark-100">{title}</h1>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
          </div>
        ) : isError || !data?.content ? (
          <div className="bento-card text-dark-400">
            {t('info.documentUnavailable', 'Документ пока недоступен.')}
          </div>
        ) : (
          <div className="bento-card prose prose-invert max-w-none">
            <div dangerouslySetInnerHTML={{ __html: formatContent(data.content) }} />
            {data.updated_at && (
              <p className="mt-4 text-xs text-dark-500">
                {t('info.updatedAt', 'Обновлено')}:{' '}
                {new Date(data.updated_at).toLocaleDateString(uiLocale())}
              </p>
            )}
          </div>
        )}

        <div className="mt-6">
          <Link to="/login" className="btn-secondary">
            {t('auth.backToLogin', 'Вернуться ко входу')}
          </Link>
        </div>
      </div>
    </div>
  );
}

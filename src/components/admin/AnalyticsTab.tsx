import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { brandingApi } from '../../api/branding';
import { CheckIcon, CloseIcon } from './icons';

export function AnalyticsTab() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // Editing states
  const [editingYandex, setEditingYandex] = useState(false);
  const [editingGoogleId, setEditingGoogleId] = useState(false);
  const [editingGoogleLabel, setEditingGoogleLabel] = useState(false);
  const [yandexValue, setYandexValue] = useState('');
  const [googleIdValue, setGoogleIdValue] = useState('');
  const [googleLabelValue, setGoogleLabelValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Query
  const { data: analytics } = useQuery({
    queryKey: ['analytics-counters'],
    queryFn: brandingApi.getAnalyticsCounters,
  });

  // Mutation
  const updateMutation = useMutation({
    mutationFn: brandingApi.updateAnalyticsCounters,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analytics-counters'] });
      setError(null);
    },
    onError: (err: unknown) => {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail || t('common.error'));
    },
  });

  const handleSaveYandex = () => {
    updateMutation.mutate(
      { yandex_metrika_id: yandexValue.trim() },
      { onSuccess: () => setEditingYandex(false) },
    );
  };

  const handleSaveGoogleId = () => {
    updateMutation.mutate(
      { google_ads_id: googleIdValue.trim() },
      { onSuccess: () => setEditingGoogleId(false) },
    );
  };

  const handleSaveGoogleLabel = () => {
    updateMutation.mutate(
      { google_ads_label: googleLabelValue.trim() },
      { onSuccess: () => setEditingGoogleLabel(false) },
    );
  };

  const yandexActive = Boolean(analytics?.yandex_metrika_id);
  const googleActive = Boolean(analytics?.google_ads_id);

  return (
    <div className="space-y-6">
      {/* Error message */}
      {error && (
        <div className="rounded-2xl border border-error-500/30 bg-error-500/10 p-4 text-sm text-error-400">
          {error}
        </div>
      )}

      {/* Yandex Metrika */}
      <div className="rounded-2xl border border-dark-700/50 bg-dark-800/50 p-6">
        <div className="mb-1 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-500/20 to-red-500/20">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-dark-100">
              {t('admin.settings.yandexMetrika')}
            </h3>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
              yandexActive ? 'bg-success-500/15 text-success-400' : 'bg-dark-700/50 text-dark-500'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${yandexActive ? 'bg-success-400' : 'bg-dark-600'}`}
            />
            {yandexActive ? t('admin.settings.counterActive') : t('admin.settings.counterInactive')}
          </span>
        </div>
        <p className="mb-5 ml-[52px] text-sm text-dark-400">
          {t('admin.settings.yandexMetrikaDesc')}
        </p>

        <div className="space-y-3">
          <label className="block text-sm font-medium text-dark-300">
            {t('admin.settings.counterId')}
          </label>
          {editingYandex ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={yandexValue}
                onChange={(e) => setYandexValue(e.target.value.replace(/\D/g, ''))}
                placeholder={t('admin.settings.yandexIdPlaceholder')}
                className="flex-1 rounded-xl border border-dark-600 bg-dark-700 px-4 py-2.5 text-dark-100 placeholder-dark-500 transition-colors focus:border-accent-500 focus:outline-none"
                autoFocus
              />
              <button
                onClick={handleSaveYandex}
                disabled={updateMutation.isPending}
                className="rounded-xl bg-accent-500 px-4 py-2.5 text-white transition-colors hover:bg-accent-600 disabled:opacity-50"
              >
                <CheckIcon />
              </button>
              <button
                onClick={() => {
                  setEditingYandex(false);
                  setError(null);
                }}
                className="rounded-xl bg-dark-700 px-4 py-2.5 text-dark-300 transition-colors hover:bg-dark-600"
              >
                <CloseIcon />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span
                className={`text-base ${analytics?.yandex_metrika_id ? 'font-mono text-dark-100' : 'text-dark-500'}`}
              >
                {analytics?.yandex_metrika_id || t('admin.settings.notConfigured')}
              </span>
              <button
                onClick={() => {
                  setYandexValue(analytics?.yandex_metrika_id || '');
                  setEditingYandex(true);
                  setError(null);
                }}
                className="rounded-lg p-1.5 text-dark-400 transition-colors hover:bg-dark-700 hover:text-dark-200"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                  />
                </svg>
              </button>
            </div>
          )}
          <p className="text-xs text-dark-500">{t('admin.settings.yandexIdHint')}</p>
        </div>
      </div>

      {/* Google Ads */}
      <div className="rounded-2xl border border-dark-700/50 bg-dark-800/50 p-6">
        <div className="mb-1 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-green-500/20">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0014.07 6H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-dark-100">{t('admin.settings.googleAds')}</h3>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
              googleActive ? 'bg-success-500/15 text-success-400' : 'bg-dark-700/50 text-dark-500'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${googleActive ? 'bg-success-400' : 'bg-dark-600'}`}
            />
            {googleActive ? t('admin.settings.counterActive') : t('admin.settings.counterInactive')}
          </span>
        </div>
        <p className="mb-5 ml-[52px] text-sm text-dark-400">{t('admin.settings.googleAdsDesc')}</p>

        <div className="space-y-5">
          {/* Conversion ID */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-dark-300">
              {t('admin.settings.conversionId')}
            </label>
            {editingGoogleId ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={googleIdValue}
                  onChange={(e) => setGoogleIdValue(e.target.value)}
                  placeholder={t('admin.settings.googleIdPlaceholder')}
                  className="flex-1 rounded-xl border border-dark-600 bg-dark-700 px-4 py-2.5 text-dark-100 placeholder-dark-500 transition-colors focus:border-accent-500 focus:outline-none"
                  autoFocus
                />
                <button
                  onClick={handleSaveGoogleId}
                  disabled={updateMutation.isPending}
                  className="rounded-xl bg-accent-500 px-4 py-2.5 text-white transition-colors hover:bg-accent-600 disabled:opacity-50"
                >
                  <CheckIcon />
                </button>
                <button
                  onClick={() => {
                    setEditingGoogleId(false);
                    setError(null);
                  }}
                  className="rounded-xl bg-dark-700 px-4 py-2.5 text-dark-300 transition-colors hover:bg-dark-600"
                >
                  <CloseIcon />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span
                  className={`text-base ${analytics?.google_ads_id ? 'font-mono text-dark-100' : 'text-dark-500'}`}
                >
                  {analytics?.google_ads_id || t('admin.settings.notConfigured')}
                </span>
                <button
                  onClick={() => {
                    setGoogleIdValue(analytics?.google_ads_id || '');
                    setEditingGoogleId(true);
                    setError(null);
                  }}
                  className="rounded-lg p-1.5 text-dark-400 transition-colors hover:bg-dark-700 hover:text-dark-200"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                    />
                  </svg>
                </button>
              </div>
            )}
            <p className="text-xs text-dark-500">{t('admin.settings.googleIdHint')}</p>
          </div>

          {/* Conversion Label */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-dark-300">
              {t('admin.settings.conversionLabel')}
            </label>
            {editingGoogleLabel ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={googleLabelValue}
                  onChange={(e) => setGoogleLabelValue(e.target.value)}
                  placeholder={t('admin.settings.googleLabelPlaceholder')}
                  className="flex-1 rounded-xl border border-dark-600 bg-dark-700 px-4 py-2.5 text-dark-100 placeholder-dark-500 transition-colors focus:border-accent-500 focus:outline-none"
                  autoFocus
                />
                <button
                  onClick={handleSaveGoogleLabel}
                  disabled={updateMutation.isPending}
                  className="rounded-xl bg-accent-500 px-4 py-2.5 text-white transition-colors hover:bg-accent-600 disabled:opacity-50"
                >
                  <CheckIcon />
                </button>
                <button
                  onClick={() => {
                    setEditingGoogleLabel(false);
                    setError(null);
                  }}
                  className="rounded-xl bg-dark-700 px-4 py-2.5 text-dark-300 transition-colors hover:bg-dark-600"
                >
                  <CloseIcon />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span
                  className={`text-base ${analytics?.google_ads_label ? 'font-mono text-dark-100' : 'text-dark-500'}`}
                >
                  {analytics?.google_ads_label || t('admin.settings.notConfigured')}
                </span>
                <button
                  onClick={() => {
                    setGoogleLabelValue(analytics?.google_ads_label || '');
                    setEditingGoogleLabel(true);
                    setError(null);
                  }}
                  className="rounded-lg p-1.5 text-dark-400 transition-colors hover:bg-dark-700 hover:text-dark-200"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                    />
                  </svg>
                </button>
              </div>
            )}
            <p className="text-xs text-dark-500">{t('admin.settings.googleLabelHint')}</p>
          </div>
        </div>
      </div>

      {/* Info block */}
      <div className="rounded-2xl border border-dark-700/30 bg-dark-800/30 p-4">
        <p className="text-sm leading-relaxed text-dark-500">{t('admin.settings.analyticsHint')}</p>
      </div>
    </div>
  );
}

import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { adminRemnawaveApi, SquadWithLocalInfo } from '../api/adminRemnawave';
import { AdminBackButton } from '../components/admin';
import { ServerIcon, UsersIcon, CheckIcon, XIcon } from '../components/icons';
import { useBackButton } from '../platform/hooks/useBackButton';

// Country flags helper
const getCountryFlag = (code: string | null | undefined): string => {
  if (!code) return '🌍';
  const codeMap: Record<string, string> = {
    RU: '🇷🇺',
    US: '🇺🇸',
    DE: '🇩🇪',
    NL: '🇳🇱',
    GB: '🇬🇧',
    UK: '🇬🇧',
    FR: '🇫🇷',
    FI: '🇫🇮',
    SE: '🇸🇪',
    NO: '🇳🇴',
    PL: '🇵🇱',
    TR: '🇹🇷',
    JP: '🇯🇵',
    SG: '🇸🇬',
    HK: '🇭🇰',
    KR: '🇰🇷',
    AU: '🇦🇺',
    CA: '🇨🇦',
    CH: '🇨🇭',
    AT: '🇦🇹',
    IT: '🇮🇹',
    ES: '🇪🇸',
    BR: '🇧🇷',
    IN: '🇮🇳',
    AE: '🇦🇪',
    IL: '🇮🇱',
    KZ: '🇰🇿',
    UA: '🇺🇦',
    CZ: '🇨🇿',
    RO: '🇷🇴',
    LV: '🇱🇻',
    LT: '🇱🇹',
    EE: '🇪🇪',
    BG: '🇧🇬',
    HU: '🇭🇺',
    MD: '🇲🇩',
  };
  return codeMap[code.toUpperCase()] || code;
};

export default function AdminRemnawaveSquadDetail() {
  const { t } = useTranslation();
  const { uuid } = useParams<{ uuid: string }>();
  const navigate = useNavigate();

  useBackButton(() => navigate('/admin/remnawave'));

  // Fetch all squads and find the one we need
  const {
    data: squadsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['admin-remnawave-squads'],
    queryFn: adminRemnawaveApi.getSquads,
  });

  const squad: SquadWithLocalInfo | undefined = squadsData?.items?.find(
    (s: SquadWithLocalInfo) => s.uuid === uuid,
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !squad) {
    return (
      <div className="animate-fade-in">
        <div className="mb-6 flex items-center gap-3">
          <AdminBackButton to="/admin/remnawave" />
          <h1 className="text-xl font-semibold text-dark-100">
            {t('admin.remnawave.squads.detail', 'Squad Details')}
          </h1>
        </div>
        <div className="rounded-xl border border-error-500/30 bg-error-500/10 p-6 text-center">
          <p className="text-error-400">
            {t('admin.remnawave.squads.loadError', 'Failed to load squad')}
          </p>
          <button
            onClick={() => navigate('/admin/remnawave')}
            className="mt-4 text-sm text-dark-400 hover:text-dark-200"
          >
            {t('common.back', 'Back')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <AdminBackButton to="/admin/remnawave" />
        <div className="flex items-center gap-3">
          <span className="text-2xl">{getCountryFlag(squad.country_code)}</span>
          <div className="rounded-lg bg-accent-500/20 p-2 text-accent-400">
            <ServerIcon />
          </div>
        </div>
        <div>
          <h1 className="text-xl font-semibold text-dark-100">
            {squad.display_name || squad.name}
          </h1>
          <p className="text-sm text-dark-400">{squad.name}</p>
        </div>
        {squad.is_synced ? (
          <span className="rounded-full bg-success-500/20 px-3 py-1 text-xs text-success-400">
            {t('admin.remnawave.squads.synced', 'Synced')}
          </span>
        ) : (
          <span className="rounded-full bg-warning-500/20 px-3 py-1 text-xs text-warning-400">
            {t('admin.remnawave.squads.notSynced', 'Not synced')}
          </span>
        )}
      </div>

      {/* Main Info */}
      <div className="card">
        <h3 className="mb-4 text-lg font-semibold text-dark-100">
          {t('admin.remnawave.squads.info', 'Information')}
        </h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-sm text-dark-500">UUID</p>
            <p className="break-all font-mono text-xs text-dark-200">{squad.uuid}</p>
          </div>
          <div>
            <p className="text-sm text-dark-500">
              {t('admin.remnawave.squads.originalName', 'Original Name')}
            </p>
            <p className="text-dark-200">{squad.name}</p>
          </div>
          <div>
            <p className="text-sm text-dark-500">
              {t('admin.remnawave.squads.countryCode', 'Country')}
            </p>
            <p className="text-dark-200">
              {getCountryFlag(squad.country_code)} {squad.country_code || '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="card">
        <h3 className="mb-4 text-lg font-semibold text-dark-100">
          {t('admin.remnawave.squads.statsTitle', 'Statistics')}
        </h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg bg-dark-700/50 p-4">
            <div className="flex items-center gap-2 text-dark-400">
              <UsersIcon className="h-4 w-4" />
              <span className="text-sm">{t('admin.remnawave.squads.members', 'Members')}</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-dark-100">{squad.members_count}</p>
          </div>
          <div className="rounded-lg bg-dark-700/50 p-4">
            <div className="flex items-center gap-2 text-dark-400">
              <ServerIcon className="h-4 w-4" />
              <span className="text-sm">{t('admin.remnawave.squads.inbounds', 'Inbounds')}</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-dark-100">{squad.inbounds_count}</p>
          </div>
          {squad.is_synced && (
            <>
              <div className="rounded-lg bg-dark-700/50 p-4">
                <div className="flex items-center gap-2 text-dark-400">
                  <UsersIcon className="h-4 w-4" />
                  <span className="text-sm">{t('admin.remnawave.squads.users', 'Users')}</span>
                </div>
                <p className="mt-1 text-2xl font-bold text-dark-100">
                  {squad.current_users ?? 0}
                  <span className="text-sm font-normal text-dark-400">
                    {' '}
                    / {squad.max_users ?? '∞'}
                  </span>
                </p>
              </div>
              <div className="rounded-lg bg-dark-700/50 p-4">
                <div className="flex items-center gap-2 text-dark-400">
                  <span className="text-sm">{t('admin.remnawave.squads.price', 'Price')}</span>
                </div>
                <p className="mt-1 text-2xl font-bold text-dark-100">
                  {((squad.price_kopeks ?? 0) / 100).toFixed(0)} ₽
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Local Settings (if synced) */}
      {squad.is_synced && (
        <div className="card">
          <h3 className="mb-4 text-lg font-semibold text-dark-100">
            {t('admin.remnawave.squads.localSettings', 'Local Settings')}
          </h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="flex items-center gap-3 rounded-lg bg-dark-700/50 p-4">
              <div
                className={`rounded-lg p-2 ${
                  squad.is_available
                    ? 'bg-success-500/20 text-success-400'
                    : 'bg-error-500/20 text-error-400'
                }`}
              >
                {squad.is_available ? <CheckIcon /> : <XIcon />}
              </div>
              <div>
                <p className="text-sm text-dark-400">
                  {t('admin.remnawave.squads.available', 'Available')}
                </p>
                <p className={squad.is_available ? 'text-success-400' : 'text-error-400'}>
                  {squad.is_available ? t('common.yes', 'Yes') : t('common.no', 'No')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-dark-700/50 p-4">
              <div
                className={`rounded-lg p-2 ${
                  squad.is_trial_eligible
                    ? 'bg-success-500/20 text-success-400'
                    : 'bg-dark-600 text-dark-400'
                }`}
              >
                {squad.is_trial_eligible ? <CheckIcon /> : <XIcon />}
              </div>
              <div>
                <p className="text-sm text-dark-400">
                  {t('admin.remnawave.squads.trialEligible', 'Trial Eligible')}
                </p>
                <p className={squad.is_trial_eligible ? 'text-success-400' : 'text-dark-400'}>
                  {squad.is_trial_eligible ? t('common.yes', 'Yes') : t('common.no', 'No')}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inbounds */}
      {squad.inbounds.length > 0 && (
        <div className="card">
          <h3 className="mb-4 text-lg font-semibold text-dark-100">
            {t('admin.remnawave.squads.inboundsList', 'Inbounds')}
          </h3>
          <div className="space-y-2">
            {squad.inbounds.map((inbound: Record<string, unknown>, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-lg bg-dark-700/50 px-4 py-3"
              >
                <span className="text-sm text-dark-200">
                  {String(inbound.tag || inbound.uuid || `Inbound ${idx + 1}`)}
                </span>
                {typeof inbound.type === 'string' && (
                  <span className="rounded bg-dark-600 px-2 py-1 text-xs text-dark-400">
                    {inbound.type}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex justify-end">
        <button onClick={() => navigate('/admin/remnawave')} className="btn-secondary">
          {t('common.back', 'Back')}
        </button>
      </div>
    </div>
  );
}

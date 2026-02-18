import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  campaignsApi,
  CampaignCreateRequest,
  CampaignBonusType,
  ServerSquadInfo,
  TariffListItem,
} from '../api/campaigns';
import { partnerApi } from '../api/partners';
import { AdminBackButton } from '../components/admin';
import { createNumberInputHandler, toNumber } from '../utils/inputHelpers';
// Icons
const CampaignIcon = () => (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46"
    />
  </svg>
);

const CheckIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

const RefreshIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
    />
  </svg>
);

// Bonus type config
const bonusTypeConfig: Record<
  CampaignBonusType,
  { labelKey: string; color: string; bgColor: string; borderColor: string }
> = {
  balance: {
    labelKey: 'admin.campaigns.bonusType.balance',
    color: 'text-success-400',
    bgColor: 'bg-success-500/10',
    borderColor: 'border-success-500/30',
  },
  subscription: {
    labelKey: 'admin.campaigns.bonusType.subscription',
    color: 'text-accent-400',
    bgColor: 'bg-accent-500/10',
    borderColor: 'border-accent-500/30',
  },
  tariff: {
    labelKey: 'admin.campaigns.bonusType.tariff',
    color: 'text-accent-400',
    bgColor: 'bg-accent-500/10',
    borderColor: 'border-accent-500/30',
  },
  none: {
    labelKey: 'admin.campaigns.bonusType.none',
    color: 'text-dark-400',
    bgColor: 'bg-dark-500/10',
    borderColor: 'border-dark-500/30',
  },
};

// Server selector component
function ServerSelector({
  servers,
  selected,
  onToggle,
}: {
  servers: ServerSquadInfo[];
  selected: string[];
  onToggle: (uuid: string) => void;
}) {
  const { t } = useTranslation();

  if (servers.length === 0) return null;

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-dark-300">
        {t('admin.campaigns.form.servers')}
      </label>
      <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-dark-700 bg-dark-800 p-3">
        {servers.map((server) => (
          <button
            key={server.id}
            type="button"
            onClick={() => onToggle(server.squad_uuid)}
            className={`flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors ${
              selected.includes(server.squad_uuid)
                ? 'bg-accent-500/20 text-accent-300'
                : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
            }`}
          >
            <div
              className={`flex h-5 w-5 items-center justify-center rounded ${
                selected.includes(server.squad_uuid) ? 'bg-accent-500 text-white' : 'bg-dark-600'
              }`}
            >
              {selected.includes(server.squad_uuid) && <CheckIcon />}
            </div>
            <span className="text-sm font-medium">{server.display_name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// Tariff selector component
function TariffSelector({
  tariffs,
  value,
  onChange,
}: {
  tariffs: TariffListItem[];
  value: number | null;
  onChange: (id: number | null) => void;
}) {
  const { t } = useTranslation();

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-dark-300">
        {t('admin.campaigns.form.selectTariff')}
      </label>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value ? parseInt(e.target.value) : null)}
        className="input"
      >
        <option value="">{t('admin.campaigns.form.notSelected')}</option>
        {tariffs.map((tariff) => (
          <option key={tariff.id} value={tariff.id}>
            {tariff.name} ({tariff.traffic_limit_gb} GB, {tariff.device_limit}{' '}
            {t('admin.campaigns.form.devices')})
          </option>
        ))}
      </select>
    </div>
  );
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 30);
}

export default function AdminCampaignCreate() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const partnerId = searchParams.get('partnerId');

  // Fetch partner info if creating for a partner
  const { data: partner } = useQuery({
    queryKey: ['admin-partner-detail', partnerId],
    queryFn: () => partnerApi.getPartnerDetail(Number(partnerId)),
    enabled: !!partnerId,
  });

  // Form state
  const [name, setName] = useState('');
  const [startParameter, setStartParameter] = useState('');
  const [bonusType, setBonusType] = useState<CampaignBonusType>('balance');
  const [isActive, setIsActive] = useState(true);

  // Auto-fill from partner
  const [autoFilled, setAutoFilled] = useState(false);
  useEffect(() => {
    if (partner && !autoFilled) {
      const partnerName = partner.first_name || partner.username || '';
      if (!name && partnerName) setName(partnerName);
      if (!startParameter && partnerName) setStartParameter(`partner_${slugify(partnerName)}`);
      setAutoFilled(true);
    }
  }, [partner, autoFilled, name, startParameter]);

  // Balance bonus
  const [balanceBonusRubles, setBalanceBonusRubles] = useState<number | ''>(0);

  // Subscription bonus
  const [subscriptionDays, setSubscriptionDays] = useState<number | ''>(7);
  const [subscriptionTraffic, setSubscriptionTraffic] = useState<number | ''>(10);
  const [subscriptionDevices, setSubscriptionDevices] = useState<number | ''>(1);
  const [selectedSquads, setSelectedSquads] = useState<string[]>([]);

  // Tariff bonus
  const [tariffId, setTariffId] = useState<number | null>(null);
  const [tariffDays, setTariffDays] = useState<number | ''>(30);

  // Fetch servers
  const { data: servers = [] } = useQuery({
    queryKey: ['admin-campaigns-servers'],
    queryFn: () => campaignsApi.getAvailableServers(),
  });

  // Fetch tariffs
  const { data: tariffs = [] } = useQuery({
    queryKey: ['admin-campaigns-tariffs'],
    queryFn: () => campaignsApi.getAvailableTariffs(),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: campaignsApi.createCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['admin-campaigns-overview'] });
      if (partnerId) {
        queryClient.invalidateQueries({ queryKey: ['admin-partner-detail', partnerId] });
        navigate(`/admin/partners/${partnerId}`);
      } else {
        navigate('/admin/campaigns');
      }
    },
  });

  const toggleServer = (uuid: string) => {
    setSelectedSquads((prev) =>
      prev.includes(uuid) ? prev.filter((s) => s !== uuid) : [...prev, uuid],
    );
  };

  const handleSubmit = () => {
    const data: CampaignCreateRequest = {
      name,
      start_parameter: startParameter,
      bonus_type: bonusType,
      is_active: isActive,
    };

    if (bonusType === 'balance') {
      data.balance_bonus_kopeks = Math.round(toNumber(balanceBonusRubles) * 100);
    } else if (bonusType === 'subscription') {
      data.subscription_duration_days = toNumber(subscriptionDays, 7);
      data.subscription_traffic_gb = toNumber(subscriptionTraffic, 10);
      data.subscription_device_limit = toNumber(subscriptionDevices, 1);
      data.subscription_squads = selectedSquads;
    } else if (bonusType === 'tariff') {
      data.tariff_id = tariffId || undefined;
      data.tariff_duration_days = toNumber(tariffDays, 30);
    }

    if (partnerId) {
      data.partner_user_id = Number(partnerId);
    }

    createMutation.mutate(data);
  };

  const isNameValid = name.trim().length > 0;
  const isStartParamValid =
    startParameter.trim().length > 0 && /^[a-zA-Z0-9_-]+$/.test(startParameter);
  const isValid = isNameValid && isStartParamValid;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <AdminBackButton />
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-accent-500/20 p-2 text-accent-400">
            <CampaignIcon />
          </div>
          <div>
            <h1 className="text-xl font-bold text-dark-100">
              {t('admin.campaigns.modal.createTitle')}
            </h1>
            <p className="text-sm text-dark-400">{t('admin.campaigns.subtitle')}</p>
          </div>
        </div>
      </div>

      {/* Partner info banner */}
      {partnerId && partner && (
        <div className="rounded-xl border border-accent-500/20 bg-accent-500/5 p-4">
          <div className="flex items-start gap-3">
            <svg
              className="mt-0.5 h-5 w-5 shrink-0 text-accent-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
              />
            </svg>
            <p className="text-sm text-accent-300">
              {t('admin.campaigns.form.partnerAutoAssign', {
                name: partner.first_name || partner.username || `#${partnerId}`,
              })}
            </p>
          </div>
        </div>
      )}

      {/* Basic Info */}
      <div className="card space-y-4">
        {/* Name */}
        <div>
          <label className="mb-2 block text-sm font-medium text-dark-300">
            {t('admin.campaigns.form.name')}
            <span className="text-error-400">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`input ${name.length > 0 && !isNameValid ? 'border-error-500/50' : ''}`}
            placeholder={t('admin.campaigns.form.namePlaceholder')}
            maxLength={255}
          />
          {name.length > 0 && !isNameValid && (
            <p className="mt-1 text-xs text-error-400">
              {t('admin.campaigns.validation.nameRequired')}
            </p>
          )}
        </div>

        {/* Start Parameter */}
        <div>
          <label className="mb-2 block text-sm font-medium text-dark-300">
            {t('admin.campaigns.form.startParameter')}
            <span className="text-error-400">*</span>
          </label>
          <input
            type="text"
            value={startParameter}
            onChange={(e) => setStartParameter(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
            className={`input font-mono ${startParameter.length > 0 && !isStartParamValid ? 'border-error-500/50' : ''}`}
            placeholder="instagram_jan2024"
            maxLength={100}
          />
          <p className="mt-1 text-xs text-dark-500">
            {t('admin.campaigns.form.startParameterHint')}
          </p>
        </div>

        {/* Active toggle */}
        <div className="flex items-center justify-between rounded-lg border border-dark-700 bg-dark-800 p-4">
          <span className="text-sm font-medium text-dark-300">
            {t('admin.campaigns.form.active')}
          </span>
          <button
            type="button"
            onClick={() => setIsActive(!isActive)}
            className={`relative h-6 w-11 rounded-full transition-colors ${
              isActive ? 'bg-accent-500' : 'bg-dark-600'
            }`}
          >
            <span
              className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                isActive ? 'left-6' : 'left-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Bonus Type */}
      <div className="card space-y-4">
        <h2 className="text-lg font-semibold text-dark-100">
          {t('admin.campaigns.form.bonusType')}
        </h2>

        <div className="grid grid-cols-2 gap-3">
          {(Object.keys(bonusTypeConfig) as CampaignBonusType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setBonusType(type)}
              className={`rounded-lg border p-4 text-left transition-all ${
                bonusType === type
                  ? `${bonusTypeConfig[type].bgColor} ${bonusTypeConfig[type].borderColor} ${bonusTypeConfig[type].color}`
                  : 'border-dark-700 bg-dark-800 text-dark-300 hover:border-dark-600'
              }`}
            >
              <span className="text-sm font-medium">{t(bonusTypeConfig[type].labelKey)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Bonus Settings */}
      {bonusType === 'balance' && (
        <div
          className={`card space-y-4 border ${bonusTypeConfig.balance.borderColor} ${bonusTypeConfig.balance.bgColor}`}
        >
          <h2 className={`text-lg font-semibold ${bonusTypeConfig.balance.color}`}>
            {t('admin.campaigns.form.balanceBonus')}
          </h2>
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={balanceBonusRubles}
              onChange={createNumberInputHandler(setBalanceBonusRubles, 0)}
              className="input w-32"
              min={0}
              step={1}
            />
            <span className="text-dark-300">₽</span>
          </div>
        </div>
      )}

      {bonusType === 'subscription' && (
        <div
          className={`card space-y-4 border ${bonusTypeConfig.subscription.borderColor} ${bonusTypeConfig.subscription.bgColor}`}
        >
          <h2 className={`text-lg font-semibold ${bonusTypeConfig.subscription.color}`}>
            {t('admin.campaigns.form.trialSubscription')}
          </h2>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-dark-300">
                {t('admin.campaigns.form.days')}
              </label>
              <input
                type="number"
                value={subscriptionDays}
                onChange={createNumberInputHandler(setSubscriptionDays, 1)}
                className="input"
                min={1}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-dark-300">
                {t('admin.campaigns.form.trafficGb')}
              </label>
              <input
                type="number"
                value={subscriptionTraffic}
                onChange={createNumberInputHandler(setSubscriptionTraffic, 0)}
                className="input"
                min={0}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-dark-300">
                {t('admin.campaigns.form.devices')}
              </label>
              <input
                type="number"
                value={subscriptionDevices}
                onChange={createNumberInputHandler(setSubscriptionDevices, 1)}
                className="input"
                min={1}
              />
            </div>
          </div>

          <ServerSelector servers={servers} selected={selectedSquads} onToggle={toggleServer} />
        </div>
      )}

      {bonusType === 'tariff' && (
        <div
          className={`card space-y-4 border ${bonusTypeConfig.tariff.borderColor} ${bonusTypeConfig.tariff.bgColor}`}
        >
          <h2 className={`text-lg font-semibold ${bonusTypeConfig.tariff.color}`}>
            {t('admin.campaigns.form.tariff')}
          </h2>

          <TariffSelector tariffs={tariffs} value={tariffId} onChange={setTariffId} />

          <div>
            <label className="mb-2 block text-sm font-medium text-dark-300">
              {t('admin.campaigns.form.durationDays')}
            </label>
            <input
              type="number"
              value={tariffDays}
              onChange={createNumberInputHandler(setTariffDays, 1)}
              className="input w-32"
              min={1}
            />
          </div>
        </div>
      )}

      {bonusType === 'none' && (
        <div
          className={`card border ${bonusTypeConfig.none.borderColor} ${bonusTypeConfig.none.bgColor}`}
        >
          <p className="text-sm text-dark-400">{t('admin.campaigns.form.noBonusDescription')}</p>
        </div>
      )}

      {/* Footer */}
      <div className="card flex items-center justify-end gap-3">
        <button
          onClick={() => navigate(partnerId ? `/admin/partners/${partnerId}` : '/admin/campaigns')}
          className="btn-secondary"
        >
          {t('common.cancel')}
        </button>
        <button
          onClick={handleSubmit}
          disabled={!isValid || createMutation.isPending}
          className="btn-primary flex items-center gap-2"
        >
          {createMutation.isPending ? <RefreshIcon /> : <CampaignIcon />}
          {t('admin.campaigns.form.save')}
        </button>
      </div>
    </div>
  );
}

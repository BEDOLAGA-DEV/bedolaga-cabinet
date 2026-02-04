import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  campaignsApi,
  CampaignUpdateRequest,
  CampaignBonusType,
  ServerSquadInfo,
  TariffListItem,
} from '../api/campaigns';
import { AdminBackButton } from '../components/admin';
import { CheckIcon, CampaignIcon } from '../components/icons';
import { createNumberInputHandler, toNumber } from '../utils/inputHelpers';
import { useBackButton } from '../platform/hooks/useBackButton';

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

export default function AdminCampaignEdit() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const campaignId = parseInt(id || '0');

  useBackButton(() => navigate('/admin/campaigns'));

  // Fetch campaign
  const {
    data: campaign,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['admin-campaign', campaignId],
    queryFn: () => campaignsApi.getCampaign(campaignId),
    enabled: campaignId > 0,
  });

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

  // Form state
  const [name, setName] = useState('');
  const [startParameter, setStartParameter] = useState('');
  const [bonusType, setBonusType] = useState<CampaignBonusType>('balance');
  const [isActive, setIsActive] = useState(true);

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

  // Initialize form when campaign loads
  useEffect(() => {
    if (campaign) {
      setName(campaign.name || '');
      setStartParameter(campaign.start_parameter || '');
      setBonusType(campaign.bonus_type || 'balance');
      setIsActive(campaign.is_active ?? true);
      setBalanceBonusRubles((campaign.balance_bonus_kopeks || 0) / 100);
      setSubscriptionDays(campaign.subscription_duration_days || 7);
      setSubscriptionTraffic(campaign.subscription_traffic_gb || 10);
      setSubscriptionDevices(campaign.subscription_device_limit || 1);
      setSelectedSquads(campaign.subscription_squads || []);
      setTariffId(campaign.tariff_id || null);
      setTariffDays(campaign.tariff_duration_days || 30);
    }
  }, [campaign]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: CampaignUpdateRequest) => campaignsApi.updateCampaign(campaignId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['admin-campaign', campaignId] });
      navigate('/admin/campaigns');
    },
  });

  const toggleServer = (uuid: string) => {
    setSelectedSquads((prev) =>
      prev.includes(uuid) ? prev.filter((s) => s !== uuid) : [...prev, uuid],
    );
  };

  const handleSubmit = () => {
    const data: CampaignUpdateRequest = {
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

    updateMutation.mutate(data);
  };

  const isValid = name.trim() && startParameter.trim() && /^[a-zA-Z0-9_-]+$/.test(startParameter);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="animate-fade-in">
        <div className="mb-6 flex items-center gap-3">
          <AdminBackButton to="/admin/campaigns" />
          <h1 className="text-xl font-semibold text-dark-100">
            {t('admin.campaigns.modal.editTitle')}
          </h1>
        </div>
        <div className="rounded-xl border border-error-500/30 bg-error-500/10 p-6 text-center">
          <p className="text-error-400">{t('admin.campaigns.loadError')}</p>
          <button
            onClick={() => navigate('/admin/campaigns')}
            className="mt-4 text-sm text-dark-400 hover:text-dark-200"
          >
            {t('common.back')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <AdminBackButton to="/admin/campaigns" />
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-accent-500/20 p-2 text-accent-400">
            <CampaignIcon />
          </div>
          <div>
            <h1 className="text-xl font-bold text-dark-100">
              {t('admin.campaigns.modal.editTitle')}
            </h1>
            <p className="text-sm text-dark-400">{campaign.name}</p>
          </div>
        </div>
      </div>

      {/* Basic Info */}
      <div className="card space-y-4">
        {/* Name */}
        <div>
          <label className="mb-2 block text-sm font-medium text-dark-300">
            {t('admin.campaigns.form.name')}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
            placeholder={t('admin.campaigns.form.namePlaceholder')}
          />
        </div>

        {/* Start Parameter */}
        <div>
          <label className="mb-2 block text-sm font-medium text-dark-300">
            {t('admin.campaigns.form.startParameter')}
          </label>
          <input
            type="text"
            value={startParameter}
            onChange={(e) => setStartParameter(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
            className="input font-mono"
            placeholder="instagram_jan2024"
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
              <label className="mb-2 block text-sm text-dark-400">
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
              <label className="mb-2 block text-sm text-dark-400">
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
              <label className="mb-2 block text-sm text-dark-400">
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
        <button onClick={() => navigate('/admin/campaigns')} className="btn-secondary">
          {t('common.cancel')}
        </button>
        <button
          onClick={handleSubmit}
          disabled={!isValid || updateMutation.isPending}
          className="btn-primary flex items-center gap-2"
        >
          {updateMutation.isPending ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : null}
          {updateMutation.isPending ? t('common.saving') : t('common.save')}
        </button>
      </div>

      {updateMutation.isError && (
        <div className="rounded-lg border border-error-500/30 bg-error-500/10 p-3 text-sm text-error-400">
          {t('admin.campaigns.updateError')}
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  tariffsApi,
  TariffListItem,
  TariffDetail,
  TariffCreateRequest,
  TariffUpdateRequest,
  PeriodPrice,
  ServerInfo,
} from '../api/tariffs';

// Icons
const BackIcon = () => (
  <svg
    className="h-5 w-5 text-dark-400"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
);

const PlusIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

const EditIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
    />
  </svg>
);

const TrashIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
    />
  </svg>
);

const CheckIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

const XIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const InfinityIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.5 12a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zm0 0c0 1.657 1.007 3 2.25 3S21 13.657 21 12a9 9 0 10-2.636 6.364M16.5 12V8.25"
    />
  </svg>
);

const CalendarIcon = () => (
  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
    />
  </svg>
);

const SunIcon = () => (
  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
    />
  </svg>
);

// Type selection modal
interface TariffTypeSelectProps {
  onSelect: (isDaily: boolean) => void;
  onClose: () => void;
}

function TariffTypeSelect({ onSelect, onClose }: TariffTypeSelectProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md overflow-hidden rounded-xl bg-dark-800">
        <div className="flex items-center justify-between border-b border-dark-700 p-4">
          <h2 className="text-lg font-semibold text-dark-100">Выберите тип тарифа</h2>
          <button onClick={onClose} className="rounded-lg p-1 transition-colors hover:bg-dark-700">
            <XIcon />
          </button>
        </div>
        <div className="space-y-3 p-4">
          <button
            onClick={() => onSelect(false)}
            className="group w-full rounded-xl bg-dark-700 p-4 text-left transition-colors hover:bg-dark-600"
          >
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-accent-500/20 p-3 text-accent-400 group-hover:bg-accent-500/30">
                <CalendarIcon />
              </div>
              <div>
                <h3 className="font-medium text-dark-100">Периодный тариф</h3>
                <p className="mt-1 text-sm text-dark-400">
                  Оплата за период (7, 30, 90 дней и т.д.). Произвольные периоды и цены.
                </p>
              </div>
            </div>
          </button>
          <button
            onClick={() => onSelect(true)}
            className="group w-full rounded-xl bg-dark-700 p-4 text-left transition-colors hover:bg-dark-600"
          >
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-amber-500/20 p-3 text-amber-400 group-hover:bg-amber-500/30">
                <SunIcon />
              </div>
              <div>
                <h3 className="font-medium text-dark-100">Суточный тариф</h3>
                <p className="mt-1 text-sm text-dark-400">
                  Ежедневное списание с баланса. Можно ставить на паузу.
                </p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

// Period tariff modal
interface PeriodTariffModalProps {
  tariff?: TariffDetail | null;
  servers: ServerInfo[];
  onSave: (data: TariffCreateRequest | TariffUpdateRequest) => void;
  onClose: () => void;
  isLoading?: boolean;
}

function PeriodTariffModal({
  tariff,
  servers,
  onSave,
  onClose,
  isLoading,
}: PeriodTariffModalProps) {
  const isEdit = !!tariff;

  const [name, setName] = useState(tariff?.name || '');
  const [description, setDescription] = useState(tariff?.description || '');
  const [trafficLimitGb, setTrafficLimitGb] = useState(tariff?.traffic_limit_gb ?? 100);
  const [deviceLimit, setDeviceLimit] = useState(tariff?.device_limit || 1);
  const [devicePriceKopeks, setDevicePriceKopeks] = useState(tariff?.device_price_kopeks || 0);
  const [maxDeviceLimit, setMaxDeviceLimit] = useState(tariff?.max_device_limit || 0);
  const [tierLevel, setTierLevel] = useState(tariff?.tier_level || 1);
  const [periodPrices, setPeriodPrices] = useState<PeriodPrice[]>(
    tariff?.period_prices?.length ? tariff.period_prices : [],
  );
  const [selectedSquads, setSelectedSquads] = useState<string[]>(tariff?.allowed_squads || []);
  // Докупка трафика
  const [trafficTopupEnabled, setTrafficTopupEnabled] = useState(
    tariff?.traffic_topup_enabled || false,
  );
  const [maxTopupTrafficGb, setMaxTopupTrafficGb] = useState(tariff?.max_topup_traffic_gb || 0);
  const [trafficTopupPackages, setTrafficTopupPackages] = useState<Record<string, number>>(
    tariff?.traffic_topup_packages || {},
  );

  // Режим сброса трафика
  const [trafficResetMode, setTrafficResetMode] = useState<string | null>(
    tariff?.traffic_reset_mode || null,
  );

  // Плавающий тариф - произвольное количество дней
  const [customDaysEnabled, setCustomDaysEnabled] = useState(tariff?.custom_days_enabled || false);
  const [pricePerDayKopeks, setPricePerDayKopeks] = useState(tariff?.price_per_day_kopeks || 0);
  const [minDays, setMinDays] = useState(tariff?.min_days || 1);
  const [maxDays, setMaxDays] = useState(tariff?.max_days || 365);

  // Плавающий тариф - произвольный трафик
  const [customTrafficEnabled, setCustomTrafficEnabled] = useState(
    tariff?.custom_traffic_enabled || false,
  );
  const [trafficPricePerGbKopeks, setTrafficPricePerGbKopeks] = useState(
    tariff?.traffic_price_per_gb_kopeks || 0,
  );
  const [minTrafficGb, setMinTrafficGb] = useState(tariff?.min_traffic_gb || 1);
  const [maxTrafficGb, setMaxTrafficGb] = useState(tariff?.max_traffic_gb || 1000);

  // Новый период для добавления
  const [newPeriodDays, setNewPeriodDays] = useState(30);
  const [newPeriodPrice, setNewPeriodPrice] = useState(300);

  const [activeTab, setActiveTab] = useState<'basic' | 'periods' | 'servers' | 'extra'>('basic');

  const handleSubmit = () => {
    const data: TariffCreateRequest | TariffUpdateRequest = {
      name,
      description: description || undefined,
      traffic_limit_gb: trafficLimitGb,
      device_limit: deviceLimit,
      device_price_kopeks: devicePriceKopeks > 0 ? devicePriceKopeks : undefined,
      max_device_limit: maxDeviceLimit > 0 ? maxDeviceLimit : undefined,
      tier_level: tierLevel,
      period_prices: periodPrices.filter((p) => p.price_kopeks >= 0),
      allowed_squads: selectedSquads,
      traffic_topup_enabled: trafficTopupEnabled,
      traffic_topup_packages: trafficTopupPackages,
      max_topup_traffic_gb: maxTopupTrafficGb,
      is_daily: false,
      daily_price_kopeks: 0,
      traffic_reset_mode: trafficResetMode,
      // Плавающий тариф
      custom_days_enabled: customDaysEnabled,
      price_per_day_kopeks: pricePerDayKopeks,
      min_days: minDays,
      max_days: maxDays,
      custom_traffic_enabled: customTrafficEnabled,
      traffic_price_per_gb_kopeks: trafficPricePerGbKopeks,
      min_traffic_gb: minTrafficGb,
      max_traffic_gb: maxTrafficGb,
    };
    onSave(data);
  };

  const toggleServer = (uuid: string) => {
    setSelectedSquads((prev) =>
      prev.includes(uuid) ? prev.filter((s) => s !== uuid) : [...prev, uuid],
    );
  };

  const addPeriod = () => {
    if (newPeriodDays > 0 && newPeriodPrice > 0) {
      // Проверяем, нет ли уже такого периода
      const exists = periodPrices.some((p) => p.days === newPeriodDays);
      if (!exists) {
        setPeriodPrices((prev) =>
          [...prev, { days: newPeriodDays, price_kopeks: newPeriodPrice * 100 }].sort(
            (a, b) => a.days - b.days,
          ),
        );
        setNewPeriodDays(30);
        setNewPeriodPrice(300);
      }
    }
  };

  const removePeriod = (days: number) => {
    setPeriodPrices((prev) => prev.filter((p) => p.days !== days));
  };

  const updatePeriodPrice = (days: number, priceRubles: number) => {
    setPeriodPrices((prev) =>
      prev.map((p) => (p.days === days ? { ...p, price_kopeks: priceRubles * 100 } : p)),
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-dark-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-dark-700 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-accent-500/20 p-2 text-accent-400">
              <CalendarIcon />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-dark-100">
                {isEdit ? 'Редактирование тарифа' : 'Новый периодный тариф'}
              </h2>
              <p className="text-xs text-dark-500">Оплата за период</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 transition-colors hover:bg-dark-700">
            <XIcon />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-dark-700">
          {(['basic', 'periods', 'servers', 'extra'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'border-b-2 border-accent-400 text-accent-400'
                  : 'text-dark-400 hover:text-dark-200'
              }`}
            >
              {tab === 'basic' && 'Основное'}
              {tab === 'periods' && 'Периоды'}
              {tab === 'servers' && 'Серверы'}
              {tab === 'extra' && 'Дополнительно'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'basic' && (
            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="mb-1 block text-sm text-dark-300">Название тарифа</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-dark-600 bg-dark-700 px-3 py-2 text-dark-100 focus:border-accent-500 focus:outline-none"
                  placeholder="Например: Стандарт"
                />
              </div>

              {/* Description */}
              <div>
                <label className="mb-1 block text-sm text-dark-300">Описание</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full resize-none rounded-lg border border-dark-600 bg-dark-700 px-3 py-2 text-dark-100 focus:border-accent-500 focus:outline-none"
                  rows={2}
                  placeholder="Краткое описание тарифа"
                />
              </div>

              {/* Traffic Limit */}
              <div>
                <label className="mb-1 block text-sm text-dark-300">Лимит трафика</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={trafficLimitGb}
                    onChange={(e) => setTrafficLimitGb(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-32 rounded-lg border border-dark-600 bg-dark-700 px-3 py-2 text-dark-100 focus:border-accent-500 focus:outline-none"
                    min={0}
                  />
                  <span className="text-dark-400">ГБ</span>
                  {trafficLimitGb === 0 && (
                    <span className="flex items-center gap-1 text-sm text-success-500">
                      <InfinityIcon />
                      Безлимит
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-dark-500">0 = безлимитный трафик</p>
              </div>

              {/* Device Limit */}
              <div>
                <label className="mb-1 block text-sm text-dark-300">Устройств в тарифе</label>
                <input
                  type="number"
                  value={deviceLimit}
                  onChange={(e) => setDeviceLimit(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-32 rounded-lg border border-dark-600 bg-dark-700 px-3 py-2 text-dark-100 focus:border-accent-500 focus:outline-none"
                  min={1}
                />
              </div>

              {/* Tier Level */}
              <div>
                <label className="mb-1 block text-sm text-dark-300">Уровень тарифа</label>
                <input
                  type="number"
                  value={tierLevel}
                  onChange={(e) =>
                    setTierLevel(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))
                  }
                  className="w-32 rounded-lg border border-dark-600 bg-dark-700 px-3 py-2 text-dark-100 focus:border-accent-500 focus:outline-none"
                  min={1}
                  max={10}
                />
                <p className="mt-1 text-xs text-dark-500">
                  Влияет на доступность перехода между тарифами
                </p>
              </div>
            </div>
          )}

          {activeTab === 'periods' && (
            <div className="space-y-4">
              <p className="text-sm text-dark-400">
                Добавьте периоды и цены для тарифа. Пользователи смогут выбирать из добавленных
                периодов.
              </p>

              {/* Add new period */}
              <div className="rounded-lg border border-dashed border-dark-600 bg-dark-700/50 p-4">
                <h4 className="mb-3 text-sm font-medium text-dark-300">Добавить период</h4>
                <div className="flex flex-wrap items-end gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-dark-500">Дней</label>
                    <input
                      type="number"
                      value={newPeriodDays}
                      onChange={(e) => setNewPeriodDays(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-24 rounded-lg border border-dark-500 bg-dark-600 px-3 py-2 text-dark-100 focus:border-accent-500 focus:outline-none"
                      min={1}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-dark-500">Цена (₽)</label>
                    <input
                      type="number"
                      value={newPeriodPrice}
                      onChange={(e) =>
                        setNewPeriodPrice(Math.max(1, parseInt(e.target.value) || 1))
                      }
                      className="w-28 rounded-lg border border-dark-500 bg-dark-600 px-3 py-2 text-dark-100 focus:border-accent-500 focus:outline-none"
                      min={1}
                    />
                  </div>
                  <button
                    onClick={addPeriod}
                    disabled={periodPrices.some((p) => p.days === newPeriodDays)}
                    className="flex items-center gap-2 rounded-lg bg-accent-500 px-4 py-2 text-white transition-colors hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <PlusIcon />
                    Добавить
                  </button>
                </div>
              </div>

              {/* Period list */}
              {periodPrices.length === 0 ? (
                <div className="py-8 text-center text-dark-500">
                  Нет добавленных периодов. Добавьте хотя бы один период.
                </div>
              ) : (
                <div className="space-y-2">
                  {periodPrices.map((period) => (
                    <div
                      key={period.days}
                      className="flex items-center gap-3 rounded-lg bg-dark-700/50 p-3"
                    >
                      <div className="w-20 font-medium text-dark-300">{period.days} дн.</div>
                      <input
                        type="number"
                        value={period.price_kopeks / 100}
                        onChange={(e) =>
                          updatePeriodPrice(
                            period.days,
                            Math.max(0, parseFloat(e.target.value) || 0),
                          )
                        }
                        className="w-28 rounded-lg border border-dark-500 bg-dark-600 px-3 py-2 text-dark-100 focus:border-accent-500 focus:outline-none"
                        min={0}
                        step={1}
                      />
                      <span className="text-dark-400">₽</span>
                      <div className="flex-1" />
                      <button
                        onClick={() => removePeriod(period.days)}
                        className="rounded-lg p-2 text-dark-400 transition-colors hover:bg-error-500/20 hover:text-error-400"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'servers' && (
            <div className="space-y-2">
              <p className="mb-4 text-sm text-dark-400">
                Выберите серверы, доступные на этом тарифе.
              </p>
              {servers.length === 0 ? (
                <p className="py-4 text-center text-dark-500">Нет доступных серверов</p>
              ) : (
                servers.map((server) => {
                  const isSelected = selectedSquads.includes(server.squad_uuid);
                  return (
                    <div
                      key={server.id}
                      onClick={() => toggleServer(server.squad_uuid)}
                      className={`cursor-pointer rounded-lg p-3 transition-colors ${
                        isSelected
                          ? 'border border-accent-500/50 bg-accent-500/20'
                          : 'border border-transparent bg-dark-700 hover:bg-dark-600'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-5 w-5 items-center justify-center rounded ${
                            isSelected ? 'bg-accent-500 text-white' : 'bg-dark-600'
                          }`}
                        >
                          {isSelected && <CheckIcon />}
                        </div>
                        <span className="flex-1 text-dark-200">{server.display_name}</span>
                        {server.country_code && (
                          <span className="text-xs text-dark-500">{server.country_code}</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 'extra' && (
            <div className="space-y-6">
              {/* Докупка устройств */}
              <div className="rounded-lg bg-dark-700/50 p-4">
                <h4 className="mb-3 text-sm font-medium text-dark-200">Докупка устройств</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="w-48 text-sm text-dark-400">
                      Цена за устройство (30 дней):
                    </span>
                    <input
                      type="number"
                      value={devicePriceKopeks / 100}
                      onChange={(e) =>
                        setDevicePriceKopeks(Math.max(0, parseFloat(e.target.value) || 0) * 100)
                      }
                      className="w-24 rounded-lg border border-dark-500 bg-dark-600 px-3 py-2 text-dark-100 focus:border-accent-500 focus:outline-none"
                      min={0}
                      step={1}
                    />
                    <span className="text-dark-400">₽</span>
                  </div>
                  <p className="text-xs text-dark-500">0 = докупка недоступна</p>
                  <div className="flex items-center gap-3">
                    <span className="w-48 text-sm text-dark-400">Макс. устройств на тарифе:</span>
                    <input
                      type="number"
                      value={maxDeviceLimit}
                      onChange={(e) =>
                        setMaxDeviceLimit(Math.max(0, parseInt(e.target.value) || 0))
                      }
                      className="w-24 rounded-lg border border-dark-500 bg-dark-600 px-3 py-2 text-dark-100 focus:border-accent-500 focus:outline-none"
                      min={0}
                    />
                  </div>
                  <p className="text-xs text-dark-500">0 = без ограничений</p>
                </div>
              </div>

              {/* Докупка трафика */}
              <div className="rounded-lg bg-dark-700/50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-sm font-medium text-dark-200">Докупка трафика</h4>
                  <button
                    type="button"
                    onClick={() => setTrafficTopupEnabled(!trafficTopupEnabled)}
                    className={`relative h-6 w-10 rounded-full transition-colors ${
                      trafficTopupEnabled ? 'bg-accent-500' : 'bg-dark-600'
                    }`}
                  >
                    <span
                      className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                        trafficTopupEnabled ? 'left-5' : 'left-1'
                      }`}
                    />
                  </button>
                </div>
                {trafficTopupEnabled && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="w-32 text-sm text-dark-400">Макс. лимит:</span>
                      <input
                        type="number"
                        value={maxTopupTrafficGb}
                        onChange={(e) =>
                          setMaxTopupTrafficGb(Math.max(0, parseInt(e.target.value) || 0))
                        }
                        className="w-24 rounded-lg border border-dark-500 bg-dark-600 px-3 py-2 text-dark-100 focus:border-accent-500 focus:outline-none"
                        min={0}
                      />
                      <span className="text-dark-400">ГБ</span>
                      <span className="text-xs text-dark-500">(0 = без ограничений)</span>
                    </div>
                    <div className="mt-3">
                      <span className="text-sm text-dark-400">Пакеты трафика:</span>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {[5, 10, 20, 50].map((gb) => (
                          <div key={gb} className="flex items-center gap-2">
                            <span className="w-12 text-sm text-dark-300">{gb} ГБ:</span>
                            <input
                              type="number"
                              value={(trafficTopupPackages[String(gb)] || 0) / 100}
                              onChange={(e) => {
                                const price = Math.max(0, parseFloat(e.target.value) || 0) * 100;
                                setTrafficTopupPackages((prev) => ({
                                  ...prev,
                                  [String(gb)]: price,
                                }));
                              }}
                              className="w-20 rounded border border-dark-500 bg-dark-600 px-2 py-1 text-sm text-dark-100 focus:border-accent-500 focus:outline-none"
                              min={0}
                              step={1}
                            />
                            <span className="text-xs text-dark-400">₽</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Плавающий тариф - произвольное количество дней */}
              <div className="rounded-lg bg-dark-700/50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-dark-200">
                      Произвольное количество дней
                    </h4>
                    <p className="mt-1 text-xs text-dark-500">
                      Пользователь сам выбирает срок подписки
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCustomDaysEnabled(!customDaysEnabled)}
                    className={`relative h-6 w-10 rounded-full transition-colors ${
                      customDaysEnabled ? 'bg-accent-500' : 'bg-dark-600'
                    }`}
                  >
                    <span
                      className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                        customDaysEnabled ? 'left-5' : 'left-1'
                      }`}
                    />
                  </button>
                </div>
                {customDaysEnabled && (
                  <div className="space-y-3 border-t border-dark-600 pt-2">
                    <div className="flex items-center gap-3">
                      <span className="w-32 text-sm text-dark-400">Цена за день:</span>
                      <input
                        type="number"
                        value={pricePerDayKopeks / 100}
                        onChange={(e) =>
                          setPricePerDayKopeks(Math.max(0, parseFloat(e.target.value) || 0) * 100)
                        }
                        className="w-24 rounded-lg border border-dark-500 bg-dark-600 px-3 py-2 text-dark-100 focus:border-accent-500 focus:outline-none"
                        min={0}
                        step={0.1}
                      />
                      <span className="text-dark-400">₽</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="w-32 text-sm text-dark-400">Мин. дней:</span>
                      <input
                        type="number"
                        value={minDays}
                        onChange={(e) => setMinDays(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-24 rounded-lg border border-dark-500 bg-dark-600 px-3 py-2 text-dark-100 focus:border-accent-500 focus:outline-none"
                        min={1}
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="w-32 text-sm text-dark-400">Макс. дней:</span>
                      <input
                        type="number"
                        value={maxDays}
                        onChange={(e) => setMaxDays(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-24 rounded-lg border border-dark-500 bg-dark-600 px-3 py-2 text-dark-100 focus:border-accent-500 focus:outline-none"
                        min={1}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Плавающий тариф - произвольный трафик */}
              <div className="rounded-lg bg-dark-700/50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-dark-200">
                      Произвольный объём трафика
                    </h4>
                    <p className="mt-1 text-xs text-dark-500">
                      Пользователь сам выбирает объём трафика при покупке
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCustomTrafficEnabled(!customTrafficEnabled)}
                    className={`relative h-6 w-10 rounded-full transition-colors ${
                      customTrafficEnabled ? 'bg-accent-500' : 'bg-dark-600'
                    }`}
                  >
                    <span
                      className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                        customTrafficEnabled ? 'left-5' : 'left-1'
                      }`}
                    />
                  </button>
                </div>
                {customTrafficEnabled && (
                  <div className="space-y-3 border-t border-dark-600 pt-2">
                    <div className="flex items-center gap-3">
                      <span className="w-32 text-sm text-dark-400">Цена за 1 ГБ:</span>
                      <input
                        type="number"
                        value={trafficPricePerGbKopeks / 100}
                        onChange={(e) =>
                          setTrafficPricePerGbKopeks(
                            Math.max(0, parseFloat(e.target.value) || 0) * 100,
                          )
                        }
                        className="w-24 rounded-lg border border-dark-500 bg-dark-600 px-3 py-2 text-dark-100 focus:border-accent-500 focus:outline-none"
                        min={0}
                        step={0.1}
                      />
                      <span className="text-dark-400">₽</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="w-32 text-sm text-dark-400">Мин. ГБ:</span>
                      <input
                        type="number"
                        value={minTrafficGb}
                        onChange={(e) =>
                          setMinTrafficGb(Math.max(1, parseInt(e.target.value) || 1))
                        }
                        className="w-24 rounded-lg border border-dark-500 bg-dark-600 px-3 py-2 text-dark-100 focus:border-accent-500 focus:outline-none"
                        min={1}
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="w-32 text-sm text-dark-400">Макс. ГБ:</span>
                      <input
                        type="number"
                        value={maxTrafficGb}
                        onChange={(e) =>
                          setMaxTrafficGb(Math.max(1, parseInt(e.target.value) || 1))
                        }
                        className="w-24 rounded-lg border border-dark-500 bg-dark-600 px-3 py-2 text-dark-100 focus:border-accent-500 focus:outline-none"
                        min={1}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Режим сброса трафика */}
              <div className="rounded-lg bg-dark-700/50 p-4">
                <h4 className="mb-3 text-sm font-medium text-dark-200">Режим сброса трафика</h4>
                <p className="mb-3 text-xs text-dark-500">
                  Определяет, когда сбрасывается использованный трафик у подписчиков этого тарифа
                </p>
                <div className="space-y-2">
                  {[
                    {
                      value: null,
                      label: '🌐 Глобальная настройка',
                      desc: 'Использовать значение из конфига бота',
                    },
                    { value: 'DAY', label: '📅 Ежедневно', desc: 'Сброс каждый день' },
                    { value: 'WEEK', label: '📆 Еженедельно', desc: 'Сброс каждую неделю' },
                    { value: 'MONTH', label: '🗓️ Ежемесячно', desc: 'Сброс каждый месяц' },
                    { value: 'NO_RESET', label: '🚫 Никогда', desc: 'Трафик не сбрасывается' },
                  ].map((option) => (
                    <button
                      key={option.value || 'global'}
                      type="button"
                      onClick={() => setTrafficResetMode(option.value)}
                      className={`w-full rounded-lg p-3 text-left transition-colors ${
                        trafficResetMode === option.value
                          ? 'border border-accent-500 bg-accent-500/20'
                          : 'border border-dark-500 bg-dark-600 hover:border-dark-400'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm text-dark-100">{option.label}</span>
                          <p className="mt-0.5 text-xs text-dark-400">{option.desc}</p>
                        </div>
                        {trafficResetMode === option.value && (
                          <span className="text-accent-400">
                            <CheckIcon />
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-dark-700 p-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-dark-300 transition-colors hover:text-dark-100"
          >
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name || (periodPrices.length === 0 && !customDaysEnabled) || isLoading}
            className="rounded-lg bg-accent-500 px-4 py-2 text-white transition-colors hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Daily tariff modal
interface DailyTariffModalProps {
  tariff?: TariffDetail | null;
  servers: ServerInfo[];
  onSave: (data: TariffCreateRequest | TariffUpdateRequest) => void;
  onClose: () => void;
  isLoading?: boolean;
}

function DailyTariffModal({ tariff, servers, onSave, onClose, isLoading }: DailyTariffModalProps) {
  const isEdit = !!tariff;

  const [name, setName] = useState(tariff?.name || '');
  const [description, setDescription] = useState(tariff?.description || '');
  const [trafficLimitGb, setTrafficLimitGb] = useState(tariff?.traffic_limit_gb ?? 100);
  const [deviceLimit, setDeviceLimit] = useState(tariff?.device_limit || 1);
  const [devicePriceKopeks, setDevicePriceKopeks] = useState(tariff?.device_price_kopeks || 0);
  const [maxDeviceLimit, setMaxDeviceLimit] = useState(tariff?.max_device_limit || 0);
  const [tierLevel, setTierLevel] = useState(tariff?.tier_level || 1);
  const [dailyPriceKopeks, setDailyPriceKopeks] = useState(tariff?.daily_price_kopeks || 0);
  const [selectedSquads, setSelectedSquads] = useState<string[]>(tariff?.allowed_squads || []);
  // Докупка трафика
  const [trafficTopupEnabled, setTrafficTopupEnabled] = useState(
    tariff?.traffic_topup_enabled || false,
  );
  const [maxTopupTrafficGb, setMaxTopupTrafficGb] = useState(tariff?.max_topup_traffic_gb || 0);
  const [trafficTopupPackages, setTrafficTopupPackages] = useState<Record<string, number>>(
    tariff?.traffic_topup_packages || {},
  );

  // Режим сброса трафика
  const [trafficResetMode, setTrafficResetMode] = useState<string | null>(
    tariff?.traffic_reset_mode || null,
  );

  const [activeTab, setActiveTab] = useState<'basic' | 'servers' | 'extra'>('basic');

  const handleSubmit = () => {
    const data: TariffCreateRequest | TariffUpdateRequest = {
      name,
      description: description || undefined,
      traffic_limit_gb: trafficLimitGb,
      device_limit: deviceLimit,
      device_price_kopeks: devicePriceKopeks > 0 ? devicePriceKopeks : undefined,
      max_device_limit: maxDeviceLimit > 0 ? maxDeviceLimit : undefined,
      tier_level: tierLevel,
      period_prices: [],
      allowed_squads: selectedSquads,
      traffic_topup_enabled: trafficTopupEnabled,
      traffic_topup_packages: trafficTopupPackages,
      max_topup_traffic_gb: maxTopupTrafficGb,
      is_daily: true,
      daily_price_kopeks: dailyPriceKopeks,
      traffic_reset_mode: trafficResetMode,
    };
    onSave(data);
  };

  const toggleServer = (uuid: string) => {
    setSelectedSquads((prev) =>
      prev.includes(uuid) ? prev.filter((s) => s !== uuid) : [...prev, uuid],
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-dark-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-dark-700 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-500/20 p-2 text-amber-400">
              <SunIcon />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-dark-100">
                {isEdit ? 'Редактирование тарифа' : 'Новый суточный тариф'}
              </h2>
              <p className="text-xs text-dark-500">Ежедневное списание</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 transition-colors hover:bg-dark-700">
            <XIcon />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-dark-700">
          {(['basic', 'servers', 'extra'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'border-b-2 border-amber-400 text-amber-400'
                  : 'text-dark-400 hover:text-dark-200'
              }`}
            >
              {tab === 'basic' && 'Основное'}
              {tab === 'servers' && 'Серверы'}
              {tab === 'extra' && 'Дополнительно'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'basic' && (
            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="mb-1 block text-sm text-dark-300">Название тарифа</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-dark-600 bg-dark-700 px-3 py-2 text-dark-100 focus:border-amber-500 focus:outline-none"
                  placeholder="Например: Суточный"
                />
              </div>

              {/* Description */}
              <div>
                <label className="mb-1 block text-sm text-dark-300">Описание</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full resize-none rounded-lg border border-dark-600 bg-dark-700 px-3 py-2 text-dark-100 focus:border-amber-500 focus:outline-none"
                  rows={2}
                  placeholder="Краткое описание тарифа"
                />
              </div>

              {/* Daily Price */}
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
                <label className="mb-2 block text-sm font-medium text-amber-400">
                  Цена за день
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={dailyPriceKopeks / 100}
                    onChange={(e) =>
                      setDailyPriceKopeks(Math.max(0, parseFloat(e.target.value) || 0) * 100)
                    }
                    className="w-32 rounded-lg border border-dark-600 bg-dark-700 px-3 py-2 text-dark-100 focus:border-amber-500 focus:outline-none"
                    min={0}
                    step={0.1}
                  />
                  <span className="text-dark-400">₽/день</span>
                </div>
                <p className="mt-2 text-xs text-dark-500">
                  Списывается ежедневно с баланса пользователя
                </p>
              </div>

              {/* Traffic Limit */}
              <div>
                <label className="mb-1 block text-sm text-dark-300">Лимит трафика</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={trafficLimitGb}
                    onChange={(e) => setTrafficLimitGb(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-32 rounded-lg border border-dark-600 bg-dark-700 px-3 py-2 text-dark-100 focus:border-amber-500 focus:outline-none"
                    min={0}
                  />
                  <span className="text-dark-400">ГБ</span>
                  {trafficLimitGb === 0 && (
                    <span className="flex items-center gap-1 text-sm text-success-500">
                      <InfinityIcon />
                      Безлимит
                    </span>
                  )}
                </div>
              </div>

              {/* Device Limit */}
              <div>
                <label className="mb-1 block text-sm text-dark-300">Устройств в тарифе</label>
                <input
                  type="number"
                  value={deviceLimit}
                  onChange={(e) => setDeviceLimit(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-32 rounded-lg border border-dark-600 bg-dark-700 px-3 py-2 text-dark-100 focus:border-amber-500 focus:outline-none"
                  min={1}
                />
              </div>

              {/* Tier Level */}
              <div>
                <label className="mb-1 block text-sm text-dark-300">Уровень тарифа</label>
                <input
                  type="number"
                  value={tierLevel}
                  onChange={(e) =>
                    setTierLevel(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))
                  }
                  className="w-32 rounded-lg border border-dark-600 bg-dark-700 px-3 py-2 text-dark-100 focus:border-amber-500 focus:outline-none"
                  min={1}
                  max={10}
                />
              </div>
            </div>
          )}

          {activeTab === 'servers' && (
            <div className="space-y-2">
              <p className="mb-4 text-sm text-dark-400">
                Выберите серверы, доступные на этом тарифе.
              </p>
              {servers.length === 0 ? (
                <p className="py-4 text-center text-dark-500">Нет доступных серверов</p>
              ) : (
                servers.map((server) => {
                  const isSelected = selectedSquads.includes(server.squad_uuid);
                  return (
                    <div
                      key={server.id}
                      onClick={() => toggleServer(server.squad_uuid)}
                      className={`cursor-pointer rounded-lg p-3 transition-colors ${
                        isSelected
                          ? 'border border-amber-500/50 bg-amber-500/20'
                          : 'border border-transparent bg-dark-700 hover:bg-dark-600'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-5 w-5 items-center justify-center rounded ${
                            isSelected ? 'bg-amber-500 text-white' : 'bg-dark-600'
                          }`}
                        >
                          {isSelected && <CheckIcon />}
                        </div>
                        <span className="flex-1 text-dark-200">{server.display_name}</span>
                        {server.country_code && (
                          <span className="text-xs text-dark-500">{server.country_code}</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 'extra' && (
            <div className="space-y-6">
              {/* Докупка устройств */}
              <div className="rounded-lg bg-dark-700/50 p-4">
                <h4 className="mb-3 text-sm font-medium text-dark-200">Докупка устройств</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="w-48 text-sm text-dark-400">
                      Цена за устройство (30 дней):
                    </span>
                    <input
                      type="number"
                      value={devicePriceKopeks / 100}
                      onChange={(e) =>
                        setDevicePriceKopeks(Math.max(0, parseFloat(e.target.value) || 0) * 100)
                      }
                      className="w-24 rounded-lg border border-dark-500 bg-dark-600 px-3 py-2 text-dark-100 focus:border-amber-500 focus:outline-none"
                      min={0}
                      step={1}
                    />
                    <span className="text-dark-400">₽</span>
                  </div>
                  <p className="text-xs text-dark-500">0 = докупка недоступна</p>
                  <div className="flex items-center gap-3">
                    <span className="w-48 text-sm text-dark-400">Макс. устройств на тарифе:</span>
                    <input
                      type="number"
                      value={maxDeviceLimit}
                      onChange={(e) =>
                        setMaxDeviceLimit(Math.max(0, parseInt(e.target.value) || 0))
                      }
                      className="w-24 rounded-lg border border-dark-500 bg-dark-600 px-3 py-2 text-dark-100 focus:border-amber-500 focus:outline-none"
                      min={0}
                    />
                  </div>
                  <p className="text-xs text-dark-500">0 = без ограничений</p>
                </div>
              </div>

              {/* Докупка трафика */}
              <div className="rounded-lg bg-dark-700/50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-sm font-medium text-dark-200">Докупка трафика</h4>
                  <button
                    type="button"
                    onClick={() => setTrafficTopupEnabled(!trafficTopupEnabled)}
                    className={`relative h-6 w-10 rounded-full transition-colors ${
                      trafficTopupEnabled ? 'bg-amber-500' : 'bg-dark-600'
                    }`}
                  >
                    <span
                      className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                        trafficTopupEnabled ? 'left-5' : 'left-1'
                      }`}
                    />
                  </button>
                </div>
                {trafficTopupEnabled && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="w-32 text-sm text-dark-400">Макс. лимит:</span>
                      <input
                        type="number"
                        value={maxTopupTrafficGb}
                        onChange={(e) =>
                          setMaxTopupTrafficGb(Math.max(0, parseInt(e.target.value) || 0))
                        }
                        className="w-24 rounded-lg border border-dark-500 bg-dark-600 px-3 py-2 text-dark-100 focus:border-amber-500 focus:outline-none"
                        min={0}
                      />
                      <span className="text-dark-400">ГБ</span>
                      <span className="text-xs text-dark-500">(0 = без ограничений)</span>
                    </div>
                    <div className="mt-3">
                      <span className="text-sm text-dark-400">Пакеты трафика:</span>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {[5, 10, 20, 50].map((gb) => (
                          <div key={gb} className="flex items-center gap-2">
                            <span className="w-12 text-sm text-dark-300">{gb} ГБ:</span>
                            <input
                              type="number"
                              value={(trafficTopupPackages[String(gb)] || 0) / 100}
                              onChange={(e) => {
                                const price = Math.max(0, parseFloat(e.target.value) || 0) * 100;
                                setTrafficTopupPackages((prev) => ({
                                  ...prev,
                                  [String(gb)]: price,
                                }));
                              }}
                              className="w-20 rounded border border-dark-500 bg-dark-600 px-2 py-1 text-sm text-dark-100 focus:border-amber-500 focus:outline-none"
                              min={0}
                              step={1}
                            />
                            <span className="text-xs text-dark-400">₽</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Режим сброса трафика */}
              <div className="rounded-lg bg-dark-700/50 p-4">
                <h4 className="mb-3 text-sm font-medium text-dark-200">Режим сброса трафика</h4>
                <p className="mb-3 text-xs text-dark-500">
                  Определяет, когда сбрасывается использованный трафик у подписчиков этого тарифа
                </p>
                <div className="space-y-2">
                  {[
                    {
                      value: null,
                      label: '🌐 Глобальная настройка',
                      desc: 'Использовать значение из конфига бота',
                    },
                    { value: 'DAY', label: '📅 Ежедневно', desc: 'Сброс каждый день' },
                    { value: 'WEEK', label: '📆 Еженедельно', desc: 'Сброс каждую неделю' },
                    { value: 'MONTH', label: '🗓️ Ежемесячно', desc: 'Сброс каждый месяц' },
                    { value: 'NO_RESET', label: '🚫 Никогда', desc: 'Трафик не сбрасывается' },
                  ].map((option) => (
                    <button
                      key={option.value || 'global'}
                      type="button"
                      onClick={() => setTrafficResetMode(option.value)}
                      className={`w-full rounded-lg p-3 text-left transition-colors ${
                        trafficResetMode === option.value
                          ? 'border border-amber-500 bg-amber-500/20'
                          : 'border border-dark-500 bg-dark-600 hover:border-dark-400'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm text-dark-100">{option.label}</span>
                          <p className="mt-0.5 text-xs text-dark-400">{option.desc}</p>
                        </div>
                        {trafficResetMode === option.value && (
                          <span className="text-amber-400">
                            <CheckIcon />
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-dark-700 p-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-dark-300 transition-colors hover:text-dark-100"
          >
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name || dailyPriceKopeks <= 0 || isLoading}
            className="rounded-lg bg-amber-500 px-4 py-2 text-white transition-colors hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminTariffs() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [showTypeSelect, setShowTypeSelect] = useState(false);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [showDailyModal, setShowDailyModal] = useState(false);
  const [editingTariff, setEditingTariff] = useState<TariffDetail | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // Queries
  const { data: tariffsData, isLoading } = useQuery({
    queryKey: ['admin-tariffs'],
    queryFn: () => tariffsApi.getTariffs(true),
  });

  const { data: servers = [] } = useQuery({
    queryKey: ['admin-tariffs-servers'],
    queryFn: () => tariffsApi.getAvailableServers(),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: tariffsApi.createTariff,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tariffs'] });
      setShowPeriodModal(false);
      setShowDailyModal(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: TariffUpdateRequest }) =>
      tariffsApi.updateTariff(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tariffs'] });
      setShowPeriodModal(false);
      setShowDailyModal(false);
      setEditingTariff(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: tariffsApi.deleteTariff,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tariffs'] });
      setDeleteConfirm(null);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: tariffsApi.toggleTariff,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tariffs'] });
    },
  });

  const toggleTrialMutation = useMutation({
    mutationFn: tariffsApi.toggleTrial,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tariffs'] });
    },
  });

  const handleTypeSelect = (isDaily: boolean) => {
    setShowTypeSelect(false);
    if (isDaily) {
      setShowDailyModal(true);
    } else {
      setShowPeriodModal(true);
    }
  };

  const handleEdit = async (tariffId: number) => {
    try {
      const detail = await tariffsApi.getTariff(tariffId);
      setEditingTariff(detail);
      // Открываем соответствующую модалку в зависимости от типа тарифа
      if (detail.is_daily) {
        setShowDailyModal(true);
      } else {
        setShowPeriodModal(true);
      }
    } catch (error) {
      console.error('Failed to load tariff:', error);
    }
  };

  const handleSave = (data: TariffCreateRequest | TariffUpdateRequest) => {
    if (editingTariff) {
      updateMutation.mutate({ id: editingTariff.id, data });
    } else {
      createMutation.mutate(data as TariffCreateRequest);
    }
  };

  const handleCloseModal = () => {
    setShowPeriodModal(false);
    setShowDailyModal(false);
    setEditingTariff(null);
  };

  const tariffs = tariffsData?.tariffs || [];

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/admin"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-dark-700 bg-dark-800 transition-colors hover:border-dark-600"
          >
            <BackIcon />
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-dark-100">{t('admin.tariffs.title')}</h1>
            <p className="text-sm text-dark-400">{t('admin.tariffs.subtitle')}</p>
          </div>
        </div>
        <button
          onClick={() => {
            setEditingTariff(null);
            setShowTypeSelect(true);
          }}
          className="flex items-center gap-2 rounded-lg bg-accent-500 px-4 py-2 text-white transition-colors hover:bg-accent-600"
        >
          <PlusIcon />
          {t('admin.tariffs.create')}
        </button>
      </div>

      {/* Tariffs List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
        </div>
      ) : tariffs.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-dark-400">{t('admin.tariffs.noTariffs')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tariffs.map((tariff: TariffListItem) => (
            <div
              key={tariff.id}
              className={`rounded-xl border bg-dark-800 p-4 transition-colors ${
                tariff.is_active ? 'border-dark-700' : 'border-dark-700/50 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <h3 className="truncate font-medium text-dark-100">{tariff.name}</h3>
                    {tariff.is_daily ? (
                      <span className="rounded bg-amber-500/20 px-2 py-0.5 text-xs text-amber-400">
                        Суточный
                      </span>
                    ) : (
                      <span className="rounded bg-accent-500/20 px-2 py-0.5 text-xs text-accent-400">
                        Периодный
                      </span>
                    )}
                    {tariff.is_trial_available && (
                      <span className="rounded bg-success-500/20 px-2 py-0.5 text-xs text-success-400">
                        {t('admin.tariffs.trial')}
                      </span>
                    )}
                    {!tariff.is_active && (
                      <span className="rounded bg-dark-600 px-2 py-0.5 text-xs text-dark-400">
                        {t('admin.tariffs.inactive')}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-dark-400">
                    {tariff.is_daily && tariff.daily_price_kopeks > 0 && (
                      <span className="text-amber-400">
                        {(tariff.daily_price_kopeks / 100).toFixed(2)} ₽/день
                      </span>
                    )}
                    <span>
                      {tariff.traffic_limit_gb === 0
                        ? t('admin.tariffs.unlimited')
                        : `${tariff.traffic_limit_gb} GB`}
                    </span>
                    <span>
                      {tariff.device_limit} {t('admin.tariffs.devices')}
                    </span>
                    <span>
                      {tariff.servers_count} {t('admin.tariffs.servers')}
                    </span>
                    <span>
                      {tariff.subscriptions_count} {t('admin.tariffs.subscriptions')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Toggle Active */}
                  <button
                    onClick={() => toggleMutation.mutate(tariff.id)}
                    className={`rounded-lg p-2 transition-colors ${
                      tariff.is_active
                        ? 'bg-success-500/20 text-success-400 hover:bg-success-500/30'
                        : 'bg-dark-700 text-dark-400 hover:bg-dark-600'
                    }`}
                    title={
                      tariff.is_active ? t('admin.tariffs.deactivate') : t('admin.tariffs.activate')
                    }
                  >
                    {tariff.is_active ? <CheckIcon /> : <XIcon />}
                  </button>

                  {/* Toggle Trial */}
                  <button
                    onClick={() => toggleTrialMutation.mutate(tariff.id)}
                    className={`rounded-lg p-2 transition-colors ${
                      tariff.is_trial_available
                        ? 'bg-accent-500/20 text-accent-400 hover:bg-accent-500/30'
                        : 'bg-dark-700 text-dark-400 hover:bg-dark-600'
                    }`}
                    title={t('admin.tariffs.toggleTrial')}
                  >
                    T
                  </button>

                  {/* Edit */}
                  <button
                    onClick={() => handleEdit(tariff.id)}
                    className="rounded-lg bg-dark-700 p-2 text-dark-300 transition-colors hover:bg-dark-600 hover:text-dark-100"
                    title={t('admin.tariffs.edit')}
                  >
                    <EditIcon />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => setDeleteConfirm(tariff.id)}
                    className="rounded-lg bg-dark-700 p-2 text-dark-300 transition-colors hover:bg-error-500/20 hover:text-error-400"
                    title={t('admin.tariffs.delete')}
                    disabled={tariff.subscriptions_count > 0}
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Type Selection Modal */}
      {showTypeSelect && (
        <TariffTypeSelect onSelect={handleTypeSelect} onClose={() => setShowTypeSelect(false)} />
      )}

      {/* Period Tariff Modal */}
      {showPeriodModal && (
        <PeriodTariffModal
          tariff={editingTariff}
          servers={servers}
          onSave={handleSave}
          onClose={handleCloseModal}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}

      {/* Daily Tariff Modal */}
      {showDailyModal && (
        <DailyTariffModal
          tariff={editingTariff}
          servers={servers}
          onSave={handleSave}
          onClose={handleCloseModal}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}

      {/* Delete Confirmation */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-xl bg-dark-800 p-6">
            <h3 className="mb-2 text-lg font-semibold text-dark-100">
              {t('admin.tariffs.confirmDelete')}
            </h3>
            <p className="mb-6 text-dark-400">{t('admin.tariffs.confirmDeleteText')}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-dark-300 transition-colors hover:text-dark-100"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteConfirm)}
                className="rounded-lg bg-error-500 px-4 py-2 text-white transition-colors hover:bg-error-600"
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

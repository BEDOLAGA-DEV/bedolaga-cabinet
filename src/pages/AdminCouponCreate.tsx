import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { createNumberInputHandler } from '../utils/inputHelpers';
import { couponsApi, CouponBatchCreated } from '../api/coupons';
import { tariffsApi } from '../api/tariffs';
import { usePlatform } from '../platform/hooks/usePlatform';
import { copyToClipboard } from '../utils/clipboard';
import { getApiErrorMessage } from '../utils/api-error';
import { BackIcon, CheckIcon, CopyIcon, DownloadIcon } from '@/components/icons';

const downloadLinksFile = (batch: CouponBatchCreated | { id: number; links: string[] }) => {
  const blob = new Blob([batch.links.join('\n') + '\n'], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `coupons_batch_${batch.id}.txt`;
  anchor.click();
  URL.revokeObjectURL(url);
};

export default function AdminCouponCreate() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { capabilities } = usePlatform();

  // Form state
  const [name, setName] = useState('');
  const [tariffId, setTariffId] = useState<number | null>(null);
  const [periodDays, setPeriodDays] = useState<number | ''>(30);
  const [couponsCount, setCouponsCount] = useState<number | ''>(50);
  const [priceRubles, setPriceRubles] = useState<number | ''>('');
  const [validDays, setValidDays] = useState<number | ''>('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);

  // Result state (batch created — show the generated links)
  const [created, setCreated] = useState<CouponBatchCreated | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: tariffsData } = useQuery({
    queryKey: ['admin-tariffs-for-coupon'],
    queryFn: () => tariffsApi.getTariffs(true),
  });
  const tariffs = (tariffsData?.tariffs || []).filter((tariff) => tariff.is_active);

  const createMutation = useMutation({
    mutationFn: couponsApi.createBatch,
    onSuccess: (batch) => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupon-batches'] });
      setCreated(batch);
    },
    onError: (err) => {
      setServerError(getApiErrorMessage(err, t('admin.coupons.errors.createFailed')));
    },
  });

  const validate = (): boolean => {
    const errors: string[] = [];
    if (!name.trim()) errors.push('nameRequired');
    if (!tariffId) errors.push('tariffRequired');
    if (!periodDays || periodDays < 1 || periodDays > 3650) errors.push('periodInvalid');
    if (!couponsCount || couponsCount < 1 || couponsCount > 500) errors.push('countInvalid');
    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSubmit = () => {
    setServerError(null);
    if (!validate()) return;
    createMutation.mutate({
      name: name.trim(),
      tariff_id: tariffId!,
      period_days: Number(periodDays),
      coupons_count: Number(couponsCount),
      wholesale_price_kopeks: priceRubles === '' ? 0 : Math.round(Number(priceRubles) * 100),
      valid_days: validDays === '' ? 0 : Number(validDays),
    });
  };

  const handleCopyAll = () => {
    if (!created) return;
    void copyToClipboard(created.links.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Step 2: the batch is created — show the one-time links
  if (created) {
    return (
      <div className="mx-auto max-w-2xl animate-fade-in">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-dark-100">{t('admin.coupons.created.title')}</h1>
          <p className="text-sm text-dark-400">
            #{created.id} {created.name} · {created.tariff_name} · {created.period_days}{' '}
            {t('admin.coupons.days')}
          </p>
        </div>

        <div className="mb-4 rounded-xl border border-dark-700 bg-dark-800 p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium text-dark-200">
              {t('admin.coupons.created.linksLabel', { count: created.links.length })}
            </span>
            <div className="flex gap-2">
              <button
                onClick={handleCopyAll}
                className="flex items-center gap-1.5 rounded-lg bg-dark-700 px-3 py-1.5 text-sm text-dark-200 transition-colors hover:bg-dark-600"
              >
                {copied ? <CheckIcon /> : <CopyIcon />}
                {copied ? t('admin.coupons.created.copied') : t('admin.coupons.created.copyAll')}
              </button>
              <button
                onClick={() => downloadLinksFile(created)}
                className="flex items-center gap-1.5 rounded-lg bg-dark-700 px-3 py-1.5 text-sm text-dark-200 transition-colors hover:bg-dark-600"
              >
                <DownloadIcon />
                {t('admin.coupons.created.download')}
              </button>
            </div>
          </div>
          <textarea
            readOnly
            value={created.links.join('\n')}
            rows={Math.min(12, created.links.length)}
            className="input w-full resize-none font-mono text-xs"
          />
        </div>

        <div className="flex gap-3">
          <button onClick={() => navigate('/admin/coupons')} className="btn-secondary flex-1">
            {t('admin.coupons.created.toList')}
          </button>
          <button
            onClick={() => navigate(`/admin/coupons/${created.id}`)}
            className="btn-primary flex-1"
          >
            {t('admin.coupons.created.toBatch')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        {!capabilities.hasBackButton && (
          <button
            onClick={() => navigate('/admin/coupons')}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-dark-700 bg-dark-800 transition-colors hover:border-dark-600"
          >
            <BackIcon />
          </button>
        )}
        <div>
          <h1 className="text-xl font-bold text-dark-100">{t('admin.coupons.form.title')}</h1>
          <p className="text-sm text-dark-400">{t('admin.coupons.form.subtitle')}</p>
        </div>
      </div>

      {/* Validation errors */}
      {validationErrors.length > 0 && (
        <div className="mb-4 rounded-xl border border-error-500/30 bg-error-500/10 p-4">
          <ul className="list-inside list-disc space-y-1 text-sm text-error-400">
            {validationErrors.map((error) => (
              <li key={error}>{t(`admin.coupons.validation.${error}`)}</li>
            ))}
          </ul>
        </div>
      )}
      {serverError && (
        <div className="mb-4 rounded-xl border border-error-500/30 bg-error-500/10 p-4 text-sm text-error-400">
          {serverError}
        </div>
      )}

      <div className="space-y-4 rounded-xl border border-dark-700 bg-dark-800 p-4 sm:p-6">
        {/* Name */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-dark-300">
            {t('admin.coupons.form.name')}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={255}
            placeholder={t('admin.coupons.form.namePlaceholder')}
            className="input w-full"
          />
        </div>

        {/* Tariff */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-dark-300">
            {t('admin.coupons.form.tariff')}
          </label>
          <select
            value={tariffId ?? ''}
            onChange={(e) => setTariffId(e.target.value ? Number(e.target.value) : null)}
            className="input w-full"
          >
            <option value="">{t('admin.coupons.form.selectTariff')}</option>
            {tariffs.map((tariff) => (
              <option key={tariff.id} value={tariff.id}>
                {tariff.name}
              </option>
            ))}
          </select>
        </div>

        {/* Period + count */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-dark-300">
              {t('admin.coupons.form.periodDays')}
            </label>
            <input
              type="number"
              value={periodDays}
              onChange={createNumberInputHandler(setPeriodDays, 1, 3650)}
              min={1}
              max={3650}
              className="input w-full"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-dark-300">
              {t('admin.coupons.form.couponsCount')}
            </label>
            <input
              type="number"
              value={couponsCount}
              onChange={createNumberInputHandler(setCouponsCount, 1, 500)}
              min={1}
              max={500}
              className="input w-full"
            />
          </div>
        </div>

        {/* Wholesale price + validity */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-dark-300">
              {t('admin.coupons.form.price')}
            </label>
            <input
              type="number"
              value={priceRubles}
              onChange={createNumberInputHandler(setPriceRubles, 0)}
              min={0}
              step="0.01"
              placeholder="0"
              className="input w-full"
            />
            <p className="mt-1 text-xs text-dark-500">{t('admin.coupons.form.priceHint')}</p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-dark-300">
              {t('admin.coupons.form.validDays')}
            </label>
            <input
              type="number"
              value={validDays}
              onChange={createNumberInputHandler(setValidDays, 0, 3650)}
              min={0}
              max={3650}
              placeholder="0"
              className="input w-full"
            />
            <p className="mt-1 text-xs text-dark-500">{t('admin.coupons.form.validDaysHint')}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 border-t border-dark-700 pt-4">
          <button onClick={() => navigate('/admin/coupons')} className="btn-secondary flex-1">
            {t('admin.coupons.form.cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={createMutation.isPending}
            className={`btn-primary flex-1 ${createMutation.isPending ? 'cursor-not-allowed opacity-50' : ''}`}
          >
            {createMutation.isPending
              ? t('admin.coupons.form.creating')
              : t('admin.coupons.form.create')}
          </button>
        </div>
      </div>
    </div>
  );
}

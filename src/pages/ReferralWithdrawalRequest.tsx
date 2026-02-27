import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { withdrawalApi } from '../api/withdrawals';
import { useCurrency } from '../hooks/useCurrency';

export default function ReferralWithdrawalRequest() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { formatWithCurrency, currencySymbol } = useCurrency();

  const [form, setForm] = useState({
    amount_rubles: 0,
    payment_details: '',
  });

  const { data: balance } = useQuery({
    queryKey: ['withdrawal-balance'],
    queryFn: withdrawalApi.getBalance,
  });

  // Guard: redirect if can't request
  useEffect(() => {
    if (balance && !balance.can_request) {
      navigate('/referral', { replace: true });
    }
  }, [balance, navigate]);

  const withdrawMutation = useMutation({
    mutationFn: withdrawalApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['withdrawal-balance'] });
      queryClient.invalidateQueries({ queryKey: ['withdrawal-history'] });
      navigate('/referral');
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (form.payment_details.length < 5) return;
    if (form.amount_rubles <= 0) return;
    withdrawMutation.mutate({
      amount_kopeks: Math.round(form.amount_rubles * 100),
      payment_details: form.payment_details,
    });
  };

  return (
    <div className="animate-fade-in space-y-6">
      <h1 className="text-2xl font-bold text-dark-50">{t('referral.withdrawal.requestTitle')}</h1>
      <p className="text-sm text-dark-400">
        {t('referral.withdrawal.requestDesc', {
          available: balance ? formatWithCurrency(balance.available_total / 100) : '',
        })}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bento-card space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-dark-300">
              {t('referral.withdrawal.fields.amount')}
            </label>
            <input
              type="number"
              min={balance ? Math.ceil(balance.min_amount_kopeks / 100) : 0}
              max={balance ? Math.floor(balance.available_total / 100) : 0}
              className="input w-full"
              value={form.amount_rubles || ''}
              onChange={(e) =>
                setForm({
                  ...form,
                  amount_rubles: e.target.value ? Number(e.target.value) : 0,
                })
              }
              placeholder={t('referral.withdrawal.fields.amountPlaceholder', {
                currency: currencySymbol,
              })}
            />
            <p className="mt-1 text-xs text-dark-500">
              {t('referral.withdrawal.fields.amountHint', {
                min: balance ? Math.ceil(balance.min_amount_kopeks / 100) : 0,
                currency: currencySymbol,
              })}
            </p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-dark-300">
              {balance?.requisites_text || t('referral.withdrawal.fields.paymentDetails')}
            </label>
            <textarea
              className="input min-h-[80px] w-full"
              value={form.payment_details}
              onChange={(e) => setForm({ ...form, payment_details: e.target.value })}
              placeholder={t('referral.withdrawal.fields.paymentDetailsPlaceholder')}
              required
              minLength={5}
            />
          </div>
        </div>

        {withdrawMutation.isError && (
          <div className="rounded-lg bg-error-500/10 p-3 text-sm text-error-400">
            {t('referral.withdrawal.requestError')}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate('/referral')}
            className="btn-secondary flex-1 px-5"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={
              withdrawMutation.isPending ||
              form.payment_details.length < 5 ||
              form.amount_rubles <= 0
            }
            className={`btn-primary flex-1 px-5 ${
              withdrawMutation.isPending ||
              form.payment_details.length < 5 ||
              form.amount_rubles <= 0
                ? 'opacity-50'
                : ''
            }`}
          >
            {withdrawMutation.isPending
              ? t('referral.withdrawal.requesting')
              : t('referral.withdrawal.submitRequest')}
          </button>
        </div>
      </form>
    </div>
  );
}

import { useParams, useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { withdrawalApi } from '../api/withdrawals';
import { AdminBackButton } from '../components/admin';
import { useCurrency } from '../hooks/useCurrency';
import {
  formatDate,
  getWithdrawalStatusBadge,
  getRiskColor,
  getRiskLevelColor,
} from '../utils/withdrawalUtils';

// Type for parsed risk analysis
interface RiskAnalysis {
  flags?: string[];
  balance_stats?: Record<string, unknown>;
  referral_deposits?: Record<string, unknown>;
  suspicious_referrals?: Record<string, unknown>;
  earnings_by_reason?: Record<string, unknown>;
  [key: string]: unknown;
}

export default function AdminWithdrawalDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { formatWithCurrency } = useCurrency();

  // Fetch detail
  const {
    data: detail,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['admin-withdrawal-detail', id],
    queryFn: () => withdrawalApi.getDetail(Number(id)),
    enabled: !!id,
  });

  // Mutations
  const approveMutation = useMutation({
    mutationFn: () => withdrawalApi.approve(Number(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-withdrawal-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-withdrawals'] });
    },
  });

  const completeMutation = useMutation({
    mutationFn: () => withdrawalApi.complete(Number(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-withdrawal-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-withdrawals'] });
    },
  });

  // Loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
      </div>
    );
  }

  // Error
  if (error || !detail) {
    return (
      <div className="animate-fade-in">
        <div className="mb-6 flex items-center gap-3">
          <AdminBackButton to="/admin/withdrawals" />
          <h1 className="text-xl font-semibold text-dark-100">
            {t('admin.withdrawals.detail.title')}
          </h1>
        </div>
        <div className="rounded-xl border border-error-500/30 bg-error-500/10 p-6 text-center">
          <p className="text-error-400">{t('admin.withdrawals.detail.loadError')}</p>
          <button
            onClick={() => navigate('/admin/withdrawals')}
            className="mt-4 text-sm text-dark-400 hover:text-dark-200"
          >
            {t('common.back')}
          </button>
        </div>
      </div>
    );
  }

  const badge = getWithdrawalStatusBadge(detail.status);
  const riskColor = getRiskColor(detail.risk_score);

  // Parse risk analysis
  const riskAnalysis = (detail.risk_analysis || {}) as RiskAnalysis;
  const flags = riskAnalysis.flags || [];

  const riskLevelKey = detail.risk_level;
  const riskLevelBadge = getRiskLevelColor(riskLevelKey);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <AdminBackButton to="/admin/withdrawals" />
          <div>
            <h1 className="text-xl font-semibold text-dark-100">
              {t('admin.withdrawals.detail.title')} #{detail.id}
            </h1>
            <div className="mt-1 flex items-center gap-2">
              <span className={`rounded px-2 py-0.5 text-xs ${badge.bgColor} ${badge.color}`}>
                {t(badge.labelKey)}
              </span>
              <span className="font-semibold text-dark-100">
                {formatWithCurrency(detail.amount_kopeks / 100, 0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* User Info Section */}
        <div className="rounded-xl border border-dark-700 bg-dark-800 p-4">
          <h3 className="mb-4 font-medium text-dark-200">
            {t('admin.withdrawals.detail.userInfo')}
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-dark-700/50 p-3">
              <div className="mb-1 text-sm text-dark-400">
                {t('admin.withdrawals.detail.username')}
              </div>
              <div className="text-sm font-medium text-dark-200">
                {detail.username ? `@${detail.username}` : detail.first_name || '-'}
              </div>
            </div>
            <div className="rounded-lg bg-dark-700/50 p-3">
              <div className="mb-1 text-sm text-dark-400">
                {t('admin.withdrawals.detail.telegramId')}
              </div>
              <div className="font-mono text-sm font-medium text-dark-200">
                {detail.telegram_id ?? '-'}
              </div>
            </div>
            <div className="rounded-lg bg-dark-700/50 p-3">
              <div className="mb-1 text-sm text-dark-400">
                {t('admin.withdrawals.detail.balance')}
              </div>
              <div className="text-sm font-medium text-dark-200">
                {formatWithCurrency(detail.balance_kopeks / 100)}
              </div>
            </div>
            <div className="rounded-lg bg-dark-700/50 p-3">
              <div className="mb-1 text-sm text-dark-400">
                {t('admin.withdrawals.detail.totalReferrals')}
              </div>
              <div className="text-lg font-medium text-dark-200">{detail.total_referrals}</div>
            </div>
            <div className="rounded-lg bg-dark-700/50 p-3">
              <div className="mb-1 text-sm text-dark-400">
                {t('admin.withdrawals.detail.totalEarnings')}
              </div>
              <div className="text-sm font-medium text-dark-200">
                {formatWithCurrency(detail.total_earnings_kopeks / 100)}
              </div>
            </div>
            <div className="rounded-lg bg-dark-700/50 p-3">
              <div className="mb-1 text-sm text-dark-400">
                {t('admin.withdrawals.detail.createdAt')}
              </div>
              <div className="text-sm font-medium text-dark-200">
                {formatDate(detail.created_at)}
              </div>
            </div>
          </div>
        </div>

        {/* Payment Details Section */}
        <div className="rounded-xl border border-dark-700 bg-dark-800 p-4">
          <h3 className="mb-3 font-medium text-dark-200">
            {t('admin.withdrawals.detail.paymentDetails')}
          </h3>
          <div className="rounded-lg bg-dark-700/50 p-3">
            <p className="whitespace-pre-wrap break-all text-sm text-dark-300">
              {detail.payment_details || t('admin.withdrawals.detail.noPaymentDetails')}
            </p>
          </div>
        </div>

        {/* Risk Analysis Section */}
        <div className="rounded-xl border border-dark-700 bg-dark-800 p-4">
          <h3 className="mb-4 font-medium text-dark-200">
            {t('admin.withdrawals.detail.riskAnalysis')}
          </h3>

          {/* Risk Score Bar */}
          <div className="mb-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-dark-400">
                  {t('admin.withdrawals.detail.riskScore')}
                </span>
                <span className={`text-lg font-bold ${riskColor.text}`}>{detail.risk_score}</span>
              </div>
              <span
                className={`rounded px-2 py-0.5 text-xs ${riskLevelBadge.bg} ${riskLevelBadge.text}`}
              >
                {t(`admin.withdrawals.detail.riskLevel.${riskLevelKey}`)}
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-dark-700">
              <div
                className={`h-full rounded-full transition-all ${riskColor.bar}`}
                style={{ width: `${Math.min(detail.risk_score, 100)}%` }}
              />
            </div>
          </div>

          {/* Flags */}
          {flags.length > 0 && (
            <div className="mb-4">
              <div className="mb-2 text-sm text-dark-400">
                {t('admin.withdrawals.detail.flags')}
              </div>
              <div className="space-y-1">
                {flags.map((flag, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 rounded-lg bg-error-500/10 px-3 py-2"
                  >
                    <svg
                      className="mt-0.5 h-4 w-4 shrink-0 text-error-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                      />
                    </svg>
                    <span className="text-sm text-error-300">{flag}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detailed Breakdown */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {riskAnalysis.balance_stats && (
              <div className="rounded-lg bg-dark-700/50 p-3">
                <div className="mb-2 text-sm font-medium text-dark-300">
                  {t('admin.withdrawals.detail.balanceStats')}
                </div>
                {Object.entries(riskAnalysis.balance_stats).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between text-xs">
                    <span className="text-dark-500">{key}</span>
                    <span className="text-dark-300">{String(value)}</span>
                  </div>
                ))}
              </div>
            )}

            {riskAnalysis.referral_deposits && (
              <div className="rounded-lg bg-dark-700/50 p-3">
                <div className="mb-2 text-sm font-medium text-dark-300">
                  {t('admin.withdrawals.detail.referralDeposits')}
                </div>
                {Object.entries(riskAnalysis.referral_deposits).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between text-xs">
                    <span className="text-dark-500">{key}</span>
                    <span className="text-dark-300">{String(value)}</span>
                  </div>
                ))}
              </div>
            )}

            {riskAnalysis.suspicious_referrals && (
              <div className="rounded-lg bg-dark-700/50 p-3">
                <div className="mb-2 text-sm font-medium text-dark-300">
                  {t('admin.withdrawals.detail.suspiciousReferrals')}
                </div>
                {Object.entries(riskAnalysis.suspicious_referrals).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between text-xs">
                    <span className="text-dark-500">{key}</span>
                    <span className="text-dark-300">{String(value)}</span>
                  </div>
                ))}
              </div>
            )}

            {riskAnalysis.earnings_by_reason && (
              <div className="rounded-lg bg-dark-700/50 p-3">
                <div className="mb-2 text-sm font-medium text-dark-300">
                  {t('admin.withdrawals.detail.earningsByReason')}
                </div>
                {Object.entries(riskAnalysis.earnings_by_reason).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between text-xs">
                    <span className="text-dark-500">{key}</span>
                    <span className="text-dark-300">{String(value)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Admin Comment Section */}
        {detail.admin_comment && (
          <div className="rounded-xl border border-dark-700 bg-dark-800 p-4">
            <h3 className="mb-3 font-medium text-dark-200">
              {t('admin.withdrawals.detail.adminComment')}
            </h3>
            <div className="rounded-lg bg-dark-700/50 p-3">
              <p className="whitespace-pre-wrap text-sm text-dark-300">{detail.admin_comment}</p>
            </div>
          </div>
        )}

        {/* Processed At */}
        {detail.processed_at && (
          <div className="rounded-xl border border-dark-700 bg-dark-800 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-dark-400">
                {t('admin.withdrawals.detail.processedAt')}
              </span>
              <span className="text-sm text-dark-200">{formatDate(detail.processed_at)}</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {detail.status === 'pending' && (
          <div className="flex gap-3">
            <button
              onClick={() => approveMutation.mutate()}
              disabled={approveMutation.isPending}
              className="flex-1 rounded-lg bg-success-500 px-4 py-3 font-medium text-white transition-colors hover:bg-success-600 disabled:opacity-50"
            >
              {approveMutation.isPending
                ? t('admin.withdrawals.detail.approving')
                : t('admin.withdrawals.detail.approve')}
            </button>
            <button
              onClick={() =>
                navigate(`/admin/withdrawals/${id}/reject`, {
                  state: {
                    amountKopeks: detail.amount_kopeks,
                    username: detail.username,
                    firstName: detail.first_name,
                  },
                })
              }
              className="flex-1 rounded-lg bg-error-500 px-4 py-3 font-medium text-white transition-colors hover:bg-error-600"
            >
              {t('admin.withdrawals.detail.reject')}
            </button>
          </div>
        )}

        {detail.status === 'approved' && (
          <div>
            <button
              onClick={() => completeMutation.mutate()}
              disabled={completeMutation.isPending}
              className="w-full rounded-lg bg-accent-500 px-4 py-3 font-medium text-white transition-colors hover:bg-accent-600 disabled:opacity-50"
            >
              {completeMutation.isPending
                ? t('admin.withdrawals.detail.completing')
                : t('admin.withdrawals.detail.complete')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

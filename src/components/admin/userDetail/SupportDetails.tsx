import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import type {
  SubscriptionRequestRecord,
  UserPanelInfo,
  UserSubscriptionInfo,
} from '@/api/adminUsers';
import { DropdownSelect } from '@/components/admin/bulkActions/DropdownSelect';
import { ChevronDownIcon, CopyIcon } from '@/components/icons';
import { Spinner } from '@/components/ui/Spinner';

interface SupportDetailsProps {
  panelInfo: UserPanelInfo | null;
  copyToClipboard: (text: string) => void | Promise<void>;
  reachabilityLink?: string | null;
  userSubscriptions: UserSubscriptionInfo[];
  requestHistory: SubscriptionRequestRecord[];
  requestHistoryLoading: boolean;
  requestHistoryTotal: number;
  requestHistoryOffset: number;
  requestHistorySubId: number | null;
  requestHistoryExpanded: boolean;
  onRequestHistoryExpandedChange: (open: boolean) => void;
  onRequestHistorySubIdChange: (id: number | null) => void;
  onLoadRequestHistory: (offset: number, append?: boolean) => Promise<void>;
  formatDate: (date: string | null) => string;
}

/**
 * Свёрнутые техданные: ссылки, ключи и история запросов подписки.
 * Нужны поддержке раз в неделю, поэтому не спорят с действиями сверху.
 */
export function SupportDetails(props: SupportDetailsProps) {
  const { t } = useTranslation();
  const {
    panelInfo,
    copyToClipboard,
    reachabilityLink,
    userSubscriptions,
    requestHistory,
    requestHistoryLoading,
    requestHistoryTotal,
    requestHistoryOffset,
    requestHistorySubId,
    requestHistoryExpanded,
    onRequestHistoryExpandedChange,
    onRequestHistorySubIdChange,
    onLoadRequestHistory,
    formatDate,
  } = props;

  const secrets: { key: string; label: string; value: string | null }[] = panelInfo?.found
    ? [
        {
          key: 'url',
          label: t('admin.users.detail.subscriptionUrl'),
          value: panelInfo.subscription_url,
        },
        { key: 'happ', label: t('admin.users.detail.happLink'), value: panelInfo.happ_link },
        { key: 'vless', label: t('admin.users.detail.vlessUuid'), value: panelInfo.vless_uuid },
        {
          key: 'trojan',
          label: t('admin.users.detail.trojanPassword'),
          value: panelInfo.trojan_password,
        },
        { key: 'ss', label: t('admin.users.detail.ssPassword'), value: panelInfo.ss_password },
      ].filter((item) => item.value)
    : [];

  return (
    <details
      open={requestHistoryExpanded}
      onToggle={(event) => {
        const open = (event.currentTarget as HTMLDetailsElement).open;
        onRequestHistoryExpandedChange(open);
        if (open && requestHistory.length === 0) onLoadRequestHistory(0);
      }}
      className="group rounded-2xl border border-dark-700/40 bg-dark-900/40"
    >
      <summary className="flex cursor-pointer list-none items-center gap-2.5 px-4 py-3.5 text-dark-300 [&::-webkit-details-marker]:hidden">
        <ChevronDownIcon className="h-4 w-4 shrink-0 text-dark-500 transition-transform group-open:rotate-180" />
        <span className="font-semibold">{t('admin.users.detail.subscription.support.title')}</span>
        <span className="hidden min-w-0 truncate text-xs text-dark-500 sm:inline">
          {t('admin.users.detail.subscription.support.hint')}
        </span>
      </summary>
      <div className="flex flex-col gap-3 px-4 pb-4">
        {panelInfo && !panelInfo.found && (
          <p className="text-sm text-dark-500">{t('admin.users.detail.panelNotFound')}</p>
        )}
        {secrets.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => copyToClipboard(item.value as string)}
            title={t('common.copy')}
            className="flex w-full items-center gap-3 rounded-xl bg-dark-800/60 px-3 py-2 text-left transition-colors hover:bg-dark-800"
          >
            <div className="min-w-0 flex-1">
              <div className="text-xs text-dark-500">{item.label}</div>
              <div className="truncate font-mono text-xs text-dark-200">{item.value}</div>
            </div>
            <CopyIcon className="h-4 w-4 shrink-0 text-dark-500" />
          </button>
        ))}
        {reachabilityLink && (
          <Link to={reachabilityLink} className="btn-secondary self-start">
            {t('admin.reachability.shortcuts.checkSubscription')}
          </Link>
        )}

        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-dark-200">
            {t('admin.users.detail.requestHistory')}
          </span>
          {requestHistoryTotal > 0 && (
            <span className="rounded-full bg-accent-500/15 px-2 py-0.5 text-xs font-medium text-accent-400">
              {requestHistoryTotal}
            </span>
          )}
          {userSubscriptions.length > 1 && (
            <label className="ml-auto flex items-center gap-2 text-xs text-dark-500">
              <span className="sr-only">{t('admin.users.detail.sync.selectSubscription')}</span>
              <DropdownSelect
                value={requestHistorySubId ? String(requestHistorySubId) : ''}
                onChange={(value) => onRequestHistorySubIdChange(Number(value) || null)}
                className="min-w-[180px]"
                options={userSubscriptions.map((sub) => ({
                  value: String(sub.id),
                  label: sub.tariff_name || `#${sub.id}`,
                }))}
              />
            </label>
          )}
        </div>

        {requestHistoryLoading && requestHistory.length === 0 ? (
          <div className="flex justify-center py-4">
            <Spinner className="h-5 w-5" />
          </div>
        ) : requestHistory.length === 0 ? (
          <p className="text-sm text-dark-500">{t('admin.users.detail.noRequests')}</p>
        ) : (
          <>
            <div className="-mx-4 overflow-x-auto px-4">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead>
                  <tr className="border-b border-dark-700/50 text-xs text-dark-500">
                    <th className="pb-2 pr-3 font-medium">{t('admin.users.detail.requestAt')}</th>
                    <th className="pb-2 pr-3 font-medium">{t('admin.users.detail.requestIp')}</th>
                    <th className="pb-2 font-medium">{t('admin.users.detail.requestUserAgent')}</th>
                  </tr>
                </thead>
                <tbody>
                  {requestHistory.map((record) => (
                    <tr key={record.id} className="border-b border-dark-800">
                      <td className="whitespace-nowrap py-2 pr-3 text-dark-200">
                        {formatDate(record.requestAt)}
                      </td>
                      <td className="whitespace-nowrap py-2 pr-3 font-mono text-xs text-dark-300">
                        {record.requestIp || '—'}
                      </td>
                      <td
                        className="max-w-[240px] truncate py-2 text-xs text-dark-400"
                        title={record.userAgent || ''}
                      >
                        {record.userAgent || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {requestHistory.length < requestHistoryTotal && (
              <button
                type="button"
                onClick={() => onLoadRequestHistory(requestHistoryOffset, true)}
                disabled={requestHistoryLoading}
                className="btn-secondary self-start"
              >
                {requestHistoryLoading ? (
                  <Spinner className="h-4 w-4" />
                ) : (
                  t('admin.users.detail.loadMore')
                )}
              </button>
            )}
          </>
        )}
      </div>
    </details>
  );
}

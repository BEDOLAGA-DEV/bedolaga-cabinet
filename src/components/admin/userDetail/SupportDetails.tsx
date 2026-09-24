import { useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useInfiniteQuery } from '@tanstack/react-query';
import { adminUsersApi, type UserPanelInfo } from '@/api/adminUsers';
import { ChevronDownIcon, CopyIcon, RadarIcon, WallIcon } from '@/components/icons';
import { Spinner } from '@/components/ui/Spinner';
import { useNotify } from '@/platform/hooks/useNotify';
import { copyToClipboard } from '@/utils/clipboard';
import { uiLocale } from '@/utils/uiLocale';

interface SupportDetailsProps {
  userId: number;
  /** История запросов и ключи — по выбранной подписке (мультитариф). */
  subscriptionId: number | null;
  panelInfo: UserPanelInfo | null;
  remnawaveId: number | null;
  reachabilityLink: string | null;
  /** Проверка подписки в DPI//CHECKER; null — раздел выключен или нет права. */
  dpicheckerLink?: string | null;
}

const HISTORY_PAGE = 20;

/**
 * Свёрнутые техданные: ссылки, ключи, номер в панели и история запросов подписки.
 * Нужны поддержке раз в неделю, поэтому не спорят с действиями сверху.
 * История грузится только когда блок раскрыт.
 */
export function SupportDetails({
  userId,
  subscriptionId,
  panelInfo,
  remnawaveId,
  reachabilityLink,
  dpicheckerLink = null,
}: SupportDetailsProps) {
  const { t } = useTranslation();
  const notify = useNotify();
  const [open, setOpen] = useState(false);
  const ns = 'admin.users.detail';

  const history = useInfiniteQuery({
    queryKey: ['admin-user-request-history', userId, subscriptionId] as const,
    queryFn: ({ pageParam }) =>
      adminUsersApi.getSubscriptionRequestHistory(
        userId,
        subscriptionId ?? undefined,
        pageParam,
        HISTORY_PAGE,
      ),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => {
      const loaded = pages.reduce((sum, page) => sum + page.records.length, 0);
      return last.records.length > 0 && loaded < last.total ? loaded : undefined;
    },
    enabled: open,
  });
  const records = history.data?.pages.flatMap((page) => page.records) ?? [];

  const copy = async (value: string) => {
    try {
      await copyToClipboard(value);
      notify.success(t(`${ns}.copied`));
    } catch {
      notify.error(t('common.error'));
    }
  };

  const secrets = [
    { key: 'url', label: t(`${ns}.subscriptionUrl`), value: panelInfo?.subscription_url },
    { key: 'happ', label: t(`${ns}.happLink`), value: panelInfo?.happ_link },
    { key: 'vless', label: t(`${ns}.vlessUuid`), value: panelInfo?.vless_uuid },
    { key: 'trojan', label: t(`${ns}.trojanPassword`), value: panelInfo?.trojan_password },
    { key: 'ss', label: t(`${ns}.ssPassword`), value: panelInfo?.ss_password },
    {
      key: 'panelId',
      label: t(`${ns}.panel.remnawaveId`),
      value: remnawaveId ? String(remnawaveId) : null,
    },
  ].filter((item): item is { key: string; label: string; value: string } => Boolean(item.value));

  return (
    <details
      open={open}
      onToggle={(event) => setOpen((event.currentTarget as HTMLDetailsElement).open)}
      className="group rounded-2xl border border-dark-700/40 bg-dark-900/40"
    >
      <summary className="flex cursor-pointer list-none items-center gap-2.5 px-4 py-3.5 text-dark-300 [&::-webkit-details-marker]:hidden">
        <ChevronDownIcon className="h-4 w-4 shrink-0 text-dark-500 transition-transform group-open:rotate-180" />
        <span className="font-semibold">{t(`${ns}.subscription.support.title`)}</span>
        <span className="hidden min-w-0 truncate text-xs text-dark-500 sm:inline">
          {t(`${ns}.subscription.support.hint`)}
        </span>
      </summary>
      <div className="flex flex-col gap-3 px-4 pb-4">
        {panelInfo && !panelInfo.found && (
          <p className="text-sm text-dark-500">{t(`${ns}.panelNotFound`)}</p>
        )}
        {secrets.map((item) => (
          <div
            key={item.key}
            className="flex flex-wrap items-center gap-x-2 gap-y-1.5 rounded-xl bg-dark-800/60 py-1.5 pl-3 pr-1.5"
          >
            <div className="min-w-0 flex-1 basis-56">
              <div className="text-xs text-dark-500">{item.label}</div>
              <div className="truncate font-mono text-xs text-dark-200">{item.value}</div>
            </div>
            {/* Проверка — у той ссылки, которую проверяет BSCHEKER, а не отдельной кнопкой под
                списком и не пунктом «Проверить конфиги (РФ)» в «⋯», где не было видно, что это он. */}
            {item.key === 'url' && reachabilityLink && (
              <Link
                to={reachabilityLink}
                // На телефоне — отдельной строкой под ссылкой: рядом она сжимала адрес до «https://…».
                className="btn-secondary order-last mb-1 min-h-0 shrink-0 gap-1.5 px-2.5 py-1.5 text-xs sm:order-none sm:mb-0"
              >
                <RadarIcon className="h-4 w-4" />
                {t('admin.reachability.shortcuts.checkSubscription')}
              </Link>
            )}
            {item.key === 'url' && dpicheckerLink && (
              <Link
                to={dpicheckerLink}
                className="btn-secondary order-last mb-1 min-h-0 shrink-0 gap-1.5 px-2.5 py-1.5 text-xs sm:order-none sm:mb-0"
              >
                <WallIcon className="h-4 w-4" />
                {t('admin.dpichecker.shortcuts.checkSubscription')}
              </Link>
            )}
            <button
              type="button"
              onClick={() => void copy(item.value)}
              aria-label={`${t('common.copy')}: ${item.label}`}
              title={t('common.copy')}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-dark-500 transition-colors hover:bg-dark-700/60 hover:text-dark-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/40"
            >
              <CopyIcon className="h-4 w-4" />
            </button>
          </div>
        ))}

        <div className="mt-1 flex items-center gap-2">
          <span className="text-sm font-semibold text-dark-200">{t(`${ns}.requestHistory`)}</span>
          {history.data && history.data.pages[0].total > 0 && (
            <span className="text-xs tabular-nums text-dark-500">
              {history.data.pages[0].total}
            </span>
          )}
        </div>

        {history.isLoading ? (
          <div className="flex justify-center py-4">
            <Spinner className="h-5 w-5" />
          </div>
        ) : records.length === 0 ? (
          <p className="text-sm text-dark-500">{t(`${ns}.noRequests`)}</p>
        ) : (
          <>
            <ul className="m-0 list-none divide-y divide-dark-800/80 p-0">
              {records.map((record) => (
                <li key={record.id} className="flex items-start gap-3 py-2 text-sm">
                  <span className="w-28 shrink-0 tabular-nums text-dark-300">
                    {new Date(record.requestAt).toLocaleString(uiLocale(), {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-dark-200" title={record.userAgent ?? ''}>
                      {record.userAgent || '—'}
                    </span>
                    <span className="block font-mono text-xs text-dark-500">
                      {record.requestIp || '—'}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            {history.hasNextPage && (
              <button
                type="button"
                onClick={() => void history.fetchNextPage()}
                disabled={history.isFetchingNextPage}
                className="btn-secondary self-start"
              >
                {history.isFetchingNextPage ? <Spinner className="h-4 w-4" /> : t(`${ns}.loadMore`)}
              </button>
            )}
          </>
        )}
      </div>
    </details>
  );
}

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { balanceApi } from '@/api/balance';
import { subscriptionApi } from '@/api/subscription';
import { LiteMeter } from '@/components/lite/LiteMeter';
import { LitePromoSlot } from '@/components/lite/LitePromoSlot';
import { LiteRow, LiteRowGroup } from '@/components/lite/LiteRow';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { API } from '@/config/constants';
import { useCurrency } from '@/hooks/useCurrency';
import { getApiErrorMessage } from '@/utils/api-error';
import { formatLiteDate } from '@/utils/liteDate';
import { liteStatus, type LiteAction } from '@/utils/liteStatus';

/** Единственное главное действие экрана — ссылкой или кнопкой, вид один. */
const PRIMARY_ACTION_CLASS =
  'flex w-full items-center justify-center rounded-2xl bg-accent-500 px-5 py-4 text-[15px] font-semibold text-on-accent transition-colors hover:bg-accent-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent';

/**
 * Простой вид главного экрана.
 *
 * Держит одно правило: на первом экране ровно одна фраза о состоянии, одна
 * шкала и одно действие. Всё, что человек делает реже раза в месяц, живёт на
 * странице подписки — она и есть «управление» второго уровня, отдельного
 * экрана под него заводить не пришлось.
 *
 * Полный вид (Dashboard) остаётся нетронутым: переключение — настройка
 * оператора, и откатиться он должен мгновенно.
 */
export default function DashboardLite() {
  const { t } = useTranslation();
  const { formatAmount, currencySymbol } = useCurrency();

  const {
    data: list,
    isLoading: listLoading,
    isError: listFailed,
    refetch: refetchList,
  } = useQuery({
    queryKey: ['subscriptions-list'],
    queryFn: () => subscriptionApi.getSubscriptions(),
    staleTime: 60_000,
  });

  const subscriptions = useMemo(() => list?.subscriptions ?? [], [list]);
  const isMultiTariff = list?.multi_tariff_enabled ?? false;
  const hasMany = isMultiTariff && subscriptions.length > 1;

  // В мультитарифе запрос без id возвращает пусто, поэтому единственную
  // подписку приходится спрашивать по её id — иначе на экране не будет ни
  // трафика, ни срока.
  const singleId = isMultiTariff && subscriptions.length === 1 ? subscriptions[0].id : undefined;
  const wantsSingle = Boolean(list) && !hasMany;

  const {
    data: subscriptionResponse,
    isLoading: subLoading,
    isError: subFailed,
    refetch: refetchSubscription,
  } = useQuery({
    queryKey: singleId ? ['subscription', singleId] : ['subscription'],
    queryFn: () => subscriptionApi.getSubscription(singleId),
    enabled: wantsSingle,
    retry: false,
    staleTime: API.BALANCE_STALE_TIME_MS,
  });

  const subscription = subscriptionResponse?.subscription ?? null;

  const { data: balance } = useQuery({
    queryKey: ['balance'],
    queryFn: balanceApi.getBalance,
    staleTime: API.BALANCE_STALE_TIME_MS,
  });

  const { data: devices } = useQuery({
    queryKey: singleId ? ['devices', singleId] : ['devices'],
    queryFn: () => subscriptionApi.getDevices(singleId),
    enabled: Boolean(subscription),
    staleTime: API.BALANCE_STALE_TIME_MS,
  });

  // Пробный период предлагается ТОЛЬКО здесь: витрина тарифов его не включает,
  // она умеет лишь предлагать апгрейд уже начатому триалу. Без этого запроса
  // простой вид тихо прятал бы бесплатный вход от новых людей.
  const { data: trialInfo } = useQuery({
    queryKey: ['trial-info'],
    queryFn: () => subscriptionApi.getTrialInfo(),
    enabled: wantsSingle && !subLoading && !subscription,
    retry: false,
  });

  const queryClient = useQueryClient();
  const [trialError, setTrialError] = useState<string | null>(null);

  const activateTrial = useMutation({
    mutationFn: () => subscriptionApi.activateTrial(),
    onSuccess: () => {
      setTrialError(null);
      for (const key of ['subscription', 'subscriptions-list', 'trial-info', 'balance']) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
    },
    onError: (error: unknown) => {
      setTrialError(getApiErrorMessage(error, t('common.error')));
    },
  });

  const status = liteStatus(subscription);
  const subscriptionId = subscription?.id;
  const offersTrial = status.action === 'buy' && Boolean(trialInfo?.is_available);

  const actionPath: Record<LiteAction, string> = {
    connect: subscriptionId ? `/connection?sub=${subscriptionId}` : '/connection',
    renew: subscriptionId ? `/subscriptions/${subscriptionId}/renew` : '/subscription/purchase',
    buy: '/subscription/purchase',
    manage: subscriptionId ? `/subscriptions/${subscriptionId}` : '/subscriptions',
    chooseTariff: '/subscription/purchase',
  };

  const isLoading = listLoading || (wantsSingle && subLoading);

  // Отказ сети нельзя показывать как «подписки пока нет»: платящий человек
  // увидел бы предложение купить то, что у него уже есть, и решил бы, что
  // подписка пропала. Молчание здесь хуже ошибки.
  if (listFailed || subFailed) {
    return (
      <div className="mx-auto w-full max-w-lg pt-8">
        <div role="alert">
          <h1 className="text-[28px] font-bold leading-[1.15] tracking-tight text-dark-50">
            {t('lite.error.load', 'Не удалось загрузить данные')}
          </h1>
          <p className="mt-3 text-[15px] text-dark-400">
            {t('lite.error.hint', 'Проверьте связь и повторите')}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (listFailed) refetchList();
            if (subFailed) refetchSubscription();
          }}
          className={`${PRIMARY_ACTION_CLASS} mt-6`}
        >
          {t('lite.error.retry', 'Повторить')}
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-lg">
        <SkeletonGroup className="pb-7 pt-8">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="mt-3 h-8 w-40" />
          <Skeleton className="mt-7 h-1.5 w-full rounded-full" />
          <Skeleton className="mt-3 h-4 w-32" />
        </SkeletonGroup>
        <Skeleton className="h-14 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg">
      {hasMany ? (
        <ManySubscriptions
          items={subscriptions.map((item) => ({
            id: item.id,
            name: item.tariff_name,
            endDate: item.end_date,
          }))}
        />
      ) : (
        <section className="pb-7 pt-8">
          <h1 className="text-[28px] font-bold leading-[1.15] tracking-tight text-dark-50">
            {t(`lite.status.${status.key}`, {
              date: formatLiteDate(status.date),
            })}
          </h1>
          {subscription && (
            <div className="mt-7">
              <LiteMeter
                usedGb={subscription.traffic_used_gb}
                limitGb={subscription.traffic_limit_gb}
                usedPercent={subscription.traffic_used_percent}
              />
            </div>
          )}
        </section>
      )}

      {!hasMany &&
        (offersTrial ? (
          <button
            type="button"
            onClick={() => activateTrial.mutate()}
            disabled={activateTrial.isPending}
            className={`${PRIMARY_ACTION_CLASS} disabled:opacity-60`}
          >
            {trialInfo?.requires_payment
              ? t('lite.action.tryPaid', {
                  price: `${formatAmount(trialInfo.price_rubles)} ${currencySymbol}`,
                })
              : t('lite.action.tryFree')}
          </button>
        ) : (
          <Link to={actionPath[status.action]} className={PRIMARY_ACTION_CLASS}>
            {t(`lite.action.${status.action}`)}
          </Link>
        ))}

      {trialError && (
        <p className="mt-3 text-sm text-error-400" role="alert">
          {trialError}
        </p>
      )}

      <div className="mt-6">
        <LiteRowGroup>
          {subscription && (
            <LiteRow
              to={`/connection?sub=${subscription.id}`}
              label={t('lite.rows.devices', 'Устройства')}
              value={
                subscription.device_limit > 0
                  ? t('lite.rows.devicesValue', '{{used}} из {{total}}', {
                      used: devices?.total ?? 0,
                      total: subscription.device_limit,
                    })
                  : (devices?.total ?? 0)
              }
            />
          )}
          {offersTrial && (
            <LiteRow
              to="/subscription/purchase"
              label={t('lite.rows.plans', 'Посмотреть тарифы')}
            />
          )}
          <LiteRow
            to="/balance"
            label={t('lite.rows.balance', 'Баланс')}
            value={`${formatAmount(balance?.balance_rubles ?? 0)} ${currencySymbol}`}
          />
          {subscription && (
            <LiteRow
              to={`/subscriptions/${subscription.id}`}
              label={t('lite.rows.manage', 'Управление подпиской')}
            />
          )}
          {hasMany && (
            <LiteRow
              to="/subscription/purchase"
              label={t('lite.rows.buyAnother', 'Купить ещё тариф')}
            />
          )}
          <LiteRow to="/support" label={t('lite.rows.support', 'Поддержка')} />
        </LiteRowGroup>
      </div>

      <div className="mt-2">
        <LitePromoSlot />
      </div>
    </div>
  );
}

interface ManySubscriptionsProps {
  items: { id: number; name: string | null; endDate: string | null }[];
}

/**
 * Несколько подписок: один экран начинается уже внутри конкретной подписки,
 * поэтому здесь — только выбор. Шкалы и кнопки действия тут нет намеренно:
 * они относятся к подписке, а не к их списку.
 */
function ManySubscriptions({ items }: ManySubscriptionsProps) {
  const { t } = useTranslation();

  return (
    <section className="pb-2 pt-8">
      <h1 className="text-[28px] font-bold leading-[1.15] tracking-tight text-dark-50">
        {t('lite.status.many', 'Ваши подписки')}
      </h1>
      <div className="mt-6">
        <LiteRowGroup>
          {items.map((item) => (
            <LiteRow
              key={item.id}
              to={`/subscriptions/${item.id}`}
              label={item.name || t('lite.subscription.untitled', 'Подписка')}
              value={item.endDate ? formatLiteDate(item.endDate) : undefined}
            />
          ))}
        </LiteRowGroup>
      </div>
    </section>
  );
}

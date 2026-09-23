import { useState } from 'react';

import { useQuery } from '@tanstack/react-query';

import { useTranslation } from 'react-i18next';

import { Link, useNavigate, useParams } from 'react-router';

import { subscriptionApi } from '@/api/subscription';

import { LiteMeter } from '@/components/lite/LiteMeter';

import { LitePremiumRows } from '@/components/lite/LitePremiumRows';
import { LiteRow, LiteRowGroup } from '@/components/lite/LiteRow';

import { AutopayToggle } from '@/components/subscription/manage/AutopayToggle';

import { DailyPausePanel } from '@/components/subscription/manage/DailyPausePanel';

import { DevicesPanel } from '@/components/subscription/manage/DevicesPanel';

import { RecurringPanels } from '@/components/subscription/manage/RecurringPanels';

import {
  canReissueLink,
  ReissueLinkButton,
} from '@/components/subscription/manage/ReissueLinkButton';

import { DeleteSubscriptionSheet } from '@/components/subscription/sheets/DeleteSubscriptionSheet';

import { DeviceReductionSheet } from '@/components/subscription/sheets/DeviceReductionSheet';

import { DeviceTopupSheet } from '@/components/subscription/sheets/DeviceTopupSheet';
import { PremiumTrafficTopupSheet } from '@/components/subscription/sheets/PremiumTrafficTopupSheet';

import { ServerManagementSheet } from '@/components/subscription/sheets/ServerManagementSheet';

import { TrafficTopupSheet } from '@/components/subscription/sheets/TrafficTopupSheet';

import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';

import { useTheme } from '@/hooks/useTheme';

import { getGlassColors } from '@/utils/glassTheme';

import { showsAddonOptions } from '@/utils/legacySubscription';

import { formatLiteDate } from '@/utils/liteDate';

type OpenPanel =
  | 'traffic'
  | 'premium'
  | 'devices'
  | 'reduce'
  | 'servers'
  | 'devicesList'
  | 'delete'
  | null;

/**
 * Простой вид управления подпиской.
 *
 * Полная страница подписки — это восемнадцать секций в одну колонку. Здесь
 * вместо них короткая сводка и список строк: строка открывает СУЩЕСТВУЮЩУЮ
 * панель (докупка трафика и устройств, серверы, удаление) — те уже носят в
 * себе свои запросы и мутации, и переписывать их ради вида было бы риском в
 * том, что связано с деньгами.
 *
 * Открытием управляет строка, поэтому у панели никогда не рисуется её
 * собственная кнопка-карточка: `open` ей передаётся только когда её и надо
 * показать.
 *
 * Чего здесь намеренно НЕТ: автоплатёж, рекуррент СБП, автопродление Lava,
 * пауза посуточной, перевыпуск ссылки и список устройств. Они живут в теле
 * полной страницы, не вынесены в компоненты, и перенос их логики сюда — это
 * перенос платёжных мутаций. Строка «Все настройки подписки» ведёт туда, так
 * что ничего не становится недоступным.
 */

export default function SubscriptionLite() {
  const { t } = useTranslation();

  const navigate = useNavigate();

  const { subscriptionId: rawId } = useParams();

  const subscriptionId = rawId ? Number.parseInt(rawId, 10) : undefined;

  const { isDark } = useTheme();

  const glass = getGlassColors(isDark);

  const [panel, setPanel] = useState<OpenPanel>(null);

  const [devicesToAdd, setDevicesToAdd] = useState(1);

  const [targetDeviceLimit, setTargetDeviceLimit] = useState(1);

  const [trafficPackage, setTrafficPackage] = useState<number | null>(null);

  const [servers, setServers] = useState<string[]>([]);

  const {
    data: response,

    isLoading,

    isError,

    refetch,
  } = useQuery({
    queryKey: ['subscription', subscriptionId],

    queryFn: () => subscriptionApi.getSubscription(subscriptionId),

    retry: false,

    staleTime: 0,

    refetchOnMount: 'always',
  });

  const subscription = response?.subscription ?? null;

  const { data: devices } = useQuery({
    queryKey: ['devices', subscriptionId],

    queryFn: () => subscriptionApi.getDevices(subscriptionId),

    enabled: Boolean(subscription),
  });

  const { data: purchaseOptions } = useQuery({
    queryKey: ['purchase-options', subscriptionId],

    queryFn: () => subscriptionApi.getPurchaseOptions(subscriptionId),

    enabled: Boolean(subscription),
  });

  if (isError) {
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
          onClick={() => refetch()}
          className="mt-6 flex w-full items-center justify-center rounded-2xl bg-accent-500 px-5 py-4 text-[15px] font-semibold text-on-accent transition-colors hover:bg-accent-600"
        >
          {t('lite.error.retry', 'Повторить')}
        </button>
      </div>
    );
  }

  if (isLoading || !subscription) {
    return (
      <div className="mx-auto w-full max-w-lg">
        <SkeletonGroup className="pb-7 pt-8">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-3 h-5 w-32" />
          <Skeleton className="mt-7 h-1.5 w-full rounded-full" />
        </SkeletonGroup>
        <Skeleton className="h-14 w-full rounded-2xl" />
      </div>
    );
  }

  const showsAddons = showsAddonOptions(subscription);

  // Пока режим продаж неизвестен, строку «Серверы» не рисуем вовсе: иначе она

  // успевает появиться и тут же исчезнуть, когда приходит ответ о тарифах.

  const managesServers = Boolean(purchaseOptions) && purchaseOptions?.sales_mode !== 'tariffs';

  const sheetProps = {
    open: true,

    onOpen: () => {},

    onClose: () => setPanel(null),

    subscription,

    subscriptionId,

    purchaseOptions,

    isDark,
  };

  return (
    <div className="mx-auto w-full max-w-lg">
      <section className="pb-7 pt-8">
        <h1 className="text-[28px] font-bold leading-[1.15] tracking-tight text-dark-50">
          {subscription.tariff_name || t('lite.subscription.untitled', 'Подписка')}
        </h1>
        <p className="mt-2 text-[15px] text-dark-400">
          {subscription.is_expired
            ? t('lite.status.expired', { date: formatLiteDate(subscription.end_date) })
            : t('lite.status.active', { date: formatLiteDate(subscription.end_date) })}
        </p>
        <div className="mt-7">
          <LiteMeter
            usedGb={subscription.traffic_used_gb}
            limitGb={subscription.traffic_limit_gb}
            usedPercent={subscription.traffic_used_percent}
          />
        </div>
      </section>

      <Link
        to={`/connection?sub=${subscription.id}`}
        className="flex w-full items-center justify-center rounded-2xl bg-accent-500 px-5 py-4 text-[15px] font-semibold text-on-accent transition-colors hover:bg-accent-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
      >
        {t('lite.action.connect')}
      </Link>

      <div className="mt-6">
        <LiteRowGroup>
          <LiteRow to={`/subscriptions/${subscription.id}/renew`} label={t('lite.action.renew')} />

          {panel === 'traffic' ? (
            <div className="py-4">
              <TrafficTopupSheet
                {...sheetProps}
                selectedTrafficPackage={trafficPackage}
                onSelectedTrafficPackageChange={setTrafficPackage}
              />
            </div>
          ) : (
            showsAddons &&
            subscription.traffic_limit_gb > 0 && (
              <LiteRow
                label={t('lite.rows.buyTraffic', 'Докупить трафик')}
                onClick={() => setPanel('traffic')}
              />
            )
          )}

          <LitePremiumRows items={subscription.premium_traffic ?? []} />

          {/* Докупка премиума: лист сам молчит, когда докупать нечего, но
              строку показываем только при премиум-серверах в тарифе — иначе она
              вела бы в пустую панель. */}
          {panel === 'premium' ? (
            <div className="py-4">
              <PremiumTrafficTopupSheet {...sheetProps} />
            </div>
          ) : (
            showsAddons &&
            (subscription.premium_traffic ?? []).some((item) => item.topup_available) && (
              <LiteRow
                label={t('lite.rows.buyPremiumTraffic', 'Докупить премиум-трафик')}
                onClick={() => setPanel('premium')}
              />
            )
          )}

          {panel === 'devices' ? (
            <div className="py-4">
              <DeviceTopupSheet
                {...sheetProps}
                devicesToAdd={devicesToAdd}
                onDevicesToAddChange={setDevicesToAdd}
              />
            </div>
          ) : (
            showsAddons && (
              <LiteRow
                label={t('lite.rows.buyDevices', 'Докупить устройства')}
                value={
                  subscription.device_limit > 0
                    ? t('lite.rows.devicesValue', '{{used}} из {{total}}', {
                        used: devices?.total ?? 0,

                        total: subscription.device_limit,
                      })
                    : undefined
                }
                onClick={() => setPanel('devices')}
              />
            )
          )}

          {panel === 'reduce' ? (
            <div className="py-4">
              <DeviceReductionSheet
                open
                onOpen={() => {}}
                onClose={() => setPanel(null)}
                subscriptionPresent={Boolean(subscription)}
                subscriptionId={subscriptionId}
                targetDeviceLimit={targetDeviceLimit}
                onTargetDeviceLimitChange={setTargetDeviceLimit}
                isDark={isDark}
              />
            </div>
          ) : (
            showsAddons && (
              <LiteRow
                label={t('lite.rows.reduceDevices', 'Уменьшить число устройств')}
                onClick={() => setPanel('reduce')}
              />
            )
          )}

          {panel === 'servers' ? (
            <div className="py-4">
              <ServerManagementSheet
                {...sheetProps}
                selectedServers={servers}
                onSelectedServersChange={setServers}
              />
            </div>
          ) : (
            showsAddons &&
            managesServers && (
              <LiteRow
                label={t('lite.rows.servers', 'Серверы')}
                onClick={() => setPanel('servers')}
              />
            )
          )}

          {/* Блоки ниже сами решают, показываться ли им: автоплатёж не бывает у

              пробных и старых подписок, автосписания — у выключенной фичи,

              перевыпуск — у неактивных, пауза — у непосуточных. Поэтому они

              стоят прямо в списке, а не за строкой, которая вела бы в пустоту. */}
          <AutopayToggle
            subscription={subscription}
            subscriptionId={subscriptionId}
            accentColor="rgb(var(--color-accent-500))"
            offColor="rgba(148, 163, 184, 0.3)"
          />

          <RecurringPanels subscription={subscription} subscriptionId={subscriptionId} />

          {panel === 'devicesList' ? (
            <div className="py-4">
              <DevicesPanel subscription={subscription} subscriptionId={subscriptionId} />
            </div>
          ) : (
            <LiteRow
              label={t('lite.rows.myDevices', 'Мои устройства')}
              value={
                subscription.device_limit > 0
                  ? t('lite.rows.devicesValue', '{{used}} из {{total}}', {
                      used: devices?.total ?? 0,

                      total: subscription.device_limit,
                    })
                  : (devices?.total ?? 0)
              }
              onClick={() => setPanel('devicesList')}
            />
          )}

          {canReissueLink(subscription) && (
            <div className="py-4">
              <ReissueLinkButton subscription={subscription} subscriptionId={subscriptionId} />
            </div>
          )}

          <DailyPausePanel subscription={subscription} subscriptionId={subscriptionId} />

          <LiteRow
            to={`/subscriptions/${subscription.id}?full=1`}
            label={t('lite.rows.allSettings', 'Все настройки подписки')}
          />
        </LiteRowGroup>
      </div>

      <div className="mt-10">
        {panel === 'delete' ? (
          <DeleteSubscriptionSheet
            subscriptionId={subscription.id}
            open
            onOpen={() => {}}
            onClose={() => setPanel(null)}
            onDeleted={() => navigate('/')}
            textSecondary={glass.textSecondary}
          />
        ) : (
          <button
            type="button"
            onClick={() => setPanel('delete')}
            className="w-full py-4 text-left text-[15px] text-dark-400 transition-colors hover:text-error-400"
          >
            {t('lite.rows.delete', 'Удалить подписку')}
          </button>
        )}
      </div>
    </div>
  );
}

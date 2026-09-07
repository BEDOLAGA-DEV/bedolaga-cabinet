import { useTranslation } from 'react-i18next';
import { formatList } from './launchSummary';
import { formatMoney } from './money';
import { unitNameList } from './unitLabel';
import type { LaunchState } from './useLaunch';
import { useUnits } from './useUnits';

const LISTED = 5;

/**
 * Браузер: второй шаг перед списанием прямо в панели запуска, без модалки — что именно
 * проверяем и какими симками. Кнопки «Отмена» / «Списать …» рисует сама панель.
 */
export function LaunchConfirm({ launch }: { launch: LaunchState }) {
  const { t } = useTranslation();
  const { data: catalog = [] } = useUnits();
  const summary = launch.summary;
  if (!summary) return null;
  const more = (count: number) => t('admin.reachability.launch.confirmMore', { count });
  return (
    <div
      role="group"
      aria-label={t('admin.reachability.launch.confirmTitle')}
      className="space-y-1.5"
    >
      <p className="text-sm font-semibold text-dark-50">
        {t('admin.reachability.launch.confirmTitle')}
      </p>
      <p className="break-words text-xs text-dark-300">
        {t(
          launch.noun === 'servers'
            ? 'admin.reachability.launch.confirmServers'
            : 'admin.reachability.launch.confirmTargets',
          {
            count: summary.targets.length,
            list: formatList(summary.targets, LISTED, more),
          },
        )}
      </p>
      <p className="break-words text-xs text-dark-300">
        {t('admin.reachability.launch.confirmUnits', {
          count: summary.units.length,
          list: formatList(unitNameList(summary.units, catalog), LISTED, more),
        })}
      </p>
      <p className="text-sm text-dark-100">
        {t(
          summary.exact
            ? 'admin.reachability.launch.confirmPrice'
            : 'admin.reachability.launch.confirmEstimate',
          { price: formatMoney(summary.cost) },
        )}
      </p>
      {summary.balanceAfter !== null && (
        <p className="text-xs text-dark-400">
          {t('admin.reachability.launch.confirmBalanceAfter', {
            balance: formatMoney(summary.balanceAfter),
          })}
        </p>
      )}
    </div>
  );
}

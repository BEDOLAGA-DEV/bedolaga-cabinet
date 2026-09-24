import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { type ActionKind, type ActionOut, type CheckType, dpicheckerApi } from '@/api/dpichecker';
import { Toggle } from '@/components/admin/Toggle';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { Segmented } from '../Segmented';
import { buildLink } from './deepLink';
import { usd4 } from './TotalStep';

type Filter = 'all' | CheckType | 'noisy' | 'probe';
const FILTERS: Filter[] = ['all', 'vpn', 'ip', 'mtproto', 'noisy', 'probe'];
const PAGE = 25;

function query(filter: Filter): { kind?: ActionKind; check_type?: CheckType } {
  if (filter === 'all') return {};
  if (filter === 'noisy' || filter === 'probe') return { kind: filter };
  return { kind: 'check', check_type: filter };
}

function Row({ action, onOpen }: { action: ActionOut; onOpen: () => void }) {
  const { t } = useTranslation();
  const type = action.check_type ?? action.kind;
  const money =
    action.cost_usd !== null
      ? [
          t('admin.dpichecker.money.usd', { value: usd4(action.cost_usd) }),
          action.refunded_usd
            ? t('admin.dpichecker.result.refunded', { value: usd4(action.refunded_usd) })
            : null,
        ]
          .filter(Boolean)
          .join(' · ')
      : '';
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full flex-col gap-0.5 rounded-xl px-3 py-2 text-start hover:bg-dark-800/50 sm:flex-row sm:items-center sm:gap-3"
      >
        <span className="text-xs tabular-nums text-dark-500">#{action.id}</span>
        <span className="min-w-0 flex-1 truncate text-sm text-dark-100">{action.label}</span>
        <span className="text-xs text-dark-400">
          {[
            t(`admin.dpichecker.tabs.${type}`, { defaultValue: type }),
            action.location ? t(`admin.dpichecker.locations.${action.location}`) : null,
            action.pop_count
              ? t('admin.dpichecker.result.points', { count: action.pop_count })
              : null,
            money,
            action.admin_user_id !== null
              ? t('admin.dpichecker.history.by', { id: action.admin_user_id })
              : null,
            action.created_at
              ? new Date(action.created_at).toLocaleString('ru-RU', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })
              : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </span>
        <span className="text-xs font-medium text-dark-200">
          {t(`admin.dpichecker.status.${action.status}`, { defaultValue: action.status })}
        </span>
      </button>
    </li>
  );
}

/** История запусков из кабинета: кто, что, откуда, сколько; клик — к результату. Внизу траты по админам. */
export function HistoryTab() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>('all');
  const [mine, setMine] = useState(false);
  const [limit, setLimit] = useState(PAGE);
  const history = useQuery({
    queryKey: ['dpichecker', 'history', filter, mine, limit],
    queryFn: () => dpicheckerApi.listChecks({ ...query(filter), mine, limit, offset: 0 }),
  });
  const spend = useQuery({ queryKey: ['dpichecker', 'spend'], queryFn: dpicheckerApi.spend });
  const open = (action: ActionOut) =>
    navigate(
      action.kind === 'check'
        ? buildLink({ tab: 'history', check: action.id })
        : action.kind === 'monitor'
          ? buildLink({ tab: 'monitors' })
          : buildLink({ tab: 'history', scan: action.id }),
    );
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          value={filter}
          options={FILTERS.map((value) => ({
            value,
            label:
              value === 'all'
                ? t('admin.dpichecker.history.all')
                : t(`admin.dpichecker.tabs.${value}`),
          }))}
          onChange={(value) => {
            setFilter(value);
            setLimit(PAGE);
          }}
          label={t('admin.dpichecker.history.filter')}
          size="md"
        />
        <label className="flex items-center gap-2 text-sm text-dark-200">
          <Toggle
            checked={mine}
            onChange={() => setMine(!mine)}
            aria-label={t('admin.dpichecker.history.mine')}
          />
          {t('admin.dpichecker.history.mine')}
        </label>
      </div>
      <section className="bento-card p-2 sm:p-3">
        {history.isLoading && (
          <SkeletonGroup className="space-y-2 p-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </SkeletonGroup>
        )}
        {history.data?.items.length === 0 && (
          <p className="p-3 text-sm text-dark-400">{t('admin.dpichecker.history.empty')}</p>
        )}
        <ul>
          {history.data?.items.map((action) => (
            <Row key={action.id} action={action} onOpen={() => open(action)} />
          ))}
        </ul>
        {history.data && history.data.total > history.data.items.length && (
          <button
            type="button"
            className="btn-ghost min-h-[40px] w-full text-sm"
            onClick={() => setLimit(limit + PAGE)}
          >
            {t('admin.dpichecker.history.more')}
          </button>
        )}
      </section>
      {spend.data && spend.data.length > 0 && (
        <section className="bento-card space-y-2 p-4 sm:p-5">
          <h2 className="text-lg font-semibold text-dark-100">
            {t('admin.dpichecker.history.spend')}
          </h2>
          <ul className="space-y-1">
            {[...spend.data]
              .sort((a, b) => b.spent_usd - a.spent_usd)
              .map((item) => (
                <li key={item.admin_user_id ?? 0} className="flex justify-between text-sm">
                  <span className="text-dark-300">
                    {item.admin_user_id !== null
                      ? t('admin.dpichecker.history.by', { id: item.admin_user_id })
                      : '—'}
                  </span>
                  <span className="tabular-nums text-dark-100">
                    {t('admin.dpichecker.money.usd', { value: usd4(item.spent_usd) })}
                  </span>
                </li>
              ))}
          </ul>
        </section>
      )}
    </div>
  );
}

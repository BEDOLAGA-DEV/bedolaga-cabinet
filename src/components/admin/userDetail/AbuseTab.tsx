/**
 * AbuseTab — нарушения клиента глазами оператора.
 *
 * Только просмотр. Предупредить, заблокировать или признать срабатывание
 * ошибкой можно там, где видна вся картина — в антифрод-панели и в её
 * уведомлениях; дублировать эти решения здесь значит разносить их по двум
 * местам и терять след в журнале.
 *
 * Сервис необязательный: не подключён — вкладка честно говорит об этом, а не
 * показывает пустую таблицу, из которой можно заключить, что клиент чист.
 */
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { abuseApi, type AbuseViolation } from '@/api/abuse';
import { ShieldIcon } from '@/components/icons';
import { cn } from '@/lib/utils';
import { formatShortDate } from '@/utils/format';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { Section } from './sectionParts';

export interface AbuseTabProps {
  userId: number;
}

const LEVEL_TONE: Record<string, string> = {
  clean: 'bg-success-500/12 text-success-400',
  warned: 'bg-warning-500/12 text-warning-400',
  limited: 'bg-error-500/12 text-error-400',
};

function Badge({ tone, children }: { tone: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        tone,
      )}
    >
      {children}
    </span>
  );
}

function ViolationRow({ item }: { item: AbuseViolation }) {
  const { t } = useTranslation();
  return (
    <tr className="border-b border-dark-700/50 last:border-0">
      <td className="py-2.5 pr-3 align-top text-sm text-dark-200">
        {item.detected_at ? formatShortDate(item.detected_at) : '—'}
      </td>
      <td className="py-2.5 pr-3 align-top text-sm text-dark-100">
        {/* Причины формулирует антифрод — показываем как есть, не пересказываем. */}
        {item.reasons?.length ? item.reasons.join('; ') : '—'}
      </td>
      <td className="py-2.5 pr-3 align-top text-sm tabular-nums text-dark-200">
        {item.score != null ? Math.round(item.score) : '—'}
      </td>
      <td className="py-2.5 pr-3 align-top text-sm">
        {item.action_taken ? (
          <Badge tone="bg-error-500/12 text-error-400">{item.action_taken}</Badge>
        ) : (
          <span className="text-dark-400">—</span>
        )}
      </td>
      <td className="py-2.5 align-top text-sm">
        {item.notified_at ? (
          <Badge tone="bg-warning-500/12 text-warning-400">
            {formatShortDate(item.notified_at)}
          </Badge>
        ) : (
          <span className="text-dark-400">{t('admin.users.detail.abuse.notWarned')}</span>
        )}
      </td>
    </tr>
  );
}

export function AbuseTab({ userId }: AbuseTabProps) {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ['admin-user-abuse', userId],
    queryFn: () => abuseApi.userOverview(userId),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <Section icon={<ShieldIcon />} title={t('admin.users.detail.tabs.abuse')}>
        <SkeletonGroup className="space-y-2">
          <Skeleton variant="line" count={3} className="h-8" />
        </SkeletonGroup>
      </Section>
    );
  }

  if (!data?.available) {
    return (
      <Section icon={<ShieldIcon />} title={t('admin.users.detail.tabs.abuse')}>
        <p className="text-sm text-dark-400">{t('admin.users.detail.abuse.unavailable')}</p>
      </Section>
    );
  }

  const level = data.level ?? 'clean';

  return (
    <Section
      icon={<ShieldIcon />}
      title={t('admin.users.detail.tabs.abuse')}
      action={
        <Badge tone={LEVEL_TONE[level] ?? LEVEL_TONE.clean}>
          {t(`admin.users.detail.abuse.level.${level}`)}
        </Badge>
      }
    >
      <p className="text-sm text-dark-300">
        {data.whitelisted
          ? t('admin.users.detail.abuse.whitelisted')
          : t('admin.users.detail.abuse.summary', {
              count: data.violations_count,
              score: data.max_score != null ? Math.round(data.max_score) : '—',
            })}
      </p>

      {data.violations.length > 0 ? (
        <div className="-mx-1 overflow-x-auto px-1">
          <table className="w-full min-w-[540px] border-collapse">
            <thead>
              <tr className="border-b border-dark-700 text-left text-[11px] uppercase tracking-wide text-dark-400">
                <th className="pb-2 pr-3 font-semibold">
                  {t('admin.users.detail.abuse.columns.date')}
                </th>
                <th className="pb-2 pr-3 font-semibold">
                  {t('admin.users.detail.abuse.columns.reason')}
                </th>
                <th className="pb-2 pr-3 font-semibold">
                  {t('admin.users.detail.abuse.columns.score')}
                </th>
                <th className="pb-2 pr-3 font-semibold">
                  {t('admin.users.detail.abuse.columns.action')}
                </th>
                <th className="pb-2 font-semibold">
                  {t('admin.users.detail.abuse.columns.warned')}
                </th>
              </tr>
            </thead>
            <tbody>
              {data.violations.map((item, index) => (
                <ViolationRow key={`${item.detected_at}-${index}`} item={item} />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-dark-400">{t('admin.users.detail.abuse.empty')}</p>
      )}

      <p className="text-xs text-dark-500">{t('admin.users.detail.abuse.readOnly')}</p>
    </Section>
  );
}

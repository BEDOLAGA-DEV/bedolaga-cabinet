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
import { CHIP_CLASS, CHIP_TONE, type ChipTone, stampParts } from '@/components/admin/users';
import { ShieldIcon } from '@/components/icons';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Section } from './sectionParts';

export interface AbuseTabProps {
  userId: number;
}

const LEVEL_TONE: Record<string, ChipTone> = {
  clean: 'success',
  warned: 'warning',
  limited: 'error',
};

function Chip({ tone, children }: { tone: ChipTone; children: React.ReactNode }) {
  return <span className={cn(CHIP_CLASS, CHIP_TONE[tone])}>{children}</span>;
}

/**
 * Строка нарушения в каноне ленты событий: слева день и время, дальше причина
 * и отметки. Таблица здесь не годится — в Mini App её пришлось бы листать
 * вбок, а на узкой колонке столбцы схлопываются в кашу.
 */
function ViolationRow({ item }: { item: AbuseViolation }) {
  const { t } = useTranslation();
  const stamp = stampParts(item.detected_at ?? '');

  return (
    <li className="flex items-start gap-3 py-2.5">
      <span className="w-11 shrink-0 font-mono text-xs leading-5 tabular-nums text-dark-500">
        {stamp.day}
        <span className="block">{stamp.time}</span>
      </span>

      <span className="min-w-0 flex-1">
        {/* Причины формулирует антифрод — показываем как есть, не пересказываем. */}
        <span className="block text-sm text-dark-100">
          {item.reasons?.length ? item.reasons.join('; ') : t('admin.users.detail.abuse.noReason')}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-1.5">
          {item.score != null && (
            <span className="font-mono text-xs tabular-nums text-dark-500">
              {t('admin.users.detail.abuse.scoreShort', { score: Math.round(item.score) })}
            </span>
          )}
          {item.action_taken && <Chip tone="error">{item.action_taken}</Chip>}
          {item.notified_at ? (
            <Chip tone="warning">
              {t('admin.users.detail.abuse.warnedOn', { date: stampParts(item.notified_at).day })}
            </Chip>
          ) : (
            <span className="text-xs text-dark-500">{t('admin.users.detail.abuse.notWarned')}</span>
          )}
        </span>
      </span>
    </li>
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
        <Chip tone={LEVEL_TONE[level] ?? 'neutral'}>
          {t(`admin.users.detail.abuse.level.${level}`)}
        </Chip>
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
        <ul className="m-0 list-none divide-y divide-dark-800/80 p-0">
          {data.violations.map((item, index) => (
            <ViolationRow key={`${item.detected_at}-${index}`} item={item} />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-dark-400">{t('admin.users.detail.abuse.empty')}</p>
      )}

      <p className="text-xs text-dark-500">{t('admin.users.detail.abuse.readOnly')}</p>
    </Section>
  );
}

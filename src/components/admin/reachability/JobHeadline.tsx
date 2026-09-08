import { useTranslation } from 'react-i18next';
import type { Job } from '@/api/reachability';
import { cn } from '@/lib/utils';
import { formatList } from './launchSummary';
import { resultHeadline } from './resultHeadline';
import { unitNameList } from './unitLabel';
import { useUnits } from './useUnits';

const TONE_TEXT = {
  ok: 'text-success-400',
  warn: 'text-warning-400',
  down: 'text-error-400',
  na: 'text-dark-300',
  pending: 'text-accent-400',
} as const;

const LISTED = 5;

interface LineProps {
  job: Job;
  targetKey?: string;
  prefix?: string;
}

function HeadlineLine({ job, targetKey, prefix }: LineProps) {
  const { t } = useTranslation();
  const { data: catalog = [] } = useUnits();
  const headline = resultHeadline(job, targetKey);
  const more = (count: number) => t('admin.reachability.launch.confirmMore', { count });
  return (
    <div>
      <p className="text-sm">
        {prefix && <span className="font-medium text-dark-100">{prefix}: </span>}
        <span className={cn('font-medium', TONE_TEXT[headline.tone])}>
          {t(`admin.reachability.recent.headline.${headline.key}`, {
            count: headline.total,
            ok: headline.ok,
            total: headline.total,
          })}
        </span>
      </p>
      {headline.blocked.length > 0 && (
        <p className="mt-0.5 text-xs text-dark-400">
          {t('admin.reachability.recent.headline.blockedList', {
            list: formatList(unitNameList(headline.blocked, catalog), LISTED, more),
          })}
        </p>
      )}
    </div>
  );
}

/**
 * Ответ словами — первая строка результата: «Открывается у 11 из 15 симок» и кто режет.
 * Несколько целей — по строке на каждую, чтобы симки разных серверов не складывались.
 */
export function JobHeadline({ job, className }: { job: Job; className?: string }) {
  const perTarget = job.status === 'done' && job.kind !== 'scan' && job.targets.length > 1;
  if (!perTarget) {
    return (
      <div className={className}>
        <HeadlineLine job={job} />
      </div>
    );
  }
  return (
    <div className={cn('space-y-1.5', className)}>
      {job.targets.map((target) => (
        <HeadlineLine
          key={target.target_key}
          job={job}
          targetKey={target.target_key}
          prefix={target.label || target.target_key}
        />
      ))}
    </div>
  );
}

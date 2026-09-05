import { useTranslation } from 'react-i18next';
import type { Verdict } from '@/api/reachability';
import { cn } from '@/lib/utils';
import { toneClasses, verdictLabelKey, verdictTone } from './verdict';

interface VerdictBadgeProps {
  verdict: Verdict;
  matches: boolean | null;
  className?: string;
}

export function VerdictBadge({ verdict, matches, className }: VerdictBadgeProps) {
  const { t } = useTranslation();
  const expectation =
    matches === null
      ? null
      : t(
          matches
            ? 'admin.reachability.verdict.asExpected'
            : 'admin.reachability.verdict.unexpected',
        );
  return (
    <span
      title={expectation ?? undefined}
      className={cn(
        'inline-block rounded-lg border px-2 py-1 text-xs font-medium',
        toneClasses(verdictTone(verdict, matches)),
        className,
      )}
    >
      {t(verdictLabelKey(verdict))}
    </span>
  );
}

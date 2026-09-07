import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/primitives';
import { cn } from '@/lib/utils';
import { FleetRowItem, STATE_DOT } from './FleetRowItem';
import type { TargetProgress } from './batchProgress';
import { type FleetRow, type FleetState, groupRows } from './fleet';

interface FleetListProps {
  /** Уже отфильтрованные строки; группировка «проблемы сначала» делается здесь. */
  rows: FleetRow[];
  selectedKey: string | null;
  onSelect: (row: FleetRow) => void;
  /** Живой прогресс идущей пачки по target_key. */
  progress?: Map<string, TargetProgress>;
  /** Режим «Выбрать вручную»: чекбоксы вместо точек, клик отмечает, а не открывает. */
  picking?: { picked: Set<string>; onToggle: (ref: string) => void };
  emptyText: string;
}

/** Работающие серверы сворачиваются, если их много или есть что показать важнее. */
const COLLAPSE_OK_FROM = 6;

/**
 * Список серверов группами: не работают → не у всех → не проверяли → работают (свёрнуты).
 * Так страница на сотню серверов остаётся короткой: сначала то, что требует внимания.
 */
export function FleetList({
  rows,
  selectedKey,
  onSelect,
  progress,
  picking,
  emptyText,
}: FleetListProps) {
  const { t } = useTranslation();
  const [okOpen, setOkOpen] = useState(false);
  const groups = groupRows(rows);
  if (groups.length === 0) {
    return <p className="py-10 text-center text-sm text-dark-400">{emptyText}</p>;
  }
  const base = 'admin.reachability.fleet';

  return (
    <div className="space-y-2">
      {groups.map((group) => {
        const collapsible =
          group.state === 'ok' && (groups.length > 1 || group.rows.length >= COLLAPSE_OK_FROM);
        const collapsed = collapsible && !okOpen;
        return (
          <section key={group.state} aria-label={t(`${base}.group.${group.state}`)}>
            <GroupHeader
              state={group.state}
              count={group.rows.length}
              action={
                collapsible ? (
                  <Button variant="link" size="sm" onClick={() => setOkOpen((open) => !open)}>
                    {collapsed
                      ? t(`${base}.showAll`, { count: group.rows.length })
                      : t(`${base}.hide`)}
                  </Button>
                ) : null
              }
            />
            {!collapsed && (
              <div className="divide-y divide-dark-700/30">
                {group.rows.map((row) => (
                  <FleetRowItem
                    key={row.key}
                    row={row}
                    selected={row.key === selectedKey}
                    onSelect={onSelect}
                    progress={progress?.get(row.key)}
                    picking={
                      picking
                        ? {
                            picked: row.ref !== null && picking.picked.has(row.ref),
                            onToggle: picking.onToggle,
                          }
                        : undefined
                    }
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function GroupHeader({
  state,
  count,
  action,
}: {
  state: FleetState;
  count: number;
  action: React.ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between gap-3 px-3 pb-1 pt-4">
      <span className="flex items-center gap-2">
        <span aria-hidden="true" className={cn('h-2 w-2 rounded-full', STATE_DOT[state])} />
        <span className="text-[13px] font-semibold text-dark-300">
          {t(`admin.reachability.fleet.group.${state}`)}
        </span>
        <span className="text-[13px] text-dark-500">{count}</span>
      </span>
      {action}
    </div>
  );
}

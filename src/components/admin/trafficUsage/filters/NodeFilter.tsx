import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDownIcon, ServerIcon } from '../TrafficIcons';
import { getFlagEmoji } from '../trafficUsageHelpers';
import type { TrafficNodeInfo } from '../../../../api/adminTraffic';

export function NodeFilter({
  available,
  selected,
  onChange,
}: {
  available: TrafficNodeInfo[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (available.length === 0) return null;

  const allSelected = selected.size === 0;
  const activeCount = selected.size;

  const toggle = (uuid: string) => {
    const next = new Set(selected);
    if (next.has(uuid)) {
      next.delete(uuid);
    } else {
      next.add(uuid);
    }
    onChange(next);
  };

  const selectAll = () => onChange(new Set());

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
          activeCount > 0
            ? 'border-accent-500/50 bg-accent-500/10 text-accent-400'
            : 'border-dark-700 bg-dark-800 text-dark-200 hover:border-dark-600 hover:bg-dark-700'
        }`}
      >
        <ServerIcon />
        {t('admin.trafficUsage.nodes')}
        {activeCount > 0 && (
          <span className="rounded-full bg-accent-500 px-1.5 text-[10px] text-white">
            {activeCount}
          </span>
        )}
        <ChevronDownIcon />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-64 rounded-xl border border-dark-700 bg-dark-800 py-1 shadow-xl">
          <button
            onClick={selectAll}
            className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-dark-700 ${
              allSelected ? 'text-accent-400' : 'text-dark-300'
            }`}
          >
            <span
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                allSelected ? 'border-accent-500 bg-accent-500' : 'border-dark-600'
              }`}
            >
              {allSelected && (
                <svg
                  className="h-3 w-3 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              )}
            </span>
            {t('admin.trafficUsage.allNodes')}
          </button>

          <div className="mx-2 border-t border-dark-700" />

          <div className="max-h-48 overflow-y-auto">
            {available.map((node) => {
              const checked = selected.has(node.node_uuid);
              return (
                <button
                  key={node.node_uuid}
                  onClick={() => toggle(node.node_uuid)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-dark-300 transition-colors hover:bg-dark-700"
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                      checked ? 'border-accent-500 bg-accent-500' : 'border-dark-600'
                    }`}
                  >
                    {checked && (
                      <svg
                        className="h-3 w-3 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4.5 12.75l6 6 9-13.5"
                        />
                      </svg>
                    )}
                  </span>
                  {getFlagEmoji(node.country_code)} {node.node_name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

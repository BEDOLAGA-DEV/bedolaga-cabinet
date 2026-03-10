import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '../../lib/utils';
import { GripIcon, TrashIcon } from '../icons/LandingIcons';
import type { AdminLandingPaymentMethod, EditableMethodField } from '../../api/landings';
import type { PaymentMethodSubOptionInfo } from '../../types';

export type MethodWithId = AdminLandingPaymentMethod & { _id: string };

const ChevronDownIcon = ({ open }: { open: boolean }) => (
  <svg
    className={cn('h-5 w-5 transition-transform', open && 'rotate-180')}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
  </svg>
);

interface SortableSelectedMethodProps {
  method: MethodWithId;
  availableSubOptions: PaymentMethodSubOptionInfo[] | null;
  onUpdate: (methodId: string, field: EditableMethodField, value: string | number | null) => void;
  onSubOptionsChange: (methodId: string, subOptions: Record<string, boolean>) => void;
  onRemove: (methodId: string) => void;
}

export function SortableSelectedMethodCard({
  method,
  availableSubOptions,
  onUpdate,
  onSubOptionsChange,
  onRemove,
}: SortableSelectedMethodProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: method._id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    position: isDragging ? 'relative' : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'rounded-lg border',
        isDragging ? 'border-accent-500/50 bg-dark-700' : 'border-dark-700 bg-dark-800/50',
      )}
    >
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          {...attributes}
          {...listeners}
          className="flex-shrink-0 cursor-grab touch-none text-dark-500 hover:text-dark-300 active:cursor-grabbing"
        >
          <GripIcon />
        </button>
        <button onClick={() => setExpanded((v) => !v)} className="min-w-0 flex-1 text-start">
          <span className="truncate text-sm text-dark-100">{method.display_name}</span>
        </button>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex-shrink-0 text-dark-500 hover:text-dark-300"
        >
          <ChevronDownIcon open={expanded} />
        </button>
        <button
          onClick={() => onRemove(method.method_id)}
          className="flex-shrink-0 text-dark-500 hover:text-error-400"
        >
          <TrashIcon />
        </button>
      </div>
      {expanded && (
        <div className="space-y-3 border-t border-dark-700 px-3 py-3">
          <div>
            <label className="mb-1 block text-xs text-dark-500">
              {t('admin.landings.methodDisplayName', 'Display name')}
            </label>
            <input
              type="text"
              value={method.display_name}
              onChange={(e) => onUpdate(method.method_id, 'display_name', e.target.value)}
              className="w-full rounded-lg border border-dark-700 bg-dark-800 px-3 py-1.5 text-sm text-dark-100 outline-none focus:border-accent-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-dark-500">
              {t('admin.landings.methodDescription', 'Description')}
            </label>
            <input
              type="text"
              value={method.description ?? ''}
              onChange={(e) => onUpdate(method.method_id, 'description', e.target.value || null)}
              placeholder={t('admin.landings.methodDescPlaceholder', 'Optional description')}
              className="w-full rounded-lg border border-dark-700 bg-dark-800 px-3 py-1.5 text-sm text-dark-100 outline-none focus:border-accent-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-dark-500">
              {t('admin.landings.methodIconUrl', 'Icon URL')}
            </label>
            <input
              type="text"
              value={method.icon_url ?? ''}
              onChange={(e) => onUpdate(method.method_id, 'icon_url', e.target.value || null)}
              placeholder="https://..."
              className="w-full rounded-lg border border-dark-700 bg-dark-800 px-3 py-1.5 text-sm text-dark-100 outline-none focus:border-accent-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-dark-500">
                {t('admin.landings.methodMinAmount', 'Min amount (kopeks)')}
              </label>
              <input
                type="number"
                min={0}
                step={1}
                value={method.min_amount_kopeks ?? ''}
                onChange={(e) =>
                  onUpdate(
                    method.method_id,
                    'min_amount_kopeks',
                    e.target.value ? Math.max(0, Math.floor(Number(e.target.value))) : null,
                  )
                }
                placeholder="—"
                className="w-full rounded-lg border border-dark-700 bg-dark-800 px-3 py-1.5 text-sm text-dark-100 outline-none focus:border-accent-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-dark-500">
                {t('admin.landings.methodMaxAmount', 'Max amount (kopeks)')}
              </label>
              <input
                type="number"
                min={0}
                step={1}
                value={method.max_amount_kopeks ?? ''}
                onChange={(e) =>
                  onUpdate(
                    method.method_id,
                    'max_amount_kopeks',
                    e.target.value ? Math.max(0, Math.floor(Number(e.target.value))) : null,
                  )
                }
                placeholder="—"
                className="w-full rounded-lg border border-dark-700 bg-dark-800 px-3 py-1.5 text-sm text-dark-100 outline-none focus:border-accent-500"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-dark-500">
              {t('admin.landings.methodCurrency', 'Currency')}
            </label>
            <input
              type="text"
              value={method.currency ?? ''}
              onChange={(e) => onUpdate(method.method_id, 'currency', e.target.value || null)}
              placeholder="RUB"
              className="w-full rounded-lg border border-dark-700 bg-dark-800 px-3 py-1.5 text-sm text-dark-100 outline-none focus:border-accent-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-dark-500">
              {t('admin.landings.methodReturnUrl', 'Return URL after payment')}
            </label>
            <input
              type="text"
              value={method.return_url ?? ''}
              onChange={(e) => onUpdate(method.method_id, 'return_url', e.target.value || null)}
              placeholder={t(
                'admin.landings.methodReturnUrlPlaceholder',
                'Default: cabinet success page. Use {token} for purchase token',
              )}
              className="w-full rounded-lg border border-dark-700 bg-dark-800 px-3 py-1.5 text-sm text-dark-100 outline-none focus:border-accent-500"
            />
          </div>
          {availableSubOptions && availableSubOptions.length > 0 && (
            <div>
              <label className="mb-1.5 block text-xs text-dark-500">
                {t('admin.landings.methodSubOptions', 'Payment sub-options')}
              </label>
              <div className="flex flex-wrap gap-2">
                {availableSubOptions.map((opt) => {
                  // Missing keys treated as enabled (opt-out model)
                  const enabled = method.sub_options?.[opt.id] !== false;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="checkbox"
                      aria-checked={enabled}
                      onClick={() => {
                        const current =
                          method.sub_options ??
                          Object.fromEntries(availableSubOptions.map((o) => [o.id, true]));
                        onSubOptionsChange(method.method_id, { ...current, [opt.id]: !enabled });
                      }}
                      className={cn(
                        'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-colors',
                        enabled
                          ? 'border-accent-500/30 bg-accent-500/10 text-accent-300'
                          : 'border-dark-700 bg-dark-800 text-dark-500',
                      )}
                    >
                      <div
                        aria-hidden="true"
                        className={cn(
                          'flex h-3.5 w-3.5 items-center justify-center rounded',
                          enabled
                            ? 'bg-accent-500 text-white'
                            : 'border border-dark-600 bg-dark-700',
                        )}
                      >
                        {enabled && (
                          <svg
                            className="h-2.5 w-2.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={3}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      {opt.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { legacyFaqApi, type LegacyFaqPage } from '../../api/infoPages';
import { Toggle } from './Toggle';
import { PencilIcon } from '@/components/icons';

/** Edits existing bot FAQ in place; language, IDs and group visibility are preserved. */
export function LegacyFaqList({ pages }: { pages: LegacyFaqPage[] }) {
  const { t } = useTranslation();
  const client = useQueryClient();
  const [draft, setDraft] = useState<LegacyFaqPage | null>(null);
  const save = useMutation({
    mutationFn: legacyFaqApi.updatePage,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['admin', 'legacy-faq'] });
      client.invalidateQueries({ queryKey: ['faq-pages'] });
      setDraft(null);
    },
  });
  if (!pages.length) return null;
  return (
    <section className="space-y-3" aria-label={t('admin.infoPages.botFaq')}>
      <h2 className="text-lg font-semibold text-dark-100">{t('admin.infoPages.botFaq')}</h2>
      {pages.map((page) => (
        <div key={page.id} className="rounded-xl border border-dark-700 bg-dark-800/50 p-4">
          {draft?.id === page.id ? (
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                save.mutate(draft);
              }}
            >
              <label className="block space-y-2 text-sm text-dark-200">
                <span>
                  {t('admin.infoPages.faq.question')} ({page.language.toUpperCase()})
                </span>
                <input
                  className="input"
                  required
                  maxLength={255}
                  value={draft.title}
                  onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                />
              </label>
              <label className="block space-y-2 text-sm text-dark-200">
                <span>{t('admin.infoPages.faq.answer')}</span>
                <textarea
                  className="input min-h-48 resize-y font-mono"
                  rows={8}
                  dir="auto"
                  value={draft.content}
                  onChange={(event) => setDraft({ ...draft, content: event.target.value })}
                />
              </label>
              <label className="block space-y-2 text-sm text-dark-200">
                <span>{t('admin.infoPages.fields.sortOrder')}</span>
                <input
                  type="number"
                  min={0}
                  required
                  className="input"
                  value={draft.display_order}
                  onChange={(event) =>
                    setDraft({ ...draft, display_order: Number(event.target.value) })
                  }
                />
              </label>
              <div className="flex items-center gap-3 text-sm text-dark-200">
                <Toggle
                  checked={draft.is_active}
                  onChange={() => setDraft({ ...draft, is_active: !draft.is_active })}
                  aria-label={t('admin.infoPages.fields.isActive')}
                />
                <span>{t('admin.infoPages.fields.isActive')}</span>
              </div>
              {save.isError && (
                <p role="alert" className="text-sm text-error-400">
                  {t('common.error')}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <button type="submit" className="btn-primary" disabled={save.isPending}>
                  {t('common.save')}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={save.isPending}
                  onClick={() => setDraft(null)}
                >
                  {t('common.cancel')}
                </button>
              </div>
            </form>
          ) : (
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="break-words text-sm font-medium text-dark-100">{page.title}</p>
                <p className="mt-2 text-xs text-dark-400">
                  {page.language.toUpperCase()} ·{' '}
                  {t(
                    page.is_active && page.is_enabled
                      ? 'admin.infoPages.active'
                      : 'admin.infoPages.inactive',
                  )}
                </p>
              </div>
              <button
                type="button"
                className="btn-ghost min-h-[44px] min-w-[44px] shrink-0"
                aria-label={t('admin.infoPages.edit')}
                disabled={save.isPending}
                onClick={() => {
                  save.reset();
                  setDraft({ ...page });
                }}
              >
                <PencilIcon />
              </button>
            </div>
          )}
        </div>
      ))}
    </section>
  );
}

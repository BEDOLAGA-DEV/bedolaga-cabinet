import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  botPresentationApi,
  type BotPresentationConfig,
  type CatalogResponse,
  type EmojiCatalogItem,
  type TextCatalogItem,
} from '../../api/botPresentation';
import { useNativeDialog } from '../../platform/hooks/useNativeDialog';
import { useNotify } from '../../platform/hooks/useNotify';
import { getApiErrorMessage } from '../../utils/api-error';

const PAGE_SIZE = 100;

type EditorTab = 'emoji' | 'text';
type PresentationDraft = {
  emoji: Record<string, string>;
  text: Record<string, string>;
};

function cloneOverrides(config: BotPresentationConfig) {
  return {
    emoji: { ...config.emoji_overrides },
    text: { ...config.text_overrides },
  };
}

function UsageList({ usages, usageCount }: { usages: string[]; usageCount: number }) {
  return (
    <details className="text-xs text-dark-500">
      <summary className="cursor-pointer select-none">
        Где используется ({usageCount})
        {usageCount > usages.length ? ` · показаны первые ${usages.length}` : ''}
      </summary>
      <div className="mt-1 space-y-1 rounded-lg bg-dark-900/40 p-2 font-mono text-[10px]">
        {usages.map((usage) => (
          <div key={usage} className="break-all">
            {usage}
          </div>
        ))}
      </div>
    </details>
  );
}

function EmojiRow({
  item,
  value,
  onChange,
}: {
  item: EmojiCatalogItem;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="rounded-xl border border-dark-700/50 bg-dark-800/40 p-3">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-dark-700/60 text-2xl">
          {item.glyph}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-sm font-medium text-dark-100">Текущее эмодзи: {item.glyph}</div>
              <div className="font-mono text-xs text-dark-400">{item.token}</div>
              <div className="text-xs text-dark-500">Найдено использований: {item.usage_count}</div>
            </div>
            {value && (
              <button
                type="button"
                onClick={() => onChange('')}
                className="rounded-lg bg-dark-700 px-2.5 py-1 text-xs text-dark-300 hover:bg-dark-600"
              >
                Сбросить
              </button>
            )}
          </div>
          <input
            type="text"
            inputMode="numeric"
            value={value}
            onChange={(event) => onChange(event.target.value.replace(/\D/g, ''))}
            placeholder="Telegram custom_emoji_id"
            maxLength={100}
            className="w-full rounded-lg border border-dark-600 bg-dark-700/50 px-3 py-2 text-sm text-dark-100 placeholder-dark-500 focus:border-accent-500 focus:outline-none"
          />
          <UsageList usages={item.usages} usageCount={item.usage_count} />
        </div>
      </div>
    </div>
  );
}

function TextRow({
  item,
  value,
  onChange,
}: {
  item: TextCatalogItem;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2 rounded-xl border border-dark-700/50 bg-dark-800/40 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <code className="break-all text-xs font-semibold text-accent-400">{item.key}</code>
          <div className="mt-0.5 text-[10px] text-dark-500">
            Найдено использований: {item.usage_count}
          </div>
        </div>
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="rounded-lg bg-dark-700 px-2.5 py-1 text-xs text-dark-300 hover:bg-dark-600"
          >
            Вернуть исходный
          </button>
        )}
      </div>
      <div>
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-dark-500">
          Исходный русский текст
        </div>
        <div className="whitespace-pre-wrap rounded-lg bg-dark-900/40 p-2 text-xs text-dark-400">
          {item.default}
        </div>
      </div>
      <div>
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-dark-500">
          Новый русский текст
        </div>
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Пусто — используется исходный текст"
          rows={Math.min(8, Math.max(2, item.default.split('\n').length + 1))}
          className="w-full resize-y rounded-lg border border-dark-600 bg-dark-700/50 px-3 py-2 font-mono text-xs text-dark-100 placeholder-dark-500 focus:border-accent-500 focus:outline-none"
        />
        <p className="mt-1 text-[10px] text-dark-500">
          Плейсхолдеры вида {'{days}'} должны сохраниться. Другие языки не изменяются.
        </p>
      </div>
      <UsageList usages={item.usages} usageCount={item.usage_count} />
    </div>
  );
}

export function BotPresentationTab() {
  const { t } = useTranslation();
  const notify = useNotify();
  const dialog = useNativeDialog();
  const queryClient = useQueryClient();
  const restoredDraft = queryClient.getQueryData<PresentationDraft>(['bot-presentation-draft']);
  const [tab, setTab] = useState<EditorTab>('emoji');
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [offset, setOffset] = useState(0);
  const [emojiOverrides, setEmojiOverrides] = useState<Record<string, string>>(
    () => restoredDraft?.emoji ?? {},
  );
  const [textOverrides, setTextOverrides] = useState<Record<string, string>>(
    () => restoredDraft?.text ?? {},
  );
  const savedRef = useRef({ emoji: {}, text: {} } as {
    emoji: Record<string, string>;
    text: Record<string, string>;
  });
  const initializedRef = useRef(false);
  const restoredDraftPendingRef = useRef(Boolean(restoredDraft));
  const appliedConfigRef = useRef<object | null>(null);
  const operationRef = useRef(false);

  const configQuery = useQuery({
    queryKey: ['bot-presentation-config'],
    queryFn: botPresentationApi.getConfig,
  });

  useEffect(() => {
    if (!configQuery.data) return;
    if (restoredDraftPendingRef.current) {
      savedRef.current = cloneOverrides(configQuery.data);
      appliedConfigRef.current = configQuery.data;
      initializedRef.current = true;
      restoredDraftPendingRef.current = false;
      return;
    }
    const isDirty =
      JSON.stringify(emojiOverrides) !== JSON.stringify(savedRef.current.emoji) ||
      JSON.stringify(textOverrides) !== JSON.stringify(savedRef.current.text);
    if (initializedRef.current && isDirty) return;
    if (appliedConfigRef.current === configQuery.data) return;
    const next = cloneOverrides(configQuery.data);
    setEmojiOverrides(next.emoji);
    setTextOverrides(next.text);
    savedRef.current = next;
    appliedConfigRef.current = configQuery.data;
    initializedRef.current = true;
  }, [configQuery.data, emojiOverrides, textOverrides]);

  const catalogQuery = useQuery<CatalogResponse<EmojiCatalogItem | TextCatalogItem>>({
    queryKey: ['bot-presentation-catalog', tab, deferredSearch, offset],
    queryFn: async (): Promise<CatalogResponse<EmojiCatalogItem | TextCatalogItem>> => {
      if (tab === 'emoji') {
        return botPresentationApi.getEmojiCatalog(deferredSearch, offset, PAGE_SIZE);
      }
      return botPresentationApi.getTextCatalog(deferredSearch, offset, PAGE_SIZE);
    },
    placeholderData: (previous) => (previous?.kind === tab ? previous : undefined),
  });

  const hasChanges = useMemo(
    () =>
      JSON.stringify(emojiOverrides) !== JSON.stringify(savedRef.current.emoji) ||
      JSON.stringify(textOverrides) !== JSON.stringify(savedRef.current.text),
    [emojiOverrides, textOverrides],
  );

  useEffect(() => {
    if (!initializedRef.current) return;
    if (hasChanges) {
      queryClient.setQueryData<PresentationDraft>(['bot-presentation-draft'], {
        emoji: emojiOverrides,
        text: textOverrides,
      });
    } else {
      queryClient.removeQueries({ queryKey: ['bot-presentation-draft'], exact: true });
    }
  }, [emojiOverrides, hasChanges, queryClient, textOverrides]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (operationRef.current) throw new Error('Другая операция уже выполняется');
      operationRef.current = true;
      try {
        return await botPresentationApi.updateConfig({
          emoji_overrides: Object.fromEntries(
            Object.entries(emojiOverrides).filter(([, value]) => value.trim()),
          ),
          text_overrides: Object.fromEntries(
            Object.entries(textOverrides).filter(([, value]) => value !== ''),
          ),
        });
      } finally {
        operationRef.current = false;
      }
    },
    onSuccess: (config) => {
      const next = cloneOverrides(config);
      setEmojiOverrides(next.emoji);
      setTextOverrides(next.text);
      savedRef.current = next;
      appliedConfigRef.current = config;
      queryClient.setQueryData(['bot-presentation-config'], config);
      queryClient.invalidateQueries({ queryKey: ['bot-presentation-catalog'] });
      notify.success(t('common.saved', 'Сохранено'));
    },
    onError: (error) => notify.error(getApiErrorMessage(error, 'Операция не выполнена')),
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      if (operationRef.current) throw new Error('Другая операция уже выполняется');
      operationRef.current = true;
      try {
        return await botPresentationApi.resetConfig();
      } finally {
        operationRef.current = false;
      }
    },
    onSuccess: (config) => {
      const next = cloneOverrides(config);
      setEmojiOverrides(next.emoji);
      setTextOverrides(next.text);
      savedRef.current = next;
      appliedConfigRef.current = config;
      queryClient.setQueryData(['bot-presentation-config'], config);
      queryClient.invalidateQueries({ queryKey: ['bot-presentation-catalog'] });
      notify.success('Оформление бота возвращено к исходному');
    },
    onError: (error) => notify.error(getApiErrorMessage(error, 'Операция не выполнена')),
  });

  const operationPending = saveMutation.isPending || resetMutation.isPending;

  if (configQuery.isLoading) {
    return <div className="py-12 text-center text-sm text-dark-400">{t('common.loading')}</div>;
  }
  if (configQuery.isError) {
    return <div className="text-sm text-error-400">{t('common.error')}</div>;
  }

  const total = catalogQuery.data?.total ?? 0;
  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-accent-500/20 bg-accent-500/5 p-3 text-sm text-dark-300">
        Меняются только оформление и русский текст. Каждый Custom Emoji привязан к конкретному ключу
        и месту в нём — одинаковый Unicode в другом контексте не меняется. Callback, расположение и
        логика кнопок не затрагиваются. Если override удалить, бот сразу использует исходное
        значение upstream.
      </div>

      <div className="flex flex-wrap gap-2">
        {(['emoji', 'text'] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => {
              setTab(item);
              setOffset(0);
            }}
            className={`rounded-xl px-4 py-2 text-sm font-medium ${
              tab === item
                ? 'bg-accent-500 text-on-accent'
                : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
            }`}
          >
            {item === 'emoji'
              ? `Эмодзи (${configQuery.data?.emoji_catalog_count ?? 0})`
              : `Русские тексты (${configQuery.data?.text_catalog_count ?? 0})`}
          </button>
        ))}
      </div>

      <input
        type="search"
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          setOffset(0);
        }}
        placeholder={
          tab === 'emoji'
            ? 'Поиск по эмодзи, ID или месту использования'
            : 'Поиск по ключу или тексту'
        }
        className="w-full rounded-xl border border-dark-600 bg-dark-800 px-4 py-2.5 text-sm text-dark-100 placeholder-dark-500 focus:border-accent-500 focus:outline-none"
      />

      {catalogQuery.isLoading ? (
        <div className="py-10 text-center text-sm text-dark-400">{t('common.loading')}</div>
      ) : (
        <div className="space-y-3">
          {tab === 'emoji'
            ? (catalogQuery.data?.items as EmojiCatalogItem[] | undefined)?.map((item) => (
                <EmojiRow
                  key={item.token}
                  item={item}
                  value={emojiOverrides[item.token] || ''}
                  onChange={(value) =>
                    setEmojiOverrides((current) => ({ ...current, [item.token]: value }))
                  }
                />
              ))
            : (catalogQuery.data?.items as TextCatalogItem[] | undefined)?.map((item) => (
                <TextRow
                  key={item.key}
                  item={item}
                  value={textOverrides[item.key] ?? ''}
                  onChange={(value) =>
                    setTextOverrides((current) => ({ ...current, [item.key]: value }))
                  }
                />
              ))}
        </div>
      )}

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between gap-3 text-sm text-dark-400">
          <button
            type="button"
            disabled={offset === 0}
            onClick={() => setOffset((current) => Math.max(0, current - PAGE_SIZE))}
            className="rounded-lg bg-dark-700 px-3 py-1.5 disabled:opacity-40"
          >
            Назад
          </button>
          <span>
            {page} / {pages} · найдено {total}
          </span>
          <button
            type="button"
            disabled={offset + PAGE_SIZE >= total}
            onClick={() => setOffset((current) => current + PAGE_SIZE)}
            className="rounded-lg bg-dark-700 px-3 py-1.5 disabled:opacity-40"
          >
            Далее
          </button>
        </div>
      )}

      <div className="sticky bottom-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dark-700 bg-dark-900/95 p-3 shadow-xl backdrop-blur">
        <button
          type="button"
          onClick={async () => {
            if (await dialog.confirm('Сбросить все custom emoji и русские тексты к исходным?')) {
              resetMutation.mutate();
            }
          }}
          disabled={operationPending}
          className="rounded-xl bg-dark-700 px-4 py-2 text-sm text-dark-300 hover:bg-dark-600 disabled:opacity-50"
        >
          Сбросить всё
        </button>
        <div className="flex gap-2">
          {hasChanges && (
            <button
              type="button"
              onClick={() => {
                setEmojiOverrides({ ...savedRef.current.emoji });
                setTextOverrides({ ...savedRef.current.text });
              }}
              disabled={operationPending}
              className="rounded-xl bg-dark-700 px-4 py-2 text-sm text-dark-300 hover:bg-dark-600 disabled:opacity-50"
            >
              Отменить
            </button>
          )}
          <button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={!hasChanges || operationPending}
            className="rounded-xl bg-accent-500 px-4 py-2 text-sm font-medium text-on-accent hover:bg-accent-600 disabled:opacity-40"
          >
            {saveMutation.isPending ? t('common.saving') : t('common.save')}
          </button>
        </div>
      </div>
    </div>
  );
}

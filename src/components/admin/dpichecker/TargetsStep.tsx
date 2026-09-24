import { useMutation } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { type CheckType, dpicheckerApi } from '@/api/dpichecker';
import { cn } from '@/lib/utils';
import { getApiErrorMessage } from '@/utils/api-error';
import { ChoiceChips } from '../reachability/ChoiceChips';
import { CheckGlyph, ROW, ROW_BUTTON, ROW_OFF, ROW_ON } from '../reachability/SelectableRow';
import { fromPanel, fromParse, type ParseNote, type Resource } from './formState';

export type TargetOrigin = 'paste' | 'panel';
export type PanelKind = 'subscription' | 'hosts' | 'nodes';

export interface TargetsValue {
  resources: Resource[];
  source: 'paste' | 'panel_subscription' | 'panel_hosts' | 'panel_nodes';
  sourceRef: string | null;
}

interface TargetsStepProps {
  checkType: CheckType;
  value: TargetsValue;
  onChange: (value: TargetsValue) => void;
  /** Переход с карточки ноды или пользователя — сразу «из панели» с этим источником. */
  prefill?: { kind: PanelKind; ref: string } | null;
}

const PANEL_KINDS: Record<CheckType, PanelKind[]> = {
  vpn: ['subscription'],
  ip: ['hosts', 'nodes'],
  mtproto: [],
};

function NoteLine({ notes }: { notes: ParseNote[] }) {
  const { t } = useTranslation();
  if (notes.length === 0) return null;
  const parts = notes.map((note) =>
    note.items
      ? t(`admin.dpichecker.form.notes.${note.key}`, { items: note.items.join(', ') })
      : t(`admin.dpichecker.form.notes.${note.key}`, { count: note.count }),
  );
  return <span> ({parts.join('; ')})</span>;
}

/** «01 Что проверяем»: вставка (разбор сервисом) или цели из панели, список с отметками. */
export function TargetsStep({ checkType, value, onChange, prefill }: TargetsStepProps) {
  const { t } = useTranslation();
  const kinds = PANEL_KINDS[checkType];
  const [origin, setOrigin] = useState<TargetOrigin>(prefill ? 'panel' : 'paste');
  const [panelKind, setPanelKind] = useState<PanelKind>(prefill?.kind ?? kinds[0] ?? 'hosts');
  const [text, setText] = useState('');
  const [notes, setNotes] = useState<ParseNote[]>([]);

  const parse = useMutation({
    mutationFn: () => dpicheckerApi.parse(checkType, text),
    onSuccess: (parsed) => {
      const form = fromParse(checkType, parsed);
      setNotes(form.notes);
      onChange({ resources: form.resources, source: 'paste', sourceRef: null });
    },
  });
  const panel = useMutation({
    mutationFn: (kind: PanelKind) =>
      dpicheckerApi.panelTargets(
        kind === 'subscription'
          ? { kind, user_id: prefill?.kind === 'subscription' ? Number(prefill.ref) : undefined }
          : { kind, uuids: [] },
      ),
    onSuccess: (targets, kind) => {
      const resources = fromPanel(targets).map((resource, index) => ({
        ...resource,
        // Хосты и ноды — список для выбора: включены только отмеченные; подписка — вся.
        on: kind === 'subscription' || (prefill?.ref ? targets[index].ref === prefill.ref : false),
      }));
      onChange({
        resources,
        source: `panel_${kind}` as TargetsValue['source'],
        sourceRef: kind === 'subscription' ? (targets[0]?.ref ?? null) : null,
      });
    },
  });

  // Переход с карточки ноды или пользователя: цели грузятся сами, нужная — уже отмечена.
  const prefillLoaded = useRef(false);
  useEffect(() => {
    if (!prefill || prefillLoaded.current) return;
    prefillLoaded.current = true;
    panel.mutate(prefill.kind);
  }, [prefill, panel]);

  const toggleResource = (index: number) => {
    const next = value.resources.map((resource, position) =>
      position === index && !resource.disabledReason ? { ...resource, on: !resource.on } : resource,
    );
    onChange({ ...value, resources: next });
  };
  const accepted = value.resources.filter((resource) => resource.on).length;
  const error = parse.error ?? panel.error;

  return (
    <div className="space-y-3">
      {kinds.length > 0 && (
        <ChoiceChips
          value={origin}
          options={[
            { value: 'paste', label: t('admin.dpichecker.form.paste') },
            { value: 'panel', label: t('admin.dpichecker.form.fromPanel') },
          ]}
          onChange={setOrigin}
          label={t('admin.dpichecker.form.originLabel')}
        />
      )}

      {origin === 'paste' && (
        <div className="space-y-2">
          <p className="text-sm text-dark-300">{t(`admin.dpichecker.form.hint.${checkType}`)}</p>
          <textarea
            className="input min-h-[120px] w-full font-mono text-xs"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={t(`admin.dpichecker.form.placeholder.${checkType}`)}
            aria-label={t('admin.dpichecker.form.step1')}
          />
          <button
            type="button"
            className="btn-secondary min-h-[40px] px-4 text-sm"
            disabled={!text.trim() || parse.isPending}
            onClick={() => parse.mutate()}
          >
            {parse.isPending
              ? t('admin.dpichecker.form.parsing')
              : t('admin.dpichecker.form.continue')}
          </button>
        </div>
      )}

      {origin === 'panel' && (
        <div className="flex flex-wrap items-center gap-2">
          {kinds.length > 1 && (
            <ChoiceChips
              value={panelKind}
              options={kinds.map((kind) => ({
                value: kind,
                label: t(`admin.dpichecker.form.panel.${kind}`),
              }))}
              onChange={setPanelKind}
              label={t('admin.dpichecker.form.panel.label')}
            />
          )}
          <button
            type="button"
            className="btn-secondary min-h-[40px] px-4 text-sm"
            disabled={panel.isPending}
            onClick={() => panel.mutate(panelKind)}
          >
            {t(`admin.dpichecker.form.panel.load.${panelKind}`)}
          </button>
        </div>
      )}

      {error && (
        <p className="text-sm text-error-400">
          {getApiErrorMessage(error, t('admin.dpichecker.form.failed'))}
        </p>
      )}
      {parse.data && fromParse(checkType, parse.data).error === 'fetchFailed' && (
        <p className="text-sm text-error-400">{t('admin.dpichecker.form.fetchFailed')}</p>
      )}

      {(value.resources.length > 0 || parse.isSuccess) && (
        <p className="text-sm text-dark-300">
          {accepted > 0
            ? t('admin.dpichecker.form.accepted', { count: accepted })
            : t('admin.dpichecker.form.nothingAccepted')}
          <NoteLine notes={notes} />
        </p>
      )}
      {value.resources.length > 0 && (
        <ul className="max-h-[320px] space-y-1.5 overflow-y-auto pe-1">
          {value.resources.map((resource, index) => {
            const on = resource.on && !resource.disabledReason;
            return (
              <li key={`${resource.value}-${index}`} className={cn(ROW, on ? ROW_ON : ROW_OFF)}>
                <button
                  type="button"
                  className={ROW_BUTTON}
                  aria-pressed={on}
                  disabled={Boolean(resource.disabledReason)}
                  onClick={() => toggleResource(index)}
                >
                  <CheckGlyph on={on} />
                  <span className="min-w-0 flex-1 truncate text-sm text-dark-100">
                    {resource.name}
                  </span>
                  {resource.disabledReason && (
                    <span className="text-xs text-dark-400">
                      {t('admin.dpichecker.form.udpOnly')}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

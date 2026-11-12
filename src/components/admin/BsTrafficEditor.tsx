import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import type { ServerInfo } from '@/api/tariffs';
import type { BsTrafficFormState } from './bsTrafficForm';
import { parseBsTrafficForm } from './bsTrafficForm';

interface Props {
  value: BsTrafficFormState | null;
  onChange: (value: BsTrafficFormState | null) => void;
  servers: ServerInfo[];
  ordinarySquads: string[];
}

export function BsTrafficEditor({ value, onChange, servers, ordinarySquads }: Props) {
  const { t } = useTranslation();
  const id = useId();
  const label = (key: string) => t(`admin.tariffs.bs.${key}`);
  const patch = (change: Partial<BsTrafficFormState>) => value && onChange({ ...value, ...change });
  const selected = new Set(value?.squads ?? []);
  const choices = [
    ...servers.map((s) => ({ id: s.squad_uuid, name: s.display_name })),
    ...(value?.squads ?? [])
      .filter((uuid) => !servers.some((s) => s.squad_uuid === uuid))
      .map((uuid) => ({ id: uuid, name: `${label('unavailable')} (${uuid})` })),
  ];
  return (
    <section className="card min-w-0 space-y-4 p-4" aria-labelledby={`${id}-title`}>
      <div className="space-y-2">
        <h3 id={`${id}-title`} className="font-medium text-dark-100">
          {label('title')}
        </h3>
        <p className="text-sm leading-relaxed text-dark-300">{label('description')}</p>
        <label className="flex min-h-11 items-center gap-3 text-sm text-dark-100">
          <input
            type="checkbox"
            className="h-4 w-4 shrink-0 accent-accent-500"
            checked={value !== null && value.enabled !== false}
            onChange={(event) => {
              onChange({
                ...(value ?? {
                  squads: [],
                  limitGb: '10',
                  topupEnabled: false,
                  maxTopupGb: '0',
                  packages: [],
                }),
                enabled: event.target.checked,
              });
            }}
          />
          {label('configure')}
        </label>
      </div>
      {value && value.enabled !== false && (
        <>
          <p className="text-sm leading-relaxed text-dark-300">{label('applicationNote')}</p>
          <label className="block space-y-1 text-sm text-dark-100">
            <span className="block">{label('limit')}</span>
            <input
              className="input w-full sm:max-w-48"
              inputMode="numeric"
              aria-label={label('limit')}
              aria-describedby={`${id}-zero`}
              value={value.limitGb}
              onChange={(e) =>
                patch({
                  limitGb: e.target.value,
                  ...(e.target.value === '0' ? { topupEnabled: false } : {}),
                })
              }
            />
            <span id={`${id}-zero`} className="block text-dark-300">
              {label('zero')}
            </span>
          </label>
          <fieldset className="min-w-0">
            <legend className="mb-2 text-sm font-medium text-dark-100">{label('squads')}</legend>
            <p className="mb-2 text-sm text-dark-300">{label('separate')}</p>
            <div className="max-h-64 space-y-1 overflow-y-auto">
              {choices.map((server) => (
                <label
                  key={server.id}
                  className="flex min-h-11 items-center gap-3 break-words text-sm text-dark-100"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 shrink-0 accent-accent-500"
                    checked={selected.has(server.id)}
                    disabled={ordinarySquads.includes(server.id) && !selected.has(server.id)}
                    onChange={(e) =>
                      patch({
                        squads: e.target.checked
                          ? [...value.squads, server.id]
                          : value.squads.filter((uuid) => uuid !== server.id),
                      })
                    }
                  />
                  <span className="min-w-0 break-words">{server.name}</span>
                </label>
              ))}
              {!choices.length && <p className="text-sm text-dark-300">{label('noSquads')}</p>}
            </div>
          </fieldset>
          <label className="flex min-h-11 items-center gap-3 text-sm text-dark-100">
            <input
              type="checkbox"
              className="h-4 w-4 shrink-0 accent-accent-500"
              checked={value.topupEnabled}
              disabled={value.limitGb === '0'}
              onChange={(e) => patch({ topupEnabled: e.target.checked })}
            />
            {label('topup')}
          </label>
          {(value.topupEnabled || value.packages.length > 0) && (
            <div className="space-y-3 border-t border-dark-700 pt-4">
              <label className="block space-y-1 text-sm text-dark-100">
                <span className="block">{label('maximum')}</span>
                <input
                  className="input w-full sm:max-w-48"
                  inputMode="numeric"
                  value={value.maxTopupGb}
                  onChange={(e) => patch({ maxTopupGb: e.target.value })}
                />
              </label>
              {value.packages.map((row, index) => (
                <div
                  key={index}
                  className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_auto]"
                >
                  <label className="min-w-0 space-y-1 text-sm text-dark-100">
                    <span className="block">{label('gb')}</span>
                    <input
                      className="input w-full"
                      inputMode="numeric"
                      value={row.gb}
                      onChange={(e) =>
                        patch({
                          packages: value.packages.map((r, i) =>
                            i === index ? { ...r, gb: e.target.value } : r,
                          ),
                        })
                      }
                    />
                  </label>
                  <label className="min-w-0 space-y-1 text-sm text-dark-100">
                    <span className="block">{label('price')}</span>
                    <input
                      className="input w-full"
                      inputMode="decimal"
                      value={row.rubles}
                      onChange={(e) =>
                        patch({
                          packages: value.packages.map((r, i) =>
                            i === index ? { ...r, rubles: e.target.value } : r,
                          ),
                        })
                      }
                    />
                  </label>
                  <button
                    type="button"
                    className="btn-secondary col-span-2 min-h-11 self-end sm:col-span-1"
                    aria-label={`${label('remove')} ${index + 1}`}
                    onClick={() =>
                      patch({ packages: value.packages.filter((_, i) => i !== index) })
                    }
                  >
                    {label('remove')}
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="btn-secondary min-h-11"
                disabled={value.packages.length >= 100}
                onClick={() => patch({ packages: [...value.packages, { gb: '', rubles: '' }] })}
              >
                {label('add')}
              </button>
            </div>
          )}
          {parseBsTrafficForm(value, ordinarySquads) === undefined && (
            <p role="status" className="text-sm text-warning-400">
              {label('invalid')}
            </p>
          )}
        </>
      )}
    </section>
  );
}

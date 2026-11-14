import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ServerInfo, ServerTrafficLimit } from '../../../api/tariffs';

// ──────────────────────────────────────────────────────────────────
// Премиум-лимиты по серверам тарифа.
//
// Панель Remnawave умеет ограничивать трафик только на всю учётную запись
// целиком. Отдельный лимит на сервер считает и применяет бот: исчерпав его,
// пользователь теряет доступ к этому серверу, а остальные продолжают работать.
//
// Ноль в лимите означает «премиума на сервере нет» — так устроено само поле,
// и это же позволяет выключить премиум, не удаляя настройки цен.
// ──────────────────────────────────────────────────────────────────

export interface PremiumSquadLimitsProps {
  /** Серверы, выбранные в тарифе: премиум задаётся только на них. */
  servers: ServerInfo[];
  selectedSquads: string[];
  value: Record<string, ServerTrafficLimit>;
  onChange: (value: Record<string, ServerTrafficLimit>) => void;
}

export function PremiumSquadLimits({
  servers,
  selectedSquads,
  value,
  onChange,
}: PremiumSquadLimitsProps) {
  const { t } = useTranslation();
  // Порядок — заданный админом, а не порядок справочника серверов: именно в нём
  // строки увидит пользователь на главном экране.
  const chosen = servers
    .filter((server) => selectedSquads.includes(server.squad_uuid))
    .sort((a, b) => {
      const orderA = value[a.squad_uuid]?.sort_order ?? 0;
      const orderB = value[b.squad_uuid]?.sort_order ?? 0;
      return orderA - orderB || a.squad_uuid.localeCompare(b.squad_uuid);
    });

  const patch = (squad: string, changes: Partial<ServerTrafficLimit>) => {
    const current = value[squad] ?? { traffic_limit_gb: 0 };
    onChange({ ...value, [squad]: { ...current, ...changes } });
  };

  /** Переставить сервер на позицию выше или ниже. */
  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= chosen.length) return;
    const reordered = [...chosen];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(target, 0, moved);
    // Переписываем порядок целиком: частичная правка оставила бы дубли, а
    // сортировка с одинаковыми ключами дала бы непредсказуемый результат.
    const next = { ...value };
    reordered.forEach((server, position) => {
      const current = next[server.squad_uuid] ?? { traffic_limit_gb: 0 };
      next[server.squad_uuid] = { ...current, sort_order: position };
    });
    onChange(next);
  };

  if (chosen.length === 0) {
    return (
      <div className="card space-y-2">
        <h4 className="text-sm font-medium text-dark-200">
          {t('admin.tariffs.premiumLimitsTitle')}
        </h4>
        <p className="py-2 text-center text-sm text-dark-500">
          {t('admin.tariffs.premiumLimitsNoServers')}
        </p>
      </div>
    );
  }

  return (
    <div className="card space-y-4">
      <div>
        <h4 className="text-sm font-medium text-dark-200">
          {t('admin.tariffs.premiumLimitsTitle')}
        </h4>
        <p className="mt-1 text-sm text-dark-400">{t('admin.tariffs.premiumLimitsHint')}</p>
      </div>

      <div className="space-y-4">
        {chosen.map((server, index) => {
          const limit = value[server.squad_uuid] ?? { traffic_limit_gb: 0 };
          const isPremium = (limit.traffic_limit_gb ?? 0) > 0;
          return (
            <div key={server.squad_uuid} className="rounded-lg bg-dark-800 p-3">
              <div className="flex items-center gap-3">
                <div className="flex shrink-0 flex-col">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    aria-label={t('admin.tariffs.premiumMoveUp')}
                    className="px-1 text-xs leading-none text-dark-400 hover:text-dark-200 disabled:opacity-30"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === chosen.length - 1}
                    aria-label={t('admin.tariffs.premiumMoveDown')}
                    className="px-1 text-xs leading-none text-dark-400 hover:text-dark-200 disabled:opacity-30"
                  >
                    ▼
                  </button>
                </div>
                <span className="flex-1 truncate text-sm font-medium text-dark-200">
                  {server.display_name}
                </span>
                <label className="flex items-center gap-2 text-xs text-dark-400">
                  {t('admin.tariffs.premiumLimitGb')}
                  <NumberField
                    ariaLabel={t('admin.tariffs.premiumLimitGb')}
                    value={limit.traffic_limit_gb ?? 0}
                    onChange={(traffic_limit_gb) => patch(server.squad_uuid, { traffic_limit_gb })}
                    className="input w-24"
                  />
                </label>
              </div>

              {/* Цены докупки показываем только там, где премиум включён:
                  на сервере без лимита докупать нечего. */}
              {isPremium && (
                <div className="mt-3 space-y-3 border-t border-dark-700 pt-3">
                  {/* Название нужно, когда премиум-серверов несколько: без него
                      все строки в интерфейсе подписаны одинаково. */}
                  <label className="flex items-center gap-2 text-xs text-dark-400">
                    {t('admin.tariffs.premiumLimitName')}
                    <input
                      type="text"
                      maxLength={64}
                      value={limit.name ?? ''}
                      placeholder={server.display_name}
                      aria-label={t('admin.tariffs.premiumLimitName')}
                      onChange={(e) =>
                        // Обрезать пробелы на каждом нажатии нельзя: концевой
                        // пробел исчезал бы прямо во время набора, и слова
                        // слипались. Пустую строку приводим к null, чтобы не
                        // перекрыть подстановку имени сервера; лишние пробелы
                        // по краям снимет бэкенд при разборе.
                        patch(server.squad_uuid, { name: e.target.value || null })
                      }
                      className="input flex-1"
                    />
                  </label>

                  <label className="flex items-center gap-2 text-sm text-dark-300">
                    <input
                      type="checkbox"
                      checked={Boolean(limit.topup_enabled)}
                      onChange={(e) =>
                        patch(server.squad_uuid, { topup_enabled: e.target.checked })
                      }
                    />
                    {t('admin.tariffs.premiumTopupEnabled')}
                  </label>

                  {limit.topup_enabled && (
                    <>
                      <PackagesEditor
                        packages={limit.topup_packages ?? {}}
                        onChange={(packages) =>
                          patch(server.squad_uuid, { topup_packages: packages })
                        }
                      />
                      <label className="flex items-center gap-2 text-xs text-dark-400">
                        {t('admin.tariffs.premiumMaxTopupGb')}
                        <NumberField
                          ariaLabel={t('admin.tariffs.premiumMaxTopupGb')}
                          value={limit.max_topup_gb ?? 0}
                          onChange={(max_topup_gb) => patch(server.squad_uuid, { max_topup_gb })}
                          className="input w-24"
                        />
                        <span className="text-dark-500">
                          {t('admin.tariffs.premiumMaxTopupHint')}
                        </span>
                      </label>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Пакеты докупки: строка «объём в ГБ — цена в рублях».
 *
 * Наружу пакеты уходят словарём `{ГБ: копейки}` — так их хранит тариф. Но
 * редактировать словарь напрямую нельзя: объём там ключ, и промежуточное
 * значение при наборе («1» на пути к «10») совпадает с уже существующим
 * пакетом, затирая его цену. Поэтому внутри — список строк со своими
 * идентификаторами, а в словарь он превращается только на выходе.
 */
function PackagesEditor({
  packages,
  onChange,
}: {
  packages: Record<string, number>;
  onChange: (value: Record<string, number>) => void;
}) {
  const { t } = useTranslation();
  const nextId = useRef(0);

  const toRows = (source: Record<string, number>): PackageRow[] =>
    Object.entries(source)
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([gb, kopeks]) => ({ id: nextId.current++, gb, kopeks }));

  const [rows, setRows] = useState<PackageRow[]>(() => toRows(packages));
  // Что мы сами отдали наверх: приход этого же значения обратно — эхо, и
  // пересобирать строки по нему нельзя, иначе набранное «10» схлопнется.
  const emitted = useRef(serialize(packages));

  useEffect(() => {
    const incoming = serialize(packages);
    if (incoming !== emitted.current) {
      emitted.current = incoming;
      setRows(toRows(packages));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packages]);

  const emit = (next: PackageRow[]) => {
    setRows(next);
    const dict: Record<string, number> = {};
    for (const row of next) {
      const gb = Number.parseInt(row.gb, 10);
      // Пустое или нулевое поле — незаконченный ввод, наверх его не отдаём,
      // но строку в редакторе оставляем: иначе она исчезала бы под курсором.
      if (Number.isFinite(gb) && gb > 0) dict[String(gb)] = row.kopeks;
    }
    emitted.current = serialize(dict);
    onChange(dict);
  };

  const duplicates = new Set(
    rows.map((row) => row.gb).filter((gb, index, all) => gb !== '' && all.indexOf(gb) !== index),
  );

  return (
    <div className="space-y-2">
      <div className="text-xs text-dark-400">{t('admin.tariffs.premiumPackages')}</div>
      {rows.length === 0 && (
        <div className="text-xs text-dark-500">{t('admin.tariffs.premiumPackagesEmpty')}</div>
      )}
      {rows.map((row, index) => (
        <div key={row.id} className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            value={row.gb}
            onChange={(e) =>
              emit(rows.map((r, i) => (i === index ? { ...r, gb: e.target.value } : r)))
            }
            className={`input w-20 ${duplicates.has(row.gb) ? 'border-error-500' : ''}`}
            aria-label={t('admin.tariffs.premiumPackageGb')}
          />
          <span className="text-xs text-dark-500">{t('common.units.gb')}</span>
          <NumberField
            ariaLabel={t('admin.tariffs.premiumPackagePrice')}
            value={row.kopeks / 100}
            step="0.01"
            onChange={(rubles) =>
              emit(
                rows.map((r, i) => (i === index ? { ...r, kopeks: Math.round(rubles * 100) } : r)),
              )
            }
            className="input w-28"
          />
          <span className="text-xs text-dark-500">₽</span>
          <button
            type="button"
            onClick={() => emit(rows.filter((_, i) => i !== index))}
            className="text-xs text-error-400 hover:text-error-300"
          >
            {t('common.delete')}
          </button>
        </div>
      ))}
      {duplicates.size > 0 && (
        // Одинаковые объёмы схлопнутся при сохранении: объём — ключ пакета.
        <div className="text-xs text-error-400">{t('admin.tariffs.premiumPackageDuplicate')}</div>
      )}
      <button
        type="button"
        onClick={() =>
          emit([...rows, { id: nextId.current++, gb: String(nextFreeGb(rows)), kopeks: 0 }])
        }
        className="text-xs text-accent-400 hover:text-accent-300"
      >
        + {t('admin.tariffs.premiumPackageAdd')}
      </button>
    </div>
  );
}

interface PackageRow {
  id: number;
  gb: string;
  kopeks: number;
}

/** Канонический вид словаря: порядок ключей не должен влиять на сравнение. */
function serialize(packages: Record<string, number>): string {
  return JSON.stringify(
    Object.entries(packages)
      .map(([gb, kopeks]) => [Number(gb), kopeks])
      .sort((a, b) => a[0] - b[0]),
  );
}

/** Ближайший свободный объём, чтобы новая строка не дублировала существующую. */
function nextFreeGb(rows: PackageRow[]): number {
  const taken = new Set(rows.map((row) => Number.parseInt(row.gb, 10)));
  let gb = 1;
  while (taken.has(gb)) gb += 1;
  return gb;
}

/**
 * Числовое поле, которое не мешает набирать.
 *
 * Обычный контролируемый `<input type="number">` со значением-числом
 * подставляет ноль сразу, как поле очистили: `Number('') || 0`. Ноль тут же
 * появляется в поле, и следующая цифра дописывается к нему — вместо «10»
 * выходит «010», а стереть ноль невозможно, он возвращается на каждом нажатии.
 *
 * Поэтому набранный текст живёт своей жизнью, а наверх уходит разобранное
 * число. По уходу фокуса текст приводится к каноническому виду, чтобы «010» не
 * осталось на экране.
 */
function NumberField({
  value,
  onChange,
  ariaLabel,
  className,
  step,
}: {
  value: number;
  onChange: (value: number) => void;
  ariaLabel: string;
  className?: string;
  step?: string;
}) {
  const [text, setText] = useState(String(value));
  // Что мы сами отдали наверх: приход этого же числа обратно — эхо, и
  // переписывать по нему набранный текст нельзя.
  const emitted = useRef(value);

  useEffect(() => {
    if (value !== emitted.current) {
      emitted.current = value;
      setText(String(value));
    }
  }, [value]);

  const handle = (raw: string) => {
    setText(raw);
    // Пустое поле — незаконченный ввод: наверх отдаём ноль, но текст не трогаем,
    // иначе ноль появится под курсором.
    const parsed = raw === '' ? 0 : Math.max(0, Number(raw) || 0);
    emitted.current = parsed;
    onChange(parsed);
  };

  return (
    <input
      type="number"
      min={0}
      step={step}
      value={text}
      aria-label={ariaLabel}
      className={className}
      onChange={(e) => handle(e.target.value)}
      onBlur={() => setText(String(emitted.current))}
    />
  );
}

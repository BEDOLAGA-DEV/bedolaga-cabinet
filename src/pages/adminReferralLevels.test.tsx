// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PlatformProvider } from '@/platform/PlatformProvider';
import type { ReferralRewardLevel, ReferralRewardLevels } from '@/types';

/**
 * The reward-level editor writes money rules, so its failure modes are expensive
 * and quiet: a field that cannot be cleared leaves the old rate paying, a
 * rejected value that shows no error reads as saved, and an input that keeps the
 * typed text hides what was actually stored.
 *
 * These tests hold the save contract — which fields go over the wire, and in what
 * units — rather than the layout.
 */

import ruLocale from '@/locales/ru.json';

function resolveRu(key: string): string | undefined {
  const value = key
    .split('.')
    .reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], ruLocale);
  return typeof value === 'string' ? value : undefined;
}

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      const templates: Record<string, string> = {
        'admin.referralLevels.percent': 'Процент',
        'admin.referralLevels.fixedAmount': 'Фикс. сумма',
        'admin.referralLevels.days': 'Дни',
        'admin.referralLevels.maxPayments': 'Лимит',
        'admin.referralLevels.tariff': 'Тариф',
        'admin.referralLevels.mainSubscription': 'основная подписка',
        'admin.referralLevels.invalidValue': 'Некорректное значение: {{field}}',
        'admin.referralLevels.addLevel': 'Добавить уровень {{count}}',
        'admin.referralLevels.beyondDepth': 'Глубже {{count}} — не платит',
        'admin.referralLevels.importLegacy': 'Перенести текущие настройки',
        'admin.referralLevels.schemeOffWarning': 'Схема классическая: правила НЕ применяются',
        'admin.referralLevels.chainDepth': 'Глубина цепочки',
        'admin.referralLevels.chainDepthHint': 'Максимум: {{max}}',
        'admin.referralLevels.depthRange': 'Глубина должна быть от 1 до {{max}}',
        'admin.referralLevels.requiredReferrals': 'Рефералов для открытия',
        'admin.referralLevels.countingActive': 'Считаем: с пополнением',
        'admin.referralLevels.countingAll': 'Считаем: всех',
      };
      // Ключ, которого нет в карте выше, берётся из НАСТОЯЩЕЙ ru.json. Иначе
      // забытый перевод остаётся незамеченным: компонент рисует ключ, а тест
      // сверяется с той же выдуманной строкой и остаётся зелёным.
      const template = templates[key] ?? resolveRu(key) ?? key;
      return template.replace(/{{(\w+)}}/g, (_m, name) => String(options?.[name] ?? ''));
    },
    i18n: { language: 'ru', changeLanguage: () => Promise.resolve() },
  }),
  Trans: ({ children }: { children?: unknown }) => children ?? null,
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

const level = (overrides: Partial<ReferralRewardLevel> = {}): ReferralRewardLevel => ({
  level: 1,
  is_active: true,
  reward_mode: 'both',
  trigger: 'every_topup',
  referrer_percent: 25,
  referrer_fixed_kopeks: null,
  referrer_days: 0,
  referrer_tariff_id: null,
  referee_fixed_kopeks: null,
  referee_days: 0,
  referee_tariff_id: null,
  max_payments: 0,
  required_referrals: 0,
  required_referrals_active_only: true,
  ...overrides,
});

const state: {
  payload: ReferralRewardLevels;
  saves: { level: number; patch: unknown }[];
  imported: number;
  depth: number | null;
  mode: string | null;
} = {
  imported: 0,
  depth: null,
  payload: {
    scheme: 'levels',
    scheme_locked_by_env: false,
    levels_mode: 'chain',
    levels_mode_locked_by_env: false,
    max_level_depth: 3,
    max_supported_level: 10,
    levels: [level()],
    available_tariffs: [{ id: 42, name: 'Про' }],
  },
  saves: [],
  mode: null,
};

vi.mock('@/api/partners', () => ({
  partnerApi: {
    getReferralLevels: () => Promise.resolve(state.payload),
    upsertReferralLevel: (lvl: number, patch: unknown) => {
      state.saves.push({ level: lvl, patch });
      return Promise.resolve(state.payload);
    },
    deleteReferralLevel: () => Promise.resolve(state.payload),
    updateReferralDepth: (depth: number) => {
      state.depth = depth;
      return Promise.resolve(state.payload);
    },
    importLegacyReferralSettings: () => {
      state.imported += 1;
      return Promise.resolve({
        ...state.payload,
        import_notes: ['Ступени комиссии НЕ перенесены'],
      });
    },
    updateReferralScheme: () => Promise.resolve(state.payload),
    updateReferralLevelsMode: (mode: string) => {
      state.mode = mode;
      return Promise.resolve(state.payload);
    },
  },
}));

if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

(globalThis as Record<string, unknown>).__APP_VERSION__ ??= '0.0.0-test';

const basePayload = (): ReferralRewardLevels => ({
  scheme: 'levels',
  scheme_locked_by_env: false,
  levels_mode: 'chain',
  levels_mode_locked_by_env: false,
  max_level_depth: 3,
  max_supported_level: 10,
  levels: [level()],
  available_tariffs: [{ id: 42, name: 'Про' }],
});

afterEach(() => {
  cleanup();
  state.saves = [];
  state.imported = 0;
  state.depth = null;
  state.mode = null;
  // Полный сброс: точечная замена levels оставляла изменённые границы из
  // предыдущего теста и делала следующий зависимым от порядка.
  state.payload = basePayload();
});

async function renderEditor() {
  const Page = (await import('./AdminReferralLevels')).default;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <PlatformProvider>
        <MemoryRouter initialEntries={['/admin/partners/referral-levels']}>
          <Page />
        </MemoryRouter>
      </PlatformProvider>
    </QueryClientProvider>,
  );
  // findBy* (единственное число) падает, когда уровней больше одного.
  await screen.findAllByLabelText('Процент');
}

/** Обе стороны уровня имеют «Дни» и «Фикс. сумма»; index 0 — пригласивший. */
function blur(labelText: string, value: string, index = 0) {
  const input = screen.getAllByLabelText(labelText)[index] as HTMLInputElement;
  fireEvent.change(input, { target: { value } });
  fireEvent.blur(input);
}

describe('очистка полей', () => {
  it('пустой процент означает «не начисляется», а не «ничего не делать»', async () => {
    await renderEditor();
    blur('Процент', '');
    await waitFor(() => expect(state.saves).toHaveLength(1));
    expect(state.saves[0]).toEqual({ level: 1, patch: { referrer_percent: null } });
  });

  it('пустые дни означают ноль: колонка NOT NULL', async () => {
    await renderEditor();
    blur('Дни', '');
    await waitFor(() => expect(state.saves).toHaveLength(1));
    expect(state.saves[0]).toEqual({ level: 1, patch: { referrer_days: 0 } });
  });
});

describe('единицы измерения', () => {
  it('деньги вводятся в рублях, а уходят в копейках', async () => {
    await renderEditor();
    blur('Фикс. сумма', '150,50');
    await waitFor(() => expect(state.saves).toHaveLength(1));
    expect(state.saves[0]).toEqual({ level: 1, patch: { referrer_fixed_kopeks: 15050 } });
  });

  it('дни остаются целым числом', async () => {
    await renderEditor();
    blur('Дни', '7');
    await waitFor(() => expect(state.saves).toHaveLength(1));
    expect(state.saves[0]).toEqual({ level: 1, patch: { referrer_days: 7 } });
  });
});

describe('отказы больше не молчат', () => {
  it('процент вне диапазона не сохраняется и показывает ошибку', async () => {
    await renderEditor();
    blur('Процент', '150');
    expect(await screen.findByText(/Некорректное значение: Процент/)).toBeTruthy();
    expect(state.saves).toHaveLength(0);
  });

  it('нечисловой ввод не сохраняется и показывает ошибку', async () => {
    await renderEditor();
    blur('Фикс. сумма', 'много');
    expect(await screen.findByText(/Некорректное значение: Фикс. сумма/)).toBeTruthy();
    expect(state.saves).toHaveLength(0);
  });

  it('отрицательное значение не сохраняется', async () => {
    await renderEditor();
    blur('Дни', '-5');
    expect(await screen.findByText(/Некорректное значение: Дни/)).toBeTruthy();
    expect(state.saves).toHaveLength(0);
  });
});

describe('выбор тарифа', () => {
  it('«без тарифа» сохраняется как null, а не игнорируется', async () => {
    state.payload = {
      ...state.payload,
      levels: [level({ reward_mode: 'days', referrer_days: 7, referrer_tariff_id: 42 })],
    };
    await renderEditor();

    const select = screen.getAllByLabelText('Тариф')[0] as HTMLSelectElement;
    fireEvent.change(select, { target: { value: '' } });
    await waitFor(() => expect(state.saves).toHaveLength(1));
    expect(state.saves[0]).toEqual({ level: 1, patch: { referrer_tariff_id: null } });
  });

  it('тариф выбирается из списка, пришедшего с уровнями', async () => {
    state.payload = {
      ...state.payload,
      levels: [level({ reward_mode: 'days', referrer_days: 7 })],
    };
    await renderEditor();

    const select = screen.getAllByLabelText('Тариф')[0] as HTMLSelectElement;
    fireEvent.change(select, { target: { value: '42' } });
    await waitFor(() => expect(state.saves).toHaveLength(1));
    expect(state.saves[0]).toEqual({ level: 1, patch: { referrer_tariff_id: 42 } });
  });
});

describe('границы', () => {
  it('кнопка добавления исчезает на максимуме уровней', async () => {
    state.payload = {
      ...state.payload,
      max_supported_level: 2,
      levels: [level({ level: 1 }), level({ level: 2 })],
    };
    await renderEditor();
    expect(screen.queryByText(/Добавить уровень 3/)).toBeNull();
  });

  it('уровень глубже предела обхода помечен как неплатящий', async () => {
    state.payload = {
      ...state.payload,
      max_level_depth: 1,
      levels: [level({ level: 1 }), level({ level: 2 })],
    };
    await renderEditor();
    expect(await screen.findByText(/Глубже 1 — не платит/)).toBeTruthy();
  });
});

describe('стороны уровня различаются', () => {
  it('поле приглашённого пишет в свою колонку, а не в колонку пригласившего', async () => {
    await renderEditor();
    blur('Дни', '5', 1);
    await waitFor(() => expect(state.saves).toHaveLength(1));
    expect(state.saves[0]).toEqual({ level: 1, patch: { referee_days: 5 } });
  });
});

describe('перенос легаси-настроек', () => {
  it('предлагается только на пустой таблице уровней', async () => {
    state.payload = { ...basePayload(), levels: [] };
    const Page = (await import('./AdminReferralLevels')).default;
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <PlatformProvider>
          <MemoryRouter initialEntries={['/admin/partners/referral-levels']}>
            <Page />
          </MemoryRouter>
        </PlatformProvider>
      </QueryClientProvider>,
    );

    const button = await screen.findByText(/Перенести текущие настройки/);
    fireEvent.click(button);
    await waitFor(() => expect(state.imported).toBe(1));

    // Молча потерять ступени комиссии хуже, чем сообщить о них.
    expect(await screen.findByText(/Ступени комиссии НЕ перенесены/)).toBeTruthy();
  });

  it('не предлагается, когда уровни уже есть', async () => {
    await renderEditor();
    expect(screen.queryByText(/Перенести текущие настройки/)).toBeNull();
  });
});

describe('ловушки редактора', () => {
  it('дыра в уровнях предлагается заново, а не следующий за максимумом', async () => {
    state.payload = {
      ...basePayload(),
      levels: [level({ level: 1 }), level({ level: 3 })],
    };
    await renderEditor();
    expect(await screen.findByText(/Добавить уровень 2/)).toBeTruthy();
  });

  it('назначенный неактивный тариф остаётся в списке выбора', async () => {
    state.payload = {
      ...basePayload(),
      available_tariffs: [{ id: 3, name: 'Активный' }],
      levels: [
        level({
          reward_mode: 'days',
          referrer_days: 7,
          referrer_tariff_id: 99,
          referrer_tariff_name: 'Снятый',
        }),
      ],
    };
    await renderEditor();

    const select = screen.getAllByLabelText('Тариф')[0] as HTMLSelectElement;
    expect(select.value).toBe('99');
    const labels = Array.from(select.options).map((o) => o.textContent);
    expect(labels).toContain('Снятый');
  });

  it('предупреждает, что правила не применяются под классической схемой', async () => {
    state.payload = { ...basePayload(), scheme: 'legacy' };
    await renderEditor();
    expect(await screen.findByText(/правила НЕ применяются/)).toBeTruthy();
  });

  it('под многоуровневой схемой не предупреждает', async () => {
    await renderEditor();
    expect(screen.queryByText(/правила НЕ применяются/)).toBeNull();
  });
});

describe('глубина цепочки', () => {
  it('задаётся прямо в редакторе уровней', async () => {
    await renderEditor();
    blur('Глубина цепочки', '10');
    await waitFor(() => expect(state.depth).toBe(10));
  });

  it('не принимает больше, чем можно завести уровней', async () => {
    await renderEditor();
    blur('Глубина цепочки', '11');
    expect(await screen.findByText(/Глубина должна быть от 1 до 10/)).toBeTruthy();
    expect(state.depth).toBeNull();
  });
});

describe('порог открытия уровня', () => {
  it('задаётся количеством рефералов', async () => {
    await renderEditor();
    blur('Рефералов для открытия', '25');
    await waitFor(() => expect(state.saves).toHaveLength(1));
    expect(state.saves[0]).toEqual({ level: 1, patch: { required_referrals: 25 } });
  });

  it('пустое поле означает «доступен сразу»', async () => {
    state.payload = { ...basePayload(), levels: [level({ required_referrals: 10 })] };
    await renderEditor();
    blur('Рефералов для открытия', '');
    await waitFor(() => expect(state.saves).toHaveLength(1));
    expect(state.saves[0]).toEqual({ level: 1, patch: { required_referrals: 0 } });
  });

  it('переключает, кого считать: порог по всем регистрациям накручивается пустыми аккаунтами', async () => {
    await renderEditor();
    fireEvent.click(screen.getByText(/Считаем: с пополнением/));
    await waitFor(() => expect(state.saves).toHaveLength(1));
    expect(state.saves[0]).toEqual({ level: 1, patch: { required_referrals_active_only: false } });
  });
});

describe('режим уровней', () => {
  it('переключает цепочку на уровни за приглашённых', async () => {
    await renderEditor();
    fireEvent.click(screen.getByText('Переключить на уровни за приглашённых'));
    await waitFor(() => expect(state.mode).toBe('tiers'));
  });

  it('в режиме за приглашённых прячет глубину цепочки и говорит, почему', async () => {
    // Поле, которое принимает значение и ни на что не влияет, хуже отсутствующего:
    // в рангах цепочка не обходится вовсе.
    state.payload = { ...basePayload(), levels_mode: 'tiers' };
    await renderEditor();

    expect(screen.queryByLabelText(/Глубина цепочки/)).toBeNull();
    expect(screen.getByText(/глубина не применяется/)).toBeTruthy();
  });

  it('в режиме за приглашённых не помечает уровни выше глубины как неплатящие', async () => {
    // Глубина ограничивает только цепочку. Метка «не платит» на работающем
    // ранге — прямая ложь о том, что бот начисляет.
    state.payload = {
      ...basePayload(),
      levels_mode: 'tiers',
      max_level_depth: 3,
      levels: [level({ level: 5, required_referrals: 10 })],
    };
    await renderEditor();

    expect(screen.queryByText(/не платит/)).toBeNull();
    expect(screen.getByText('Уровень 5')).toBeTruthy();
  });

  it('предупреждает, когда у всех уровней порог больше нуля', async () => {
    // Такая лестница не платит никому, пока партнёр не наберёт минимальный
    // порог: со стороны это «переключил режим — выплаты прекратились».
    state.payload = {
      ...basePayload(),
      levels_mode: 'tiers',
      levels: [level({ level: 1, required_referrals: 10 })],
    };
    await renderEditor();

    expect(screen.getByText(/Заведите уровень с порогом 0/)).toBeTruthy();
  });

  it('предупреждает про одинаковые пороги у активных уровней', async () => {
    state.payload = {
      ...basePayload(),
      levels_mode: 'tiers',
      levels: [
        level({ level: 1, required_referrals: 0 }),
        level({ level: 2, required_referrals: 10 }),
        level({ level: 3, required_referrals: 10 }),
      ],
    };
    await renderEditor();

    expect(screen.getByText(/одинаковый порог/)).toBeTruthy();
  });

  it('не предупреждает про одинаковые пороги, если один из уровней выключен', async () => {
    state.payload = {
      ...basePayload(),
      levels_mode: 'tiers',
      levels: [
        level({ level: 2, required_referrals: 10 }),
        level({ level: 3, required_referrals: 10, is_active: false }),
      ],
    };
    await renderEditor();

    expect(screen.queryByText(/одинаковый порог/)).toBeNull();
  });

  it('показывает уровни в порядке подъёма по лестнице, а не по номеру', async () => {
    state.payload = {
      ...basePayload(),
      levels_mode: 'tiers',
      levels: [
        level({ level: 2, required_referrals: 25 }),
        level({ level: 3, required_referrals: 5 }),
      ],
    };
    await renderEditor();

    const titles = screen.getAllByRole('heading', { level: 3 }).map((node) => node.textContent);
    expect(titles).toEqual(['Уровень 3', 'Уровень 2']);
  });

  it('не даёт переключить режим, закреплённый в .env', async () => {
    state.payload = { ...basePayload(), levels_mode_locked_by_env: true };
    await renderEditor();

    const button = screen.getByText('Переключить на уровни за приглашённых') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fireEvent.click(button);
    expect(state.mode).toBeNull();
  });
});

describe('карточка схемы в режиме за приглашённых', () => {
  it('не заявляет глубину цепочки рядом с «глубина не применяется»', async () => {
    // Одна карточка утверждала и «Глубина цепочки: до 3 уровней», и «в режиме
    // рангов глубина не применяется» — второе верно, первое противоречит и ему,
    // и тому, как режим реально платит.
    state.payload = { ...basePayload(), levels_mode: 'tiers', max_level_depth: 3 };
    await renderEditor();

    expect(screen.queryByText(/Глубина цепочки: до/)).toBeNull();
    expect(screen.getByText(/глубина не применяется/)).toBeTruthy();
  });

  it('в цепочке глубину по-прежнему называет', async () => {
    state.payload = { ...basePayload(), levels_mode: 'chain', max_level_depth: 3 };
    await renderEditor();

    expect(screen.getByText(/Глубина цепочки: до 3/)).toBeTruthy();
  });
});

describe('переключатель режима: направление и контракт', () => {
  it('переключает обратно на уровни по цепочке', async () => {
    // Без этого теста кнопку можно было заклинить на 'tiers': админ, включивший
    // ранги, физически не смог бы вернуться, а выплаты продолжали бы идти по ним.
    state.payload = { ...basePayload(), levels_mode: 'tiers' };
    await renderEditor();

    fireEvent.click(screen.getByText('Переключить на уровни по цепочке'));
    await waitFor(() => expect(state.mode).toBe('chain'));
  });

  it('объясняет, почему переключатель заблокирован ключом из .env', async () => {
    // Заблокированная кнопка без объяснения читается как поломка интерфейса.
    state.payload = { ...basePayload(), levels_mode_locked_by_env: true };
    await renderEditor();

    expect(screen.getByText(/REFERRAL_LEVELS_MODE задан в \.env/)).toBeTruthy();
  });

  it('подписывает порог и кнопку добавления по-ранговому', async () => {
    state.payload = { ...basePayload(), levels_mode: 'tiers' };
    await renderEditor();

    expect(screen.getByLabelText(/Уровень действует с/)).toBeTruthy();
    expect(screen.getByText(/Добавить уровень/)).toBeTruthy();
  });

  it('в цепочке подписи остаются уровневыми', async () => {
    state.payload = { ...basePayload(), levels_mode: 'chain' };
    await renderEditor();

    expect(screen.getByLabelText(/Рефералов для открытия/)).toBeTruthy();
    expect(screen.getByText(/Добавить уровень/)).toBeTruthy();
  });

  it('предупреждает про уровень, который ничего не начисляет пригласившему', async () => {
    // В цепочке такой уровень просто ничего не добавляет; в рангах он ЗАМЕНЯЕТ
    // собой платящий, и партнёр, набрав его порог, теряет доход.
    state.payload = {
      ...basePayload(),
      levels_mode: 'tiers',
      levels: [
        level({ level: 1, required_referrals: 0 }),
        level({
          level: 2,
          required_referrals: 10,
          referrer_percent: null,
          referrer_fixed_kopeks: null,
          referrer_days: 0,
          referee_fixed_kopeks: 50000,
        }),
      ],
    };
    await renderEditor();

    expect(screen.getByText(/ничего не начисляет пригласившему/)).toBeTruthy();
  });

  it('предупреждает про разные поводы начисления у уровней', async () => {
    state.payload = {
      ...basePayload(),
      levels_mode: 'tiers',
      levels: [
        level({ level: 1, required_referrals: 0, trigger: 'registration' }),
        level({ level: 2, required_referrals: 10, trigger: 'every_topup' }),
      ],
    };
    await renderEditor();

    expect(screen.getByText(/разные поводы начисления/)).toBeTruthy();
  });

  it('в цепочке этих предупреждений не показывает', async () => {
    state.payload = {
      ...basePayload(),
      levels_mode: 'chain',
      levels: [
        level({ level: 1, required_referrals: 10, trigger: 'registration' }),
        level({ level: 2, required_referrals: 10, trigger: 'every_topup' }),
      ],
    };
    await renderEditor();

    expect(screen.queryByText(/одинаковый порог/)).toBeNull();
    expect(screen.queryByText(/разные поводы начисления/)).toBeNull();
  });
});

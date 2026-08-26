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
      };
      const template = templates[key] ?? key;
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
  ...overrides,
});

const state: {
  payload: ReferralRewardLevels;
  saves: { level: number; patch: unknown }[];
  imported: number;
} = {
  imported: 0,
  payload: {
    scheme: 'levels',
    scheme_locked_by_env: false,
    max_level_depth: 3,
    max_supported_level: 10,
    levels: [level()],
    available_tariffs: [{ id: 42, name: 'Про' }],
  },
  saves: [],
};

vi.mock('@/api/partners', () => ({
  partnerApi: {
    getReferralLevels: () => Promise.resolve(state.payload),
    upsertReferralLevel: (lvl: number, patch: unknown) => {
      state.saves.push({ level: lvl, patch });
      return Promise.resolve(state.payload);
    },
    deleteReferralLevel: () => Promise.resolve(state.payload),
    importLegacyReferralSettings: () => {
      state.imported += 1;
      return Promise.resolve({
        ...state.payload,
        import_notes: ['Ступени комиссии НЕ перенесены'],
      });
    },
    updateReferralScheme: () => Promise.resolve(state.payload),
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
  max_level_depth: 3,
  max_supported_level: 10,
  levels: [level()],
  available_tariffs: [{ id: 42, name: 'Про' }],
});

afterEach(() => {
  cleanup();
  state.saves = [];
  state.imported = 0;
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

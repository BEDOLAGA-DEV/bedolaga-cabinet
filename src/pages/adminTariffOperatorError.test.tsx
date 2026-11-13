// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { afterEach, expect, it, vi } from 'vitest';
import { PlatformProvider } from '@/platform/PlatformProvider';
import ru from '@/locales/ru.json';
import en from '@/locales/en.json';
import zh from '@/locales/zh.json';
import fa from '@/locales/fa.json';
import { tariffSaveErrorKey } from '@/components/admin/tariffSaveError';

const state = vi.hoisted(() => ({
  language: 'ru',
  code: 'bs_panel_unavailable',
  created: [] as Record<string, unknown>[],
}));
const dictionaries = { ru, en, zh, fa };
function translate(key: string) {
  const dictionary = dictionaries[state.language as keyof typeof dictionaries];
  return key
    .split('.')
    .reduce<unknown>(
      (value, part) => (value as Record<string, unknown>)?.[part],
      dictionary,
    ) as string;
}
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: translate,
    i18n: { language: state.language, changeLanguage: async () => {} },
  }),
  Trans: ({ children }: { children: unknown }) => children,
  initReactI18next: { type: '3rdParty', init: () => {} },
}));
vi.mock('@/api/tariffs', () => ({
  tariffsApi: {
    getAvailableServers: async () => [
      {
        id: 1,
        squad_uuid: 'masked-1',
        display_name: 'Synthetic BS',
        country_code: null,
        is_selected: false,
      },
    ],
    getAvailableExternalSquads: async () => [],
    getAvailablePromoGroups: async () => [],
    getTariff: async () => null,
    createTariff: async (payload: Record<string, unknown>) => {
      if (!state.code) {
        state.created.push(payload);
        return {};
      }
      throw { response: { data: { detail: state.code } } };
    },
  },
}));
import AdminTariffCreate from './AdminTariffCreate';

afterEach(cleanup);
const codes = [
  'bs_topology_invalid',
  'bs_usage_config_invalid',
  'bs_panel_unavailable',
  'bs_binding_mismatch',
  'bs_uncertain_policy_required',
];
it.each(codes)('only translates the closed operator code %s', (code) => {
  const key = tariffSaveErrorKey({ response: { data: { detail: code } } });
  expect(key).toBe(tariffSaveErrorKey({ response: { data: { detail: { code } } } }));
  for (const language of Object.keys(dictionaries)) {
    state.language = language;
    expect(translate(key)).toBeTruthy();
    expect(translate(key)).not.toContain(code);
  }
});
it('never displays unknown server text or identifiers', () => {
  expect(tariffSaveErrorKey({ response: { data: { detail: 'private-token-identifier' } } })).toBe(
    'common.error',
  );
  expect(tariffSaveErrorKey({ response: { data: { detail: 'tariff_changed' } } })).toBe(
    'admin.tariffs.editConflict',
  );
});
it.each(['ru', 'en', 'zh', 'fa'])(
  'preserves form and announces localized failure in %s',
  async (language) => {
    state.language = language;
    state.code = 'bs_panel_unavailable';
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    render(
      <PlatformProvider>
        <QueryClientProvider client={client}>
          <MemoryRouter>
            <AdminTariffCreate />
          </MemoryRouter>
        </QueryClientProvider>
      </PlatformProvider>,
    );
    fireEvent.click(screen.getByText(translate('admin.tariffs.periodTariff')));
    fireEvent.click(await screen.findByText(translate('admin.tariffs.tabPeriods')));
    fireEvent.click(screen.getByText(translate('admin.tariffs.addButton')));
    fireEvent.click(screen.getByText(translate('admin.tariffs.tabBasic')));
    const name = document.getElementById('tariff-name') as HTMLInputElement;
    fireEvent.change(name, { target: { value: 'Synthetic tariff' } });
    fireEvent.click(screen.getByText(translate('admin.tariffs.saveButton')));
    expect((await screen.findByRole('alert')).textContent).toContain(
      translate('admin.tariffs.bs.errors.unavailable'),
    );
    expect(name.value).toBe('Synthetic tariff');
    expect(
      (screen.getByText(translate('admin.tariffs.saveButton')) as HTMLButtonElement).disabled,
    ).toBe(false);
  },
);

it.each(['ru', 'en', 'zh', 'fa'])(
  'abandons an incomplete new BS draft in %s with persistent guidance',
  async (language) => {
    state.language = language;
    state.code = '';
    state.created = [];
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    render(
      <PlatformProvider>
        <QueryClientProvider client={client}>
          <MemoryRouter>
            <AdminTariffCreate />
          </MemoryRouter>
        </QueryClientProvider>
      </PlatformProvider>,
    );
    fireEvent.click(screen.getByText(translate('admin.tariffs.periodTariff')));
    fireEvent.click(await screen.findByText(translate('admin.tariffs.tabPeriods')));
    fireEvent.click(screen.getByText(translate('admin.tariffs.addButton')));
    fireEvent.click(screen.getByText(translate('admin.tariffs.tabBasic')));
    fireEvent.change(document.getElementById('tariff-name') as HTMLInputElement, {
      target: { value: 'Synthetic tariff' },
    });
    fireEvent.click(screen.getByText(translate('admin.tariffs.tabExtra')));
    const toggle = screen.getByLabelText(translate('admin.tariffs.bs.configure'));
    expect(screen.getByText(translate('admin.tariffs.bs.salesNote'))).toBeTruthy();
    expect(screen.getByText(translate('admin.tariffs.bs.applicationNote'))).toBeTruthy();
    fireEvent.click(toggle);
    fireEvent.click(await screen.findByLabelText('Synthetic BS'));
    fireEvent.change(screen.getByLabelText(translate('admin.tariffs.bs.limit')), {
      target: { value: '' },
    });
    const button = screen.getByText(translate('admin.tariffs.saveButton')) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fireEvent.click(toggle);
    expect(screen.getByText(translate('admin.tariffs.bs.salesNote'))).toBeTruthy();
    expect(button.disabled).toBe(false);
    fireEvent.click(button);
    await waitFor(() => expect(state.created).toHaveLength(1));
    expect(state.created[0].bs_traffic_settings).toBeNull();
  },
);

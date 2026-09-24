// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { AxiosError } from 'axios';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { Pop } from '@/api/dpichecker';
import { usePermissionStore } from '@/store/permissions';
import { CheckForm } from './CheckForm';
import { renderWithProviders } from './testUtils';

/**
 * Форма как на dpichecker.st: вставил → «Продолжить» → появились точки → цена у сервиса → оплата
 * с подтверждением суммы. Двойной клик не запускает дважды; отказ сервиса — словами, форма цела;
 * «По расписанию» создаёт монитор.
 */

vi.mock('react-i18next', async () => (await import('./testUtils')).i18nMock());

const POPS: Pop[] = [
  { id: 1, location: 'russia', region: 'Москва', operator: null, is_healthy: true },
  { id: 2, location: 'russia', region: 'Москва', operator: 'MTS', is_healthy: true },
  { id: 3, location: 'russia', region: 'Амурская обл.', operator: null, is_healthy: false },
];

const api = vi.hoisted(() => ({
  reference: { short_uuid: 'Ab12Cd34Ef56Gh78', configs: 2, error: null } as unknown,
  parse: vi.fn(),
  estimate: vi.fn(),
  launchCheck: vi.fn(),
  createMonitor: vi.fn(),
}));

vi.mock('@/api/dpichecker', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/api/dpichecker')>();
  return {
    ...original,
    dpicheckerApi: {
      getPops: vi.fn(async () => ({ pops: POPS, groups: { districts: [], republics: [] } })),
      getOptimal: vi.fn(async () => [1, 3]),
      getStatus: vi.fn(async () => ({
        enabled: true,
        configured: true,
        balance: 5,
        noisy: null,
        monitors: null,
        webhook_ready: true,
        error: null,
        total_spent: 0,
        reference: api.reference,
      })),
      panelTargets: vi.fn(async () => []),
      parse: api.parse,
      estimate: api.estimate,
      launchCheck: api.launchCheck,
      createMonitor: api.createMonitor,
    },
  };
});

const navigate = vi.fn();
vi.mock('react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router')>()),
  useNavigate: () => navigate,
}));

beforeEach(() => {
  usePermissionStore.setState({ permissions: ['dpichecker:*'], isLoaded: true });
  api.parse.mockResolvedValue({ valid: ['google.com'], invalid_count: 1 });
  api.estimate.mockResolvedValue({
    estimated_cost: 0.04,
    pops: 1,
    resources: 1,
    pop_price: 0.003,
    resource_price: 0.001,
    balance: 5,
    affordable: true,
    hysteria2_keys: 0,
    estimated_max_minutes: 7,
  });
  api.launchCheck.mockImplementation(
    () => new Promise((resolve) => setTimeout(() => resolve({ id: 11 }), 20)),
  );
  api.createMonitor.mockResolvedValue({ id: 12 });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  api.reference = { short_uuid: 'Ab12Cd34Ef56Gh78', configs: 2, error: null };
});

async function pasteAndPick() {
  renderWithProviders(<CheckForm checkType="ip" />);
  fireEvent.change(screen.getByRole('textbox', { name: /Что проверяем/ }), {
    target: { value: 'google.com\nbad' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Продолжить' }));
  expect(await screen.findByText(/Принято: 1/)).toBeTruthy();
  expect(screen.getByText(/невалидных: 1/)).toBeTruthy();
  const optimal = await screen.findByRole('button', { name: /Оптимальный выбор/ });
  await waitFor(() => expect((optimal as HTMLButtonElement).disabled).toBe(false));
  fireEvent.click(optimal);
  await waitFor(() => expect(api.estimate).toHaveBeenCalled());
}

it('цена считается сервисом по рабочим точкам', async () => {
  await pasteAndPick();
  await waitFor(() =>
    expect(api.estimate).toHaveBeenLastCalledWith({
      check_type: 'ip',
      location: 'russia',
      pop_ids: [1],
      resources: ['google.com'],
    }),
  );
  expect(await screen.findByText(/0\.0400 USD/)).toBeTruthy();
});

it('двойной клик по «Оплатить» — один запуск, потом переход к результату', async () => {
  await pasteAndPick();
  const pay = await screen.findByRole('button', { name: /Оплатить/ });
  fireEvent.click(pay);
  const confirm = await screen.findByRole('button', { name: /Списать 0\.0400 USD/ });
  fireEvent.click(confirm);
  fireEvent.click(confirm);
  await waitFor(() => expect(navigate).toHaveBeenCalledWith('/admin/dpichecker?tab=ip&check=11'));
  expect(api.launchCheck).toHaveBeenCalledTimes(1);
  expect(api.launchCheck.mock.calls[0][0]).toMatchObject({
    check_type: 'ip',
    pop_ids: [1],
    probe_mode: 'auto',
    targets: [{ value: 'google.com', name: 'google.com' }],
  });
});

it('отказ сервиса — словами, форма не сброшена', async () => {
  const refusal = new AxiosError('402');
  refusal.response = {
    status: 402,
    data: { detail: 'Не хватает денег на балансе DPI//CHECKER' },
  } as never;
  api.launchCheck.mockRejectedValue(refusal);
  await pasteAndPick();
  fireEvent.click(await screen.findByRole('button', { name: /Оплатить/ }));
  fireEvent.click(await screen.findByRole('button', { name: /Списать/ }));
  expect(await screen.findByText(/Не хватает денег/)).toBeTruthy();
  expect(screen.getByText(/Принято: 1/)).toBeTruthy();
});

it('«По расписанию» создаёт монитор с интервалом', async () => {
  await pasteAndPick();
  fireEvent.click(screen.getByRole('radio', { name: /По расписанию/ }));
  fireEvent.click(await screen.findByRole('button', { name: /Создать монитор/ }));
  fireEvent.click(await screen.findByRole('button', { name: /Создать монитор ·/ }));
  await waitFor(() => expect(api.createMonitor).toHaveBeenCalledTimes(1));
  expect(api.createMonitor.mock.calls[0][0]).toMatchObject({
    interval_hours: 6,
    alert_after_fails: 2,
    notify_on_success: false,
  });
});

it('переход с карточки ноды сразу подставляет эту ноду', async () => {
  const { dpicheckerApi } = await import('@/api/dpichecker');
  vi.mocked(dpicheckerApi.panelTargets).mockResolvedValue([
    { value: 'nl.example', name: 'NL-1', ref: 'n1' },
    { value: 'de.example', name: 'DE-1', ref: 'n2' },
  ]);
  renderWithProviders(<CheckForm checkType="ip" prefill={{ kind: 'nodes', ref: 'n1' }} />);
  await waitFor(() =>
    expect(dpicheckerApi.panelTargets).toHaveBeenCalledWith({ kind: 'nodes', uuids: [] }),
  );
  expect(await screen.findByText(/Принято: 1/)).toBeTruthy();
  expect(screen.getByRole('button', { name: /NL-1/ }).getAttribute('aria-pressed')).toBe('true');
  expect(screen.getByRole('button', { name: /DE-1/ }).getAttribute('aria-pressed')).toBe('false');
});

it('VPN «Из панели» — как у BSCHEKER: ключи подписки по умолчанию сразу, без кнопки', async () => {
  const { dpicheckerApi } = await import('@/api/dpichecker');
  vi.mocked(dpicheckerApi.panelTargets).mockResolvedValue([
    { value: 'vless://a@fi.example:443', name: '🇫🇮 Finland', ref: 'Ab12Cd34Ef56Gh78' },
    { value: 'vless://b@de.example:443', name: '🇩🇪 Germany', ref: 'Ab12Cd34Ef56Gh78' },
  ]);
  renderWithProviders(<CheckForm checkType="vpn" />);
  fireEvent.click(screen.getByRole('button', { name: 'Из панели' }));
  expect(await screen.findByRole('button', { name: /подписка по умолчанию/ })).toBeTruthy();
  await waitFor(() =>
    expect(dpicheckerApi.panelTargets).toHaveBeenCalledWith({ kind: 'subscription' }),
  );
  expect(await screen.findByText(/Принято: 2/)).toBeTruthy();
  expect(screen.getByRole('button', { name: /Finland/ }).getAttribute('aria-pressed')).toBe('true');
  expect(screen.queryByRole('button', { name: /Взять ключи/ })).toBeNull();
});

it('подписки по умолчанию нет — объяснение и путь в настройки DPI//CHECKER', async () => {
  api.reference = { short_uuid: null, configs: 0, error: 'Подписка по умолчанию не задана' };
  const { dpicheckerApi } = await import('@/api/dpichecker');
  renderWithProviders(<CheckForm checkType="vpn" />);
  fireEvent.click(screen.getByRole('button', { name: 'Из панели' }));
  expect(await screen.findByText('Подписка по умолчанию не задана')).toBeTruthy();
  const link = screen.getByRole('link', { name: /Открыть настройки/ });
  expect(link.getAttribute('href')).toBe('/admin/settings?section=sys_dpichecker');
  expect(dpicheckerApi.panelTargets).not.toHaveBeenCalled();
});

it('переход из подписки пользователя — его ключи, а не подписка по умолчанию', async () => {
  const { dpicheckerApi } = await import('@/api/dpichecker');
  vi.mocked(dpicheckerApi.panelTargets).mockResolvedValue([
    { value: 'vless://a@fi.example:443', name: 'FI', ref: 'su-5' },
  ]);
  renderWithProviders(<CheckForm checkType="vpn" prefill={{ kind: 'subscription', ref: '5' }} />);
  await waitFor(() =>
    expect(dpicheckerApi.panelTargets).toHaveBeenCalledWith({ kind: 'subscription', user_id: 5 }),
  );
  expect(await screen.findByText('пользователь #5')).toBeTruthy();
  expect(dpicheckerApi.panelTargets).toHaveBeenCalledTimes(1);
});

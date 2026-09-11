// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * Премиум-трафик в карточке пользователя у админа.
 *
 * Здесь админ возвращает доступ клиенту, которого сняли за перерасход:
 * начисляет гигабайты или начинает премиум-период заново. И здесь же выбирает,
 * какой трафик сбрасывать, — обычный сброс не должен задевать премиум, а
 * премиум — общий трафик.
 */

vi.mock('react-i18next', async () => (await import('../reachability/testUtils')).i18nMock());

const getStates = vi.fn();
const reset = vi.fn();
const grant = vi.fn();

vi.mock('../../../api/adminPremiumTraffic', () => ({
  adminPremiumTrafficApi: {
    getStates: (...args: unknown[]) => getStates(...args),
    reset: (...args: unknown[]) => reset(...args),
    grant: (...args: unknown[]) => grant(...args),
  },
}));

import type { AdminPremiumTrafficState } from '../../../api/adminPremiumTraffic';
import { installMatchMedia, renderWithProviders } from '../reachability/testUtils';
import { PremiumTrafficAdmin } from './PremiumTrafficAdmin';

installMatchMedia();
afterEach(() => {
  cleanup();
  getStates.mockReset();
  reset.mockReset();
  grant.mockReset();
});

const SQUAD = 'c0b8db48-31dc-423b-9778-e6682fbd6d06';
const NAME = 'Мобильный LTE резерв #1';

function state(overrides: Partial<AdminPremiumTrafficState> = {}): AdminPremiumTrafficState {
  return {
    squad_uuid: SQUAD,
    name: NAME,
    limit_gb: 5,
    extra_gb: 0,
    used_gb: 5.24,
    remaining_gb: 0,
    is_limited: true,
    period_start_at: '2026-09-01T10:00:00Z',
    last_checked_at: '2026-09-11T08:09:19Z',
    has_state: true,
    ...overrides,
  };
}

function renderBlock(props: { canManage?: boolean; onRegularReset?: () => void } = {}) {
  return renderWithProviders(
    <PremiumTrafficAdmin
      subscriptionId={15}
      canManage={props.canManage ?? true}
      formatDate={(date) => date ?? ''}
      onRegularReset={props.onRegularReset}
    />,
  );
}

function resetButtons() {
  return screen.getAllByRole('button', { name: 'Сбросить' });
}

describe('PremiumTrafficAdmin', () => {
  it('ничего не рисует, если в тарифе нет премиум-серверов', async () => {
    getStates.mockResolvedValue([]);
    renderBlock();

    await waitFor(() => expect(getStates).toHaveBeenCalledWith(15));
    expect(screen.queryByText('Премиум-трафик')).toBeNull();
  });

  it('показывает расход по серверу и отметку «снят»', async () => {
    getStates.mockResolvedValue([state()]);
    renderBlock();

    expect(await screen.findByText(NAME)).toBeTruthy();
    expect(screen.getByText('5.24 / 5 ГБ')).toBeTruthy();
    expect(screen.getByText('снят')).toBeTruthy();
  });

  it('помечает сервер, до которого воркер ещё не дошёл', async () => {
    getStates.mockResolvedValue([
      state({ has_state: false, is_limited: false, used_gb: 0, period_start_at: null }),
    ]);
    renderBlock();

    expect(await screen.findByText('ещё не замерен')).toBeTruthy();
  });

  it('без права управления — только просмотр', async () => {
    getStates.mockResolvedValue([state()]);
    renderBlock({ canManage: false });

    await screen.findByText(NAME);
    expect(screen.queryByRole('button', { name: 'Начислить' })).toBeNull();
    expect(screen.queryByText('Сбросить трафик')).toBeNull();
  });

  it('начисляет гигабайты и предупреждает, когда сервер вернётся', async () => {
    getStates.mockResolvedValue([state()]);
    grant.mockResolvedValue({
      success: true,
      squad_uuid: SQUAD,
      gb: 3,
      extra_gb: 3,
      squad_restored: true,
    });
    renderBlock();

    const input = await screen.findByLabelText(`Сколько гигабайтов начислить на ${NAME}`);
    fireEvent.change(input, { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Начислить' }));

    await waitFor(() => expect(grant).toHaveBeenCalledWith(15, SQUAD, 3));
    expect(await screen.findByText(/вернётся клиенту на ближайшем проходе/)).toBeTruthy();
  });

  it('не даёт начислить пустое, ноль или не число', async () => {
    getStates.mockResolvedValue([state()]);
    renderBlock();

    const input = await screen.findByLabelText(`Сколько гигабайтов начислить на ${NAME}`);
    const button = screen.getByRole('button', { name: 'Начислить' }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);

    fireEvent.change(input, { target: { value: 'abc' } });
    expect(button.disabled).toBe(true);

    fireEvent.change(input, { target: { value: '0' } });
    expect(button.disabled).toBe(true);
  });

  it('сброс сервера срабатывает только со второго нажатия', async () => {
    getStates.mockResolvedValue([state()]);
    reset.mockResolvedValue({ scope: 'premium', regular_reset: false, premium_squads: [SQUAD] });
    renderBlock();

    await screen.findByText(NAME);
    const squadReset = resetButtons()[0];
    fireEvent.click(squadReset);
    expect(reset).not.toHaveBeenCalled();

    fireEvent.click(squadReset);
    await waitFor(() => expect(reset).toHaveBeenCalledWith(15, 'premium', SQUAD));
    expect(await screen.findByText(/Премиум-период начат заново/)).toBeTruthy();
    expect(screen.getByText(/вернётся клиенту/)).toBeTruthy();
  });

  it('обычный сброс не трогает премиум и перечитывает подписку', async () => {
    getStates.mockResolvedValue([state()]);
    reset.mockResolvedValue({ scope: 'regular', regular_reset: true, premium_squads: [] });
    const onRegularReset = vi.fn();
    renderBlock({ onRegularReset });

    await screen.findByText(NAME);
    fireEvent.change(screen.getByLabelText('Сбросить трафик'), { target: { value: 'regular' } });
    expect(screen.getByText(/Премиум-лимиты не изменятся/)).toBeTruthy();

    const buttons = resetButtons();
    const generalReset = buttons[buttons.length - 1];
    fireEvent.click(generalReset);
    fireEvent.click(generalReset);

    await waitFor(() => expect(reset).toHaveBeenCalledWith(15, 'regular', undefined));
    await waitFor(() => expect(onRegularReset).toHaveBeenCalled());
    expect(await screen.findByText('Общий трафик сброшен.')).toBeTruthy();
  });

  it('показывает ошибку, если действие не удалось', async () => {
    getStates.mockResolvedValue([state()]);
    grant.mockRejectedValue(new Error('network'));
    renderBlock();

    const input = await screen.findByLabelText(`Сколько гигабайтов начислить на ${NAME}`);
    fireEvent.change(input, { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Начислить' }));

    expect(await screen.findByText('Не удалось выполнить действие')).toBeTruthy();
  });
});

// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ruLocale from '@/locales/ru.json';
import type { ReferralTerms } from '../types';

/**
 * The user's own reward settings on /referral.
 *
 * Two things matter more than the rest: the card must not appear for parts the
 * administrator has not allowed — a control that changes nothing promises an
 * influence it does not have — and every option must show whether it is the one
 * in force, because a settings screen that hides that makes people guess.
 */

function resolveRu(key: string): string | undefined {
  const value = key
    .split('.')
    .reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], ruLocale);
  return typeof value === 'string' ? value : undefined;
}

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      (resolveRu(key) ?? key).replace(/{{(\w+)}}/g, (_m, name) => String(options?.[name] ?? '')),
    i18n: { language: 'ru', changeLanguage: () => Promise.resolve() },
  }),
  Trans: ({ children }: { children?: unknown }) => children ?? null,
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

const terms = (over: Partial<ReferralTerms> = {}): ReferralTerms =>
  ({
    is_enabled: true,
    scheme: 'levels',
    levels_mode: 'chain',
    commission_percent: 0,
    minimum_topup_kopeks: 0,
    minimum_topup_rubles: 0,
    first_topup_bonus_kopeks: 0,
    first_topup_bonus_rubles: 0,
    inviter_bonus_kopeks: 0,
    inviter_bonus_rubles: 0,
    max_commission_payments: 0,
    allow_reward_kind_choice: true,
    allow_days_target_choice: true,
    reward_preference: null,
    days_target_subscription_id: null,
    days_target_options: [
      { id: 10, tariff_name: 'Про', end_date: '2026-12-31T00:00:00+00:00' },
      { id: 11, tariff_name: null, end_date: null },
    ],
    ...over,
  }) as ReferralTerms;

afterEach(cleanup);

async function renderCard(value: ReferralTerms, onChange = vi.fn()) {
  const { RewardSettings } = await import('./Referral');
  render(<RewardSettings terms={value} onChange={onChange} />);
  return onChange;
}

describe('настройки наград пользователя', () => {
  it('не показываются, пока админ ничего не разрешил', async () => {
    await renderCard(terms({ allow_reward_kind_choice: false, allow_days_target_choice: false }));
    expect(screen.queryByText(/Настройки наград/)).toBeNull();
  });

  it('показывают только разрешённую часть', async () => {
    await renderCard(terms({ allow_days_target_choice: false }));

    expect(screen.getByText(/Что получать/)).toBeTruthy();
    expect(screen.queryByText(/Куда зачислять дни/)).toBeNull();
  });

  it('отмечают выбранный вид награды', async () => {
    await renderCard(terms({ reward_preference: 'days' }));

    const selected = screen
      .getAllByRole('button')
      .filter((b) => b.getAttribute('aria-pressed') === 'true')
      .map((b) => b.textContent);
    expect(selected.join(' ')).toContain('Дни подписки');
  });

  it('предлагают ровно два варианта — деньги или дни', async () => {
    await renderCard(terms());

    expect(screen.getByText('Деньги на баланс')).toBeTruthy();
    expect(screen.getByText('Дни подписки')).toBeTruthy();
    expect(screen.queryByText(/Всё, что даёт уровень/)).toBeNull();
  });

  it('у не выбиравшего отмечены деньги — так же, как их выдаст расчёт', async () => {
    // Показать «ничего не выбрано» значило бы разойтись с начислением: выбор
    // двоичный, и без него человек получает деньги.
    await renderCard(terms({ reward_preference: null }));

    const selected = screen
      .getAllByRole('button')
      .filter((b) => b.getAttribute('aria-pressed') === 'true')
      .map((b) => b.textContent);
    expect(selected.join(' ')).toContain('Деньги на баланс');
  });

  it('отмечают автоподбор, пока подписка не выбрана', async () => {
    // Автоподбор — тоже вариант, и без отметки непонятно, что происходит сейчас.
    await renderCard(terms({ days_target_subscription_id: null }));

    const selected = screen
      .getAllByRole('button')
      .filter((b) => b.getAttribute('aria-pressed') === 'true')
      .map((b) => b.textContent);
    expect(selected).toContain('Выбирать автоматически');
  });

  it('показывают срок рядом с названием тарифа', async () => {
    // Подписок одного тарифа может быть несколько — по названию их не различить.
    await renderCard(terms());
    expect(screen.getByText(/Про — до /)).toBeTruthy();
  });

  it('сообщают, когда выбирать не из чего', async () => {
    await renderCard(terms({ days_target_options: [] }));
    expect(screen.getByText(/нет подписок/)).toBeTruthy();
  });

  it('шлют явный признак «поле трогали» при выборе вида', async () => {
    // Без признака сервер не отличил бы присланное от «не трогали» и затёр бы
    // выбор подписки, сделанный из бота.
    const onChange = await renderCard(terms({ reward_preference: 'money' }));

    fireEvent.click(screen.getByText('Дни подписки'));

    expect(onChange).toHaveBeenCalledWith({
      reward_preference: 'days',
      set_reward_preference: true,
    });
  });

  it('шлют выбранную подписку', async () => {
    const onChange = await renderCard(terms());

    fireEvent.click(screen.getByText(/Про — до /));

    expect(onChange).toHaveBeenCalledWith({
      days_target_subscription_id: 10,
      set_days_target: true,
    });
  });

  it('шлют null при возврате к автоподбору', async () => {
    const onChange = await renderCard(terms({ days_target_subscription_id: 10 }));

    fireEvent.click(screen.getByText('Выбирать автоматически'));

    expect(onChange).toHaveBeenCalledWith({
      days_target_subscription_id: null,
      set_days_target: true,
    });
  });

  it('не дают нажимать, пока запрос в полёте', async () => {
    const { RewardSettings } = await import('./Referral');
    const onChange = vi.fn();
    render(<RewardSettings terms={terms()} onChange={onChange} pending />);

    const button = screen.getByText('Деньги на баланс').closest('button') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });
});

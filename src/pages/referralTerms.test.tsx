// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ruLocale from '@/locales/ru.json';
import type { ReferralProgramLevel, ReferralTerms } from '../types';

/**
 * The programme-terms card on /referral.
 *
 * Two modes read as opposites and the card must say which one is in force:
 * under `chain` the listed levels pay AT THE SAME TIME, under `tiers` exactly one
 * does. The same list without that sentence is a list of rewards a partner adds
 * up in their head — and then wonders why the payout is smaller.
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

const level = (over: Partial<ReferralProgramLevel> = {}): ReferralProgramLevel => ({
  level: 1,
  is_current: false,
  rewards: ['25% от суммы'],
  pays_referrer: true,
  trigger: 'every_topup',
  trigger_label: 'с каждого пополнения',
  required_referrals: 0,
  required_referrals_active_only: true,
  referee_reward: null,
  ...over,
});

const terms = (over: Partial<ReferralTerms> = {}): ReferralTerms =>
  ({
    is_enabled: true,
    scheme: 'levels',
    levels_mode: 'tiers',
    commission_percent: 0,
    minimum_topup_kopeks: 0,
    minimum_topup_rubles: 0,
    first_topup_bonus_kopeks: 0,
    first_topup_bonus_rubles: 0,
    inviter_bonus_kopeks: 0,
    inviter_bonus_rubles: 0,
    max_commission_payments: 0,
    levels: [level()],
    ...over,
  }) as ReferralTerms;

afterEach(cleanup);

async function renderTerms(value: ReferralTerms) {
  const { ProgrammeTerms } = await import('./Referral');
  render(<ProgrammeTerms terms={value} />);
}

describe('карточка условий программы', () => {
  it('объясняет правило режима «за приглашённых»', async () => {
    await renderTerms(terms({ levels_mode: 'tiers' }));
    expect(screen.getByText(/Действует один уровень/)).toBeTruthy();
  });

  it('объясняет правило режима «по цепочке»', async () => {
    await renderTerms(terms({ levels_mode: 'chain' }));
    expect(screen.getByText(/несколько уровней сразу/)).toBeTruthy();
  });

  it('отмечает уровень пользователя', async () => {
    await renderTerms(
      terms({ levels: [level({ level: 1 }), level({ level: 2, is_current: true })] }),
    );
    expect(screen.getByText('ваш уровень')).toBeTruthy();
  });

  it('показывает условие открытия уровня', async () => {
    await renderTerms(
      terms({
        levels: [level({ level: 2, required_referrals: 10, required_referrals_active_only: true })],
      }),
    );
    expect(screen.getByText(/от 10 приглашённых с пополнением/)).toBeTruthy();
  });

  it('стартовый уровень подписан как доступный сразу', async () => {
    await renderTerms(terms({ levels: [level({ required_referrals: 0 })] }));
    expect(screen.getByText(/доступен сразу/)).toBeTruthy();
  });

  it('говорит прямо, когда уровень не начисляет пригласившему', async () => {
    // Такой уровень показывается только если он СВОЙ, и молчание про него
    // читалось бы как «мой уровень не существует», хотя он и обнулил доход.
    await renderTerms(
      terms({ levels: [level({ is_current: true, pays_referrer: false, rewards: [] })] }),
    );
    expect(screen.getByText('вам не начисляется')).toBeTruthy();
  });

  it('называет бонус приглашённого отдельно от награды партнёра', async () => {
    await renderTerms(terms({ levels: [level({ referee_reward: '50 ₽' })] }));
    expect(screen.getByText(/приглашённому: 50 ₽/)).toBeTruthy();
  });

  it('называет индивидуальную ставку, если она перебивает процент уровня', async () => {
    await renderTerms(terms({ personal_percent: 40 }));
    expect(screen.getByText(/индивидуальная ставка 40%/)).toBeTruthy();
  });

  it('не показывает оговорку про ставку, когда её нет', async () => {
    await renderTerms(terms({ personal_percent: null }));
    expect(screen.queryByText(/индивидуальная ставка/)).toBeNull();
  });

  it('откатывается на строки-описания, если сервер ещё не отдаёт разбор', async () => {
    // Старый бэкенд не знает поля levels; экран обязан остаться читаемым.
    await renderTerms(terms({ levels: [], level_descriptions: ['Уровень 1: 25% от суммы'] }));
    expect(screen.getByText('Уровень 1: 25% от суммы')).toBeTruthy();
  });

  it('сообщает, когда уровни не настроены вовсе', async () => {
    await renderTerms(terms({ levels: [], level_descriptions: [] }));
    expect(screen.getByText(/ещё не настроены/)).toBeTruthy();
  });
});

import { describe, expect, it, vi } from 'vitest';
import { adminErrorText } from './adminErrors';

const t = (key: string, options?: Record<string, unknown>) =>
  options ? `${key} ${JSON.stringify(options)}` : key;
const money = (kopeks: number) => `${kopeks / 100} ₽`;

/**
 * Английские ответы ручек бота не попадают админу на экран: известные — словами,
 * русские — как есть, незнакомые — общей фразой.
 */
describe('adminErrorText', () => {
  it('нехватка баланса — суммы в рублях, а не копейки', () => {
    expect(adminErrorText('Insufficient balance. Current: 5000, requested: 10000', t, money)).toBe(
      'admin.users.errors.insufficientBalance {"current":"50 ₽","requested":"100 ₽"}',
    );
  });

  it('частые отказы переводятся', () => {
    expect(adminErrorText('User cannot be their own referrer', t, money)).toBe(
      'admin.users.errors.selfReferrer',
    );
    expect(
      adminErrorText(
        'User already has an active subscription for this tariff. Extend it instead.',
        t,
        money,
      ),
    ).toBe('admin.users.errors.tariffTaken');
    expect(adminErrorText('User not found in panel', t, money)).toBe(
      'admin.users.errors.notInPanel',
    );
    expect(adminErrorText('User not found', t, money)).toBe('admin.users.errors.userNotFound');
  });

  it('русский текст бота — как есть', () => {
    expect(adminErrorText('Ошибка удаления устройства', t, money)).toBe(
      'Ошибка удаления устройства',
    );
  });

  it('незнакомый английский и пустой ответ — общая фраза', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(adminErrorText('Something exploded: stack', t, money)).toBe(
      'admin.users.errors.generic',
    );
    expect(adminErrorText('', t, money)).toBe('admin.users.errors.generic');
    expect(adminErrorText(null, t, money)).toBe('admin.users.errors.generic');
    warn.mockRestore();
  });
});

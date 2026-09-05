import { describe, expect, it } from 'vitest';
import type { GiftPurchaseStatus, SentGift } from '../api/gift';
import type { PurchaseStatus } from '../api/landings';
import { buildGiftClaimArtifacts, type GiftClaimSource } from './giftShare';

/**
 * Ссылка на подарок из кабинета обязана открываться в боте.
 *
 * Раньше карточка строила код и обе ссылки из `gift.token.slice(0, 12)`, а бот
 * отвергает любой claim-вход короче 48 символов — то есть кнопка «поделиться»
 * выдавала получателю deep link, который бот отказывался открывать. Канонический
 * код бэкенд отдаёт сам: GIFT_ + 59 символов, ровно предел start_param у Telegram.
 */

const TOKEN = 'T'.repeat(64);
const CANONICAL_CODE = `GIFT_${'T'.repeat(59)}`;

const canonicalGift: SentGift = {
  token: TOKEN.slice(0, 12),
  tariff_name: 'Premium',
  period_days: 30,
  device_limit: 5,
  status: 'delivered',
  gift_recipient_value: null,
  gift_message: 'Happy Birthday!',
  activated_by_username: null,
  created_at: '2026-08-26T12:00:00Z',
  gift_code: CANONICAL_CODE,
  bot_claim_url: `https://t.me/ExampleBot?start=${CANONICAL_CODE}`,
  cabinet_claim_url: `https://cab.example/buy/gift/${TOKEN}`,
};

const context = { botUsername: 'ExampleBot', origin: 'https://cab.example' };

describe('buildGiftClaimArtifacts', () => {
  it('берёт канонические ссылки из API, а не режет токен', () => {
    const artifacts = buildGiftClaimArtifacts(canonicalGift, context);

    expect(artifacts.code).toBe(CANONICAL_CODE);
    expect(artifacts.botLink).toBe(canonicalGift.bot_claim_url);
    expect(artifacts.cabinetLink).toBe(canonicalGift.cabinet_claim_url);
  });

  it('отдаёт боту фрагмент длиннее порога в 48 символов', () => {
    const artifacts = buildGiftClaimArtifacts(canonicalGift, context);
    const startParam = artifacts.botLink?.split('?start=')[1] ?? '';

    expect(startParam.startsWith('GIFT_')).toBe(true);
    expect(startParam.length).toBeLessThanOrEqual(64);
    expect(startParam.slice('GIFT_'.length).length).toBeGreaterThanOrEqual(48);
  });

  it('сохраняет канонический bot_claim_url, даже если botUsername пустой', () => {
    const artifacts = buildGiftClaimArtifacts(canonicalGift, { ...context, botUsername: '' });

    expect(artifacts.botLink).toBe(canonicalGift.bot_claim_url);
  });

  it('принимает объект SentGift напрямую', () => {
    const sentGift: SentGift = {
      token: '1234567890ab',
      tariff_name: 'Test Tariff',
      period_days: 30,
      device_limit: 3,
      status: 'paid',
      gift_recipient_value: null,
      gift_message: null,
      activated_by_username: null,
      created_at: null,
      gift_code: 'GIFT_custom_canonical_code',
      bot_claim_url: 'https://t.me/CustomBot?start=GIFT_custom_canonical_code',
      cabinet_claim_url: 'https://custom.cab/claim/123',
    };

    const artifacts = buildGiftClaimArtifacts(sentGift, context);

    expect(artifacts.code).toBe('GIFT_custom_canonical_code');
    expect(artifacts.botLink).toBe('https://t.me/CustomBot?start=GIFT_custom_canonical_code');
    expect(artifacts.cabinetLink).toBe('https://custom.cab/claim/123');
  });

  it('принимает объект, собранный из GiftPurchaseStatus', () => {
    const status: GiftPurchaseStatus = {
      status: 'delivered',
      is_gift: true,
      is_code_only: true,
      is_claimable: true,
      purchase_token: TOKEN.slice(0, 12),
      recipient_contact_value: null,
      gift_message: null,
      tariff_name: 'VIP',
      period_days: 90,
      warning: null,
      gift_code: CANONICAL_CODE,
      bot_claim_url: `https://t.me/ExampleBot?start=${CANONICAL_CODE}`,
      cabinet_claim_url: `https://cab.example/buy/gift/${TOKEN}`,
    };

    const source: GiftClaimSource = {
      token: status.purchase_token ?? '',
      gift_code: status.gift_code,
      bot_claim_url: status.bot_claim_url,
      cabinet_claim_url: status.cabinet_claim_url,
    };

    const artifacts = buildGiftClaimArtifacts(source, context);

    expect(artifacts.code).toBe(CANONICAL_CODE);
    expect(artifacts.botLink).toBe(status.bot_claim_url);
    expect(artifacts.cabinetLink).toBe(status.cabinet_claim_url);
  });

  it('принимает объект, собранный из PurchaseStatus', () => {
    const landingStatus: PurchaseStatus = {
      status: 'delivered',
      subscription_url: null,
      subscription_crypto_link: null,
      is_gift: true,
      contact_value: null,
      recipient_contact_value: null,
      period_days: 30,
      tariff_name: 'Basic',
      gift_message: null,
      contact_type: null,
      cabinet_email: null,
      cabinet_password: null,
      auto_login_token: null,
      recipient_in_bot: null,
      bot_link: null,
      is_claimable: true,
      claim_url: null,
      bot_claim_link: null,
      gift_code: CANONICAL_CODE,
      bot_claim_url: `https://t.me/ExampleBot?start=${CANONICAL_CODE}`,
      cabinet_claim_url: `https://cab.example/buy/gift/${TOKEN}`,
    };

    const source: GiftClaimSource = {
      token: TOKEN.slice(0, 12),
      gift_code: landingStatus.gift_code,
      bot_claim_url: landingStatus.bot_claim_url,
      cabinet_claim_url: landingStatus.cabinet_claim_url,
    };

    const artifacts = buildGiftClaimArtifacts(source, context);

    expect(artifacts.code).toBe(CANONICAL_CODE);
    expect(artifacts.botLink).toBe(landingStatus.bot_claim_url);
    expect(artifacts.cabinetLink).toBe(landingStatus.cabinet_claim_url);
  });

  it('падает обратно на короткий код, когда бэкенд ещё не отдаёт канонический (null)', () => {
    const legacy: GiftClaimSource = {
      token: TOKEN.slice(0, 12),
      gift_code: null,
      bot_claim_url: null,
      cabinet_claim_url: null,
    };

    const artifacts = buildGiftClaimArtifacts(legacy, context);

    expect(artifacts.code).toBe(`GIFT-${TOKEN.slice(0, 12)}`);
    expect(artifacts.botLink).toBe(`https://t.me/ExampleBot?start=GIFT_${TOKEN.slice(0, 12)}`);
    expect(artifacts.cabinetLink).toBe(
      `https://cab.example/gift?tab=activate&code=${TOKEN.slice(0, 12)}`,
    );
  });

  it('падает обратно на короткий код, когда поля undefined', () => {
    const legacy: GiftClaimSource = {
      token: TOKEN.slice(0, 12),
    };

    const artifacts = buildGiftClaimArtifacts(legacy, context);

    expect(artifacts.code).toBe(`GIFT-${TOKEN.slice(0, 12)}`);
    expect(artifacts.botLink).toBe(`https://t.me/ExampleBot?start=GIFT_${TOKEN.slice(0, 12)}`);
    expect(artifacts.cabinetLink).toBe(
      `https://cab.example/gift?tab=activate&code=${TOKEN.slice(0, 12)}`,
    );
  });

  it('не выдумывает ссылку на бота, когда username неизвестен и bot_claim_url отсутствует', () => {
    const legacy: GiftClaimSource = {
      token: TOKEN.slice(0, 12),
      gift_code: null,
      bot_claim_url: null,
      cabinet_claim_url: null,
    };

    expect(buildGiftClaimArtifacts(legacy, { ...context, botUsername: '' }).botLink).toBeNull();
  });

  it('не выдумывает ссылку на бота, когда username неизвестен, даже если gift_code присутствует', () => {
    const sourceWithCode: GiftClaimSource = {
      token: TOKEN.slice(0, 12),
      gift_code: CANONICAL_CODE,
      bot_claim_url: null,
      cabinet_claim_url: null,
    };

    expect(
      buildGiftClaimArtifacts(sourceWithCode, { ...context, botUsername: '' }).botLink,
    ).toBeNull();
  });

  it('корректно кодирует параметры URL для fallback ссылок', () => {
    const specialTokenSource: GiftClaimSource = {
      token: 'abc+def/ghi=jkl',
      gift_code: null,
      bot_claim_url: null,
      cabinet_claim_url: null,
    };

    const short = specialTokenSource.token.slice(0, 12);
    const artifacts = buildGiftClaimArtifacts(specialTokenSource, context);

    expect(artifacts.cabinetLink).toBe(
      `https://cab.example/gift?tab=activate&code=${encodeURIComponent(short)}`,
    );
  });

  it('восстанавливает Telegram-ссылку из gift_code, когда bot_claim_url отсутствует (null)', () => {
    const partial: GiftClaimSource = {
      token: TOKEN.slice(0, 12),
      gift_code: CANONICAL_CODE,
      bot_claim_url: null,
      cabinet_claim_url: null,
    };

    const artifacts = buildGiftClaimArtifacts(partial, context);

    expect(artifacts.code).toBe(CANONICAL_CODE);
    expect(artifacts.botLink).toBe(`https://t.me/ExampleBot?start=${CANONICAL_CODE}`);
    expect(artifacts.cabinetLink).toBe(
      `https://cab.example/gift?tab=activate&code=${TOKEN.slice(0, 12)}`,
    );
  });

  it('корректно обрабатывает canonical code с символами "-" и "_"', () => {
    const customCode = 'GIFT_code-with_hyphens-and_underscores-1234567890';
    const source: GiftClaimSource = {
      token: TOKEN.slice(0, 12),
      gift_code: customCode,
      bot_claim_url: null,
      cabinet_claim_url: null,
    };

    const artifacts = buildGiftClaimArtifacts(source, context);

    expect(artifacts.code).toBe(customCode);
    expect(artifacts.botLink).toBe(`https://t.me/ExampleBot?start=${customCode}`);
  });

  it('не преобразует canonical code в short token и не добавляет лишний префикс GIFT_', () => {
    const fullCanonical = 'GIFT_ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890abcdefghijklmnopqrstuv';
    const source: GiftClaimSource = {
      token: 'legacy_short_token_123',
      gift_code: fullCanonical,
      bot_claim_url: null,
    };

    const artifacts = buildGiftClaimArtifacts(source, context);

    expect(artifacts.code).toBe(fullCanonical);
    expect(artifacts.botLink).toBe(`https://t.me/ExampleBot?start=${fullCanonical}`);
    expect(artifacts.botLink).not.toContain('legacy_short_token');
    expect(artifacts.botLink).not.toContain('GIFT_GIFT_');
    const startParam = artifacts.botLink?.split('?start=')[1];
    expect(startParam).toBe(fullCanonical);
  });
});

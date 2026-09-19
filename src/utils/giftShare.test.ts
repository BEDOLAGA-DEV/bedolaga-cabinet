import { describe, expect, it } from 'vitest';
import { buildGiftClaimArtifacts } from './giftShare';

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

const gift = {
  token: TOKEN.slice(0, 12),
  gift_code: CANONICAL_CODE,
  bot_claim_url: `https://t.me/ExampleBot?start=${CANONICAL_CODE}`,
  cabinet_claim_url: `https://cab.example/buy/gift/${TOKEN}`,
};

const context = { botUsername: 'ExampleBot', origin: 'https://cab.example' };

describe('buildGiftClaimArtifacts', () => {
  it('берёт канонические ссылки из API, а не режет токен', () => {
    const artifacts = buildGiftClaimArtifacts(gift, context);

    expect(artifacts.code).toBe(CANONICAL_CODE);
    expect(artifacts.botLink).toBe(gift.bot_claim_url);
    expect(artifacts.cabinetLink).toBe(gift.cabinet_claim_url);
  });

  it('отдаёт боту фрагмент длиннее порога в 48 символов', () => {
    const artifacts = buildGiftClaimArtifacts(gift, context);
    const startParam = artifacts.botLink?.split('?start=')[1] ?? '';

    expect(startParam.startsWith('GIFT_')).toBe(true);
    expect(startParam.length).toBeLessThanOrEqual(64);
    expect(startParam.slice('GIFT_'.length).length).toBeGreaterThanOrEqual(48);
  });

  it('падает обратно на короткий код, когда бэкенд ещё не отдаёт канонический', () => {
    const legacy = {
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

  it('не выдумывает ссылку на бота, когда username неизвестен', () => {
    const legacy = {
      token: TOKEN.slice(0, 12),
      gift_code: null,
      bot_claim_url: null,
      cabinet_claim_url: null,
    };

    expect(buildGiftClaimArtifacts(legacy, { ...context, botUsername: '' }).botLink).toBeNull();
  });
});

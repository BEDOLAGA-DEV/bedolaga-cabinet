import type { SentGift } from '../api/gift';

/**
 * Claim artifacts for a sent gift.
 *
 * The backend hands out canonical ones: the code is `GIFT_` + 59 characters, which is
 * exactly Telegram's 64-character `start_param` limit. `SentGift.token` is only a
 * 12-character display id — the bot rejects any claim input shorter than 48 characters,
 * so links built from it handed the recipient a deep link the bot refused to open.
 *
 * The token-derived values survive purely as a fallback for backends that predate the
 * canonical fields; they are still short, so prefer the API values whenever present.
 */
export interface GiftClaimArtifacts {
  code: string;
  botLink: string | null;
  cabinetLink: string;
}

export function buildGiftClaimArtifacts(
  gift: Pick<SentGift, 'token' | 'gift_code' | 'bot_claim_url' | 'cabinet_claim_url'>,
  { botUsername, origin }: { botUsername: string; origin: string },
): GiftClaimArtifacts {
  const shortCode = gift.token.slice(0, 12);

  return {
    code: gift.gift_code ?? `GIFT-${shortCode}`,
    botLink:
      gift.bot_claim_url ??
      (botUsername ? `https://t.me/${botUsername}?start=GIFT_${shortCode}` : null),
    cabinetLink:
      gift.cabinet_claim_url ?? `${origin}/gift?tab=activate&code=${encodeURIComponent(shortCode)}`,
  };
}

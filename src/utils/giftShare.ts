/**
 * Generic source object for building gift claim artifacts.
 * Compatible with SentGift, objects assembled from GiftPurchaseStatus / PurchaseStatus, or direct fields.
 */
export interface GiftClaimSource {
  token: string;
  gift_code?: string | null;
  bot_claim_url?: string | null;
  cabinet_claim_url?: string | null;
}

/**
 * Claim artifacts for a gift (sent card, post-purchase modal, landing success, etc.).
 *
 * The backend hands out canonical ones: the code is `GIFT_` + 59 characters, which is
 * exactly Telegram's 64-character `start_param` limit. `token` is only a
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
  source: GiftClaimSource,
  context: { botUsername: string; origin: string },
): GiftClaimArtifacts {
  const shortCode = source.token.slice(0, 12);

  const botLink =
    source.bot_claim_url ??
    (context.botUsername
      ? source.gift_code
        ? `https://t.me/${context.botUsername}?start=${source.gift_code}`
        : `https://t.me/${context.botUsername}?start=GIFT_${shortCode}`
      : null);

  return {
    code: source.gift_code ?? `GIFT-${shortCode}`,
    botLink,
    cabinetLink:
      source.cabinet_claim_url ??
      `${context.origin}/gift?tab=activate&code=${encodeURIComponent(shortCode)}`,
  };
}

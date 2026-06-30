import { sanitizeSurrogates } from './sanitizeSurrogates';

/**
 * App-wide guard against the "String contained an illegal UTF-16 sequence" crash.
 *
 * A lone (unpaired) UTF-16 surrogate — typically a truncated emoji in a Telegram
 * user name or a backend name/remark — crashes the URI functions on both engines
 * (V8: "URI malformed"; iOS WebKit/JavaScriptCore: "String contained an illegal
 * UTF-16 sequence"), in BOTH directions:
 *
 * - encodeURI / encodeURIComponent throw when the INPUT STRING contains a lone
 *   surrogate (truncated emoji in a subscription URL's remark, a user name fed
 *   into a link, qrcode.react's internal encodeURI, …).
 * - decodeURI / decodeURIComponent throw when the INPUT BYTES percent-encode a
 *   lone surrogate (CESU-8 style %ED%A0%BD). Telegram itself produces such
 *   sequences in tgWebAppData when the user's name contains a truncated emoji,
 *   so any decode of init-data-derived strings — ours, @telegram-apps/sdk's, or
 *   a router's — crashes the Mini App on first open.
 *
 * The base64 idiom btoa(unescape(encodeURIComponent(x))) is covered
 * transitively, since its encodeURIComponent is guarded here. (We do NOT patch
 * btoa itself: it rejects every char > U+00FF — Cyrillic, emoji, even the U+FFFD
 * replacement — with a separate "Invalid character" error that sanitising
 * surrogates cannot fix, and nothing base64-encodes raw Unicode directly.)
 *
 * Instead of wrapping every (current and future) call site, we sanitise at the
 * single chokepoint: the global codecs themselves. This is fail-safe, not
 * fail-broken:
 * - encoders: for any well-formed string the output is byte-for-byte identical;
 *   only strings that would otherwise have thrown get their lone surrogates
 *   replaced with U+FFFD (the same remedy as String.prototype.toWellFormed()).
 * - decoders: the native decoder runs first and its result is returned
 *   unchanged; only when it THROWS do we fall back to lenient WHATWG-style
 *   UTF-8 decoding with U+FFFD replacement — the exact semantics
 *   URLSearchParams already applies to the same bytes. Validation that
 *   inspects the decoded value (e.g. getSafeRedirectPath) still runs on the
 *   fallback result, so nothing gets less strict.
 *
 * Must run before any rendering or network call. Idempotent.
 */
export function installEncodingSurrogateGuard(): void {
  const flag = '__surrogateEncoderGuardInstalled';
  const g = globalThis as typeof globalThis & Record<string, unknown>;
  if (g[flag]) return;
  g[flag] = true;

  const nativeEncodeURI = globalThis.encodeURI;
  const nativeEncodeURIComponent = globalThis.encodeURIComponent;
  const nativeDecodeURI = globalThis.decodeURI;
  const nativeDecodeURIComponent = globalThis.decodeURIComponent;

  globalThis.encodeURI = (uri: string): string => nativeEncodeURI(sanitizeSurrogates(String(uri)));
  globalThis.encodeURIComponent = (uriComponent: string | number | boolean): string =>
    nativeEncodeURIComponent(sanitizeSurrogates(String(uriComponent)));
  globalThis.decodeURI = (encodedURI: string): string => {
    const input = String(encodedURI);
    try {
      return nativeDecodeURI(input);
    } catch {
      return decodePercentSequencesLeniently(input);
    }
  };
  globalThis.decodeURIComponent = (encodedURIComponent: string): string => {
    const input = String(encodedURIComponent);
    try {
      return nativeDecodeURIComponent(input);
    } catch {
      return decodePercentSequencesLeniently(input);
    }
  };
}

const HEX_PAIR = /^[0-9a-fA-F]{2}$/;

/**
 * WHATWG-style lenient percent-decoding: collect %XX bytes (malformed escapes
 * stay literal) and decode them as UTF-8 with U+FFFD replacement — the same
 * semantics URLSearchParams applies. Used ONLY after the native decoder threw,
 * so a replacement glyph in place of a broken emoji half beats taking the
 * whole app down. Unlike decodeURI, the fallback also decodes reserved
 * characters — acceptable, since the native result for that input was a crash.
 */
function decodePercentSequencesLeniently(input: string): string {
  const bytes: number[] = [];
  const encoder = new TextEncoder();
  let i = 0;
  while (i < input.length) {
    if (input[i] === '%' && HEX_PAIR.test(input.slice(i + 1, i + 3))) {
      bytes.push(parseInt(input.slice(i + 1, i + 3), 16));
      i += 3;
      continue;
    }
    // Consume the run of literal characters up to the next valid %XX escape.
    let end = i;
    while (
      end < input.length &&
      !(input[end] === '%' && HEX_PAIR.test(input.slice(end + 1, end + 3)))
    ) {
      end += 1;
    }
    for (const byte of encoder.encode(input.slice(i, end))) {
      bytes.push(byte);
    }
    i = end;
  }
  return new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(bytes));
}

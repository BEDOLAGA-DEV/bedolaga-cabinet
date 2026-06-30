/**
 * Replace unpaired UTF-16 surrogates with the Unicode replacement char (U+FFFD).
 *
 * Why: a lone surrogate — e.g. a truncated emoji in a server/profile name embedded
 * in a subscription URL's `#remark` — makes `encodeURI()` throw. On V8 the message is
 * "URI malformed"; on iOS WebKit (JavaScriptCore, used by Telegram on iOS) it is
 * "String contained an illegal UTF-16 sequence". `qrcode.react` calls `encodeURI`
 * internally (qrcodegen `toUtf8ByteArray`), so such a string crashes the QR render and
 * trips the page-level ErrorBoundary. `btoa(unescape(encodeURIComponent(...)))` and the
 * Telegram native bridge throw on the same input.
 *
 * Sanitising keeps the link working (the surrogate only ever lives in a cosmetic remark)
 * and renders a replacement glyph instead of taking the whole page down. Implemented
 * without lookbehind for broad WebView compatibility.
 */
// Any surrogate code unit at all (paired or not). The vast majority of strings
// (ASCII URLs, ids, tokens) contain none, so this lets us bail out in O(1) before
// the per-char rebuild — important because the global encoder guard runs this on
// every encodeURIComponent/encodeURI/btoa call.
const SURROGATE_RANGE = /[\uD800-\uDFFF]/;

export function sanitizeSurrogates(value: string): string {
  if (!SURROGATE_RANGE.test(value)) return value;

  let result = '';
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff) {
      // High surrogate: valid only if immediately followed by a low surrogate.
      const next = value.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        result += value[i] + value[i + 1];
        i++;
      } else {
        result += '�';
      }
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      // Low surrogate with no preceding high surrogate.
      result += '�';
    } else {
      result += value[i];
    }
  }
  return result;
}

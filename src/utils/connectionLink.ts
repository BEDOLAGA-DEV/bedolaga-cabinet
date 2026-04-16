import { createHappCryptoLink } from '@kastov/cryptohapp';

export function isHappCryptolinkMode(mode: string | null | undefined): boolean {
  const normalized = String(mode ?? '').toUpperCase();
  if (!normalized) return false;
  return normalized.includes('HAPP') && normalized.includes('CRYPT');
}

function isHttpUrl(url: string | null | undefined): url is string {
  return typeof url === 'string' && /^https?:\/\//i.test(url);
}

function isHappSubscriptionLink(url: string | null | undefined): url is string {
  return typeof url === 'string' && /^happ:\/\/sub/i.test(url);
}

function isCryptSourceUrl(url: string | null | undefined): url is string {
  return isHttpUrl(url) || isHappSubscriptionLink(url);
}

function isHappCryptDeepLink(url: string | null | undefined): url is string {
  return typeof url === 'string' && /^happ:\/\/crypt/i.test(url);
}

interface ResolveConnectionUrlInput {
  mode?: string | null;
  subscriptionUrl?: string | null;
  displayLink?: string | null;
  happSchemeLink?: string | null;
  happCryptLink?: string | null;
  happCryptoLink?: string | null;
  happLink?: string | null;
  fallbackUrl?: string | null;
}

export function resolveConnectionUrlForUi(input: ResolveConnectionUrlInput): string | null {
  const defaultUrl =
    input.fallbackUrl ?? input.subscriptionUrl ?? input.displayLink ?? input.happSchemeLink ?? null;

  if (!isHappCryptolinkMode(input.mode)) return defaultUrl;

  const backendCryptLink =
    [
      input.happCryptLink,
      input.happCryptoLink,
      input.happLink,
      input.happSchemeLink,
      input.displayLink,
      input.subscriptionUrl,
    ].find((value) => isHappCryptDeepLink(value)) ?? null;
  if (backendCryptLink) return backendCryptLink;

  const sourceSubscriptionUrl =
    [input.subscriptionUrl, input.displayLink, input.fallbackUrl].find((value) =>
      isCryptSourceUrl(value),
    ) ?? null;

  if (sourceSubscriptionUrl) {
    return (
      createHappCryptoLink(sourceSubscriptionUrl, 'v4', true) ??
      createHappCryptoLink(sourceSubscriptionUrl, 'v3', true) ??
      defaultUrl
    );
  }

  return defaultUrl;
}

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { OAuthAuthorizeResponse } from '../types';
import { signInWithApple } from './appleSignIn';

const authorizeResponse = {
  authorize_url:
    'https://appleid.apple.com/auth/authorize?client_id=com.example.web&redirect_uri=https%3A%2F%2Fcabinet.example.com%2Foauth%2Fapple&response_type=code&response_mode=form_post&scope=name%20email&state=expected-state&nonce=url-nonce',
  state: 'expected-state',
  nonce: 'api-nonce',
} satisfies OAuthAuthorizeResponse;

describe('signInWithApple', () => {
  const init = vi.fn();
  const signIn = vi.fn();

  beforeEach(() => {
    init.mockReset();
    signIn.mockReset();
    Object.defineProperty(window, 'AppleID', {
      configurable: true,
      writable: true,
      value: { auth: { init, signIn } },
    });
  });

  afterEach(() => {
    delete window.AppleID;
  });

  it('initializes the SDK from the backend authorize response and returns the popup result', async () => {
    signIn.mockResolvedValue({
      authorization: { code: 'apple-code', state: 'expected-state' },
      user: { email: 'person@example.com' },
    });

    await expect(signInWithApple(authorizeResponse)).resolves.toEqual({
      code: 'apple-code',
      state: 'expected-state',
      user: { email: 'person@example.com' },
    });
    expect(init).toHaveBeenCalledWith({
      clientId: 'com.example.web',
      scope: 'name email',
      redirectURI: 'https://cabinet.example.com/oauth/apple',
      state: 'expected-state',
      nonce: 'api-nonce',
      responseType: 'code',
      responseMode: 'form_post',
      usePopup: true,
    });
    expect(signIn).toHaveBeenCalledOnce();
  });

  it('rejects a popup result whose state does not match the authorize response', async () => {
    signIn.mockResolvedValue({
      authorization: { code: 'apple-code', state: 'wrong-state' },
    });

    await expect(signInWithApple(authorizeResponse)).rejects.toThrow(
      'Apple Sign In state mismatch',
    );
  });
});

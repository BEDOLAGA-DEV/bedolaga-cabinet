import type { AppleOAuthUserPayload, OAuthAuthorizeResponse } from '../types';

const APPLE_SIGN_IN_SCRIPT_ID = 'apple-sign-in-js';
const APPLE_SIGN_IN_SCRIPT_SRC =
  'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';
const APPLE_SIGN_IN_LOAD_TIMEOUT_MS = 8000;

let appleScriptPromise: Promise<void> | null = null;

export interface AppleSignInResult {
  code: string;
  state: string;
  user?: AppleOAuthUserPayload | string;
}

interface AppleAuthorizeParams {
  clientId: string;
  redirectURI: string;
  responseType: string;
  responseMode: string;
  scope?: string;
  state: string;
  nonce?: string;
}

function loadAppleScript(): Promise<void> {
  if (window.AppleID?.auth) {
    return Promise.resolve();
  }

  if (appleScriptPromise) {
    return appleScriptPromise;
  }

  appleScriptPromise = new Promise((resolve, reject) => {
    document.getElementById(APPLE_SIGN_IN_SCRIPT_ID)?.remove();

    const script = document.createElement('script');
    const timeoutId = window.setTimeout(
      () => fail('Timed out loading Apple Sign In'),
      APPLE_SIGN_IN_LOAD_TIMEOUT_MS,
    );

    function cleanup() {
      window.clearTimeout(timeoutId);
      script.onload = null;
      script.onerror = null;
    }

    function fail(message: string) {
      cleanup();
      script.remove();
      appleScriptPromise = null;
      reject(new Error(message));
    }

    script.id = APPLE_SIGN_IN_SCRIPT_ID;
    script.src = APPLE_SIGN_IN_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      cleanup();
      if (window.AppleID?.auth) {
        resolve();
      } else {
        fail('Apple Sign In loaded without initializing');
      }
    };
    script.onerror = () => fail('Failed to load Apple Sign In');

    document.head.appendChild(script);
  });

  return appleScriptPromise;
}

function getRequiredParam(params: URLSearchParams, name: string): string {
  const value = params.get(name);
  if (!value) {
    throw new Error(`Apple authorize URL is missing ${name}`);
  }
  return value;
}

function parseAuthorizeResponse(response: OAuthAuthorizeResponse): AppleAuthorizeParams {
  if (!response.authorize_url) {
    throw new Error('Apple authorize URL is required for web sign in');
  }

  const url = new URL(response.authorize_url);
  const { searchParams } = url;

  const state = getRequiredParam(searchParams, 'state');
  if (state !== response.state) {
    throw new Error('Apple authorize state mismatch');
  }

  return {
    clientId: getRequiredParam(searchParams, 'client_id'),
    redirectURI: getRequiredParam(searchParams, 'redirect_uri'),
    responseType: getRequiredParam(searchParams, 'response_type'),
    responseMode: getRequiredParam(searchParams, 'response_mode'),
    scope: searchParams.get('scope') || undefined,
    state,
    nonce: response.nonce || searchParams.get('nonce') || undefined,
  };
}

export async function signInWithApple(
  response: OAuthAuthorizeResponse,
): Promise<AppleSignInResult> {
  const params = parseAuthorizeResponse(response);
  await loadAppleScript();

  if (!window.AppleID?.auth) {
    throw new Error('Apple Sign In is unavailable');
  }

  window.AppleID.auth.init({
    clientId: params.clientId,
    scope: params.scope,
    redirectURI: params.redirectURI,
    state: params.state,
    nonce: params.nonce,
    responseType: params.responseType,
    responseMode: params.responseMode,
    usePopup: true,
  });

  const result = await window.AppleID.auth.signIn();
  const code = result.authorization?.code;
  const returnedState = result.authorization?.state;

  if (!code || !returnedState) {
    throw new Error('Apple Sign In did not return an authorization code');
  }

  if (returnedState !== params.state) {
    throw new Error('Apple Sign In state mismatch');
  }

  return {
    code,
    state: returnedState,
    user: result.user,
  };
}

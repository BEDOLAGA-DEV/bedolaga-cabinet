import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { authApi } from '../api/auth';
import { brandingApi, type TelegramWidgetConfig, type EmailAuthEnabled } from '../api/branding';
import { useToast } from '../components/Toast';
import { Card } from '@/components/data-display/Card';
import { Button } from '@/components/primitives/Button';
import { staggerContainer, staggerItem } from '@/components/motion/transitions';
import ProviderIcon from '../components/ProviderIcon';
import { LINK_OAUTH_STATE_KEY, LINK_OAUTH_PROVIDER_KEY, getErrorDetail } from '../utils/oauth';
import { getTelegramInitData } from '../hooks/useTelegramSDK';
import { usePlatform, useIsTelegram } from '@/platform/hooks/usePlatform';
import { useAuthStore } from '../store/auth';
import { isValidEmail } from '../utils/validation';
import type { LinkedProvider } from '../types';

const OAUTH_PROVIDERS = ['google', 'yandex', 'discord', 'vk'];

const isOAuthProvider = (provider: string): boolean => OAUTH_PROVIDERS.includes(provider);

const isLinkableProvider = (provider: string): boolean =>
  isOAuthProvider(provider) || provider === 'telegram' || provider === 'email';

// SessionStorage key for Telegram link CSRF state
export const LINK_TELEGRAM_STATE_KEY = 'link_telegram_state';

const LINK_SCRIPT_LOAD_TIMEOUT_MS = 8000;

/** Telegram account linking widget (browser only). Supports OIDC popup and legacy widget. */
function TelegramLinkWidget() {
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [oidcLoading, setOidcLoading] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [scriptFailed, setScriptFailed] = useState(false);
  const mountedRef = useRef(true);

  const { data: widgetConfig } = useQuery<TelegramWidgetConfig>({
    queryKey: ['telegram-widget-config'],
    queryFn: brandingApi.getTelegramWidgetConfig,
    staleTime: 60000,
  });

  const botUsername =
    widgetConfig?.bot_username || import.meta.env.VITE_TELEGRAM_BOT_USERNAME || '';
  const isOIDC = Boolean(widgetConfig?.oidc_enabled && widgetConfig?.oidc_client_id);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handleLinkResult = useCallback(
    async (response: Awaited<ReturnType<typeof authApi.linkTelegram>>) => {
      if (response.merge_required && response.merge_token) {
        navigate(`/merge/${response.merge_token}`, { replace: true });
      } else {
        queryClient.invalidateQueries({ queryKey: ['linked-providers'] });
        showToast({ type: 'success', message: t('profile.accounts.linkSuccess') });
      }
    },
    [navigate, queryClient, showToast, t],
  );

  // Handle script load failure (timeout or error)
  const handleScriptFailed = useCallback(() => {
    if (!mountedRef.current || scriptLoaded) return;
    setScriptFailed(true);
  }, [scriptLoaded]);

  // OIDC callback handler (ref pattern to avoid stale closures)
  const handleOIDCCallbackRef =
    useRef<(data: { id_token?: string; error?: string }) => void>(undefined);

  handleOIDCCallbackRef.current = async (data: { id_token?: string; error?: string }) => {
    if (!mountedRef.current) return;
    if (data.error || !data.id_token) {
      setOidcLoading(false);
      showToast({
        type: 'error',
        message: data.error || t('profile.accounts.linkError'),
      });
      return;
    }
    try {
      setOidcLoading(true);
      const response = await authApi.linkTelegram({ id_token: data.id_token });
      if (mountedRef.current) await handleLinkResult(response);
    } catch (err: unknown) {
      if (mountedRef.current) {
        showToast({
          type: 'error',
          message: getErrorDetail(err) || t('profile.accounts.linkError'),
        });
      }
    } finally {
      if (mountedRef.current) setOidcLoading(false);
    }
  };

  // Load OIDC script and init with timeout
  useEffect(() => {
    if (!isOIDC || !widgetConfig?.oidc_client_id) return;

    const scriptId = 'telegram-login-oidc-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;

    const initTelegramLogin = () => {
      if (window.Telegram?.Login) {
        window.Telegram.Login.init(
          {
            client_id: Number(widgetConfig.oidc_client_id) || widgetConfig.oidc_client_id,
            request_access: widgetConfig.request_access ? ['write'] : undefined,
            lang: document.documentElement.lang || 'en',
          },
          (data) => handleOIDCCallbackRef.current?.(data),
        );
        setScriptLoaded(true);
      }
    };

    const timeoutId = setTimeout(() => {
      if (!scriptLoaded) {
        handleScriptFailed();
      }
    }, LINK_SCRIPT_LOAD_TIMEOUT_MS);

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://oauth.telegram.org/js/telegram-login.js?3';
      script.async = true;
      script.onload = () => {
        clearTimeout(timeoutId);
        initTelegramLogin();
      };
      script.onerror = () => {
        clearTimeout(timeoutId);
        handleScriptFailed();
      };
      document.head.appendChild(script);
    } else {
      clearTimeout(timeoutId);
      initTelegramLogin();
    }

    return () => clearTimeout(timeoutId);
  }, [
    isOIDC,
    widgetConfig?.oidc_client_id,
    widgetConfig?.request_access,
    scriptLoaded,
    handleScriptFailed,
  ]);

  // Ref-based callback for legacy widget (avoids re-creating iframe on every render)
  const handleWidgetAuthRef = useRef<(user: Record<string, unknown>) => void>(undefined);
  handleWidgetAuthRef.current = async (user: Record<string, unknown>) => {
    if (!mountedRef.current) return;
    try {
      const response = await authApi.linkTelegram({
        id: user.id as number,
        first_name: user.first_name as string,
        last_name: (user.last_name as string) || undefined,
        username: (user.username as string) || undefined,
        photo_url: (user.photo_url as string) || undefined,
        auth_date: user.auth_date as number,
        hash: user.hash as string,
      });
      if (mountedRef.current) await handleLinkResult(response);
    } catch (err: unknown) {
      if (mountedRef.current) {
        showToast({
          type: 'error',
          message: getErrorDetail(err) || t('profile.accounts.linkError'),
        });
      }
    }
  };

  // Legacy widget effect (only when NOT OIDC) with timeout
  useEffect(() => {
    if (isOIDC || !containerRef.current || !botUsername) return;

    const container = containerRef.current;
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    const callbackName = '__onTelegramLinkAuth';
    (window as unknown as Record<string, unknown>)[callbackName] = (
      user: Record<string, unknown>,
    ) => {
      handleWidgetAuthRef.current?.(user);
    };

    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?23';
    script.setAttribute('data-telegram-login', botUsername);
    script.setAttribute('data-size', 'small');
    script.setAttribute('data-radius', '8');
    script.setAttribute('data-onauth', `${callbackName}(user)`);
    script.setAttribute('data-request-access', 'write');
    script.async = true;

    const timeoutId = setTimeout(() => {
      if (container && !container.querySelector('iframe')) {
        handleScriptFailed();
      }
    }, LINK_SCRIPT_LOAD_TIMEOUT_MS);

    script.onerror = () => {
      clearTimeout(timeoutId);
      handleScriptFailed();
    };

    container.appendChild(script);

    return () => {
      clearTimeout(timeoutId);
      delete (window as unknown as Record<string, unknown>)[callbackName];
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
    };
  }, [isOIDC, botUsername, handleScriptFailed]);

  if (!botUsername && !isOIDC) {
    return null;
  }

  // Script failed to load - show unavailable message with bot link
  if (scriptFailed) {
    return (
      <div className="flex max-w-[200px] flex-col items-center gap-1.5">
        <p className="break-words text-center text-xs text-dark-400">
          {t('profile.accounts.telegramLinkUnavailable')}
        </p>
        <a
          href={`https://t.me/${botUsername}`}
          target="_blank"
          rel="noopener noreferrer"
          className="break-all text-sm text-accent-400 transition-colors hover:text-accent-300"
        >
          @{botUsername}
        </a>
      </div>
    );
  }

  if (isOIDC) {
    return (
      <Button
        variant="primary"
        size="sm"
        disabled={oidcLoading || !scriptLoaded}
        loading={oidcLoading}
        onClick={() => {
          setOidcLoading(true);
          if (window.Telegram?.Login) {
            window.Telegram.Login.open();
          } else {
            setOidcLoading(false);
          }
        }}
      >
        {t('profile.accounts.link')}
      </Button>
    );
  }

  return <div ref={containerRef} className="flex items-center" />;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <div className="flex animate-pulse items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-6 w-6 rounded-full bg-dark-700" />
              <div className="space-y-2">
                <div className="h-4 w-24 rounded bg-dark-700" />
                <div className="h-3 w-32 rounded bg-dark-700" />
              </div>
            </div>
            <div className="h-8 w-20 rounded bg-dark-700" />
          </div>
        </Card>
      ))}
    </div>
  );
}

export default function ConnectedAccounts() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [confirmingUnlink, setConfirmingUnlink] = useState<string | null>(null);
  const [linkingProvider, setLinkingProvider] = useState<string | null>(null);
  const [waitingExternalLink, setWaitingExternalLink] = useState(false);
  const pendingLinkProvider = useRef<string | null>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Email linking inline form state
  const [emailFormOpen, setEmailFormOpen] = useState(false);
  const [emailValue, setEmailValue] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [emailConfirmPassword, setEmailConfirmPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
  // Email-merge confirmation: the target email belongs to another account, so a
  // one-time code was mailed to it; verifying the code yields the merge token.
  const [emailMergeCodePending, setEmailMergeCodePending] = useState(false);
  const [emailMergeCode, setEmailMergeCode] = useState('');
  const setUser = useAuthStore((state) => state.setUser);

  const { data: emailAuthConfig } = useQuery<EmailAuthEnabled>({
    queryKey: ['email-auth-enabled'],
    queryFn: brandingApi.getEmailAuthEnabled,
    staleTime: 60000,
  });
  const isEmailAuthEnabled = emailAuthConfig?.enabled ?? true;

  const inTelegram = useIsTelegram();
  const platform = usePlatform();

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    };
  }, []);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['linked-providers'],
    queryFn: () => authApi.getLinkedProviders(),
    refetchOnWindowFocus: true,
    // Poll every 5s while waiting for external browser OAuth to complete
    refetchInterval: waitingExternalLink ? 5000 : false,
  });

  // Stop polling after 90 seconds with timeout feedback
  useEffect(() => {
    if (!waitingExternalLink) return;
    const timeout = setTimeout(() => {
      setWaitingExternalLink(false);
      pendingLinkProvider.current = null;
      // Final refresh in case link succeeded during the last polling interval
      queryClient.invalidateQueries({ queryKey: ['linked-providers'] });
      showToast({ type: 'warning', message: t('profile.accounts.pollingTimeout') });
    }, 90_000);
    return () => clearTimeout(timeout);
  }, [waitingExternalLink, showToast, t, queryClient]);

  // Detect successful external link: stop polling when the target provider becomes linked
  useEffect(() => {
    if (!waitingExternalLink || !data || !pendingLinkProvider.current) return;
    const target = data.providers.find((p) => p.provider === pendingLinkProvider.current);
    if (target?.linked) {
      setWaitingExternalLink(false);
      pendingLinkProvider.current = null;
      showToast({ type: 'success', message: t('profile.accounts.linkSuccess') });
    }
  }, [data, waitingExternalLink, showToast, t]);

  const unlinkMutation = useMutation({
    mutationFn: (provider: string) => authApi.unlinkProvider(provider),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['linked-providers'] });
      showToast({
        type: 'success',
        message: t('profile.accounts.unlinkSuccess'),
      });
    },
    onError: () => {
      showToast({
        type: 'error',
        message: t('profile.accounts.unlinkError'),
      });
    },
    onSettled: () => {
      setConfirmingUnlink(null);
    },
  });

  const registerEmailMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authApi.registerEmail(email, password),
    onSuccess: async (response) => {
      if (response.merge_required && response.merge_token) {
        navigate(`/merge/${response.merge_token}`, { replace: true });
        return;
      }
      // The email belongs to another account: a one-time code was mailed to it.
      // Switch to the code step; verifying it yields the merge token.
      if (response.merge_required && response.merge_verification === 'email_code') {
        setEmailMergeCodePending(true);
        setEmailMergeCode('');
        setEmailSuccess(t('profile.emailMergeCodeSent'));
        setEmailError(null);
        return;
      }
      setEmailSuccess(t('profile.emailSent'));
      setEmailError(null);
      setEmailValue('');
      setEmailPassword('');
      setEmailConfirmPassword('');
      const updatedUser = await authApi.getMe();
      setUser(updatedUser);
      queryClient.invalidateQueries({ queryKey: ['linked-providers'] });
      // Note: auth user lives in the zustand store, not in React Query —
      // the explicit setUser above IS the refresh. No ['user'] query exists.
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      const detail = err.response?.data?.detail;
      // The email belongs to another account and merging it requires proving
      // ownership: the backend asks for THAT account's password (account-takeover
      // fix). Guide the user to enter it rather than showing a dead-end error.
      if (detail?.includes('merge')) {
        setEmailError(t('profile.emailMergePasswordRequired'));
      } else if (detail?.includes('already registered')) {
        setEmailError(t('profile.emailAlreadyRegistered'));
      } else if (detail?.includes('already have a verified email')) {
        setEmailError(t('profile.alreadyHaveEmail'));
      } else {
        setEmailError(detail || t('common.error'));
      }
      setEmailSuccess(null);
    },
  });

  const verifyEmailMergeMutation = useMutation({
    mutationFn: (code: string) => authApi.verifyEmailMerge(code),
    onSuccess: (response) => {
      if (response.merge_token) {
        navigate(`/merge/${response.merge_token}`, { replace: true });
      }
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      setEmailError(err.response?.data?.detail || t('profile.emailMergeCodeInvalid'));
    },
  });

  const handleVerifyMergeCode = (e: React.SyntheticEvent) => {
    e.preventDefault();
    setEmailError(null);
    const code = emailMergeCode.trim();
    if (!/^\d{6}$/.test(code)) {
      setEmailError(t('profile.emailMergeCodeInvalid'));
      return;
    }
    verifyEmailMergeMutation.mutate(code);
  };

  const cancelEmailMerge = () => {
    setEmailMergeCodePending(false);
    setEmailMergeCode('');
    setEmailError(null);
    setEmailSuccess(null);
  };

  const handleEmailSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    setEmailError(null);
    setEmailSuccess(null);

    if (!emailValue.trim() || !isValidEmail(emailValue.trim())) {
      setEmailError(t('profile.invalidEmail'));
      return;
    }
    if (!emailPassword || emailPassword.length < 8) {
      setEmailError(t('profile.passwordMinLength'));
      return;
    }
    if (emailPassword !== emailConfirmPassword) {
      setEmailError(t('profile.passwordsMismatch'));
      return;
    }
    registerEmailMutation.mutate({ email: emailValue, password: emailPassword });
  };

  const canUnlink = (provider: LinkedProvider): boolean => {
    if (!provider.linked) return false;
    if (!isOAuthProvider(provider.provider)) return false;
    const linkedCount = data?.providers.filter((p) => p.linked).length ?? 0;
    return linkedCount > 1;
  };

  const handleLinkOAuth = async (provider: string) => {
    if (linkingProvider) return;
    setLinkingProvider(provider);
    try {
      const { authorize_url, state } = await authApi.linkProviderInit(provider);
      if (!authorize_url || !state) {
        throw new Error('Invalid response from server');
      }

      // Validate redirect URL — only allow HTTPS to prevent open redirect
      let parsed: URL;
      try {
        parsed = new URL(authorize_url);
      } catch {
        throw new Error('Invalid OAuth redirect URL');
      }
      if (parsed.protocol !== 'https:') {
        throw new Error('Invalid OAuth redirect URL');
      }

      if (inTelegram) {
        // Mini App: open in external browser to avoid WebView OAuth restrictions.
        // The callback will use server-complete flow (auth via state token, no JWT).
        platform.openLink(authorize_url);
        setLinkingProvider(null);
        // Track which provider we're waiting to become linked
        pendingLinkProvider.current = provider;
        // Start polling for linked providers (external browser has no way to notify Mini App)
        setWaitingExternalLink(true);
        showToast({
          type: 'info',
          message: t('profile.accounts.continueInBrowser'),
        });
      } else {
        // Regular browser: navigate within the same tab.
        // Save state in sessionStorage for the callback page to verify.
        sessionStorage.setItem(LINK_OAUTH_STATE_KEY, state);
        sessionStorage.setItem(LINK_OAUTH_PROVIDER_KEY, provider);
        window.location.href = authorize_url;
      }
    } catch (err: unknown) {
      showToast({
        type: 'error',
        message: getErrorDetail(err) || t('profile.accounts.linkError'),
      });
      setLinkingProvider(null);
    }
  };

  const handleLinkTelegram = async () => {
    if (linkingProvider) return;
    const initData = getTelegramInitData();
    if (!initData) return;

    setLinkingProvider('telegram');
    try {
      const response = await authApi.linkTelegram({ init_data: initData });
      if (response.merge_required && response.merge_token) {
        navigate(`/merge/${response.merge_token}`, { replace: true });
      } else {
        queryClient.invalidateQueries({ queryKey: ['linked-providers'] });
        showToast({ type: 'success', message: t('profile.accounts.linkSuccess') });
      }
    } catch (err: unknown) {
      showToast({ type: 'error', message: getErrorDetail(err) || t('profile.accounts.linkError') });
    } finally {
      setLinkingProvider(null);
    }
  };

  const handleLink = async (provider: string) => {
    if (provider === 'telegram') {
      await handleLinkTelegram();
    } else {
      await handleLinkOAuth(provider);
    }
  };

  const handleUnlink = (provider: string) => {
    if (confirmingUnlink === provider) {
      setConfirmingUnlink(null);
      unlinkMutation.mutate(provider);
    } else {
      setConfirmingUnlink(provider);
    }
  };

  const renderLinkButton = (provider: LinkedProvider) => {
    if (provider.provider === 'email') {
      if (!isEmailAuthEnabled) return null;
      return (
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setEmailFormOpen((prev) => !prev);
            setEmailError(null);
            setEmailSuccess(null);
          }}
        >
          {emailFormOpen ? t('common.cancel') : t('profile.accounts.link')}
        </Button>
      );
    }

    if (provider.provider === 'telegram') {
      if (inTelegram && getTelegramInitData()) {
        // Mini App: one-click button
        return (
          <Button
            variant="primary"
            size="sm"
            disabled={linkingProvider !== null || waitingExternalLink}
            loading={linkingProvider === 'telegram'}
            onClick={() => handleLink('telegram')}
          >
            {t('profile.accounts.link')}
          </Button>
        );
      }
      // Browser: Telegram Login Widget
      return <TelegramLinkWidget />;
    }

    if (isOAuthProvider(provider.provider)) {
      return (
        <Button
          variant="primary"
          size="sm"
          disabled={linkingProvider !== null || waitingExternalLink}
          loading={linkingProvider === provider.provider}
          onClick={() => handleLink(provider.provider)}
        >
          {t('profile.accounts.link')}
        </Button>
      );
    }

    return null;
  };

  return (
    <motion.div
      className="space-y-6"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {/* Page title */}
      <motion.div variants={staggerItem}>
        <h1 className="text-2xl font-bold text-dark-50 sm:text-3xl">
          {t('profile.accounts.title')}
        </h1>
        <p className="mt-1 text-dark-400">{t('profile.accounts.subtitle')}</p>
      </motion.div>

      {/* Loading state */}
      {isLoading && (
        <motion.div variants={staggerItem}>
          <LoadingSkeleton />
        </motion.div>
      )}

      {/* Error state */}
      {isError && (
        <motion.div variants={staggerItem}>
          <Card>
            <p className="text-center text-dark-400">{t('common.error')}</p>
          </Card>
        </motion.div>
      )}

      {/* Provider cards */}
      {data?.providers.map((provider) => (
        <motion.div key={provider.provider} variants={staggerItem}>
          <Card>
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <ProviderIcon provider={provider.provider} />
                <div className="min-w-0">
                  <p className="truncate font-medium text-dark-100">
                    {t(`profile.accounts.providers.${provider.provider}`)}
                  </p>
                  {provider.identifier && (
                    <p className="truncate text-sm text-dark-400">{provider.identifier}</p>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                {provider.linked ? (
                  <>
                    <span className="text-sm text-success-500">{t('profile.accounts.linked')}</span>
                    {canUnlink(provider) && (
                      <Button
                        variant={confirmingUnlink === provider.provider ? 'destructive' : 'outline'}
                        size="sm"
                        disabled={unlinkMutation.isPending}
                        loading={
                          unlinkMutation.isPending && unlinkMutation.variables === provider.provider
                        }
                        onClick={() => handleUnlink(provider.provider)}
                        onBlur={() => {
                          blurTimeoutRef.current = setTimeout(() => {
                            setConfirmingUnlink((cur) => (cur === provider.provider ? null : cur));
                          }, 150);
                        }}
                      >
                        {confirmingUnlink === provider.provider
                          ? t('profile.accounts.unlinkConfirmBtn')
                          : t('profile.accounts.unlink')}
                      </Button>
                    )}
                  </>
                ) : (
                  isLinkableProvider(provider.provider) && renderLinkButton(provider)
                )}
              </div>
            </div>

            {/* Inline email linking form */}
            {provider.provider === 'email' && !provider.linked && (
              <AnimatePresence>
                {emailFormOpen && (
                  <motion.div
                    key="email-link-form"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-4 border-t border-dark-700/30 pt-4">
                      <p className="mb-4 text-sm text-dark-400">
                        {emailMergeCodePending
                          ? t('profile.emailMergeCodeDescription')
                          : t('profile.linkEmailDescription')}
                      </p>
                      {emailMergeCodePending ? (
                        <form onSubmit={handleVerifyMergeCode} className="space-y-3">
                          <div>
                            <label htmlFor="email-merge-code" className="label">
                              {t('profile.emailMergeCodeLabel')}
                            </label>
                            <input
                              id="email-merge-code"
                              type="text"
                              inputMode="numeric"
                              maxLength={6}
                              value={emailMergeCode}
                              onChange={(e) => setEmailMergeCode(e.target.value.replace(/\D/g, ''))}
                              placeholder="000000"
                              className="input tracking-[0.5em]"
                              autoComplete="one-time-code"
                            />
                          </div>
                          {emailError && (
                            <div className="rounded-xl border border-error-500/30 bg-error-500/10 p-3 text-sm text-error-400">
                              {emailError}
                            </div>
                          )}
                          {emailSuccess && (
                            <div className="rounded-xl border border-success-500/30 bg-success-500/10 p-3 text-sm text-success-400">
                              {emailSuccess}
                            </div>
                          )}
                          <Button
                            type="submit"
                            fullWidth
                            loading={verifyEmailMergeMutation.isPending}
                          >
                            {t('profile.emailMergeConfirm')}
                          </Button>
                          <button
                            type="button"
                            onClick={cancelEmailMerge}
                            className="w-full text-sm text-dark-400 transition-colors hover:text-dark-200"
                          >
                            {t('common.cancel')}
                          </button>
                        </form>
                      ) : (
                        <form onSubmit={handleEmailSubmit} className="space-y-3">
                          <div>
                            <label htmlFor="email-link-input" className="label">
                              Email
                            </label>
                            <input
                              id="email-link-input"
                              type="email"
                              value={emailValue}
                              onChange={(e) => setEmailValue(e.target.value)}
                              placeholder="email@example.com"
                              className="input"
                              autoComplete="email"
                            />
                          </div>
                          <div>
                            <label htmlFor="email-link-password" className="label">
                              {t('auth.password')}
                            </label>
                            <input
                              id="email-link-password"
                              type="password"
                              value={emailPassword}
                              onChange={(e) => setEmailPassword(e.target.value)}
                              placeholder={t('profile.passwordPlaceholder')}
                              className="input"
                              autoComplete="new-password"
                            />
                            <p className="mt-1 text-xs text-dark-500">
                              {t('profile.passwordHint')}
                            </p>
                          </div>
                          <div>
                            <label htmlFor="email-link-confirm" className="label">
                              {t('auth.confirmPassword')}
                            </label>
                            <input
                              id="email-link-confirm"
                              type="password"
                              value={emailConfirmPassword}
                              onChange={(e) => setEmailConfirmPassword(e.target.value)}
                              placeholder={t('profile.confirmPasswordPlaceholder')}
                              className="input"
                              autoComplete="new-password"
                            />
                          </div>

                          {emailError && (
                            <div className="rounded-xl border border-error-500/30 bg-error-500/10 p-3 text-sm text-error-400">
                              {emailError}
                            </div>
                          )}
                          {emailSuccess && (
                            <div className="rounded-xl border border-success-500/30 bg-success-500/10 p-3 text-sm text-success-400">
                              {emailSuccess}
                            </div>
                          )}

                          <Button type="submit" fullWidth loading={registerEmailMutation.isPending}>
                            {t('profile.linkEmail')}
                          </Button>
                        </form>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
}

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/auth';
import { useAuthStore } from '../store/auth';
import { useTelegramWebApp } from '../hooks/useTelegramWebApp';
import { useBackButton } from '@/platform';

// Icons
const CloseIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const EmailIcon = () => (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
    />
  </svg>
);

const CheckIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

interface ChangeEmailModalProps {
  onClose: () => void;
  currentEmail: string;
}

type Step = 'email' | 'code' | 'success';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 640;
  });
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
}

const RESEND_COOLDOWN = 60; // seconds

export default function ChangeEmailModal({ onClose, currentEmail }: ChangeEmailModalProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { setUser } = useAuthStore();
  const { isTelegramWebApp, safeAreaInset, contentSafeAreaInset } = useTelegramWebApp();
  const isMobileScreen = useIsMobile();

  const emailInputRef = useRef<HTMLInputElement>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('email');
  const [newEmail, setNewEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  const safeBottom = isTelegramWebApp
    ? Math.max(safeAreaInset.bottom, contentSafeAreaInset.bottom)
    : 0;

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // Keyboard: Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleClose]);

  // Telegram back button - using platform hook
  useBackButton(handleClose);

  // Scroll lock
  useEffect(() => {
    const scrollY = window.scrollY;
    const preventScroll = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-modal-content]')) return;
      e.preventDefault();
    };
    const preventWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-modal-content]')) return;
      e.preventDefault();
    };
    document.addEventListener('touchmove', preventScroll, { passive: false });
    document.addEventListener('wheel', preventWheel, { passive: false });
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('touchmove', preventScroll);
      document.removeEventListener('wheel', preventWheel);
      document.body.style.overflow = '';
      window.scrollTo(0, scrollY);
    };
  }, []);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Auto-focus inputs
  useEffect(() => {
    const timer = setTimeout(() => {
      if (step === 'email' && emailInputRef.current) {
        emailInputRef.current.focus();
      } else if (step === 'code' && codeInputRef.current) {
        codeInputRef.current.focus();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [step]);

  // Request email change mutation
  const requestChangeMutation = useMutation({
    mutationFn: (email: string) => authApi.requestEmailChange(email),
    onSuccess: () => {
      setError(null);
      setStep('code');
      setResendCooldown(RESEND_COOLDOWN);
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      const detail = err.response?.data?.detail;
      if (detail?.includes('already registered') || detail?.includes('already in use')) {
        setError(t('profile.changeEmail.emailAlreadyUsed'));
      } else if (detail?.includes('same as current')) {
        setError(t('profile.changeEmail.sameEmail'));
      } else if (detail?.includes('rate limit') || detail?.includes('too many')) {
        setError(t('profile.changeEmail.tooManyRequests'));
      } else {
        setError(detail || t('common.error'));
      }
    },
  });

  // Verify code mutation
  const verifyCodeMutation = useMutation({
    mutationFn: (verificationCode: string) => authApi.verifyEmailChange(verificationCode),
    onSuccess: async () => {
      setError(null);
      setStep('success');
      // Refresh user data
      const updatedUser = await authApi.getMe();
      setUser(updatedUser);
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      const detail = err.response?.data?.detail;
      if (detail?.includes('invalid') || detail?.includes('wrong')) {
        setError(t('profile.changeEmail.invalidCode'));
      } else if (detail?.includes('expired')) {
        setError(t('profile.changeEmail.codeExpired'));
      } else {
        setError(detail || t('common.error'));
      }
    },
  });

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  const handleSendCode = () => {
    setError(null);
    if (!newEmail.trim()) {
      setError(t('profile.emailRequired'));
      return;
    }
    if (!validateEmail(newEmail)) {
      setError(t('profile.invalidEmail'));
      return;
    }
    if (newEmail.toLowerCase().trim() === currentEmail.toLowerCase()) {
      setError(t('profile.changeEmail.sameEmail'));
      return;
    }
    requestChangeMutation.mutate(newEmail.trim());
  };

  const handleVerifyCode = () => {
    setError(null);
    if (!code.trim()) {
      setError(t('profile.changeEmail.enterCode'));
      return;
    }
    if (code.trim().length < 4) {
      setError(t('profile.changeEmail.invalidCode'));
      return;
    }
    verifyCodeMutation.mutate(code.trim());
  };

  const handleResendCode = () => {
    if (resendCooldown > 0) return;
    requestChangeMutation.mutate(newEmail.trim());
  };

  const handleBack = () => {
    setStep('email');
    setCode('');
    setError(null);
  };

  const isPending = requestChangeMutation.isPending || verifyCodeMutation.isPending;

  // Content JSX
  const contentJSX = (
    <div className="space-y-5">
      {/* Header icon */}
      <div className="flex items-center gap-4 pb-1">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-500/20 to-accent-600/20 text-accent-400">
          <EmailIcon />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-dark-100">{t('profile.changeEmail.title')}</h3>
          <p className="text-sm text-dark-400">
            {step === 'email' && t('profile.changeEmail.description')}
            {step === 'code' && t('profile.changeEmail.enterCodeDescription')}
            {step === 'success' && t('profile.changeEmail.successDescription')}
          </p>
        </div>
      </div>

      {/* Current email display */}
      {step === 'email' && (
        <div className="rounded-xl border border-dark-700/50 bg-dark-800/50 p-4">
          <p className="text-xs text-dark-500">{t('profile.changeEmail.currentEmail')}</p>
          <p className="mt-1 font-medium text-dark-200">{currentEmail}</p>
        </div>
      )}

      {/* Email input step */}
      {step === 'email' && (
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-dark-400">
              {t('profile.changeEmail.newEmail')}
            </label>
            <input
              ref={emailInputRef}
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSendCode();
                }
              }}
              placeholder="new@email.com"
              className="input w-full"
              autoComplete="email"
              autoFocus
            />
          </div>

          <button
            type="button"
            onClick={handleSendCode}
            disabled={isPending || !newEmail.trim()}
            className="btn-primary w-full"
          >
            {requestChangeMutation.isPending ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                {t('common.loading')}
              </span>
            ) : (
              t('profile.changeEmail.sendCode')
            )}
          </button>
        </div>
      )}

      {/* Code verification step */}
      {step === 'code' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-accent-500/30 bg-accent-500/10 p-4">
            <p className="text-sm text-accent-400">
              {t('profile.changeEmail.codeSentTo', { email: newEmail })}
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-dark-400">
              {t('profile.changeEmail.verificationCode')}
            </label>
            <input
              ref={codeInputRef}
              type="text"
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleVerifyCode();
                }
              }}
              placeholder="000000"
              maxLength={6}
              className="input w-full text-center text-2xl tracking-[0.5em]"
              autoComplete="one-time-code"
              autoFocus
            />
          </div>

          <button
            type="button"
            onClick={handleVerifyCode}
            disabled={isPending || !code.trim()}
            className="btn-primary w-full"
          >
            {verifyCodeMutation.isPending ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                {t('common.loading')}
              </span>
            ) : (
              t('profile.changeEmail.verify')
            )}
          </button>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleBack}
              className="text-sm text-dark-400 hover:text-dark-200"
            >
              {t('common.back')}
            </button>
            <button
              type="button"
              onClick={handleResendCode}
              disabled={resendCooldown > 0 || requestChangeMutation.isPending}
              className={`text-sm ${
                resendCooldown > 0 ? 'text-dark-500' : 'text-accent-400 hover:text-accent-300'
              }`}
            >
              {resendCooldown > 0
                ? t('profile.changeEmail.resendIn', { seconds: resendCooldown })
                : t('profile.changeEmail.resendCode')}
            </button>
          </div>
        </div>
      )}

      {/* Success step */}
      {step === 'success' && (
        <div className="space-y-4">
          <div className="flex flex-col items-center rounded-xl border border-success-500/30 bg-success-500/10 p-6">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-success-500/20">
              <CheckIcon />
            </div>
            <p className="text-center font-medium text-success-400">
              {t('profile.changeEmail.success')}
            </p>
            <p className="mt-1 text-center text-sm text-dark-400">{newEmail}</p>
          </div>

          <button type="button" onClick={handleClose} className="btn-primary w-full">
            {t('common.close')}
          </button>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-error-500/20 bg-error-500/10 p-3">
          <svg
            className="h-5 w-5 shrink-0 text-error-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="text-sm text-error-400">{error}</span>
        </div>
      )}
    </div>
  );

  // Render modal based on screen size
  const modalContent = isMobileScreen ? (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[9998] bg-black/70" onClick={handleClose} />
      {/* Bottom sheet */}
      <div
        data-modal-content
        className="fixed inset-x-0 bottom-0 z-[9999] flex max-h-[90vh] flex-col overflow-hidden rounded-t-3xl bg-dark-900"
        style={{
          paddingBottom: safeBottom
            ? `${safeBottom + 20}px`
            : 'max(20px, env(safe-area-inset-bottom))',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div className="flex justify-center pb-1 pt-3">
          <div className="h-1 w-10 rounded-full bg-dark-600" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-2">
          <div className="flex items-center gap-2">
            <EmailIcon />
            <span className="text-lg font-bold text-dark-100">
              {t('profile.changeEmail.title')}
            </span>
          </div>
          <button
            onClick={handleClose}
            className="-mr-2 rounded-xl p-2 text-dark-400 transition-colors hover:bg-dark-800"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Divider */}
        <div className="mx-5 h-px bg-gradient-to-r from-transparent via-dark-700 to-transparent" />

        {/* Content */}
        <div className="overflow-y-auto px-5 py-5">{contentJSX}</div>
      </div>
    </>
  ) : (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[10vh]"
      onClick={handleClose}
    >
      <div
        data-modal-content
        className="w-full max-w-md overflow-hidden rounded-3xl border border-dark-700/50 bg-dark-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-dark-700/50 bg-gradient-to-r from-dark-800/80 to-dark-800/40 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-500/10 text-accent-400">
              <EmailIcon />
            </div>
            <span className="text-lg font-bold text-dark-100">
              {t('profile.changeEmail.title')}
            </span>
          </div>
          <button
            onClick={handleClose}
            className="-mr-1 rounded-xl p-2 text-dark-400 transition-colors hover:bg-dark-700"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">{contentJSX}</div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }
  return modalContent;
}

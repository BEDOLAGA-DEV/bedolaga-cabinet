import { localizeOwnedStructuredError } from './api-error-structured-owned';
import { TRANSITIVE_ERROR_LITERAL_KEYS } from './api-error-transitive-literals';
import { localizeApiErrorTemplate, localizeApiMonetaryError } from './api-error-templates';
import { SERVICE_ERROR_LITERAL_KEYS } from './api-error-service-literals';
import { USER_ERROR_LITERAL_KEYS } from './api-error-user-literals';
import { ADMIN_ERROR_LITERAL_KEYS } from './api-error-admin-literals';
import axios from 'axios';
import type { TFunction } from 'i18next';
import { AUTH_ERROR_LITERAL_KEYS } from './api-error-auth-literals';
import { PURCHASE_ERROR_LITERAL_KEYS } from './api-error-literals';

// Cabinet-owned, audited exact messages only. These mappings never classify an
// action: callers must continue using raw payloads/codes for control flow.
const literalKeys = new Map<string, string>([
  ['Could not create Platega subscription', 'plategaSubscriptionCreateFailed'],
  ...TRANSITIVE_ERROR_LITERAL_KEYS,
  ...SERVICE_ERROR_LITERAL_KEYS,
  ...ADMIN_ERROR_LITERAL_KEYS,
  ...USER_ERROR_LITERAL_KEYS,
  ...AUTH_ERROR_LITERAL_KEYS,
  ...PURCHASE_ERROR_LITERAL_KEYS,
  ['This email is already registered', 'emailRegistered'],
  ['Invalid email or password', 'invalidCredentials'],
  ['Please verify your email first', 'verifyEmail'],
  ['You already have a verified email', 'emailVerified'],
  ['Email is already verified', 'emailVerified'],
  ['New email is the same as current email', 'sameEmail'],
  ['Disposable email addresses are not allowed', 'disposableEmail'],
  ['This email address cannot be linked to your account.', 'emailCannotLink'],
  ['This email address cannot be used for registration.', 'emailCannotRegister'],
  ['Invalid confirmation code', 'invalidConfirmationCode'],
  ['Invalid verification token', 'invalidVerificationToken'],
  ['Verification token has expired', 'verificationExpired'],
  ['Invalid reset token', 'invalidResetToken'],
  ['Reset token has expired', 'resetExpired'],
  ['Too many requests', 'tooManyRequests'],
  ['Too many invalid attempts. Please request a new code.', 'requestNewCode'],
  ['Too many invalid attempts. Please start the merge again.', 'restartMerge'],
  ['No pending account merge. Please start again.', 'noPendingMerge'],
  ['No pending email change', 'noPendingEmailChange'],
  ['Cannot activate your own gift', 'ownGift'],
  ['Support tickets are disabled', 'ticketsDisabled'],
  ['You already have an open ticket', 'openTicketExists'],
  ['Ticket not found', 'ticketNotFound'],
  ['Cannot add message to closed ticket', 'ticketClosed'],
  ['Replies to this ticket are blocked', 'ticketRepliesBlocked'],
  ['Platega recurrent disabled', 'recurringDisabled'],
  ['Lava recurrent disabled', 'recurringDisabled'],
  ['Cashera recurrent disabled', 'recurringDisabled'],
]);

// Excludes maintenance/blacklisted (operator reasons), generic provider codes,
// and money errors whose messages carry amounts not covered by this formatter.
const codeKeys = new Map<string, string>([
  ['account_deleted', 'accountDeleted'],
  ['no_telegram_id', 'noTelegramId'],
  ['bot_not_configured', 'botNotConfigured'],
  ['empty_message', 'emptyMessage'],
  ['send_failed', 'messageSendFailed'],
  ['subscription_expired', 'expiredCannotSwitch'],
  ['trial_cannot_switch', 'trialCannotSwitch'],
  ['free_tariff_cannot_switch', 'freeCannotSwitch'],
  ['email_auth_disabled', 'emailAuthDisabled'],
  ['registration_invite_required', 'inviteRequired'],
  ['registration_check_unavailable', 'registrationUnavailable'],
  ['legal_consent_required', 'legalConsent'],
  ['channel_subscription_required', 'channelSubscription'],
  ['email_unverified_local', 'emailUnverifiedLocal'],
  ['checkout_already_processed', 'checkoutProcessed'],
  ['subscription_tariff_mismatch', 'tariffMismatch'],
  ['subscription_selection_required', 'subscriptionSelection'],
  ['tariff_required', 'tariffRequired'],
]);

// Closed field-label map: backend paths never become arbitrary translation keys.
const validationFieldKeys = new Map<string, string>([
  ['email', 'fields.email'],
  ['password', 'fields.password'],
  ['first_name', 'fields.first_name'],
  ['last_name', 'fields.last_name'],
  ['code', 'fields.code'],
  ['amount', 'fields.amount'],
  ['amount_kopeks', 'fields.amount_kopeks'],
  ['period_days', 'fields.period_days'],
  ['device_limit', 'fields.device_limit'],
  ['devices', 'fields.devices'],
  ['traffic_gb', 'fields.traffic_gb'],
  ['tariff_id', 'fields.tariff_id'],
  ['subscription_id', 'fields.subscription_id'],
  ['promo_code', 'fields.promo_code'],
  ['language', 'fields.language'],
]);

const validationKeys = new Map<string, string>([
  ['missing', 'missing'],
  ['int_parsing', 'integer'],
  ['int_type', 'integer'],
  ['float_parsing', 'number'],
  ['float_type', 'number'],
  ['bool_parsing', 'boolean'],
  ['bool_type', 'boolean'],
  ['string_type', 'string'],
  ['list_type', 'list'],
  ['finite_number', 'finiteNumber'],
]);
const boundedValidation = new Map<string, readonly [string, string]>([
  ['greater_than', ['greaterThan', 'gt']],
  ['greater_than_equal', ['greaterThanEqual', 'ge']],
  ['less_than', ['lessThan', 'lt']],
  ['less_than_equal', ['lessThanEqual', 'le']],
  ['string_too_short', ['stringTooShort', 'min_length']],
  ['string_too_long', ['stringTooLong', 'max_length']],
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function translate(t: TFunction, key: string, fallback: string, bound?: number): string {
  const result = t(`apiErrors.${key}`, {
    defaultValue: fallback,
    ...(bound === undefined ? {} : { bound }),
  });
  return typeof result === 'string' ? result : fallback;
}

function validationMessage(value: unknown, t: TFunction): string | undefined {
  if (!isRecord(value)) return undefined;
  const raw = typeof value.msg === 'string' ? value.msg : '';
  const type = typeof value.type === 'string' ? value.type : '';
  const simple = validationKeys.get(type);
  let message = simple ? translate(t, `validation.${simple}`, raw) : raw;
  const bounded = boundedValidation.get(type);
  if (bounded && isRecord(value.ctx)) {
    const bound = value.ctx[bounded[1]];
    const isLength = bounded[1] === 'min_length' || bounded[1] === 'max_length';
    if (
      typeof bound === 'number' &&
      Number.isFinite(bound) &&
      (!isLength || (Number.isSafeInteger(bound) && bound >= 0))
    ) {
      message = translate(t, `validation.${bounded[0]}`, raw, bound);
    }
  }
  if (!message) return undefined;
  // Do not stringify arbitrary objects or input/ctx. Unknown valid field paths
  // remain available for debugging until each form supplies localized labels.
  const location = value.loc;
  const field =
    Array.isArray(location) &&
    location.every(
      (part) =>
        typeof part === 'string' || (typeof part === 'number' && Number.isSafeInteger(part)),
    )
      ? location
          .filter((part) => part !== 'body')
          .map((part) => {
            const key = typeof part === 'string' ? validationFieldKeys.get(part) : undefined;
            return key ? translate(t, key, String(part)) : part;
          })
          .join('.')
      : '';
  return field ? `${field}: ${message}` : message;
}

/** Display-only localization. Never mutates or reclassifies the Axios error. */
export function getLocalizedApiErrorMessage(err: unknown, fallback: string, t: TFunction): string {
  if (!axios.isAxiosError(err)) return fallback;
  const detail: unknown = err.response?.data?.detail;
  if (typeof detail === 'string') {
    if (!detail) return fallback;
    const key = literalKeys.get(detail);
    return key
      ? translate(t, key, detail)
      : (localizeApiErrorTemplate(detail, err.config, t) ?? detail);
  }
  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => validationMessage(item, t))
      .filter((message): message is string => Boolean(message));
    return messages.length ? messages.join('; ') : fallback;
  }
  if (isRecord(detail)) {
    const monetary = localizeApiMonetaryError(detail, err.config, t);
    if (monetary !== undefined) return monetary;
    const owned = localizeOwnedStructuredError(detail, err.config, t);
    if (owned !== undefined) return owned;
    const message =
      typeof detail.message === 'string' && detail.message ? detail.message : fallback;
    const key = typeof detail.code === 'string' ? codeKeys.get(detail.code) : undefined;
    return key ? translate(t, key, message) : message;
  }
  return fallback;
}

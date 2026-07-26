/**
 * Composes a user-facing display name from first_name + last_name with sensible fallbacks.
 *
 * Why: single-letter first_name (e.g., "О") looked confusing alone ("Добро пожаловать, О!").
 * Combining with last_name makes truncated/short first names readable.
 *
 * Email/OAuth registration does not collect a name, so for such users every
 * Telegram-derived field is null — fall back to the email local part
 * ("vasya@gmail.com" → "vasya") to avoid an empty name in greetings.
 */
export interface NameSource {
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
  telegram_id?: number | null;
  email?: string | null;
}

export function displayName(user?: NameSource | null): string {
  if (!user) return '';
  const fullName = [user.first_name, user.last_name]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(' ');
  if (fullName) return fullName;
  if (user.username) return user.username;
  if (user.telegram_id) return `#${user.telegram_id}`;
  const emailLocalPart = user.email?.trim().split('@')[0];
  if (emailLocalPart) return emailLocalPart;
  return '';
}

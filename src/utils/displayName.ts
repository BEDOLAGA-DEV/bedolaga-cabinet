/**
 * Composes a user-facing display name from first_name + last_name with sensible fallbacks.
 *
 * Why: single-letter first_name (e.g., "О") looked confusing alone ("Добро пожаловать, О!").
 * Combining with last_name makes truncated/short first names readable.
 */
export interface NameSource {
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
  telegram_id?: number | null;
}

export function displayName(user?: NameSource | null): string {
  if (!user) return '';
  const fullName = [user.first_name, user.last_name]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(' ');
  if (fullName) return fullName;
  if (user.username) return user.username;
  if (user.telegram_id) return `#${user.telegram_id}`;
  return '';
}

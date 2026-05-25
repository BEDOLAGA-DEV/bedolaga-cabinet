/**
 * Maximum length of a user-set local device alias.
 *
 * Mirrors `ALIAS_MAX_LENGTH` in the bot's `user_device_aliases` table.
 * Keep this value in sync with `app/database/crud/user_device_alias.py`
 * (Python side enforces it at the DB column width AND at the API layer).
 */
export const DEVICE_ALIAS_MAX_LENGTH = 64;

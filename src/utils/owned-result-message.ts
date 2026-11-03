import type { TFunction } from 'i18next';

type ResultScope = 'contest' | 'promo' | 'servers' | 'sync';
const contestKeys = new Map<string, string>([
  ['Empty node', 'emptyNode'],
  ['Wrong server', 'wrongServer'],
  ['Try another', 'tryAnother'],
  ['Locked', 'locked'],
  ['No access', 'noAccess'],
  ['Try again', 'tryAgain'],
  ['Server overloaded', 'serverOverloaded'],
  ['No response', 'noResponse'],
  ['Try tomorrow', 'tryTomorrow'],
  ['Incorrect', 'incorrect'],
  ['Try again next round', 'tryNextRound'],
  ['Error: invalid prize value', 'invalidPrize'],
  ['Error: subscription not found', 'prizeNoSubscription'],
  ['Error: user not found', 'prizeNoUser'],
]);
const syncKeys = new Map<string, string>([
  ['Sync from panel completed', 'syncFromPanel'],
  ['Sync to panel completed', 'syncToPanel'],
  ['Full sync completed', 'syncFull'],
  ['Servers synced successfully', 'syncServers'],
  ['Subscriptions validated', 'validated'],
  ['Cleanup completed', 'cleanup'],
  ['Subscription statuses synced', 'statusesSynced'],
  ['Recommendations retrieved', 'recommendations'],
  ['Auto sync enabled and scheduled', 'autoSyncEnabled'],
  ['Auto sync setting change requested. Restart may be required.', 'autoSyncRequested'],
  ['No change needed', 'noChange'],
  ['Failed', 'failed'],
]);

/** A display formatter for known result fields. No Axios wrapping or outcome inference. */
export function localizeOwnedResultMessage(raw: string, scope: ResultScope, t: TFunction): string {
  const translate = (key: string, fallback: string, params: Record<string, string> = {}) => {
    const result = t(`apiResults.${key}`, {
      ...params,
      defaultValue: '',
      interpolation: { escapeValue: false, skipOnVariables: true },
    });
    return typeof result === 'string' && result ? result : fallback;
  };
  if (raw.length > 8192 || /[\r\n]/.test(raw)) return raw;
  if (scope === 'contest') {
    const key = contestKeys.get(raw);
    if (key) return translate(key, raw);
    const prefix = '🎉 Congratulations! You won! ';
    if (!raw.startsWith(prefix)) return raw;
    const originalPrize = raw.slice(prefix.length);
    let prize = originalPrize;
    const prizeKey = contestKeys.get(prize);
    const days = /^Subscription extended by (?<days>-?[0-9]+) days$/.exec(prize);
    const balance = /^Balance increased by (?<amount>-?[0-9]+(?:\.[0-9]+)?(?:e[+-]?[0-9]+)?)$/.exec(
      prize,
    );
    const unsupported = /^Prize type '(?<type>[^\r\n]{0,2048})' not supported$/.exec(prize);
    if (prizeKey) prize = translate(prizeKey, prize);
    else if (days?.groups) prize = translate('prizeDays', prize, days.groups);
    else if (balance?.groups) prize = translate('prizeBalance', prize, balance.groups);
    else if (unsupported?.groups) prize = translate('prizeUnsupported', prize, unsupported.groups);
    // Any operator-defined prize prose remains verbatim, inside the owned greeting.
    return translate('contestWon', raw, { prize });
  }
  if (scope === 'promo') {
    if (raw === 'Test access activated until unlimited') return translate('testUnlimited', raw);
    const test =
      /^Test access activated until (?<until>[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2})$/.exec(
        raw,
      );
    if (test?.groups) return translate('testUntil', raw, test.groups);
    const discount = /^Discount of (?<percent>[0-9]+)% activated!$/.exec(raw);
    if (discount?.groups) return translate('discount', raw, discount.groups);
    const expiring =
      /^Discount of (?<percent>[0-9]+)% activated! Valid until (?<until>[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2})$/.exec(
        raw,
      );
    if (expiring?.groups) return translate('discountUntil', raw, expiring.groups);
  }
  if (scope === 'servers') {
    const sync =
      /^Synced: (?<created>[0-9]+) created, (?<updated>[0-9]+) updated, (?<removed>[0-9]+) removed$/.exec(
        raw,
      );
    if (sync?.groups) return translate('serversSynced', raw, sync.groups);
  }
  if (scope === 'sync') {
    const key = syncKeys.get(raw);
    if (key) return translate(key, raw);
    const errors = /^Sync from panel completed with (?<count>[0-9]+) errors$/.exec(raw);
    if (errors?.groups) return translate('syncWithErrors', raw, errors.groups);
  }
  return raw;
}

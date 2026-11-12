/** Closed operator error contract; provider messages and identifiers stay hidden. */
const errorKeys = new Map<string, string>([
  ['tariff_changed', 'admin.tariffs.editConflict'],
  ['bs_settings_invalid', 'admin.tariffs.bs.invalid'],
  ['bs_topology_invalid', 'admin.tariffs.bs.errors.topology'],
  ['bs_usage_config_invalid', 'admin.tariffs.bs.errors.configuration'],
  ['bs_panel_unavailable', 'admin.tariffs.bs.errors.unavailable'],
  ['bs_binding_mismatch', 'admin.tariffs.bs.errors.binding'],
  ['bs_uncertain_policy_required', 'admin.tariffs.bs.errors.uncertainPolicy'],
]);

export function tariffSaveErrorKey(error: unknown): string {
  const detail = (error as { response?: { data?: { detail?: unknown } } } | null)?.response?.data
    ?.detail;
  const code =
    typeof detail === 'string'
      ? detail
      : detail && typeof detail === 'object' && 'code' in detail
        ? detail.code
        : null;
  return typeof code === 'string' ? (errorKeys.get(code) ?? 'common.error') : 'common.error';
}

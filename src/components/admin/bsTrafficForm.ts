import type { BsTrafficSettings } from '@/api/tariffs';

export interface BsTrafficFormState {
  enabled?: boolean;
  squads: string[];
  limitGb: string;
  topupEnabled: boolean;
  maxTopupGb: string;
  packages: { gb: string; rubles: string }[];
}

export function bsTrafficFormState(
  value: BsTrafficSettings | null | undefined,
): BsTrafficFormState | null {
  return value
    ? {
        ...(value.enabled === undefined ? {} : { enabled: value.enabled }),
        squads: [...value.squad_uuids],
        limitGb: String(value.limit_gb),
        topupEnabled: value.topup_enabled,
        maxTopupGb: String(value.max_topup_gb),
        packages: Object.entries(value.topup_packages).map(([gb, price]) => ({
          gb,
          rubles: (price / 100).toFixed(2),
        })),
      }
    : null;
}

const integer = (value: string, max: number) =>
  /^(0|[1-9]\d*)$/.test(value) && Number(value) <= max;

/** undefined = incomplete form; null = disable (server retains previously saved access terms). */
export function parseBsTrafficForm(
  state: BsTrafficFormState | null,
  ordinary: string[],
): BsTrafficSettings | null | undefined {
  if (!state || state.enabled === false) return null;
  if (
    !state.squads.length ||
    state.squads.length > 64 ||
    new Set(state.squads).size !== state.squads.length ||
    state.squads.some((id) => ordinary.includes(id)) ||
    !integer(state.limitGb, 1_000_000) ||
    !integer(state.maxTopupGb, 1_000_000)
  )
    return undefined;
  if (state.packages.length > 100) return undefined;
  const packages: Record<string, number> = {};
  for (const row of state.packages) {
    if (
      !integer(row.gb, 100_000) ||
      row.gb === '0' ||
      row.gb in packages ||
      !/^\d+(?:[.,]\d{1,2})?$/.test(row.rubles)
    )
      return undefined;
    const [whole, fraction = ''] = row.rubles.replace(',', '.').split('.');
    const price = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
    if (!Number.isSafeInteger(price) || price > 2_147_483_647) return undefined;
    packages[row.gb] = price;
  }
  if (state.topupEnabled && (state.limitGb === '0' || !state.packages.length)) return undefined;
  return {
    ...(state.enabled === undefined ? {} : { enabled: state.enabled }),
    squad_uuids: state.squads,
    limit_gb: Number(state.limitGb),
    topup_enabled: state.topupEnabled,
    topup_packages: packages,
    max_topup_gb: Number(state.maxTopupGb),
  };
}

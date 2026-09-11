import type {
  GeoCityRef,
  GeoNetwork,
  GeoOptions,
  GeoProbeMode,
  GeoScope,
  GeoScopeKind,
} from '@/api/reachability';
import { safeLocal } from '@/utils/safeStorage';

/** Вид целей GEO: хосты панели, свои адреса или один конфиг туннеля — один за раз. */
export type GeoTargetKind = 'hosts' | 'addresses' | 'vless';

/** Город в форме: токены для запуска плюс подпись по-русски для чипа. */
export interface GeoCityPick extends GeoCityRef {
  label?: string;
}

/** Состояние блоков «Цели» (вид), «Откуда» и «Метод» вкладки GEO. */
export interface GeoFormState {
  targetKind: GeoTargetKind;
  network: GeoNetwork;
  scopeKind: GeoScopeKind;
  district: string | null;
  region: string | null;
  cities: GeoCityPick[];
  isp: string | null;
  cityLimit: number;
  probeMode: GeoProbeMode;
  heavy: boolean;
}

/** Потолок городов чипами, как у оригинала: топ по населению; 0 — все. */
export const CITY_LIMITS = [10, 20, 30, 50, 0] as const;
/** «По пробе на каждого провайдера города» — служебное значение сервиса. */
export const ALL_ISPS = '__ALL__';
/** Правило сервиса: не больше 20 целей за запуск. */
export const MAX_GEO_TARGETS = 20;

export const DEFAULT_GEO_FORM: GeoFormState = {
  targetKind: 'hosts',
  network: 'res',
  scopeKind: 'all',
  district: null,
  region: null,
  cities: [],
  isp: null,
  cityLimit: 0,
  probeMode: 'tls',
  heavy: false,
};

const STORAGE_KEY = 'reachability.geo.form';

/** Охват уходит только выбранного вида; недозаполненный выбор — «вся РФ». */
function scopeOf(state: GeoFormState): GeoScope {
  if (state.scopeKind === 'district' && state.district) {
    return { kind: 'district', district: state.district };
  }
  if (state.scopeKind === 'region' && state.region) {
    return { kind: 'region', region: state.region };
  }
  if (state.scopeKind === 'cities' && state.cities.length > 0) {
    // Сервису — только токены; подпись чипа остаётся в форме.
    return {
      kind: 'cities',
      cities: state.cities.map(({ region, city, isp }) =>
        isp ? { region, city, isp } : { region, city },
      ),
    };
  }
  return { kind: 'all' };
}

export function toGeoOptions(state: GeoFormState): GeoOptions {
  const scope = scopeOf(state);
  return {
    network: state.network,
    scope,
    // «Каждый провайдер» сервис принимает только с охватом — без него отправляем «любой».
    isp: scope.kind === 'all' && state.isp === ALL_ISPS ? null : state.isp,
    city_limit: state.cityLimit,
    probe_mode: state.probeMode,
    heavy: state.probeMode === 'tcp' ? false : state.heavy,
  };
}

/** Список городов не запоминаем: он привязан к конкретной проверке, остальное — привычка. */
export function rememberGeoForm(state: GeoFormState): void {
  safeLocal.setJson(STORAGE_KEY, { ...state, cities: [] });
}

export function recallGeoForm(): GeoFormState | null {
  const stored = safeLocal.getJson<Partial<GeoFormState> | null>(STORAGE_KEY, null);
  if (!stored || typeof stored !== 'object') return null;
  return { ...DEFAULT_GEO_FORM, ...stored, cities: [] };
}

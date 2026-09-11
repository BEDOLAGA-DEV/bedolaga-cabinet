import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { GeoCity, GeoNetwork, GeoScopeKind } from '@/api/reachability';
import { DropdownSelect } from '@/components/admin/bulkActions/DropdownSelect';
import { ChoiceChips } from './ChoiceChips';
import { SectionHeading } from './SectionHeading';
import {
  ALL_ISPS,
  CITY_LIMITS,
  type GeoCityPick,
  type GeoFormState,
  sessionAllowed,
} from './geoForm';
import { useGeoCatalog, useGeoCitySearch } from './useGeoCatalog';

export interface GeoScopeProps {
  value: GeoFormState;
  onChange: (next: GeoFormState) => void;
}

const KEY = 'admin.reachability.geo';
const sameCity = (a: GeoCityPick, b: GeoCityPick) => a.region === b.region && a.city === b.city;

function CityPicker({
  value,
  onChange,
}: {
  value: GeoFormState;
  onChange: (fields: Partial<GeoFormState>) => void;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const search = useGeoCitySearch(value.network, query);
  const found = search.data?.cities ?? [];
  const addCity = (city: GeoCity) => {
    const pick: GeoCityPick = {
      region: city.region,
      city: city.city,
      label: `${city.city_ru || city.city} · ${city.region_ru || city.region}`,
    };
    if (value.cities.some((item) => sameCity(item, pick))) return;
    onChange({ cities: [...value.cities, pick] });
  };
  return (
    <div className="space-y-2">
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        aria-label={t(`${KEY}.scope.cityFind`)}
        placeholder={t(`${KEY}.scope.cityFind`)}
        className="input w-full text-sm"
      />
      {found.length > 0 && (
        <ul className="max-h-48 space-y-1 overflow-y-auto">
          {found.map((city) => (
            <li key={`${city.region}:${city.city}`}>
              <button
                type="button"
                onClick={() => addCity(city)}
                className="w-full rounded-lg px-2 py-1.5 text-left text-sm text-dark-100 hover:bg-dark-800"
              >
                {city.city_ru}{' '}
                <span className="text-xs text-dark-400">
                  · {city.region_ru} · {t(`${KEY}.scope.isps`, { count: city.isps.length })}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {search.data?.cities_truncated && (
        <p className="text-xs text-dark-400">
          {t(`${KEY}.scope.cityTruncated`, { total: search.data.cities_total ?? 0 })}
        </p>
      )}
      <div className="flex flex-wrap gap-1.5">
        {value.cities.map((city) => (
          <button
            key={`${city.region}:${city.city}`}
            type="button"
            onClick={() => onChange({ cities: value.cities.filter((item) => item !== city) })}
            aria-label={`${t(`${KEY}.scope.removeCity`)}: ${city.label ?? city.city}`}
            title={t(`${KEY}.scope.removeCity`)}
            className="rounded-full bg-accent-500/10 px-2.5 py-1 text-xs text-accent-400"
          >
            {city.label ?? city.city}
            {city.isp ? ` · ${city.isp}` : ''} ×
          </button>
        ))}
      </div>
    </div>
  );
}

/** Блок «Откуда» как у оригинала: сеть, охват, потолок городов, провайдер; города — поиском по справочнику. */
export function GeoScope({ value, onChange }: GeoScopeProps) {
  const { t } = useTranslation();
  const { data: catalog } = useGeoCatalog(value.network);
  const patch = (fields: Partial<GeoFormState>) => onChange({ ...value, ...fields });
  const scopeOptions: Array<{ value: GeoScopeKind; label: string }> = [
    { value: 'all', label: t(`${KEY}.scope.all`) },
    { value: 'district', label: t(`${KEY}.scope.district`) },
    { value: 'region', label: t(`${KEY}.scope.region`) },
    { value: 'cities', label: t(`${KEY}.scope.cities`) },
  ];
  const allIspsAllowed = value.scopeKind !== 'all';
  const everyIsp = value.isp === ALL_ISPS;

  return (
    <section aria-labelledby="reachability-geo-scope" className="space-y-4">
      <SectionHeading
        id="reachability-geo-scope"
        title={t(`${KEY}.scope.title`)}
        hint={t(`${KEY}.scope.hint`)}
      />

      <ChoiceChips<GeoNetwork>
        label={t(`${KEY}.network.label`)}
        showLabel
        value={value.network}
        options={[
          { value: 'res', label: t(`${KEY}.network.res`) },
          { value: 'mob', label: t(`${KEY}.network.mob`) },
        ]}
        onChange={(network) => patch({ network })}
      />

      <ChoiceChips<GeoScopeKind>
        label={t(`${KEY}.scope.label`)}
        showLabel
        value={value.scopeKind}
        options={scopeOptions}
        onChange={(scopeKind) =>
          // «Каждый провайдер» без охвата сервис не принимает — снимаем вместе с охватом.
          patch({ scopeKind, isp: scopeKind === 'all' && everyIsp ? null : value.isp })
        }
      />

      {value.scopeKind === 'district' && (
        <ChoiceChips<string>
          label={t(`${KEY}.scope.pickDistrict`)}
          value={value.district ?? ''}
          options={(catalog?.districts ?? []).map((item) => ({
            value: item.code,
            label: item.name,
          }))}
          onChange={(district) => patch({ district })}
        />
      )}

      {value.scopeKind === 'region' && (
        <label className="block">
          <span className="sr-only">{t(`${KEY}.scope.pickRegion`)}</span>
          <DropdownSelect
            value={value.region ?? ''}
            onChange={(region) => patch({ region: region || null })}
            options={[
              { value: '', label: t(`${KEY}.scope.pickRegion`) },
              ...(catalog?.regions ?? []).map((region) => ({
                value: region.token,
                label: region.district ? `${region.name} · ${region.district}` : region.name,
              })),
            ]}
          />
        </label>
      )}

      {value.scopeKind === 'cities' && <CityPicker value={value} onChange={patch} />}
      {sessionAllowed(value) && (
        <p className="flex flex-wrap items-center gap-2 text-xs text-dark-300">
          <span>{t(`${KEY}.scope.sessionNote`, { ip: value.expectExitIp || '' })}</span>
          <button
            type="button"
            onClick={() => patch({ session: null, expectExitIp: null })}
            className="text-accent-400 hover:underline"
          >
            {t(`${KEY}.scope.sessionDrop`)}
          </button>
        </p>
      )}

      <ChoiceChips<string>
        label={t(`${KEY}.limit.label`)}
        showLabel
        value={String(value.cityLimit)}
        options={CITY_LIMITS.map((limit) => ({
          value: String(limit),
          label: limit === 0 ? t(`${KEY}.limit.all`) : String(limit),
        }))}
        onChange={(limit) => patch({ cityLimit: Number(limit) })}
      />

      <div className="space-y-2">
        <label className="block">
          <span className="mb-1 block text-xs text-dark-400">{t(`${KEY}.isp.label`)}</span>
          <DropdownSelect
            value={everyIsp ? '' : (value.isp ?? '')}
            onChange={(isp) => patch({ isp: isp || null })}
            className={everyIsp ? 'pointer-events-none opacity-50' : undefined}
            options={[
              { value: '', label: t(`${KEY}.isp.any`) },
              ...(catalog?.isps ?? []).map((isp) => ({
                value: isp.token,
                label: `${isp.name} (${isp.cities})`,
              })),
            ]}
          />
        </label>
        <button
          type="button"
          aria-pressed={everyIsp}
          disabled={!allIspsAllowed}
          onClick={() => patch({ isp: everyIsp ? null : ALL_ISPS })}
          className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-50"
          title={allIspsAllowed ? undefined : t(`${KEY}.isp.allNeedsScope`)}
        >
          {t(`${KEY}.isp.all`)}
        </button>
      </div>
    </section>
  );
}

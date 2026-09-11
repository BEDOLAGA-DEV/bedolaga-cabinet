import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { GeoCity, GeoCityRef, GeoNetwork, GeoScopeKind } from '@/api/reachability';
import { ChoiceChips } from './ChoiceChips';
import { SectionHeading } from './SectionHeading';
import { ALL_ISPS, CITY_LIMITS, type GeoFormState } from './geoForm';
import { useGeoCatalog, useGeoCitySearch } from './useGeoCatalog';

export interface GeoScopeProps {
  value: GeoFormState;
  onChange: (next: GeoFormState) => void;
}

const sameCity = (a: GeoCityRef, b: GeoCityRef) => a.region === b.region && a.city === b.city;

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
    const ref = { region: city.region, city: city.city };
    if (value.cities.some((item) => sameCity(item, ref))) return;
    onChange({ cities: [...value.cities, ref] });
  };
  return (
    <div className="space-y-2">
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        aria-label={t('admin.reachability.geo.scope.cityFind')}
        placeholder={t('admin.reachability.geo.scope.cityFind')}
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
                  · {city.region_ru} ·{' '}
                  {t('admin.reachability.geo.scope.isps', { count: city.isps.length })}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {search.data?.cities_truncated && (
        <p className="text-xs text-dark-400">
          {t('admin.reachability.geo.scope.cityTruncated', {
            total: search.data.cities_total ?? 0,
          })}
        </p>
      )}
      <div className="flex flex-wrap gap-1.5">
        {value.cities.map((city) => (
          <button
            key={`${city.region}:${city.city}`}
            type="button"
            onClick={() => onChange({ cities: value.cities.filter((item) => item !== city) })}
            aria-label={`${t('admin.reachability.geo.scope.removeCity')}: ${city.city}`}
            title={t('admin.reachability.geo.scope.removeCity')}
            className="rounded-full bg-accent-500/10 px-2.5 py-1 text-xs text-accent-400"
          >
            {city.city}
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
  const { data: catalog, isLoading } = useGeoCatalog(value.network);
  const patch = (fields: Partial<GeoFormState>) => onChange({ ...value, ...fields });
  const scopeOptions: Array<{ value: GeoScopeKind; label: string }> = [
    { value: 'all', label: t('admin.reachability.geo.scope.all') },
    { value: 'district', label: t('admin.reachability.geo.scope.district') },
    { value: 'region', label: t('admin.reachability.geo.scope.region') },
    { value: 'cities', label: t('admin.reachability.geo.scope.cities') },
  ];
  const allIspsAllowed = value.scopeKind !== 'all';
  const everyIsp = value.isp === ALL_ISPS;

  return (
    <section aria-labelledby="reachability-geo-scope" className="space-y-4">
      <SectionHeading
        id="reachability-geo-scope"
        title={t('admin.reachability.geo.scope.title')}
        hint={t('admin.reachability.geo.scope.hint')}
      />

      <ChoiceChips<GeoNetwork>
        label={t('admin.reachability.geo.network.label')}
        showLabel
        value={value.network}
        options={[
          { value: 'res', label: t('admin.reachability.geo.network.res') },
          { value: 'mob', label: t('admin.reachability.geo.network.mob') },
        ]}
        onChange={(network) => patch({ network })}
      />

      <ChoiceChips<GeoScopeKind>
        label={t('admin.reachability.geo.scope.label')}
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
          label={t('admin.reachability.geo.scope.pickDistrict')}
          value={value.district ?? ''}
          options={(catalog?.districts ?? []).map((item) => ({
            value: item.code,
            label: item.name,
          }))}
          onChange={(district) => patch({ district })}
        />
      )}

      {value.scopeKind === 'region' && (
        <select
          aria-label={t('admin.reachability.geo.scope.pickRegion')}
          value={value.region ?? ''}
          onChange={(event) => patch({ region: event.target.value || null })}
          className="input w-full text-sm"
        >
          <option value="">{t('admin.reachability.geo.scope.pickRegion')}</option>
          {(catalog?.regions ?? []).map((region) => (
            <option key={region.token} value={region.token}>
              {region.name} · {region.district}
            </option>
          ))}
        </select>
      )}

      {value.scopeKind === 'cities' && <CityPicker value={value} onChange={patch} />}

      <ChoiceChips<string>
        label={t('admin.reachability.geo.limit.label')}
        showLabel
        value={String(value.cityLimit)}
        options={CITY_LIMITS.map((limit) => ({
          value: String(limit),
          label: limit === 0 ? t('admin.reachability.geo.limit.all') : String(limit),
        }))}
        onChange={(limit) => patch({ cityLimit: Number(limit) })}
      />

      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="reachability-geo-isp" className="text-xs text-dark-400">
          {t('admin.reachability.geo.isp.label')}
        </label>
        <select
          id="reachability-geo-isp"
          value={everyIsp ? '' : (value.isp ?? '')}
          onChange={(event) => patch({ isp: event.target.value || null })}
          disabled={isLoading || everyIsp}
          className="input min-w-0 flex-1 text-sm"
        >
          <option value="">{t('admin.reachability.geo.isp.any')}</option>
          {(catalog?.isps ?? []).map((isp) => (
            <option key={isp.token} value={isp.token}>
              {isp.name} ({isp.cities})
            </option>
          ))}
        </select>
        <button
          type="button"
          aria-pressed={everyIsp}
          disabled={!allIspsAllowed}
          onClick={() => patch({ isp: everyIsp ? null : ALL_ISPS })}
          className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-50"
          title={allIspsAllowed ? undefined : t('admin.reachability.geo.isp.allNeedsScope')}
        >
          {t('admin.reachability.geo.isp.all')}
        </button>
      </div>
    </section>
  );
}

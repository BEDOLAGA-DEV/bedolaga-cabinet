import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useBranding } from '../hooks/useBranding';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { landingApi } from '../api/landings';
import type { LandingTariff } from '../api/landings';
import { formatPrice } from '../utils/format';

const ShieldIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
    />
  </svg>
);

const BoltIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
    />
  </svg>
);

const GlobeIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"
    />
  </svg>
);

const DevicesIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25"
    />
  </svg>
);

const LockIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
    />
  </svg>
);

const SupportIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
    />
  </svg>
);

const ArrowRightIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
  </svg>
);

const CheckIcon = () => (
  <svg
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2.5}
    className="h-4 w-4 text-accent-400"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

type FeatureKey = 'security' | 'speed' | 'servers' | 'devices' | 'privacy' | 'support';

const FEATURES: { key: FeatureKey; icon: ReactNode }[] = [
  { key: 'security', icon: <ShieldIcon /> },
  { key: 'speed', icon: <BoltIcon /> },
  { key: 'servers', icon: <GlobeIcon /> },
  { key: 'devices', icon: <DevicesIcon /> },
  { key: 'privacy', icon: <LockIcon /> },
  { key: 'support', icon: <SupportIcon /> },
];

const STEPS: { key: 'register' | 'choose' | 'connect' }[] = [
  { key: 'register' },
  { key: 'choose' },
  { key: 'connect' },
];

export default function Home() {
  const { t } = useTranslation();
  const { appName, logoLetter, hasCustomLogo, logoUrl } = useBranding();
  const [logoLoaded, setLogoLoaded] = useState(false);

  useEffect(() => {
    document.title = appName ? `${appName} — ${t('home.meta.title')}` : t('home.meta.title');
  }, [appName, t]);

  const cabinetHost = import.meta.env.VITE_CABINET_HOST;
  const needsCrossOrigin = Boolean(cabinetHost) && cabinetHost !== window.location.hostname;
  const buildCabinetHref = (path: string) =>
    needsCrossOrigin ? `${window.location.protocol}//${cabinetHost}${path}` : path;

  const CabinetLink = ({
    to,
    children,
    className,
    ariaLabel,
  }: {
    to: string;
    children: ReactNode;
    className: string;
    ariaLabel?: string;
  }) =>
    needsCrossOrigin ? (
      <a href={buildCabinetHref(to)} className={className} aria-label={ariaLabel}>
        {children}
      </a>
    ) : (
      <Link to={to} className={className} aria-label={ariaLabel}>
        {children}
      </Link>
    );

  const { data: landingData } = useQuery({
    queryKey: ['home-landing', 'main'],
    queryFn: () => landingApi.getConfig('main'),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const tariffs: LandingTariff[] = landingData?.tariffs ?? [];
  const getCheapestPrice = (tariff: LandingTariff): number | null => {
    if (tariff.is_daily) {
      return tariff.daily_price_kopeks ?? null;
    }
    if (!tariff.periods.length) return null;
    // Показываем минимальную стоимость за 30 дней среди всех периодов:
    // годовой тариф эффективно дешевле месячного, и цена «от» должна это отражать.
    return Math.min(
      ...tariff.periods
        .filter((p) => p.days > 0)
        .map((p) => Math.round((p.price_kopeks / p.days) * 30)),
    );
  };

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-dark-950 text-dark-100">
      {/* Background effects */}
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-br from-dark-950 via-dark-900 to-dark-950" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-accent-500/15 via-transparent to-transparent" />
      <div className="pointer-events-none fixed -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-accent-500/10 blur-3xl" />

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-dark-800/50 bg-dark-950/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link to="/home" className="flex items-center gap-2.5">
            <div className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border border-dark-700/60 bg-dark-800/80">
              <span
                className={`absolute text-base font-bold text-accent-400 transition-opacity duration-200 ${
                  hasCustomLogo && logoLoaded ? 'opacity-0' : 'opacity-100'
                }`}
              >
                {logoLetter}
              </span>
              {hasCustomLogo && logoUrl && (
                <img
                  src={logoUrl}
                  alt={appName || 'Logo'}
                  className={`absolute h-full w-full object-contain transition-opacity duration-200 ${
                    logoLoaded ? 'opacity-100' : 'opacity-0'
                  }`}
                  onLoad={() => setLogoLoaded(true)}
                />
              )}
            </div>
            <span className="text-base font-semibold tracking-tight text-dark-50">{appName}</span>
          </Link>

          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <CabinetLink to="/" className="btn-primary hidden h-9 px-4 text-sm sm:inline-flex">
              {t('home.header.cabinet')}
              <ArrowRightIcon />
            </CabinetLink>
            <CabinetLink
              to="/"
              className="btn-primary inline-flex h-9 px-3 text-sm sm:hidden"
              ariaLabel={t('home.header.cabinet')}
            >
              {t('home.header.cabinetShort')}
            </CabinetLink>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-4 pb-20 pt-10 sm:px-6 sm:pt-16">
        {/* Hero */}
        <section className="text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-accent-500/30 bg-accent-500/10 px-3 py-1 text-xs font-medium text-accent-300">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-500" />
            </span>
            {t('home.hero.badge')}
          </div>

          <h1 className="mt-6 font-display text-4xl font-bold leading-tight tracking-tight text-dark-50 sm:text-5xl md:text-6xl">
            {t('home.hero.titleLead')}{' '}
            <span className="bg-gradient-to-r from-accent-300 via-accent-400 to-accent-500 bg-clip-text text-transparent">
              {t('home.hero.titleAccent')}
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-dark-300 sm:text-lg">
            {t('home.hero.subtitle')}
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <CabinetLink to="/" className="btn-primary h-11 px-6 text-sm">
              {t('home.hero.ctaPrimary')}
              <ArrowRightIcon />
            </CabinetLink>
            <a href="#features" className="btn-secondary h-11 px-6 text-sm">
              {t('home.hero.ctaSecondary')}
            </a>
          </div>

          {/* Quick stats */}
          <div className="mx-auto mt-12 grid max-w-3xl grid-cols-3 gap-2 sm:gap-4">
            {(['servers', 'devices', 'uptime'] as const).map((key) => (
              <div key={key} className="card p-4 sm:p-5">
                <div className="font-display text-2xl font-bold text-accent-400 sm:text-3xl">
                  {t(`home.stats.${key}.value`)}
                </div>
                <div className="mt-1 text-xs text-dark-400 sm:text-sm">
                  {t(`home.stats.${key}.label`)}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section id="features" className="mt-24 scroll-mt-20 sm:mt-28">
          <div className="text-center">
            <h2 className="font-display text-3xl font-bold text-dark-50 sm:text-4xl">
              {t('home.features.title')}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-dark-400 sm:text-base">
              {t('home.features.subtitle')}
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ key, icon }) => (
              <div
                key={key}
                className="card group transition-all hover:border-accent-500/30 hover:bg-dark-900/80"
              >
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent-500/10 text-accent-400 ring-1 ring-accent-500/20 transition-colors group-hover:bg-accent-500/20">
                  {icon}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-dark-50">
                  {t(`home.features.items.${key}.title`)}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-dark-400">
                  {t(`home.features.items.${key}.description`)}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        {tariffs.length > 0 && (
          <section id="pricing" className="mt-24 scroll-mt-20 sm:mt-28">
            <div className="text-center">
              <h2 className="font-display text-3xl font-bold text-dark-50 sm:text-4xl">
                {t('home.pricing.title')}
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm text-dark-400 sm:text-base">
                {t('home.pricing.subtitle')}
              </p>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {tariffs.map((tariff) => {
                const cheapest = getCheapestPrice(tariff);
                return (
                  <CabinetLink
                    key={tariff.id}
                    to="/buy/main"
                    className="card group flex flex-col transition-all hover:border-accent-500/30 hover:bg-dark-900/80"
                  >
                    <h3 className="text-lg font-semibold text-dark-50">{tariff.name}</h3>
                    {tariff.description && (
                      <p className="mt-1 text-sm text-dark-400">{tariff.description}</p>
                    )}

                    <div className="mt-4 flex items-center gap-4 text-xs text-dark-400">
                      <span className="flex items-center gap-1.5">
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                          />
                        </svg>
                        {tariff.traffic_limit_gb === 0
                          ? t('home.pricing.unlimited')
                          : `${tariff.traffic_limit_gb} ${t('home.pricing.gb')} ${t('common.units.perMonthTraffic')}`}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3"
                          />
                        </svg>
                        {t('home.pricing.devices', { count: tariff.device_limit })}
                      </span>
                    </div>

                    {cheapest != null && (
                      <div className="mt-6 border-t border-dark-800/50 pt-4">
                        <div className="text-xs text-dark-500">
                          {tariff.is_daily ? t('home.pricing.daily') : t('home.pricing.from')}
                        </div>
                        <div className="mt-1 flex items-baseline gap-1 font-display text-3xl font-bold text-accent-400">
                          {formatPrice(cheapest)}
                          <span className="text-base font-normal text-dark-400">
                            {tariff.is_daily
                              ? t('home.pricing.perDay')
                              : t('home.pricing.perMonth', '/мес')}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="mt-4 flex items-center gap-1.5 text-sm font-medium text-accent-400">
                      {t('home.pricing.select')}
                      <ArrowRightIcon />
                    </div>
                  </CabinetLink>
                );
              })}
            </div>

            <div className="mt-10 text-center">
              <CabinetLink to="/buy/main" className="btn-primary h-11 px-6 text-sm">
                {t('home.pricing.cta')}
                <ArrowRightIcon />
              </CabinetLink>
            </div>
          </section>
        )}

        {/* How it works */}
        <section className="mt-24 sm:mt-28">
          <div className="text-center">
            <h2 className="font-display text-3xl font-bold text-dark-50 sm:text-4xl">
              {t('home.steps.title')}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-dark-400 sm:text-base">
              {t('home.steps.subtitle')}
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {STEPS.map(({ key }, index) => (
              <div key={key} className="card relative overflow-hidden">
                <span className="absolute right-4 top-3 font-display text-5xl font-bold text-dark-800">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div className="relative">
                  <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-accent-500/10 text-sm font-semibold text-accent-400 ring-1 ring-accent-500/20">
                    {index + 1}
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-dark-50">
                    {t(`home.steps.items.${key}.title`)}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-dark-400">
                    {t(`home.steps.items.${key}.description`)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Why / benefits list */}
        <section className="mt-24 sm:mt-28">
          <div className="card relative overflow-hidden p-6 sm:p-10">
            <div className="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full bg-accent-500/10 blur-3xl" />
            <div className="relative grid gap-10 md:grid-cols-2 md:items-center">
              <div>
                <h2 className="font-display text-3xl font-bold text-dark-50 sm:text-4xl">
                  {t('home.why.title')}
                </h2>
                <p className="mt-3 text-sm text-dark-400 sm:text-base">{t('home.why.subtitle')}</p>
              </div>
              <ul className="space-y-3">
                {(['noLogs', 'modernProtocols', 'unlimited', 'support'] as const).map((key) => (
                  <li key={key} className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-accent-500/10 ring-1 ring-accent-500/20">
                      <CheckIcon />
                    </span>
                    <span className="text-sm text-dark-200 sm:text-base">
                      {t(`home.why.items.${key}`)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mt-24 text-center sm:mt-28">
          <div className="card relative overflow-hidden p-8 sm:p-12">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent-500/10 via-transparent to-accent-500/5" />
            <div className="relative">
              <h2 className="font-display text-3xl font-bold text-dark-50 sm:text-4xl">
                {t('home.cta.title')}
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm text-dark-300 sm:text-base">
                {t('home.cta.subtitle')}
              </p>
              <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <CabinetLink to="/" className="btn-primary h-11 px-6 text-sm">
                  {t('home.cta.primary')}
                  <ArrowRightIcon />
                </CabinetLink>
                <Link to="/support" className="btn-secondary h-11 px-6 text-sm">
                  {t('home.cta.secondary')}
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer — matches Login / AppShell style */}
      <footer className="relative border-t border-dark-800/50 bg-dark-950/60">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-3 gap-y-1.5 px-4 py-6 text-xs text-dark-500 sm:px-6">
          {import.meta.env.VITE_LEGAL_INFO && (
            <span className="w-full text-center text-dark-600">
              {import.meta.env.VITE_LEGAL_INFO}
            </span>
          )}
          <Link to="/support" className="transition-colors hover:text-dark-300">
            {t('nav.support')}
          </Link>
          <span className="text-dark-700">·</span>
          <Link to="/info?tab=rules" className="transition-colors hover:text-dark-300">
            {t('info.rules')}
          </Link>
          <span className="text-dark-700">·</span>
          <Link to="/info?tab=privacy" className="transition-colors hover:text-dark-300">
            {t('info.privacy')}
          </Link>
          <span className="text-dark-700">·</span>
          <Link to="/info?tab=offer" className="transition-colors hover:text-dark-300">
            {t('info.offer')}
          </Link>
          <span className="text-dark-700">·</span>
          <Link to="/info?tab=personal-data" className="transition-colors hover:text-dark-300">
            {t('info.personalData')}
          </Link>
        </div>
      </footer>
    </div>
  );
}

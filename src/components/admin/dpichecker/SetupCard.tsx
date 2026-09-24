import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import type { DpiStatus } from '@/api/dpichecker';
import { cn } from '@/lib/utils';
import { usePlatform } from '@/platform';

export const DPICHECKER_SETTINGS_PATH = '/admin/settings?section=sys_dpichecker';
export const DPICHECKER_SITE_URL = 'https://dpichecker.st/';

type StepKey = 'key' | 'enable' | 'reference' | 'rights';

/** Раздел выключен или без ключа: что сделать и где, а не пустая страница. */
export function SetupCard({ status }: { status: DpiStatus }) {
  const { t } = useTranslation();
  const { openLink } = usePlatform();
  const steps: Array<{ key: StepKey; done: boolean | null }> = [
    { key: 'key', done: status.configured },
    { key: 'enable', done: status.enabled },
    { key: 'reference', done: status.reference?.short_uuid ? true : null },
    { key: 'rights', done: null },
  ];
  return (
    <section
      aria-labelledby="dpichecker-setup"
      className="rounded-2xl border border-warning-500/30 bg-warning-500/10 p-4 sm:p-5"
    >
      <h2 id="dpichecker-setup" className="text-lg font-semibold text-dark-100">
        {t(
          status.enabled
            ? 'admin.dpichecker.setup.titleNotConfigured'
            : 'admin.dpichecker.setup.titleDisabled',
        )}
      </h2>
      <p className="mt-1 text-sm text-dark-300">{t('admin.dpichecker.setup.intro')}</p>
      <ol className="mt-4 space-y-3">
        {steps.map((step, index) => (
          <li key={step.key} className="flex gap-3">
            <span
              aria-hidden="true"
              className={cn(
                'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                step.done
                  ? 'border-success-500/60 bg-success-500/15 text-success-400'
                  : 'border-dark-600 text-dark-300',
              )}
            >
              {step.done ? '✓' : index + 1}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-dark-100">
                {t(`admin.dpichecker.setup.${step.key}`)}
              </span>
              <span className="block text-xs text-dark-400">
                {t(`admin.dpichecker.setup.${step.key}Hint`)}
              </span>
            </span>
          </li>
        ))}
      </ol>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Link to={DPICHECKER_SETTINGS_PATH} className="btn-primary min-h-[44px] px-4 text-sm">
          {t('admin.dpichecker.setup.openSettings')}
        </Link>
        <button
          type="button"
          className="btn-secondary min-h-[44px] px-4 text-sm"
          onClick={() => openLink(DPICHECKER_SITE_URL)}
        >
          {t('admin.dpichecker.setup.openSite')}
        </button>
      </div>
      <p className="mt-3 text-xs text-dark-400">{t('admin.dpichecker.setup.envNote')}</p>
    </section>
  );
}

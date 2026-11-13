// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { SettingDefinition } from '@/api/adminSettings';
import { SettingRow } from './SettingRow';
import { SettingsTableRow } from './SettingsTableRow';
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
afterEach(cleanup);
const warnings = {
  ru: 'Разделённый учёт не включается. Точность учёта не гарантируется.',
  en: 'Does not enable split accounting or guarantee exact accounting.',
  fa: 'حسابداری تفکیکی را فعال نمی‌کند و دقت حسابداری را تضمین نمی‌کند.',
  zh: '不会启用分离流量计费，也不保证计费精确。',
};
it.each([SettingRow, SettingsTableRow])(
  'renders localized boolean warnings as text in %s',
  (Row) => {
    for (const warning of Object.values(warnings)) {
      for (const key of [
        'BS_TRAFFIC_UNCERTAIN_WRITE_OFF_ENABLED',
        'BS_TRAFFIC_FORCE_DISCONNECT_ENABLED',
      ]) {
        const setting: SettingDefinition = {
          key,
          name: key,
          category: { key: 'TRAFFIC', label: 'Traffic' },
          type: 'bool',
          is_optional: false,
          current: false,
          original: false,
          has_override: false,
          read_only: false,
          env_locked: false,
          choices: [],
          hint: { description: 'Description', format: '', example: '', warning },
        };
        const { unmount, container } = render(
          <Row
            setting={setting}
            isFavorite={false}
            onToggleFavorite={() => {}}
            onUpdate={() => {}}
            onReset={() => {}}
          />,
        );
        expect(screen.getByText(warning)).toBeTruthy();
        expect(container.querySelector('script')).toBeNull();
        unmount();
      }
    }
  },
);
it.each([SettingRow, SettingsTableRow])('does not interpret warning markup in %s', (Row) => {
  const warning = '<img src=x onerror=alert(1)>';
  const setting = {
    key: 'EXAMPLE',
    name: 'EXAMPLE',
    type: 'bool',
    current: false,
    hint: { warning },
  } as SettingDefinition;
  const { container } = render(
    <Row
      setting={setting}
      isFavorite={false}
      onToggleFavorite={() => {}}
      onUpdate={() => {}}
      onReset={() => {}}
    />,
  );
  expect(screen.getByText(warning)).toBeTruthy();
  expect(container.querySelector('img')).toBeNull();
});

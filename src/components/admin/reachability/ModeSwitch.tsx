import type { ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import {
  GlobeIcon,
  HistoryIcon,
  MapPinIcon,
  ScanIcon,
  ServerIcon,
  ShieldIcon,
} from '@/components/icons';
import { IconTabs } from '../IconTabs';
import { type PageTab, TAB_KEYS } from './deepLink';

interface ModeSwitchProps {
  value: PageTab;
  onChange: (mode: PageTab) => void;
  /** Какие вкладки показывать; по умолчанию четыре запуска и история. */
  modes?: readonly PageTab[];
}

/** Значки вкладок, как у подвкладок оригинала bsbord.com: сервер, глобус, рамка скана, щит, булавка, часы. */
const ICONS: Record<PageTab, ComponentType<{ className?: string }>> = {
  hosts: ServerIcon,
  ip: GlobeIcon,
  cidr: ScanIcon,
  vless: ShieldIcon,
  geo: MapPinIcon,
  history: HistoryIcon,
};

/**
 * Вкладки как в оригинале bsbord.com: хосты панели, IP / домен, CIDR, подписка, GEO — и «История»
 * последней, в той же полосе, где её ищут первым делом. На телефоне значок над подписью, чтобы
 * все шесть умещались в строку без переносов; на десктопе значок рядом с подписью.
 */
export function ModeSwitch({ value, onChange, modes = TAB_KEYS }: ModeSwitchProps) {
  const { t } = useTranslation();
  // На телефоне подпись в две строки: в одну шесть вкладок налезали друг на друга
  // («IP / доменСкан CIDRVPN-тест»).
  const tabs = modes.map((mode) => ({
    value: mode,
    label: t(`admin.reachability.switch.${mode}`),
    icon: ICONS[mode],
  }));
  return (
    <IconTabs
      value={value}
      tabs={tabs}
      onChange={onChange}
      label={t('admin.reachability.switch.label')}
    />
  );
}

// ──────────────────────────────────────────────────────────────────
// TrafficIcons — the icon set used across AdminTrafficUsage (header
// controls, filter buttons, sort indicator, etc.). The glyphs now come
// from the central Phosphor barrel (`@/components/icons`); only the
// sort indicator keeps its custom `direction` prop and is therefore a
// thin local wrapper over the panel's Phosphor caret icons.
// ──────────────────────────────────────────────────────────────────

import { PiCaretDown, PiCaretUpDown, PiCaretUp } from 'react-icons/pi';

export {
  CalendarIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  FilterIcon,
  GlobeIcon,
  RefreshIcon,
  SearchIcon,
  ServerIcon,
  ServerSmallIcon,
  ShieldIcon,
  StatusIcon,
  XIcon,
} from '@/components/icons';

export const SortIcon = ({ direction }: { direction: false | 'asc' | 'desc' }) =>
  direction === 'asc' ? (
    <PiCaretUp className="ml-1 inline h-3 w-3" />
  ) : direction === 'desc' ? (
    <PiCaretDown className="ml-1 inline h-3 w-3" />
  ) : (
    <PiCaretUpDown className="ml-1 inline h-3 w-3" />
  );

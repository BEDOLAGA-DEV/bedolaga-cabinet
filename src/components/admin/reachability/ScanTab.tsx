import type { ReachabilityStatus } from '@/api/reachability';
import { ComingSoon } from './ComingSoon';

export interface ScanTabProps {
  status: ReachabilityStatus | undefined;
}

export function ScanTab(_props: ScanTabProps) {
  return <ComingSoon />;
}

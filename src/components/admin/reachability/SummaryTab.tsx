import type { ReachabilityStatus } from '@/api/reachability';
import { ComingSoon } from './ComingSoon';

export interface SummaryTabProps {
  status: ReachabilityStatus | undefined;
}

export function SummaryTab(_props: SummaryTabProps) {
  return <ComingSoon />;
}

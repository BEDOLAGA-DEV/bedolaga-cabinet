import type { ReachabilityStatus } from '@/api/reachability';
import { ComingSoon } from './ComingSoon';
import type { DeepLinkTarget } from './deepLink';

export interface ProbeTabProps {
  status: ReachabilityStatus | undefined;
  preselected: DeepLinkTarget[];
}

export function ProbeTab(_props: ProbeTabProps) {
  return <ComingSoon />;
}

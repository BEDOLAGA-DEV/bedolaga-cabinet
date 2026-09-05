import type { ReachabilityStatus } from '@/api/reachability';
import { ComingSoon } from './ComingSoon';

export interface VlessTabProps {
  status: ReachabilityStatus | undefined;
  userId: number | null;
  shortUuid: string | null;
}

export function VlessTab(_props: VlessTabProps) {
  return <ComingSoon />;
}

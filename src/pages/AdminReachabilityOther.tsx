import { Navigate, useSearchParams } from 'react-router';
import { REACHABILITY_PATH } from '../components/admin/reachability/deepLink';

/** Старый адрес «Проверить адрес или подписку»: всё живёт на одной странице раздела. */
export default function AdminReachabilityOther() {
  const [searchParams] = useSearchParams();
  const next = new URLSearchParams(searchParams);
  if (!next.has('kind')) next.set('kind', 'ip');
  return <Navigate to={`${REACHABILITY_PATH}?${next.toString()}`} replace />;
}

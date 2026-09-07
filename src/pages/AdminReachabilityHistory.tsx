import { Navigate, useSearchParams } from 'react-router';
import { REACHABILITY_PATH } from '../components/admin/reachability/deepLink';

/** Старый адрес журнала: история проверок теперь внизу страницы раздела, как на bsbord.com. */
export default function AdminReachabilityHistory() {
  const [searchParams] = useSearchParams();
  const query = searchParams.toString();
  return <Navigate to={query ? `${REACHABILITY_PATH}?${query}` : REACHABILITY_PATH} replace />;
}

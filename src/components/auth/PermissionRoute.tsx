import { Navigate, useLocation } from 'react-router';
import { useAuthStore } from '../../store/auth';
import { usePermissionStore } from '../../store/permissions';
import { saveReturnUrl } from '../../utils/token';
import PageLoader from '../common/PageLoader';
import Layout from '../layout/Layout';

interface PermissionRouteProps {
  children: React.ReactNode;
  /** Single permission to check */
  permission?: string;
  /** Multiple permissions (OR by default, AND if requireAll is true) */
  permissions?: string[];
  /** When true, ALL listed permissions are required instead of ANY */
  requireAll?: boolean;
}

export function PermissionRoute({
  children,
  permission,
  permissions,
  requireAll = false,
}: PermissionRouteProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const isAdmin = useAuthStore((state) => state.isAdmin);
  const location = useLocation();

  const permissionsLoaded = usePermissionStore((state) => state.isLoaded);
  const hasPermission = usePermissionStore((state) => state.hasPermission);
  const hasAnyPermission = usePermissionStore((state) => state.hasAnyPermission);
  const hasAllPermissions = usePermissionStore((state) => state.hasAllPermissions);

  // Still loading auth state, or admin but permissions not fetched yet
  if (isLoading || (isAdmin && !permissionsLoaded)) {
    return <PageLoader variant="light" />;
  }

  if (!isAuthenticated) {
    saveReturnUrl();
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  // Check permissions if specified
  const needsPermissionCheck = permission || (permissions && permissions.length > 0);

  if (needsPermissionCheck) {
    let hasAccess = false;

    if (permission) {
      hasAccess = hasPermission(permission);
    } else if (permissions && permissions.length > 0) {
      hasAccess = requireAll ? hasAllPermissions(...permissions) : hasAnyPermission(...permissions);
    }

    if (!hasAccess) {
      // Redirect back to the admin landing — unless we're already there
      // (would loop) or the landing itself is what we lack permission for.
      // Fall back to the user dashboard in that case.
      const target = location.pathname === '/admin' ? '/' : '/admin';
      return <Navigate to={target} replace />;
    }
  }

  return <Layout>{children}</Layout>;
}

import { lazy, Suspense, type ComponentType } from 'react';
import { Routes, Route, Navigate, useLocation, useParams } from 'react-router';
import { useAuthStore } from './store/auth';

/**
 * Wrapper around React.lazy that auto-reloads the page when a chunk fails to load
 * (e.g. after a new deploy with different chunk hashes).
 */
function lazyWithRetry<T extends ComponentType<unknown>>(factory: () => Promise<{ default: T }>) {
  return lazy(() =>
    factory().catch(() => {
      const key = 'chunk_reload_ts';
      const last = Number(sessionStorage.getItem(key) || '0');
      if (Date.now() - last > 30_000) {
        sessionStorage.setItem(key, String(Date.now()));
        window.location.reload();
      }
      // Re-throw so ErrorBoundary catches it if reload guard prevents loop
      return factory();
    }),
  );
}
import { useBlockingStore } from './store/blocking';
import Layout from './components/layout/Layout';
import PageLoader from './components/common/PageLoader';
import {
  MaintenanceScreen,
  ChannelSubscriptionScreen,
  BlacklistedScreen,
} from './components/blocking';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PwaInstallBanner } from './components/PwaInstallBanner';
import { PermissionRoute } from '@/components/auth/PermissionRoute';
import { saveReturnUrl } from './utils/token';
import { useAnalyticsCounters } from './hooks/useAnalyticsCounters';
// Auth pages - load immediately (small)
import Login from './pages/Login';
import TelegramCallback from './pages/TelegramCallback';
import TelegramRedirect from './pages/TelegramRedirect';
import DeepLinkRedirect from './pages/DeepLinkRedirect';
import VerifyEmail from './pages/VerifyEmail';
import ResetPassword from './pages/ResetPassword';
import OAuthCallback from './pages/OAuthCallback';

// Dashboard - load eagerly (default route, LCP-critical)
import Dashboard from './pages/Dashboard';

// User pages - lazy load
const Subscriptions = lazyWithRetry(() => import('./pages/Subscriptions'));
const Subscription = lazyWithRetry(() => import('./pages/Subscription'));
const SubscriptionPurchase = lazyWithRetry(() => import('./pages/SubscriptionPurchase'));
const Balance = lazyWithRetry(() => import('./pages/Balance'));
const SavedCards = lazyWithRetry(() => import('./pages/SavedCards'));
const Referral = lazyWithRetry(() => import('./pages/Referral'));
const Support = lazyWithRetry(() => import('./pages/Support'));
const Profile = lazyWithRetry(() => import('./pages/Profile'));
const Contests = lazyWithRetry(() => import('./pages/Contests'));
const Polls = lazyWithRetry(() => import('./pages/Polls'));
const Info = lazyWithRetry(() => import('./pages/Info'));
const Wheel = lazyWithRetry(() => import('./pages/Wheel'));
const GiftSubscription = lazyWithRetry(() => import('./pages/GiftSubscription'));
const GiftResult = lazyWithRetry(() => import('./pages/GiftResult'));
const Connection = lazyWithRetry(() => import('./pages/Connection'));
const ConnectionQR = lazyWithRetry(() => import('./pages/ConnectionQR'));
const QuickPurchase = lazyWithRetry(() => import('./pages/QuickPurchase'));
const PurchaseSuccess = lazyWithRetry(() => import('./pages/PurchaseSuccess'));
const RenewSubscription = lazyWithRetry(() => import('./pages/RenewSubscription'));
const AutoLogin = lazyWithRetry(() => import('./pages/AutoLogin'));
const TopUpMethodSelect = lazyWithRetry(() => import('./pages/TopUpMethodSelect'));
const TopUpAmount = lazyWithRetry(() => import('./pages/TopUpAmount'));
const TopUpResult = lazyWithRetry(() => import('./pages/TopUpResult'));
const ConnectedAccounts = lazyWithRetry(() => import('./pages/ConnectedAccounts'));
const LinkTelegramCallback = lazyWithRetry(() => import('./pages/LinkTelegramCallback'));
const MergeAccounts = lazyWithRetry(() => import('./pages/MergeAccounts'));

// Admin pages - lazy load (only for admins)
const AdminPanel = lazyWithRetry(() => import('./pages/AdminPanel'));
const AdminTickets = lazyWithRetry(() => import('./pages/AdminTickets'));
const AdminTicketSettings = lazyWithRetry(() => import('./pages/AdminTicketSettings'));
const AdminSettings = lazyWithRetry(() => import('./pages/AdminSettings'));
const AdminApps = lazyWithRetry(() => import('./pages/AdminApps'));
const AdminWheel = lazyWithRetry(() => import('./pages/AdminWheel'));
const AdminTariffs = lazyWithRetry(() => import('./pages/AdminTariffs'));
const AdminTariffCreate = lazyWithRetry(() => import('./pages/AdminTariffCreate'));
const AdminServers = lazyWithRetry(() => import('./pages/AdminServers'));
const AdminServerEdit = lazyWithRetry(() => import('./pages/AdminServerEdit'));
const AdminDashboard = lazyWithRetry(() => import('./pages/AdminDashboard'));
const AdminBanSystem = lazyWithRetry(() => import('./pages/AdminBanSystem'));
const AdminBroadcasts = lazyWithRetry(() => import('./pages/AdminBroadcasts'));
const AdminBroadcastCreate = lazyWithRetry(() => import('./pages/AdminBroadcastCreate'));
const AdminPromocodes = lazyWithRetry(() => import('./pages/AdminPromocodes'));
const AdminPromocodeCreate = lazyWithRetry(() => import('./pages/AdminPromocodeCreate'));
const AdminPromocodeStats = lazyWithRetry(() => import('./pages/AdminPromocodeStats'));
const AdminPromoGroups = lazyWithRetry(() => import('./pages/AdminPromoGroups'));
const AdminPromoGroupCreate = lazyWithRetry(() => import('./pages/AdminPromoGroupCreate'));
const AdminCampaigns = lazyWithRetry(() => import('./pages/AdminCampaigns'));
const AdminCampaignCreate = lazyWithRetry(() => import('./pages/AdminCampaignCreate'));
const AdminCampaignStats = lazyWithRetry(() => import('./pages/AdminCampaignStats'));
const AdminCampaignEdit = lazyWithRetry(() => import('./pages/AdminCampaignEdit'));
const AdminPartners = lazyWithRetry(() => import('./pages/AdminPartners'));
const AdminPartnerSettings = lazyWithRetry(() => import('./pages/AdminPartnerSettings'));
const AdminPartnerDetail = lazyWithRetry(() => import('./pages/AdminPartnerDetail'));
const AdminApplicationReview = lazyWithRetry(() => import('./pages/AdminApplicationReview'));
const AdminPartnerCommission = lazyWithRetry(() => import('./pages/AdminPartnerCommission'));
const AdminPartnerRevoke = lazyWithRetry(() => import('./pages/AdminPartnerRevoke'));
const AdminPartnerCampaignAssign = lazyWithRetry(
  () => import('./pages/AdminPartnerCampaignAssign'),
);
const AdminWithdrawals = lazyWithRetry(() => import('./pages/AdminWithdrawals'));
const AdminWithdrawalDetail = lazyWithRetry(() => import('./pages/AdminWithdrawalDetail'));
const AdminWithdrawalReject = lazyWithRetry(() => import('./pages/AdminWithdrawalReject'));
const ReferralPartnerApply = lazyWithRetry(() => import('./pages/ReferralPartnerApply'));
const ReferralWithdrawalRequest = lazyWithRetry(() => import('./pages/ReferralWithdrawalRequest'));
const AdminUsers = lazyWithRetry(() => import('./pages/AdminUsers'));
const AdminPayments = lazyWithRetry(() => import('./pages/AdminPayments'));
const AdminPaymentMethods = lazyWithRetry(() => import('./pages/AdminPaymentMethods'));
const AdminPaymentMethodEdit = lazyWithRetry(() => import('./pages/AdminPaymentMethodEdit'));
const AdminPromoOffers = lazyWithRetry(() => import('./pages/AdminPromoOffers'));
const AdminPromoOfferTemplateEdit = lazyWithRetry(
  () => import('./pages/AdminPromoOfferTemplateEdit'),
);
const AdminPromoOfferSend = lazyWithRetry(() => import('./pages/AdminPromoOfferSend'));
const AdminRemnawave = lazyWithRetry(() => import('./pages/AdminRemnawave'));
const AdminRemnawaveSquadDetail = lazyWithRetry(() => import('./pages/AdminRemnawaveSquadDetail'));
const AdminEmailTemplates = lazyWithRetry(() => import('./pages/AdminEmailTemplates'));
const AdminTrafficUsage = lazyWithRetry(() => import('./pages/AdminTrafficUsage'));
const AdminSalesStats = lazyWithRetry(() => import('./pages/AdminSalesStats'));
const AdminUpdates = lazyWithRetry(() => import('./pages/AdminUpdates'));
const AdminUserDetail = lazyWithRetry(() => import('./pages/AdminUserDetail'));
const AdminBroadcastDetail = lazyWithRetry(() => import('./pages/AdminBroadcastDetail'));
const AdminPinnedMessages = lazyWithRetry(() => import('./pages/AdminPinnedMessages'));
const AdminPinnedMessageCreate = lazyWithRetry(() => import('./pages/AdminPinnedMessageCreate'));
const AdminChannelSubscriptions = lazyWithRetry(() => import('./pages/AdminChannelSubscriptions'));
const AdminEmailTemplatePreview = lazyWithRetry(() => import('./pages/AdminEmailTemplatePreview'));
const AdminRoles = lazyWithRetry(() => import('./pages/AdminRoles'));
const AdminRoleEdit = lazyWithRetry(() => import('./pages/AdminRoleEdit'));
const AdminRoleAssign = lazyWithRetry(() => import('./pages/AdminRoleAssign'));
const AdminPolicies = lazyWithRetry(() => import('./pages/AdminPolicies'));
const AdminPolicyEdit = lazyWithRetry(() => import('./pages/AdminPolicyEdit'));
const AdminAuditLog = lazyWithRetry(() => import('./pages/AdminAuditLog'));
const AdminLandings = lazyWithRetry(() => import('./pages/AdminLandings'));
const AdminLandingEditor = lazyWithRetry(() => import('./pages/AdminLandingEditor'));
const AdminLandingStats = lazyWithRetry(() => import('./pages/AdminLandingStats'));
const AdminReferralNetwork = lazyWithRetry(() => import('./pages/ReferralNetwork'));

// News pages
const NewsArticlePage = lazyWithRetry(() => import('./pages/NewsArticle'));
const AdminNews = lazyWithRetry(() => import('./pages/AdminNews'));
const AdminNewsCreate = lazyWithRetry(() => import('./pages/AdminNewsCreate'));

function ProtectedRoute({
  children,
  withLayout = true,
}: {
  children: React.ReactNode;
  withLayout?: boolean;
}) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const location = useLocation();

  if (isLoading) {
    return <PageLoader variant="dark" />;
  }

  if (!isAuthenticated) {
    saveReturnUrl();
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return withLayout ? <Layout>{children}</Layout> : <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const isAdmin = useAuthStore((state) => state.isAdmin);
  const location = useLocation();

  if (isLoading) {
    return <PageLoader variant="light" />;
  }

  if (!isAuthenticated) {
    saveReturnUrl();
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <Layout>{children}</Layout>;
}

// Suspense wrapper for lazy components
function LazyPage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader variant="dark" />}>{children}</Suspense>;
}

function BlockingOverlay() {
  const blockingType = useBlockingStore((state) => state.blockingType);

  if (blockingType === 'maintenance') {
    return <MaintenanceScreen />;
  }

  if (blockingType === 'channel_subscription') {
    return <ChannelSubscriptionScreen />;
  }

  if (blockingType === 'blacklisted') {
    return <BlacklistedScreen />;
  }

  return null;
}

/** Redirect /subscription/:id → /subscriptions/:id preserving the param */
function LegacySubscriptionRedirect() {
  const { subscriptionId } = useParams<{ subscriptionId: string }>();
  return <Navigate to={`/subscriptions/${subscriptionId}`} replace />;
}

function App() {
  useAnalyticsCounters();

  return (
    <>
      <BlockingOverlay />
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/auth/telegram/callback" element={<TelegramCallback />} />
        <Route path="/auth/telegram" element={<TelegramRedirect />} />
        <Route path="/tg" element={<TelegramRedirect />} />
        <Route path="/connect" element={<DeepLinkRedirect />} />
        <Route path="/add" element={<DeepLinkRedirect />} />
        <Route path="/auth/oauth/callback" element={<OAuthCallback />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route
          path="/merge/:mergeToken"
          element={
            <LazyPage>
              <MergeAccounts />
            </LazyPage>
          }
        />
        <Route
          path="/buy/success/:token"
          element={
            <ErrorBoundary level="app">
              <LazyPage>
                <PurchaseSuccess />
              </LazyPage>
            </ErrorBoundary>
          }
        />
        <Route
          path="/buy/:slug"
          element={
            <ErrorBoundary level="app">
              <LazyPage>
                <QuickPurchase />
              </LazyPage>
            </ErrorBoundary>
          }
        />
        <Route
          path="/auto-login"
          element={
            <ErrorBoundary level="app">
              <LazyPage>
                <AutoLogin />
              </LazyPage>
            </ErrorBoundary>
          }
        />

        {/* Protected routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <LazyPage>
                <Dashboard />
              </LazyPage>
            </ProtectedRoute>
          }
        />
        <Route
          path="/subscriptions"
          element={
            <ProtectedRoute>
              <LazyPage>
                <Subscriptions />
              </LazyPage>
            </ProtectedRoute>
          }
        />
        <Route
          path="/subscriptions/:subscriptionId"
          element={
            <ProtectedRoute>
              <LazyPage>
                <Subscription />
              </LazyPage>
            </ProtectedRoute>
          }
        />
        <Route
          path="/subscriptions/:subscriptionId/renew"
          element={
            <ProtectedRoute>
              <LazyPage>
                <RenewSubscription />
              </LazyPage>
            </ProtectedRoute>
          }
        />
        {/* Legacy redirects for backward compatibility */}
        <Route path="/subscription/:subscriptionId" element={<LegacySubscriptionRedirect />} />
        <Route
          path="/subscription"
          element={
            <ProtectedRoute>
              <Navigate to="/subscriptions" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/subscription/purchase"
          element={
            <ProtectedRoute>
              <LazyPage>
                <SubscriptionPurchase />
              </LazyPage>
            </ProtectedRoute>
          }
        />
        <Route
          path="/balance"
          element={
            <ProtectedRoute>
              <LazyPage>
                <Balance />
              </LazyPage>
            </ProtectedRoute>
          }
        />
        <Route
          path="/balance/saved-cards"
          element={
            <ProtectedRoute>
              <LazyPage>
                <SavedCards />
              </LazyPage>
            </ProtectedRoute>
          }
        />
        <Route
          path="/balance/top-up"
          element={
            <ProtectedRoute>
              <LazyPage>
                <TopUpMethodSelect />
              </LazyPage>
            </ProtectedRoute>
          }
        />
        <Route
          path="/balance/top-up/result"
          element={
            <ProtectedRoute withLayout={false}>
              <ErrorBoundary level="app">
                <LazyPage>
                  <TopUpResult />
                </LazyPage>
              </ErrorBoundary>
            </ProtectedRoute>
          }
        />
        <Route
          path="/balance/top-up/:methodId"
          element={
            <ProtectedRoute>
              <LazyPage>
                <TopUpAmount />
              </LazyPage>
            </ProtectedRoute>
          }
        />
        <Route
          path="/referral"
          element={
            <ProtectedRoute>
              <LazyPage>
                <Referral />
              </LazyPage>
            </ProtectedRoute>
          }
        />
        <Route
          path="/referral/partner/apply"
          element={
            <ProtectedRoute>
              <LazyPage>
                <ReferralPartnerApply />
              </LazyPage>
            </ProtectedRoute>
          }
        />
        <Route
          path="/referral/withdrawal/request"
          element={
            <ProtectedRoute>
              <LazyPage>
                <ReferralWithdrawalRequest />
              </LazyPage>
            </ProtectedRoute>
          }
        />
        <Route
          path="/support"
          element={
            <ProtectedRoute>
              <LazyPage>
                <Support />
              </LazyPage>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <LazyPage>
                <Profile />
              </LazyPage>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile/accounts"
          element={
            <ProtectedRoute>
              <LazyPage>
                <ConnectedAccounts />
              </LazyPage>
            </ProtectedRoute>
          }
        />
        <Route
          path="/auth/link/telegram/callback"
          element={
            <ProtectedRoute>
              <LazyPage>
                <LinkTelegramCallback />
              </LazyPage>
            </ProtectedRoute>
          }
        />
        <Route
          path="/contests"
          element={
            <ProtectedRoute>
              <LazyPage>
                <Contests />
              </LazyPage>
            </ProtectedRoute>
          }
        />
        <Route
          path="/polls"
          element={
            <ProtectedRoute>
              <LazyPage>
                <Polls />
              </LazyPage>
            </ProtectedRoute>
          }
        />
        <Route
          path="/info"
          element={
            <ProtectedRoute>
              <LazyPage>
                <Info />
              </LazyPage>
            </ProtectedRoute>
          }
        />
        <Route
          path="/wheel"
          element={
            <ProtectedRoute>
              <LazyPage>
                <Wheel />
              </LazyPage>
            </ProtectedRoute>
          }
        />
        <Route
          path="/gift"
          element={
            <ErrorBoundary level="app">
              <ProtectedRoute>
                <LazyPage>
                  <GiftSubscription />
                </LazyPage>
              </ProtectedRoute>
            </ErrorBoundary>
          }
        />
        <Route
          path="/gift/result"
          element={
            <ErrorBoundary level="app">
              <ProtectedRoute>
                <LazyPage>
                  <GiftResult />
                </LazyPage>
              </ProtectedRoute>
            </ErrorBoundary>
          }
        />
        <Route
          path="/connection/qr"
          element={
            <ProtectedRoute>
              <LazyPage>
                <ConnectionQR />
              </LazyPage>
            </ProtectedRoute>
          }
        />
        <Route
          path="/connection"
          element={
            <ProtectedRoute>
              <LazyPage>
                <Connection />
              </LazyPage>
            </ProtectedRoute>
          }
        />
        <Route
          path="/news/:slug"
          element={
            <ProtectedRoute>
              <LazyPage>
                <NewsArticlePage />
              </LazyPage>
            </ProtectedRoute>
          }
        />

        {/* Admin routes */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <LazyPage>
                <AdminPanel />
              </LazyPage>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/tickets"
          element={
            <PermissionRoute permission="tickets:read">
              <LazyPage>
                <AdminTickets />
              </LazyPage>
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/tickets/settings"
          element={
            <PermissionRoute permission="tickets:settings">
              <LazyPage>
                <AdminTicketSettings />
              </LazyPage>
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <PermissionRoute permission="settings:read">
              <LazyPage>
                <AdminSettings />
              </LazyPage>
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/apps"
          element={
            <PermissionRoute permission="apps:read">
              <LazyPage>
                <AdminApps />
              </LazyPage>
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/wheel"
          element={
            <PermissionRoute permission="wheel:read">
              <LazyPage>
                <AdminWheel />
              </LazyPage>
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/tariffs"
          element={
            <PermissionRoute permission="tariffs:read">
              <LazyPage>
                <AdminTariffs />
              </LazyPage>
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/tariffs/create"
          element={
            <PermissionRoute permission="tariffs:read">
              <LazyPage>
                <AdminTariffCreate />
              </LazyPage>
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/tariffs/:id/edit"
          element={
            <PermissionRoute permission="tariffs:read">
              <LazyPage>
                <AdminTariffCreate />
              </LazyPage>
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/landings"
          element={
            <PermissionRoute permission="landings:read">
              <LazyPage>
                <AdminLandings />
              </LazyPage>
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/landings/create"
          element={
            <PermissionRoute permission="landings:create">
              <LazyPage>
                <AdminLandingEditor />
              </LazyPage>
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/landings/:id/edit"
          element={
            <PermissionRoute permission="landings:edit">
              <LazyPage>
                <AdminLandingEditor />
              </LazyPage>
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/landings/:id/stats"
          element={
            <PermissionRoute permission="landings:read">
              <LazyPage>
                <AdminLandingStats />
              </LazyPage>
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/servers"
          element={
            <PermissionRoute permission="servers:read">
              <LazyPage>
                <AdminServers />
              </LazyPage>
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/servers/:id/edit"
          element={
            <PermissionRoute permission="servers:read">
              <LazyPage>
                <AdminServerEdit />
              </LazyPage>
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/dashboard"
          element={
            <PermissionRoute permission="stats:read">
              <LazyPage>
                <AdminDashboard />
              </LazyPage>
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/ban-system"
          element={
            <PermissionRoute permission="ban_system:read">
              <LazyPage>
                <AdminBanSystem />
              </LazyPage>
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/broadcasts"
          element={
            <PermissionRoute permission="broadcasts:read">
              <LazyPage>
                <AdminBroadcasts />
              </LazyPage>
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/broadcasts/create"
          element={
            <PermissionRoute permission="broadcasts:read">
              <LazyPage>
                <AdminBroadcastCreate />
              </LazyPage>
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/promocodes"
          element={
            <PermissionRoute permission="promocodes:read">
              <LazyPage>
                <AdminPromocodes />
              </LazyPage>
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/promocodes/create"
          element={
            <PermissionRoute permission="promocodes:read">
              <LazyPage>
                <AdminPromocodeCreate />
              </LazyPage>
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/promocodes/:id/edit"
          element={
            <PermissionRoute permission="promocodes:read">
              <LazyPage>
                <AdminPromocodeCreate />
              </LazyPage>
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/promocodes/:id/stats"
          element={
            <PermissionRoute permission="promocodes:read">
              <LazyPage>
                <AdminPromocodeStats />
              </LazyPage>
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/promo-groups"
          element={
            <PermissionRoute permission="promo_groups:read">
              <LazyPage>
                <AdminPromoGroups />
              </LazyPage>
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/promo-groups/create"
          element={
            <PermissionRoute permission="promo_groups:read">
              <LazyPage>
                <AdminPromoGroupCreate />
              </LazyPage>
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/promo-groups/:id/edit"
          element={
            <PermissionRoute permission="promo_groups:read">
              <LazyPage>
                <AdminPromoGroupCreate />
              </LazyPage>
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/campaigns"
          element={
            <PermissionRoute permission="campaigns:read">
              <LazyPage>
                <AdminCampaigns />
              </LazyPage>
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/campaigns/create"
          element={
            <PermissionRoute permission="campaigns:read">
              <LazyPage>
                <AdminCampaignCreate />
              </LazyPage>
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/campaigns/:id/stats"
          element={
            <PermissionRoute permission="campaigns:read">
              <LazyPage>
                <AdminCampaignStats />
              </LazyPage>
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/campaigns/:id/edit"
          element={
            <PermissionRoute permission="campaigns:read">
              <LazyPage>
                <AdminCampaignEdit />
              </LazyPage>
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/partners"
          element={
            <PermissionRoute permission="partners:read">
              <LazyPage>
                <AdminPartners />
              </LazyPage>
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/partners/settings"
          element={
            <PermissionRoute permission="partners:read">
              <LazyPage>
                <AdminPartnerSettings />
              </LazyPage>
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/partners/applications/:id/review"
          element={
            <PermissionRoute permission="partners:read">
              <LazyPage>
                <AdminApplicationReview />
              </LazyPage>
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/partners/:userId/commission"
          element={
            <PermissionRoute permission="partners:read">
              <LazyPage>
                <AdminPartnerCommission />
              </LazyPage>
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/partners/:userId/revoke"
          element={
            <PermissionRoute permission="partners:read">
              <LazyPage>
                <AdminPartnerRevoke />
              </LazyPage>
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/partners/:userId/campaigns/assign"
          element={
            <PermissionRoute permission="partners:read">
              <LazyPage>
                <AdminPartnerCampaignAssign />
              </LazyPage>
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/partners/:userId"
          element={
            <PermissionRoute permission="partners:read">
              <LazyPage>
                <AdminPartnerDetail />
              </LazyPage>
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/withdrawals"
          element={
            <PermissionRoute permission="withdrawals:read">
              <LazyPage>
                <AdminWithdrawals />
              </LazyPage>
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/withdrawals/:id/reject"
          element={
            <PermissionRoute permission="withdrawals:read">
              <LazyPage>
                <AdminWithdrawalReject />
              </LazyPage>
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/withdrawals/:id"
          element={
            <PermissionRoute permission="withdrawals:read">
              <LazyPage>
                <AdminWithdrawalDetail />
              </LazyPage>
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <PermissionRoute permission="users:read">
              <LazyPage>
                <AdminUsers />
              </LazyPage>
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/payments"
          element={
            <PermissionRoute permission="payments:read">
              <LazyPage>
                <AdminPayments />
              </LazyPage>
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/traffic-usage"
          element={
            <PermissionRoute permission="traffic:read">
              <LazyPage>
                <AdminTrafficUsage />
              </LazyPage>
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/sales-stats"
          element={
            <PermissionRoute permission="sales_stats:read">
              <LazyPage>
                <AdminSalesStats />
              </LazyPage>
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/referral-network"
          element={
            <PermissionRoute permission="stats:read">
              <LazyPage>
                <AdminReferralNetwork />
              </LazyPage>
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/payment-methods"
          element={
            <PermissionRoute permission="payment_methods:read">
              <LazyPage>
                <AdminPaymentMethods />
              </LazyPage>
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/payment-methods/:methodId/edit"
          element={
            <PermissionRoute permission="payment_methods:read">
              <LazyPage>
                <AdminPaymentMethodEdit />
              </LazyPage>
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/promo-offers"
          element={
            <PermissionRoute permission="promo_offers:read">
              <LazyPage>
                <AdminPromoOffers />
              </LazyPage>
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/promo-offers/templates/:id/edit"
          element={
            <PermissionRoute permission="promo_offers:read">
              <LazyPage>
                <AdminPromoOfferTemplateEdit />
              </LazyPage>
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/promo-offers/send"
          element={
            <PermissionRoute permission="promo_offers:read">
              <LazyPage>
                <AdminPromoOfferSend />
              </LazyPage>
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/remnawave"
          element={
            <PermissionRoute permission="remnawave:read">
              <LazyPage>
                <AdminRemnawave />
              </LazyPage>
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/remnawave/squads/:uuid"
          element={
            <PermissionRoute permission="remnawave:read">
              <LazyPage>
                <AdminRemnawaveSquadDetail />
              </LazyPage>
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/email-templates"
          element={
            <PermissionRoute permission="email_templates:read">
              <LazyPage>
                <AdminEmailTemplates />
              </LazyPage>
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/updates"
          element={
            <PermissionRoute permission="updates:read">
              <LazyPage>
                <AdminUpdates />
              </LazyPage>
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/users/:id"
          element={
            <PermissionRoute permission="users:read">
              <LazyPage>
                <AdminUserDetail />
              </LazyPage>
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/broadcasts/:id"
          element={
            <PermissionRoute permission="broadcasts:read">
              <LazyPage>
                <AdminBroadcastDetail />
              </LazyPage>
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/pinned-messages"
          element={
            <PermissionRoute permission="pinned_messages:read">
              <LazyPage>
                <AdminPinnedMessages />
              </LazyPage>
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/pinned-messages/create"
          element={
            <PermissionRoute permission="pinned_messages:read">
              <LazyPage>
                <AdminPinnedMessageCreate />
              </LazyPage>
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/pinned-messages/:id/edit"
          element={
            <PermissionRoute permission="pinned_messages:read">
              <LazyPage>
                <AdminPinnedMessageCreate />
              </LazyPage>
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/channel-subscriptions"
          element={
            <PermissionRoute permission="channels:read">
              <LazyPage>
                <AdminChannelSubscriptions />
              </LazyPage>
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/email-templates/preview/:type/:lang"
          element={
            <PermissionRoute permission="email_templates:read">
              <LazyPage>
                <AdminEmailTemplatePreview />
              </LazyPage>
            </PermissionRoute>
          }
        />

        {/* RBAC routes */}
        <Route
          path="/admin/roles"
          element={
            <PermissionRoute permission="roles:read">
              <LazyPage>
                <AdminRoles />
              </LazyPage>
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/roles/create"
          element={
            <PermissionRoute permission="roles:create">
              <LazyPage>
                <AdminRoleEdit />
              </LazyPage>
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/roles/:id/edit"
          element={
            <PermissionRoute permission="roles:edit">
              <LazyPage>
                <AdminRoleEdit />
              </LazyPage>
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/roles/assign"
          element={
            <PermissionRoute permission="roles:assign">
              <LazyPage>
                <AdminRoleAssign />
              </LazyPage>
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/policies"
          element={
            <PermissionRoute permission="roles:read">
              <LazyPage>
                <AdminPolicies />
              </LazyPage>
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/policies/create"
          element={
            <PermissionRoute permission="roles:create">
              <LazyPage>
                <AdminPolicyEdit />
              </LazyPage>
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/policies/:id/edit"
          element={
            <PermissionRoute permission="roles:edit">
              <LazyPage>
                <AdminPolicyEdit />
              </LazyPage>
            </PermissionRoute>
          }
        />
        {/* News admin routes */}
        <Route
          path="/admin/news"
          element={
            <PermissionRoute permission="news:read">
              <LazyPage>
                <AdminNews />
              </LazyPage>
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/news/create"
          element={
            <PermissionRoute permission="news:create">
              <LazyPage>
                <AdminNewsCreate />
              </LazyPage>
            </PermissionRoute>
          }
        />
        <Route
          path="/admin/news/:id/edit"
          element={
            <PermissionRoute permission="news:edit">
              <LazyPage>
                <AdminNewsCreate />
              </LazyPage>
            </PermissionRoute>
          }
        />

        <Route
          path="/admin/audit-log"
          element={
            <PermissionRoute permission="audit_log:read">
              <LazyPage>
                <AdminAuditLog />
              </LazyPage>
            </PermissionRoute>
          }
        />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <PwaInstallBanner />
    </>
  );
}

export default App;

import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router';
import { useAuthStore } from './store/auth';
import { useBlockingStore } from './store/blocking';
import Layout from './components/layout/Layout';
import PageLoader from './components/common/PageLoader';
import {
  MaintenanceScreen,
  ChannelSubscriptionScreen,
  BlacklistedScreen,
} from './components/blocking';
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

// User pages - lazy load
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Subscription = lazy(() => import('./pages/Subscription'));
const Balance = lazy(() => import('./pages/Balance'));
const Referral = lazy(() => import('./pages/Referral'));
const Support = lazy(() => import('./pages/Support'));
const Profile = lazy(() => import('./pages/Profile'));
const Contests = lazy(() => import('./pages/Contests'));
const Polls = lazy(() => import('./pages/Polls'));
const Info = lazy(() => import('./pages/Info'));
const Wheel = lazy(() => import('./pages/Wheel'));
const Connection = lazy(() => import('./pages/Connection'));
const TopUpMethodSelect = lazy(() => import('./pages/TopUpMethodSelect'));
const TopUpAmount = lazy(() => import('./pages/TopUpAmount'));

// Admin pages - lazy load (only for admins)
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const AdminTickets = lazy(() => import('./pages/AdminTickets'));
const AdminTicketSettings = lazy(() => import('./pages/AdminTicketSettings'));
const AdminSettings = lazy(() => import('./pages/AdminSettings'));
const AdminApps = lazy(() => import('./pages/AdminApps'));
const AdminWheel = lazy(() => import('./pages/AdminWheel'));
const AdminTariffs = lazy(() => import('./pages/AdminTariffs'));
const AdminTariffCreate = lazy(() => import('./pages/AdminTariffCreate'));
const AdminServers = lazy(() => import('./pages/AdminServers'));
const AdminServerEdit = lazy(() => import('./pages/AdminServerEdit'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminBanSystem = lazy(() => import('./pages/AdminBanSystem'));
const AdminBroadcasts = lazy(() => import('./pages/AdminBroadcasts'));
const AdminBroadcastCreate = lazy(() => import('./pages/AdminBroadcastCreate'));
const AdminPromocodes = lazy(() => import('./pages/AdminPromocodes'));
const AdminPromocodeCreate = lazy(() => import('./pages/AdminPromocodeCreate'));
const AdminPromocodeStats = lazy(() => import('./pages/AdminPromocodeStats'));
const AdminPromoGroups = lazy(() => import('./pages/AdminPromoGroups'));
const AdminPromoGroupCreate = lazy(() => import('./pages/AdminPromoGroupCreate'));
const AdminCampaigns = lazy(() => import('./pages/AdminCampaigns'));
const AdminCampaignCreate = lazy(() => import('./pages/AdminCampaignCreate'));
const AdminCampaignStats = lazy(() => import('./pages/AdminCampaignStats'));
const AdminCampaignEdit = lazy(() => import('./pages/AdminCampaignEdit'));
const AdminPartners = lazy(() => import('./pages/AdminPartners'));
const AdminPartnerSettings = lazy(() => import('./pages/AdminPartnerSettings'));
const AdminPartnerDetail = lazy(() => import('./pages/AdminPartnerDetail'));
const AdminApplicationReview = lazy(() => import('./pages/AdminApplicationReview'));
const AdminPartnerCommission = lazy(() => import('./pages/AdminPartnerCommission'));
const AdminPartnerRevoke = lazy(() => import('./pages/AdminPartnerRevoke'));
const AdminPartnerCampaignAssign = lazy(() => import('./pages/AdminPartnerCampaignAssign'));
const AdminWithdrawals = lazy(() => import('./pages/AdminWithdrawals'));
const AdminWithdrawalDetail = lazy(() => import('./pages/AdminWithdrawalDetail'));
const AdminWithdrawalReject = lazy(() => import('./pages/AdminWithdrawalReject'));
const ReferralPartnerApply = lazy(() => import('./pages/ReferralPartnerApply'));
const ReferralWithdrawalRequest = lazy(() => import('./pages/ReferralWithdrawalRequest'));
const AdminUsers = lazy(() => import('./pages/AdminUsers'));
const AdminPayments = lazy(() => import('./pages/AdminPayments'));
const AdminPaymentMethods = lazy(() => import('./pages/AdminPaymentMethods'));
const AdminPaymentMethodEdit = lazy(() => import('./pages/AdminPaymentMethodEdit'));
const AdminPromoOffers = lazy(() => import('./pages/AdminPromoOffers'));
const AdminPromoOfferTemplateEdit = lazy(() => import('./pages/AdminPromoOfferTemplateEdit'));
const AdminPromoOfferSend = lazy(() => import('./pages/AdminPromoOfferSend'));
const AdminRemnawave = lazy(() => import('./pages/AdminRemnawave'));
const AdminRemnawaveSquadDetail = lazy(() => import('./pages/AdminRemnawaveSquadDetail'));
const AdminEmailTemplates = lazy(() => import('./pages/AdminEmailTemplates'));
const AdminTrafficUsage = lazy(() => import('./pages/AdminTrafficUsage'));
const AdminUpdates = lazy(() => import('./pages/AdminUpdates'));
const AdminUserDetail = lazy(() => import('./pages/AdminUserDetail'));
const AdminBroadcastDetail = lazy(() => import('./pages/AdminBroadcastDetail'));
const AdminPinnedMessages = lazy(() => import('./pages/AdminPinnedMessages'));
const AdminPinnedMessageCreate = lazy(() => import('./pages/AdminPinnedMessageCreate'));
const AdminChannelSubscriptions = lazy(() => import('./pages/AdminChannelSubscriptions'));
const AdminEmailTemplatePreview = lazy(() => import('./pages/AdminEmailTemplatePreview'));
const AdminRoles = lazy(() => import('./pages/AdminRoles'));
const AdminRoleEdit = lazy(() => import('./pages/AdminRoleEdit'));
const AdminRoleAssign = lazy(() => import('./pages/AdminRoleAssign'));
const AdminPolicies = lazy(() => import('./pages/AdminPolicies'));
const AdminPolicyEdit = lazy(() => import('./pages/AdminPolicyEdit'));
const AdminAuditLog = lazy(() => import('./pages/AdminAuditLog'));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const location = useLocation();

  if (isLoading) {
    return <PageLoader variant="dark" />;
  }

  if (!isAuthenticated) {
    // Сохраняем текущий URL для возврата после авторизации
    saveReturnUrl();
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Layout>{children}</Layout>;
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
    // Сохраняем текущий URL для возврата после авторизации
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
          path="/subscription"
          element={
            <ProtectedRoute>
              <LazyPage>
                <Subscription />
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
          path="/connection"
          element={
            <ProtectedRoute>
              <LazyPage>
                <Connection />
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
    </>
  );
}

export default App;

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
const AdminEmailTemplatePreview = lazy(() => import('./pages/AdminEmailTemplatePreview'));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();
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
  const { isAuthenticated, isLoading, isAdmin } = useAuthStore();
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
  const { blockingType } = useBlockingStore();

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
            <AdminRoute>
              <LazyPage>
                <AdminTickets />
              </LazyPage>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/tickets/settings"
          element={
            <AdminRoute>
              <LazyPage>
                <AdminTicketSettings />
              </LazyPage>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <AdminRoute>
              <LazyPage>
                <AdminSettings />
              </LazyPage>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/apps"
          element={
            <AdminRoute>
              <LazyPage>
                <AdminApps />
              </LazyPage>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/wheel"
          element={
            <AdminRoute>
              <LazyPage>
                <AdminWheel />
              </LazyPage>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/tariffs"
          element={
            <AdminRoute>
              <LazyPage>
                <AdminTariffs />
              </LazyPage>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/tariffs/create"
          element={
            <AdminRoute>
              <LazyPage>
                <AdminTariffCreate />
              </LazyPage>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/tariffs/:id/edit"
          element={
            <AdminRoute>
              <LazyPage>
                <AdminTariffCreate />
              </LazyPage>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/servers"
          element={
            <AdminRoute>
              <LazyPage>
                <AdminServers />
              </LazyPage>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/servers/:id/edit"
          element={
            <AdminRoute>
              <LazyPage>
                <AdminServerEdit />
              </LazyPage>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/dashboard"
          element={
            <AdminRoute>
              <LazyPage>
                <AdminDashboard />
              </LazyPage>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/ban-system"
          element={
            <AdminRoute>
              <LazyPage>
                <AdminBanSystem />
              </LazyPage>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/broadcasts"
          element={
            <AdminRoute>
              <LazyPage>
                <AdminBroadcasts />
              </LazyPage>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/broadcasts/create"
          element={
            <AdminRoute>
              <LazyPage>
                <AdminBroadcastCreate />
              </LazyPage>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/promocodes"
          element={
            <AdminRoute>
              <LazyPage>
                <AdminPromocodes />
              </LazyPage>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/promocodes/create"
          element={
            <AdminRoute>
              <LazyPage>
                <AdminPromocodeCreate />
              </LazyPage>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/promocodes/:id/edit"
          element={
            <AdminRoute>
              <LazyPage>
                <AdminPromocodeCreate />
              </LazyPage>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/promocodes/:id/stats"
          element={
            <AdminRoute>
              <LazyPage>
                <AdminPromocodeStats />
              </LazyPage>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/promo-groups"
          element={
            <AdminRoute>
              <LazyPage>
                <AdminPromoGroups />
              </LazyPage>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/promo-groups/create"
          element={
            <AdminRoute>
              <LazyPage>
                <AdminPromoGroupCreate />
              </LazyPage>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/promo-groups/:id/edit"
          element={
            <AdminRoute>
              <LazyPage>
                <AdminPromoGroupCreate />
              </LazyPage>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/campaigns"
          element={
            <AdminRoute>
              <LazyPage>
                <AdminCampaigns />
              </LazyPage>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/campaigns/create"
          element={
            <AdminRoute>
              <LazyPage>
                <AdminCampaignCreate />
              </LazyPage>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/campaigns/:id/stats"
          element={
            <AdminRoute>
              <LazyPage>
                <AdminCampaignStats />
              </LazyPage>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/campaigns/:id/edit"
          element={
            <AdminRoute>
              <LazyPage>
                <AdminCampaignEdit />
              </LazyPage>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/partners"
          element={
            <AdminRoute>
              <LazyPage>
                <AdminPartners />
              </LazyPage>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/partners/settings"
          element={
            <AdminRoute>
              <LazyPage>
                <AdminPartnerSettings />
              </LazyPage>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/partners/applications/:id/review"
          element={
            <AdminRoute>
              <LazyPage>
                <AdminApplicationReview />
              </LazyPage>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/partners/:userId/commission"
          element={
            <AdminRoute>
              <LazyPage>
                <AdminPartnerCommission />
              </LazyPage>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/partners/:userId/revoke"
          element={
            <AdminRoute>
              <LazyPage>
                <AdminPartnerRevoke />
              </LazyPage>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/partners/:userId/campaigns/assign"
          element={
            <AdminRoute>
              <LazyPage>
                <AdminPartnerCampaignAssign />
              </LazyPage>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/partners/:userId"
          element={
            <AdminRoute>
              <LazyPage>
                <AdminPartnerDetail />
              </LazyPage>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/withdrawals"
          element={
            <AdminRoute>
              <LazyPage>
                <AdminWithdrawals />
              </LazyPage>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/withdrawals/:id/reject"
          element={
            <AdminRoute>
              <LazyPage>
                <AdminWithdrawalReject />
              </LazyPage>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/withdrawals/:id"
          element={
            <AdminRoute>
              <LazyPage>
                <AdminWithdrawalDetail />
              </LazyPage>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <AdminRoute>
              <LazyPage>
                <AdminUsers />
              </LazyPage>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/payments"
          element={
            <AdminRoute>
              <LazyPage>
                <AdminPayments />
              </LazyPage>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/traffic-usage"
          element={
            <AdminRoute>
              <LazyPage>
                <AdminTrafficUsage />
              </LazyPage>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/payment-methods"
          element={
            <AdminRoute>
              <LazyPage>
                <AdminPaymentMethods />
              </LazyPage>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/payment-methods/:methodId/edit"
          element={
            <AdminRoute>
              <LazyPage>
                <AdminPaymentMethodEdit />
              </LazyPage>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/promo-offers"
          element={
            <AdminRoute>
              <LazyPage>
                <AdminPromoOffers />
              </LazyPage>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/promo-offers/templates/:id/edit"
          element={
            <AdminRoute>
              <LazyPage>
                <AdminPromoOfferTemplateEdit />
              </LazyPage>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/promo-offers/send"
          element={
            <AdminRoute>
              <LazyPage>
                <AdminPromoOfferSend />
              </LazyPage>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/remnawave"
          element={
            <AdminRoute>
              <LazyPage>
                <AdminRemnawave />
              </LazyPage>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/remnawave/squads/:uuid"
          element={
            <AdminRoute>
              <LazyPage>
                <AdminRemnawaveSquadDetail />
              </LazyPage>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/email-templates"
          element={
            <AdminRoute>
              <LazyPage>
                <AdminEmailTemplates />
              </LazyPage>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/updates"
          element={
            <AdminRoute>
              <LazyPage>
                <AdminUpdates />
              </LazyPage>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/users/:id"
          element={
            <AdminRoute>
              <LazyPage>
                <AdminUserDetail />
              </LazyPage>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/broadcasts/:id"
          element={
            <AdminRoute>
              <LazyPage>
                <AdminBroadcastDetail />
              </LazyPage>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/pinned-messages"
          element={
            <AdminRoute>
              <LazyPage>
                <AdminPinnedMessages />
              </LazyPage>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/pinned-messages/create"
          element={
            <AdminRoute>
              <LazyPage>
                <AdminPinnedMessageCreate />
              </LazyPage>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/pinned-messages/:id/edit"
          element={
            <AdminRoute>
              <LazyPage>
                <AdminPinnedMessageCreate />
              </LazyPage>
            </AdminRoute>
          }
        />
        <Route
          path="/admin/email-templates/preview/:type/:lang"
          element={
            <AdminRoute>
              <LazyPage>
                <AdminEmailTemplatePreview />
              </LazyPage>
            </AdminRoute>
          }
        />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;

import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from './store/auth'
import { useBlockingStore } from './store/blocking'
import Layout from './components/layout/Layout'
import PageLoader from './components/common/PageLoader'
import { MaintenanceScreen, ChannelSubscriptionScreen } from './components/blocking'
import { saveReturnUrl } from './utils/token'

// Auth pages - load immediately (small)
import Login from './pages/Login'
import TelegramCallback from './pages/TelegramCallback'
import TelegramRedirect from './pages/TelegramRedirect'
import DeepLinkRedirect from './pages/DeepLinkRedirect'
import VerifyEmail from './pages/VerifyEmail'

// User pages - lazy load
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Subscription = lazy(() => import('./pages/Subscription'))
const Balance = lazy(() => import('./pages/Balance'))
const Referral = lazy(() => import('./pages/Referral'))
const Support = lazy(() => import('./pages/Support'))
const Profile = lazy(() => import('./pages/Profile'))
const Contests = lazy(() => import('./pages/Contests'))
const Polls = lazy(() => import('./pages/Polls'))
const Info = lazy(() => import('./pages/Info'))
const Wheel = lazy(() => import('./pages/Wheel'))

// Admin pages - lazy load (only for admins)
const AdminPanel = lazy(() => import('./pages/AdminPanel'))
const AdminTickets = lazy(() => import('./pages/AdminTickets'))
const AdminSettings = lazy(() => import('./pages/AdminSettings'))
const AdminApps = lazy(() => import('./pages/AdminApps'))
const AdminWheel = lazy(() => import('./pages/AdminWheel'))
const AdminTariffs = lazy(() => import('./pages/AdminTariffs'))
const AdminServers = lazy(() => import('./pages/AdminServers'))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))
const AdminBanSystem = lazy(() => import('./pages/AdminBanSystem'))
const AdminBroadcasts = lazy(() => import('./pages/AdminBroadcasts'))
const AdminPromocodes = lazy(() => import('./pages/AdminPromocodes'))
const AdminCampaigns = lazy(() => import('./pages/AdminCampaigns'))
const AdminUsers = lazy(() => import('./pages/AdminUsers'))
const AdminPayments = lazy(() => import('./pages/AdminPayments'))
const AdminPromoOffers = lazy(() => import('./pages/AdminPromoOffers'))
const AdminRemnawave = lazy(() => import('./pages/AdminRemnawave'))

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore()
  const location = useLocation()

  if (isLoading) {
    return <PageLoader variant="dark" />
  }

  if (!isAuthenticated) {
    // Сохраняем текущий URL для возврата после авторизации
    saveReturnUrl()
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Layout>{children}</Layout>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, isAdmin } = useAuthStore()
  const location = useLocation()

  if (isLoading) {
    return <PageLoader variant="light" />
  }

  if (!isAuthenticated) {
    // Сохраняем текущий URL для возврата после авторизации
    saveReturnUrl()
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />
  }

  return <Layout>{children}</Layout>
}

// Suspense wrapper for lazy components
function LazyPage({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<PageLoader variant="dark" />}>
      {children}
    </Suspense>
  )
}

function BlockingOverlay() {
  const { blockingType } = useBlockingStore()

  if (blockingType === 'maintenance') {
    return <MaintenanceScreen />
  }

  if (blockingType === 'channel_subscription') {
    return <ChannelSubscriptionScreen />
  }

  return null
}

function App() {
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
      <Route path="/verify-email" element={<VerifyEmail />} />

      {/* Protected routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <LazyPage><Dashboard /></LazyPage>
          </ProtectedRoute>
        }
      />
      <Route
        path="/subscription"
        element={
          <ProtectedRoute>
            <LazyPage><Subscription /></LazyPage>
          </ProtectedRoute>
        }
      />
      <Route
        path="/balance"
        element={
          <ProtectedRoute>
            <LazyPage><Balance /></LazyPage>
          </ProtectedRoute>
        }
      />
      <Route
        path="/referral"
        element={
          <ProtectedRoute>
            <LazyPage><Referral /></LazyPage>
          </ProtectedRoute>
        }
      />
      <Route
        path="/support"
        element={
          <ProtectedRoute>
            <LazyPage><Support /></LazyPage>
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <LazyPage><Profile /></LazyPage>
          </ProtectedRoute>
        }
      />
      <Route
        path="/contests"
        element={
          <ProtectedRoute>
            <LazyPage><Contests /></LazyPage>
          </ProtectedRoute>
        }
      />
      <Route
        path="/polls"
        element={
          <ProtectedRoute>
            <LazyPage><Polls /></LazyPage>
          </ProtectedRoute>
        }
      />
      <Route
        path="/info"
        element={
          <ProtectedRoute>
            <LazyPage><Info /></LazyPage>
          </ProtectedRoute>
        }
      />
      <Route
        path="/wheel"
        element={
          <ProtectedRoute>
            <LazyPage><Wheel /></LazyPage>
          </ProtectedRoute>
        }
      />

      {/* Admin routes */}
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <LazyPage><AdminPanel /></LazyPage>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/tickets"
        element={
          <AdminRoute>
            <LazyPage><AdminTickets /></LazyPage>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/settings"
        element={
          <AdminRoute>
            <LazyPage><AdminSettings /></LazyPage>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/apps"
        element={
          <AdminRoute>
            <LazyPage><AdminApps /></LazyPage>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/wheel"
        element={
          <AdminRoute>
            <LazyPage><AdminWheel /></LazyPage>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/tariffs"
        element={
          <AdminRoute>
            <LazyPage><AdminTariffs /></LazyPage>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/servers"
        element={
          <AdminRoute>
            <LazyPage><AdminServers /></LazyPage>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/dashboard"
        element={
          <AdminRoute>
            <LazyPage><AdminDashboard /></LazyPage>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/ban-system"
        element={
          <AdminRoute>
            <LazyPage><AdminBanSystem /></LazyPage>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/broadcasts"
        element={
          <AdminRoute>
            <LazyPage><AdminBroadcasts /></LazyPage>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/promocodes"
        element={
          <AdminRoute>
            <LazyPage><AdminPromocodes /></LazyPage>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/campaigns"
        element={
          <AdminRoute>
            <LazyPage><AdminCampaigns /></LazyPage>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <AdminRoute>
            <LazyPage><AdminUsers /></LazyPage>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/payments"
        element={
          <AdminRoute>
            <LazyPage><AdminPayments /></LazyPage>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/promo-offers"
        element={
          <AdminRoute>
            <LazyPage><AdminPromoOffers /></LazyPage>
          </AdminRoute>
        }
      />
      <Route
        path="/admin/remnawave"
        element={
          <AdminRoute>
            <LazyPage><AdminRemnawave /></LazyPage>
          </AdminRoute>
        }
      />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  )
}

export default App

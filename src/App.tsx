import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from './store/auth'
import Layout from './components/layout/Layout'
import PageLoader from './components/common/PageLoader'
import { saveReturnUrl } from './utils/token'
import Login from './pages/Login'
import TelegramCallback from './pages/TelegramCallback'
import TelegramRedirect from './pages/TelegramRedirect'
import DeepLinkRedirect from './pages/DeepLinkRedirect'
import Dashboard from './pages/Dashboard'
import Subscription from './pages/Subscription'
import Balance from './pages/Balance'
import Referral from './pages/Referral'
import Support from './pages/Support'
import Profile from './pages/Profile'
import AdminTickets from './pages/AdminTickets'
import AdminSettings from './pages/AdminSettings'
import AdminApps from './pages/AdminApps'
import VerifyEmail from './pages/VerifyEmail'
import Contests from './pages/Contests'
import Polls from './pages/Polls'
import Info from './pages/Info'
import Wheel from './pages/Wheel'
import AdminWheel from './pages/AdminWheel'
import AdminTariffs from './pages/AdminTariffs'
import AdminServers from './pages/AdminServers'
import AdminPanel from './pages/AdminPanel'
import AdminDashboard from './pages/AdminDashboard'
import AdminBanSystem from './pages/AdminBanSystem'
import AdminBroadcasts from './pages/AdminBroadcasts'
import AdminPromocodes from './pages/AdminPromocodes'
import AdminCampaigns from './pages/AdminCampaigns'
import AdminUsers from './pages/AdminUsers'
import AdminPayments from './pages/AdminPayments'
import AdminPromoOffers from './pages/AdminPromoOffers'
import AdminRemnawave from './pages/AdminRemnawave'

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

function App() {
  return (
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
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/subscription"
        element={
          <ProtectedRoute>
            <Subscription />
          </ProtectedRoute>
        }
      />
      <Route
        path="/balance"
        element={
          <ProtectedRoute>
            <Balance />
          </ProtectedRoute>
        }
      />
      <Route
        path="/referral"
        element={
          <ProtectedRoute>
            <Referral />
          </ProtectedRoute>
        }
      />
      <Route
        path="/support"
        element={
          <ProtectedRoute>
            <Support />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/contests"
        element={
          <ProtectedRoute>
            <Contests />
          </ProtectedRoute>
        }
      />
      <Route
        path="/polls"
        element={
          <ProtectedRoute>
            <Polls />
          </ProtectedRoute>
        }
      />
      <Route
        path="/info"
        element={
          <ProtectedRoute>
            <Info />
          </ProtectedRoute>
        }
      />
      <Route
        path="/wheel"
        element={
          <ProtectedRoute>
            <Wheel />
          </ProtectedRoute>
        }
      />

      {/* Admin routes */}
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminPanel />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/tickets"
        element={
          <AdminRoute>
            <AdminTickets />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/settings"
        element={
          <AdminRoute>
            <AdminSettings />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/apps"
        element={
          <AdminRoute>
            <AdminApps />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/wheel"
        element={
          <AdminRoute>
            <AdminWheel />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/tariffs"
        element={
          <AdminRoute>
            <AdminTariffs />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/servers"
        element={
          <AdminRoute>
            <AdminServers />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/dashboard"
        element={
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/ban-system"
        element={
          <AdminRoute>
            <AdminBanSystem />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/broadcasts"
        element={
          <AdminRoute>
            <AdminBroadcasts />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/promocodes"
        element={
          <AdminRoute>
            <AdminPromocodes />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/campaigns"
        element={
          <AdminRoute>
            <AdminCampaigns />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <AdminRoute>
            <AdminUsers />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/payments"
        element={
          <AdminRoute>
            <AdminPayments />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/promo-offers"
        element={
          <AdminRoute>
            <AdminPromoOffers />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/remnawave"
        element={
          <AdminRoute>
            <AdminRemnawave />
          </AdminRoute>
        }
      />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App

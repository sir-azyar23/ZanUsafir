import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster, resolveValue, toast as hotToast } from 'react-hot-toast';
import { CheckCircle, Close, ErrorOutlined, InfoOutlined } from '@mui/icons-material';
import { AuthProvider } from './hooks/useAuth';
import { ToastProvider } from './hooks/useToast';
import { ThemeProvider } from './hooks/useTheme';
import { NotificationProvider } from './hooks/useNotifications';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';
import TransitionToast from './components/TransitionToast';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import DashboardPage from './pages/DashboardPage';
import RoutesPage from './pages/RoutesPage';
import CreateRoutePage from './pages/CreateRoutePage';
import ViewGeneratedRoutesPage from './pages/ViewGeneratedRoutesPage';
import TransportOfficerRoutesPage from './pages/TransportOfficerRoutesPage';
import BusStopsPage from './pages/BusStopsPage';
import BusesPage from './pages/BusesPage';
import DriversPage from './pages/DriversPage';
import FaresPage from './pages/FaresPage';
import ReportsPage from './pages/ReportsPage';
import NotificationsPage from './pages/NotificationsPage';
import AuditLogsPage from './pages/AuditLogsPage';
import UsersPage from './pages/UsersPage';
import ProfilePage from './pages/ProfilePage';
import ExplorePage from './pages/ExplorePage';
import MyTicketsPage from './pages/MyTicketsPage';
import AdminTicketsPage from './pages/AdminTicketsPage';
import RouteSettingsPage from './pages/RouteSettingsPage';
import UnauthorizedPage from './pages/UnauthorizedPage';

const HOT_TOAST_STYLES = {
  success: {
    background: '#12a150',
    color: '#FFFFFF',
    icon: '#FFFFFF',
    border: '#0b3d24',
    shadow: '0 18px 48px rgba(18, 161, 80, 0.18)',
  },
  error: {
    background: 'rgba(255, 239, 242, 0.95)',
    color: '#861B1B',
    icon: 'var(--danger)',
    border: 'var(--danger)',
    shadow: '0 18px 48px rgba(220, 38, 38, 0.14)',
  },
  info: {
    background: '#0f7a3f',
    color: '#ffffff',
    icon: '#e3f7ea',
    border: '#12a150',
    shadow: '0 18px 48px rgba(15, 122, 63, 0.18)',
  },
};

function getHotToastVariant(type) {
  if (type === 'error') return 'error';
  if (type === 'success') return 'success';
  return 'info';
}

function HotToastIcon({ type, color }) {
  if (type === 'error') return <ErrorOutlined style={{ color, fontSize: 22 }} />;
  if (type === 'success') return <CheckCircle style={{ color, fontSize: 22 }} />;
  return <InfoOutlined style={{ color, fontSize: 22 }} />;
}

function HotToastCard({ item }) {
  const variant = getHotToastVariant(item.type);
  const styles = HOT_TOAST_STYLES[variant];
  const message = resolveValue(item.message, item);

  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      style={{
        width: 360,
        maxWidth: 'calc(100vw - 28px)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '14px 14px 13px',
        borderRadius: 14,
        background: styles.background,
        color: styles.color,
        border: '1px solid rgba(30, 125, 58, 0.15)',
        borderLeft: `5px solid ${styles.border}`,
        boxShadow: styles.shadow,
        overflow: 'hidden',
        position: 'relative',
        fontFamily: 'Inter, sans-serif',
        animation: 'hotToastSlideIn 220ms cubic-bezier(0.2, 0.8, 0.2, 1) both',
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          background: variant === 'info' ? 'rgba(167, 243, 208, 0.14)' : 'rgba(255, 255, 255, 0.45)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <HotToastIcon type={item.type} color={styles.icon} />
      </div>

      <div style={{ flex: 1, minWidth: 0, paddingTop: 1, fontSize: '0.84rem', lineHeight: 1.45, fontWeight: 650 }}>
        {message}
      </div>

      <button
        type="button"
        aria-label="Close notification"
        onClick={() => hotToast.dismiss(item.id)}
        style={{
          width: 28,
          height: 28,
          border: 'none',
          borderRadius: 8,
          background: variant === 'info' ? 'rgba(255,255,255,0.12)' : 'rgba(var(--dark-rgb),0.06)',
          color: styles.color,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Close style={{ fontSize: 17 }} />
      </button>

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 3,
          background: styles.border,
          transformOrigin: 'left center',
          animation: 'hotToastProgress 3000ms linear forwards',
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <ToastProvider>
        <AuthProvider>
          <NotificationProvider>
          <TransitionToast />
          <style>{`
            @keyframes hotToastSlideIn {
              from { opacity: 0; transform: translate3d(28px, -6px, 0); }
              to { opacity: 1; transform: translate3d(0, 0, 0); }
            }

            @keyframes hotToastProgress {
              from { transform: scaleX(1); }
              to { transform: scaleX(0); }
            }

            @media (max-width: 520px) {
              [data-rht-toaster] {
                left: 14px !important;
                right: 14px !important;
                top: 14px !important;
              }
            }
          `}</style>
          <Toaster
            position="top-right"
            gutter={10}
            containerStyle={{ top: 24, right: 24 }}
            toastOptions={{
              duration: 3000,
              style: { padding: 0, background: 'transparent', boxShadow: 'none' },
            }}
          >
            {item => <HotToastCard item={item} />}
          </Toaster>
          <Routes>
            {/* Public */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/login" element={<LoginPage />} />

            {/* Protected — any authenticated user */}
            <Route element={<ProtectedRoute />}>
              <Route path="/change-password" element={<ChangePasswordPage />} />
              <Route element={<DashboardLayout />}>
                <Route path="/dashboard"     element={<DashboardPage />} />
                <Route path="/reports"       element={<ReportsPage />} />
                <Route path="/settings"      element={<ProfilePage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/profile"       element={<ProfilePage />} />
              </Route>
            </Route>

            {/* Protected — non-Admin authenticated users */}
            <Route element={<ProtectedRoute roles={['TRANSPORT_OFFICER']} />}>
              <Route element={<DashboardLayout />}>
                <Route path="/my-tickets"   element={<MyTicketsPage />} />
              </Route>
            </Route>

            {/* Protected — ADMIN only */}
            <Route element={<ProtectedRoute adminOnly />}>
              <Route element={<DashboardLayout />}>
                <Route path="/routes font" element={<RoutesPage />} />
                <Route path="/routes" element={<RoutesPage />} />
                <Route path="/stops" element={<BusStopsPage />} />
                <Route path="/route-settings font" element={<RouteSettingsPage />} />
                <Route path="/route-settings" element={<RouteSettingsPage />} />
                <Route path="/buses"         element={<BusesPage />} />
                <Route path="/fares"         element={<Navigate to="/route-settings" replace />} />
                <Route path="/drivers"       element={<DriversPage />} />
                <Route path="/tickets"       element={<AdminTicketsPage />} />
                <Route path="/audit-logs" element={<AuditLogsPage />} />
                <Route path="/users"      element={<UsersPage />} />
              </Route>
            </Route>

            {/* Protected — TRANSPORT OFFICER only */}
            <Route element={<ProtectedRoute roles={['TRANSPORT_OFFICER']} />}>
              <Route element={<DashboardLayout />}>
                <Route path="/create-route" element={<CreateRoutePage />} />
                <Route path="/generate-route-map" element={<Navigate to="/create-route" replace />} />
                <Route path="/route-map" element={<Navigate to="/create-route" replace />} />
                <Route path="/view-routes" element={<ViewGeneratedRoutesPage />} />
                <Route path="/pending-routes" element={<TransportOfficerRoutesPage status="SUBMITTED" title="Pending Routes" />} />
                <Route path="/approved-routes" element={<TransportOfficerRoutesPage status="APPROVED" title="Approved Routes" />} />
                <Route path="/rejected-routes" element={<TransportOfficerRoutesPage status="REJECTED" title="Rejected Routes" />} />
                <Route path="/route-reviews" element={<TransportOfficerRoutesPage title="Route Reviews" />} />
              </Route>
            </Route>

            {/* Unauthorized fallback */}
            <Route path="/unauthorized" element={<UnauthorizedPage />} />

            {/* 404 fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </NotificationProvider>
        </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

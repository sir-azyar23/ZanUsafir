import { CheckCircle, Close, ErrorOutlined, InfoOutlined, Logout } from '@mui/icons-material';
import { useToast } from '../hooks/useToast';

const TOAST_COPY = {
  login: {
    title: 'Login Successful',
    message: 'Welcome back! You have logged in successfully.',
  },
  logout: {
    title: 'Logout Successful',
    message: 'You have logged out successfully.',
  },
  loading: {
    title: 'Please wait...',
    message: 'Your request is being processed.',
  },
  success: {
    title: 'Success',
    message: '',
  },
  error: {
    title: 'Login Failed',
    message: 'Invalid email or password. Please try again.',
  },
};

const STYLE_BY_VARIANT = {
  success: {
    background: '#39B54A',
    color: '#ffffff',
    icon: '#ffffff',
    border: '#1E7D3A',
    shadow: '0 18px 48px rgba(57, 181, 74, 0.18)',
  },
  error: {
    background: 'rgba(255, 239, 242, 0.95)',
    color: '#861B1B',
    icon: 'var(--danger)',
    border: 'var(--danger)',
    shadow: '0 18px 48px rgba(220, 38, 38, 0.14)',
  },
  info: {
    background: '#0B4F8A',
    color: '#ffffff',
    icon: '#36A9E1',
    border: '#36A9E1',
    shadow: '0 18px 48px rgba(11, 79, 138, 0.28)',
  },
};

function getVariant(type) {
  if (type === 'error') return 'error';
  if (type === 'loading') return 'info';
  return 'success';
}

function ToastIcon({ type, color }) {
  if (type === 'logout') return <Logout style={{ color, fontSize: 22 }} />;
  if (type === 'error') return <ErrorOutlined style={{ color, fontSize: 22 }} />;
  if (type === 'loading') return <InfoOutlined style={{ color, fontSize: 22 }} />;
  return <CheckCircle style={{ color, fontSize: 22 }} />;
}

export default function TransitionToast() {
  const { toast, hideToast } = useToast();
  const { active, type, title, message, duration } = toast;

  if (!active) return null;

  const variant = getVariant(type);
  const styles = STYLE_BY_VARIANT[variant];
  const fallback = TOAST_COPY[type] || TOAST_COPY.success;
  const displayTitle = title || fallback.title;
  const displayMessage = message || fallback.message;
  const progressDuration = duration || 3000;

  return (
    <>
      <style>{`
        @keyframes toastSlideIn {
          from { opacity: 0; transform: translate3d(28px, -6px, 0); }
          to { opacity: 1; transform: translate3d(0, 0, 0); }
        }

        @keyframes toastProgress {
          from { transform: scaleX(1); }
          to { transform: scaleX(0); }
        }

        @media (max-width: 520px) {
          .transition-toast {
            left: 14px !important;
            right: 14px !important;
            top: 14px !important;
            width: auto !important;
          }
        }
      `}</style>

      <div
        className="transition-toast"
        role={variant === 'error' ? 'alert' : 'status'}
        aria-live={variant === 'error' ? 'assertive' : 'polite'}
        style={{
          position: 'fixed',
          top: 24,
          right: 24,
          zIndex: 9999,
          width: 360,
          maxWidth: 'calc(100vw - 28px)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          padding: '14px 14px 13px',
          borderRadius: 14,
          background: styles.background,
          color: styles.color,
          border: '1px solid rgba(0, 49, 82, 0.08)',
          borderLeft: `5px solid ${styles.border}`,
          boxShadow: styles.shadow,
          animation: 'toastSlideIn 220ms cubic-bezier(0.2, 0.8, 0.2, 1) both',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            background: variant === 'info' ? 'rgba(173, 223, 241, 0.14)' : 'rgba(255, 255, 255, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <ToastIcon type={type} color={styles.icon} />
        </div>

        <div style={{ flex: 1, minWidth: 0, paddingTop: 1 }}>
          <div style={{ fontWeight: 800, fontSize: '0.92rem', lineHeight: 1.25 }}>
            {displayTitle}
          </div>
          {displayMessage && (
            <div style={{ marginTop: 3, fontSize: '0.82rem', lineHeight: 1.45, opacity: 0.9 }}>
              {displayMessage}
            </div>
          )}
        </div>

        <button
          type="button"
          aria-label="Close notification"
          onClick={hideToast}
          style={{
            width: 28,
            height: 28,
            border: 'none',
            borderRadius: 8,
            background: variant === 'info' ? 'rgba(255,255,255,0.08)' : 'rgba(var(--dark-rgb),0.06)',
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
            animation: `toastProgress ${progressDuration}ms linear forwards`,
          }}
        />
      </div>
    </>
  );
}

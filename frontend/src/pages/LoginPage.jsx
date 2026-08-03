import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { CircularProgress } from '@mui/material';
import { Visibility, VisibilityOff, Login as LoginIcon, ErrorOutlined, ArrowBack } from '@mui/icons-material';
import zanusafiriLogo from '../assets/zanusafiri.png';

export default function LoginPage() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inlineError, setInlineError] = useState('');
  const [fieldError, setFieldError] = useState(false);
  const [shake, setShake] = useState(false);
  const { login } = useAuth();
  const { toast, showToast, hideToast } = useToast();
  const navigate = useNavigate();

  // Dismiss stale transition toasts, but let logout success finish its 3s lifecycle.
  useEffect(() => {
    if (toast.type !== 'logout') hideToast();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (inlineError) { setInlineError(''); setFieldError(false); }
  };

  const getErrorMessage = (err) => {
    const status = err.response?.status;
    const msg = err.response?.data?.message || '';
    if (status === 401 || msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('credentials')) {
      return 'Invalid email or password. Please try again.';
    }
    if (status === 403) return 'Your account has been disabled. Contact an administrator.';
    if (status === 0 || !err.response) return 'Cannot reach the server. Check your network connection.';
    return msg || 'Sign in failed. Please try again.';
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 600);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username.trim() || !form.password.trim()) {
      setInlineError('Please enter your username and password.');
      setFieldError(true);
      triggerShake();
      return;
    }
    setLoading(true);
    setInlineError('');
    setFieldError(false);
    try {
      const data = await login(form);
      const displayName = data.fullName?.split(' ')[0] || data.username || '';
      if (data.mustChangePassword) {
        showToast({
          type: 'success',
          title: 'Password Change Required',
          message: data.message || 'You are using a temporary password. Please change your password to continue.',
        });
        navigate('/change-password', { replace: true });
        return;
      }
      // Show toast immediately, navigate — toast stays until dashboard data loads
      showToast({ type: 'login', name: displayName });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const msg = getErrorMessage(err);
      setInlineError(msg);
      setFieldError(true);
      setLoading(false);
      showToast({
        type: 'error',
        title: 'Login Failed',
        message: 'Invalid email or password. Please try again.',
      });
      triggerShake();
    }
  };

  const inputStyle = (hasError) => ({
    width: '100%', padding: '12px 16px',
    background: hasError ? 'rgba(var(--danger-rgb),0.12)' : 'rgba(255,255,255,0.1)',
    border: `1.5px solid ${hasError ? 'rgba(var(--danger-rgb),0.5)' : 'rgba(255,255,255,0.2)'}`,
    borderRadius: 12, color: 'white', fontSize: '0.9rem',
    outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box',
  });

  return (
    <>
      {/* ── Shake keyframe & styles ── */}
      <style>{`
        @keyframes formShake {
          0%,100% { transform: translateX(0); }
          18%     { transform: translateX(-7px); }
          36%     { transform: translateX(7px); }
          54%     { transform: translateX(-5px); }
          72%     { transform: translateX(5px); }
          90%     { transform: translateX(-2px); }
        }
        .back-home-btn:hover {
          color: #a3f7b5 !important;
          background: rgba(255, 255, 255, 0.12) !important;
          border-color: rgba(57, 181, 74, 0.4) !important;
          transform: translateX(-2px);
          box-shadow: 0 6px 16px rgba(57, 181, 74, 0.2) !important;
        }
      `}</style>

      <div className="login-bg">
        <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 440, padding: '0 20px' }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{
              width: 80, height: 80, borderRadius: 20,
              margin: '0 auto 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
              overflow: 'hidden',
            }}>
              <img
                src={zanusafiriLogo}
                alt="ZanUsafiri Logo"
                style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 20 }}
              />
            </div>
            <h1 style={{ color: 'white', fontSize: '2rem', fontWeight: 800, margin: 0 }}>
              ZanUsafiri
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', marginTop: 6 }}>
              Route Management System
            </p>
          </div>

          {/* Card */}
          <div style={{
            background: 'rgba(255,255,255,0.08)',
            backdropFilter: 'blur(20px)',
            border: `1px solid ${fieldError ? 'rgba(var(--danger-rgb),0.4)' : 'rgba(255,255,255,0.15)'}`,
            borderRadius: 24,
            padding: 36,
            boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
            transition: 'border-color 0.3s',
            animation: shake ? 'formShake 0.55s ease' : 'none',
          }}>
            <h2 style={{ color: 'white', fontSize: '1.25rem', fontWeight: 700, marginBottom: 8 }}>
              Sign in to your account
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', marginBottom: 28 }}>
              Enter your credentials to access the dashboard
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', fontWeight: 600, marginBottom: 6 }}>
                  Username
                </label>
                <input
                  type="text"
                  value={form.username}
                  onChange={e => handleChange('username', e.target.value)}
                  placeholder="Enter your username"
                  required
                  autoComplete="username"
                  style={inputStyle(fieldError)}
                  onFocus={e => { if (!fieldError) e.target.style.borderColor = 'var(--accent)'; }}
                  onBlur={e => { if (!fieldError) e.target.style.borderColor = 'rgba(255,255,255,0.2)'; }}
                />
              </div>

              <div>
                <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', fontWeight: 600, marginBottom: 6 }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => handleChange('password', e.target.value)}
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
                    style={{ ...inputStyle(fieldError), padding: '12px 44px 12px 16px' }}
                    onFocus={e => { if (!fieldError) e.target.style.borderColor = 'var(--accent)'; }}
                    onBlur={e => { if (!fieldError) e.target.style.borderColor = 'rgba(255,255,255,0.2)'; }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)' }}
                  >
                    {showPw ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                  </button>
                </div>
              </div>

              {/* Inline error message */}
              {inlineError && (
                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  background: 'rgba(var(--danger-rgb),0.12)',
                  border: '1px solid rgba(var(--danger-rgb),0.35)',
                  borderLeft: '3px solid var(--danger)',
                  borderRadius: 10, padding: '11px 14px',
                  animation: 'fadeIn 0.25s ease',
                }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: '50%',
                    background: 'rgba(var(--danger-rgb),0.18)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
                  }}>
                    <ErrorOutlined style={{ fontSize: 17, color: 'var(--danger)' }} />
                  </div>
                  <div>
                    <div style={{ color: 'var(--danger)', fontWeight: 700, fontSize: '0.82rem' }}>Sign In Failed</div>
                    <div style={{ color: 'rgba(var(--danger-rgb),0.7)', fontSize: '0.78rem', marginTop: 2, lineHeight: 1.4 }}>{inlineError}</div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  marginTop: 8,
                  padding: '13px',
                  background: loading ? 'rgba(var(--primary-rgb),0.5)' : 'linear-gradient(135deg, var(--primary), var(--primary-hover))',
                  border: 'none', borderRadius: 12, color: 'white',
                  fontWeight: 700, fontSize: '0.95rem', cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 20px rgba(var(--primary-rgb),0.4)'
                }}
              >
                {loading ? <CircularProgress size={20} style={{ color: 'white' }} /> : <LoginIcon />}
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.78rem', marginTop: 24, marginBottom: 0 }}>
              © 2026 ZanUsafiri Route Management System
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="back-home-btn"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  backdropFilter: 'blur(5px)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  color: 'rgba(255, 255, 255, 0.75)',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  padding: '6px 14px',
                  borderRadius: '20px',
                  transition: 'all 0.25s ease',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                }}
              >
                <ArrowBack style={{ fontSize: 15 }} />
                Back Home
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

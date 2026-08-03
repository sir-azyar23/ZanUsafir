import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { changePassword as apiChangePassword } from '../services/api';
import toast from 'react-hot-toast';
import { LockReset, Visibility, VisibilityOff, DirectionsBus } from '@mui/icons-material';
import { CircularProgress } from '@mui/material';

export default function ChangePasswordPage() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const { updateUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (form.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    if (form.currentPassword === form.newPassword) {
      toast.error('New password must be different from current password');
      return;
    }
    setLoading(true);
    try {
      await apiChangePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      updateUser({ mustChangePassword: false, temporaryPasswordExpiresAt: null });
      toast.success('Password changed successfully!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '12px 44px 12px 16px',
    background: 'rgba(255,255,255,0.1)',
    border: '1.5px solid rgba(255,255,255,0.2)',
    borderRadius: 12, color: 'white', fontSize: '0.9rem',
    outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box',
  };

  const eyeBtn = {
    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
    background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)',
  };

  return (
    <div className="login-bg">
      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 460, padding: '0 20px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20,
            background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 8px 32px rgba(var(--accent-rgb),0.38)',
          }}>
            <DirectionsBus style={{ color: 'var(--dark)', fontSize: 36 }} />
          </div>
          <h1 style={{ color: 'white', fontSize: '2rem', fontWeight: 800, margin: 0 }}>ZanUsafiri</h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', marginTop: 6 }}>
            Route Management System
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(255,255,255,0.08)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 24, padding: 36,
          boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
        }}>
          {/* Warning banner */}
          <div style={{
            background: 'rgba(var(--accent-rgb),0.15)',
            border: '1px solid rgba(var(--accent-rgb),0.35)',
            borderRadius: 12, padding: '12px 16px',
            marginBottom: 24, display: 'flex', alignItems: 'flex-start', gap: 10,
          }}>
            <LockReset style={{ color: 'var(--accent)', fontSize: 20, marginTop: 1, flexShrink: 0 }} />
            <div>
              <div style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '0.85rem' }}>
                Temporary Password Detected
              </div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', marginTop: 2 }}>
                You are using a temporary password. Please change your password to continue.
              </div>
            </div>
          </div>

          <h2 style={{ color: 'white', fontSize: '1.25rem', fontWeight: 700, marginBottom: 24 }}>
            Set New Password
          </h2>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Current password */}
            <div>
              <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', fontWeight: 600, marginBottom: 6 }}>
                Current Password (given by admin)
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={form.currentPassword}
                  onChange={e => setForm({ ...form, currentPassword: e.target.value })}
                  placeholder="Enter current password"
                  required
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.2)'}
                />
                <button type="button" style={eyeBtn} onClick={() => setShowCurrent(!showCurrent)}>
                  {showCurrent ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                </button>
              </div>
            </div>

            {/* New password */}
            <div>
              <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', fontWeight: 600, marginBottom: 6 }}>
                New Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showNew ? 'text' : 'password'}
                  value={form.newPassword}
                  onChange={e => setForm({ ...form, newPassword: e.target.value })}
                  placeholder="Min. 6 characters"
                  required
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.2)'}
                />
                <button type="button" style={eyeBtn} onClick={() => setShowNew(!showNew)}>
                  {showNew ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div>
              <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', fontWeight: 600, marginBottom: 6 }}>
                Confirm New Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={form.confirmPassword}
                  onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                  placeholder="Re-enter new password"
                  required
                  style={{
                    ...inputStyle,
                    borderColor: form.confirmPassword && form.newPassword !== form.confirmPassword
                      ? 'var(--danger)' : 'rgba(255,255,255,0.2)',
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={e => {
                    e.target.style.borderColor =
                      form.confirmPassword && form.newPassword !== form.confirmPassword
                        ? 'var(--danger)' : 'rgba(255,255,255,0.2)';
                  }}
                />
                <button type="button" style={eyeBtn} onClick={() => setShowConfirm(!showConfirm)}>
                  {showConfirm ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                </button>
              </div>
              {form.confirmPassword && form.newPassword !== form.confirmPassword && (
                <p style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: 4 }}>Passwords do not match</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 8, padding: '13px',
                background: loading ? 'rgba(var(--primary-rgb),0.5)' : 'linear-gradient(135deg, var(--primary), var(--primary-hover))',
                border: 'none', borderRadius: 12, color: 'white',
                fontWeight: 700, fontSize: '0.95rem', cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: '0 4px 20px rgba(var(--primary-rgb),0.4)',
              }}
            >
              {loading ? <CircularProgress size={20} style={{ color: 'white' }} /> : <LockReset />}
              {loading ? 'Changing Password...' : 'Change Password & Continue'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <button
              onClick={() => { logout(); navigate('/login'); }}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '0.78rem', cursor: 'pointer' }}
            >
              Sign out instead
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

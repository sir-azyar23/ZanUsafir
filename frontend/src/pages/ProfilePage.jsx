import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getProfile, updateProfile, changePassword as apiChangePassword } from '../services/api';
import toast from 'react-hot-toast';
import { Avatar } from '@mui/material';
import {
  AccountCircle, Edit, Save, Close, Lock, Visibility, VisibilityOff,
  AdminPanelSettings, Person, CalendarToday, Email, Badge,
} from '@mui/icons-material';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ fullName: '', email: '' });
  const [savingProfile, setSavingProfile] = useState(false);

  // Change password state
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false });
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    getProfile()
      .then(res => {
        setProfile(res.data);
        setEditForm({ fullName: res.data.fullName, email: res.data.email });
      })
      .catch(() => {
        // fallback to stored user
        if (user) {
          setProfile(user);
          setEditForm({ fullName: user.fullName, email: user.email });
        }
      });
  }, [user]);

  const handleSaveProfile = async () => {
    if (!editForm.fullName.trim() || !editForm.email.trim()) {
      toast.error('Full name and email are required');
      return;
    }
    setSavingProfile(true);
    try {
      const res = await updateProfile(editForm);
      setProfile(res.data);
      updateUser({ fullName: res.data.fullName, email: res.data.email });
      setEditMode(false);
      toast.success('Profile updated successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (pwForm.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    setSavingPw(true);
    try {
      await apiChangePassword({
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Password changed successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setSavingPw(false);
    }
  };

  const infoRow = (Icon, label, value, mono = false) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: 'var(--bg-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon style={{ fontSize: 18, color: 'var(--primary)' }} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
        <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600, marginTop: 1, fontFamily: mono ? 'monospace' : 'inherit' }}>{value || '—'}</div>
      </div>
    </div>
  );

  const pwInput = (field, placeholder, show, toggle) => (
    <div style={{ position: 'relative' }}>
      <input
        className="form-input"
        type={show ? 'text' : 'password'}
        value={pwForm[field]}
        onChange={e => setPwForm({ ...pwForm, [field]: e.target.value })}
        placeholder={placeholder}
        required
        style={{ paddingRight: 44 }}
      />
      <button
        type="button"
        onClick={toggle}
        style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
      >
        {show ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
      </button>
    </div>
  );

  return (
    <div style={{ maxWidth: 780, margin: '0 auto' }}>
      {/* Header card with avatar */}
      <div style={{
        borderRadius: 20, padding: 28, marginBottom: 24,
        background: 'linear-gradient(135deg, #12a150 0%, #0b3d24 100%)',
        display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap',
      }}>
        <Avatar sx={{ width: 72, height: 72, fontSize: 28, bgcolor: 'var(--primary)', boxShadow: '0 4px 16px rgba(var(--primary-rgb),0.5)' }}>
          {profile?.fullName?.charAt(0) || user?.fullName?.charAt(0) || 'U'}
        </Avatar>
        <div style={{ flex: 1 }}>
          <h2 style={{ color: 'white', fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>
            {profile?.fullName || user?.fullName}
          </h2>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', marginTop: 4 }}>
            {profile?.email || user?.email}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 12px', background: 'rgba(var(--primary-rgb),0.35)', color: 'var(--primary-tint-strong)', borderRadius: 999, fontSize: '0.75rem', fontWeight: 700 }}>
              {profile?.role === 'ADMIN'
                ? <AdminPanelSettings style={{ fontSize: 14 }} />
                : <Person style={{ fontSize: 14 }} />}
              {profile?.role || user?.role}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 12px', background: 'rgba(var(--primary-rgb),0.2)', color: 'var(--primary-tint-strong)', borderRadius: 999, fontSize: '0.75rem', fontWeight: 700 }}>
              Active
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
        {/* Profile Info / Edit */}
        <div className="stat-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <AccountCircle style={{ color: 'var(--primary)', fontSize: 22 }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Profile Information</h3>
            </div>
            {!editMode && (
              <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => setEditMode(true)}>
                <Edit fontSize="small" /> Edit
              </button>
            )}
          </div>

          {editMode ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="form-label">Full Name</label>
                <input
                  className="form-input"
                  value={editForm.fullName}
                  onChange={e => setEditForm({ ...editForm, fullName: e.target.value })}
                  placeholder="Full name"
                />
              </div>
              <div>
                <label className="form-label">Email Address</label>
                <input
                  className="form-input"
                  type="email"
                  value={editForm.email}
                  onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                  placeholder="Email"
                />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button className="btn btn-primary" onClick={handleSaveProfile} disabled={savingProfile} style={{ flex: 1 }}>
                  <Save fontSize="small" /> {savingProfile ? 'Saving...' : 'Save Changes'}
                </button>
                <button className="btn btn-ghost" onClick={() => { setEditMode(false); setEditForm({ fullName: profile?.fullName, email: profile?.email }); }} style={{ flex: 1 }}>
                  <Close fontSize="small" /> Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              {infoRow(Badge, 'Full Name', profile?.fullName || user?.fullName)}
              {infoRow(Email, 'Email Address', profile?.email || user?.email)}
              {infoRow(AccountCircle, 'Username', profile?.username || user?.username, true)}
              {infoRow(
                profile?.role === 'ADMIN' ? AdminPanelSettings : Person,
                'Role',
                profile?.role || user?.role
              )}
              {profile?.createdAt && infoRow(
                CalendarToday,
                'Member Since',
                new Date(profile.createdAt).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })
              )}
            </div>
          )}
        </div>

        {/* Change Password */}
        <div className="stat-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <Lock style={{ color: 'var(--primary)', fontSize: 22 }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Change Password</h3>
          </div>

          <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label className="form-label">Current Password</label>
              {pwInput('currentPassword', 'Enter current password', showPw.current, () => setShowPw(p => ({ ...p, current: !p.current })))}
            </div>
            <div>
              <label className="form-label">New Password</label>
              {pwInput('newPassword', 'Min. 6 characters', showPw.new, () => setShowPw(p => ({ ...p, new: !p.new })))}
            </div>
            <div>
              <label className="form-label">Confirm New Password</label>
              {pwInput('confirmPassword', 'Re-enter new password', showPw.confirm, () => setShowPw(p => ({ ...p, confirm: !p.confirm })))}
              {pwForm.confirmPassword && pwForm.newPassword !== pwForm.confirmPassword && (
                <p style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: 4 }}>Passwords do not match</p>
              )}
            </div>
            <button type="submit" className="btn btn-primary" disabled={savingPw} style={{ marginTop: 4 }}>
              <Lock fontSize="small" /> {savingPw ? 'Changing...' : 'Change Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

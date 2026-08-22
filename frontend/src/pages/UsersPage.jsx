import { useEffect, useState } from 'react';
import { register, getUsers, updateUser, deleteUser, toggleUserActive } from '../services/api';
import { Add, AdminPanelSettings, Person, Delete, ToggleOn, ToggleOff, VpnKey, ContentCopy, Check, Edit } from '@mui/icons-material';
import { Avatar } from '@mui/material';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';

const emptyUserForm = { username: '', email: '', fullName: '', phoneNumber: '', role: 'TRANSPORT_OFFICER' };

const normalizeRole = (role) => {
  if (!role) return 'TRANSPORT_OFFICER';
  return String(role).trim().toUpperCase().replaceAll('-', '_').replaceAll(' ', '_');
};

const getApiErrorMessage = (err, fallback) => (
  err.response?.data?.message
  || err.response?.data?.error
  || err.message
  || fallback
);

function UserModal({ open, onClose, onSave, initialData }) {
  const [form, setForm] = useState(emptyUserForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setForm(initialData ? {
        username: initialData.username || '',
        email: initialData.email || '',
        fullName: initialData.fullName || '',
        phoneNumber: initialData.phoneNumber || '',
        role: initialData.role || 'TRANSPORT_OFFICER',
      } : emptyUserForm);
    });
  }, [initialData, open]);

  if (!open) return null;

  const editing = !!initialData;

  const handleClose = () => {
    setForm(emptyUserForm);
    onClose();
  };

  const handleSave = async () => {
    if (!form.username || !form.email || !form.fullName || !form.phoneNumber) {
      toast.error('All fields are required'); return;
    }
    setSaving(true);
    try { await onSave({ ...form, role: normalizeRole(form.role) }); handleClose(); }
    catch (e) { toast.error(e.response?.data?.message || 'Failed to create user'); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
          {editing ? 'Edit User' : 'Add New User'}
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: 20 }}>
          {editing
            ? 'Update the user profile and role without changing their password.'
            : 'A secure temporary password will be auto-generated and shown after creation. Share it manually with the user.'}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Full Name *</label>
            <input className="form-input" value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} placeholder="John Doe" />
          </div>
          <div>
            <label className="form-label">Username *</label>
            <input className="form-input" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} placeholder="johndoe" />
          </div>
          <div>
            <label className="form-label">Role *</label>
            <select className="form-input" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
              <option value="TRANSPORT_OFFICER">Transport Officer</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Email *</label>
            <input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="user@zanusafiri.tz" />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Phone Number *</label>
            <input className="form-input" type="tel" value={form.phoneNumber} onChange={e => setForm({ ...form, phoneNumber: e.target.value })} placeholder="+255 7XX XXX XXX" />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={handleClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? (editing ? 'Saving...' : 'Creating...') : (editing ? 'Save Changes' : 'Create User')}
          </button>
        </div>
      </div>
    </div>
  );
}

function GeneratedPasswordModal({ open, onClose, userData }) {
  const [copied, setCopied] = useState(false);

  if (!open || !userData) return null;

  const expiryText = userData.temporaryPasswordExpiresAt
    ? new Date(userData.temporaryPasswordExpiresAt).toLocaleString()
    : '24 hours after creation';
  const shouldShowPassword = !!userData.generatedPassword;

  const handleCopy = () => {
    navigator.clipboard.writeText(userData.generatedPassword).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg, var(--success), var(--dark))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 26 }}>
            <VpnKey style={{ color: 'var(--dark)', fontSize: 28 }} />
          </div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>User Created Successfully</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            A temporary password was generated for <strong>{userData.fullName}</strong>. Share it manually with the user. They will be required to change it on first login.
          </p>
        </div>

        <div style={{ background: 'var(--bg-light)', borderRadius: 12, padding: '14px 16px', marginBottom: 16, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Manual Password Sharing
          </div>
          <div style={{ color: 'var(--text-primary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
            Email sending is temporarily disabled. Copy the password below and share it with <strong>{userData.email}</strong>.
          </div>
        </div>

        {shouldShowPassword && (
          <div style={{ background: 'var(--bg-light)', borderRadius: 12, padding: '14px 16px', marginBottom: 16, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Temporary Password</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <code style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.08em', wordBreak: 'break-all' }}>
                {userData.generatedPassword}
              </code>
              <button
                onClick={handleCopy}
                style={{ background: copied ? 'var(--success)' : 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', color: copied ? 'var(--dark)' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', whiteSpace: 'nowrap', transition: 'all 0.2s' }}
              >
                {copied ? <Check fontSize="small" /> : <ContentCopy fontSize="small" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        )}

        <div style={{ background: 'var(--primary-tint)', border: '1px solid var(--primary)', borderRadius: 10, padding: '10px 14px', marginBottom: 20, fontSize: '0.82rem', color: 'var(--dark)' }}>
          Copy this password now. It expires after 24 hours and will not be shown again.
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16, fontSize: '0.82rem' }}>
          <div style={{ color: 'var(--text-secondary)' }}>Username</div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{userData.username}</div>
          <div style={{ color: 'var(--text-secondary)' }}>Email</div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{userData.email}</div>
          <div style={{ color: 'var(--text-secondary)' }}>Role</div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{userData.role}</div>
          <div style={{ color: 'var(--text-secondary)' }}>Temp Password Expiry</div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{expiryText}</div>
        </div>

        <button className="btn btn-primary" style={{ width: '100%' }} onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [createdUser, setCreatedUser] = useState(null);
  const [deletingUserId, setDeletingUserId] = useState(null);

  const fetchUsers = async () => {
    try {
      const res = await getUsers();
      setUsers(res.data);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  const handleCreate = async (form) => {
    const res = await register(form);
    setCreatedUser(res.data);
    fetchUsers();
  };

  const handleSaveUser = async (form) => {
    if (editingUser) {
      const res = await updateUser(editingUser.id, form);
      setUsers(prev => prev.map(item => item.id === editingUser.id ? res.data : item));
      toast.success('User updated');
      setEditingUser(null);
      return;
    }

    await handleCreate(form);
  };

  const handleDelete = async (u) => {
    const confirmed = window.confirm(
      `Delete user "${u.fullName}" permanently?\n\nThis action removes the user from the database and cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingUserId(u.id);
    try {
      const res = await deleteUser(u.id);
      toast.success(res.data?.message || 'User deleted permanently');
      await fetchUsers();
    } catch (err) {
      if (err.response?.status === 404) {
        setUsers(prev => prev.filter(x => x.id !== u.id));
      }
      toast.error(getApiErrorMessage(err, 'Failed to delete user'));
    } finally {
      setDeletingUserId(null);
    }
  };

  const handleToggleActive = async (u) => {
    try {
      const res = await toggleUserActive(u.id);
      toast.success(`User ${res.data.active ? 'activated' : 'deactivated'}`);
      setUsers(prev => prev.map(x => x.id === u.id ? res.data : x));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update user status');
    }
  };

  return (
    <div>
      {/* Page Hero */}
      <div className="page-hero" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 26 }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h2>User Management</h2>
          <p>Manage system users, roles and access permissions</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditingUser(null); setModalOpen(true); }}>
          <Add fontSize="small" /> Add User
        </button>
      </div>

      {/* Current user card */}
      <div style={{ marginBottom: 24, padding: '18px 22px', borderRadius: 16, background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)', display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 8px 24px rgba(15,23,42,0.3)' }}>
        <Avatar sx={{ width: 52, height: 52, fontSize: 20, background: 'linear-gradient(135deg, rgba(255,255,255,0.25), rgba(255,255,255,0.1))', border: '2px solid rgba(255,255,255,0.3)' }}>
          {user?.fullName?.charAt(0)}
        </Avatar>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: 'white', fontWeight: 800, fontSize: '1rem' }}>{user?.fullName}</div>
          <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.82rem', marginTop: 2 }}>{user?.email} · {user?.role}</div>
          <div style={{ display: 'inline-flex', marginTop: 6, padding: '2px 10px', background: 'rgba(255,255,255,0.15)', borderRadius: 999, color: 'rgba(255,255,255,0.9)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', border: '1px solid rgba(255,255,255,0.2)' }}>
            Currently logged in
          </div>
        </div>
      </div>

      {/* Users table */}
      <div className="stat-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>Loading users...</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>User</th><th>Username</th><th>Email</th><th>Phone</th><th>Role</th><th>Status</th><th>Password</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar sx={{ width: 36, height: 36, fontSize: 14, bgcolor: u.role === 'ADMIN' ? 'var(--primary-hover)' : 'var(--primary)' }}>
                        {u.fullName.charAt(0)}
                      </Avatar>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{u.fullName}</span>
                    </div>
                  </td>
                  <td>
                    <code style={{ fontSize: '0.82rem', background: 'var(--bg-light)', padding: '3px 8px', borderRadius: 6 }}>
                      @{u.username}
                    </code>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{u.phoneNumber || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {u.role === 'ADMIN'
                        ? <AdminPanelSettings style={{ color: 'var(--primary-hover)', fontSize: 18 }} />
                        : <Person style={{ color: 'var(--primary)', fontSize: 18 }} />
                      }
                      <span className={`badge ${u.role === 'ADMIN' ? 'badge-info' : 'badge-success'}`}
                        style={{ background: u.role === 'ADMIN' ? 'var(--primary-tint)' : 'var(--primary-tint-strong)', color: 'var(--primary-hover)' }}>
                        {u.role === 'TRANSPORT_OFFICER' ? 'TRANSPORT OFFICER' : u.role}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${u.active ? 'badge-success' : 'badge-danger'}`}>
                      {u.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    {u.mustChangePassword
                      ? <span className="badge badge-warning" style={{ background: 'var(--primary-tint)', color: 'var(--dark)' }}>Must Change</span>
                      : <span className="badge badge-success" style={{ background: 'var(--primary-tint-strong)', color: 'var(--dark)' }}>Set</span>
                    }
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {u.username !== user?.username && (
                        <>
                          <button
                            onClick={() => { setEditingUser(u); setModalOpen(true); }}
                            title="Edit user"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', padding: 4, borderRadius: 6 }}
                          >
                            <Edit fontSize="small" />
                          </button>
                          <button
                            onClick={() => handleToggleActive(u)}
                            title={u.active ? 'Deactivate' : 'Activate'}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: u.active ? 'var(--dark)' : 'var(--primary)', padding: 4, borderRadius: 6 }}
                          >
                            {u.active ? <ToggleOff /> : <ToggleOn />}
                          </button>
                          <button
                            onClick={() => handleDelete(u)}
                            disabled={deletingUserId === u.id}
                            title="Delete user"
                            style={{ background: 'none', border: 'none', cursor: deletingUserId === u.id ? 'wait' : 'pointer', color: 'var(--danger)', padding: 4, borderRadius: 6, opacity: deletingUserId === u.id ? 0.55 : 1 }}
                          >
                            <Delete fontSize="small" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <UserModal open={modalOpen} onClose={() => { setModalOpen(false); setEditingUser(null); }} onSave={handleSaveUser} initialData={editingUser} />
      <GeneratedPasswordModal open={!!createdUser} onClose={() => setCreatedUser(null)} userData={createdUser} />
    </div>
  );
}

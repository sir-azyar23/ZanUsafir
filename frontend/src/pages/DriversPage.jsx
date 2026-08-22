import { useCallback, useEffect, useMemo, useState } from 'react';
import { getDrivers, getBuses, createDriver, updateDriver, deleteDriver } from '../services/api';
import { Add, Edit, Delete, Search, Phone, Badge } from '@mui/icons-material';
import { IconButton, Tooltip, Avatar } from '@mui/material';
import toast from 'react-hot-toast';

const statusColors = { ACTIVE: 'badge-success', INACTIVE: 'badge-danger', ON_LEAVE: 'badge-warning' };

function DriverModal({ open, onClose, onSave, initial, buses }) {
  const [form, setForm] = useState({ fullName: '', licenseNumber: '', phone: '', email: '', address: '', status: 'ACTIVE', busId: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      if (initial) {
        setForm({
          fullName: initial.fullName,
          licenseNumber: initial.licenseNumber,
          phone: initial.phone,
          email: initial.email || '',
          address: initial.address || '',
          status: initial.status,
          busId: initial.busId || '',
        });
      } else {
        setForm({ fullName: '', licenseNumber: '', phone: '', email: '', address: '', status: 'ACTIVE', busId: '' });
      }
    });
  }, [initial, open]);

  if (!open) return null;

  const handleSave = async () => {
    if (!form.fullName || !form.licenseNumber || !form.phone) { toast.error('Name, license & phone required'); return; }
    setSaving(true);
    try { await onSave({ ...form, busId: form.busId || null }); onClose(); }
    catch (e) { toast.error(e.response?.data?.message || 'Failed to save driver'); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 24, color: 'var(--text-primary)' }}>
          {initial ? 'Edit Driver' : 'Add Driver'}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Full Name *</label>
            <input className="form-input" value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} placeholder="John Doe" />
          </div>
          <div>
            <label className="form-label">License Number *</label>
            <input className="form-input" value={form.licenseNumber} onChange={e => setForm({ ...form, licenseNumber: e.target.value })} placeholder="DL-12345" />
          </div>
          <div>
            <label className="form-label">Phone *</label>
            <input className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+255 700 000000" />
          </div>
          <div>
            <label className="form-label">Email</label>
            <input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="driver@email.com" />
          </div>
          <div>
            <label className="form-label">Status</label>
            <select className="form-input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="ON_LEAVE">On Leave</option>
            </select>
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Address</label>
            <input className="form-input" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Stone Town, Zanzibar" />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Assign to Bus</label>
            <select className="form-input" value={form.busId} onChange={e => setForm({ ...form, busId: e.target.value })}>
              <option value="">— No Bus —</option>
              {buses.map(b => <option key={b.id} value={b.id}>{b.plateNumber} ({b.model || 'Bus'})</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : initial ? 'Update Driver' : 'Add Driver'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DriversPage() {
  const [drivers, setDrivers] = useState([]);
  const [buses, setBuses] = useState([]);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([getDrivers(), getBuses()])
      .then(([d, b]) => { setDrivers(d.data); setBuses(b.data); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    queueMicrotask(load);
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return drivers.filter(d => d.fullName.toLowerCase().includes(q) || d.licenseNumber.toLowerCase().includes(q) || d.phone.includes(q));
  }, [search, drivers]);

  const handleSave = async (form) => {
    if (editTarget) { await updateDriver(editTarget.id, form); toast.success('Driver updated'); }
    else { await createDriver(form); toast.success('Driver added'); }
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this driver?')) return;
    try {
      await deleteDriver(id);
      toast.success('Driver deleted');
      load();
      window.dispatchEvent(new CustomEvent('zanusafiri:data-refresh'));
    }
    catch (error) { toast.error(error.response?.data?.message || 'Failed to delete driver'); }
  };

  return (
    <div>
      <div className="page-hero" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 26 }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h2>Driver Management</h2>
          <p>{filtered.length} drivers registered in the system</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontSize: 18 }} />
            <input
              style={{
                paddingLeft: 34, width: 200, padding: '9px 12px 9px 34px',
                background: 'var(--bg-light)', border: '1px solid var(--border)',
                borderRadius: 10, color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none'
              }}
              placeholder="Search drivers..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" onClick={() => { setEditTarget(null); setModalOpen(true); }}>
            <Add fontSize="small" /> Add Driver
          </button>
        </div>
      </div>

      <div className="stat-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-secondary)' }}>Loading drivers...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-secondary)' }}>No drivers found</div>
        ) : (
          <table className="data-table">
            <thead><tr><th>Driver</th><th>License</th><th>Phone</th><th>Bus</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map(driver => (
                <tr key={driver.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar sx={{ width: 36, height: 36, fontSize: 14, bgcolor: 'var(--primary)' }}>
                        {driver.fullName.charAt(0)}
                      </Avatar>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{driver.fullName}</div>
                        {driver.email && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{driver.email}</div>}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Badge fontSize="small" style={{ color: 'var(--text-secondary)', fontSize: 16 }} />
                      <code style={{ fontSize: '0.8rem' }}>{driver.licenseNumber}</code>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Phone fontSize="small" style={{ color: 'var(--text-secondary)', fontSize: 16 }} />
                      {driver.phone}
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{driver.busPlateNumber || '— Unassigned'}</td>
                  <td><span className={`badge ${statusColors[driver.status]}`}>{driver.status.replace('_', ' ')}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <Tooltip title="Edit"><IconButton size="small" onClick={() => { setEditTarget(driver); setModalOpen(true); }} style={{ color: 'var(--primary)' }}><Edit fontSize="small" /></IconButton></Tooltip>
                      <Tooltip title="Delete"><IconButton size="small" onClick={() => handleDelete(driver.id)} style={{ color: 'var(--danger)' }}><Delete fontSize="small" /></IconButton></Tooltip>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <DriverModal open={modalOpen} onClose={() => { setModalOpen(false); setEditTarget(null); }} onSave={handleSave} initial={editTarget} buses={buses} />
    </div>
  );
}

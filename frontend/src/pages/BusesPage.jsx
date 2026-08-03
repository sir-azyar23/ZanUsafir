import { useCallback, useEffect, useMemo, useState } from 'react';
import { getBuses, getRoutes, createBus, updateBus, deleteBus } from '../services/api';
import { Add, Delete, DirectionsBus, Edit, Search, VisibilityOutlined } from '@mui/icons-material';
import { IconButton, Tooltip } from '@mui/material';
import toast from 'react-hot-toast';

const statusColors = {
  ACTIVE: 'badge-success',
  INACTIVE: 'badge-danger',
  MAINTENANCE: 'badge-warning',
};

const emptyBusForm = {
  busNumber: '',
  plateNumber: '',
  capacity: '',
  model: '',
  color: '',
  status: 'ACTIVE',
  routeId: '',
};

const asText = (value) => (value == null ? '' : String(value));

const normalizeList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const getBusNumber = (bus) => (
  bus?.busNumber || bus?.busNo || bus?.number || (bus?.id ? `#${bus.id}` : '—')
);

const getErrorMessage = (error, fallback) => (
  error?.response?.data?.message || error?.response?.data?.error || error?.message || fallback
);

function BusModal({ open, onClose, onSave, initial, routes }) {
  const [form, setForm] = useState(emptyBusForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      if (initial) {
        setForm({
          busNumber: initial.busNumber || initial.busNo || initial.number || '',
          plateNumber: initial.plateNumber || '',
          capacity: initial.capacity || '',
          model: initial.model || '',
          color: initial.color || '',
          status: initial.status || 'ACTIVE',
          routeId: initial.routeId || '',
        });
      } else {
        setForm(emptyBusForm);
      }
    });
  }, [initial, open]);

  if (!open) return null;

  const handleSave = async () => {
    if (!form.busNumber.trim()) {
      toast.error('Bus number is required');
      return;
    }

    if (!form.plateNumber.trim()) {
      toast.error('Plate number is required');
      return;
    }

    const capacity = Number(form.capacity);
    if (!Number.isInteger(capacity) || capacity <= 0) {
      toast.error('Capacity must be a valid number');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        busNumber: form.busNumber.trim(),
        plateNumber: form.plateNumber.trim(),
        capacity,
        model: form.model.trim() || null,
        color: form.color.trim() || null,
        status: form.status,
        routeId: form.routeId ? Number(form.routeId) : null,
      });
      if (!initial) setForm(emptyBusForm);
      onClose();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to save bus'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={saving ? undefined : onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 24, color: 'var(--text-primary)' }}>
          {initial ? 'Edit Bus' : 'Add Bus'}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          <div>
            <label className="form-label">Bus Number *</label>
            <input
              className="form-input"
              value={form.busNumber}
              onChange={e => setForm({ ...form, busNumber: e.target.value })}
              placeholder="e.g. 1"
              disabled={saving}
            />
          </div>
          <div>
            <label className="form-label">Plate Number *</label>
            <input
              className="form-input"
              value={form.plateNumber}
              onChange={e => setForm({ ...form, plateNumber: e.target.value })}
              placeholder="ZNZ-123"
              disabled={saving}
            />
          </div>
          <div>
            <label className="form-label">Capacity *</label>
            <input
              className="form-input"
              type="number"
              min="1"
              value={form.capacity}
              onChange={e => setForm({ ...form, capacity: e.target.value })}
              placeholder="50"
              disabled={saving}
            />
          </div>
          <div>
            <label className="form-label">Model</label>
            <input
              className="form-input"
              value={form.model}
              onChange={e => setForm({ ...form, model: e.target.value })}
              placeholder="Toyota Coaster"
              disabled={saving}
            />
          </div>
          <div>
            <label className="form-label">Color</label>
            <input
              className="form-input"
              value={form.color}
              onChange={e => setForm({ ...form, color: e.target.value })}
              placeholder="White"
              disabled={saving}
            />
          </div>
          <div>
            <label className="form-label">Status</label>
            <select
              className="form-input"
              value={form.status}
              onChange={e => setForm({ ...form, status: e.target.value })}
              disabled={saving}
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="MAINTENANCE">Maintenance</option>
            </select>
          </div>
          <div>
            <label className="form-label">Assigned Route</label>
            <select
              className="form-input"
              value={form.routeId}
              onChange={e => setForm({ ...form, routeId: e.target.value })}
              disabled={saving}
            >
              <option value="">— No Route —</option>
              {routes.map(route => (
                <option key={route.id} value={route.id}>{route.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : initial ? 'Update Bus' : 'Add Bus'}
          </button>
        </div>
      </div>
    </div>
  );
}

function BusViewModal({ bus, onClose }) {
  if (!bus) return null;

  const rows = [
    ['Bus Number', getBusNumber(bus)],
    ['Plate Number', bus.plateNumber],
    ['Capacity', bus.capacity ? `${bus.capacity} seats` : null],
    ['Model', bus.model],
    ['Color', bus.color],
    ['Assigned Route', bus.routeName],
    ['Driver', bus.driverName],
    ['Status', bus.status],
    ['Created At', bus.createdAt ? new Date(bus.createdAt).toLocaleString() : null],
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 620 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
              Bus Details
            </h2>
            <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              {bus.plateNumber || 'Unknown plate'}
            </p>
          </div>
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {rows.map(([label, value]) => (
              <tr key={label} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '12px 0', color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase' }}>
                  {label}
                </td>
                <td style={{ padding: '12px 0', color: 'var(--text-primary)', fontWeight: 600, textAlign: 'right' }}>
                  {value || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function BusesPage() {
  const [buses, setBuses] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [routeFilter, setRouteFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [viewTarget, setViewTarget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [busResponse, routeResponse] = await Promise.all([getBuses(), getRoutes()]);
      setBuses(normalizeList(busResponse.data));
      setRoutes(normalizeList(routeResponse.data));
    } catch (loadError) {
      console.error('Failed to load buses:', loadError);
      setBuses([]);
      setRoutes([]);
      setError(getErrorMessage(loadError, 'Failed to load buses.'));
      toast.error('Failed to load buses');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(load);
  }, [load]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return buses.filter(bus => {
      const matchesSearch =
        !query ||
        asText(getBusNumber(bus)).toLowerCase().includes(query) ||
        asText(bus.plateNumber).toLowerCase().includes(query) ||
        asText(bus.model).toLowerCase().includes(query) ||
        asText(bus.routeName).toLowerCase().includes(query) ||
        asText(bus.driverName).toLowerCase().includes(query);

      const matchesStatus = !statusFilter || bus.status === statusFilter;
      const matchesRoute = !routeFilter || String(bus.routeId || '') === routeFilter;

      return matchesSearch && matchesStatus && matchesRoute;
    });
  }, [buses, routeFilter, search, statusFilter]);

  const handleSave = async (form) => {
    if (editTarget) {
      await updateBus(editTarget.id, form);
      toast.success('Bus updated successfully');
    } else {
      await createBus(form);
      toast.success('Bus saved successfully');
    }
    await load();
  };

  const handleDelete = async (bus) => {
    if (!window.confirm(`Delete bus ${bus.plateNumber || getBusNumber(bus)}?`)) return;
    try {
      await deleteBus(bus.id);
      toast.success('Bus deleted successfully');
      await load();
      window.dispatchEvent(new CustomEvent('zanusafiri:data-refresh'));
    } catch (deleteError) {
      toast.error(getErrorMessage(deleteError, 'Failed to delete bus'));
    }
  };

  return (
    <div>
      {/* Page Hero */}
      <div className="page-hero" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 26 }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h2>Fleet Management</h2>
          <p>{loading ? 'Loading buses...' : `${filtered.length} bus${filtered.length !== 1 ? 'es' : ''} in fleet`}</p>
        </div>
        <button className="btn" onClick={() => { setEditTarget(null); setModalOpen(true); }}
          style={{ position: 'relative', zIndex: 1, background: 'rgba(255,255,255,0.15)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.25)', backdropFilter: 'blur(8px)', boxShadow: 'none' }}>
          <Add fontSize="small" /> Add Bus
        </button>
      </div>

      <div className="stat-card" style={{ padding: 16, marginBottom: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) 180px 220px', gap: 12, alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontSize: 18 }} />
            <input
              className="form-input"
              style={{ paddingLeft: 34, width: '100%' }}
              placeholder="Search bus number, plate, route..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select className="form-input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="MAINTENANCE">Maintenance</option>
          </select>
          <select className="form-input" value={routeFilter} onChange={e => setRouteFilter(e.target.value)}>
            <option value="">All routes</option>
            {routes.map(route => (
              <option key={route.id} value={route.id}>{route.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="stat-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 56, textAlign: 'center', color: 'var(--text-secondary)' }}>Loading buses...</div>
        ) : error ? (
          <div style={{ padding: 56, textAlign: 'center', color: 'var(--text-secondary)' }}>
            <div style={{ color: 'var(--danger)', fontWeight: 700, marginBottom: 8 }}>Could not load buses</div>
            <div style={{ marginBottom: 16 }}>{error}</div>
            <button className="btn btn-primary" onClick={load}>Retry</button>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 56, textAlign: 'center', color: 'var(--text-secondary)' }}>
            {buses.length === 0 ? 'No buses found.' : 'No buses match your search or filters.'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ minWidth: 940 }}>
              <thead>
                <tr>
                  <th>Bus Number</th>
                  <th>Plate Number</th>
                  <th>Capacity</th>
                  <th>Assigned Route</th>
                  <th>Driver</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(bus => (
                  <tr key={bus.id}>
                    <td style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{getBusNumber(bus)}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 34,
                          height: 34,
                          borderRadius: 10,
                          background: 'rgba(var(--accent-rgb),0.45)',
                          color: 'var(--primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          <DirectionsBus fontSize="small" />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{bus.plateNumber || '—'}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{bus.model || 'Unknown model'}</div>
                        </div>
                      </div>
                    </td>
                    <td>{bus.capacity ? `${bus.capacity} seats` : '—'}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{bus.routeName || 'Unassigned'}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{bus.driverName || 'Unassigned'}</td>
                    <td><span className={`badge ${statusColors[bus.status] || 'badge-info'}`}>{bus.status || 'UNKNOWN'}</span></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Tooltip title="View Bus">
                          <IconButton size="small" onClick={() => setViewTarget(bus)} style={{ color: 'var(--primary)' }}>
                            <VisibilityOutlined fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit Bus">
                          <IconButton size="small" onClick={() => { setEditTarget(bus); setModalOpen(true); }} style={{ color: 'var(--primary)' }}>
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Bus">
                          <IconButton size="small" onClick={() => handleDelete(bus)} style={{ color: 'var(--danger)' }}>
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <BusModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditTarget(null); }}
        onSave={handleSave}
        initial={editTarget}
        routes={routes}
      />

      <BusViewModal bus={viewTarget} onClose={() => setViewTarget(null)} />
    </div>
  );
}

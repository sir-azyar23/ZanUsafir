import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { getFares, getRoutes, getBusStops, createFare, updateFare, deleteFare, updateRoute, deleteRoute } from '../services/api';
import { Add, Edit, Delete, Search, Visibility, KeyboardArrowRight, KeyboardArrowDown, KeyboardArrowUp } from '@mui/icons-material';
import { IconButton, Tooltip } from '@mui/material';
import toast from 'react-hot-toast';
import RouteFormModal from '../components/RouteFormModal';

function FareModal({ open, onClose, onSave, initial, routes, stops }) {
  const [form, setForm] = useState({ routeId: '', fromStopId: '', toStopId: '', amount: '', currency: 'TZS', status: 'ACTIVE' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      if (initial) {
        setForm({
          routeId: initial.routeId || '',
          fromStopId: initial.fromStopId || '',
          toStopId: initial.toStopId || '',
          amount: initial.amount || '',
          currency: initial.currency || 'TZS',
          status: initial.status || 'ACTIVE',
        });
      } else {
        setForm({ routeId: '', fromStopId: '', toStopId: '', amount: '', currency: 'TZS', status: 'ACTIVE' });
      }
    });
  }, [initial, open]);

  if (!open) return null;

  const selectedRoute = routes.find(route => route.id === Number(form.routeId));
  const routeStopIds = new Set((selectedRoute?.stops || []).map(stop => stop.stopId));
  const availableStops = selectedRoute
    ? stops.filter(stop => routeStopIds.has(stop.id))
    : stops;

  const updateRouteId = (routeId) => {
    const route = routes.find(item => item.id === Number(routeId));
    const stopIds = new Set((route?.stops || []).map(stop => stop.stopId));
    setForm(current => ({
      ...current,
      routeId,
      fromStopId: stopIds.has(Number(current.fromStopId)) ? current.fromStopId : '',
      toStopId: stopIds.has(Number(current.toStopId)) ? current.toStopId : '',
    }));
  };

  const handleSave = async () => {
    if (!form.routeId || !form.fromStopId || !form.toStopId || !form.amount) { toast.error('All fields required'); return; }
    if (form.fromStopId === form.toStopId) { toast.error('From stop and To stop must be different'); return; }
    setSaving(true);
    try {
      await onSave({
        routeId: Number(form.routeId),
        fromStopId: Number(form.fromStopId),
        toStopId: Number(form.toStopId),
        amount: parseFloat(form.amount),
        currency: form.currency,
        status: form.status,
      });
      onClose();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed to save fare'); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 24, color: 'var(--text-primary)' }}>
          {initial?.id ? 'Edit Fare' : 'Add Fare'}
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="form-label">Route *</label>
            <select className="form-input" value={form.routeId} onChange={e => updateRouteId(e.target.value)} disabled={!!initial}>
              <option value="">Select route</option>
              {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          {form.routeId && availableStops.length === 0 && (
            <div style={{ padding: 12, borderRadius: 8, background: '#fff7ed', color: '#9a3412', fontWeight: 700 }}>
              No bus stops available for this route.
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label className="form-label">From Stop *</label>
              <select className="form-input" value={form.fromStopId} onChange={e => setForm({ ...form, fromStopId: e.target.value })}>
                <option value="">Select stop</option>
                {availableStops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">To Stop *</label>
              <select className="form-input" value={form.toStopId} onChange={e => setForm({ ...form, toStopId: e.target.value })}>
                <option value="">Select stop</option>
                {availableStops.map(s => <option key={s.id} value={s.id} disabled={String(s.id) === String(form.fromStopId)}>{s.name}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 16 }}>
            <div>
              <label className="form-label">Amount *</label>
              <input className="form-input" type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="500" />
            </div>
            <div>
              <label className="form-label">Currency</label>
              <select className="form-input" value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}>
                <option value="TZS">TZS</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <div>
              <label className="form-label">Status</label>
              <select className="form-input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : initial?.id ? 'Update Fare' : 'Add Fare'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function FaresPage() {
  const [fares, setFares] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [stops, setStops] = useState([]);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterRoute, setFilterRoute] = useState('');

  // Route modal states
  const [routeFormOpen, setRouteFormOpen] = useState(false);
  const [routeEditTarget, setRouteEditTarget] = useState(null);

  // Expanded routes set
  const [expandedRouteIds, setExpandedRouteIds] = useState(new Set());

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([getFares(), getRoutes(), getBusStops()])
      .then(([f, r, s]) => { setFares(f.data); setRoutes(r.data); setStops(s.data); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    queueMicrotask(load);
  }, [load]);

  const filteredRoutes = useMemo(() => {
    let list = routes;
    if (filterRoute) list = list.filter(r => r.id === Number(filterRoute));
    const q = search.toLowerCase();
    if (q) list = list.filter(r => r.name.toLowerCase().includes(q));
    return list;
  }, [search, routes, filterRoute]);

  const handleSave = async (form) => {
    if (editTarget && editTarget.id) {
      await updateFare(editTarget.id, form);
      toast.success('Fare updated');
    }
    else {
      await createFare(form);
      toast.success('Fare added');
    }
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this fare?')) return;
    try {
      await deleteFare(id);
      toast.success('Fare deleted');
      load();
      window.dispatchEvent(new CustomEvent('zanusafiri:data-refresh'));
    }
    catch (error) { toast.error(error.response?.data?.message || 'Failed to delete fare'); }
  };

  const handleRouteSave = async (form) => {
    if (routeEditTarget) {
      await updateRoute(routeEditTarget.id, form);
      toast.success('Route updated');
    }
    load();
  };

  const handleRouteDelete = async (route) => {
    if (!confirm(`Delete route "${route.name}"? This will delete all fares and related data for this route.`)) return;
    try {
      await deleteRoute(route.id);
      toast.success(`Route "${route.name}" deleted`);
      load();
      window.dispatchEvent(new CustomEvent('zanusafiri:data-refresh'));
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to delete route');
    }
  };

  const toggleRouteExpand = (routeId) => {
    setExpandedRouteIds(prev => {
      const next = new Set(prev);
      if (next.has(routeId)) {
        next.delete(routeId);
      } else {
        next.add(routeId);
      }
      return next;
    });
  };

  const fmt = (amount, currency) =>
    new Intl.NumberFormat('sw-TZ', { style: 'currency', currency: currency || 'TZS', maximumFractionDigits: 0 }).format(amount);

  return (
    <div>
      <div className="page-hero" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 26 }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h2>Fare Management</h2>
          <p>{filteredRoutes.length} route{filteredRoutes.length !== 1 ? 's' : ''} in the system</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
          <select
            style={{
              padding: '9px 12px', width: 160,
              background: 'var(--bg-light)', border: '1px solid var(--border)',
              borderRadius: 10, color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none'
            }}
            value={filterRoute}
            onChange={e => setFilterRoute(e.target.value)}
          >
            <option value="">All Routes</option>
            {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontSize: 18 }} />
            <input
              style={{
                paddingLeft: 34, width: 180, padding: '9px 12px 9px 34px',
                background: 'var(--bg-light)', border: '1px solid var(--border)',
                borderRadius: 10, color: 'var(--text-primary)', fontSize: '0.875rem', outline: 'none'
              }}
              placeholder="Search routes..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="stat-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-secondary)' }}>Loading routes and fares...</div>
        ) : filteredRoutes.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-secondary)' }}>No routes found</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ paddingLeft: 24 }}>Route Name</th>
                <th style={{ textAlign: 'right', paddingRight: 24 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRoutes.map(route => {
                const isExpanded = expandedRouteIds.has(route.id);
                const routeFares = fares.filter(f => f.routeId === route.id);

                return (
                  <Fragment key={route.id}>
                    <tr>
                      <td style={{ verticalAlign: 'middle', paddingLeft: 24 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <button
                            onClick={() => toggleRouteExpand(route.id)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              padding: 4,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'var(--text-secondary)',
                              transition: 'transform 0.2s',
                              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                            }}
                          >
                            <KeyboardArrowRight />
                          </button>
                          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', textTransform: 'uppercase' }}>
                            {route.name}
                          </span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', paddingRight: 24 }}>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
                          <button
                            onClick={() => toggleRouteExpand(route.id)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '6px 14px',
                              background: 'var(--bg-light)',
                              border: '1px solid var(--border)',
                              borderRadius: 10,
                              color: 'var(--text-primary)',
                              fontSize: '0.85rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                            }}
                          >
                            <Visibility fontSize="small" style={{ fontSize: 16 }} />
                            View {isExpanded ? <KeyboardArrowUp fontSize="small" style={{ fontSize: 16 }} /> : <KeyboardArrowDown fontSize="small" style={{ fontSize: 16 }} />}
                          </button>

                          <button
                            onClick={() => {
                              setEditTarget({ routeId: route.id });
                              setModalOpen(true);
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '6px 14px',
                              background: 'var(--primary)',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: 10,
                              fontSize: '0.85rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              boxShadow: '0 2px 6px rgba(57,181,74,0.2)',
                            }}
                          >
                            <Add fontSize="small" style={{ fontSize: 16 }} />
                            Add Fare
                          </button>

                          <button
                            onClick={() => {
                              setRouteEditTarget(route);
                              setRouteFormOpen(true);
                            }}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '6px 14px',
                              background: 'var(--bg-card)',
                              border: '1px solid var(--border)',
                              borderRadius: 10,
                              color: 'var(--primary-hover)',
                              fontSize: '0.85rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                            }}
                          >
                            <Edit fontSize="small" style={{ fontSize: 16 }} />
                            Edit
                          </button>

                          <button
                            onClick={() => handleRouteDelete(route)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '6px 14px',
                              background: 'rgba(220,38,38,0.05)',
                              border: '1px solid rgba(220,38,38,0.15)',
                              borderRadius: 10,
                              color: 'var(--danger)',
                              fontSize: '0.85rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                            }}
                          >
                            <Delete fontSize="small" style={{ fontSize: 16 }} />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={2} style={{ padding: '0 24px 20px 24px', background: 'rgba(57, 181, 74, 0.02)' }}>
                          <div className="animate-fade-in" style={{
                            background: 'var(--bg-card)',
                            borderRadius: 12,
                            border: '1px solid var(--border)',
                            padding: 18,
                            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.01)',
                          }}>
                            {routeFares.length === 0 ? (
                              <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-secondary)' }}>
                                No fare records found for this route.
                              </div>
                            ) : (
                              <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                  <tr style={{ background: 'var(--bg-light)' }}>
                                    <th style={{ background: 'transparent', color: 'var(--text-primary)', borderBottom: '2px solid var(--border)', padding: '10px 14px' }}>From Bus Stop</th>
                                    <th style={{ background: 'transparent', color: 'var(--text-primary)', borderBottom: '2px solid var(--border)', padding: '10px 14px' }}>To Bus Stop</th>
                                    <th style={{ background: 'transparent', color: 'var(--text-primary)', borderBottom: '2px solid var(--border)', padding: '10px 14px' }}>Fare Amount</th>
                                    <th style={{ background: 'transparent', color: 'var(--text-primary)', borderBottom: '2px solid var(--border)', padding: '10px 14px' }}>Status</th>
                                    <th style={{ background: 'transparent', color: 'var(--text-primary)', borderBottom: '2px solid var(--border)', padding: '10px 14px', textAlign: 'right' }}>Actions</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {routeFares.map(fare => (
                                    <tr key={fare.id}>
                                      <td style={{ fontWeight: 500, padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>{fare.fromStopName}</td>
                                      <td style={{ fontWeight: 500, padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>{fare.toStopName}</td>
                                      <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
                                        <span style={{ fontWeight: 700, color: 'var(--dark)' }}>
                                          {fmt(fare.amount, fare.currency)}
                                        </span>
                                      </td>
                                      <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
                                        <span className={`badge ${fare.status === 'ACTIVE' ? 'badge-success' : 'badge-warning'}`}>
                                          {fare.status || 'ACTIVE'}
                                        </span>
                                      </td>
                                      <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                                          <Tooltip title="Edit Fare">
                                            <IconButton size="small" onClick={() => { setEditTarget(fare); setModalOpen(true); }} style={{ color: 'var(--primary)' }}>
                                              <Edit fontSize="small" />
                                            </IconButton>
                                          </Tooltip>
                                          <Tooltip title="Delete Fare">
                                            <IconButton size="small" onClick={() => handleDelete(fare.id)} style={{ color: 'var(--danger)' }}>
                                              <Delete fontSize="small" />
                                            </IconButton>
                                          </Tooltip>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      <FareModal open={modalOpen} onClose={() => { setModalOpen(false); setEditTarget(null); }} onSave={handleSave} initial={editTarget} routes={routes} stops={stops} />
      <RouteFormModal open={routeFormOpen} onClose={() => { setRouteFormOpen(false); setRouteEditTarget(null); }} onSave={handleRouteSave} initial={routeEditTarget} />
    </div>
  );
}

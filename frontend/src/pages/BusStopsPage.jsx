import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { MapContainer, Marker, TileLayer, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getBusStops, createBusStop, updateBusStop, deleteBusStop, getRoutes, addStop } from '../services/api';
import { Add, Edit, Delete, Search, MyLocation } from '@mui/icons-material';
import { IconButton, Tooltip } from '@mui/material';
import toast from 'react-hot-toast';

const DEFAULT_MAP_CENTER = [-6.165917, 39.202641];

const pickerIcon = L.divIcon({
  className: 'stop-map-picker-marker',
  html: '<span style="width:18px;height:18px;display:block;border-radius:999px;background:#36A9E1;border:3px solid var(--primary);box-shadow:0 4px 12px rgba(31,41,55,0.16);"></span>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function MapClickHandler({ onPick }) {
  useMapEvents({
    click(event) {
      onPick(event.latlng.lat.toFixed(6), event.latlng.lng.toFixed(6));
    },
  });
  return null;
}

function MapSearchBox({ onSelect }) {
  const map = useMap();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) {
      L.DomEvent.disableClickPropagation(ref.current);
      L.DomEvent.disableScrollPropagation(ref.current);
    }
  }, []);

  const handleSearch = async (val) => {
    setQuery(val);
    if (val.trim().length < 3) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&limit=5`);
      const data = await res.json();
      setResults(data || []);
      setOpen(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const selectResult = (r) => {
    const lat = parseFloat(r.lat);
    const lon = parseFloat(r.lon);
    onSelect(lat.toFixed(6), lon.toFixed(6));
    map.setView([lat, lon], 15);
    setQuery(r.display_name);
    setResults([]);
    setOpen(false);
  };

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        top: 10,
        left: 50,
        zIndex: 1000,
        width: '280px',
      }}
    >
      <input
        type="text"
        className="form-input"
        style={{
          width: '100%',
          background: '#ffffff',
          color: '#1e293b',
          border: '2px solid rgba(57,181,74,0.3)',
          boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
          padding: '8px 12px',
          borderRadius: '10px',
          fontSize: '0.85rem',
          outline: 'none',
        }}
        placeholder="🔍 Search address, street, place..."
        value={query}
        onChange={e => handleSearch(e.target.value)}
        onFocus={() => { if (results.length > 0) setOpen(true); }}
      />
      {open && results.length > 0 && (
        <ul style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: '#ffffff',
          border: '1px solid rgba(0,0,0,0.1)',
          borderRadius: '10px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          margin: '6px 0 0',
          padding: '6px 0',
          listStyle: 'none',
          maxHeight: '180px',
          overflowY: 'auto',
          zIndex: 1010,
        }}>
          {results.map((r, idx) => (
            <li
              key={idx}
              onClick={() => selectResult(r)}
              style={{
                padding: '10px 14px',
                fontSize: '0.8rem',
                color: '#334155',
                cursor: 'pointer',
                borderBottom: idx < results.length - 1 ? '1px solid #f1f5f9' : 'none',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                overflow: 'hidden',
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => e.target.style.background = '#f1f5f9'}
              onMouseLeave={e => e.target.style.background = 'transparent'}
            >
              {r.display_name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MapCenterUpdater({ latitude, longitude }) {
  const map = useMap();
  useEffect(() => {
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      map.setView([lat, lng], 15);
    }
  }, [latitude, longitude, map]);
  return null;
}

function MapCoordinatePicker({ latitude, longitude, onPick }) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  const position = Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : DEFAULT_MAP_CENTER;

  return (
    <div className="stop-map-picker" style={{ position: 'relative' }}>
      <MapContainer center={position} zoom={12} style={{ height: '100%', width: '100%' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapClickHandler onPick={onPick} />
        <MapSearchBox onSelect={onPick} />
        <MapCenterUpdater latitude={latitude} longitude={longitude} />
        {Number.isFinite(lat) && Number.isFinite(lng) && (
          <Marker position={[lat, lng]} icon={pickerIcon} />
        )}
      </MapContainer>
    </div>
  );
}

function StopModal({ open, onClose, onSave, initial, preselectedRouteId, preselectedStopOrder }) {
  const [form, setForm] = useState({ name: '', stopCode: '', address: '', latitude: '', longitude: '', status: 'ACTIVE', routeId: '', stopOrder: '' });
  const [routes, setRoutes] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    getRoutes().then(r => setRoutes(r.data)).catch(() => {});
    queueMicrotask(() => {
      if (initial) {
        setForm({
          name: initial.name,
          stopCode: initial.stopCode || '',
          address: initial.address || '',
          latitude: initial.latitude,
          longitude: initial.longitude,
          status: initial.status,
          routeId: '',
          stopOrder: '',
        });
      } else {
        setForm({
          name: '',
          stopCode: '',
          address: '',
          latitude: '',
          longitude: '',
          status: 'ACTIVE',
          routeId: preselectedRouteId ? String(preselectedRouteId) : '',
          stopOrder: preselectedStopOrder ? String(preselectedStopOrder) : '',
        });
      }
    });
  }, [initial, open, preselectedRouteId, preselectedStopOrder]);

  if (!open) return null;

  const handleSave = async () => {
    if (!form.name.trim() || !form.latitude || !form.longitude) { toast.error('Name, latitude & longitude are required'); return; }
    if (!initial && !form.routeId) { toast.error('Please select a route for this stop'); return; }
    if (!initial && (!form.stopOrder || isNaN(parseInt(form.stopOrder, 10)))) { toast.error('Stop order is required'); return; }
    setSaving(true);
    try {
      await onSave({
        ...form,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        routeId: form.routeId ? parseInt(form.routeId, 10) : null,
        stopOrder: form.stopOrder ? parseInt(form.stopOrder, 10) : null,
      });
      onClose();
    }
    catch (e) { toast.error(e.response?.data?.message || 'Failed to save stop'); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 720 }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 24, color: 'var(--text-primary)' }}>
          {initial ? 'Edit Bus Stop' : 'Add Bus Stop'}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Stop Name *</label>
            <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Darajani Market" />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Stop Code</label>
            <input className="form-input" value={form.stopCode} onChange={e => setForm({ ...form, stopCode: e.target.value })} placeholder="e.g. DRJ" />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Address</label>
            <input className="form-input" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Street address" />
          </div>
          <div>
            <label className="form-label">Latitude *</label>
            <input className="form-input" type="number" step="any" value={form.latitude} onChange={e => setForm({ ...form, latitude: e.target.value })} placeholder="-6.1630" />
          </div>
          <div>
            <label className="form-label">Longitude *</label>
            <input className="form-input" type="number" step="any" value={form.longitude} onChange={e => setForm({ ...form, longitude: e.target.value })} placeholder="39.2000" />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Pick coordinates on map</label>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
              Click the map to set the station location. Admin can then assign this stop to a route with stop order.
            </p>
            <MapCoordinatePicker
              latitude={form.latitude}
              longitude={form.longitude}
              onPick={(lat, lng) => setForm(current => ({ ...current, latitude: lat, longitude: lng }))}
            />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Status</label>
            <select className="form-input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>

          {/* Route association — only for new stops */}
          {!initial && (
            <>
              <div style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Route *</label>
                <select
                  className="form-input"
                  value={form.routeId}
                  onChange={e => setForm({ ...form, routeId: e.target.value })}
                  disabled={!!preselectedRouteId}
                >
                  <option value="">— Select a route —</option>
                  {routes.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4, display: 'block' }}>
                  This stop will be added to the selected route.
                </span>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Stop Order *</label>
                <input
                  className="form-input"
                  type="number"
                  min="1"
                  step="1"
                  value={form.stopOrder}
                  onChange={e => setForm({ ...form, stopOrder: e.target.value })}
                  placeholder="e.g. 1"
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4, display: 'block' }}>
                  Position of this stop within the route (1 = first stop).
                </span>
              </div>
            </>
          )}
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : initial ? 'Update Stop' : 'Create Stop'}
          </button>
        </div>
      </div>
    </div>
  );
}

function RouteCard({ route, stops, onAddStop, onEditStop, onDeleteStop }) {
  const [expanded, setExpanded] = useState(false);

  // Get the stops assigned to this route
  const routeStops = useMemo(() => {
    return (route.stops || [])
      .map(routeStop => {
        const stop = stops.find(s => s.id === routeStop.stopId);
        if (!stop) return null;
        return {
          ...stop,
          stopOrder: routeStop.stopOrder,
        };
      })
      .filter(Boolean)
      .sort((a, b) => (a.stopOrder ?? 0) - (b.stopOrder ?? 0));
  }, [route.stops, stops]);

  const routeNumber = route.routeNumber || route.routeCode || route.code || '—';

  return (
    <div
      className="stat-card"
      style={{
        padding: 0,
        overflow: 'hidden',
        marginBottom: 20,
        borderRadius: 16,
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
        background: 'var(--bg-card)',
        transition: 'all 0.3s ease'
      }}
    >
      {/* Route Card Header */}
      <div
        style={{
          padding: '20px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          background: 'var(--bg-card)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: 'var(--primary-tint)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              color: 'var(--primary)'
            }}
          >
            🚌
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {route.name}
            </h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginTop: 2 }}>
              Route Code: <strong style={{ color: 'var(--primary)' }}>{routeNumber}</strong>
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          {/* Status Badge */}
          <span className={`badge ${route.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.78rem', padding: '4px 10px' }}>
            {route.status}
          </span>

          {/* Stops Count */}
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
            📍 {routeStops.length} stop{routeStops.length !== 1 ? 's' : ''}
          </span>

          <div style={{ display: 'flex', gap: 10 }}>
            {/* View Stops Button */}
            <button
              className="btn btn-ghost"
              onClick={() => setExpanded(!expanded)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 16px',
                fontSize: '0.85rem',
                borderRadius: 10,
              }}
            >
              View Stops
              <span
                style={{
                  display: 'inline-block',
                  transition: 'transform 0.3s ease',
                  transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  fontSize: '0.75rem'
                }}
              >
                ▼
              </span>
            </button>

            {/* Add Stop Button */}
            <button
              className="btn btn-primary"
              onClick={() => onAddStop(route)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                fontSize: '0.85rem',
                borderRadius: 10,
              }}
            >
              Add Bus Stop
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Stops Table */}
      <div
        style={{
          maxHeight: expanded ? '2000px' : '0px',
          overflow: 'hidden',
          transition: 'max-height 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
          borderTop: expanded ? '1px solid var(--border)' : '0px solid transparent',
          background: 'var(--bg-light)'
        }}
      >
        <div style={{ padding: '16px 24px 24px' }}>
          {routeStops.length === 0 ? (
            <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              No bus stops assigned to this route. Click "Add Bus Stop" to create one.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table min-w-full">
                <thead>
                  <tr>
                    <th style={{ width: '60px' }}>Order</th>
                    <th>Bus Stop Name</th>
                    <th>Stop Code</th>
                    <th>Address</th>
                    <th>GPS Coordinates</th>
                    <th>Status</th>
                    <th style={{ width: '100px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {routeStops.map(stop => (
                    <tr key={stop.id}>
                      <td style={{ fontWeight: 700, color: 'var(--primary)', textAlign: 'center' }}>
                        #{stop.stopOrder}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{stop.name}</span>
                        </div>
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>{stop.stopCode || '—'}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{stop.address || '—'}</td>
                      <td>
                        <code style={{ fontSize: '0.75rem', background: 'var(--bg-light)', padding: '3px 8px', borderRadius: 6, color: 'var(--text-secondary)' }}>
                          {stop.latitude?.toFixed(5)}, {stop.longitude?.toFixed(5)}
                        </code>
                      </td>
                      <td>
                        <span className={`badge ${stop.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.75rem' }}>
                          {stop.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                          <Tooltip title="Edit">
                            <IconButton
                              size="small"
                              onClick={() => onEditStop(stop)}
                              style={{ color: 'var(--primary)' }}
                            >
                              <Edit fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              onClick={() => onDeleteStop(stop.id)}
                              style={{ color: 'var(--danger)' }}
                            >
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
      </div>
    </div>
  );
}

export default function BusStopsPage() {
  const [stops, setStops] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [preselectedRouteId, setPreselectedRouteId] = useState(null);
  const [preselectedStopOrder, setPreselectedStopOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([getBusStops(), getRoutes()])
      .then(([stopsRes, routesRes]) => {
        setStops(stopsRes.data || []);
        setRoutes(routesRes.data || []);
      })
      .catch(() => {
        toast.error('Failed to load bus stop and route data');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    queueMicrotask(load);
  }, [load]);

  const filteredRoutes = useMemo(() => {
    const q = search.toLowerCase();
    return routes.filter(r => 
      r.name.toLowerCase().includes(q) || 
      (r.routeNumber || r.routeCode || '').toLowerCase().includes(q)
    );
  }, [search, routes]);

  const handleSave = async (form) => {
    if (editTarget) {
      await updateBusStop(editTarget.id, form);
      toast.success('Stop updated');
    } else {
      const res = await createBusStop(form);
      const newStop = res.data;
      if (form.routeId && form.stopOrder) {
        await addStop(form.routeId, newStop.id, form.stopOrder, null, null);
      }
      toast.success('Stop created and added to route');
    }
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this stop?')) return;
    try {
      await deleteBusStop(id);
      toast.success('Stop deleted');
      load();
      window.dispatchEvent(new CustomEvent('zanusafiri:data-refresh'));
    }
    catch (error) { toast.error(error.response?.data?.message || 'Failed to delete stop'); }
  };

  const handleAddStopClick = (route) => {
    setPreselectedRouteId(route.id);
    const nextOrder = Array.isArray(route.stops) ? route.stops.length + 1 : 1;
    setPreselectedStopOrder(nextOrder);
    setEditTarget(null);
    setModalOpen(true);
  };

  const handleEditStopClick = (stop) => {
    setPreselectedRouteId(null);
    setPreselectedStopOrder(null);
    setEditTarget(stop);
    setModalOpen(true);
  };

  return (
    <div>
      <div className="page-hero" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 26 }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h2>Bus Stops</h2>
          <p>{filteredRoutes.length} route{filteredRoutes.length !== 1 ? 's' : ''} across the network</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontSize: 18 }} />
            <input
              style={{
                paddingLeft: 34, width: 220, padding: '9px 12px 9px 34px',
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

      <div>
        {loading ? (
          <div className="stat-card" style={{ padding: 48, textAlign: 'center', color: 'var(--text-secondary)' }}>Loading routes...</div>
        ) : filteredRoutes.length === 0 ? (
          <div className="stat-card" style={{ padding: 48, textAlign: 'center', color: 'var(--text-secondary)' }}>No routes found</div>
        ) : (
          filteredRoutes.map(route => (
            <RouteCard
              key={route.id}
              route={route}
              stops={stops}
              onAddStop={handleAddStopClick}
              onEditStop={handleEditStopClick}
              onDeleteStop={handleDelete}
            />
          ))
        )}
      </div>

      <StopModal 
        open={modalOpen} 
        onClose={() => { setModalOpen(false); setEditTarget(null); setPreselectedRouteId(null); setPreselectedStopOrder(null); }} 
        onSave={handleSave} 
        initial={editTarget} 
        preselectedRouteId={preselectedRouteId}
        preselectedStopOrder={preselectedStopOrder}
      />
    </div>
  );
}

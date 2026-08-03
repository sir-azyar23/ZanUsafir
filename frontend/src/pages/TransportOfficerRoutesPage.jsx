import { useCallback, useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import toast from 'react-hot-toast';
import {
  CheckCircle,
  Close,
  FilterAlt,
  MapOutlined,
  Reviews,
  Search,
  ThumbDown,
  VisibilityOutlined,
} from '@mui/icons-material';
import { activateGeneratedRoute, approveGeneratedRoute, getGeneratedRoutes, rejectGeneratedRoute } from '../services/api';

const DEFAULT_CENTER = [-6.165917, 39.202641];

const parseJson = (value, fallback) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const isValidCoordinate = (lat, lng) => Number.isFinite(Number(lat)) && Number.isFinite(Number(lng));

const markerIcon = L.divIcon({
  className: 'officer-route-marker',
  html: '<span style="width:18px;height:18px;display:block;border-radius:999px;background:#36A9E1;border:3px solid #fff;box-shadow:0 8px 18px rgba(31,41,55,0.18);"></span>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const statusClass = (status) => {
  if (status === 'APPROVED' || status === 'ACTIVE') return 'badge-success';
  if (status === 'REJECTED') return 'badge-danger';
  if (status === 'SUBMITTED') return 'badge-warning';
  return 'badge-info';
};

const formatDate = (value) => value
  ? new Intl.DateTimeFormat('en-TZ', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  : '-';

const formatMoney = (amount, currency = 'TZS') => new Intl.NumberFormat('sw-TZ', {
  style: 'currency',
  currency,
  maximumFractionDigits: 0,
}).format(Number(amount || 0));

function FitBounds({ positions }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 1) map.fitBounds(positions, { padding: [34, 34], maxZoom: 15 });
  }, [map, positions]);
  return null;
}

function RouteMapPreview({ stops }) {
  const mappableStops = stops
    .filter(stop => isValidCoordinate(stop.latitude, stop.longitude))
    .map(stop => ({ ...stop, latitude: Number(stop.latitude), longitude: Number(stop.longitude) }));
  const positions = mappableStops.map(stop => [stop.latitude, stop.longitude]);

  if (positions.length < 2) {
    return (
      <div className="officer-map-empty">
        <MapOutlined fontSize="small" />
        Route map preview needs at least two stops with coordinates.
      </div>
    );
  }

  return (
    <div className="officer-route-map">
      <MapContainer center={positions[0] || DEFAULT_CENTER} zoom={13} style={{ width: '100%', height: '100%' }} scrollWheelZoom>
        <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <FitBounds positions={positions} />
        <Polyline positions={positions} pathOptions={{ color: 'var(--primary-dark)', weight: 5, opacity: 0.86 }} />
        {mappableStops.map((stop, index) => (
          <Marker key={`${stop.stopId}-${index}`} position={[stop.latitude, stop.longitude]} icon={markerIcon}>
            <Popup>{index + 1}. {stop.stopName}</Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

function ReviewModal({ route, onClose, onApprove, onActivate, onReject, acting }) {
  const [comment, setComment] = useState('');
  const stops = parseJson(route?.selectedStops, []);
  const mapData = parseJson(route?.mapData, {});
  const fares = Array.isArray(mapData.fareDetails) ? mapData.fareDetails : [];

  if (!route) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box officer-review-modal" onClick={event => event.stopPropagation()}>
        <div className="officer-review-header">
          <div>
            <h2>{route.name}</h2>
            <p>{route.routeName} · Submitted {formatDate(route.createdAt)}</p>
          </div>
          <button className="btn btn-ghost" type="button" onClick={onClose}><Close fontSize="small" /></button>
        </div>

        <RouteMapPreview stops={stops} />

        <div className="officer-review-grid">
          <div className="officer-review-summary">
            <span>Route Status</span>
            <strong className={`badge ${statusClass(route.status)}`}>{route.status}</strong>
          </div>
          <div className="officer-review-summary">
            <span>Assigned Driver</span>
            <strong>{mapData.driverName || 'Not assigned'}</strong>
          </div>
          <div className="officer-review-summary">
            <span>Assigned Bus</span>
            <strong>{mapData.busLabel || 'Not assigned'}</strong>
          </div>
          <div className="officer-review-summary">
            <span>Total Stops</span>
            <strong>{stops.length}</strong>
          </div>
        </div>

        {route.reviewComment && (
          <div className="officer-review-comment">
            <strong>Previous feedback</strong>
            <p>{route.reviewComment}</p>
          </div>
        )}

        <div className="officer-review-columns">
          <section>
            <h3>Ordered Bus Stops</h3>
            <ol>
              {stops.map((stop, index) => <li key={`${stop.stopId}-${index}`}>{stop.stopName}</li>)}
            </ol>
          </section>
          <section>
            <h3>Fare Details</h3>
            <div className="officer-fare-list">
              {fares.length === 0 ? (
                <p>No fare details submitted.</p>
              ) : fares.map(fare => (
                <div key={`${fare.fromStopId}-${fare.toStopId}`}>
                  <span>{fare.fromStopName} to {fare.toStopName}</span>
                  <strong>{formatMoney(fare.amount, fare.currency)}</strong>
                </div>
              ))}
            </div>
          </section>
        </div>

        <label className="officer-comment-box">
          <span className="form-label">Review Comment / Feedback</span>
          <textarea
            className="form-input"
            rows={4}
            value={comment}
            onChange={event => setComment(event.target.value)}
            placeholder="Add approval note or rejection reason..."
          />
        </label>

        <div className="officer-review-actions">
          <button className="btn btn-primary" type="button" onClick={() => onApprove(route.id, comment)} disabled={acting || route.status !== 'SUBMITTED'}>
            <CheckCircle fontSize="small" /> Approve
          </button>
          <button className="btn btn-secondary" type="button" onClick={() => onActivate(route.id, comment)} disabled={acting || !['SUBMITTED', 'APPROVED'].includes(route.status)}>
            <CheckCircle fontSize="small" /> Mark Active
          </button>
          <button className="btn btn-danger" type="button" onClick={() => onReject(route.id, comment)} disabled={acting || route.status !== 'SUBMITTED'}>
            <ThumbDown fontSize="small" /> Reject
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TransportOfficerRoutesPage({ status = '', title = 'Route Reviews' }) {
  const [routes, setRoutes] = useState([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState(status);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const loadRoutes = useCallback(() => {
    setLoading(true);
    getGeneratedRoutes(null, filterStatus)
      .then(response => setRoutes(Array.isArray(response.data) ? response.data : []))
      .catch(() => toast.error('Failed to load routes for review'))
      .finally(() => setLoading(false));
  }, [filterStatus]);

  useEffect(() => {
    queueMicrotask(loadRoutes);
  }, [loadRoutes]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return routes;
    return routes.filter(route => (
      route.name?.toLowerCase().includes(q) ||
      route.routeName?.toLowerCase().includes(q) ||
      route.status?.toLowerCase().includes(q)
    ));
  }, [routes, search]);

  const updateRoute = (nextRoute) => {
    setRoutes(current => current.map(route => route.id === nextRoute.id ? nextRoute : route));
    setSelected(nextRoute);
  };

  const runAction = async (action, successMessage) => {
    setActing(true);
    try {
      const response = await action();
      updateRoute(response.data);
      toast.success(successMessage);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Route review action failed');
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="officer-routes-page">
      <div className="officer-routes-header">
        <div>
          <h2>{title}</h2>
          <p>Review Staff-submitted route setups, inspect map and fare details, then approve or reject.</p>
        </div>
        <div className="officer-routes-tools">
          <div className="officer-search">
            <Search fontSize="small" />
            <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search routes..." />
          </div>
          <label className="officer-status-filter">
            <FilterAlt fontSize="small" />
            <select value={filterStatus} onChange={event => setFilterStatus(event.target.value)}>
              <option value="">All Statuses</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="APPROVED">Approved</option>
              <option value="ACTIVE">Active</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </label>
        </div>
      </div>

      <section className="stat-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="reports-empty">Loading routes...</div>
        ) : filtered.length === 0 ? (
          <div className="reports-empty">No routes found for this review queue.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Route</th>
                <th>Status</th>
                <th>Submitted</th>
                <th>Reviewer</th>
                <th>Feedback</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(route => (
                <tr key={route.id}>
                  <td>
                    <strong>{route.name}</strong>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '.78rem', marginTop: 3 }}>{route.routeName}</div>
                  </td>
                  <td><span className={`badge ${statusClass(route.status)}`}>{route.status}</span></td>
                  <td>{formatDate(route.createdAt)}</td>
                  <td>{route.reviewedBy || '-'}</td>
                  <td>{route.reviewComment || '-'}</td>
                  <td>
                    <button className="btn btn-primary" type="button" onClick={() => setSelected(route)}>
                      <VisibilityOutlined fontSize="small" /> Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <ReviewModal
        route={selected}
        acting={acting}
        onClose={() => setSelected(null)}
        onApprove={(id, comment) => runAction(() => approveGeneratedRoute(id, comment), 'Route approved')}
        onActivate={(id, comment) => runAction(() => activateGeneratedRoute(id, comment), 'Route marked active')}
        onReject={(id, comment) => runAction(() => rejectGeneratedRoute(id, comment), 'Route rejected')}
      />
    </div>
  );
}

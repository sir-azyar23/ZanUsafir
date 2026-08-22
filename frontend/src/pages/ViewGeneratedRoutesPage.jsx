import { useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import toast from 'react-hot-toast';
import { Route as RouteIcon, Search } from '@mui/icons-material';
import { getGeneratedRoutes } from '../services/api';

const DEFAULT_CENTER = [-6.165917, 39.202641];

const isValidCoordinate = (lat, lng) => Number.isFinite(Number(lat)) && Number.isFinite(Number(lng));
const parseJson = (value, fallback) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const icon = (color) => L.divIcon({
  className: 'saved-generated-route-marker',
  html: `<span style="width:18px;height:18px;display:block;border-radius:999px;background:${color};border:3px solid #fff;box-shadow:0 8px 18px rgba(31,41,55,.18);"></span>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const START_ICON = icon('#12a150');
const STOP_ICON = icon('#36A9E1');
const END_ICON = icon('var(--danger)');

const formatFare = (fare) => fare
  ? new Intl.NumberFormat('sw-TZ', { style: 'currency', currency: fare.currency || 'TZS', maximumFractionDigits: 0 }).format(Number(fare.amount || 0))
  : 'Missing fare';

const formatDate = (value) => value
  ? new Intl.DateTimeFormat('en-TZ', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  : '—';

function FitBounds({ positions }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 1) map.fitBounds(positions, { padding: [36, 36], maxZoom: 15 });
  }, [map, positions]);
  return null;
}

function SavedRouteMap({ stops, mapData }) {
  const mappableStops = stops
    .filter(stop => isValidCoordinate(stop.latitude, stop.longitude))
    .map(stop => ({ ...stop, latitude: Number(stop.latitude), longitude: Number(stop.longitude) }));
  const stopPositions = mappableStops.map(stop => [stop.latitude, stop.longitude]);
  const routeLine = Array.isArray(mapData?.routeLine) ? mapData.routeLine : [];
  const linePositions = routeLine.length > 1 ? routeLine : stopPositions;

  if (mappableStops.length < 2) {
    return (
      <div style={{ height: 360, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-light)', color: 'var(--text-secondary)' }}>
        Schematic map saved for this route.
      </div>
    );
  }

  return (
    <div style={{ height: 360 }}>
      <MapContainer center={stopPositions[0] || DEFAULT_CENTER} zoom={13} style={{ width: '100%', height: '100%' }} scrollWheelZoom>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <FitBounds positions={linePositions} />
        {linePositions.length > 1 && <Polyline positions={linePositions} pathOptions={{ color: 'var(--primary-dark)', weight: 5, opacity: 0.88 }} />}
        {mappableStops.map((stop, index) => (
          <Marker key={stop.stopId} position={[stop.latitude, stop.longitude]} icon={index === 0 ? START_ICON : index === mappableStops.length - 1 ? END_ICON : STOP_ICON}>
            <Popup><strong>{stop.stopName}</strong></Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

export default function ViewGeneratedRoutesPage() {
  const [routes, setRoutes] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getGeneratedRoutes()
      .then(response => setRoutes(Array.isArray(response.data) ? response.data : []))
      .catch(() => toast.error('Failed to load saved routes'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return routes;
    return routes.filter(route =>
      route.name?.toLowerCase().includes(q) ||
      route.routeName?.toLowerCase().includes(q)
    );
  }, [routes, search]);

  const title = 'View Routes';
  const description = 'Saved generated route maps and fare details.';

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{title}</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: 4 }}>{description}</p>
        </div>
        <div style={{ position: 'relative' }}>
          <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontSize: 18 }} />
          <input className="form-input" style={{ paddingLeft: 34, width: 230 }} placeholder="Search saved routes..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div className="stat-card" style={{ padding: 48, textAlign: 'center', color: 'var(--text-secondary)' }}>Loading saved routes...</div>
      ) : filtered.length === 0 ? (
        <div className="stat-card" style={{ padding: 48, textAlign: 'center', color: 'var(--text-secondary)' }}>
          {routes.length === 0 ? 'No data available. Please contact Admin to prepare route data first.' : 'No saved routes match your search.'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 18 }}>
          {filtered.map(route => {
            const stops = parseJson(route.selectedStops, []);
            return (
              <div className="stat-card" key={route.id} style={{ padding: 20, display: 'grid', gap: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(var(--accent-rgb),0.45)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <RouteIcon fontSize="small" />
                  </div>
                  <span className={`badge ${route.status === 'REJECTED' ? 'badge-danger' : route.status === 'SUBMITTED' ? 'badge-warning' : 'badge-success'}`}>{route.status}</span>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>{route.name}</h3>
                  <p style={{ margin: '5px 0 0', color: 'var(--text-secondary)', fontSize: '.82rem' }}>{route.routeName}</p>
                </div>
                <div style={{ display: 'grid', gap: 8, color: 'var(--text-secondary)', fontSize: '.82rem', fontWeight: 700 }}>
                  <div>{stops.length} selected stops</div>
                  <div>Saved {formatDate(route.createdAt)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}

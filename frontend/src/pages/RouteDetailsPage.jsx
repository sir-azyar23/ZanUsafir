import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getBuses, getFares, getRoute } from '../services/api';
import {
  ArrowLeft,
  Route as RouteIcon,
  MapPinned,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Compass,
  Bus,
  Users,
  CalendarDays,
  Navigation,
  StretchHorizontal,
  Layers3,
  Plus,
  Minus,
  Maximize2,
  Circle,
  CircleDot,
  Map,
  Sparkles,
  AlertCircle,
} from 'lucide-react';

const DEFAULT_MAP_CENTER = [-6.165917, 39.202641];

const isValidCoordinate = (lat, lng) => (
  Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))
);

const stopMarkerIcon = (background, border = '#ffffff', size = 18) => L.divIcon({
  className: 'route-detail-stop-marker',
  html: `<span style="
    width:${size}px;
    height:${size}px;
    display:block;
    border-radius:999px;
    background:${background};
    border:3px solid ${border};
    box-shadow:0 8px 18px rgba(31,41,55,0.18);
  "></span>`,
  iconSize: [size, size],
  iconAnchor: [size / 2, size / 2],
});

const START_ICON = stopMarkerIcon('#1E7D3A', '#36A9E1', 22);
const END_ICON = stopMarkerIcon('var(--danger)', '#ffffff', 22);
const BUS_STOP_ICON = L.divIcon({
  className: 'route-detail-bus-stop-marker',
  html: `<span style="
    width:18px;
    height:18px;
    display:flex;
    align-items:center;
    justify-content:center;
    border-radius:5px 5px 5px 1px;
    background:rgba(54,169,225,0.18);
    border:2px solid #1E7D3A;
    color:#1F2937;
    font-size:10px;
    font-weight:900;
    box-shadow:0 5px 12px rgba(31,41,55,0.18);
  ">B</span>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  popupAnchor: [0, -12],
});

const closestPointOnRoute = (point, routePositions) => {
  if (!point || routePositions.length === 0) return point;

  return routePositions.reduce((closest, candidate) => {
    const distance =
      ((candidate[0] - point[0]) ** 2) +
      ((candidate[1] - point[1]) ** 2);
    return distance < closest.distance ? { point: candidate, distance } : closest;
  }, { point, distance: Number.POSITIVE_INFINITY }).point;
};

const getRoadRouteFromOsrm = async (waypoints) => {
  const uniqueWaypoints = waypoints.filter((point, index, items) => (
    index === 0 ||
    point[0] !== items[index - 1][0] ||
    point[1] !== items[index - 1][1]
  ));

  if (uniqueWaypoints.length < 2) return [];

  const coordinateString = uniqueWaypoints
    .map(([lat, lng]) => `${lng},${lat}`)
    .join(';');
  const url = `https://router.project-osrm.org/route/v1/driving/${coordinateString}?overview=full&geometries=geojson&continue_straight=false`;
  const response = await fetch(url);

  if (!response.ok) throw new Error('Road routing request failed');

  const data = await response.json();
  return (data.routes?.[0]?.geometry?.coordinates || [])
    .map(([lng, lat]) => [Number(lat), Number(lng)])
    .filter(([lat, lng]) => isValidCoordinate(lat, lng));
};

function FitRouteBounds({ positions }) {
  const map = useMap();

  useEffect(() => {
    if (!positions.length) return;
    if (positions.length === 1) {
      map.setView(positions[0], 14);
      return;
    }
    map.fitBounds(positions, { padding: [36, 36], maxZoom: 15 });
  }, [map, positions]);

  return null;
}

/* ─── Status badge colours ──────────────────────────────────── */
const STATUS_BADGE = {
  ACTIVE: 'inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700',
  INACTIVE: 'inline-flex items-center rounded-full bg-rose-100 px-3 py-1 text-sm font-medium text-rose-700',
  SUSPENDED: 'inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-700',
};

const formatDate = (value) => (
  value
    ? new Date(value).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
    : null
);

const parseRoutePath = (routeGeojson) => {
  if (!routeGeojson) return [];

  try {
    const geojson = typeof routeGeojson === 'string' ? JSON.parse(routeGeojson) : routeGeojson;
    const features = geojson?.type === 'FeatureCollection' ? geojson.features : [geojson];

    return features
      .flatMap(feature => {
        const geometry = feature?.type === 'Feature' ? feature.geometry : feature;
        if (geometry?.type === 'LineString') return geometry.coordinates || [];
        if (geometry?.type === 'MultiLineString') return (geometry.coordinates || []).flat();
        return [];
      })
      .map(([lng, lat]) => [Number(lat), Number(lng)])
      .filter(([lat, lng]) => isValidCoordinate(lat, lng));
  } catch {
    return [];
  }
};

const getBusNumber = (bus) => bus?.busNumber || bus?.busNo || bus?.number || (bus?.id ? `#${bus.id}` : '—');

function SummaryCard({ icon, label, value, accent, tone }) {
  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
      <div className="flex items-start gap-3">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tone}`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</div>
          <div className="mt-1 text-sm font-semibold text-slate-800">{value || '—'}</div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main page ─────────────────────────────────────────────── */
export default function RouteDetailsPage() {
  const { routeId } = useParams();
  const navigate = useNavigate();
  const [route, setRoute] = useState(null);
  const [buses, setBuses] = useState([]);
  const [fares, setFares] = useState([]);
  const [osrmRoutePositions, setOsrmRoutePositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!routeId) return;
    queueMicrotask(() => {
      setLoading(true);
      setError(null);
      Promise.all([getRoute(routeId), getBuses(routeId), getFares(routeId)])
        .then(([routeResponse, busesResponse, faresResponse]) => {
          setRoute(routeResponse.data);
          setBuses(Array.isArray(busesResponse.data) ? busesResponse.data : []);
          setFares(Array.isArray(faresResponse.data) ? faresResponse.data : []);
        })
        .catch(err => {
          const msg = err?.response?.data?.message || err?.message || 'Failed to load route details.';
          setError(msg);
          setBuses([]);
          setFares([]);
        })
        .finally(() => setLoading(false));
    });
  }, [routeId]);

  /* ── derive sorted stops ── */
  const stops = useMemo(() => (
    route?.stops
      ? [...route.stops].sort((a, b) => (a.stopOrder ?? 0) - (b.stopOrder ?? 0))
      : []
  ), [route]);
  const routeNumber = route?.routeNumber || route?.routeCode || route?.code || (route?.id ? `#${route.id}` : null);
  const mappableStops = useMemo(() => (
    stops
      .filter(stop => isValidCoordinate(stop.latitude, stop.longitude))
      .map(stop => ({
        ...stop,
        latitude: Number(stop.latitude),
        longitude: Number(stop.longitude),
      }))
  ), [stops]);
  const mapPositions = useMemo(() => (
    mappableStops.map(stop => [stop.latitude, stop.longitude])
  ), [mappableStops]);
  const routePathPositions = useMemo(() => parseRoutePath(route?.routeGeojson), [route]);
  const startPosition = useMemo(() => (
    isValidCoordinate(route?.startLat, route?.startLng)
      ? [Number(route.startLat), Number(route.startLng)]
      : null
  ), [route]);
  const endPosition = useMemo(() => (
    isValidCoordinate(route?.endLat, route?.endLng)
      ? [Number(route.endLat), Number(route.endLng)]
      : null
  ), [route]);
  const routeLinePositions = routePathPositions.length > 1
    ? routePathPositions
    : osrmRoutePositions;
  const displayStops = useMemo(() => (
    mappableStops.map(stop => {
      const snapped = routeLinePositions.length > 1
        ? closestPointOnRoute([stop.latitude, stop.longitude], routeLinePositions)
        : [stop.latitude, stop.longitude];

      return {
        ...stop,
        displayLatitude: snapped[0],
        displayLongitude: snapped[1],
      };
    })
  ), [mappableStops, routeLinePositions]);
  const routingWaypoints = useMemo(() => (
    [
      startPosition,
      ...mapPositions,
      endPosition,
    ].filter(Boolean)
  ), [startPosition, mapPositions, endPosition]);
  const fitPositions = routeLinePositions.length ? routeLinePositions : routingWaypoints;
  const missingCoordinateCount = stops.length - mappableStops.length;
  const mapCenter = startPosition || mapPositions[0] || DEFAULT_MAP_CENTER;
  const formatFare = (amount, currency) => (
    amount == null
      ? '—'
      : new Intl.NumberFormat('sw-TZ', {
        style: 'currency',
        currency: currency || 'TZS',
        maximumFractionDigits: 0,
      }).format(Number(amount))
  );

  /* ── auto description ── */
  const buildDescription = () => {
    if (stops.length === 0) return route?.description || 'No stops have been added to this route yet.';
    const first = stops[0]?.stopName || route?.startPoint;
    const last  = stops[stops.length - 1]?.stopName || route?.endPoint;
    const mid   = stops.slice(1, -1).map(s => s.stopName).filter(Boolean);
    if (mid.length === 0)
      return `This route runs from ${first} to ${last}.`;
    if (mid.length <= 3)
      return `This route starts from ${first}, passes through ${mid.join(', ')}, and ends at ${last}.`;
    return `This route starts from ${first}, passes through ${mid.length} intermediate stops including ${mid.slice(0, 2).join(', ')}, and ends at ${last}.`;
  };

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) return;
      if (!route || routePathPositions.length > 1 || routingWaypoints.length < 2) {
        setOsrmRoutePositions([]);
        return;
      }

      getRoadRouteFromOsrm(routingWaypoints)
        .then(positions => {
          if (!cancelled) setOsrmRoutePositions(positions);
        })
        .catch(() => {
          if (!cancelled) setOsrmRoutePositions([]);
        });
    });

    return () => {
      cancelled = true;
    };
  }, [route, routePathPositions.length, routingWaypoints]);

  /* ── loading state ── */
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="h-7 w-48 rounded bg-slate-200" />
          <div className="mt-4 h-4 w-80 rounded bg-slate-200" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="h-24 animate-pulse rounded-2xl border border-slate-200 bg-white shadow-sm" />
          ))}
        </div>
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="h-[360px] animate-pulse rounded-3xl border border-slate-200 bg-white shadow-sm" />
          <div className="h-[360px] animate-pulse rounded-3xl border border-slate-200 bg-white shadow-sm" />
        </div>
      </div>
    );
  }

  /* ── error state ── */
  if (error) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center shadow-sm">
        <AlertCircle className="mx-auto mb-3 h-10 w-10 text-rose-500" />
        <p className="text-lg font-semibold text-rose-700">Failed to load route</p>
        <p className="mt-2 text-sm text-rose-600">{error}</p>
        <button className="mt-5 inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700" onClick={() => navigate('/routes/details')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Routes
        </button>
      </div>
    );
  }

  if (!route) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <MapPinned className="mx-auto mb-3 h-10 w-10 text-slate-500" />
        <p className="text-lg font-semibold text-slate-800">Route not found</p>
        <p className="mt-2 text-sm text-slate-600">The selected route could not be found or may no longer be available.</p>
        <button className="mt-5 inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700" onClick={() => navigate('/routes/details')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Routes
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="sticky top-4 z-10 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-sky-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-700">
                Route Details
              </span>
              <span className={STATUS_BADGE[route.status] || 'inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700'}>
                {route.status}
              </span>
            </div>
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-slate-900">{route.name}</h2>
              <p className="mt-2 text-sm text-slate-600">{routeNumber ? `Code • ${routeNumber}` : 'Route details and assigned stops'}</p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-slate-600">
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5"><StretchHorizontal className="h-4 w-4 text-sky-600" />{route.distance || '—'} km</span>
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5"><Clock3 className="h-4 w-4 text-emerald-600" />{route.duration || '—'}</span>
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5"><MapPinned className="h-4 w-4 text-violet-600" />{stops.length} stops</span>
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5"><CalendarDays className="h-4 w-4 text-amber-600" />{formatDate(route.createdAt) || '—'}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:-translate-y-0.5 hover:shadow-sm">
              <Sparkles className="mr-2 h-4 w-4 text-sky-600" /> Edit Route
            </button>
            <button className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:-translate-y-0.5 hover:shadow-sm">
              <Map className="mr-2 h-4 w-4 text-violet-600" /> View on Map
            </button>
            <button className="inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700" onClick={() => navigate('/routes/details')}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Routes
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard icon={<MapPinned className="h-5 w-5 text-sky-600" />} label="Total Bus Stops" value={`${stops.length}`} tone="bg-sky-50 text-sky-700" />
        <SummaryCard icon={<StretchHorizontal className="h-5 w-5 text-violet-600" />} label="Route Distance" value={route.distance || '—'} tone="bg-violet-50 text-violet-700" />
        <SummaryCard icon={<Clock3 className="h-5 w-5 text-emerald-600" />} label="Estimated Travel Time" value={route.duration || '—'} tone="bg-emerald-50 text-emerald-700" />
        <SummaryCard icon={<Bus className="h-5 w-5 text-amber-600" />} label="Assigned Buses" value={`${buses.length}`} tone="bg-amber-50 text-amber-700" />
        <SummaryCard icon={<Users className="h-5 w-5 text-rose-600" />} label="Assigned Drivers" value={`${buses.filter(bus => bus.driverName).length}`} tone="bg-rose-50 text-rose-700" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Route Overview</h3>
              <p className="mt-1 text-sm text-slate-500">Key route information and service profile</p>
            </div>
            <div className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">{route.status}</div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Route Name</div>
              <div className="mt-2 text-base font-semibold text-slate-900">{route.name || '—'}</div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Route Code</div>
              <div className="mt-2 text-base font-semibold text-slate-900">{routeNumber || '—'}</div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Start Stop</div>
              <div className="mt-2 text-base font-semibold text-slate-900">{stops[0]?.stopName || route.startPoint || '—'}</div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">End Stop</div>
              <div className="mt-2 text-base font-semibold text-slate-900">{stops[stops.length - 1]?.stopName || route.endPoint || '—'}</div>
            </div>
          </div>
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Description</div>
            <p className="mt-2 text-sm leading-6 text-slate-600">{route.description || buildDescription()}</p>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Bus Stops Timeline</h3>
              <p className="mt-1 text-sm text-slate-500">Ordered sequence of service stops</p>
            </div>
            <div className="rounded-full bg-sky-50 px-3 py-1 text-sm font-medium text-sky-700">{stops.length} stops</div>
          </div>
          {stops.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
              No bus stops assigned yet.
            </div>
          ) : (
            <div className="space-y-3">
              {stops.map((stop, idx) => {
                const isFirst = idx === 0;
                const isLast = idx === stops.length - 1;
                const tone = isFirst ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : isLast ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-sky-200 bg-sky-50 text-sky-700';
                const circle = isFirst ? 'bg-emerald-500' : isLast ? 'bg-rose-500' : 'bg-sky-500';
                return (
                  <div key={stop.id} className="group rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md">
                    <div className="flex gap-3">
                      <div className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${circle}`}>
                        <CircleDot className="h-4 w-4 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="font-semibold text-slate-900">{stop.stopName}</div>
                          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${tone}`}>
                            {isFirst ? 'START' : isLast ? 'END' : 'MID'}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2 text-sm text-slate-600">
                          <span className="rounded-full bg-slate-100 px-2.5 py-1">#{stop.stopOrder}</span>
                          {stop.stopCode && <span className="rounded-full bg-slate-100 px-2.5 py-1">{stop.stopCode}</span>}
                        </div>
                        <div className="mt-2 text-sm text-slate-600">{stop.address || 'No address provided'}</div>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                          {isValidCoordinate(stop.latitude, stop.longitude) ? <span className="rounded-full bg-slate-100 px-2.5 py-1">{Number(stop.latitude).toFixed(4)}, {Number(stop.longitude).toFixed(4)}</span> : <span className="rounded-full bg-slate-100 px-2.5 py-1">Coordinates unavailable</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Bus Stops Table</h3>
            <p className="mt-1 text-sm text-slate-500">Detailed list of route stops with quick actions</p>
          </div>
          <div className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">{stops.length} records</div>
        </div>
        {stops.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">No bus stops assigned to this route.</div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">#</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Stop Name</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Stop Code</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Address</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Coordinates</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {stops.map((stop, index) => (
                  <tr key={stop.id} className="transition hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-700">{index + 1}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{stop.stopName || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{stop.stopCode || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{stop.address || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{isValidCoordinate(stop.latitude, stop.longitude) ? `${Number(stop.latitude).toFixed(4)}, ${Number(stop.longitude).toFixed(4)}` : '—'}</td>
                    <td className="px-4 py-3"><span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">Active</span></td>
                    <td className="px-4 py-3"><button className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-sky-300 hover:text-sky-700">View Stop</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Route Map</h3>
            <p className="mt-1 text-sm text-slate-500">Visual overview of the complete route and all assigned stops</p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-600">
            <Layers3 className="h-4 w-4 text-sky-600" /> Map View
          </div>
        </div>
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <div className="flex items-center justify-end gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
            <button className="rounded-full border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-100"><Plus className="h-4 w-4" /></button>
            <button className="rounded-full border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-100"><Minus className="h-4 w-4" /></button>
            <button className="rounded-full border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-100"><Maximize2 className="h-4 w-4" /></button>
          </div>
          <div className="h-[420px] w-full">
            <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
              <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <FitRouteBounds positions={fitPositions} />
              {routeLinePositions.length > 1 && <Polyline positions={routeLinePositions} pathOptions={{ color: '#2563eb', weight: 5, opacity: 0.9 }} />}
              {startPosition && <Marker position={startPosition} icon={START_ICON}><Popup>Start</Popup></Marker>}
              {endPosition && <Marker position={endPosition} icon={END_ICON}><Popup>End</Popup></Marker>}
              {displayStops.map((stop, idx) => (
                <Marker key={stop.id || `${stop.stopName}-${idx}`} position={[stop.displayLatitude, stop.displayLongitude]} icon={BUS_STOP_ICON}><Popup>{stop.stopName}</Popup></Marker>
              ))}
            </MapContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

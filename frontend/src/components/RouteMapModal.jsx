import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, GeoJSON as GeoJSONLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const makeIcon = color =>
  L.divIcon({
    html: `<div style="width:16px;height:16px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 8px rgba(31,41,55,0.16);"></div>`,
    className: '',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -10],
  });

const startIcon = makeIcon('#12a150');
const endIcon = makeIcon('var(--danger)');
const busStopIcon = L.divIcon({
  html: `<span style="
    width:18px;
    height:18px;
    display:flex;
    align-items:center;
    justify-content:center;
    border-radius:5px 5px 5px 1px;
    background:#36A9E1;
    border:2px solid #0B4F8A;
    color:#ffffff;
    font-size:10px;
    font-weight:900;
    box-shadow:0 5px 12px rgba(31,41,55,0.18);
  ">B</span>`,
  className: 'route-map-bus-stop-marker',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  popupAnchor: [0, -12],
});

const isValidCoordinate = (lat, lng) => (
  Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))
);

const getMappedStops = (route) => (
  [...(route?.stops || [])]
    .sort((a, b) => (a.stopOrder ?? 0) - (b.stopOrder ?? 0))
    .filter(stop => isValidCoordinate(stop.latitude, stop.longitude))
    .map(stop => ({
      ...stop,
      latitude: Number(stop.latitude),
      longitude: Number(stop.longitude),
    }))
);

const geojsonToPositions = (geojson) => {
  const features = geojson?.type === 'FeatureCollection' ? geojson.features : [geojson];
  return (features || [])
    .flatMap(feature => {
      const geometry = feature?.type === 'Feature' ? feature.geometry : feature;
      if (geometry?.type === 'LineString') return geometry.coordinates || [];
      if (geometry?.type === 'MultiLineString') return (geometry.coordinates || []).flat();
      return [];
    })
    .map(([lng, lat]) => [Number(lat), Number(lng)])
    .filter(([lat, lng]) => isValidCoordinate(lat, lng));
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

const closestPointOnRoute = (point, routePositions) => {
  if (!point || routePositions.length === 0) return point;

  return routePositions.reduce((closest, candidate) => {
    const distance =
      ((candidate[0] - point[0]) ** 2) +
      ((candidate[1] - point[1]) ** 2);
    return distance < closest.distance ? { point: candidate, distance } : closest;
  }, { point, distance: Number.POSITIVE_INFINITY }).point;
};

function FitBounds({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) map.fitBounds(bounds, { padding: [35, 35] });
  }, [bounds, map]);
  return null;
}

const STATUS_STYLE = {
  ACTIVE: { background: 'var(--primary-tint-strong)', color: 'var(--dark)' },
  INACTIVE: { background: 'rgba(var(--danger-rgb),0.12)', color: 'var(--danger)' },
  SUSPENDED: { background: 'var(--primary-tint)', color: 'var(--dark)' },
};

export default function RouteMapModal({ open, onClose, route }) {
  const [geojson, setGeojson] = useState(null);
  const [geojsonPositions, setGeojsonPositions] = useState([]);
  const [roadPositions, setRoadPositions] = useState([]);
  const [bounds, setBounds] = useState(null);
  const mappedStops = useMemo(() => getMappedStops(route), [route]);
  const stopPositions = useMemo(() => mappedStops.map(stop => [stop.latitude, stop.longitude]), [mappedStops]);
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
  const routingWaypoints = useMemo(() => (
    [startPosition, ...stopPositions, endPosition].filter(Boolean)
  ), [startPosition, stopPositions, endPosition]);
  const routeLinePositions = geojsonPositions.length > 1 ? geojsonPositions : roadPositions;
  const displayStops = useMemo(() => (
    mappedStops.map(stop => {
      const snapped = routeLinePositions.length > 1
        ? closestPointOnRoute([stop.latitude, stop.longitude], routeLinePositions)
        : [stop.latitude, stop.longitude];

      return {
        ...stop,
        displayLatitude: snapped[0],
        displayLongitude: snapped[1],
      };
    })
  ), [mappedStops, routeLinePositions]);

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) return;
      if (!open || !route) {
        setGeojson(null);
        setGeojsonPositions([]);
        setRoadPositions([]);
        setBounds(null);
        return;
      }

      setGeojson(null);
      setGeojsonPositions([]);
      setRoadPositions([]);
      setBounds(null);

      if (route.routeGeojson) {
        try {
          const parsed = JSON.parse(route.routeGeojson);
          setGeojson(parsed);

          const positions = geojsonToPositions(parsed);
          if (positions.length) {
            setGeojsonPositions(positions);
            setBounds(L.latLngBounds(positions));
            return;
          }
        } catch {
          setGeojson(null);
        }
      }

      if (routingWaypoints.length > 1) {
        getRoadRouteFromOsrm(routingWaypoints)
          .then(positions => {
            if (cancelled) return;
            setRoadPositions(positions);
            setBounds(L.latLngBounds(positions.length ? positions : routingWaypoints));
          })
          .catch(() => {
            if (cancelled) return;
            setBounds(L.latLngBounds(routingWaypoints));
          });
        return;
      }

      if (stopPositions.length > 0) {
        setBounds(L.latLngBounds(stopPositions));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [open, route, routingWaypoints, stopPositions]);

  if (!open || !route) return null;

  const hasStartEnd = Boolean(startPosition && endPosition);

  const status = STATUS_STYLE[route.status] || { background: 'var(--dark)', color: '#fff' };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-box"
        style={{ maxWidth: 920, width: '94%', padding: 0, overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.08rem', color: 'var(--text-primary)', fontWeight: 800 }}>{route.name}</h3>
            <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              {route.startPoint || 'Start point'} to {route.endPoint || 'end point'}
            </p>
          </div>
          <button className="btn btn-ghost" onClick={onClose} style={{ padding: '7px 12px' }}>
            Close
          </button>
        </div>

        <div style={{ height: 480, background: 'var(--bg-light)' }}>
          {bounds ? (
            <MapContainer
              center={stopPositions[0] || (hasStartEnd ? [Number(route.startLat), Number(route.startLng)] : [-6.165917, 39.202641])}
              zoom={13}
              style={{ width: '100%', height: '100%' }}
              scrollWheelZoom
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <FitBounds bounds={bounds} />

              {geojson && (
                <GeoJSONLayer
                  data={geojson}
                  style={{ color: 'var(--primary-dark)', weight: 5, opacity: 0.88 }}
                />
              )}

              {!geojson && roadPositions.length > 1 && (
                <Polyline
                  positions={roadPositions}
                  pathOptions={{ color: 'var(--primary-dark)', weight: 5, opacity: 0.88 }}
                />
              )}

              {startPosition && (
                <Marker position={startPosition} icon={startIcon}>
                  <Popup><strong>Start Point</strong><br />{route.startPoint || 'Route start'}</Popup>
                </Marker>
              )}

              {endPosition && (
                <Marker position={endPosition} icon={endIcon}>
                  <Popup><strong>End Point</strong><br />{route.endPoint || 'Route end'}</Popup>
                </Marker>
              )}

              {displayStops.map((stop, idx) => {
                return (
                  <Marker
                    key={stop.id || `${stop.stopName}-${idx}`}
                    position={[stop.displayLatitude, stop.displayLongitude]}
                    icon={busStopIcon}
                  >
                    <Popup>
                      <strong>{stop.stopName || `Bus Stop #${stop.stopOrder || idx + 1}`}</strong>
                      <br />
                      Sequence #{stop.stopOrder || idx + 1}
                      {stop.address && (
                        <>
                          <br />
                          {stop.address}
                        </>
                      )}
                    </Popup>
                  </Marker>
                );
              })}

              {!geojson && roadPositions.length === 0 && hasStartEnd && (
                <div className="leaflet-bottom leaflet-left">
                  <div style={{ margin: 12, padding: '8px 10px', borderRadius: 8, background: '#ffffff', color: 'var(--text-primary)', fontSize: 12, fontWeight: 700, boxShadow: '0 8px 18px rgba(31,41,55,0.12)' }}>
                    Generating road route...
                  </div>
                </div>
              )}
            </MapContainer>
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center', color: 'var(--text-secondary)' }}>
              No route geometry or coordinates are available for this route.
            </div>
          )}
        </div>

        <div style={{ padding: '16px 24px', display: 'flex', gap: 10, flexWrap: 'wrap', borderTop: '1px solid var(--border)' }}>
          <div style={{ background: 'var(--primary-tint)', color: 'var(--dark)', padding: '6px 14px', borderRadius: 20, fontSize: '0.85rem' }}>
            Distance: {route.distance || 'N/A'}
          </div>
          <div style={{ background: 'var(--primary-tint)', color: 'var(--dark)', padding: '6px 14px', borderRadius: 20, fontSize: '0.85rem' }}>
            Duration: {route.duration || 'N/A'}
          </div>
          <div style={{ background: status.background, color: status.color, padding: '6px 14px', borderRadius: 20, fontSize: '0.85rem', fontWeight: 700 }}>
            {route.status || 'UNKNOWN'}
          </div>
        </div>
      </div>
    </div>
  );
}

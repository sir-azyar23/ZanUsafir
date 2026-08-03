import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  ArrowDownward,
  ArrowUpward,
  CheckCircle,
  DirectionsBus,
  LocalAtm,
  Person,
  Place,
  Route,
  Save,
  WarningAmber,
} from '@mui/icons-material';
import { createGeneratedRoute, getBuses, getDrivers, getFares, getRoute, getRoutes } from '../services/api';

const normalizeList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const formatMoney = (amount, currency = 'TZS') => {
  if (amount === '' || amount == null) return '-';
  return new Intl.NumberFormat('sw-TZ', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));
};

const getBusLabel = (bus) => (
  [bus.busNumber, bus.plateNumber, bus.model].filter(Boolean).join(' - ') || `Bus #${bus.id}`
);

function StepHeader({ number, icon, title, text }) {
  return (
    <div className="create-route-step-header">
      <span className="create-route-step-number">{number}</span>
      <span className="create-route-step-icon">{icon}</span>
      <span>
        <strong>{title}</strong>
        <small>{text}</small>
      </span>
    </div>
  );
}

function MissingData({ message = 'Required data is missing. Please contact Admin to prepare route data first.' }) {
  return (
    <div className="create-route-alert">
      <WarningAmber fontSize="small" />
      <strong>{message}</strong>
    </div>
  );
}

export default function CreateRoutePage() {
  const [routes, setRoutes] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [buses, setBuses] = useState([]);
  const [routeFares, setRouteFares] = useState([]);
  const [routeId, setRouteId] = useState('');
  const [route, setRoute] = useState(null);
  const [orderedStops, setOrderedStops] = useState([]);
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [selectedBusId, setSelectedBusId] = useState('');
  const [segmentFares, setSegmentFares] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([getRoutes(), getDrivers(), getBuses()])
      .then(results => {
        if (cancelled) return;
        setRoutes(results[0].status === 'fulfilled' ? normalizeList(results[0].value.data) : []);
        setDrivers(results[1].status === 'fulfilled' ? normalizeList(results[1].value.data) : []);
        setBuses(results[2].status === 'fulfilled' ? normalizeList(results[2].value.data) : []);
      })
      .catch(() => toast.error('Failed to load route setup data'))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!routeId) {
      queueMicrotask(() => {
        setRoute(null);
        setOrderedStops([]);
        setRouteFares([]);
        setSegmentFares({});
      });
      return;
    }

    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setLoadingRoute(true);
    });

    Promise.allSettled([getRoute(routeId), getFares(routeId)])
      .then(results => {
        if (cancelled) return;
        if (results[0].status !== 'fulfilled') {
          toast.error('Failed to load selected route');
          return;
        }

        const selectedRoute = results[0].value.data;
        const stops = [...(selectedRoute.stops || [])].sort((a, b) => (a.stopOrder ?? 0) - (b.stopOrder ?? 0));
        const fares = results[1].status === 'fulfilled' ? normalizeList(results[1].value.data) : [];
        const fareSeed = {};

        stops.slice(0, -1).forEach((stop, index) => {
          const nextStop = stops[index + 1];
          const existingFare = fares.find(fare => (
            (fare.fromStopId === stop.stopId && fare.toStopId === nextStop.stopId) ||
            (fare.fromStopId === nextStop.stopId && fare.toStopId === stop.stopId)
          ));
          fareSeed[`${stop.stopId}-${nextStop.stopId}`] = existingFare?.amount ?? '';
        });

        setRoute(selectedRoute);
        setOrderedStops(stops);
        setRouteFares(fares);
        setSegmentFares(fareSeed);
      })
      .finally(() => {
        if (!cancelled) setLoadingRoute(false);
      });

    return () => { cancelled = true; };
  }, [routeId]);

  const selectedDriver = useMemo(
    () => drivers.find(driver => String(driver.id) === String(selectedDriverId)),
    [drivers, selectedDriverId]
  );

  const selectedBus = useMemo(
    () => buses.find(bus => String(bus.id) === String(selectedBusId)),
    [buses, selectedBusId]
  );

  const segments = useMemo(() => (
    orderedStops.slice(0, -1).map((stop, index) => {
      const nextStop = orderedStops[index + 1];
      const key = `${stop.stopId}-${nextStop.stopId}`;
      const suggestedFare = routeFares.find(fare => (
        (fare.fromStopId === stop.stopId && fare.toStopId === nextStop.stopId) ||
        (fare.fromStopId === nextStop.stopId && fare.toStopId === stop.stopId)
      ));
      return { key, from: stop, to: nextStop, amount: segmentFares[key] ?? '', suggestedFare };
    })
  ), [orderedStops, routeFares, segmentFares]);

  const missingRequiredData = !loading && (routes.length === 0 || drivers.length === 0 || buses.length === 0);
  const canSave = route && orderedStops.length >= 2 && selectedDriver && selectedBus
    && segments.length > 0
    && segments.every(segment => segment.amount !== '' && Number(segment.amount) >= 0);

  const moveStop = (index, direction) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= orderedStops.length) return;
    const nextStops = [...orderedStops];
    [nextStops[index], nextStops[nextIndex]] = [nextStops[nextIndex], nextStops[index]];

    const nextFares = {};
    nextStops.slice(0, -1).forEach((stop, stopIndex) => {
      const nextStop = nextStops[stopIndex + 1];
      const previousForward = segmentFares[`${stop.stopId}-${nextStop.stopId}`];
      const previousReverse = segmentFares[`${nextStop.stopId}-${stop.stopId}`];
      nextFares[`${stop.stopId}-${nextStop.stopId}`] = previousForward ?? previousReverse ?? '';
    });

    setOrderedStops(nextStops);
    setSegmentFares(nextFares);
  };

  const updateSegmentFare = (key, value) => {
    setSegmentFares(current => ({ ...current, [key]: value }));
  };

  const handleSave = async () => {
    if (!canSave) {
      toast.error('Complete route, stop order, driver, bus, and fare details before saving.');
      return;
    }

    setSaving(true);
    try {
      const fareDetails = segments.map((segment, index) => ({
        order: index + 1,
        fromStopId: segment.from.stopId,
        fromStopName: segment.from.stopName,
        toStopId: segment.to.stopId,
        toStopName: segment.to.stopName,
        amount: Number(segment.amount),
        currency: segment.suggestedFare?.currency || 'TZS',
      }));

      await createGeneratedRoute({
        routeId: route.id,
        name: `${route.name} complete route setup`,
        status: 'SUBMITTED',
        selectedStops: JSON.stringify(orderedStops.map((stop, index) => ({
          ...stop,
          generatedOrder: index + 1,
        }))),
        mapData: JSON.stringify({
          type: 'COMPLETE_ROUTE_SETUP',
          driverId: selectedDriver.id,
          driverName: selectedDriver.fullName,
          busId: selectedBus.id,
          busLabel: getBusLabel(selectedBus),
          fareDetails,
        }),
      });

      toast.success('Complete route setup saved successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save complete route setup');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="create-route-page">
      <div className="create-route-hero">
        <div>
          <h2>Create Route</h2>
          <p>Register a complete route setup using only Admin-prepared routes, bus stops, drivers, buses, and fare records.</p>
        </div>
        <button className="btn btn-primary" type="button" onClick={handleSave} disabled={!canSave || saving}>
          <Save fontSize="small" />
          {saving ? 'Saving...' : 'Save Complete Route'}
        </button>
      </div>

      {loading ? (
        <div className="stat-card create-route-loading">Loading route setup data...</div>
      ) : missingRequiredData ? (
        <MissingData />
      ) : (
        <div className="create-route-layout">
          <section className="stat-card create-route-panel">
            <StepHeader
              number="1"
              icon={<Route fontSize="small" />}
              title="Select Route"
              text="Routes are loaded from Admin-created records."
            />
            <select className="form-input" value={routeId} onChange={event => setRouteId(event.target.value)}>
              <option value="">Choose route</option>
              {routes.map(item => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>

            {loadingRoute && <div className="create-route-muted">Loading selected route...</div>}

            {route && (
              <div className="create-route-route-card">
                <strong>{route.name}</strong>
                <span>{route.routeNumber || `Route #${route.id}`} · {route.status || 'ACTIVE'} · {route.distance || 'Distance not set'}</span>
                <span>{route.startPoint || orderedStops[0]?.stopName || 'Start point'} to {route.endPoint || orderedStops.at(-1)?.stopName || 'End point'}</span>
              </div>
            )}
          </section>

          {route && orderedStops.length === 0 && (
            <MissingData />
          )}

          {route && orderedStops.length > 0 && (
            <>
              <section className="stat-card create-route-panel">
                <StepHeader
                  number="2"
                  icon={<Place fontSize="small" />}
                  title="Arrange Bus Stops"
                  text="Order the existing stops according to how the bus moves on the road."
                />
                <div className="create-route-stop-list">
                  {orderedStops.map((stop, index) => (
                    <div className="create-route-stop-row" key={stop.stopId}>
                      <span className="create-route-stop-order">
                        <Place fontSize="small" />
                      </span>
                      <div>
                        <strong>{stop.stopName}</strong>
                      </div>
                      <div className="create-route-stop-actions">
                        <button className="btn btn-ghost" type="button" onClick={() => moveStop(index, -1)} disabled={index === 0} title="Move up">
                          <ArrowUpward fontSize="small" />
                        </button>
                        <button className="btn btn-ghost" type="button" onClick={() => moveStop(index, 1)} disabled={index === orderedStops.length - 1} title="Move down">
                          <ArrowDownward fontSize="small" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="stat-card create-route-panel">
                <StepHeader
                  number="3"
                  icon={<Person fontSize="small" />}
                  title="Assign Driver"
                  text="Select an existing driver registered by Admin."
                />
                <select className="form-input" value={selectedDriverId} onChange={event => setSelectedDriverId(event.target.value)}>
                  <option value="">Choose driver</option>
                  {drivers.map(driver => (
                    <option key={driver.id} value={driver.id}>{driver.fullName} - {driver.licenseNumber || driver.phone || 'Registered driver'}</option>
                  ))}
                </select>
              </section>

              <section className="stat-card create-route-panel">
                <StepHeader
                  number="4"
                  icon={<DirectionsBus fontSize="small" />}
                  title="Assign Bus"
                  text="Select an existing bus registered by Admin."
                />
                <select className="form-input" value={selectedBusId} onChange={event => setSelectedBusId(event.target.value)}>
                  <option value="">Choose bus</option>
                  {buses.map(bus => (
                    <option key={bus.id} value={bus.id}>{getBusLabel(bus)} · {bus.capacity ? `${bus.capacity} seats` : 'Capacity not set'}</option>
                  ))}
                </select>
              </section>

              <section className="stat-card create-route-panel">
                <StepHeader
                  number="5"
                  icon={<LocalAtm fontSize="small" />}
                  title="Assign Segment Fares"
                  text="Enter the fare for each movement between two ordered bus stops."
                />
                <div className="create-route-fare-list">
                  {segments.map(segment => (
                    <label className="create-route-fare-row" key={segment.key}>
                      <span>
                        <strong>{segment.from.stopName}</strong>
                        <small>to {segment.to.stopName}</small>
                        {segment.suggestedFare && <em>Admin fare suggestion: {formatMoney(segment.suggestedFare.amount, segment.suggestedFare.currency)}</em>}
                      </span>
                      <input
                        className="form-input"
                        type="number"
                        min="0"
                        step="100"
                        placeholder="TZS"
                        value={segment.amount}
                        onChange={event => updateSegmentFare(segment.key, event.target.value)}
                      />
                    </label>
                  ))}
                </div>
              </section>

              <section className="stat-card create-route-panel create-route-preview">
                <StepHeader
                  number="6"
                  icon={<CheckCircle fontSize="small" />}
                  title="Preview Final Route"
                  text="Review the complete setup before saving."
                />
                <div className="create-route-preview-grid-final">
                  <div>
                    <span>Route</span>
                    <strong>{route.name}</strong>
                  </div>
                  <div>
                    <span>Driver</span>
                    <strong>{selectedDriver?.fullName || 'Not assigned'}</strong>
                  </div>
                  <div>
                    <span>Bus</span>
                    <strong>{selectedBus ? getBusLabel(selectedBus) : 'Not assigned'}</strong>
                  </div>
                  <div>
                    <span>Stops</span>
                    <strong>{orderedStops.length}</strong>
                  </div>
                </div>

                <div className="create-route-preview-columns">
                  <div>
                    <h3>Ordered Bus Stops</h3>
                    <ol>
                      {orderedStops.map(stop => <li key={stop.stopId}>{stop.stopName}</li>)}
                    </ol>
                  </div>
                  <div>
                    <h3>Fare Details</h3>
                    <div className="create-route-preview-fares">
                      {segments.map(segment => (
                        <div key={segment.key}>
                          <span>{segment.from.stopName} to {segment.to.stopName}</span>
                          <strong>{formatMoney(segment.amount)}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            </>
          )}
        </div>
      )}
    </div>
  );
}

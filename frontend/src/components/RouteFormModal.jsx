import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON as GeoJSONLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import toast from 'react-hot-toast';

const ORS_KEY = import.meta.env.VITE_ORS_API_KEY || '';
const ZANZIBAR = [-6.165917, 39.202641];

const makeIcon = (color) =>
  L.divIcon({
    html: `<div style="width:16px;height:16px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);"></div>`,
    className: '',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -12],
  });
const startIcon = makeIcon('var(--success)');
const endIcon   = makeIcon('var(--danger)');

function FitBounds({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) map.fitBounds(bounds, { padding: [50, 50] });
  }, [bounds, map]);
  return null;
}

const EMPTY_FORM = {
  routeNumber: '',
  name: '',
  startPoint: '', startLat: '', startLng: '',
  endPoint:   '', endLat: '',   endLng: '',
  description: '', status: 'ACTIVE',
  distance: '', duration: '', routeGeojson: '', encodedPolyline: '',
};

// ── ORS helpers ──────────────────────────────────────────────────────────────
async function geocodeLocation(query) {
  const url =
    `https://api.openrouteservice.org/geocode/search?api_key=${ORS_KEY}` +
    `&text=${encodeURIComponent(query)}&focus.point.lat=-6.165917&focus.point.lon=39.202641&size=1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Geocoding request failed');
  const data = await res.json();
  if (!data.features?.length) throw new Error(`Location not found: "${query}"`);
  const [lng, lat] = data.features[0].geometry.coordinates;
  return { lat, lng, label: data.features[0].properties.label };
}

async function fetchRoute(sLng, sLat, eLng, eLat) {
  const res = await fetch(
    'https://api.openrouteservice.org/v2/directions/driving-car/geojson',
    {
      method: 'POST',
      headers: { Authorization: ORS_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ coordinates: [[sLng, sLat], [eLng, eLat]] }),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Route generation failed (${res.status})`);
  }
  return res.json();
}

// ── Validation helpers ───────────────────────────────────────────────────────
function isValidLat(v) {
  const n = parseFloat(v);
  return !isNaN(n) && n >= -90 && n <= 90;
}
function isValidLng(v) {
  const n = parseFloat(v);
  return !isNaN(n) && n >= -180 && n <= 180;
}

export default function RouteFormModal({ open, onClose, onSave, initial }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [routeData, setRouteData] = useState(null);
  const [routeVersion, setRouteVersion] = useState(0);

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      setErrors({});
      if (initial) {
        setForm({
          routeNumber: initial.routeNumber || initial.routeCode || initial.code || '',
          name:        initial.name        || '',
          startPoint:  initial.startPoint  || '',
          startLat:    initial.startLat    != null ? String(initial.startLat) : '',
          startLng:    initial.startLng    != null ? String(initial.startLng) : '',
          endPoint:    initial.endPoint    || '',
          endLat:      initial.endLat      != null ? String(initial.endLat)   : '',
          endLng:      initial.endLng      != null ? String(initial.endLng)   : '',
          description: initial.description || '',
          status:      initial.status      || 'ACTIVE',
          distance:    initial.distance    || '',
          duration:    initial.duration    || '',
          routeGeojson:    initial.routeGeojson    || '',
          encodedPolyline: '',
        });
        if (initial.routeGeojson && initial.startLat != null && initial.endLat != null) {
          try {
            setRouteData({
              geojson: JSON.parse(initial.routeGeojson),
              start: { lat: initial.startLat, lng: initial.startLng, label: initial.startPoint },
              end:   { lat: initial.endLat,   lng: initial.endLng,   label: initial.endPoint   },
              bounds: L.latLngBounds(
                [initial.startLat, initial.startLng],
                [initial.endLat,   initial.endLng]
              ),
            });
            setRouteVersion(v => v + 1);
          } catch { setRouteData(null); }
        } else {
          setRouteData(null);
        }
      } else {
        setForm(EMPTY_FORM);
        setRouteData(null);
      }
    });
  }, [open, initial]);

  const set = (field, value) => {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(e => ({ ...e, [field]: undefined }));
  };

  // ── Preview ──────────────────────────────────────────────────────────────
  const handlePreview = async () => {
    if (!form.startPoint.trim()) { toast.error('Starting Point Name is required'); return; }
    if (!form.endPoint.trim())   { toast.error('Ending Point Name is required');   return; }

    const hasManualCoords =
      form.startLat.trim() && form.startLng.trim() &&
      form.endLat.trim()   && form.endLng.trim();

    if (hasManualCoords) {
      if (!isValidLat(form.startLat)) { toast.error('Starting Latitude must be between -90 and 90'); return; }
      if (!isValidLng(form.startLng)) { toast.error('Starting Longitude must be between -180 and 180'); return; }
      if (!isValidLat(form.endLat))   { toast.error('Ending Latitude must be between -90 and 90');   return; }
      if (!isValidLng(form.endLng))   { toast.error('Ending Longitude must be between -180 and 180'); return; }
    } else {
      if (!ORS_KEY) { toast.error('ORS API key is not set in .env (VITE_ORS_API_KEY)'); return; }
    }

    setPreviewing(true);
    try {
      let sLat, sLng, eLat, eLng, startLabel, endLabel;

      if (hasManualCoords) {
        sLat = parseFloat(form.startLat); sLng = parseFloat(form.startLng);
        eLat = parseFloat(form.endLat);   eLng = parseFloat(form.endLng);
        startLabel = form.startPoint;
        endLabel   = form.endPoint;
      } else {
        const [startGeo, endGeo] = await Promise.all([
          geocodeLocation(form.startPoint),
          geocodeLocation(form.endPoint),
        ]);
        sLat = startGeo.lat; sLng = startGeo.lng; startLabel = startGeo.label;
        eLat = endGeo.lat;   eLng = endGeo.lng;   endLabel   = endGeo.label;
        setForm(f => ({
          ...f,
          startLat: String(sLat), startLng: String(sLng),
          endLat:   String(eLat), endLng:   String(eLng),
        }));
      }

      const routeGeoJson = await fetchRoute(sLng, sLat, eLng, eLat);
      const summary = routeGeoJson.features[0].properties.summary;
      const distanceKm  = (summary.distance / 1000).toFixed(1) + ' km';
      const durationMin = Math.round(summary.duration / 60) + ' min';

      setRouteData({
        geojson: routeGeoJson,
        start: { lat: sLat, lng: sLng, label: startLabel },
        end:   { lat: eLat, lng: eLng, label: endLabel   },
        bounds: L.latLngBounds([sLat, sLng], [eLat, eLng]),
      });
      setRouteVersion(v => v + 1);

      setForm(f => ({
        ...f,
        distance:     distanceKm,
        duration:     durationMin,
        routeGeojson: JSON.stringify(routeGeoJson),
      }));
      toast.success(`Route found — ${distanceKm}, ~${durationMin}`);
    } catch (e) {
      toast.error(e.message || 'Failed to generate route');
    } finally {
      setPreviewing(false);
    }
  };

  // ── Save ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    const errs = {};
    if (!form.routeNumber.trim()) errs.routeNumber = 'Route Number is required';
    if (!form.name.trim())       errs.name       = 'Route Name is required';
    if (!form.startPoint.trim()) errs.startPoint = 'Starting Point Name is required';
    if (!form.endPoint.trim())   errs.endPoint   = 'Ending Point Name is required';

    if (!form.startLat.trim())        errs.startLat = 'Starting Latitude is required';
    else if (!isValidLat(form.startLat)) errs.startLat = 'Latitude must be between -90 and 90';

    if (!form.startLng.trim())        errs.startLng = 'Starting Longitude is required';
    else if (!isValidLng(form.startLng)) errs.startLng = 'Longitude must be between -180 and 180';

    if (!form.endLat.trim())          errs.endLat = 'Ending Latitude is required';
    else if (!isValidLat(form.endLat))   errs.endLat = 'Latitude must be between -90 and 90';

    if (!form.endLng.trim())          errs.endLng = 'Ending Longitude is required';
    else if (!isValidLng(form.endLng))   errs.endLng = 'Longitude must be between -180 and 180';

    if (Object.keys(errs).length) {
      setErrors(errs);
      toast.error('Please fix the highlighted fields');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        ...form,
        startLat: parseFloat(form.startLat),
        startLng: parseFloat(form.startLng),
        endLat:   parseFloat(form.endLat),
        endLng:   parseFloat(form.endLng),
      });
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to save route');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const inputStyle = (field) => ({
    borderColor: errors[field] ? 'var(--danger)' : undefined,
  });

  // Shared card style for the two route-detail sections
  const sectionCard = {
    border: '1px solid var(--border-color)',
    borderRadius: 10,
    padding: '16px 18px',
    background: 'var(--bg-secondary, rgba(0,0,0,0.02))',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-box"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 920, width: '96%', maxHeight: '94vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            {initial ? 'Edit Route' : 'Add New Route'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: 4 }}>
            {initial ? 'Update the route details below.' : 'Fill in the details to register a new route.'}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Route identity */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 16 }}>
            <div>
              <label className="form-label">Route Number *</label>
              <input
                className="form-input"
                style={inputStyle('routeNumber')}
                value={form.routeNumber}
                onChange={e => set('routeNumber', e.target.value)}
                placeholder="e.g. 1"
              />
              {errors.routeNumber && <span style={{ color: 'var(--danger)', fontSize: '0.78rem' }}>{errors.routeNumber}</span>}
            </div>
            <div>
              <label className="form-label">Route Name *</label>
              <input
                className="form-input"
                style={inputStyle('name')}
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="e.g. Kijangwani to Fuoni Kisimani"
              />
              {errors.name && <span style={{ color: 'var(--danger)', fontSize: '0.78rem' }}>{errors.name}</span>}
            </div>
          </div>

          {/* Two detail cards side by side */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>

            {/* ── Starting Route Details card ── */}
            <div style={sectionCard}>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: '0.88rem', color: 'var(--primary)' }}>
                  Starting Route Details
                </p>
                <p style={{ margin: '3px 0 0', fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                  Enter the route starting location and its map coordinates.
                </p>
              </div>

              {/* Starting Route Name */}
              <div>
                <label className="form-label">Starting Route Name (From) *</label>
                <input
                  className="form-input"
                  style={inputStyle('startPoint')}
                  value={form.startPoint}
                  onChange={e => set('startPoint', e.target.value)}
                  placeholder="e.g. Kijangwani"
                />
                {errors.startPoint && <span style={{ color: 'var(--danger)', fontSize: '0.78rem' }}>{errors.startPoint}</span>}
              </div>

              {/* Starting Lat | Starting Lng */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="form-label">Starting Latitude *</label>
                  <input
                    className="form-input"
                    style={inputStyle('startLat')}
                    type="number"
                    step="any"
                    value={form.startLat}
                    onChange={e => set('startLat', e.target.value)}
                    placeholder="e.g. -6.1659"
                  />
                  {errors.startLat && <span style={{ color: 'var(--danger)', fontSize: '0.75rem', lineHeight: 1.3, display: 'block' }}>{errors.startLat}</span>}
                </div>
                <div>
                  <label className="form-label">Starting Longitude *</label>
                  <input
                    className="form-input"
                    style={inputStyle('startLng')}
                    type="number"
                    step="any"
                    value={form.startLng}
                    onChange={e => set('startLng', e.target.value)}
                    placeholder="e.g. 39.2026"
                  />
                  {errors.startLng && <span style={{ color: 'var(--danger)', fontSize: '0.75rem', lineHeight: 1.3, display: 'block' }}>{errors.startLng}</span>}
                </div>
              </div>
            </div>

            {/* ── Ending Route Details card ── */}
            <div style={sectionCard}>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: '0.88rem', color: 'var(--danger)' }}>
                  Ending Route Details
                </p>
                <p style={{ margin: '3px 0 0', fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                  Enter the route destination location and its map coordinates.
                </p>
              </div>

              {/* Ending Route Name */}
              <div>
                <label className="form-label">Ending Route Name (To) *</label>
                <input
                  className="form-input"
                  style={inputStyle('endPoint')}
                  value={form.endPoint}
                  onChange={e => set('endPoint', e.target.value)}
                  placeholder="e.g. Fuoni Kisimani"
                />
                {errors.endPoint && <span style={{ color: 'var(--danger)', fontSize: '0.78rem' }}>{errors.endPoint}</span>}
              </div>

              {/* Ending Lat | Ending Lng */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="form-label">Ending Latitude *</label>
                  <input
                    className="form-input"
                    style={inputStyle('endLat')}
                    type="number"
                    step="any"
                    value={form.endLat}
                    onChange={e => set('endLat', e.target.value)}
                    placeholder="e.g. -6.2043"
                  />
                  {errors.endLat && <span style={{ color: 'var(--danger)', fontSize: '0.75rem', lineHeight: 1.3, display: 'block' }}>{errors.endLat}</span>}
                </div>
                <div>
                  <label className="form-label">Ending Longitude *</label>
                  <input
                    className="form-input"
                    style={inputStyle('endLng')}
                    type="number"
                    step="any"
                    value={form.endLng}
                    onChange={e => set('endLng', e.target.value)}
                    placeholder="e.g. 39.2521"
                  />
                  {errors.endLng && <span style={{ color: 'var(--danger)', fontSize: '0.75rem', lineHeight: 1.3, display: 'block' }}>{errors.endLng}</span>}
                </div>
              </div>
            </div>

          </div>{/* end two-card grid */}

          {/* Description — full width */}
          <div>
            <label className="form-label">Description</label>
            <textarea
              className="form-input"
              rows={3}
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Optional: describe the route, key landmarks, etc."
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* Status — full width */}
          <div>
            <label className="form-label">Status</label>
            <select
              className="form-input"
              value={form.status}
              onChange={e => set('status', e.target.value)}
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>

          {/* Divider + Preview section */}
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
              <div>
                <p style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem', margin: 0 }}>
                  Map Preview
                </p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginTop: 2 }}>
                  Enter coordinates above and click preview, or leave blank to geocode from names.
                </p>
              </div>
              <button
                type="button"
                onClick={handlePreview}
                disabled={previewing}
                style={{
                  padding: '9px 20px',
                  border: '2px solid var(--primary)',
                  background: previewing ? 'rgba(var(--primary-rgb),0.08)' : 'transparent',
                  color: 'var(--primary)',
                  borderRadius: 8,
                  cursor: previewing ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  opacity: previewing ? 0.65 : 1,
                  whiteSpace: 'nowrap',
                }}
              >
                {previewing ? '⏳ Loading route...' : '🗺️ Preview Route on Map'}
              </button>
            </div>

            {/* Leaflet Map */}
            <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
              <MapContainer
                center={ZANZIBAR}
                zoom={11}
                style={{ height: 300, width: '100%' }}
                scrollWheelZoom={false}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {routeData && (
                  <>
                    <GeoJSONLayer
                      key={routeVersion}
                      data={routeData.geojson}
                      style={{ color: 'var(--primary)', weight: 5, opacity: 0.85 }}
                    />
                    <Marker position={[routeData.start.lat, routeData.start.lng]} icon={startIcon}>
                      <Popup><strong>📍 Start</strong><br />{routeData.start.label}</Popup>
                    </Marker>
                    <Marker position={[routeData.end.lat, routeData.end.lng]} icon={endIcon}>
                      <Popup><strong>🏁 End</strong><br />{routeData.end.label}</Popup>
                    </Marker>
                    <FitBounds bounds={routeData.bounds} />
                  </>
                )}
              </MapContainer>
            </div>

            {/* Distance / Duration chips */}
            {(form.distance || form.duration) && (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
                {form.distance && (
                  <div style={{ background: 'var(--primary-tint)', color: 'var(--dark)', padding: '6px 14px', borderRadius: 20, fontSize: '0.83rem', fontWeight: 500 }}>
                    📏 Distance: <strong>{form.distance}</strong>
                  </div>
                )}
                {form.duration && (
                  <div style={{ background: 'var(--primary-tint)', color: 'var(--dark)', padding: '6px 14px', borderRadius: 20, fontSize: '0.83rem', fontWeight: 500 }}>
                    ⏱️ Duration: <strong>{form.duration}</strong>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer Buttons */}
        <div style={{
          display: 'flex', gap: 12, marginTop: 28, justifyContent: 'flex-end',
          borderTop: '1px solid var(--border-color)', paddingTop: 20,
        }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : initial ? 'Update Route' : 'Save Route'}
          </button>
        </div>
      </div>
    </div>
  );
}

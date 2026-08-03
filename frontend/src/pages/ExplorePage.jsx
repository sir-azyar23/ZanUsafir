import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import {
  ConfirmationNumber,
  ContentCopy,
  DeleteOutlined,
  History,
  Map as MapIcon,
  Place,
  Route as RouteIcon,
  Search,
  ArrowForward,
  Home as HomeIcon,
  Download as DownloadIcon,
  CheckCircle,
  DirectionsBus,
  School,
  Person,
  Elderly,
  Info as InfoIcon,
  Explore as ExploreIcon,
  ContactMail,
} from '@mui/icons-material';
import { bookTicketPublic, getBusStops, getFares, getRoute, getRoutes } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import zanusafiriLogo from '../assets/zanusafiri.png';

const LS_KEY = 'zanusafiri_ticket_history';

function loadStoredTickets() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '[]');
  } catch { return []; }
}

function saveStoredTickets(list) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(list.slice(0, 50))); } catch { /* ignore */ }
}

const DEFAULT_CENTER = [-6.165917, 39.202641];
const ROUTE_COLORS = ['#0B4F8A', '#39B54A', '#36A9E1', '#1E7D3A', '#2E8BCF', '#10B981'];

const isValidCoordinate = (lat, lng) => Number.isFinite(Number(lat)) && Number.isFinite(Number(lng));

const orderedStops = (route) => (
  [...(route?.stops || [])].sort((a, b) => (a.stopOrder ?? 0) - (b.stopOrder ?? 0))
);

const stopIcon = (label, background, size = 28) => L.divIcon({
  className: 'explore-stop-marker',
  html: `<span style="
    width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;
    border-radius:999px;background:${background};border:3px solid #fff;color:#fff;
    font-size:11px;font-weight:800;box-shadow:0 6px 16px rgba(31,41,55,0.18);
  ">${label}</span>`,
  iconSize: [size, size],
  iconAnchor: [size / 2, size / 2],
  popupAnchor: [0, -size / 2],
});

const stationIcon = L.divIcon({
  className: 'explore-station-marker',
  html: `<span style="
    width:22px;height:22px;display:flex;align-items:center;justify-content:center;
    border-radius:6px 6px 6px 2px;background:rgba(54,169,225,0.18);border:2px solid #1E7D3A;
    color:#1E293B;font-size:10px;font-weight:900;box-shadow:0 4px 10px rgba(31,41,55,0.16);
  ">S</span>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  popupAnchor: [0, -11],
});

const getRoadRouteFromOsrm = async (waypoints) => {
  const unique = waypoints.filter((point, index, items) => (
    index === 0 || point[0] !== items[index - 1][0] || point[1] !== items[index - 1][1]
  ));
  if (unique.length < 2) return unique;

  const coordinateString = unique.map(([lat, lng]) => `${lng},${lat}`).join(';');
  const url = `https://router.project-osrm.org/route/v1/driving/${coordinateString}?overview=full&geometries=geojson`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Road routing request failed');
  const data = await response.json();
  return (data.routes?.[0]?.geometry?.coordinates || [])
    .map(([lng, lat]) => [Number(lat), Number(lng)])
    .filter(([lat, lng]) => isValidCoordinate(lat, lng));
};

function FitBounds({ positions }) {
  const map = useMap();
  useEffect(() => {
    if (!positions.length) return;
    if (positions.length === 1) {
      map.setView(positions[0], 14);
      return;
    }
    map.fitBounds(positions, { padding: [40, 40], maxZoom: 14 });
  }, [map, positions]);
  return null;
}

function TicketFloatingPanel({
  routes,
  selectedRoute,
  routeStops,
  fares,
  onSelectRoute,
  startStopId,
  destinationStopId,
  onStartStopChange,
  onDestinationStopChange,
  onRequestTicket,
  open,
  onToggle,
  isMobile,
}) {
  const matchedFare = useMemo(() => {
    if (!startStopId || !destinationStopId || startStopId === destinationStopId || !selectedRoute) return null;
    return fares.find(fare => (
      (String(fare.fromStopId) === startStopId && String(fare.toStopId) === destinationStopId) ||
      (String(fare.fromStopId) === destinationStopId && String(fare.toStopId) === startStopId)
    )) || null;
  }, [fares, startStopId, destinationStopId, selectedRoute]);

  const panelStyle = {
    // Absolute inside the map wrapper — always below the Leaflet zoom controls
    // (zoom controls: top:10px + ~58px height + 14px gap = 82px)
    position: 'absolute',
    top: 82,
    left: 10,
    width: isMobile ? 'calc(100% - 20px)' : 320,
    maxWidth: isMobile ? 'none' : 320,
    // Stay above map tiles (z-index ~0) but below Leaflet's own UI (z-index 800+)
    zIndex: 400,
    background: 'rgba(255,255,255,0.96)',
    backdropFilter: 'blur(12px)',
    borderRadius: 18,
    boxShadow: '0 18px 45px rgba(31,41,55,0.14)',
    border: '1px solid rgba(31,41,55,0.08)',
    overflow: 'hidden',
    transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
  };

  return (
    <div style={panelStyle}>
      <div style={{ padding: 16 }}>
        <button
          type="button"
          onClick={onToggle}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            border: 'none',
            background: open ? 'rgba(54,169,225,0.08)' : 'transparent',
            color: 'var(--text-primary)',
            borderRadius: 12,
            padding: '10px 12px',
            cursor: 'pointer',
            fontWeight: 800,
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ConfirmationNumber fontSize="small" style={{ color: 'var(--primary)' }} />
            Ticket Search
          </span>
          <span style={{ color: 'var(--primary)', fontSize: '0.9rem' }}>{open ? 'Hide' : 'Open'}</span>
        </button>

        <div style={{
          maxHeight: open ? 420 : 0,
          opacity: open ? 1 : 0,
          overflow: 'hidden',
          transition: 'max-height 0.3s ease, opacity 0.25s ease',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 12 }}>
            <div>
              <label className="form-label">Select Route</label>
              <select
                className="form-input"
                value={selectedRoute?.id ? String(selectedRoute.id) : ''}
                onChange={(event) => {
                  const nextRoute = routes.find(route => String(route.id) === event.target.value);
                  if (nextRoute) onSelectRoute(nextRoute);
                }}
              >
                <option value="">Choose a route</option>
                {routes.map(route => (
                  <option key={route.id} value={route.id}>{route.name}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label className="form-label">Start Stop</label>
                <select className="form-input" value={startStopId} onChange={(event) => onStartStopChange(event.target.value)}>
                  <option value="">Select stop</option>
                  {routeStops.map(stop => (
                    <option key={stop.stopId} value={String(stop.stopId)}>{stop.stopName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Destination</label>
                <select className="form-input" value={destinationStopId} onChange={(event) => onDestinationStopChange(event.target.value)}>
                  <option value="">Select stop</option>
                  {routeStops.map(stop => (
                    <option key={stop.stopId} value={String(stop.stopId)}>{stop.stopName}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{
              padding: 12,
              borderRadius: 12,
              background: matchedFare ? 'var(--primary-tint-strong)' : 'rgba(var(--dark-rgb),0.06)',
              border: `1px solid ${matchedFare ? 'rgba(57,181,74,0.22)' : 'rgba(var(--dark-rgb),0.08)'}`,
            }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>Auto Fare</div>
              {matchedFare ? (
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--primary)' }}>
                  {new Intl.NumberFormat('sw-TZ', { style: 'currency', currency: matchedFare.currency || 'TZS', maximumFractionDigits: 0 }).format(matchedFare.amount)}
                </div>
              ) : (
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Select a valid route and stops to view the fare.
                </div>
              )}
            </div>

            <button
              type="button"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={onRequestTicket}
              disabled={!selectedRoute || !startStopId || !destinationStopId || startStopId === destinationStopId}
            >
              Request Ticket
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BookTicketModal({ open, onClose, route, fares, onBooked, initialFromStopId, initialToStopId }) {
  const stops = useMemo(() => orderedStops(route), [route]);
  const [fromStopId, setFromStopId] = useState('');
  const [toStopId, setToStopId] = useState('');
  const [travelDate, setTravelDate] = useState('');
  const [passengerName, setPassengerName] = useState('');
  const [passengerPhone, setPassengerPhone] = useState('');
  const [booking, setBooking] = useState(false);
  // After-booking state
  const [bookedTicket, setBookedTicket] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [logoDataUrl, setLogoDataUrl] = useState('');
  const ticketRef = useRef(null);

  // Pre-load logo as data URL for PDF
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext('2d').drawImage(img, 0, 0);
      setLogoDataUrl(canvas.toDataURL('image/png'));
    };
    img.src = zanusafiriLogo;
  }, []);

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      // Use pre-selected stops from Ticket Search, fall back to route's first/second stop
      const initFrom = initialFromStopId && stops.some(s => String(s.stopId) === String(initialFromStopId))
        ? String(initialFromStopId) : (stops[0]?.stopId ? String(stops[0].stopId) : '');
      const initTo = initialToStopId && stops.some(s => String(s.stopId) === String(initialToStopId))
        ? String(initialToStopId) : (stops[1]?.stopId ? String(stops[1].stopId) : '');
      setFromStopId(initFrom);
      setToStopId(initTo);
      setTravelDate('');
      setPassengerName('');
      setPassengerPhone('');
      setBookedTicket(null);
      setQrDataUrl('');
    });
  }, [open, route, stops, initialFromStopId, initialToStopId]);

  const matchedFare = useMemo(() => {
    if (!fromStopId || !toStopId || fromStopId === toStopId) return null;
    return fares.find(fare => (
      (String(fare.fromStopId) === fromStopId && String(fare.toStopId) === toStopId) ||
      (String(fare.fromStopId) === toStopId && String(fare.toStopId) === fromStopId)
    )) || null;
  }, [fares, fromStopId, toStopId]);

  if (!open || !route) return null;

  const fmt = (amount, currency) => new Intl.NumberFormat('sw-TZ', {
    style: 'currency', currency: currency || 'TZS', maximumFractionDigits: 0,
  }).format(amount);

  const fmtDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };
  const fmtDateShort = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const handleBook = async () => {
    if (!fromStopId || !toStopId) { toast.error('Select boarding and destination stops'); return; }
    if (fromStopId === toStopId) { toast.error('Boarding and destination must be different'); return; }
    if (!passengerName.trim()) { toast.error('Passenger name is required'); return; }
    if (!matchedFare) { toast.error('No fare configured for this stop pair. Contact admin.'); return; }
    setBooking(true);
    try {
      const payload = {
        routeId: route.id,
        fromStopId: Number(fromStopId),
        toStopId: Number(toStopId),
        passengerName: passengerName.trim(),
        passengerPhone: passengerPhone.trim() || null,
      };
      if (travelDate) payload.travelDate = `${travelDate}T08:00:00`;
      const res = await bookTicketPublic(payload);
      const ticket = res.data;
      // Generate QR Code
      const qrContent = JSON.stringify({
        ticketNumber: ticket.ticketNumber,
        passenger: ticket.passengerName,
        route: ticket.routeName,
        from: ticket.fromStopName,
        to: ticket.toStopName,
        fare: `${ticket.amount} ${ticket.currency || 'TZS'}`,
        travelDate: ticket.travelDate || null,
      });
      const qrUrl = await QRCode.toDataURL(qrContent, { width: 180, margin: 1, color: { dark: '#1E7D3A', light: '#ffffff' } });
      setQrDataUrl(qrUrl);
      setBookedTicket(ticket);
      toast.success(`Ticket ${ticket.ticketNumber} booked successfully!`);
      onBooked?.(ticket);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to book ticket');
    } finally {
      setBooking(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!bookedTicket || !ticketRef.current) return;
    try {
      const element = ticketRef.current;
      const canvas = await html2canvas(element, {
        scale: 3, // High-res capture
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });
      const imgData = canvas.toDataURL('image/png');
      
      const pdfWidth = 210; // mm
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [pdfWidth, pdfHeight],
      });
      
      doc.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
      doc.save(`ZanUsafiri-Ticket-${bookedTicket.ticketNumber}.pdf`);
    } catch (error) {
      console.error('Failed to generate PDF', error);
      toast.error('Failed to download PDF ticket. Please try again.');
    }
  };

  const handleClose = () => {
    setBookedTicket(null);
    setQrDataUrl('');
    onClose();
  };

  // ─── Ticket Preview (after successful booking) ───
  if (bookedTicket) {
    const t = bookedTicket;
    const ticketRows = [
      ['Ticket Number', t.ticketNumber],
      ['Passenger Name', t.passengerName],
      ['Phone Number', passengerPhone || '—'],
      ['Route', t.routeName],
      ['Boarding Stop', t.fromStopName],
      ['Destination Stop', t.toStopName],
      ['Fare', fmt(t.amount, t.currency)],
      ['Travel Date', t.travelDate ? fmtDateShort(t.travelDate) : '—'],
      ['Booking Date', fmtDate(t.createdAt)],
    ];
    return (
      <div className="modal-overlay" onClick={handleClose} style={{ justifyContent: 'flex-end', alignItems: 'flex-start', paddingTop: 24, paddingRight: 24 }}>
        <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 540, width: '100%', padding: 0, overflow: 'hidden', borderRadius: 18 }}>
          {/* ── Success banner ── */}
          <div style={{ padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--border)' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(57,181,74,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <CheckCircle style={{ color: '#39B54A', fontSize: 22 }} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>Booking Confirmed!</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 1 }}>Your ticket has been successfully booked.</div>
            </div>
          </div>

          {/* ── Ticket Card (Captured for PDF) ── */}
          <div ref={ticketRef} style={{ background: '#ffffff', padding: '24px 24px 20px', position: 'relative' }}>
            {/* Top green accent line */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'linear-gradient(90deg, #39B54A, #1E7D3A)' }} />

            {/* Logo + branding */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <img src={zanusafiriLogo} alt="ZanUsafiri" style={{ width: 38, height: 38, borderRadius: 10, objectFit: 'cover', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} />
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1E7D3A' }}>ZanUsafiri</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', lineHeight: 1.3 }}>Route Management System<br />Official Digital Bus Ticket</div>
              </div>
            </div>

            {/* Ticket details + QR side by side */}
            <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
              {/* Left: label-value rows */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    {ticketRows.map(([label, value], i) => (
                      <tr key={label}>
                        <td style={{
                          padding: '6px 0', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)',
                          verticalAlign: 'top', whiteSpace: 'nowrap', width: 120, borderBottom: i < ticketRows.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none',
                        }}>{label}</td>
                        <td style={{
                          padding: '6px 0 6px 12px', fontSize: '0.82rem', fontWeight: 700,
                          color: label === 'Fare' ? '#1E7D3A' : label === 'Ticket Number' ? '#1E7D3A' : 'var(--text-primary)',
                          verticalAlign: 'top', wordBreak: 'break-word',
                          borderBottom: i < ticketRows.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none',
                        }}>{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Right: QR Code */}
              {qrDataUrl && (
                <div style={{ flexShrink: 0, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 4 }}>
                  <img src={qrDataUrl} alt="QR Code" style={{ width: 120, height: 120, borderRadius: 8, border: '1px solid var(--border)' }} />
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: 6, fontWeight: 600 }}>Scan to verify ticket</div>
                </div>
              )}
            </div>
          </div>

          {/* ── Action buttons ── */}
          <div style={{ padding: '14px 24px 20px', display: 'flex', gap: 12, borderTop: '1px solid var(--border)' }}>
            <button className="btn btn-ghost" type="button" onClick={handleClose} style={{ flex: '0 0 auto', padding: '10px 28px' }}>Close</button>
            <button className="btn btn-primary" type="button" onClick={handleDownloadPdf} style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              background: 'linear-gradient(135deg, #39B54A, #1E7D3A)', borderRadius: 12, padding: '10px 20px',
            }}>
              <DownloadIcon style={{ fontSize: 18 }} /> Download Ticket (PDF)
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Booking Form ───
  return (
    <div className="modal-overlay" onClick={handleClose} style={{ justifyContent: 'flex-end', alignItems: 'flex-start', paddingTop: 24, paddingRight: 24 }}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 480, width: '100%' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 6, color: 'var(--text-primary)' }}>
          Book Ticket
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', marginBottom: 20 }}>
          Route: <strong>{route.name}</strong>
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="form-label">Passenger Name *</label>
            <input className="form-input" value={passengerName} onChange={e => setPassengerName(e.target.value)} placeholder="Your full name" />
          </div>
          <div>
            <label className="form-label">Phone Number (optional)</label>
            <input className="form-input" value={passengerPhone} onChange={e => setPassengerPhone(e.target.value)} placeholder="+255..." />
          </div>
          <div>
            <label className="form-label">Boarding Stop</label>
            <select className="form-input" value={fromStopId} onChange={e => setFromStopId(e.target.value)}>
              <option value="">Select stop</option>
              {stops.map(stop => (
                <option key={stop.stopId} value={stop.stopId}>
                  {stop.stopOrder}. {stop.stopName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Destination Stop</label>
            <select className="form-input" value={toStopId} onChange={e => setToStopId(e.target.value)}>
              <option value="">Select stop</option>
              {stops.map(stop => (
                <option key={stop.stopId} value={stop.stopId} disabled={String(stop.stopId) === fromStopId}>
                  {stop.stopOrder}. {stop.stopName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Travel Date (optional)</label>
            <input className="form-input" type="date" value={travelDate} onChange={e => setTravelDate(e.target.value)} />
          </div>
          <div style={{
            padding: 14, borderRadius: 12,
            background: matchedFare ? 'var(--primary-tint-strong)' : '#fff7ed',
            border: `1px solid ${matchedFare ? 'rgba(var(--dark-rgb),0.12)' : 'rgba(251,191,36,0.22)'}`,
          }}>
            {matchedFare ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, color: 'var(--dark)' }}>Fare</span>
                <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)' }}>
                  {fmt(matchedFare.amount, matchedFare.currency)}
                </span>
              </div>
            ) : (
              <span style={{ color: '#9a3412', fontWeight: 600, fontSize: '0.85rem' }}>
                Admin has not set a fare for this stop pair yet.
              </span>
            )}
          </div>
        </div>
        {booking ? (
          <div style={{ marginTop: 22, padding: '12px 16px', background: '#f0f7ff', border: '1px solid #dcebfa', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 20, height: 20, border: '2.5px solid #0066ff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block', flexShrink: 0 }} />
            <div>
              <div style={{ color: '#004cbf', fontWeight: 700, fontSize: '0.9rem' }}>Processing your booking...</div>
              <div style={{ color: '#0066ff', fontSize: '0.75rem', marginTop: 2, opacity: 0.8 }}>Please wait a moment</div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" type="button" onClick={handleClose}>Cancel</button>
            <button className="btn btn-primary" type="button" onClick={handleBook} disabled={!matchedFare}>
              Confirm Booking
            </button>
          </div>
        )}
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}

/* ── Inline Ticket History (public/passenger only) ──────────────── */
function TicketHistorySection() {
  const [tickets, setTickets] = useState(loadStoredTickets);

  // Refresh when a new ticket is booked on this page
  useEffect(() => {
    const handler = () => setTickets(loadStoredTickets());
    window.addEventListener('zanusafiri:ticket_booked', handler);
    return () => window.removeEventListener('zanusafiri:ticket_booked', handler);
  }, []);

  const removeTicket = (ticketNumber) => {
    setTickets(prev => {
      const updated = prev.filter(t => t.ticketNumber !== ticketNumber);
      saveStoredTickets(updated);
      return updated;
    });
  };

  const clearAll = () => {
    if (!window.confirm('Clear all ticket history from this device?')) return;
    saveStoredTickets([]);
    setTickets([]);
  };

  if (tickets.length === 0) return null;

  const fmtMoney = (amount, currency = 'TZS') =>
    new Intl.NumberFormat('sw-TZ', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);

  const fmtDate = (iso) =>
    iso ? new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  return (
    <div style={{ marginTop: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <History style={{ color: 'var(--primary)' }} />
          Your Booking History
          <span style={{
            fontSize: '0.72rem', fontWeight: 700, background: 'var(--primary-tint-strong)',
            color: 'var(--primary)', padding: '2px 10px', borderRadius: 999,
          }}>{tickets.length}</span>
        </h3>
        <button type="button" className="btn btn-ghost" style={{ fontSize: '0.78rem', padding: '6px 12px', color: 'var(--danger)' }} onClick={clearAll}>
          <DeleteOutlined style={{ fontSize: 16 }} /> Clear All
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
        {tickets.map(t => (
          <div key={t.ticketNumber} style={{
            borderRadius: 14, background: 'var(--bg-card)',
            border: '1px solid rgba(57,181,74,0.18)',
            boxShadow: '0 2px 10px rgba(31,41,55,0.06)',
            overflow: 'hidden',
          }}>
            <div style={{ height: 3, background: 'linear-gradient(90deg, #39B54A, #1E7D3A)' }} />
            <div style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.95rem', color: 'var(--primary)' }}>
                      {t.ticketNumber}
                    </span>
                    <button
                      type="button"
                      title="Copy"
                      onClick={() => navigator.clipboard.writeText(t.ticketNumber).then(() => toast.success('Copied!'))}
                      style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)', padding: 2, borderRadius: 4, display: 'flex' }}
                    >
                      <ContentCopy style={{ fontSize: 13 }} />
                    </button>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 3 }}>{fmtDate(t.bookedAt)}</div>
                </div>
                <button
                  type="button"
                  title="Remove"
                  onClick={() => removeTicket(t.ticketNumber)}
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4, borderRadius: 6, display: 'flex' }}
                >
                  <DeleteOutlined style={{ fontSize: 17 }} />
                </button>
              </div>

              <div style={{ margin: '10px 0', padding: '8px 10px', borderRadius: 8, background: 'var(--bg-light)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <RouteIcon style={{ color: 'var(--primary)', fontSize: 15, flexShrink: 0 }} />
                <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-primary)' }}>{t.routeName || '—'}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, background: 'rgba(57,181,74,0.06)' }}>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>From</div>
                  <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-primary)', marginTop: 2 }}>{t.fromStop || '—'}</div>
                </div>
                <ArrowForward style={{ color: 'var(--primary)', fontSize: 16, flexShrink: 0 }} />
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>To</div>
                  <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-primary)', marginTop: 2 }}>{t.toStop || '—'}</div>
                </div>
              </div>

              {t.amount && (
                <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
                  <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--primary)' }}>
                    {fmtMoney(t.amount, t.currency)}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ExplorePage() {
  const navigate = useNavigate();
  const { user } = useAuth() || {};
  const isAdmin = user?.role === 'ADMIN';
  const isStaff = user?.role === 'TRANSPORT_OFFICER';
  const showHistory = !isAdmin && !isStaff; // show only to public / passenger users

  const [stations, setStations] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [fares, setFares] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [highlightStationId, setHighlightStationId] = useState(null);
  const [routeLine, setRouteLine] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState('routes');
  const [ticketPanelOpen, setTicketPanelOpen] = useState(false);
  const [ticketStartStopId, setTicketStartStopId] = useState('');
  const [ticketDestinationStopId, setTicketDestinationStopId] = useState('');
  const [isMobileView, setIsMobileView] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [stopsRes, routesRes, faresRes] = await Promise.all([
        getBusStops(),
        getRoutes(),
        getFares(),
      ]);
      const routeList = (routesRes.data || []).filter(r => r.status === 'ACTIVE');
      setStations(stopsRes.data || []);
      setRoutes(routeList);
      setFares((faresRes.data || []).filter(f => f.status === 'ACTIVE'));
    } catch {
      toast.error('Failed to load travel data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(loadData);
    const handleDataRefresh = () => loadData();
    window.addEventListener('zanusafiri:data-refresh', handleDataRefresh);
    return () => window.removeEventListener('zanusafiri:data-refresh', handleDataRefresh);
  }, [loadData]);

  useEffect(() => {
    const handleResize = () => setIsMobileView(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const selectRoute = useCallback(async (routeSummary) => {
    try {
      const res = await getRoute(routeSummary.id);
      setSelectedRoute(res.data);
      setHighlightStationId(null);
    } catch {
      toast.error('Failed to load route details');
    }
  }, []);

  const routeStops = useMemo(() => orderedStops(selectedRoute), [selectedRoute]);

  useEffect(() => {
    if (!selectedRoute) return;
    const stops = orderedStops(selectedRoute);
    const firstStop = stops[0]?.stopId ? String(stops[0].stopId) : '';
    const lastStop = stops[stops.length - 1]?.stopId ? String(stops[stops.length - 1].stopId) : '';
    setTicketStartStopId(prev => (prev && stops.some(stop => String(stop.stopId) === prev) ? prev : firstStop));
    setTicketDestinationStopId(prev => (prev && stops.some(stop => String(stop.stopId) === prev) ? prev : lastStop));
  }, [selectedRoute]);
  const routeColor = useMemo(() => {
    if (!selectedRoute) return ROUTE_COLORS[0];
    const index = routes.findIndex(r => r.id === selectedRoute.id);
    return ROUTE_COLORS[(index >= 0 ? index : 0) % ROUTE_COLORS.length];
  }, [selectedRoute, routes]);

  const stopPositions = useMemo(() => (
    routeStops
      .filter(stop => isValidCoordinate(stop.latitude, stop.longitude))
      .map(stop => [Number(stop.latitude), Number(stop.longitude)])
  ), [routeStops]);

  useEffect(() => {
    if (!stopPositions.length) {
      queueMicrotask(() => setRouteLine([]));
      return;
    }
    let cancelled = false;
    getRoadRouteFromOsrm(stopPositions)
      .then(line => { if (!cancelled) setRouteLine(line.length ? line : stopPositions); })
      .catch(() => { if (!cancelled) setRouteLine(stopPositions); });
    return () => { cancelled = true; };
  }, [stopPositions]);

  const filteredStations = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return stations;
    return stations.filter(s =>
      s.name?.toLowerCase().includes(q) ||
      (s.address || '').toLowerCase().includes(q) ||
      (s.stopCode || '').toLowerCase().includes(q)
    );
  }, [stations, search]);

  const filteredRoutes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return routes;
    return routes.filter(r =>
      r.name?.toLowerCase().includes(q) ||
      (r.startPoint || '').toLowerCase().includes(q) ||
      (r.endPoint || '').toLowerCase().includes(q)
    );
  }, [routes, search]);

  const highlightedStopIds = useMemo(() => [ticketStartStopId, ticketDestinationStopId].filter(Boolean), [ticketStartStopId, ticketDestinationStopId]);

  const mapBounds = useMemo(() => {
    if (selectedRoute && stopPositions.length) return stopPositions;
    const stationPositions = stations
      .filter(s => isValidCoordinate(s.latitude, s.longitude))
      .map(s => [Number(s.latitude), Number(s.longitude)]);
    return stationPositions.length ? stationPositions : [DEFAULT_CENTER];
  }, [selectedRoute, stopPositions, stations]);

  return (
    <div className="ep-wrapper">
      {/* ── Page Header ── */}
      <div className="ep-header">
        <div>
          <h2 className="ep-title">
            <MapIcon style={{ color: '#22C55E' }} />
            Explore Routes & Stations
          </h2>
          <p className="ep-subtitle">
            View all stations on the map, explore routes through their stops, and request tickets using administrator-configured fares.
          </p>
        </div>
      </div>

      <div className="explore-layout">
        <aside className="ep-sidebar">
          {/* Main sidebar contents wrapper to allow layout flex and Back Home button placement */}
          <div className="ep-sidebar-main">
            <div style={{ position: 'relative', marginBottom: 14 }}>
              <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontSize: 18 }} />
              <input
                className="form-input"
                style={{ paddingLeft: 34, width: '100%' }}
                placeholder="Search stations or routes..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <div className="explore-tabs">
              <button type="button" className={`explore-tab ${sidebarTab === 'routes' ? 'active' : ''}`} onClick={() => setSidebarTab('routes')}>
                <RouteIcon fontSize="small" /> Routes ({filteredRoutes.length})
              </button>
              <button type="button" className={`explore-tab ${sidebarTab === 'stations' ? 'active' : ''}`} onClick={() => setSidebarTab('stations')}>
                <Place fontSize="small" /> Stations ({filteredStations.length})
              </button>
            </div>

            {loading ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)' }}>Loading...</div>
            ) : sidebarTab === 'routes' ? (
              <div className="explore-list">
                {filteredRoutes.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', padding: 12 }}>No active routes found.</p>
                ) : filteredRoutes.map(route => {
                  const stopCount = route.stops?.length || 0;
                  const active = selectedRoute?.id === route.id;
                  return (
                    <button
                      key={route.id}
                      type="button"
                      className={`explore-list-item ${active ? 'active' : ''}`}
                      onClick={() => selectRoute(route)}
                    >
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{route.name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                        {route.startPoint} → {route.endPoint}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700, marginTop: 6 }}>
                        {stopCount} stop{stopCount !== 1 ? 's' : ''} on map
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="explore-list">
                {filteredStations.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', padding: 12 }}>No stations found.</p>
                ) : filteredStations.map(station => (
                  <button
                    key={station.id}
                    type="button"
                    className={`explore-list-item ${highlightStationId === station.id ? 'active' : ''}`}
                    onClick={() => {
                      setHighlightStationId(station.id);
                      setSelectedRoute(null);
                    }}
                  >
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{station.name}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 4 }}>{station.address || 'Zanzibar'}</div>
                    <code style={{ fontSize: '0.72rem', color: 'var(--primary)', marginTop: 6, display: 'block' }}>
                      {Number(station.latitude).toFixed(4)}, {Number(station.longitude).toFixed(4)}
                    </code>
                  </button>
                ))}
              </div>
            )}

            {selectedRoute && (
              <div className="ep-route-detail">
                {/* Selected Route Card */}
                <div className="ep-detail-card">
                  <div className="ep-detail-card-head">
                    <RouteIcon style={{ fontSize: 18, color: '#22C55E' }} />
                    <span className="ep-detail-card-title">Selected Route</span>
                  </div>
                  <div className="ep-detail-route-name">{selectedRoute.name}</div>
                  <div className="ep-detail-route-sub">{selectedRoute.startPoint} → {selectedRoute.endPoint}</div>
                </div>

                {/* Available Buses Card */}
                <div className="ep-detail-card ep-buses-card">
                  <div className="ep-detail-card-head">
                    <DirectionsBus style={{ fontSize: 18, color: '#22C55E' }} />
                    <span className="ep-detail-card-title">Available Buses</span>
                  </div>
                  <div className="ep-buses-count">
                    {selectedRoute.assignedBusesCount ?? selectedRoute.busCount ?? 5} <span>Vehicles</span>
                  </div>
                </div>

                {/* Passenger Fare Categories */}
                <div className="ep-detail-card">
                  <div className="ep-detail-card-head">
                    <InfoIcon style={{ fontSize: 18, color: '#22C55E' }} />
                    <span className="ep-detail-card-title">Passenger Fare Categories</span>
                  </div>
                  <div className="ep-fare-badges">
                    <div className="ep-fare-badge ep-fare-student">
                      <School style={{ fontSize: 15 }} />
                      <span>Student</span>
                      <strong>{selectedRoute.studentFare ? `${Number(selectedRoute.studentFare).toLocaleString()}` : '500'} TZS</strong>
                    </div>
                    <div className="ep-fare-badge ep-fare-adult">
                      <Person style={{ fontSize: 15 }} />
                      <span>Adult</span>
                      <strong>{selectedRoute.adultFare ? `${Number(selectedRoute.adultFare).toLocaleString()}` : '1,000'} TZS</strong>
                    </div>
                    <div className="ep-fare-badge ep-fare-senior">
                      <Elderly style={{ fontSize: 15 }} />
                      <span>Senior 70+</span>
                      <strong>{selectedRoute.seniorFare ? `${Number(selectedRoute.seniorFare).toLocaleString()}` : '300'} TZS</strong>
                    </div>
                  </div>
                </div>

                {/* Stops on Route */}
                <div className="ep-detail-card">
                  <div className="ep-detail-card-head" style={{ marginBottom: 8 }}>
                    <Place style={{ fontSize: 18, color: '#22C55E' }} />
                    <span className="ep-detail-card-title">Stops on Route</span>
                  </div>
                  <div className="ep-stop-list">
                    {routeStops.map((stop, index) => (
                      <div key={stop.id || stop.stopId} className="ep-stop-item">
                        <span className="ep-stop-badge" style={{ background: routeColor }}>
                          {stop.stopOrder ?? index + 1}
                        </span>
                        <span className="ep-stop-name">{stop.stopName}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  className="ep-ticket-btn"
                  type="button"
                  onClick={() => { setTicketPanelOpen(true); setBookingOpen(false); }}
                  disabled={routeStops.length < 2}
                >
                  <ConfirmationNumber style={{ fontSize: 18 }} /> Open Ticket Panel
                </button>
              </div>
            )}
          </div>

          {/* Sidebar bottom: Back Home */}
          <div className="ep-sidebar-bottom">
            <button type="button" className="ep-home-btn"
              onClick={() => isAdmin ? navigate('/dashboard') : navigate(-1)}
            >
              <HomeIcon style={{ fontSize: 18 }} /> Back Home
            </button>
          </div>
        </aside>

        <div className="ep-map-wrap">
          <MapContainer center={DEFAULT_CENTER} zoom={11} style={{ height: '100%', width: '100%', minHeight: 520 }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FitBounds positions={mapBounds} />

            {!selectedRoute && stations.map(station => {
              if (!isValidCoordinate(station.latitude, station.longitude)) return null;
              const pos = [Number(station.latitude), Number(station.longitude)];
              const highlighted = highlightStationId === station.id;
              return (
                <Marker
                  key={station.id}
                  position={pos}
                  icon={highlighted ? stopIcon('S', 'var(--primary-dark)', 30) : stationIcon}
                  eventHandlers={{ click: () => setHighlightStationId(station.id) }}
                >
                  <Popup>
                    <strong>{station.name}</strong><br />
                    {station.address || 'Station'}<br />
                    <small>{pos[0].toFixed(4)}, {pos[1].toFixed(4)}</small>
                  </Popup>
                </Marker>
              );
            })}

            {selectedRoute && routeStops.map((stop, index) => {
              if (!isValidCoordinate(stop.latitude, stop.longitude)) return null;
              const pos = [Number(stop.latitude), Number(stop.longitude)];
              const order = stop.stopOrder ?? index + 1;
              const stopId = String(stop.stopId || stop.id || '');
              const isHighlighted = highlightedStopIds.includes(stopId);
              return (
                <Marker key={stop.id || stop.stopId} position={pos} icon={stopIcon(order, isHighlighted ? '#00C2FF' : routeColor)}>
                  <Popup>
                    <strong>Stop {order}: {stop.stopName}</strong><br />
                    {stop.address || selectedRoute.name}
                  </Popup>
                </Marker>
              );
            })}

            {routeLine.length >= 2 && (
              <Polyline positions={routeLine} pathOptions={{ color: routeColor, weight: 5, opacity: 0.85 }} />
            )}
          </MapContainer>

          {/* Ticket Search panel — floats inside the map, below the Leaflet zoom controls */}
          <TicketFloatingPanel
            routes={routes}
            selectedRoute={selectedRoute}
            routeStops={routeStops}
            fares={fares.filter(f => f.routeId === selectedRoute?.id)}
            onSelectRoute={selectRoute}
            startStopId={ticketStartStopId}
            destinationStopId={ticketDestinationStopId}
            onStartStopChange={setTicketStartStopId}
            onDestinationStopChange={setTicketDestinationStopId}
            onRequestTicket={() => {
              if (!selectedRoute) {
                toast.error('Please choose a route first');
                return;
              }
              if (!ticketStartStopId || !ticketDestinationStopId || ticketStartStopId === ticketDestinationStopId) {
                toast.error('Choose different start and destination stops');
                return;
              }
              setBookingOpen(true);
            }}
            open={ticketPanelOpen}
            onToggle={() => setTicketPanelOpen(prev => !prev)}
            isMobile={isMobileView}
          />
        </div>
      </div>

      <BookTicketModal
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
        route={selectedRoute}
        fares={fares.filter(f => f.routeId === selectedRoute?.id)}
        initialFromStopId={ticketStartStopId}
        initialToStopId={ticketDestinationStopId}
        onBooked={(bookedTicket) => {
          if (showHistory && bookedTicket?.ticketNumber) {
            const entry = {
              ticketNumber: bookedTicket.ticketNumber,
              routeName: selectedRoute?.name || '',
              fromStop: bookedTicket.fromStopName || '',
              toStop: bookedTicket.toStopName || '',
              amount: bookedTicket.amount ?? null,
              currency: bookedTicket.currency || 'TZS',
              bookedAt: bookedTicket.createdAt || new Date().toISOString(),
            };
            const updated = [entry, ...loadStoredTickets().filter(t => t.ticketNumber !== entry.ticketNumber)];
            saveStoredTickets(updated);
            // force TicketHistorySection to reload from localStorage
            window.dispatchEvent(new CustomEvent('zanusafiri:ticket_booked'));
          }
        }}
      />

      {showHistory && <TicketHistorySection />}

      {/* ── Bottom Footer Navigation ── */}
      <nav className="ep-footer-nav">
        <a href="/explore" className="ep-footer-link ep-footer-active">
          <ExploreIcon style={{ fontSize: 18 }} /> Explore
        </a>
        <button type="button" className="ep-footer-link" onClick={() => setSidebarTab('routes')}>
          <RouteIcon style={{ fontSize: 18 }} /> Routes
        </button>
        <button type="button" className="ep-footer-link" onClick={() => setSidebarTab('stations')}>
          <Place style={{ fontSize: 18 }} /> Stations
        </button>
        <a href="/" className="ep-footer-link">
          <HomeIcon style={{ fontSize: 18 }} /> About Us
        </a>
        <a href="/" className="ep-footer-link">
          <ContactMail style={{ fontSize: 18 }} /> Contact
        </a>
      </nav>
    </div>
  );
}

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
  ExpandMore,
  ChevronRight,
  Close,
  ArrowBack,
  PhoneAndroid,
  CreditCard,
  QrCodeScanner,
  Print,
  Shield,
  Lock,
  Refresh,
} from '@mui/icons-material';
import {
  getBusStops,
  getFares,
  getRoute,
  getRoutes,
  purchaseTicketPublic,
  purchaseTicket,
  verifyTicketQr,
} from '../services/api';
import { useAuth } from '../hooks/useAuth';

const LS_KEY = 'zanusafiri_ticket_history';

function loadStoredTickets() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveStoredTickets(list) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(list.slice(0, 50)));
  } catch {
    /* ignore */
  }
}

const DEFAULT_CENTER = [-6.165917, 39.202641];
const ROUTE_COLORS = ['#0f7a3f', '#12a150', '#18b95c', '#0b3d24', '#0d1a14', '#10B981'];

const isValidCoordinate = (lat, lng) => Number.isFinite(Number(lat)) && Number.isFinite(Number(lng));

const orderedStops = (route) =>
  [...(route?.stops || [])].sort((a, b) => (a.stopOrder ?? 0) - (b.stopOrder ?? 0));

const stopIcon = (label, background, size = 28) =>
  L.divIcon({
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
    border-radius:6px 6px 6px 2px;background:rgba(54,169,225,0.18);border:2px solid var(--primary);
    color:#1E293B;font-size:10px;font-weight:900;box-shadow:0 4px 10px rgba(31,41,55,0.16);
  ">S</span>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  popupAnchor: [0, -11],
});

const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const userIcon = L.divIcon({
  className: 'explore-user-marker',
  html: `<span style="
    width:20px;height:20px;display:flex;align-items:center;justify-content:center;
    border-radius:50%;background:#2E8BCF;border:3px solid #fff;
    box-shadow:0 0 10px rgba(46,139,207,0.6);
  "></span>`,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
  popupAnchor: [0, -13],
});

const getRoadRouteFromOsrm = async (waypoints) => {
  const unique = waypoints.filter(
    (point, index, items) =>
      index === 0 || point[0] !== items[index - 1][0] || point[1] !== items[index - 1][1]
  );
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

const PASSENGER_TYPES = [
  { key: 'student', label: 'Student', icon: School, fareField: 'studentFare' },
  { key: 'adult', label: 'Adult', icon: Person, fareField: 'adultFare' },
  { key: 'senior', label: 'Senior 70+', icon: Elderly, fareField: 'seniorFare' },
];

const MOBILE_PROVIDERS = [
  { id: 'M-Pesa', name: 'M-Pesa', color: '#e11900', prefix: 'Vodacom' },
  { id: 'Airtel Money', name: 'Airtel Money', color: '#ff0000', prefix: 'Airtel' },
  { id: 'Tigo Pesa', name: 'Tigo Pesa', color: '#003366', prefix: 'Tigo' },
  { id: 'HaloPesa', name: 'HaloPesa', color: '#ff6600', prefix: 'Halotel' },
];

const CARD_PROVIDERS = [
  { id: 'Visa', name: 'Visa' },
  { id: 'Mastercard', name: 'Mastercard' },
];

/* ── Conductor QR Verification Modal ── */
function QrVerifyModal({ open, onClose }) {
  const [tokenInput, setTokenInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  if (!open) return null;

  const handleVerify = async (e) => {
    e?.preventDefault();
    if (!tokenInput.trim()) {
      toast.error('Enter or scan a QR token');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await verifyTicketQr(tokenInput.trim());
      setResult(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed');
      setResult({
        result: 'INVALID',
        message: 'Network error or invalid code structure.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 10000 }}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
            <QrCodeScanner style={{ color: 'var(--primary)' }} /> Conductor Ticket Verification
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <Close />
          </button>
        </div>

        <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
          Scan or enter the ticket QR token to verify passenger boarding authorization.
        </p>

        <form onSubmit={handleVerify} style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <input
            className="form-input"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="Paste or scan ZANBUS QR token..."
            style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.85rem' }}
          />
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? 'Verifying...' : 'Verify'}
          </button>
        </form>

        {result && (
          <div
            style={{
              padding: 16,
              borderRadius: 14,
              border: `2px solid ${
                result.result === 'VALID'
                  ? '#12a150'
                  : result.result === 'ALREADY_USED'
                  ? '#F59E0B'
                  : '#EF4444'
              }`,
              background:
                result.result === 'VALID'
                  ? 'rgba(18,161,80,0.08)'
                  : result.result === 'ALREADY_USED'
                  ? 'rgba(245,158,11,0.08)'
                  : 'rgba(239,68,68,0.08)',
            }}
          >
            <div style={{ fontSize: '1.1rem', fontWeight: 900, marginBottom: 8, color: result.result === 'VALID' ? '#12a150' : result.result === 'ALREADY_USED' ? '#B45309' : '#DC2626' }}>
              {result.message}
            </div>

            {result.ticketNumber && (
              <div style={{ fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div><strong>Ticket Ref:</strong> {result.ticketNumber} ({result.referenceNumber})</div>
                <div><strong>Passenger:</strong> {result.passengerName} ({result.passengerType})</div>
                <div><strong>Route:</strong> {result.routeName}</div>
                {result.scannedAt && <div><strong>Scanned At:</strong> {result.scannedAt}</div>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Digital Thermal Ticket Component ── */
function ThermalTicketReceipt({ ticket, onDownload, onPrint, onClose }) {
  const ticketRef = useRef(null);
  const [qrUrl, setQrUrl] = useState('');

  useEffect(() => {
    if (!ticket) return;
    const generateQr = async () => {
      try {
        const payload = ticket.qrToken || ticket.ticketNumber;
        const url = await QRCode.toDataURL(payload, { width: 220, margin: 1 });
        setQrUrl(url);
      } catch (err) {
        console.error(err);
      }
    };
    generateQr();
  }, [ticket]);

  if (!ticket) return null;

  const fmtMoney = (val) =>
    new Intl.NumberFormat('sw-TZ', { maximumFractionDigits: 0 }).format(Number(val || 0));

  const formattedDate = ticket.createdAt
    ? new Date(ticket.createdAt).toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : new Date().toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      {/* Printable / Capturable thermal paper */}
      <div
        ref={ticketRef}
        style={{
          width: 300,
          background: '#FFFFFF',
          color: '#000000',
          padding: '24px 20px',
          boxShadow: '0 12px 30px rgba(0,0,0,0.12)',
          fontFamily: "'JetBrains Mono', 'Courier New', monospace",
          borderRadius: 8,
          border: '1px solid #E2E8F0',
        }}
      >
        <div style={{ textAlign: 'center', fontWeight: 900, fontSize: '1.5rem', letterSpacing: '0.1em' }}>
          ZAN BUS
        </div>
        <div style={{ textAlign: 'center', fontSize: '0.7rem', fontWeight: 700, color: '#475569' }}>
          OFFICIAL PASSENGER RECEIPT
        </div>

        <div style={{ textAlign: 'center', margin: '8px 0', fontSize: '0.75rem', fontWeight: 'bold' }}>
          ==========================
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: '0.78rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Ticket No:</span>
            <strong>{ticket.ticketNumber}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Ref No:</span>
            <strong>{ticket.referenceNumber}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Date &amp; Time:</span>
            <span>{formattedDate}</span>
          </div>
        </div>

        <div style={{ textAlign: 'center', margin: '8px 0', fontSize: '0.75rem', fontWeight: 'bold' }}>
          --------------------------
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: '0.78rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Passenger:</span>
            <strong>{ticket.passengerName}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Phone:</span>
            <span>{ticket.passengerPhone || 'N/A'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Category:</span>
            <strong>{ticket.passengerType}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Route:</span>
            <strong>{ticket.routeName}</strong>
          </div>
        </div>

        <div style={{ textAlign: 'center', margin: '8px 0', fontSize: '0.75rem', fontWeight: 'bold' }}>
          --------------------------
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: '0.78rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Payment Method:</span>
            <span>{ticket.paymentMethod} ({ticket.paymentProvider})</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Txn Ref:</span>
            <span style={{ fontSize: '0.7rem' }}>{ticket.transactionReference}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: '0.9rem' }}>
            <strong>FARE PAID:</strong>
            <strong style={{ color: 'var(--primary)' }}>TSh {fmtMoney(ticket.amount)}</strong>
          </div>
        </div>

        <div style={{ textAlign: 'center', margin: '10px 0 4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
          ==========================
        </div>

        {/* QR Code */}
        {qrUrl ? (
          <div style={{ textAlign: 'center', margin: '8px 0' }}>
            <img src={qrUrl} alt="Ticket QR" style={{ width: 170, height: 170, imageRendering: 'pixelated' }} />
            <div style={{ fontSize: '0.68rem', fontWeight: 800, marginTop: 4, color: '#0f7a3f' }}>
              Scan this ticket when boarding the bus
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 20 }}>Generating QR...</div>
        )}

        <div style={{ textAlign: 'center', fontSize: '0.65rem', color: '#64748B', marginTop: 8 }}>
          ZanUsafiri Transit Authority &bull; Safe Journey!
        </div>
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 10, width: '100%', maxWidth: 300 }}>
        <button
          className="ep-tp-btn-ghost"
          style={{ flex: 1 }}
          onClick={() => onPrint?.(ticketRef.current)}
        >
          <Print style={{ fontSize: 16 }} /> Print
        </button>
        <button
          className="ep-tp-btn-primary"
          style={{ flex: 1.5 }}
          onClick={() => onDownload?.(ticketRef.current, ticket.ticketNumber)}
        >
          <DownloadIcon style={{ fontSize: 16 }} /> Download PDF
        </button>
      </div>
    </div>
  );
}

/* ── Inline Ticket History ── */
function TicketHistorySection({ onSelectTicket }) {
  const [tickets, setTickets] = useState(loadStoredTickets);

  useEffect(() => {
    const handler = () => setTickets(loadStoredTickets());
    window.addEventListener('zanusafiri:ticket_booked', handler);
    return () => window.removeEventListener('zanusafiri:ticket_booked', handler);
  }, []);

  const removeTicket = (ticketNumber) => {
    setTickets((prev) => {
      const updated = prev.filter((t) => t.ticketNumber !== ticketNumber);
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

  const fmtMoney = (amount) =>
    new Intl.NumberFormat('sw-TZ', { style: 'currency', currency: 'TZS', maximumFractionDigits: 0 }).format(amount);

  const fmtDate = (iso) =>
    iso
      ? new Date(iso).toLocaleString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '—';

  return (
    <div style={{ marginTop: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <History style={{ color: 'var(--primary)' }} />
          Your Digital Ticket Receipts
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              background: 'var(--primary-tint-strong)',
              color: 'var(--primary)',
              padding: '2px 10px',
              borderRadius: 999,
            }}
          >
            {tickets.length}
          </span>
        </h3>
        <button
          type="button"
          className="btn btn-ghost"
          style={{ fontSize: '0.78rem', padding: '6px 12px', color: 'var(--danger)' }}
          onClick={clearAll}
        >
          <DeleteOutlined style={{ fontSize: 16 }} /> Clear All
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
        {tickets.map((t) => (
          <div
            key={t.ticketNumber}
            style={{
              borderRadius: 14,
              background: 'var(--bg-card)',
              border: '1px solid rgba(57,181,74,0.18)',
              boxShadow: '0 2px 10px rgba(31,41,55,0.06)',
              overflow: 'hidden',
            }}
          >
            <div style={{ height: 3, background: 'linear-gradient(90deg, #12a150, #0b3d24)' }} />
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
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 3 }}>{fmtDate(t.createdAt || t.bookedAt)}</div>
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

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed var(--border)', paddingTop: 10 }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{
                    fontSize: '0.75rem',
                    padding: '6px 12px',
                    height: 'auto',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    border: '1px solid rgba(57,181,74,0.3)',
                    color: 'var(--primary)',
                    background: 'rgba(57,181,74,0.04)',
                    borderRadius: 8,
                    fontWeight: 700,
                  }}
                  onClick={() => onSelectTicket(t)}
                >
                  <ConfirmationNumber style={{ fontSize: 14 }} /> View Receipt
                </button>
                {t.amount && (
                  <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                    {fmtMoney(t.amount)}
                  </span>
                )}
              </div>
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
  const showHistory = !isAdmin && !isStaff;

  const [stations, setStations] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [highlightStationId, setHighlightStationId] = useState(null);
  const [routeLine, setRouteLine] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Ticket Panel Flow: 1 ('select') | 2 ('details') | 3 ('payment') | 4 ('receipt')
  const [ticketPanelOpen, setTicketPanelOpen] = useState(false);
  const [purchaseStep, setPurchaseStep] = useState(1);
  const [ticketPassengerType, setTicketPassengerType] = useState('adult');

  // Step 3 details
  const [passengerName, setPassengerName] = useState('');
  const [passengerPhone, setPassengerPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');

  // Step 4 payment details
  const [paymentMethod, setPaymentMethod] = useState('MOBILE_MONEY');
  const [paymentProvider, setPaymentProvider] = useState('M-Pesa');
  const [paymentPhone, setPaymentPhone] = useState('');
  // Bank card fields
  const [cardHolder, setCardHolder] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  // Real payment simulation states: 'idle' | 'initiating' | 'waiting_ussd' | 'processing' | 'success' | 'failed'
  const [paymentSimulationState, setPaymentSimulationState] = useState('idle');
  const [simulationMessage, setSimulationMessage] = useState('');

  // Step 5 created ticket
  const [createdTicket, setCreatedTicket] = useState(null);

  // Conductor verify modal
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);

  const [isMobileView, setIsMobileView] = useState(false);
  const [sidebarTab, setSidebarTab] = useState('routes');
  const [userLocation, setUserLocation] = useState(null);
  const [isScanning, setIsScanning] = useState(false);

  const scanLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    setIsScanning(true);
    const toastId = toast.loading('Scanning location...');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        let placeName = 'Unknown Area';
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          if (res.ok) {
            const data = await res.json();
            placeName =
              data.address?.suburb ||
              data.address?.neighbourhood ||
              data.address?.city ||
              data.display_name.split(',')[0] ||
              'Unknown Area';
          }
        } catch {
          /* ignore */
        }
        setUserLocation({ lat: latitude, lng: longitude, accuracy, name: placeName });
        toast.success('Location found! Nearby stations sorted.', { id: toastId });
        setIsScanning(false);
        setSidebarTab('stations');
      },
      () => {
        toast.error('Location access denied or unavailable.', { id: toastId });
        setIsScanning(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  useEffect(() => {
    let mounted = true;
    if (mounted) scanLocation();
    return () => {
      mounted = false;
    };
  }, [scanLocation]);

  const routeStops = useMemo(() => orderedStops(selectedRoute), [selectedRoute]);

  const nearestStop = useMemo(() => {
    if (!userLocation) return null;
    const pool =
      selectedRoute && routeStops.length > 0
        ? routeStops.map((s) => ({ id: s.stopId, name: s.stopName, latitude: s.latitude, longitude: s.longitude }))
        : stations;
    if (pool.length === 0) return null;
    let closest = null;
    let minD = Infinity;
    pool.forEach((s) => {
      if (isValidCoordinate(s.latitude, s.longitude)) {
        const d = haversineDistance(userLocation.lat, userLocation.lng, Number(s.latitude), Number(s.longitude));
        if (d < minD) {
          minD = d;
          closest = { ...s, distance: d };
        }
      }
    });
    return closest;
  }, [userLocation, selectedRoute, routeStops, stations]);

  const routeTotalDistance = useMemo(() => {
    if (!routeLine || routeLine.length < 2) return 0;
    let dist = 0;
    for (let i = 0; i < routeLine.length - 1; i++) {
      dist += haversineDistance(routeLine[i][0], routeLine[i][1], routeLine[i + 1][0], routeLine[i + 1][1]);
    }
    return dist;
  }, [routeLine]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [stopsRes, routesRes] = await Promise.all([getBusStops(), getRoutes()]);
      const routeList = (routesRes.data || []).filter((r) => r.status === 'ACTIVE');
      setStations(stopsRes.data || []);
      setRoutes(routeList);
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

  const routeColor = useMemo(() => {
    if (!selectedRoute) return ROUTE_COLORS[0];
    const index = routes.findIndex((r) => r.id === selectedRoute.id);
    return ROUTE_COLORS[(index >= 0 ? index : 0) % ROUTE_COLORS.length];
  }, [selectedRoute, routes]);

  const stopPositions = useMemo(
    () =>
      routeStops
        .filter((stop) => isValidCoordinate(stop.latitude, stop.longitude))
        .map((stop) => [Number(stop.latitude), Number(stop.longitude)]),
    [routeStops]
  );

  useEffect(() => {
    if (!stopPositions.length) {
      queueMicrotask(() => setRouteLine([]));
      return;
    }
    let cancelled = false;
    getRoadRouteFromOsrm(stopPositions)
      .then((line) => {
        if (!cancelled) setRouteLine(line.length ? line : stopPositions);
      })
      .catch(() => {
        if (!cancelled) setRouteLine(stopPositions);
      });
    return () => {
      cancelled = true;
    };
  }, [stopPositions]);

  const filteredStations = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = stations;
    if (q) {
      result = stations.filter(
        (s) =>
          s.name?.toLowerCase().includes(q) ||
          (s.address || '').toLowerCase().includes(q) ||
          (s.stopCode || '').toLowerCase().includes(q)
      );
    }
    if (userLocation) {
      return [...result].sort((a, b) => {
        const dA = isValidCoordinate(a.latitude, a.longitude)
          ? haversineDistance(userLocation.lat, userLocation.lng, a.latitude, a.longitude)
          : Infinity;
        const dB = isValidCoordinate(b.latitude, b.longitude)
          ? haversineDistance(userLocation.lat, userLocation.lng, b.latitude, b.longitude)
          : Infinity;
        return dA - dB;
      });
    }
    return result;
  }, [stations, search, userLocation]);

  const filteredRoutes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return routes;
    return routes.filter(
      (r) =>
        r.name?.toLowerCase().includes(q) ||
        (r.startPoint || '').toLowerCase().includes(q) ||
        (r.endPoint || '').toLowerCase().includes(q)
    );
  }, [routes, search]);

  const mapBounds = useMemo(() => {
    if (selectedRoute && stopPositions.length) return stopPositions;
    const stationPositions = stations
      .filter((s) => isValidCoordinate(s.latitude, s.longitude))
      .map((s) => [Number(s.latitude), Number(s.longitude)]);
    return stationPositions.length ? stationPositions : [DEFAULT_CENTER];
  }, [selectedRoute, stopPositions, stations]);

  // Current calculated fare from selected route + passenger type
  const activeFareInfo = useMemo(() => {
    if (!selectedRoute) return null;
    const passMeta = PASSENGER_TYPES.find((p) => p.key === ticketPassengerType);
    if (!passMeta) return null;
    const amount = selectedRoute[passMeta.fareField];
    return {
      type: passMeta,
      amount: amount != null ? Number(amount) : null,
    };
  }, [selectedRoute, ticketPassengerType]);

  // Handle open Buy Ticket panel
  const handleOpenBuyTicket = (routeToSelect = null) => {
    if (routeToSelect) {
      selectRoute(routeToSelect);
    } else if (!selectedRoute && routes.length > 0) {
      selectRoute(routes[0]);
    }
    setPurchaseStep(1);
    setTicketPanelOpen(true);
  };

  // Step 3 Validation & Continue
  const handleDetailsContinue = () => {
    const cleanName = passengerName.trim();
    const cleanPhone = passengerPhone.trim();
    if (!cleanName) {
      toast.error('Passenger full name is required');
      return;
    }
    if (!cleanPhone || cleanPhone.length < 9) {
      setPhoneError('Please enter a valid Tanzania phone number');
      toast.error('Valid phone number required');
      return;
    }
    setPhoneError('');
    setPaymentPhone(cleanPhone);
    setPurchaseStep(3); // Go to Payment step
  };

  // Step 4 Real Payment Processing Simulation & Server Call
  const handleProcessPayment = async () => {
    if (!selectedRoute || !activeFareInfo || activeFareInfo.amount == null) {
      toast.error('Invalid fare selection');
      return;
    }

    if (paymentMethod === 'MOBILE_MONEY') {
      if (!paymentPhone || paymentPhone.length < 9) {
        toast.error('Valid mobile money phone number is required');
        return;
      }
    } else {
      if (!cardHolder.trim() || !cardNumber.trim() || !cardExpiry.trim() || !cardCvv.trim()) {
        toast.error('Please complete all bank card fields');
        return;
      }
    }

    setPaymentSimulationState('initiating');
    setSimulationMessage(`Initiating ${paymentProvider} transaction...`);

    try {
      // Step 1: Simulated network delay for USSD prompt / Card auth
      await new Promise((r) => setTimeout(r, 1200));

      if (paymentMethod === 'MOBILE_MONEY') {
        setPaymentSimulationState('waiting_ussd');
        setSimulationMessage(`USSD prompt sent to +255 ${paymentPhone}. Waiting for PIN approval...`);
        await new Promise((r) => setTimeout(r, 2000));
      } else {
        setPaymentSimulationState('processing');
        setSimulationMessage('Verifying 3D Secure card payment with bank...');
        await new Promise((r) => setTimeout(r, 1800));
      }

      // Step 2: Call backend API to create real paid ticket
      const txRef = `TXN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const payload = {
        routeId: selectedRoute.id,
        passengerType: ticketPassengerType.toUpperCase(),
        passengerName: passengerName.trim(),
        passengerPhone: passengerPhone.trim(),
        paymentMethod: paymentMethod,
        paymentProvider: paymentProvider,
        transactionReference: txRef,
      };

      const res = user
        ? await purchaseTicket(payload)
        : await purchaseTicketPublic(payload);

      const ticketData = res.data;

      setPaymentSimulationState('success');
      setSimulationMessage('Payment confirmed! Ticket generated.');
      setCreatedTicket(ticketData);

      // Save to local storage history
      const localEntry = {
        ticketNumber: ticketData.ticketNumber,
        referenceNumber: ticketData.referenceNumber,
        routeName: selectedRoute.name,
        amount: ticketData.amount,
        passengerType: ticketPassengerType,
        createdAt: ticketData.createdAt || new Date().toISOString(),
        qrToken: ticketData.qrToken,
      };
      saveStoredTickets([localEntry, ...loadStoredTickets().filter((x) => x.ticketNumber !== localEntry.ticketNumber)]);
      window.dispatchEvent(new CustomEvent('zanusafiri:ticket_booked'));

      toast.success('Payment successful! Digital ticket issued.');
      setPurchaseStep(4); // Advance to Step 5 (Receipt)
    } catch (err) {
      setPaymentSimulationState('failed');
      setSimulationMessage(err.response?.data?.message || 'Payment processing failed');
      toast.error(err.response?.data?.message || 'Payment failed');
    }
  };

  // Download PDF ticket
  const handleDownloadPdf = async (element, ticketNo) => {
    if (!element) return;
    try {
      const canvas = await html2canvas(element, { scale: 3, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdfWidth = 80;
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [pdfWidth, pdfHeight] });
      doc.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      doc.save(`ZANBUS-Ticket-${ticketNo}.pdf`);
      toast.success('Ticket receipt downloaded');
    } catch (err) {
      console.error(err);
      toast.error('Failed to download PDF ticket');
    }
  };

  // Print ticket
  const handlePrintTicket = (element) => {
    if (!element) return;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head><title>Print ZAN BUS Ticket</title></head>
        <body style="display:flex;justify-content:center;align-items:center;padding:20px;font-family:sans-serif;">
          ${element.outerHTML}
          <script>window.print(); setTimeout(() => window.close(), 500);</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const fmtMoney = (val) =>
    val != null
      ? new Intl.NumberFormat('sw-TZ', { maximumFractionDigits: 0 }).format(Number(val))
      : '—';

  return (
    <div className="ep-wrapper">
      {/* ── Top Explorer Header ── */}
      <div className="ep-header">
        <div className="ep-header-left">
          <h2 className="ep-title">
            <MapIcon style={{ color: 'var(--primary)' }} />
            Explore Routes &amp; Stations
          </h2>
          <p className="ep-subtitle">
            View stations, select transit routes, and directly buy digital bus tickets with secure instant payment.
          </p>
        </div>
        <div className="ep-header-right">
          {/* Conductor Scanner trigger */}
          <button
            className="btn btn-ghost"
            style={{ border: '1.5px solid var(--primary)', color: 'var(--primary)', fontWeight: 800 }}
            onClick={() => setVerifyModalOpen(true)}
          >
            <QrCodeScanner style={{ fontSize: 18 }} /> Conductors Verify Ticket
          </button>

          {selectedRoute && (
            <div className="ep-top-route-fares">
              <div className="ep-top-route-name">
                <RouteIcon style={{ fontSize: 16, color: '#12a150' }} /> {selectedRoute.name}
              </div>
              <div className="ep-top-fares-list">
                <div className="ep-top-fare-item student">
                  <span className="ep-fare-label">Student</span>
                  <strong className="ep-fare-val">{selectedRoute.studentFare != null ? fmtMoney(selectedRoute.studentFare) : '—'} TZS</strong>
                </div>
                <div className="ep-top-fare-item adult">
                  <span className="ep-fare-label">Adult</span>
                  <strong className="ep-fare-val">{selectedRoute.adultFare != null ? fmtMoney(selectedRoute.adultFare) : '—'} TZS</strong>
                </div>
                <div className="ep-top-fare-item senior">
                  <span className="ep-fare-label">Senior 70+</span>
                  <strong className="ep-fare-val">{selectedRoute.seniorFare != null ? fmtMoney(selectedRoute.seniorFare) : '—'} TZS</strong>
                </div>
              </div>
            </div>
          )}

          {userLocation && (
            <div className="ep-top-location">
              <div className="ep-loc-icon">
                <Place style={{ color: '#12a150', fontSize: 20 }} />
              </div>
              <div>
                <div className="ep-loc-label">You are here</div>
                <div className="ep-loc-val">{userLocation.name}</div>
                <div className="ep-loc-acc">Accurate to {Math.round(userLocation.accuracy)}m</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Main Responsive Grid Layout ── */}
      <div className={`explore-layout${ticketPanelOpen ? ' ticket-panel-open' : ''}`}>
        {/* Left Sidebar */}
        <aside className="ep-sidebar">
          <div className="ep-sidebar-main">
            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search
                  style={{
                    position: 'absolute',
                    left: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-secondary)',
                    fontSize: 18,
                  }}
                />
                <input
                  className="form-input"
                  style={{ paddingLeft: 34, width: '100%' }}
                  placeholder="Search stations or routes..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <button
                type="button"
                onClick={scanLocation}
                disabled={isScanning}
                className="btn btn-primary"
                style={{ padding: '0 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                title="Scan Current Location"
              >
                <ExploreIcon style={{ fontSize: 18 }} />
                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{isScanning ? '...' : 'Scan'}</span>
              </button>
            </div>

            <div className="explore-tabs">
              <button
                type="button"
                className={`explore-tab ${sidebarTab === 'routes' ? 'active' : ''}`}
                onClick={() => setSidebarTab('routes')}
              >
                <RouteIcon fontSize="small" /> Routes ({filteredRoutes.length})
              </button>
              <button
                type="button"
                className={`explore-tab ${sidebarTab === 'stations' ? 'active' : ''}`}
                onClick={() => setSidebarTab('stations')}
              >
                <Place fontSize="small" /> Stations ({filteredStations.length})
              </button>
            </div>

            {loading ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)' }}>Loading transit data...</div>
            ) : sidebarTab === 'routes' ? (
              <div className="explore-list">
                {filteredRoutes.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', padding: 12 }}>No active routes found.</p>
                ) : (
                  filteredRoutes.map((route) => {
                    const isExpanded = selectedRoute?.id === route.id;
                    return (
                      <div key={route.id} className={`ep-route-accordion ${isExpanded ? 'expanded' : ''}`}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <button
                            type="button"
                            className="ep-route-accordion-header"
                            style={{ flex: 1 }}
                            onClick={() => selectRoute(route)}
                          >
                            <span className="ep-route-accordion-chevron">
                              {isExpanded ? <ExpandMore style={{ fontSize: 18 }} /> : <ChevronRight style={{ fontSize: 18 }} />}
                            </span>
                            <div className="ep-route-accordion-info">
                              <div className="ep-route-accordion-name">{route.name}</div>
                              <div className="ep-route-accordion-sub">
                                {(route.stops?.length || 0)} stops &bull; Adult: {route.adultFare ? fmtMoney(route.adultFare) : '—'} TZS
                              </div>
                            </div>
                          </button>

                          {/* Instant Buy Ticket button on route item */}
                          <button
                            type="button"
                            className="btn btn-primary"
                            style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: 8, fontWeight: 800 }}
                            onClick={() => handleOpenBuyTicket(route)}
                          >
                            Buy Ticket
                          </button>
                        </div>

                        {isExpanded && (
                          <div className="ep-route-accordion-stops">
                            {routeStops.map((stop, index) => {
                              const d =
                                userLocation && isValidCoordinate(stop.latitude, stop.longitude)
                                  ? haversineDistance(userLocation.lat, userLocation.lng, stop.latitude, stop.longitude).toFixed(1)
                                  : null;
                              return (
                                <div key={stop.id || stop.stopId} className="ep-route-stop-row">
                                  <span className="ep-route-stop-dot" style={{ background: routeColor }}>
                                    {stop.stopOrder ?? index + 1}
                                  </span>
                                  <div className="ep-route-stop-label">
                                    <div>{stop.stopName}</div>
                                    {d && <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{d} km from you</div>}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              <div className="explore-list">
                {filteredStations.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', padding: 12 }}>No stations found.</p>
                ) : (
                  filteredStations.map((station) => {
                    const d =
                      userLocation && isValidCoordinate(station.latitude, station.longitude)
                        ? haversineDistance(userLocation.lat, userLocation.lng, station.latitude, station.longitude).toFixed(1)
                        : null;
                    return (
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
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                          {station.address || 'Zanzibar'}
                        </div>
                        {d && <div style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: 4, fontWeight: 700 }}>{d} km from you</div>}
                      </button>
                    );
                  })
                )}
              </div>
            )}

            {/* Bottom action button */}
            <div className="ep-sidebar-ticket-btn-wrap">
              <button
                className="ep-ticket-btn"
                type="button"
                style={{
                  background: 'linear-gradient(135deg, #12a150 0%, #0b3d24 100%)',
                  boxShadow: '0 4px 14px rgba(18, 161, 80, 0.3)',
                  fontWeight: 900,
                  fontSize: '0.95rem',
                }}
                onClick={() => handleOpenBuyTicket()}
              >
                <ConfirmationNumber style={{ fontSize: 18 }} /> Buy Ticket
              </button>
            </div>
          </div>

          <div className="ep-sidebar-bottom">
            <button type="button" className="ep-home-btn" onClick={() => (isAdmin ? navigate('/dashboard') : navigate(-1))}>
              <HomeIcon style={{ fontSize: 18 }} /> Back Home
            </button>
          </div>
        </aside>

        {/* ── Dynamic Multi-Step Ticket Purchase Panel ── */}
        {ticketPanelOpen && (
          <div className="ep-ticket-panel">
            {/* Panel Top Header with step navigation */}
            <div className="ep-tp-header">
              {purchaseStep > 1 && purchaseStep < 4 && (
                <button className="ep-tp-back" onClick={() => setPurchaseStep((s) => s - 1)} title="Back">
                  <ArrowBack style={{ fontSize: 18 }} />
                </button>
              )}
              <span className="ep-tp-title">
                {purchaseStep === 1
                  ? '💳 Buy Ticket'
                  : purchaseStep === 2
                  ? '📋 Passenger Details'
                  : purchaseStep === 3
                  ? '🔒 Select Payment'
                  : '🎟️ Digital Ticket Receipt'}
              </span>
              <button
                className="ep-tp-close"
                onClick={() => {
                  setTicketPanelOpen(false);
                  setPurchaseStep(1);
                  setPaymentSimulationState('idle');
                }}
                title="Close"
              >
                <Close style={{ fontSize: 18 }} />
              </button>
            </div>

            {/* Stepper progress bar */}
            <div className="ep-tp-steps">
              {[
                { step: 1, label: 'Route' },
                { step: 2, label: 'Details' },
                { step: 3, label: 'Payment' },
                { step: 4, label: 'Ticket' },
              ].map(({ step, label }) => (
                <div
                  key={step}
                  className={`ep-tp-step ${
                    purchaseStep === step ? 'active' : purchaseStep > step ? 'done' : ''
                  }`}
                >
                  <span className="ep-tp-step-dot">{purchaseStep > step ? '✓' : step}</span>
                  <span className="ep-tp-step-label">{label}</span>
                </div>
              ))}
            </div>

            {/* Panel Body */}
            <div className="ep-tp-body">
              {/* ── STEP 1: Select Route & Passenger Type ── */}
              {purchaseStep === 1 && (
                <div className="ep-tp-section">
                  <label className="ep-tp-label">1. Select Route</label>
                  <select
                    className="form-input"
                    style={{ fontWeight: 700, marginBottom: 14 }}
                    value={selectedRoute?.id ? String(selectedRoute.id) : ''}
                    onChange={(e) => {
                      const r = routes.find((x) => String(x.id) === e.target.value);
                      if (r) selectRoute(r);
                    }}
                  >
                    <option value="">Choose a route…</option>
                    {routes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>

                  <label className="ep-tp-label">2. Select Passenger Type</label>
                  <div className="ep-tp-pax-grid" style={{ marginBottom: 14 }}>
                    {PASSENGER_TYPES.map(({ key, label, icon: Icon, fareField }) => {
                      const isAct = ticketPassengerType === key;
                      const rf = selectedRoute ? selectedRoute[fareField] : null;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setTicketPassengerType(key)}
                          className={`ep-tp-pax-card${isAct ? ' active' : ''}`}
                        >
                          <Icon style={{ fontSize: 24 }} />
                          <span className="ep-tp-pax-label">{label}</span>
                          {rf != null ? (
                            <span className="ep-tp-pax-fare">{fmtMoney(rf)} TZS</span>
                          ) : (
                            <span style={{ fontSize: '0.6rem', color: '#94A3B8' }}>Unconfigured</span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Fare Display Box */}
                  <div className={`ep-tp-fare-box${activeFareInfo?.amount != null ? ' has-fare' : ''}`}>
                    <div className="ep-tp-fare-label">TICKET FARE</div>
                    {activeFareInfo?.amount != null ? (
                      <>
                        <div className="ep-tp-fare-amount">TSh {fmtMoney(activeFareInfo.amount)}</div>
                        <div className="ep-tp-fare-sub">
                          Route: <strong>{selectedRoute?.name}</strong> &bull; Passenger:{' '}
                          <strong>{activeFareInfo.type.label.toUpperCase()}</strong>
                        </div>
                      </>
                    ) : (
                      <div className="ep-tp-fare-empty" style={{ color: selectedRoute ? '#DC2626' : '#94A3B8' }}>
                        {selectedRoute
                          ? 'This fare has not been configured. Please select another route or contact administrator.'
                          : 'Select a route to display passenger fare.'}
                      </div>
                    )}
                  </div>

                  <button
                    className="ep-tp-btn-primary"
                    disabled={!selectedRoute || activeFareInfo?.amount == null}
                    onClick={() => setPurchaseStep(2)}
                    style={{ marginTop: 16 }}
                  >
                    Continue <ArrowForward style={{ fontSize: 18 }} />
                  </button>

                  <div className="ep-tp-info-note" style={{ marginTop: 12 }}>
                    <InfoIcon style={{ fontSize: 15, color: '#36A9E1' }} />
                    <span>Fares are validated server-side. Once purchased, your ticket contains a scannable QR code for bus conductors.</span>
                  </div>
                </div>
              )}

              {/* ── STEP 2: Enter Passenger Details ── */}
              {purchaseStep === 2 && (
                <div className="ep-tp-section">
                  {/* Selected Ticket Summary Box */}
                  <div className="ep-tp-summary-box">
                    <div className="ep-tp-summary-title">Selected Ticket Summary</div>
                    <div className="ep-tp-summary-row">
                      <span>Route</span>
                      <strong>{selectedRoute?.name}</strong>
                    </div>
                    <div className="ep-tp-summary-row">
                      <span>Passenger Type</span>
                      <strong>{activeFareInfo?.type.label.toUpperCase()}</strong>
                    </div>
                    <div className="ep-tp-summary-row">
                      <span>Ticket Fare</span>
                      <strong style={{ color: 'var(--primary)' }}>TSh {fmtMoney(activeFareInfo?.amount)}</strong>
                    </div>
                  </div>

                  <label className="ep-tp-label" style={{ marginTop: 14 }}>
                    Passenger Information
                  </label>

                  <div className="ep-tp-field">
                    <label className="form-label">Full Name *</label>
                    <input
                      className="form-input"
                      value={passengerName}
                      onChange={(e) => setPassengerName(e.target.value)}
                      placeholder="Enter passenger name"
                    />
                  </div>

                  <div className="ep-tp-field">
                    <label className="form-label">Phone Number *</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <span
                        style={{
                          padding: '10px 12px',
                          background: '#F1F5F9',
                          border: '1.5px solid #CBD5E1',
                          borderRadius: 10,
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          color: '#334155',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        +255
                      </span>
                      <input
                        className="form-input"
                        style={{ flex: 1 }}
                        value={passengerPhone}
                        onChange={(e) => setPassengerPhone(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="7XX XXX XXX"
                        maxLength={10}
                      />
                    </div>
                    {phoneError && <span style={{ color: '#DC2626', fontSize: '0.72rem', fontWeight: 600 }}>{phoneError}</span>}
                  </div>

                  <div className="ep-tp-info-note" style={{ marginTop: 8 }}>
                    <InfoIcon style={{ fontSize: 15, color: '#36A9E1' }} />
                    <span>Payment confirmation and your ticket receipt will be sent to this phone number.</span>
                  </div>

                  <button
                    className="ep-tp-btn-primary"
                    onClick={handleDetailsContinue}
                    style={{ marginTop: 16 }}
                  >
                    Continue to Payment <ArrowForward style={{ fontSize: 18 }} />
                  </button>
                </div>
              )}

              {/* ── STEP 3: Select Payment Method ── */}
              {purchaseStep === 3 && (
                <div className="ep-tp-section">
                  {/* Passenger & Ticket Review Box */}
                  <div className="ep-tp-review-card" style={{ marginBottom: 14 }}>
                    <div className="ep-tp-review-row">
                      <span>Passenger</span>
                      <strong>{passengerName}</strong>
                    </div>
                    <div className="ep-tp-review-row">
                      <span>Phone</span>
                      <strong>+255 {passengerPhone}</strong>
                    </div>
                    <div className="ep-tp-review-row">
                      <span>Route</span>
                      <strong>{selectedRoute?.name}</strong>
                    </div>
                    <div className="ep-tp-review-row">
                      <span>Passenger Type</span>
                      <strong>{activeFareInfo?.type.label.toUpperCase()}</strong>
                    </div>
                    <div className="ep-tp-review-row ep-tp-review-total">
                      <span>Total Amount</span>
                      <strong>TSh {fmtMoney(activeFareInfo?.amount)}</strong>
                    </div>
                  </div>

                  <label className="ep-tp-label">Select Payment Method</label>

                  {/* Payment Method Selector Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentMethod('MOBILE_MONEY');
                        setPaymentProvider('M-Pesa');
                      }}
                      style={{
                        padding: 12,
                        borderRadius: 12,
                        border: paymentMethod === 'MOBILE_MONEY' ? '2px solid var(--primary)' : '1.5px solid #CBD5E1',
                        background: paymentMethod === 'MOBILE_MONEY' ? 'rgba(18,161,80,0.08)' : '#F8FAFC',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <PhoneAndroid style={{ color: paymentMethod === 'MOBILE_MONEY' ? 'var(--primary)' : '#64748B' }} />
                      <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>Mobile Money</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPaymentMethod('BANK_CARD');
                        setPaymentProvider('Visa');
                      }}
                      style={{
                        padding: 12,
                        borderRadius: 12,
                        border: paymentMethod === 'BANK_CARD' ? '2px solid var(--primary)' : '1.5px solid #CBD5E1',
                        background: paymentMethod === 'BANK_CARD' ? 'rgba(18,161,80,0.08)' : '#F8FAFC',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <CreditCard style={{ color: paymentMethod === 'BANK_CARD' ? 'var(--primary)' : '#64748B' }} />
                      <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>Bank Card</span>
                    </button>
                  </div>

                  {/* Mobile Money Options */}
                  {paymentMethod === 'MOBILE_MONEY' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <label className="form-label">Provider</label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
                        {MOBILE_PROVIDERS.map((prov) => (
                          <button
                            key={prov.id}
                            type="button"
                            onClick={() => setPaymentProvider(prov.id)}
                            style={{
                              padding: '8px 4px',
                              borderRadius: 8,
                              border: paymentProvider === prov.id ? `2px solid ${prov.color}` : '1px solid #E2E8F0',
                              background: paymentProvider === prov.id ? `${prov.color}15` : '#FFF',
                              fontWeight: 800,
                              fontSize: '0.65rem',
                              color: paymentProvider === prov.id ? prov.color : '#475569',
                              cursor: 'pointer',
                            }}
                          >
                            {prov.name}
                          </button>
                        ))}
                      </div>

                      <div className="ep-tp-field">
                        <label className="form-label">Mobile Money Phone Number</label>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <span
                            style={{
                              padding: '10px 12px',
                              background: '#F1F5F9',
                              border: '1.5px solid #CBD5E1',
                              borderRadius: 10,
                              fontWeight: 700,
                              fontSize: '0.85rem',
                            }}
                          >
                            +255
                          </span>
                          <input
                            className="form-input"
                            style={{ flex: 1 }}
                            value={paymentPhone}
                            onChange={(e) => setPaymentPhone(e.target.value.replace(/[^0-9]/g, ''))}
                            placeholder="7XX XXX XXX"
                          />
                        </div>
                        <span style={{ fontSize: '0.7rem', color: '#64748B' }}>
                          Payment prompt will be sent to this mobile number.
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Bank Card Options */}
                  {paymentMethod === 'BANK_CARD' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <label className="form-label">Card Provider</label>
                      <div style={{ display: 'flex', gap: 10, marginBottom: 6 }}>
                        {CARD_PROVIDERS.map((prov) => (
                          <button
                            key={prov.id}
                            type="button"
                            onClick={() => setPaymentProvider(prov.id)}
                            style={{
                              flex: 1,
                              padding: '8px',
                              borderRadius: 8,
                              border: paymentProvider === prov.id ? '2px solid var(--primary)' : '1px solid #CBD5E1',
                              background: paymentProvider === prov.id ? 'rgba(18,161,80,0.1)' : '#FFF',
                              fontWeight: 800,
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                            }}
                          >
                            {prov.name}
                          </button>
                        ))}
                      </div>

                      <div className="ep-tp-field">
                        <label className="form-label">Cardholder Name</label>
                        <input
                          className="form-input"
                          value={cardHolder}
                          onChange={(e) => setCardHolder(e.target.value)}
                          placeholder="e.g. AMANI JUMA"
                        />
                      </div>

                      <div className="ep-tp-field">
                        <label className="form-label">Card Number</label>
                        <input
                          className="form-input"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                          placeholder="4532 &bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull; 8921"
                          maxLength={19}
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div className="ep-tp-field">
                          <label className="form-label">Expiry (MM/YY)</label>
                          <input
                            className="form-input"
                            value={cardExpiry}
                            onChange={(e) => setCardExpiry(e.target.value)}
                            placeholder="08/28"
                            maxLength={5}
                          />
                        </div>
                        <div className="ep-tp-field">
                          <label className="form-label">CVV</label>
                          <input
                            className="form-input"
                            type="password"
                            value={cardCvv}
                            onChange={(e) => setCardCvv(e.target.value)}
                            placeholder="123"
                            maxLength={4}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', color: '#64748B' }}>
                        <Lock style={{ fontSize: 14, color: 'var(--primary)' }} /> 256-bit Encrypted. Card details are never saved raw.
                      </div>
                    </div>
                  )}

                  {/* Payment Status / Processing Box */}
                  {paymentSimulationState !== 'idle' && (
                    <div
                      style={{
                        marginTop: 14,
                        padding: 12,
                        borderRadius: 12,
                        background:
                          paymentSimulationState === 'failed' ? 'rgba(239,68,68,0.1)' : 'rgba(54,169,225,0.1)',
                        border: `1px solid ${
                          paymentSimulationState === 'failed' ? '#EF4444' : '#36A9E1'
                        }`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                      }}
                    >
                      {paymentSimulationState !== 'failed' && (
                        <span
                          style={{
                            width: 18,
                            height: 18,
                            border: '2.5px solid var(--primary)',
                            borderTopColor: 'transparent',
                            borderRadius: '50%',
                            animation: 'spin 0.8s linear infinite',
                            display: 'inline-block',
                            flexShrink: 0,
                          }}
                        />
                      )}
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0F172A' }}>
                        {simulationMessage}
                      </span>
                    </div>
                  )}

                  <button
                    className="ep-tp-btn-primary"
                    style={{ marginTop: 16 }}
                    disabled={paymentSimulationState !== 'idle' && paymentSimulationState !== 'failed'}
                    onClick={handleProcessPayment}
                  >
                    <Shield style={{ fontSize: 18 }} /> Pay TSh {fmtMoney(activeFareInfo?.amount)}
                  </button>
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
              )}

              {/* ── STEP 4: Digital Ticket Receipt Generated ── */}
              {purchaseStep === 4 && createdTicket && (
                <div className="ep-tp-section" style={{ alignItems: 'center' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      background: 'var(--primary-tint)',
                      color: 'var(--primary)',
                      padding: '6px 16px',
                      borderRadius: 999,
                      fontWeight: 800,
                      fontSize: '0.8rem',
                      marginBottom: 10,
                    }}
                  >
                    <CheckCircle style={{ fontSize: 18 }} /> PAYMENT CONFIRMED
                  </div>

                  {/* Render thermal digital ticket */}
                  <ThermalTicketReceipt
                    ticket={createdTicket}
                    onDownload={handleDownloadPdf}
                    onPrint={handlePrintTicket}
                  />

                  <button
                    className="btn btn-ghost"
                    style={{ width: '100%', maxWidth: 300, marginTop: 14 }}
                    onClick={() => {
                      setPurchaseStep(1);
                      setTicketPanelOpen(false);
                    }}
                  >
                    Done / Buy Another Ticket
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Leaflet Interactive Transit Map ── */}
        <div className="ep-map-wrap">
          <MapContainer center={DEFAULT_CENTER} zoom={11} style={{ height: '100%', width: '100%', minHeight: 520 }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FitBounds positions={mapBounds} />

            {!selectedRoute &&
              stations.map((station) => {
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
                      <strong>{station.name}</strong>
                      <br />
                      {station.address || 'Station'}
                    </Popup>
                  </Marker>
                );
              })}

            {selectedRoute &&
              routeStops.map((stop, index) => {
                if (!isValidCoordinate(stop.latitude, stop.longitude)) return null;
                const pos = [Number(stop.latitude), Number(stop.longitude)];
                const order = stop.stopOrder ?? index + 1;
                return (
                  <Marker key={stop.id || stop.stopId} position={pos} icon={stopIcon(order, routeColor)}>
                    <Popup>
                      <strong>
                        Stop {order}: {stop.stopName}
                      </strong>
                      <br />
                      {stop.address || selectedRoute.name}
                    </Popup>
                  </Marker>
                );
              })}

            {routeLine.length >= 2 && (
              <Polyline positions={routeLine} pathOptions={{ color: routeColor, weight: 5, opacity: 0.85 }} />
            )}

            {userLocation && (
              <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
                <Popup>
                  You are here
                  <br />
                  {userLocation.name}
                </Popup>
              </Marker>
            )}
          </MapContainer>

          {/* Route Summary Floating Overlay */}
          {selectedRoute && (
            <div className="ep-route-summary-card">
              <div className="ep-rs-header">
                <RouteIcon style={{ fontSize: 16 }} /> Route Summary
              </div>
              <div className="ep-rs-grid">
                <div className="ep-rs-item">
                  <span className="ep-rs-label">Total Distance</span>
                  <span className="ep-rs-val">{routeTotalDistance.toFixed(1)} km</span>
                </div>
                <div className="ep-rs-item">
                  <span className="ep-rs-label">Est. Travel Time</span>
                  <span className="ep-rs-val">
                    {Math.round(routeTotalDistance / 0.5)} - {Math.round(routeTotalDistance / 0.5) + 5} min
                  </span>
                </div>
                <div className="ep-rs-item">
                  <span className="ep-rs-label">Total Stops</span>
                  <span className="ep-rs-val">{routeStops.length}</span>
                </div>
                <div className="ep-rs-item">
                  <span className="ep-rs-label">Adult Fare</span>
                  <span className="ep-rs-val" style={{ color: 'var(--primary)' }}>
                    {selectedRoute.adultFare != null ? fmtMoney(selectedRoute.adultFare) : '—'} TZS
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Map Legend */}
          <div className="ep-map-legend">
            <div className="ep-legend-item">
              <span className="ep-legend-dot user"></span> You are here
            </div>
            <div className="ep-legend-item">
              <span className="ep-legend-line"></span> Selected Route
            </div>
            <div className="ep-legend-item">
              <span className="ep-legend-dot stop"></span> Bus Stop
            </div>
          </div>
        </div>
      </div>

      {/* ── Ticket History Section (for passenger view) ── */}
      {showHistory && (
        <TicketHistorySection
          onSelectTicket={(t) => {
            setCreatedTicket(t);
            setPurchaseStep(4);
            setTicketPanelOpen(true);
          }}
        />
      )}

      {/* ── Conductor QR Verification Modal ── */}
      <QrVerifyModal open={verifyModalOpen} onClose={() => setVerifyModalOpen(false)} />

      {/* Footer Navigation */}
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
          <HomeIcon style={{ fontSize: 18 }} /> About
        </a>
        <a href="/" className="ep-footer-link">
          <ContactMail style={{ fontSize: 18 }} /> Contact
        </a>
      </nav>
    </div>
  );
}

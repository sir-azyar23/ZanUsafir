import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Cancel,
  ConfirmationNumber,
  ContentCopy,
  FilterList,
  Map as MapIcon,
  Route as RouteIcon,
  Search,
  TravelExplore,
  CheckCircle,
  Schedule,
  DoNotDisturb,
  CalendarToday,
  ArrowForward,
  Refresh,
} from '@mui/icons-material';
import { cancelTicket, getMyTickets } from '../services/api';

/* ─── helpers ──────────────────────────────────────────────────────────── */
const formatMoney = (amount, currency = 'TZS') =>
  new Intl.NumberFormat('sw-TZ', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);

const formatDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const formatDateShort = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

/* ─── status config ─────────────────────────────────────────────────────── */
const STATUS_CONFIG = {
  BOOKED: {
    badge: 'badge-success',
    icon: CheckCircle,
    color: 'var(--primary)',
    bg: 'rgba(57,181,74,0.08)',
    border: 'rgba(57,181,74,0.2)',
    label: 'Booked',
  },
  USED: {
    badge: 'badge-info',
    icon: CheckCircle,
    color: '#0d5fa0',
    bg: 'rgba(54,169,225,0.07)',
    border: 'rgba(54,169,225,0.2)',
    label: 'Used',
  },
  CANCELLED: {
    badge: 'badge-danger',
    icon: DoNotDisturb,
    color: 'var(--danger)',
    bg: 'rgba(220,38,38,0.05)',
    border: 'rgba(220,38,38,0.15)',
    label: 'Cancelled',
  },
};

/* ─── stat card ─────────────────────────────────────────────────────────── */
function StatPill({ icon: Icon, label, value, color, bg }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '16px 20px', borderRadius: 14,
      background: bg, border: `1px solid ${color}30`,
      flex: '1 1 160px', minWidth: 140,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 12,
        background: `${color}18`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon style={{ color, fontSize: 20 }} />
      </div>
      <div>
        <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
}

/* ─── ticket card ───────────────────────────────────────────────────────── */
function TicketCard({ ticket, onCancel, cancelling }) {
  const cfg = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.BOOKED;
  const StatusIcon = cfg.icon;

  const copyTicketNumber = () => {
    navigator.clipboard.writeText(ticket.ticketNumber).then(() => {
      toast.success(`Copied: ${ticket.ticketNumber}`);
    }).catch(() => toast.error('Could not copy'));
  };

  return (
    <div style={{
      borderRadius: 16,
      background: 'var(--bg-card)',
      border: `1px solid ${cfg.border}`,
      boxShadow: '0 2px 12px rgba(31,41,55,0.06)',
      overflow: 'hidden',
      transition: 'box-shadow 0.2s ease',
    }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 8px 28px rgba(31,41,55,0.11)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = '0 2px 12px rgba(31,41,55,0.06)'}
    >
      {/* Top accent strip */}
      <div style={{ height: 3, background: cfg.color, opacity: 0.7 }} />

      <div style={{ padding: '18px 20px' }}>
        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <StatusIcon style={{ color: cfg.color, fontSize: 20 }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.95rem', color: cfg.color }}>
                  {ticket.ticketNumber}
                </span>
                <button
                  type="button"
                  title="Copy ticket number"
                  onClick={copyTicketNumber}
                  style={{
                    border: 'none', background: 'transparent', cursor: 'pointer',
                    color: 'var(--text-secondary)', padding: 2, borderRadius: 4,
                    display: 'flex', alignItems: 'center',
                  }}
                >
                  <ContentCopy style={{ fontSize: 13 }} />
                </button>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                <CalendarToday style={{ fontSize: 11, marginRight: 4, verticalAlign: 'middle' }} />
                Booked {formatDate(ticket.createdAt)}
              </div>
            </div>
          </div>
          <span className={`badge ${cfg.badge}`}>{cfg.label}</span>
        </div>

        {/* Route */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          marginTop: 14, padding: '10px 14px',
          borderRadius: 10, background: 'var(--bg-light)',
          border: '1px solid var(--border)',
        }}>
          <RouteIcon style={{ color: 'var(--primary)', fontSize: 18, flexShrink: 0 }} />
          <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
            {ticket.routeName}
          </span>
        </div>

        {/* Journey stops */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          marginTop: 12, padding: '12px 14px',
          borderRadius: 10, background: cfg.bg,
        }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>From</div>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: 3, fontSize: '0.9rem' }}>{ticket.fromStopName}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flexShrink: 0 }}>
            <div style={{ width: 32, height: 2, background: cfg.color, borderRadius: 2 }} />
            <ArrowForward style={{ color: cfg.color, fontSize: 16 }} />
          </div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>To</div>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: 3, fontSize: '0.9rem' }}>{ticket.toStopName}</div>
          </div>
        </div>

        {/* Meta grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: 10, marginTop: 12,
        }}>
          <div style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--bg-light)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fare</div>
            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--dark)', marginTop: 3 }}>
              {formatMoney(ticket.amount, ticket.currency)}
            </div>
          </div>
          {ticket.passengerName && (
            <div style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--bg-light)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Passenger</div>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)', marginTop: 3 }}>{ticket.passengerName}</div>
            </div>
          )}
          {ticket.travelDate && (
            <div style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--bg-light)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Travel Date</div>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)', marginTop: 3 }}>{formatDateShort(ticket.travelDate)}</div>
            </div>
          )}
        </div>

        {/* Action row */}
        {ticket.status === 'BOOKED' && (
          <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button
              className="btn btn-ghost"
              type="button"
              style={{ color: 'var(--danger)', borderColor: 'rgba(220,38,38,0.2)', fontSize: '0.82rem', padding: '7px 16px' }}
              onClick={() => onCancel(ticket)}
              disabled={cancelling}
            >
              <Cancel style={{ fontSize: 16 }} />
              {cancelling ? 'Cancelling…' : 'Cancel Ticket'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── main page ─────────────────────────────────────────────────────────── */
export default function MyTicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);

  // filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMyTickets();
      // Sort newest first
      const sorted = (res.data || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setTickets(sorted);
    } catch {
      toast.error('Failed to load your tickets');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { queueMicrotask(load); }, [load]);

  const handleCancel = async (ticket) => {
    if (!window.confirm(`Cancel ticket ${ticket.ticketNumber}? This cannot be undone.`)) return;
    setCancellingId(ticket.id);
    try {
      await cancelTicket(ticket.id);
      toast.success('Ticket cancelled successfully');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel ticket');
    } finally {
      setCancellingId(null);
    }
  };

  /* stats */
  const stats = useMemo(() => ({
    total: tickets.length,
    booked: tickets.filter(t => t.status === 'BOOKED').length,
    used: tickets.filter(t => t.status === 'USED').length,
    cancelled: tickets.filter(t => t.status === 'CANCELLED').length,
  }), [tickets]);

  /* filtered list */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tickets.filter(t => {
      const matchSearch = !q || (
        t.ticketNumber?.toLowerCase().includes(q) ||
        t.routeName?.toLowerCase().includes(q) ||
        t.fromStopName?.toLowerCase().includes(q) ||
        t.toStopName?.toLowerCase().includes(q) ||
        t.passengerName?.toLowerCase().includes(q)
      );
      const matchStatus = statusFilter === 'ALL' || t.status === statusFilter;
      const matchDate = !dateFilter || (t.createdAt && t.createdAt.startsWith(dateFilter));
      return matchSearch && matchStatus && matchDate;
    });
  }, [tickets, search, statusFilter, dateFilter]);

  const hasFilters = search || statusFilter !== 'ALL' || dateFilter;

  return (
    <div style={{ display: 'grid', gap: 24 }}>

      {/* ── Page header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <ConfirmationNumber style={{ color: 'var(--primary)' }} />
            Ticket History
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: 6, marginBottom: 0 }}>
            View, manage, and track all your booked tickets.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={load}
            disabled={loading}
            style={{ fontSize: '0.85rem', padding: '9px 16px' }}
          >
            <Refresh style={{ fontSize: 17 }} />
            Refresh
          </button>
          <Link to="/explore" className="btn btn-primary" style={{ fontSize: '0.85rem', padding: '9px 18px' }}>
            <TravelExplore style={{ fontSize: 18 }} /> Book New Ticket
          </Link>
        </div>
      </div>

      {/* ── Stats pills ── */}
      {!loading && tickets.length > 0 && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <StatPill icon={ConfirmationNumber} label="Total Tickets" value={stats.total}   color="var(--dark)"    bg="var(--bg-light)" />
          <StatPill icon={CheckCircle}        label="Active"        value={stats.booked}  color="var(--primary)" bg="rgba(57,181,74,0.07)" />
          <StatPill icon={Schedule}           label="Used"          value={stats.used}    color="#0d5fa0"        bg="rgba(54,169,225,0.07)" />
          <StatPill icon={DoNotDisturb}       label="Cancelled"     value={stats.cancelled} color="var(--danger)" bg="rgba(220,38,38,0.05)" />
        </div>
      )}

      {/* ── Filters bar ── */}
      {!loading && tickets.length > 0 && (
        <div className="stat-card" style={{ padding: '14px 18px' }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Search */}
            <div style={{ position: 'relative', flex: '1 1 220px' }}>
              <Search style={{
                position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                color: 'var(--text-secondary)', fontSize: 18,
              }} />
              <input
                id="ticket-search"
                className="form-input"
                style={{ paddingLeft: 34 }}
                placeholder="Search by ticket #, route, stop…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            {/* Status filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <FilterList style={{ color: 'var(--text-secondary)', fontSize: 18 }} />
              <select
                id="ticket-status-filter"
                className="form-input"
                style={{ width: 'auto', paddingRight: 32 }}
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
              >
                <option value="ALL">All Statuses</option>
                <option value="BOOKED">Booked</option>
                <option value="USED">Used</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            {/* Date filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <CalendarToday style={{ color: 'var(--text-secondary)', fontSize: 16 }} />
              <input
                id="ticket-date-filter"
                type="date"
                className="form-input"
                style={{ width: 'auto' }}
                value={dateFilter}
                onChange={e => setDateFilter(e.target.value)}
              />
            </div>

            {/* Clear filters */}
            {hasFilters && (
              <button
                type="button"
                className="btn btn-ghost"
                style={{ fontSize: '0.8rem', padding: '8px 14px', flexShrink: 0 }}
                onClick={() => { setSearch(''); setStatusFilter('ALL'); setDateFilter(''); }}
              >
                Clear Filters
              </button>
            )}
          </div>

          {hasFilters && (
            <div style={{ marginTop: 10, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Showing <strong style={{ color: 'var(--text-primary)' }}>{filtered.length}</strong> of {tickets.length} ticket{tickets.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}

      {/* ── Content ── */}
      {loading ? (
        <div className="stat-card" style={{ padding: 56, textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            border: '3px solid var(--border)',
            borderTopColor: 'var(--primary)',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 16px',
          }} />
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Loading your tickets…</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>

      ) : tickets.length === 0 ? (
        <div className="stat-card" style={{ padding: '56px 24px', textAlign: 'center' }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20, margin: '0 auto 20px',
            background: 'rgba(57,181,74,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ConfirmationNumber style={{ fontSize: 36, color: 'var(--primary)', opacity: 0.6 }} />
          </div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 8px' }}>No Tickets Yet</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: '0.88rem' }}>
            You haven't booked any tickets. Explore routes and book your first ticket!
          </p>
          <Link to="/explore" className="btn btn-primary">
            <MapIcon style={{ fontSize: 18 }} /> Explore Routes &amp; Book
          </Link>
        </div>

      ) : filtered.length === 0 ? (
        <div className="stat-card" style={{ padding: '40px 24px', textAlign: 'center' }}>
          <Search style={{ fontSize: 40, color: 'var(--text-secondary)', opacity: 0.35, marginBottom: 12 }} />
          <p style={{ color: 'var(--text-secondary)', marginBottom: 16, fontSize: '0.9rem' }}>
            No tickets match your filters.
          </p>
          <button type="button" className="btn btn-ghost" onClick={() => { setSearch(''); setStatusFilter('ALL'); setDateFilter(''); }}>
            Clear Filters
          </button>
        </div>

      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          {filtered.map(ticket => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              onCancel={handleCancel}
              cancelling={cancellingId === ticket.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

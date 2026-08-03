import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { ConfirmationNumber, Search } from '@mui/icons-material';
import { getAllTickets } from '../services/api';

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAllTickets();
      setTickets(res.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(load);
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tickets;
    return tickets.filter(ticket =>
      String(ticket.ticketNumber || '').toLowerCase().includes(q)
      || String(ticket.passengerName || '').toLowerCase().includes(q)
      || String(ticket.routeName || '').toLowerCase().includes(q)
      || String(ticket.fromStopName || '').toLowerCase().includes(q)
      || String(ticket.toStopName || '').toLowerCase().includes(q)
    );
  }, [tickets, query]);

  const fmt = (amount, currency = 'TZS') => new Intl.NumberFormat('sw-TZ', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <ConfirmationNumber style={{ color: 'var(--primary)' }} />
            Tickets
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: 4 }}>
            Admin view of all passenger and account-based ticket bookings.
          </p>
        </div>
        <div style={{ position: 'relative' }}>
          <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontSize: 18 }} />
          <input
            className="form-input"
            style={{ width: 260, paddingLeft: 34 }}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search ticket, passenger, route..."
          />
        </div>
      </div>

      <div className="stat-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-secondary)' }}>Loading tickets...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-secondary)' }}>No tickets found</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Ticket</th>
                <th>Passenger</th>
                <th>Route</th>
                <th>From</th>
                <th>To</th>
                <th>Fare</th>
                <th>Status</th>
                <th>Booked At</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(ticket => (
                <tr key={ticket.id}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)' }}>{ticket.ticketNumber}</td>
                  <td style={{ fontWeight: 600 }}>{ticket.passengerName || 'Guest'}</td>
                  <td>{ticket.routeName}</td>
                  <td>{ticket.fromStopName}</td>
                  <td>{ticket.toStopName}</td>
                  <td style={{ fontWeight: 700 }}>{fmt(ticket.amount, ticket.currency)}</td>
                  <td><span className={`badge ${ticket.status === 'BOOKED' ? 'badge-success' : ticket.status === 'CANCELLED' ? 'badge-danger' : 'badge-warning'}`}>{ticket.status}</span></td>
                  <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{new Date(ticket.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

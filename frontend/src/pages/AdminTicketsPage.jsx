import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import {
  Cancel,
  CheckCircle,
  Close,
  ConfirmationNumber,
  Download,
  Groups,
  LocalActivity,
  Print,
  Refresh,
  Search,
  Visibility,
} from '@mui/icons-material';
import {
  cancelTicket,
  exportTicketSalesReport,
  getAllTickets,
  getRoutes,
  getTicketSalesSummary,
  getTicket,
} from '../services/api';

const emptyFilters = {
  search: '',
  dateFrom: '',
  dateTo: '',
  routeId: '',
  passengerType: '',
  paymentMethod: '',
  paymentStatus: '',
  ticketStatus: '',
};

const badgeClass = (value) => {
  const key = String(value || '').toLowerCase().replaceAll('_', '-');
  if (['paid', 'active'].includes(key)) return 'ticket-badge success';
  if (key === 'pending') return 'ticket-badge warning';
  if (key === 'used') return 'ticket-badge info';
  if (['failed', 'cancelled', 'refunded'].includes(key)) return 'ticket-badge danger';
  return 'ticket-badge neutral';
};

const displayStatus = (value) => String(value || 'NOT ISSUED').replaceAll('_', ' ');

export default function AdminTicketsPage() {
  const [filters, setFilters] = useState(emptyFilters);
  const [tickets, setTickets] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [summary, setSummary] = useState({});
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [previewTicket, setPreviewTicket] = useState(null);
  const [ticketLoading, setTicketLoading] = useState(false);
  const [ticketError, setTicketError] = useState('');
  const [modalQrUrl, setModalQrUrl] = useState('');
  const receiptRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [processing, setProcessing] = useState(false);

  const apiParams = useMemo(() => ({
    page,
    size,
    sort: 'createdAt,desc',
    ...Object.fromEntries(Object.entries(filters).filter(([, value]) => value)),
  }), [filters, page, size]);

  const fmtMoney = (amount, currency = 'TZS') => new Intl.NumberFormat('sw-TZ', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number(amount || 0)).replace('TZS', 'TSh');

  const fmtDate = (date) => (date ? new Date(date).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }) : 'Not yet');

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [ticketResult, summaryResult] = await Promise.allSettled([
        getAllTickets(apiParams),
        getTicketSalesSummary(),
      ]);

      if (ticketResult.status === 'fulfilled') {
        setTickets(ticketResult.value.data?.content || []);
        setTotalPages(ticketResult.value.data?.totalPages || 0);
        setTotalElements(ticketResult.value.data?.totalElements || 0);
      } else {
        const msg = ticketResult.reason?.response?.data?.message || 'Failed to load ticket sales';
        setError(msg);
      }

      if (summaryResult.status === 'fulfilled') {
        setSummary(summaryResult.value.data || {});
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load ticket sales');
    } finally {
      setLoading(false);
    }
  }, [apiParams]);

  useEffect(() => {
    getRoutes().then(res => setRoutes(res.data || [])).catch(() => setRoutes([]));
  }, []);

  useEffect(() => {
    const timer = setTimeout(loadTickets, 250);
    return () => clearTimeout(timer);
  }, [loadTickets]);

  useEffect(() => {
    let active = true;
    if (previewTicket) {
      const payload = previewTicket.qrToken || previewTicket.ticketNumber || '';
      QRCode.toDataURL(payload, { width: 220, margin: 1 })
        .then(url => { if (active) setModalQrUrl(url); })
        .catch(err => { console.error(err); if (active) setModalQrUrl(''); });
    } else {
      setModalQrUrl('');
    }
    return () => { active = false; };
  }, [previewTicket]);

  const handleViewTicket = useCallback(async (ticket) => {
    setSelectedTicket(ticket);
    setPreviewTicket(null);
    setTicketLoading(true);
    setTicketError('');
    try {
      const res = await getTicket(ticket.id);
      setPreviewTicket(res.data);
    } catch (err) {
      setTicketError(err.response?.data?.message || 'Failed to load ticket details');
    } finally {
      setTicketLoading(false);
    }
  }, []);

  const updateFilter = (key, value) => {
    setPage(0);
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setPage(0);
    setFilters(emptyFilters);
  };

  const exportReport = async () => {
    try {
      const res = await exportTicketSalesReport(Object.fromEntries(Object.entries(filters).filter(([, value]) => value)));
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'ticket-sales-report.csv';
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to export report');
    }
  };

  const handleCancel = async () => {
    const target = previewTicket || selectedTicket;
    if (!target) return;
    const reason = window.prompt('Cancellation reason');
    if (!reason) return;
    setProcessing(true);
    try {
      const res = await cancelTicket(target.id, reason);
      toast.success('Ticket cancelled');
      setPreviewTicket(res.data);
      setSelectedTicket(res.data);
      loadTickets();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel ticket');
    } finally {
      setProcessing(false);
    }
  };

  const printReceipt = (element) => {
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

  const downloadReceipt = async (element, ticketNo) => {
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

  const statCards = [
    { label: 'Total Sales Today', value: fmtMoney(summary.totalSalesToday), icon: <CheckCircle />, tone: 'green' },
    { label: 'Tickets Sold', value: summary.ticketsSold || 0, icon: <ConfirmationNumber />, tone: 'blue' },
    { label: 'Active Tickets', value: summary.activeTickets || 0, icon: <LocalActivity />, tone: 'amber' },
    { label: 'Used Tickets', value: summary.usedTickets || 0, icon: <Groups />, tone: 'cyan' },
  ];

  return (
    <div className="ticket-sales-page">
      <style>{`
        .ticket-sales-page { display: block; }
        .ticket-main { min-width: 0; width: 100%; }
        .ticket-header { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; margin-bottom: 18px; }
        .ticket-title { margin: 0; font-size: 1.45rem; font-weight: 850; color: var(--text-primary); }
        .ticket-subtitle { margin-top: 4px; color: var(--text-secondary); font-size: .86rem; }
        .ticket-actions { display: flex; gap: 10px; flex-wrap: wrap; }
        .ticket-search { position: relative; min-width: 300px; }
        .ticket-search svg { position: absolute; top: 50%; left: 12px; transform: translateY(-50%); color: var(--text-secondary); font-size: 19px; }
        .ticket-input, .ticket-select { height: 40px; border: 1px solid var(--border); border-radius: 7px; background: var(--bg-card); color: var(--text-primary); padding: 0 12px; font-size: .83rem; outline: none; }
        .ticket-search .ticket-input { width: 100%; padding-left: 38px; }
        .ticket-button { height: 40px; border-radius: 7px; border: 1px solid var(--border); background: var(--bg-card); color: var(--text-primary); display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 0 14px; font-weight: 750; font-size: .8rem; cursor: pointer; }
        .ticket-button.primary { background: var(--primary); border-color: var(--primary); color: white; }
        .ticket-button.danger { border-color: var(--danger); color: var(--danger); background: transparent; }
        .ticket-stats { display: grid; grid-template-columns: repeat(4, minmax(150px, 1fr)); gap: 12px; margin-bottom: 16px; }
        .ticket-stat { border: 1px solid var(--border); border-radius: 8px; padding: 16px; background: var(--bg-card); display: flex; justify-content: space-between; gap: 10px; }
        .ticket-stat-label { color: var(--text-secondary); text-transform: uppercase; letter-spacing: .04em; font-size: .72rem; font-weight: 850; }
        .ticket-stat-value { margin-top: 8px; font-size: 1.35rem; font-weight: 900; color: var(--text-primary); }
        .ticket-stat-icon { width: 42px; height: 42px; border-radius: 50%; display: grid; place-items: center; color: white; flex-shrink: 0; }
        .ticket-stat.green .ticket-stat-icon { background: var(--primary); } .ticket-stat.blue .ticket-stat-icon { background: #3b82f6; } .ticket-stat.amber .ticket-stat-icon { background: #f59e0b; } .ticket-stat.cyan .ticket-stat-icon { background: #14b8a6; }
        .ticket-filters { display: grid; grid-template-columns: repeat(6, minmax(130px, 1fr)) auto; gap: 10px; margin-bottom: 16px; }
        .ticket-table-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
        .ticket-table-wrap { overflow-x: auto; }
        .ticket-table { width: 100%; border-collapse: collapse; min-width: 1040px; }
        .ticket-table th { text-align: left; background: rgba(148,163,184,.08); color: var(--text-primary); font-size: .69rem; text-transform: uppercase; padding: 12px 14px; letter-spacing: .04em; }
        .ticket-table td { padding: 12px 14px; border-top: 1px solid var(--border); color: var(--text-primary); font-size: .78rem; vertical-align: middle; }
        .ticket-ref { color: var(--primary); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-weight: 850; }
        .ticket-badge { display: inline-flex; align-items: center; height: 22px; border-radius: 999px; padding: 0 9px; font-size: .68rem; font-weight: 850; text-transform: uppercase; white-space: nowrap; }
        .ticket-badge.success { background: var(--status-paid-bg); color: var(--status-paid-text); } .ticket-badge.warning { background: var(--status-pending-bg); color: var(--status-pending-text); } .ticket-badge.info { background: var(--status-used-bg); color: var(--status-used-text); } .ticket-badge.danger { background: var(--status-cancelled-bg); color: var(--status-cancelled-text); } .ticket-badge.neutral { background: var(--status-not-issued-bg); color: var(--status-not-issued-text); }
        .ticket-icon-button { width: 34px; height: 34px; border: 1px solid var(--border); border-radius: 7px; background: transparent; color: var(--text-primary); cursor: pointer; display: grid; place-items: center; }
        .ticket-pagination { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 14px; border-top: 1px solid var(--border); color: var(--text-secondary); font-size: .82rem; flex-wrap: wrap; }
        
        .ticket-table tr.selected-row td { background-color: rgba(18, 161, 80, 0.08) !important; }

        /* Modal Preview Design */
        .ticket-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }
        .ticket-modal-box {
          background: var(--bg-card);
          border-radius: 12px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          border: 1px solid var(--border);
          width: 100%;
          max-width: 1100px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          animation: modalFadeIn 0.25s ease-out;
        }
        @keyframes modalFadeIn {
          from { opacity: 0; transform: scale(0.97); }
          to { opacity: 1; transform: scale(1); }
        }
        .ticket-modal-header {
          background: #0f172a;
          color: #ffffff;
          padding: 16px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: relative;
        }
        .ticket-modal-header::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: var(--primary);
        }
        .ticket-modal-title {
          margin: 0;
          font-size: 1.2rem;
          font-weight: 700;
          letter-spacing: 0.02em;
        }
        .ticket-modal-close-btn {
          background: transparent;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 6px;
          border-radius: 6px;
          transition: all 0.2s;
        }
        .ticket-modal-close-btn:hover {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.1);
        }
        .ticket-modal-body {
          padding: 20px;
          overflow-y: auto;
          flex: 1;
        }
        .ticket-modal-grid {
          display: grid;
          grid-template-columns: 1fr 310px 1fr;
          gap: 20px;
          align-items: start;
        }
        .ticket-modal-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 14px;
          margin-bottom: 14px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.02);
        }
        .ticket-modal-card-title {
          font-weight: 850;
          font-size: 0.85rem;
          color: var(--text-primary);
          margin-bottom: 12px;
          border-bottom: 1px solid var(--border);
          padding-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        .modal-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 8px 0;
          font-size: 0.8rem;
        }
        .modal-row span:first-child {
          color: var(--text-secondary);
        }
        .modal-row span:last-child {
          font-weight: 700;
          color: var(--text-primary);
          text-align: right;
        }
        .modal-val-success {
          color: var(--primary) !important;
          font-weight: 850 !important;
        }
        .thermal-receipt-container {
          width: 290px;
          margin: 0 auto;
          background: #FFFFFF;
          color: #000000;
          padding: 20px 15px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.08);
          font-family: 'JetBrains Mono', 'Courier New', monospace;
          border-radius: 8px;
          border: 1px solid #E2E8F0;
        }
        .receipt-divider {
          text-align: center;
          margin: 8px 0;
          font-size: 0.75rem;
          font-weight: bold;
          color: #000000;
        }
        .receipt-details {
          display: flex;
          flex-direction: column;
          gap: 5px;
          font-size: 0.75rem;
          color: #000000;
        }
        .receipt-row {
          display: flex;
          justify-content: space-between;
          gap: 8px;
        }
        .receipt-row span:first-child {
          color: #475569;
        }
        .receipt-row strong {
          color: #000000;
        }
        .timeline-container {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding-left: 8px;
          margin-top: 8px;
        }
        .timeline-item {
          display: flex;
          gap: 12px;
          position: relative;
        }
        .timeline-item::before {
          content: '';
          position: absolute;
          left: 10px;
          top: 20px;
          bottom: -20px;
          width: 2px;
          background: var(--border);
          z-index: 1;
        }
        .timeline-item:last-child::before {
          display: none;
        }
        .timeline-badge {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: var(--border);
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 700;
          z-index: 2;
        }
        .timeline-item.completed .timeline-badge {
          background: var(--primary);
          color: white;
        }
        .timeline-item.completed::before {
          background: var(--primary);
        }
        .timeline-content {
          flex: 1;
        }
        .timeline-title {
          font-size: 0.78rem;
          font-weight: 700;
          color: var(--text-primary);
        }
        .timeline-time {
          font-size: 0.7rem;
          color: var(--text-secondary);
          margin-top: 2px;
        }
        .ticket-modal-footer {
          padding: 16px 20px;
          border-top: 1px solid var(--border);
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          background: var(--bg-light);
        }

        .ticket-empty { padding: 44px; text-align: center; color: var(--text-secondary); }
        @media print { 
          body * { visibility: hidden; } 
          .thermal-receipt-container, .thermal-receipt-container * { visibility: visible; } 
          .thermal-receipt-container { position: absolute; inset: 0; width: 100%; border: none; } 
        }
        @media (max-width: 950px) { 
          .ticket-modal-grid { grid-template-columns: 1fr; } 
        }
        @media (max-width: 1180px) { 
          .ticket-stats { grid-template-columns: repeat(2, 1fr); } 
          .ticket-filters { grid-template-columns: repeat(3, 1fr); } 
        }
        @media (max-width: 720px) { 
          .ticket-header { flex-direction: column; } 
          .ticket-search { min-width: 100%; } 
          .ticket-stats, .ticket-filters { grid-template-columns: 1fr; } 
        }
      `}</style>

      <section className="ticket-main">
        <div className="ticket-header">
          <div>
            <h1 className="ticket-title">Ticket Sales & Payments</h1>
            <p className="ticket-subtitle">Monitor passenger purchases, payments and ticket usage.</p>
          </div>
          <div className="ticket-actions">
            <div className="ticket-search">
              <Search />
              <input className="ticket-input" value={filters.search} onChange={e => updateFilter('search', e.target.value)} placeholder="Search ticket, passenger or phone..." />
            </div>
            <button className="ticket-button primary" onClick={exportReport}><Download fontSize="small" />Export Report</button>
          </div>
        </div>

        <div className="ticket-stats">
          {statCards.map(card => (
            <div className={`ticket-stat ${card.tone}`} key={card.label}>
              <div><div className="ticket-stat-label">{card.label}</div><div className="ticket-stat-value">{card.value}</div></div>
              <div className="ticket-stat-icon">{card.icon}</div>
            </div>
          ))}
        </div>

        <div className="ticket-filters">
          <input className="ticket-input" type="date" value={filters.dateFrom} onChange={e => updateFilter('dateFrom', e.target.value)} />
          <select className="ticket-select" value={filters.routeId} onChange={e => updateFilter('routeId', e.target.value)}>
            <option value="">All Routes</option>{routes.map(route => <option key={route.id} value={route.id}>{route.name}</option>)}
          </select>
          <select className="ticket-select" value={filters.passengerType} onChange={e => updateFilter('passengerType', e.target.value)}>
            <option value="">All Types</option><option value="STUDENT">Student</option><option value="ADULT">Adult</option><option value="SENIOR">Senior 70+</option>
          </select>
          <select className="ticket-select" value={filters.paymentMethod} onChange={e => updateFilter('paymentMethod', e.target.value)}>
            <option value="">All Methods</option><option value="MOBILE_MONEY">Mobile Money</option><option value="BANK_CARD">Bank Card</option>
          </select>
          <select className="ticket-select" value={filters.paymentStatus} onChange={e => updateFilter('paymentStatus', e.target.value)}>
            <option value="">Payment Status</option><option value="PAID">Paid</option><option value="PENDING">Pending</option><option value="FAILED">Failed</option><option value="CANCELLED">Cancelled</option><option value="REFUNDED">Refunded</option>
          </select>
          <select className="ticket-select" value={filters.ticketStatus} onChange={e => updateFilter('ticketStatus', e.target.value)}>
            <option value="">Ticket Status</option><option value="ACTIVE">Active</option><option value="USED">Used</option><option value="NOT_ISSUED">Not Issued</option><option value="CANCELLED">Cancelled</option><option value="EXPIRED">Expired</option>
          </select>
          <button className="ticket-button" onClick={resetFilters}><Refresh fontSize="small" />Reset</button>
        </div>

        <div className="ticket-table-card">
          {loading ? <div className="ticket-empty">Loading ticket sales...</div> : error ? (
            <div className="ticket-empty">{error}<br /><button className="ticket-button" onClick={loadTickets} style={{ marginTop: 12 }}>Retry</button></div>
          ) : tickets.length === 0 ? <div className="ticket-empty">No ticket transactions found</div> : (
            <>
              <div className="ticket-table-wrap">
                <table className="ticket-table">
                  <thead><tr><th>Ticket Ref</th><th>Passenger</th><th>Phone</th><th>Route</th><th>Type</th><th>Amount</th><th>Payment</th><th>Ticket Status</th><th>Purchased At</th><th>Action</th></tr></thead>
                  <tbody>
                    {tickets.map(ticket => (
                      <tr key={ticket.id} className={selectedTicket && selectedTicket.id === ticket.id ? 'selected-row' : ''}>
                        <td className="ticket-ref">{ticket.referenceNumber || ticket.ticketNumber}</td>
                        <td>{ticket.passengerName || 'Guest'}</td>
                        <td>{ticket.passengerPhone || '-'}</td>
                        <td>{ticket.routeName}</td>
                        <td>{displayStatus(ticket.passengerType)}</td>
                        <td style={{ fontWeight: 850 }}>{fmtMoney(ticket.amount, ticket.currency)}</td>
                        <td><span className={badgeClass(ticket.paymentStatus)}>{ticket.paymentStatus}</span></td>
                        <td><span className={badgeClass(ticket.status)}>{displayStatus(ticket.status)}</span></td>
                        <td>{fmtDate(ticket.createdAt)}</td>
                        <td><button className="ticket-icon-button" aria-label="View ticket details" onClick={() => handleViewTicket(ticket)}><Visibility fontSize="small" /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="ticket-pagination">
                <span>Showing {tickets.length ? page * size + 1 : 0} to {page * size + tickets.length} of {totalElements} transactions</span>
                <div className="ticket-actions">
                  <button className="ticket-button" disabled={page === 0} onClick={() => setPage(prev => Math.max(0, prev - 1))}>Prev</button>
                  <span>Page {page + 1} of {Math.max(totalPages, 1)}</span>
                  <button className="ticket-button" disabled={page + 1 >= totalPages} onClick={() => setPage(prev => prev + 1)}>Next</button>
                  <select className="ticket-select" value={size} onChange={e => { setSize(Number(e.target.value)); setPage(0); }}>
                    <option value="10">10 / page</option><option value="25">25 / page</option><option value="50">50 / page</option>
                  </select>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Ticket Preview Centered Modal Overlay */}
      {selectedTicket && (
        <div className="ticket-modal-overlay" onClick={() => { setSelectedTicket(null); setPreviewTicket(null); }}>
          <div className="ticket-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="ticket-modal-header">
              <h3 className="ticket-modal-title">Ticket Preview</h3>
              <button className="ticket-modal-close-btn" onClick={() => { setSelectedTicket(null); setPreviewTicket(null); }}>
                <Close />
              </button>
            </div>
            
            <div className="ticket-modal-body">
              {ticketLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', minHeight: 300 }}>
                  <div style={{ color: 'var(--text-secondary)', fontWeight: 700 }}>Loading ticket preview details...</div>
                </div>
              ) : ticketError ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', minHeight: 300 }}>
                  <div style={{ color: 'var(--danger)', fontWeight: 700, textAlign: 'center' }}>
                    {ticketError}
                    <br />
                    <button className="ticket-button" onClick={() => handleViewTicket(selectedTicket)} style={{ marginTop: 16 }}>Retry</button>
                  </div>
                </div>
              ) : previewTicket ? (
                <div className="ticket-modal-grid">
                  
                  {/* Left Column */}
                  <div className="ticket-modal-col">
                    <div className="ticket-modal-card">
                      <div className="ticket-modal-card-title">Passenger Details</div>
                      <div className="ticket-modal-card-body">
                        <div className="modal-row"><span>Full Name</span><span>{previewTicket.passengerName || '—'}</span></div>
                        <div className="modal-row"><span>Phone Number</span><span>{previewTicket.passengerPhone || '—'}</span></div>
                        <div className="modal-row"><span>Passenger Type</span><span>{displayStatus(previewTicket.passengerType)}</span></div>
                      </div>
                    </div>
                    
                    <div className="ticket-modal-card">
                      <div className="ticket-modal-card-title">Payment Summary</div>
                      <div className="ticket-modal-card-body">
                        <div className="modal-row"><span>Amount</span><span className="modal-val-success">{fmtMoney(previewTicket.amount, previewTicket.currency)}</span></div>
                        <div className="modal-row"><span>Payment Method</span><span>{displayStatus(previewTicket.paymentMethod) || '—'}</span></div>
                        <div className="modal-row"><span>Payment Provider</span><span>{previewTicket.paymentProvider || '—'}</span></div>
                        <div className="modal-row"><span>Transaction Ref</span><span>{previewTicket.transactionReference || '—'}</span></div>
                      </div>
                    </div>

                    <div className="ticket-modal-card">
                      <div className="ticket-modal-card-title">Ticket Summary</div>
                      <div className="ticket-modal-card-body">
                        <div className="modal-row"><span>Ticket ID</span><span>#{previewTicket.id}</span></div>
                        <div className="modal-row"><span>Ticket Number</span><span>{previewTicket.ticketNumber || '—'}</span></div>
                        <div className="modal-row"><span>Reference Number</span><span>{previewTicket.referenceNumber || '—'}</span></div>
                        <div className="modal-row"><span>Ticket Status</span><span><span className={badgeClass(previewTicket.status)}>{displayStatus(previewTicket.status)}</span></span></div>
                      </div>
                    </div>
                  </div>

                  {/* Center Column: Thermal Receipt Preview */}
                  <div className="ticket-modal-col" style={{ display: 'flex', justifyContent: 'center' }}>
                    <div className="thermal-receipt-container" ref={receiptRef}>
                      <div style={{ textAlign: 'center', fontWeight: 900, fontSize: '1.4rem', letterSpacing: '0.1em', color: '#000000' }}>
                        ZAN BUS
                      </div>
                      <div style={{ textAlign: 'center', fontSize: '0.7rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: 6 }}>
                        Official Passenger Receipt
                      </div>
                      <div className="receipt-divider">==========================</div>
                      
                      <div className="receipt-details">
                        <div className="receipt-row"><span>Ticket No:</span><strong>{previewTicket.ticketNumber}</strong></div>
                        <div className="receipt-row"><span>Ref No:</span><strong>{previewTicket.referenceNumber}</strong></div>
                        <div className="receipt-row"><span>Date &amp; Time:</span><span>{fmtDate(previewTicket.createdAt)}</span></div>
                      </div>
                      <div className="receipt-divider">--------------------------</div>
                      
                      <div className="receipt-details">
                        <div className="receipt-row"><span>Passenger:</span><strong>{previewTicket.passengerName}</strong></div>
                        <div className="receipt-row"><span>Phone:</span><span>{previewTicket.passengerPhone || '—'}</span></div>
                        <div className="receipt-row"><span>Category:</span><strong>{displayStatus(previewTicket.passengerType)}</strong></div>
                        <div className="receipt-row"><span>Route:</span><strong>{previewTicket.routeName}</strong></div>
                      </div>
                      <div className="receipt-divider">--------------------------</div>
                      
                      <div className="receipt-details">
                        <div className="receipt-row"><span>Payment Method:</span><span>{displayStatus(previewTicket.paymentMethod)} ({previewTicket.paymentProvider || '—'})</span></div>
                        <div className="receipt-row"><span>Txn Ref:</span><span>{previewTicket.transactionReference || '—'}</span></div>
                        <div className="receipt-row" style={{ marginTop: 6, fontSize: '0.85rem' }}>
                          <strong>FARE PAID:</strong>
                          <strong style={{ color: 'var(--primary)' }}>{fmtMoney(previewTicket.amount, previewTicket.currency)}</strong>
                        </div>
                      </div>
                      <div className="receipt-divider">==========================</div>
                      
                      {modalQrUrl ? (
                        <div style={{ textAlign: 'center', margin: '8px 0' }}>
                          <img src={modalQrUrl} alt="Ticket QR" style={{ width: 150, height: 150, imageRendering: 'pixelated', margin: '0 auto', display: 'block' }} />
                          <div style={{ fontSize: '0.62rem', fontWeight: 800, marginTop: 6, color: '#0f7a3f' }}>
                            Scan this ticket when boarding the bus
                          </div>
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', padding: 15, fontSize: '0.75rem', color: '#000000' }}>Generating QR...</div>
                      )}
                      
                      <div style={{ textAlign: 'center', fontSize: '0.6rem', color: '#64748B', marginTop: 10 }}>
                        ZanUsafiri Transit Authority &bull; Safe Journey!
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="ticket-modal-col">
                    <div className="ticket-modal-card">
                      <div className="ticket-modal-card-title">Journey Details</div>
                      <div className="ticket-modal-card-body">
                        <div className="modal-row"><span>Route Name</span><span>{previewTicket.routeName || '—'}</span></div>
                        <div className="modal-row"><span>Boarding Stop</span><span>{previewTicket.fromStopName || '—'}</span></div>
                        <div className="modal-row"><span>Destination Stop</span><span>{previewTicket.toStopName || '—'}</span></div>
                      </div>
                    </div>

                    <div className="ticket-modal-card">
                      <div className="ticket-modal-card-title">Journey Timeline</div>
                      <div className="ticket-modal-card-body">
                        <div className="timeline-container">
                          <div className="timeline-item completed">
                            <div className="timeline-badge">✓</div>
                            <div className="timeline-content">
                              <div className="timeline-title">Ticket Booked</div>
                              <div className="timeline-time">{fmtDate(previewTicket.createdAt)}</div>
                            </div>
                          </div>
                          <div className={`timeline-item ${previewTicket.issuedAt ? 'completed' : 'pending'}`}>
                            <div className="timeline-badge">{previewTicket.issuedAt ? '✓' : '•'}</div>
                            <div className="timeline-content">
                              <div className="timeline-title">Payment Confirmed</div>
                              <div className="timeline-time">{previewTicket.issuedAt ? fmtDate(previewTicket.issuedAt) : 'Pending payment'}</div>
                            </div>
                          </div>
                          <div className={`timeline-item ${previewTicket.scannedAt ? 'completed' : 'pending'}`}>
                            <div className="timeline-badge">{previewTicket.scannedAt ? '✓' : '•'}</div>
                            <div className="timeline-content">
                              <div className="timeline-title">Boarded / Scanned</div>
                              <div className="timeline-time">{previewTicket.scannedAt ? fmtDate(previewTicket.scannedAt) : 'Not yet scanned'}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="ticket-modal-card">
                      <div className="ticket-modal-card-title">Ticket Activity</div>
                      <div className="ticket-modal-card-body">
                        <div className="modal-row"><span>Created At</span><span>{fmtDate(previewTicket.createdAt)}</span></div>
                        <div className="modal-row"><span>Updated At</span><span>{fmtDate(previewTicket.updatedAt)}</span></div>
                        {previewTicket.status === 'CANCELLED' && (
                          <>
                            <div className="modal-row"><span>Cancelled At</span><span>{fmtDate(previewTicket.cancelledAt)}</span></div>
                            <div className="modal-row"><span>Cancelled By</span><span>{previewTicket.cancelledByName || '—'}</span></div>
                            <div className="modal-row"><span>Cancel Reason</span><span>{previewTicket.cancellationReason || '—'}</span></div>
                          </>
                        )}
                        <div className="modal-row"><span>Scan Status</span><span>{previewTicket.scannedAt ? 'Scanned' : 'Not Scanned'}</span></div>
                      </div>
                    </div>
                  </div>

                </div>
              ) : null}
            </div>
            
            {previewTicket && (
              <div className="ticket-modal-footer">
                <button className="ticket-button primary" onClick={() => downloadReceipt(receiptRef.current, previewTicket.ticketNumber || 'ticket')}>
                  <Download fontSize="small" /> Download Receipt
                </button>
                <button className="ticket-button" onClick={() => printReceipt(receiptRef.current)}>
                  <Print fontSize="small" /> Print Ticket
                </button>
                {previewTicket.status !== 'USED' && previewTicket.status !== 'CANCELLED' && (
                  <button className="ticket-button danger" disabled={processing} onClick={handleCancel}>
                    <Cancel fontSize="small" /> Cancel Ticket
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

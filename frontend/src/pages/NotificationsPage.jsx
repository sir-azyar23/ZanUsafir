import { useState, useMemo } from 'react';
import {
  Notifications as NotifIcon, CheckCircle, Info, Warning,
  Error as ErrorIcon, DoneAll, DeleteSweep, Search, Circle,
  FilterList,
} from '@mui/icons-material';
import { useNotifications } from '../hooks/useNotifications';

// ── Type config ────────────────────────────────────────────────────────────
const TYPE_CONFIG = {
  ROUTE:    { icon: <Info style={{ fontSize: 20 }} />,         color: '#3B82F6', bg: 'rgba(59,130,246,0.12)',  label: 'Route' },
  BUS_STOP: { icon: <Circle style={{ fontSize: 20 }} />,       color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)', label: 'Bus Stop' },
  BUS:      { icon: <Info style={{ fontSize: 20 }} />,         color: '#0EA5E9', bg: 'rgba(14,165,233,0.12)', label: 'Bus' },
  DRIVER:   { icon: <Info style={{ fontSize: 20 }} />,         color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', label: 'Driver' },
  FARE:     { icon: <CheckCircle style={{ fontSize: 20 }} />,  color: '#10B981', bg: 'rgba(16,185,129,0.12)', label: 'Fare' },
  TICKET:   { icon: <CheckCircle style={{ fontSize: 20 }} />,  color: '#12a150', bg: 'rgba(18,161,80,0.12)',  label: 'Ticket' },
  USER:     { icon: <Info style={{ fontSize: 20 }} />,         color: '#6366F1', bg: 'rgba(99,102,241,0.12)', label: 'User' },
  WARNING:  { icon: <Warning style={{ fontSize: 20 }} />,      color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', label: 'Warning' },
  ERROR:    { icon: <ErrorIcon style={{ fontSize: 20 }} />,    color: '#EF4444', bg: 'rgba(239,68,68,0.12)',  label: 'Error' },
  DEFAULT:  { icon: <Info style={{ fontSize: 20 }} />,         color: '#6B7280', bg: 'rgba(107,114,128,0.12)', label: 'Info' },
};

function getTypeCfg(type) {
  return TYPE_CONFIG[type?.toUpperCase()] || TYPE_CONFIG.DEFAULT;
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ── Notification Card ──────────────────────────────────────────────────────
function NotifCard({ n, onMarkRead, onDelete }) {
  const cfg = getTypeCfg(n.notificationType);
  return (
    <div
      className="stat-card animate-fade-in"
      style={{
        padding: '18px 20px',
        display: 'flex',
        gap: 16,
        alignItems: 'flex-start',
        borderLeft: n.isRead ? 'none' : '3px solid var(--primary)',
        opacity: n.isRead ? 0.82 : 1,
        transition: 'opacity 0.2s ease, border 0.2s ease',
        position: 'relative',
      }}
    >
      {/* Icon */}
      <div style={{
        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
        background: cfg.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: cfg.color,
      }}>
        {cfg.icon}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
              <span style={{ fontWeight: n.isRead ? 600 : 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                {n.title}
              </span>
              {!n.isRead && (
                <span style={{
                  background: 'var(--primary)', color: '#fff',
                  fontSize: '0.6rem', fontWeight: 700,
                  padding: '2px 7px', borderRadius: 999,
                }}>NEW</span>
              )}
              <span style={{
                background: cfg.bg, color: cfg.color,
                fontSize: '0.6rem', fontWeight: 700,
                padding: '2px 7px', borderRadius: 999,
                textTransform: 'uppercase',
              }}>
                {cfg.label}
              </span>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {n.message}
            </div>
          </div>
          {/* Actions */}
          <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
            {!n.isRead && (
              <button
                onClick={() => onMarkRead(n.id)}
                style={{
                  padding: '5px 12px',
                  background: 'var(--primary-tint)',
                  border: '1px solid var(--border)',
                  borderRadius: 8, fontSize: '0.75rem', cursor: 'pointer',
                  fontWeight: 600, color: 'var(--secondary)',
                  transition: 'all 0.15s ease',
                }}
              >
                Mark Read
              </button>
            )}
            <button
              onClick={() => onDelete(n.id)}
              style={{
                padding: '5px 10px',
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 8, fontSize: '0.75rem', cursor: 'pointer',
                color: '#EF4444', fontWeight: 600,
                transition: 'all 0.15s ease',
              }}
            >
              ✕
            </button>
          </div>
        </div>
        {/* Timestamp */}
        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
            🕐 {timeAgo(n.createdAt)}
          </span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
            {formatDate(n.createdAt)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function NotificationsPage() {
  const {
    notifications = [],
    unreadCount = 0,
    loading,
    hasMore,
    markRead,
    markAllRead,
    deleteOne,
    clearAll,
    loadMore,
  } = useNotifications() || {};

  const [filter, setFilter] = useState('all'); // 'all' | 'unread' | 'read'
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let list = notifications;
    if (filter === 'unread') list = list.filter(n => !n.isRead);
    if (filter === 'read')   list = list.filter(n =>  n.isRead);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(n =>
        n.title?.toLowerCase().includes(q) ||
        n.message?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [notifications, filter, search]);

  const filters = [
    { key: 'all',    label: 'All',    count: notifications.length },
    { key: 'unread', label: 'Unread', count: unreadCount },
    { key: 'read',   label: 'Read',   count: notifications.length - unreadCount },
  ];

  return (
    <div style={{ maxWidth: 800 }}>
      {/* Page Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
              <NotifIcon style={{ color: 'var(--primary)', fontSize: 28 }} />
              Notifications
              {unreadCount > 0 && (
                <span style={{
                  background: 'var(--primary)', color: '#fff',
                  borderRadius: 999, padding: '2px 10px',
                  fontSize: '0.75rem', fontWeight: 700,
                }}>
                  {unreadCount} new
                </span>
              )}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: 4, marginBottom: 0 }}>
              Real-time updates from system activities
            </p>
          </div>

          {/* Bulk actions */}
          <div style={{ display: 'flex', gap: 8 }}>
            {unreadCount > 0 && (
              <button
                className="btn btn-ghost"
                style={{ fontSize: '0.82rem', padding: '7px 14px', gap: 6 }}
                onClick={markAllRead}
              >
                <DoneAll style={{ fontSize: 16 }} />
                Mark all read
              </button>
            )}
            {notifications.length > 0 && (
              <button
                className="btn btn-ghost"
                style={{ fontSize: '0.82rem', padding: '7px 14px', gap: 6, color: '#EF4444', borderColor: 'rgba(239,68,68,0.3)' }}
                onClick={clearAll}
              >
                <DeleteSweep style={{ fontSize: 16 }} />
                Clear all
              </button>
            )}
          </div>
        </div>

        {/* Stats row */}
        {notifications.length > 0 && (
          <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
            {[
              { label: 'Total', count: notifications.length, color: '#6B7280' },
              { label: 'Unread', count: unreadCount, color: 'var(--primary)' },
              { label: 'Read', count: notifications.length - unreadCount, color: '#9CA3AF' },
            ].map(s => (
              <div key={s.label} style={{
                padding: '8px 16px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: s.color }}>{s.count}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{s.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filters + Search */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Filter pills */}
        <div style={{
          display: 'flex', background: 'var(--bg-card)',
          border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden',
        }}>
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                padding: '7px 14px',
                background: filter === f.key ? 'var(--primary)' : 'transparent',
                color: filter === f.key ? '#fff' : 'var(--text-secondary)',
                border: 'none', cursor: 'pointer',
                fontWeight: 600, fontSize: '0.82rem',
                transition: 'all 0.15s ease',
                display: 'flex', alignItems: 'center', gap: 5,
              }}
            >
              {f.label}
              <span style={{
                background: filter === f.key ? 'rgba(255,255,255,0.25)' : 'var(--border)',
                color: filter === f.key ? '#fff' : 'var(--text-secondary)',
                borderRadius: 999, padding: '1px 6px',
                fontSize: '0.65rem', fontWeight: 700,
              }}>
                {f.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search box */}
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <Search style={{
            position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
            fontSize: 17, color: 'var(--text-secondary)',
          }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search notifications..."
            className="form-input"
            style={{ paddingLeft: 34, paddingTop: 8, paddingBottom: 8 }}
          />
        </div>

        {/* Type filter icon */}
        <div style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem' }}>
          <FilterList style={{ fontSize: 16 }} />
          <span>{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* ── Notification List ── */}
      {loading && notifications.length === 0 ? (
        <div className="stat-card" style={{ padding: 48, textAlign: 'center' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid var(--primary)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Loading notifications...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="stat-card" style={{ padding: 56, textAlign: 'center' }}>
          <NotifIcon style={{ fontSize: 52, color: 'var(--text-secondary)', opacity: 0.3, display: 'block', margin: '0 auto 14px' }} />
          <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', marginBottom: 6 }}>
            {search ? 'No results found' : filter === 'unread' ? 'All caught up!' : 'No notifications'}
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
            {search
              ? `No notifications match "${search}"`
              : filter === 'unread'
                ? 'You have no unread notifications.'
                : 'Notifications will appear here when system events occur.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(n => (
            <NotifCard
              key={n.id}
              n={n}
              onMarkRead={markRead}
              onDelete={deleteOne}
            />
          ))}

          {/* Load more */}
          {hasMore && (
            <div style={{ textAlign: 'center', marginTop: 8 }}>
              <button
                className="btn btn-ghost"
                onClick={loadMore}
                disabled={loading}
                style={{ fontSize: '0.85rem' }}
              >
                {loading ? 'Loading...' : 'Load more notifications'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Spinner keyframes */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

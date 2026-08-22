import { useEffect, useRef, useState } from 'react';
import {
  Menu, DarkMode, LightMode, Logout, AccountCircle,
  Notifications, CheckCircle, Info, Warning, Error as ErrorIcon,
  DoneAll, DeleteSweep, Circle,
} from '@mui/icons-material';
import { IconButton, Tooltip } from '@mui/material';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../hooks/useToast';
import { useNotifications } from '../hooks/useNotifications';

// ── Type config for notification icons / colours ───────────────────────────
const TYPE_CONFIG = {
  ROUTE: { icon: <Info style={{ fontSize: 16 }} />, color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
  BUS_STOP: { icon: <Circle style={{ fontSize: 16 }} />, color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)' },
  BUS: { icon: <Info style={{ fontSize: 16 }} />, color: '#0EA5E9', bg: 'rgba(14,165,233,0.12)' },
  DRIVER: { icon: <Info style={{ fontSize: 16 }} />, color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  FARE: { icon: <Info style={{ fontSize: 16 }} />, color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
  TICKET: { icon: <CheckCircle style={{ fontSize: 16 }} />, color: '#12a150', bg: 'rgba(18,161,80,0.12)' },
  USER: { icon: <Info style={{ fontSize: 16 }} />, color: '#6366F1', bg: 'rgba(99,102,241,0.12)' },
  WARNING: { icon: <Warning style={{ fontSize: 16 }} />, color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  ERROR: { icon: <ErrorIcon style={{ fontSize: 16 }} />, color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
  DEFAULT: { icon: <Info style={{ fontSize: 16 }} />, color: '#6B7280', bg: 'rgba(107,114,128,0.12)' },
};

function getTypeCfg(type) {
  return TYPE_CONFIG[type?.toUpperCase()] || TYPE_CONFIG.DEFAULT;
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function Navbar({ onMenuClick, title }) {
  const { theme, toggleTheme } = useTheme();
  const { user, clearAuth } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { notifications, unreadCount, markRead, markAllRead, deleteOne, clearAll, refresh } = useNotifications() || {};

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const userMenuRef = useRef(null);
  const notifRef = useRef(null);

  // Close menus on outside click
  useEffect(() => {
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, []);

  const handleProfileClick = () => { setUserMenuOpen(false); navigate('/profile'); };
  const handleLogout = () => {
    setUserMenuOpen(false);
    showToast({ type: 'logout' });
    setTimeout(() => { clearAuth(); navigate('/login', { replace: true }); }, 1800);
  };

  const handleNotifClick = (n) => {
    if (!n.isRead) markRead?.(n.id);
    setNotifOpen(false);
    navigate('/notifications');
  };

  const recentNotifs = (notifications || []).slice(0, 5);

  return (
    <header className="navbar">
      {/* Left: menu toggle + title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <Tooltip title="Toggle Sidebar">
          <IconButton
            onClick={onMenuClick}
            size="small"
            sx={{
              color: '#6B7280', background: '#F8FAFC', borderRadius: '10px',
              width: 38, height: 38, border: '1px solid #E5E7EB',
              '&:hover': { background: '#F1F5F9', color: '#0F172A' },
            }}
          >
            <Menu />
          </IconButton>
        </Tooltip>
        <div>
          <h1 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#111827', margin: 0, lineHeight: 1.2 }}>
            {title}
          </h1>
          <div style={{ fontSize: '0.68rem', color: '#6B7280', marginTop: 1, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            ZanUsafiri Transport System
          </div>
        </div>
      </div>

      {/* Right: actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Theme toggle */}
        <Tooltip title={theme === 'light' ? 'Dark Mode' : 'Light Mode'}>
          <IconButton
            onClick={toggleTheme}
            size="small"
            sx={{ color: '#6B7280', '&:hover': { color: '#0F172A', background: '#F1F5F9', borderRadius: '10px' } }}
          >
            {theme === 'light' ? <DarkMode fontSize="small" /> : <LightMode fontSize="small" />}
          </IconButton>
        </Tooltip>

        {/* ── Notification Bell ── */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <Tooltip title="Notifications">
            <button
              id="notification-bell-btn"
              onClick={() => { setNotifOpen(v => !v); if (!notifOpen) refresh?.(); }}
              style={{
                position: 'relative',
                width: 38, height: 38,
                borderRadius: 10,
                background: notifOpen ? '#F1F5F9' : 'transparent',
                border: notifOpen ? '1px solid #E5E7EB' : '1px solid transparent',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#6B7280',
                transition: 'all 0.18s ease',
              }}
            >
              <Notifications style={{ fontSize: 20 }} />
              {/* Unread badge */}
              {(unreadCount ?? 0) > 0 && (
                <span style={{
                  position: 'absolute',
                  top: 4, right: 4,
                  minWidth: 16, height: 16,
                  borderRadius: 999,
                  background: '#12a150',
                  color: '#fff',
                  fontSize: '0.6rem',
                  fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 3px',
                  border: '1.5px solid #fff',
                  lineHeight: 1,
                  animation: 'notifBadgePop 0.3s cubic-bezier(0.34,1.56,0.64,1) both',
                }}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
          </Tooltip>

          {/* ── Notification Dropdown ── */}
          {notifOpen && (
            <div
              id="notification-dropdown"
              style={{
                position: 'absolute',
                top: 'calc(100% + 10px)',
                right: 0,
                width: 'min(380px, calc(100vw - 32px))',
                background: '#fff',
                borderRadius: 16,
                border: '1px solid #E5E7EB',
                boxShadow: '0 20px 60px rgba(15,23,42,0.15)',
                zIndex: 200,
                overflow: 'hidden',
                animation: 'notifDropIn 0.2s cubic-bezier(0.2,0.8,0.2,1) both',
              }}
            >
              {/* Header */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 16px 12px',
                borderBottom: '1px solid #F1F5F9',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Notifications style={{ fontSize: 18, color: '#12a150' }} />
                  <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#111827' }}>
                    Notifications
                  </span>
                  {(unreadCount ?? 0) > 0 && (
                    <span style={{
                      background: '#12a150', color: '#fff',
                      fontSize: '0.65rem', fontWeight: 700,
                      padding: '2px 7px', borderRadius: 999,
                    }}>
                      {unreadCount} unread
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {(unreadCount ?? 0) > 0 && (
                    <Tooltip title="Mark all read">
                      <button
                        onClick={() => markAllRead?.()}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center' }}
                      >
                        <DoneAll style={{ fontSize: 18 }} />
                      </button>
                    </Tooltip>
                  )}
                  {(notifications?.length ?? 0) > 0 && (
                    <Tooltip title="Clear all">
                      <button
                        onClick={() => clearAll?.()}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center' }}
                      >
                        <DeleteSweep style={{ fontSize: 18 }} />
                      </button>
                    </Tooltip>
                  )}
                </div>
              </div>

              {/* Notification list */}
              <div style={{ maxHeight: 340, overflowY: 'auto' }}>
                {recentNotifs.length === 0 ? (
                  <div style={{ padding: '36px 16px', textAlign: 'center', color: '#9CA3AF' }}>
                    <Notifications style={{ fontSize: 36, opacity: 0.3, display: 'block', margin: '0 auto 8px' }} />
                    <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>No notifications yet</div>
                    <div style={{ fontSize: '0.75rem', marginTop: 4 }}>Actions you take will appear here</div>
                  </div>
                ) : recentNotifs.map((n, i) => {
                  const cfg = getTypeCfg(n.notificationType);
                  return (
                    <div
                      key={n.id}
                      onClick={() => handleNotifClick(n)}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 12,
                        padding: '12px 16px',
                        background: n.isRead ? '#fff' : 'var(--primary-tint)',
                        borderBottom: i < recentNotifs.length - 1 ? '1px solid #F8FAFC' : 'none',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                      onMouseLeave={e => e.currentTarget.style.background = n.isRead ? '#fff' : 'var(--primary-tint)'}
                    >
                      {/* Icon */}
                      <div style={{
                        width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                        background: cfg.bg,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: cfg.color,
                      }}>
                        {cfg.icon}
                      </div>
                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 4 }}>
                          <div style={{ fontWeight: n.isRead ? 500 : 700, fontSize: '0.82rem', color: '#111827', lineHeight: 1.3 }}>
                            {n.title}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: '#9CA3AF', whiteSpace: 'nowrap', flexShrink: 0 }}>
                            {timeAgo(n.createdAt)}
                          </div>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: 2, lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {n.message}
                        </div>
                      </div>
                      {/* Unread dot */}
                      {!n.isRead && (
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#12a150', flexShrink: 0, marginTop: 6 }} />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div style={{ borderTop: '1px solid #F1F5F9', padding: '10px 16px' }}>
                <button
                  onClick={() => { setNotifOpen(false); navigate('/notifications'); }}
                  style={{
                    width: '100%', padding: '9px 0',
                    background: 'linear-gradient(135deg, #12a150, #0b3d24)',
                    color: '#fff', border: 'none', borderRadius: 10,
                    fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
                    transition: 'opacity 0.18s ease',
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                  View All Notifications
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── User Menu ── */}
        <div className="user-menu" ref={userMenuRef}>
          <button
            className={`navbar-avatar-trigger ${userMenuOpen ? 'active' : ''}`}
            type="button"
            aria-haspopup="menu"
            aria-expanded={userMenuOpen}
            onClick={() => setUserMenuOpen(prev => !prev)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 12px 6px 6px', borderRadius: 12,
              background: userMenuOpen ? '#F1F5F9' : '#F8FAFC',
              border: '1px solid #E5E7EB', cursor: 'pointer',
              transition: 'all 0.2s ease', width: 'auto', height: 'auto',
            }}
          >
            <span style={{
              width: 30, height: 30, borderRadius: 8,
              background: 'linear-gradient(135deg, #12a150, #0b3d24)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#ffffff', fontWeight: 800, fontSize: '0.8rem', flexShrink: 0,
            }}>
              {user?.fullName?.charAt(0) || 'U'}
            </span>
            <span style={{ color: '#111827', fontSize: '0.82rem', fontWeight: 600, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.fullName?.split(' ')[0]}
            </span>
          </button>

          <div className={`user-dropdown ${userMenuOpen ? 'open' : ''}`} role="menu">
            <div className="user-dropdown-header" style={{ background: 'linear-gradient(135deg, rgba(18,161,80,0.06), rgba(15,122,99,0.04))', borderRadius: 10, margin: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 8px 10px' }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: 'linear-gradient(135deg, #12a150, #0b3d24)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#ffffff', fontWeight: 800, fontSize: '1rem', flexShrink: 0,
                }}>
                  {user?.fullName?.charAt(0) || 'U'}
                </div>
                <div>
                  <div className="user-dropdown-name">{user?.fullName || 'User'}</div>
                  <div className="user-dropdown-role">{user?.role === 'TRANSPORT_OFFICER' ? 'Transport Officer' : (user?.role || 'User')}</div>
                </div>
              </div>
            </div>
            <button className="user-dropdown-item" type="button" role="menuitem" onClick={handleProfileClick}>
              <span className="user-dropdown-icon"><AccountCircle style={{ fontSize: 18 }} /></span>
              <span>My Profile</span>
            </button>
            <div className="user-dropdown-divider" />
            <button className="user-dropdown-item user-dropdown-logout" type="button" role="menuitem" onClick={handleLogout}>
              <span className="user-dropdown-icon"><Logout style={{ fontSize: 18 }} /></span>
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Inline keyframes */}
      <style>{`
        @keyframes notifBadgePop {
          from { transform: scale(0); opacity: 0; }
          to   { transform: scale(1); opacity: 1; }
        }
        @keyframes notifDropIn {
          from { opacity: 0; transform: translateY(-8px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </header>
  );
}

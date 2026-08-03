import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Tooltip } from '@mui/material';
import {
  Dashboard, Route, Place, DirectionsBus, Person, Payments,
  AdminPanelSettings, Summarize, AddRoad, FactCheck, CheckCircle, Cancel, Reviews,
  Map as MapIcon, ConfirmationNumber, History, Tune,
} from '@mui/icons-material';
import zanusafiriLogo from '../assets/zanusafiri.png';

const travelNavItems = [
  { to: '/explore', icon: MapIcon, label: 'Explore Map' },
  { to: '/my-tickets', icon: History, label: 'Ticket History' },
];

// Admin nav uses a config array that supports 'link' | 'divider' | 'label' types
const adminNavConfig = [
  { type: 'link', to: '/dashboard',      icon: Dashboard,          label: 'Dashboard' },
  // ── Infrastructure & Settings ──
  { type: 'link', to: '/routes',         icon: Route,              label: 'Routes', end: true },
  { type: 'link', to: '/stops',          icon: Place,              label: 'Bus Stops' },
  { type: 'link', to: '/route-settings', icon: Tune,               label: 'Route Settings' },
  // ── Resources ──
  { type: 'link', to: '/drivers',        icon: Person,             label: 'Drivers' },
  // ── Operations ──
  { type: 'link', to: '/tickets',        icon: ConfirmationNumber, label: 'Tickets' },
  { type: 'link', to: '/reports',        icon: Summarize,          label: 'Reports' },
  // ── Administration ──
  { type: 'divider' },
  { type: 'link', to: '/users',          icon: AdminPanelSettings, label: 'User Management' },
];

const transportOfficerNavItems = [
  { to: '/dashboard',       icon: Dashboard,   label: 'Dashboard' },
  ...travelNavItems,
  { to: '/create-route',    icon: AddRoad,     label: 'Create Route Map' },
  { to: '/pending-routes',  icon: Reviews,     label: 'Pending Routes' },
  { to: '/approved-routes', icon: CheckCircle, label: 'Approved Routes' },
  { to: '/rejected-routes', icon: Cancel,      label: 'Rejected Routes' },
  { to: '/route-reviews',   icon: FactCheck,   label: 'Route Reviews' },
  { to: '/reports',         icon: Summarize,   label: 'Reports' },
  { to: '/profile',         icon: Person,      label: 'Profile' },
];

const roleColors = {
  ADMIN: { bg: 'rgba(63,175,74,0.22)', color: '#a7f3d0' },
  TRANSPORT_OFFICER: { bg: 'rgba(245,158,11,0.22)', color: '#fde68a' },
};

function NavItem({ item, collapsed, onClick, pathname }) {
  const Icon = item.icon;
  const link = (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onClick}
      className={({ isActive }) =>
        `sidebar-link ${isActive || item.isActive?.(pathname) ? 'active' : ''} ${collapsed ? 'sidebar-link-collapsed' : ''}`
      }
    >
      <span className="sidebar-link-icon">
        <Icon style={{ fontSize: 20 }} />
      </span>
      {!collapsed && <span className="sidebar-link-label">{item.label}</span>}
    </NavLink>
  );

  return collapsed
    ? (
      <Tooltip title={item.label} placement="right" arrow>
        <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
          {link}
        </div>
      </Tooltip>
    )
    : link;
}

export default function Sidebar({ open, onClose, collapsed }) {
  const { user, isAdmin } = useAuth();
  const location = useLocation();

  // For admin: use the rich config; for officers: wrap plain items as 'link' entries
  const navConfig = isAdmin()
    ? adminNavConfig
    : transportOfficerNavItems.map(item => ({ type: 'link', ...item }));

  const roleBadge = roleColors[user?.role] || roleColors.TRANSPORT_OFFICER;
  const roleLabel = user?.role === 'ADMIN' ? 'Admin' : 'Transport Officer';

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(15,23,42,0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 99,
          }}
          onClick={onClose}
        />
      )}

      <aside className={`sidebar ${open ? 'open' : ''} ${collapsed ? 'sidebar-collapsed' : ''}`}>

        {/* Header: logo */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding: collapsed ? '16px 0' : '16px 18px',
          borderBottom: '1px solid rgba(255,255,255,0.09)',
          minHeight: 66,
          flexShrink: 0,
          gap: 12,
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 11, flexShrink: 0,
            overflow: 'hidden',
            boxShadow: '0 4px 16px rgba(63,175,74,0.5)',
          }}>
            <img src={zanusafiriLogo} alt="ZanUsafiri" style={{ width: 38, height: 38, objectFit: 'cover', display: 'block' }} />
          </div>
          {!collapsed && (
            <div style={{ overflow: 'hidden' }}>
              <div style={{
                color: 'white', fontWeight: 800, fontSize: '1rem',
                lineHeight: 1.2, whiteSpace: 'nowrap', letterSpacing: '-0.3px',
              }}>ZanUsafiri</div>
              <div style={{
                color: 'rgba(255,255,255,0.45)', fontSize: '0.66rem', marginTop: 2,
                textTransform: 'uppercase', letterSpacing: '0.08em',
              }}>
                Transport Portal
              </div>
            </div>
          )}
        </div>

        {/* User card */}
        {collapsed ? (
          <Tooltip title={`${user?.fullName} · ${user?.role}`} placement="right" arrow>
            <div style={{
              margin: '12px auto 4px',
              width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
              background: '#0F172A',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#ffffff', fontWeight: 800, fontSize: 15, cursor: 'default',
              boxShadow: '0 4px 12px rgba(15,23,42,0.45)',
            }}>
              {user?.fullName?.charAt(0) || 'U'}
            </div>
          </Tooltip>
        ) : (
          <div style={{
            margin: '10px 12px 4px',
            padding: '12px 14px',
            borderRadius: 12,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.08)',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, #3FAF4A, #2E8B3D)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#ffffff', fontWeight: 800, fontSize: 15,
                boxShadow: '0 4px 12px rgba(63,175,74,0.45)',
              }}>
                {user?.fullName?.charAt(0) || 'U'}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{
                  color: 'white', fontWeight: 700, fontSize: '0.85rem',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {user?.fullName}
                </div>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', marginTop: 4,
                  background: roleBadge.bg,
                  color: roleBadge.color,
                  fontSize: '0.6rem', fontWeight: 700,
                  padding: '2px 8px', borderRadius: 999, letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}>
                  {roleLabel}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav style={{
          flex: 1,
          marginTop: 10,
          overflowY: 'auto',
          overflowX: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          alignItems: collapsed ? 'center' : 'stretch',
        }}>
          {!collapsed && (
            <div className="sidebar-section-label">Main Menu</div>
          )}

          {navConfig.map((entry, idx) => {
            if (entry.type === 'divider') {
              return (
                <div
                  key={`divider-${idx}`}
                  className="sidebar-divider"
                  style={collapsed ? { width: '60%', margin: '8px auto' } : undefined}
                />
              );
            }
            if (entry.type === 'label' && !collapsed) {
              return (
                <div key={`label-${idx}`} className="sidebar-section-label" style={{ marginTop: 4 }}>
                  {entry.text}
                </div>
              );
            }
            if (entry.type === 'link') {
              return (
                <NavItem
                  key={entry.to}
                  item={entry}
                  collapsed={collapsed}
                  onClick={onClose}
                  pathname={location.pathname}
                />
              );
            }
            return null;
          })}
        </nav>

        {/* Footer version */}
        {!collapsed && (
          <div style={{
            padding: '12px 20px',
            borderTop: '1px solid rgba(255,255,255,0.07)',
            color: 'rgba(255,255,255,0.22)',
            fontSize: '0.65rem',
            letterSpacing: '0.04em',
          }}>
            ZanUsafiri v2.0 · Smart Transport
          </div>
        )}
      </aside>
    </>
  );
}

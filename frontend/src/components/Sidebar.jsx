import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Tooltip } from '@mui/material';
import {
  Dashboard, Route, Place, Person,
  AdminPanelSettings, Summarize, AddRoad, FactCheck, CheckCircle, Cancel, Reviews,
  Map as MapIcon, ConfirmationNumber, History, Tune, DirectionsBus,
} from '@mui/icons-material';
import zanusafiriLogo from '../assets/zanusafiri.png';

const travelNavItems = [
  { to: '/explore', icon: MapIcon, label: 'Explore Map' },
  { to: '/my-tickets', icon: History, label: 'Ticket History' },
];

const adminNavConfig = [
  { type: 'label', text: 'MAIN' },
  { type: 'link', to: '/dashboard', icon: Dashboard, label: 'Dashboard' },
  { type: 'link', to: '/routes', icon: Route, label: 'Routes', end: true },
  { type: 'link', to: '/stops', icon: Place, label: 'Bus Stops' },
  { type: 'link', to: '/buses', icon: DirectionsBus, label: 'Buses' },

  { type: 'label', text: 'OPERATIONS' },
  { type: 'link', to: '/tickets', icon: ConfirmationNumber, label: 'Tickets' },
  { type: 'link', to: '/reports', icon: Summarize, label: 'Reports' },

  { type: 'label', text: 'SETTINGS' },
  { type: 'link', to: '/route-settings', icon: Tune, label: 'Route Settings' },
  { type: 'link', to: '/drivers', icon: Person, label: 'Drivers' },
  { type: 'link', to: '/users', icon: AdminPanelSettings, label: 'User Management' },
];

const transportOfficerNavItems = [
  { type: 'label', text: 'MAIN' },
  { type: 'link', to: '/dashboard', icon: Dashboard, label: 'Dashboard' },
  ...travelNavItems.map(item => ({ type: 'link', ...item })),

  { type: 'label', text: 'OPERATIONS' },
  { type: 'link', to: '/create-route', icon: AddRoad, label: 'Create Route Map' },
  { type: 'link', to: '/pending-routes', icon: Reviews, label: 'Pending Routes' },
  { type: 'link', to: '/approved-routes', icon: CheckCircle, label: 'Approved Routes' },
  { type: 'link', to: '/rejected-routes', icon: Cancel, label: 'Rejected Routes' },
  { type: 'link', to: '/route-reviews', icon: FactCheck, label: 'Route Reviews' },
  { type: 'link', to: '/reports', icon: Summarize, label: 'Reports' },

  { type: 'label', text: 'SETTINGS' },
  { type: 'link', to: '/profile', icon: Person, label: 'Profile' },
];

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
        <Icon style={{ fontSize: 19 }} />
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

  const navConfig = isAdmin() ? adminNavConfig : transportOfficerNavItems;
  const roleLabel = user?.role === 'ADMIN' ? 'ADMIN' : 'OFFICER';

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
          borderBottom: '1px solid var(--border)',
          minHeight: 64,
          flexShrink: 0,
          gap: 12,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            overflow: 'hidden',
            boxShadow: '0 4px 12px rgba(34,197,94,0.3)',
          }}>
            <img src={zanusafiriLogo} alt="ZanUsafiri" style={{ width: 36, height: 36, objectFit: 'cover', display: 'block' }} />
          </div>
          {!collapsed && (
            <div style={{ overflow: 'hidden' }}>
              <div style={{
                color: 'var(--text-primary)', fontWeight: 800, fontSize: '1.02rem',
                lineHeight: 1.2, whiteSpace: 'nowrap', letterSpacing: '-0.3px',
              }}>ZanUsafiri</div>
              <div style={{
                color: 'var(--text-secondary)', fontSize: '0.62rem', marginTop: 1,
                textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700,
              }}>
                TRANSPORT PORTAL
              </div>
            </div>
          )}
        </div>

        {/* User card */}
        {collapsed ? (
          <Tooltip title={`${user?.fullName} · ${user?.role}`} placement="right" arrow>
            <div style={{
              margin: '12px auto 4px',
              width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
              background: '#12a150',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#ffffff', fontWeight: 800, fontSize: 14, cursor: 'default',
              boxShadow: '0 4px 12px rgba(18,161,80,0.35)',
            }}>
              {user?.fullName?.charAt(0) || 'S'}
            </div>
          </Tooltip>
        ) : (
          <div style={{
            margin: '12px 14px 6px',
            padding: '12px 14px',
            borderRadius: 14,
            background: 'linear-gradient(135deg, #12a150 0%, #0b3d24 100%)',
            boxShadow: 'var(--shadow-md)',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                background: '#ffffff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#0b3d24', fontWeight: 800, fontSize: 14,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}>
                {user?.fullName?.charAt(0) || 'S'}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{
                  color: '#ffffff', fontWeight: 800, fontSize: '0.85rem',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {user?.fullName || 'System Administrator'}
                </div>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', marginTop: 3,
                  background: 'rgba(255,255,255,0.25)',
                  color: '#ffffff',
                  fontSize: '0.62rem', fontWeight: 800,
                  padding: '2px 7px', borderRadius: 999, letterSpacing: '0.06em',
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
          marginTop: 6,
          overflowY: 'auto',
          overflowX: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          alignItems: collapsed ? 'center' : 'stretch',
        }}>
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
                <div key={`label-${idx}`} className="sidebar-section-label" style={{ marginTop: idx === 0 ? 4 : 14 }}>
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
            padding: '12px 18px',
            borderTop: '1px solid var(--border)',
            color: 'var(--text-secondary)',
            fontSize: '0.66rem',
            letterSpacing: '0.04em',
            fontWeight: 500
          }}>
            ZanUsafiri v2.0 · Smart Transport
          </div>
        )}
      </aside>
    </>
  );
}

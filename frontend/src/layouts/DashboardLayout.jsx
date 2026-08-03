import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';

const pageTitles = {
  '/dashboard': 'Dashboard',
  '/routes': 'Route Management',
  '/stops': 'Bus Stop Management',
  '/buses': 'Bus Management',
  '/drivers': 'Driver Management',
  '/fares': 'Fare Management',
  '/reports': 'Reports Management',
  '/settings': 'Settings',
  '/notifications': 'Notifications',
  '/audit-logs': 'Audit Logs',
  '/users': 'User Management',
  '/profile': 'My Profile',
  '/create-route': 'Create Route',
  '/view-routes': 'Generated Routes',
  '/pending-routes': 'Pending Routes',
  '/approved-routes': 'Approved Routes',
  '/rejected-routes': 'Rejected Routes',
  '/route-reviews': 'Route Reviews',
};

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();
  const title = pageTitles[location.pathname] || 'ZanUsafiri';

  const handleMenuClick = () => {
    if (window.innerWidth <= 768) {
      setSidebarOpen(prev => !prev);
    } else {
      setSidebarCollapsed(prev => !prev);
    }
  };

  return (
    <div className="admin-portal" style={{ display: 'flex', minHeight: '100vh', background: 'var(--admin-bg-light)' }}>
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
      />
      <div className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`} style={{ flex: 1 }}>
        <Navbar onMenuClick={handleMenuClick} title={title} />
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

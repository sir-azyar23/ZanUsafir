import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRoutes, getBusStops, getBuses, getDrivers, getFares, getUsers, getGeneratedRoutes } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import {
  AddRoad,
  AdminPanelSettings,
  CheckCircle,
  DirectionsBus,
  FactCheck,
  LocalAtm,
  MapOutlined,
  People,
  Person,
  Place,
  Refresh,
  Route,
  Summarize,
  WarningAmber,
} from '@mui/icons-material';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { chartPalette } from '../theme';

const COLORS = chartPalette;

const normalizeList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

function StatCard({ icon, label, value, helper, tone = 'primary' }) {
  const toneMap = {
    primary: { bg: 'linear-gradient(135deg, rgba(63,175,74,0.12), rgba(56,189,248,0.08))', color: '#3FAF4A' },
    warning: { bg: 'rgba(245,158,11,0.1)', color: '#b45309' },
    info:    { bg: 'rgba(56,189,248,0.12)', color: '#0284C7' },
    success: { bg: 'rgba(63,175,74,0.12)', color: '#2E8B3D' },
  };
  const t = toneMap[tone] || toneMap.primary;
  return (
    <div className="stat-card animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14 }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ color: '#6B7280', fontSize: '0.72rem', fontWeight: 800, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</p>
          <p style={{ fontSize: '2.1rem', fontWeight: 900, color: '#111827', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</p>
          {helper && <p style={{ fontSize: '0.74rem', color: '#6B7280', marginTop: 8, fontWeight: 500 }}>{helper}</p>}
        </div>
        <div style={{
          width: 50, height: 50, borderRadius: 14,
          background: t.bg, color: t.color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, fontSize: 24,
        }}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="stat-card" style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 12, color: '#92400e', background: '#fff7ed', borderColor: '#fed7aa' }}>
      <WarningAmber />
      <strong>{message}</strong>
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, isAdmin, isTransportOfficer } = useAuth();
  const admin = isAdmin();
  const transportOfficer = isTransportOfficer();
  const [stats, setStats] = useState({
    routes: 0,
    stops: 0,
    buses: 0,
    drivers: 0,
    fares: 0,
    users: 0,
    generatedRoutes: 0,
  });
  const [routeStatusData, setRouteStatusData] = useState([]);
  const [fleetStatusData, setFleetStatusData] = useState([]);
  const [routeReviewStats, setRouteReviewStats] = useState({ pending: 0, approved: 0, rejected: 0, active: 0 });
  const [loadingStats, setLoadingStats] = useState(true);

  const loadDashboardData = useCallback(async () => {
    setLoadingStats(true);

    const requests = [
      getRoutes(),
      getBusStops(),
      getBuses(),
      getDrivers(),
      getFares(),
      getGeneratedRoutes(),
      ...(admin ? [getUsers()] : []),
    ];

    const results = await Promise.allSettled(requests);
    const routes = results[0].status === 'fulfilled' ? normalizeList(results[0].value.data) : [];
    const stops = results[1].status === 'fulfilled' ? normalizeList(results[1].value.data) : [];
    const buses = results[2].status === 'fulfilled' ? normalizeList(results[2].value.data) : [];
    const drivers = results[3].status === 'fulfilled' ? normalizeList(results[3].value.data) : [];
    const fares = results[4].status === 'fulfilled' ? normalizeList(results[4].value.data) : [];
    const generatedRoutes = results[5].status === 'fulfilled' ? normalizeList(results[5].value.data) : [];
    const users = admin && results[6]?.status === 'fulfilled' ? normalizeList(results[6].value.data) : [];

    setStats({
      routes: routes.length,
      stops: stops.length,
      buses: buses.length,
      drivers: drivers.length,
      fares: fares.length,
      users: users.length,
      generatedRoutes: generatedRoutes.length,
    });

    setRouteReviewStats({
      pending: generatedRoutes.filter(route => route.status === 'SUBMITTED').length,
      approved: generatedRoutes.filter(route => route.status === 'APPROVED').length,
      rejected: generatedRoutes.filter(route => route.status === 'REJECTED').length,
      active: generatedRoutes.filter(route => route.status === 'ACTIVE').length,
    });

    setRouteStatusData(['ACTIVE', 'INACTIVE', 'SUSPENDED'].map(status => ({
      name: status,
      value: routes.filter(route => route.status === status).length,
    })));

    setFleetStatusData(['ACTIVE', 'INACTIVE', 'MAINTENANCE'].map(status => ({
      name: status,
      value: buses.filter(bus => bus.status === status).length,
    })));

    setLoadingStats(false);
  }, [admin]);

  useEffect(() => {
    queueMicrotask(() => loadDashboardData());
  }, [loadDashboardData]);

  useEffect(() => {
    const handleRefresh = () => loadDashboardData();
    window.addEventListener('focus', handleRefresh);
    window.addEventListener('zanusafiri:data-refresh', handleRefresh);
    return () => {
      window.removeEventListener('focus', handleRefresh);
      window.removeEventListener('zanusafiri:data-refresh', handleRefresh);
    };
  }, [loadDashboardData]);

  const masterDataReady = stats.routes > 0 && stats.stops > 0;
  const routeActivity = useMemo(() => ([
    { label: 'Routes', value: stats.routes },
    { label: 'Stops', value: stats.stops },
    { label: 'Fares', value: stats.fares },
    { label: 'Generated', value: stats.generatedRoutes },
  ]), [stats]);

  const refreshDashboard = () => {
    window.dispatchEvent(new CustomEvent('zanusafiri:data-refresh'));
    loadDashboardData();
  };

  return (
    <div>
      <div className="page-hero" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap', marginBottom: 26 }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h2 style={{ color: 'white', fontSize: '1.5rem', fontWeight: 800, margin: '0 0 8px' }}>
            {admin ? '🚌 Admin Master Data Center' : '🔍 Transport Officer Review & Route Center'}
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.75)', margin: '0 0 14px', fontSize: '0.9rem', maxWidth: 600, lineHeight: 1.55 }}>
            {admin
              ? 'Prepare routes, stops, buses, drivers, fares, and users so transport officers can generate route maps and reports.'
              : 'Create route maps, review submitted routes, inspect complete setup details, or approve routes.'}
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
            <span className="badge badge-success" style={{ background: 'rgba(57,181,74,0.25)', color: '#a7f3d0', border: '1px solid rgba(57,181,74,0.4)', fontSize: '0.75rem' }}>
              <CheckCircle style={{ fontSize: 14 }} /> {masterDataReady ? 'Route data ready' : 'Master data needed'}
            </span>
            <span className="badge badge-info" style={{ background: 'rgba(255,255,255,0.15)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.2)' }}>{user?.role === 'TRANSPORT_OFFICER' ? 'Transport Officer' : user?.role}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
          <button type="button" className="btn btn-ghost" onClick={refreshDashboard} disabled={loadingStats}
            style={{ color: 'rgba(255,255,255,0.85)', borderColor: 'rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.1)' }}>
            <Refresh fontSize="small" />
            {loadingStats ? 'Reloading...' : 'Reload Data'}
          </button>
          <button type="button" className="btn btn-primary" onClick={() => navigate(admin ? '/routes' : '/pending-routes')}>
            {admin ? <Route fontSize="small" /> : <FactCheck fontSize="small" />}
            {admin ? 'Manage Routes' : 'Review Routes'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 18, marginBottom: 24 }}>
        <StatCard icon={<Route />} label="Total Routes" value={loadingStats ? '...' : stats.routes} helper={admin ? 'Basic route records' : 'Available to select'} />
        <StatCard icon={<Place />} label="Total Bus Stops" value={loadingStats ? '...' : stats.stops} helper={admin ? 'Prepared stop records' : 'Available for ordering'} />
        <StatCard icon={<DirectionsBus />} label="Total Buses" value={loadingStats ? '...' : stats.buses} helper={admin ? 'Fleet records' : 'Assigned fleet data'} />
        <StatCard icon={<Person />} label="Total Drivers" value={loadingStats ? '...' : stats.drivers} helper={admin ? 'Driver records' : 'Available assignments'} />
        {admin && <StatCard icon={<LocalAtm />} label="Total Fares" value={loadingStats ? '...' : stats.fares} helper="Fare records" />}
        {admin && <StatCard icon={<AdminPanelSettings />} label="Total Users" value={loadingStats ? '...' : stats.users} helper="Admin and Officer users" />}
        {!admin && <StatCard icon={<FactCheck />} label="Total Pending Routes" value={loadingStats ? '...' : routeReviewStats.pending} helper="Awaiting Approval" />}
        {!admin && <StatCard icon={<CheckCircle />} label="Total Approved Routes" value={loadingStats ? '...' : routeReviewStats.approved} helper="Reviewed and approved" />}
        {!admin && <StatCard icon={<WarningAmber />} label="Total Rejected Routes" value={loadingStats ? '...' : routeReviewStats.rejected} helper="Returned with feedback" tone="warning" />}
        {!admin && <StatCard icon={<Route />} label="Total Active Routes" value={loadingStats ? '...' : routeReviewStats.active} helper="Ready for operation" />}
      </div>

      {!admin && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
          {[
            { icon: <AddRoad />, title: 'Create Route Map', text: 'Select an Admin-prepared route and choose bus stops.', path: '/create-route', color: '#1E7D3A' },
            { icon: <FactCheck />, title: 'Pending Routes', text: 'Review routes submitted for approval.', path: '/pending-routes', color: '#39B54A' },
            { icon: <CheckCircle />, title: 'Approved Routes', text: 'View routes that passed review.', path: '/approved-routes', color: '#0d5fa0' },
            { icon: <Summarize />, title: 'Reports', text: 'Generate reports from route records.', path: '/reports', color: '#36A9E1' },
          ].map(item => (
            <button key={item.title} type="button" className="quick-action-card" onClick={() => navigate(item.path)}>
              <span className="quick-action-card-icon" style={{ background: `rgba(${item.color === '#1E7D3A' ? '30,125,58' : item.color === '#39B54A' ? '57,181,74' : item.color === '#0d5fa0' ? '13,95,160' : '54,169,225'},0.12)`, color: item.color }}>{item.icon}</span>
              <strong style={{ color: 'var(--text-primary)', fontSize: '0.95rem' }}>{item.title}</strong>
              <span style={{ color: 'var(--text-secondary)', fontSize: '.82rem', lineHeight: 1.45 }}>{item.text}</span>
            </button>
          ))}
        </div>
      )}

      <div className="dashboard-chart-grid">
        <div className="stat-card">
          <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: 18, color: 'var(--text-primary)' }}>
            {admin ? 'Master Data Readiness' : 'Available Route Data'}
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={routeActivity}>
              <defs>
                <linearGradient id="colorRoutes" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10 }} />
              <Area type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={2.5} fill="url(#colorRoutes)" dot={{ fill: 'var(--primary)', r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="stat-card">
          <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: 18, color: 'var(--text-primary)' }}>
            {admin ? 'Route Status' : 'Fleet Status'}
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={(admin ? routeStatusData : fleetStatusData).some(item => item.value > 0) ? (admin ? routeStatusData : fleetStatusData) : [{ name: 'No Data', value: 1 }]}
                cx="50%"
                cy="50%"
                innerRadius={58}
                outerRadius={86}
                paddingAngle={4}
                dataKey="value"
              >
                {((admin ? routeStatusData : fleetStatusData).length ? (admin ? routeStatusData : fleetStatusData) : [{ name: 'No Data', value: 1 }]).map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10 }} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

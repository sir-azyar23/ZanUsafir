import { useState, useEffect, useMemo } from 'react';
import { getRoutes, getBuses, getBusStops, updateRouteSettings } from '../services/api';
import {
  DirectionsBus, Place, People, CheckCircle, Refresh, Payments,
  School, Person, Elderly, Search, Edit, RestartAlt, Check, Info,
  Add, Remove,
} from '@mui/icons-material';
import toast from 'react-hot-toast';

/* ── Stat Card ── */
function StatCard({ icon, iconBg, iconColor, label, value, subtitle }) {
  return (
    <div className="rs-stat-card">
      <div className="rs-stat-icon" style={{ background: iconBg, color: iconColor }}>
        {icon}
      </div>
      <div>
        <p className="rs-stat-label">{label}</p>
        <p className="rs-stat-value">{value}</p>
        <p className="rs-stat-sub">{subtitle}</p>
      </div>
    </div>
  );
}

export default function RouteSettingsPage() {
  const [routes, setRoutes] = useState([]);
  const [buses, setBuses] = useState([]);
  const [stops, setStops] = useState([]);
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tableSearch, setTableSearch] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [tablePage, setTablePage] = useState(0);
  const ROWS_PER_PAGE = 5;

  // Form State
  const [studentFare, setStudentFare] = useState(500);
  const [adultFare, setAdultFare] = useState(1000);
  const [seniorFare, setSeniorFare] = useState(300);
  const [assignedBusesCount, setAssignedBusesCount] = useState(15);

  const loadData = async () => {
    try {
      setLoading(true);
      const [routesRes, busesRes, stopsRes] = await Promise.all([
        getRoutes(),
        getBuses().catch(() => ({ data: [] })),
        getBusStops().catch(() => ({ data: [] })),
      ]);

      const loadedRoutes = Array.isArray(routesRes.data)
        ? routesRes.data
        : Array.isArray(routesRes.data?.content)
        ? routesRes.data.content
        : [];
      setRoutes(loadedRoutes);

      const loadedBuses = Array.isArray(busesRes.data)
        ? busesRes.data
        : Array.isArray(busesRes.data?.content)
        ? busesRes.data.content
        : [];
      setBuses(loadedBuses);

      const loadedStops = Array.isArray(stopsRes.data)
        ? stopsRes.data
        : Array.isArray(stopsRes.data?.content)
        ? stopsRes.data.content
        : [];
      setStops(loadedStops);

      if (loadedRoutes.length > 0) {
        const initialSelected = selectedRouteId
          ? loadedRoutes.find((r) => String(r.id) === String(selectedRouteId)) || loadedRoutes[0]
          : loadedRoutes[0];
        setSelectedRouteId(String(initialSelected.id));
        populateForm(initialSelected);
      }
    } catch (err) {
      console.error('Failed to load route settings data:', err);
      setErrorMessage('Failed to load route system data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const populateForm = (route) => {
    if (!route) return;
    setStudentFare(route.studentFare ?? 500);
    setAdultFare(route.adultFare ?? 1000);
    setSeniorFare(route.seniorFare ?? 300);
    setAssignedBusesCount(route.assignedBusesCount ?? route.busCount ?? 15);
  };

  const handleRouteSelect = (routeId) => {
    setSelectedRouteId(String(routeId));
    const found = routes.find((r) => String(r.id) === String(routeId));
    if (found) populateForm(found);
  };

  const selectedRoute = useMemo(
    () => routes.find((r) => String(r.id) === String(selectedRouteId)),
    [routes, selectedRouteId]
  );

  const getRouteCode = (route) => {
    if (!route) return 'R001';
    return route.routeNumber || route.routeCode || `R00${route.id || 1}`;
  };

  const busStopsCount = useMemo(() => {
    if (!selectedRoute) return 4;
    if (Array.isArray(selectedRoute.stops) && selectedRoute.stops.length > 0) return selectedRoute.stops.length;
    if (Array.isArray(selectedRoute.routeStops) && selectedRoute.routeStops.length > 0) return selectedRoute.routeStops.length;
    return stops.length > 0 ? Math.min(4, stops.length) : 4;
  }, [selectedRoute, stops]);

  const handleReset = () => {
    if (selectedRoute) {
      populateForm(selectedRoute);
      toast.success('Form reset to saved route values');
    }
  };

  const handleCancel = () => {
    if (selectedRoute) {
      populateForm(selectedRoute);
      setSuccessMessage('');
      setErrorMessage('');
    }
  };

  const handleSaveSettings = async (e) => {
    if (e) e.preventDefault();
    if (!selectedRouteId || !selectedRoute) return;
    try {
      setSaving(true);
      setSuccessMessage('');
      setErrorMessage('');
      const payload = {
        studentFare: Number(studentFare) || 0,
        adultFare: Number(adultFare) || 0,
        seniorFare: Number(seniorFare) || 0,
        assignedBusesCount: Number(assignedBusesCount) || 1,
      };
      const res = await updateRouteSettings(selectedRouteId, payload);
      const updatedRoute = res.data;
      setRoutes((prev) =>
        prev.map((r) => (String(r.id) === String(selectedRouteId) ? { ...r, ...updatedRoute } : r))
      );
      window.dispatchEvent(new CustomEvent('zanusafiri:data-refresh'));
      toast.success(`Route settings for "${selectedRoute.name}" saved!`);
      setSuccessMessage(`Settings for "${selectedRoute.name}" updated successfully!`);
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      console.error('Failed to update route settings:', err);
      const msg = err.response?.data?.message || 'Failed to save route settings.';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const filteredRoutes = useMemo(() => {
    const q = tableSearch.trim().toLowerCase();
    if (!q) return routes;
    return routes.filter(
      (r) =>
        r.name?.toLowerCase().includes(q) ||
        getRouteCode(r).toLowerCase().includes(q) ||
        (r.startPoint && r.startPoint.toLowerCase().includes(q)) ||
        (r.endPoint && r.endPoint.toLowerCase().includes(q))
    );
  }, [routes, tableSearch]);

  const paginatedRoutes = useMemo(() => {
    const start = tablePage * ROWS_PER_PAGE;
    return filteredRoutes.slice(start, start + ROWS_PER_PAGE);
  }, [filteredRoutes, tablePage]);

  const totalPages = Math.ceil(filteredRoutes.length / ROWS_PER_PAGE);

  if (loading && routes.length === 0) {
    return (
      <div className="rs-page">
        <div className="rs-skeleton" style={{ height: 64 }} />
        <div className="rs-stats-grid">
          {[1, 2, 3, 4].map((i) => <div key={i} className="rs-skeleton" style={{ height: 100 }} />)}
        </div>
        <div className="rs-two-col">
          <div className="rs-skeleton" style={{ height: 280 }} />
          <div className="rs-skeleton" style={{ height: 280 }} />
        </div>
      </div>
    );
  }

  return (
    <div className="rs-page">
      {/* ── Page Header ── */}
      <div className="rs-header">
        <div>
          <h1 className="rs-title">Route Settings</h1>
          <p className="rs-subtitle">
            Manage buses allocation and passenger fare configuration for each transport route.
          </p>
        </div>
        <div className="rs-header-actions">
          <div className="rs-select-wrap">
            <label className="rs-select-label">Select Route</label>
            <select
              value={selectedRouteId}
              onChange={(e) => handleRouteSelect(e.target.value)}
              className="rs-select"
            >
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({getRouteCode(r)})
                </option>
              ))}
            </select>
          </div>
          <button onClick={loadData} disabled={loading} className="rs-refresh-btn">
            <Refresh className={loading ? 'rs-spin' : ''} style={{ fontSize: 18 }} />
            Refresh Data
          </button>
        </div>
      </div>

      {/* ── Alerts ── */}
      {successMessage && (
        <div className="rs-alert rs-alert-success">
          <CheckCircle style={{ fontSize: 18 }} /> {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="rs-alert rs-alert-error">
          <Info style={{ fontSize: 18 }} /> {errorMessage}
        </div>
      )}

      {/* ── Statistics Cards ── */}
      <div className="rs-stats-grid">
        <StatCard
          icon={<DirectionsBus style={{ fontSize: 26 }} />}
          iconBg="rgba(34,197,94,0.12)" iconColor="#22C55E"
          label="Assigned Buses" value={assignedBusesCount}
          subtitle="Buses on this route"
        />
        <StatCard
          icon={<Place style={{ fontSize: 26 }} />}
          iconBg="rgba(139,92,246,0.12)" iconColor="#8B5CF6"
          label="Bus Stops" value={`${busStopsCount} Stops`}
          subtitle="Stops on this route"
        />
        <StatCard
          icon={<People style={{ fontSize: 26 }} />}
          iconBg="rgba(245,158,11,0.12)" iconColor="#F59E0B"
          label="Passenger Categories" value="3 Categories"
          subtitle="Student, Adult, Senior (70+)"
        />
        <StatCard
          icon={<CheckCircle style={{ fontSize: 26 }} />}
          iconBg="rgba(34,197,94,0.12)" iconColor="#22C55E"
          label="Route Status"
          value={
            <span className="rs-status-badge">
              {selectedRoute?.status || 'ACTIVE'}
            </span>
          }
          subtitle="Route is currently active"
        />
      </div>

      {/* ── Fleet + Fare Management ── */}
      <div className="rs-two-col">
        {/* Left: Fleet Management (45%) */}
        <div className="rs-card rs-fleet-card">
          <div className="rs-card-header">
            <div className="rs-card-icon" style={{ background: 'rgba(34,197,94,0.12)', color: '#22C55E' }}>
              <DirectionsBus style={{ fontSize: 22 }} />
            </div>
            <div>
              <h2 className="rs-card-title">Fleet Management</h2>
              <p className="rs-card-desc">Manage the buses assigned to this route.</p>
            </div>
          </div>

          <div className="rs-fleet-body">
            <label className="rs-input-label">Number of Assigned Buses</label>
            <div className="rs-bus-input-row">
              <button
                type="button"
                onClick={() => setAssignedBusesCount((p) => Math.max(1, Number(p) - 1))}
                className="rs-bus-btn rs-bus-btn-minus"
              >
                <Remove style={{ fontSize: 20 }} />
              </button>
              <input
                type="number" min="1" max="200"
                value={assignedBusesCount}
                onChange={(e) => setAssignedBusesCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="rs-bus-input"
              />
              <button
                type="button"
                onClick={() => setAssignedBusesCount((p) => Number(p) + 1)}
                className="rs-bus-btn rs-bus-btn-plus"
              >
                <Add style={{ fontSize: 20 }} />
              </button>
            </div>
          </div>

          <div className="rs-info-alert rs-info-alert-green">
            <Info style={{ fontSize: 16 }} />
            <span>Changing this value automatically updates the buses visible on the Public User portal.</span>
          </div>
        </div>

        {/* Right: Fare Management (55%) */}
        <div className="rs-card rs-fare-card">
          <div className="rs-card-header">
            <div className="rs-card-icon" style={{ background: 'rgba(34,197,94,0.12)', color: '#22C55E' }}>
              <Payments style={{ fontSize: 22 }} />
            </div>
            <div>
              <h2 className="rs-card-title">Passenger Fare Management</h2>
              <p className="rs-card-desc">Set fares for different passenger categories.</p>
            </div>
          </div>

          <div className="rs-fare-cards">
            {/* Student */}
            <div className="rs-fare-item">
              <div className="rs-fare-icon" style={{ background: 'rgba(56,189,248,0.12)', color: '#0EA5E9' }}>
                <School style={{ fontSize: 20 }} />
              </div>
              <h3 className="rs-fare-name">Student</h3>
              <p className="rs-fare-desc">Primary, Secondary and University Students</p>
              <div className="rs-fare-input-wrap">
                <label className="rs-fare-label">Fare (TZS)</label>
                <input
                  type="number" min="0" step="50" value={studentFare}
                  onChange={(e) => setStudentFare(e.target.value)}
                  className="rs-fare-input"
                />
              </div>
            </div>
            {/* Adult */}
            <div className="rs-fare-item">
              <div className="rs-fare-icon" style={{ background: 'rgba(34,197,94,0.12)', color: '#22C55E' }}>
                <Person style={{ fontSize: 20 }} />
              </div>
              <h3 className="rs-fare-name">Adult</h3>
              <p className="rs-fare-desc">Standard Passenger Fare</p>
              <div className="rs-fare-input-wrap">
                <label className="rs-fare-label">Fare (TZS)</label>
                <input
                  type="number" min="0" step="50" value={adultFare}
                  onChange={(e) => setAdultFare(e.target.value)}
                  className="rs-fare-input"
                />
              </div>
            </div>
            {/* Senior */}
            <div className="rs-fare-item">
              <div className="rs-fare-icon" style={{ background: 'rgba(139,92,246,0.12)', color: '#8B5CF6' }}>
                <Elderly style={{ fontSize: 20 }} />
              </div>
              <h3 className="rs-fare-name">Senior Citizen (70+)</h3>
              <p className="rs-fare-desc">Citizens aged 70 years and above</p>
              <div className="rs-fare-input-wrap">
                <label className="rs-fare-label">Fare (TZS)</label>
                <input
                  type="number" min="0" step="50" value={seniorFare}
                  onChange={(e) => setSeniorFare(e.target.value)}
                  className="rs-fare-input"
                />
              </div>
            </div>
          </div>

          <div className="rs-info-alert rs-info-alert-blue">
            <Info style={{ fontSize: 16 }} />
            <span>These fares are automatically displayed to Public Users and used during ticket booking.</span>
          </div>
        </div>
      </div>

      {/* ── Route Configuration Summary Table ── */}
      <div className="rs-card">
        <div className="rs-table-header">
          <div>
            <h3 className="rs-card-title">Route Configuration Summary</h3>
            <p className="rs-card-desc">Overview of fares and fleet capacity for all routes</p>
          </div>
          <div className="rs-search-wrap">
            <Search style={{ fontSize: 16 }} className="rs-search-icon" />
            <input
              type="text" placeholder="Search route..."
              value={tableSearch}
              onChange={(e) => { setTableSearch(e.target.value); setTablePage(0); }}
              className="rs-search-input"
            />
          </div>
        </div>

        <div className="rs-table-container">
          <table className="rs-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Route Name</th>
                <th>Route Code</th>
                <th style={{ textAlign: 'center' }}>Student Fare</th>
                <th style={{ textAlign: 'center' }}>Adult Fare</th>
                <th style={{ textAlign: 'center' }}>Senior Fare</th>
                <th style={{ textAlign: 'center' }}>Assigned Buses</th>
                <th style={{ textAlign: 'center' }}>Status</th>
                <th style={{ textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRoutes.length === 0 ? (
                <tr>
                  <td colSpan="9" className="rs-table-empty">No matching routes found.</td>
                </tr>
              ) : (
                paginatedRoutes.map((route, idx) => {
                  const isSelected = String(route.id) === String(selectedRouteId);
                  const rCode = getRouteCode(route);
                  const sFare = route.studentFare != null ? Number(route.studentFare) : 500;
                  const aFare = route.adultFare != null ? Number(route.adultFare) : 1000;
                  const senFare = route.seniorFare != null ? Number(route.seniorFare) : 300;
                  const busCount = route.assignedBusesCount ?? route.busCount ?? 15;
                  return (
                    <tr key={route.id} className={isSelected ? 'rs-row-selected' : ''}>
                      <td className="rs-td-num">{tablePage * ROWS_PER_PAGE + idx + 1}</td>
                      <td>
                        <div className="rs-route-name">{route.name}</div>
                        <div className="rs-route-sub">{route.startPoint || 'Origin'} – {route.endPoint || 'Destination'}</div>
                      </td>
                      <td className="rs-td-code">{rCode}</td>
                      <td className="rs-td-fare" style={{ color: '#6366F1' }}>{sFare.toLocaleString()}</td>
                      <td className="rs-td-fare" style={{ color: '#22C55E' }}>{aFare.toLocaleString()}</td>
                      <td className="rs-td-fare" style={{ color: '#F59E0B' }}>{senFare.toLocaleString()}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="rs-bus-badge">
                          <DirectionsBus style={{ fontSize: 16, color: '#22C55E' }} />
                          {busCount}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="rs-active-badge">{route.status || 'ACTIVE'}</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => handleRouteSelect(route.id)}
                          title="Configure this route"
                          className="rs-edit-btn"
                        >
                          <Edit style={{ fontSize: 16 }} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="rs-pagination">
            <span className="rs-page-info">
              Page {tablePage + 1} of {totalPages} ({filteredRoutes.length} routes)
            </span>
            <div className="rs-page-btns">
              <button
                disabled={tablePage === 0}
                onClick={() => setTablePage((p) => p - 1)}
                className="rs-page-btn"
              >Previous</button>
              <button
                disabled={tablePage >= totalPages - 1}
                onClick={() => setTablePage((p) => p + 1)}
                className="rs-page-btn"
              >Next</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom Action Buttons ── */}
      <div className="rs-actions">
        <button type="button" onClick={handleCancel} className="rs-btn rs-btn-cancel">
          Cancel
        </button>
        <button type="button" onClick={handleReset} className="rs-btn rs-btn-reset">
          <RestartAlt style={{ fontSize: 18 }} />
          Reset Changes
        </button>
        <button
          type="button"
          onClick={handleSaveSettings}
          disabled={saving || !selectedRouteId}
          className="rs-btn rs-btn-save"
        >
          {saving ? (
            <><Refresh className="rs-spin" style={{ fontSize: 18 }} /> Saving...</>
          ) : (
            <><Check style={{ fontSize: 18 }} /> Save Route Settings</>
          )}
        </button>
      </div>
    </div>
  );
}

import { useState, useEffect, useMemo } from 'react';
import {
  getRoutes, getBuses, getBusStops, updateRouteSettings, getRouteSettings, getRoute,
  assignBusesToRoute, getAssignedBusesCount, getBusStopsCount
} from '../services/api';
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
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tableSearch, setTableSearch] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [tablePage, setTablePage] = useState(0);
  const ROWS_PER_PAGE = 5;

  // Form State
  const [studentFare, setStudentFare] = useState("");
  const [adultFare, setAdultFare] = useState("");
  const [seniorFare, setSeniorFare] = useState("");
  const [assignedBusesCount, setAssignedBusesCount] = useState("");
  const [dbSettingsExist, setDbSettingsExist] = useState(false);

  const populateForm = (route, settings) => {
    if (settings && settings.studentFare !== null) {
      setStudentFare(settings.studentFare);
      setAdultFare(settings.adultFare);
      setSeniorFare(settings.seniorFare);
      setAssignedBusesCount(settings.assignedBusesCount);
      setDbSettingsExist(true);
    } else {
      setStudentFare(0);
      setAdultFare(0);
      setSeniorFare(0);
      setAssignedBusesCount(0);
      setDbSettingsExist(false);
    }
  };

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

      if (selectedRouteId) {
        const found = loadedRoutes.find((r) => String(r.id) === String(selectedRouteId));
        if (found) {
          const res = await getRoute(selectedRouteId);
          setSelectedRoute(res.data);
          
          try {
            const settingsRes = await getRouteSettings(selectedRouteId);
            populateForm(res.data, settingsRes.data);
          } catch (e) {
            setStudentFare(0);
            setAdultFare(0);
            setSeniorFare(0);
            setAssignedBusesCount(0);
            setDbSettingsExist(false);
          }
        } else {
          setSelectedRoute(null);
          setStudentFare("");
          setAdultFare("");
          setSeniorFare("");
          setAssignedBusesCount("");
          setDbSettingsExist(false);
        }
      } else {
        setSelectedRoute(null);
        setStudentFare("");
        setAdultFare("");
        setSeniorFare("");
        setAssignedBusesCount("");
        setDbSettingsExist(false);
      }
    } catch (err) {
      console.error('Failed to load route settings data:', err);
      setErrorMessage('Failed to load route system data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleRouteSelect = async (routeId) => {
    setSelectedRouteId(String(routeId));
    if (!routeId) {
      setSelectedRoute(null);
      setStudentFare("");
      setAdultFare("");
      setSeniorFare("");
      setAssignedBusesCount("");
      setDbSettingsExist(false);
      return;
    }
    try {
      setLoading(true);
      setErrorMessage('');
      setSuccessMessage('');
      
      const res = await getRoute(routeId);
      const routeData = res.data;
      setSelectedRoute(routeData);

      try {
        const settingsRes = await getRouteSettings(routeId);
        populateForm(routeData, settingsRes.data);
      } catch (err) {
        setStudentFare(0);
        setAdultFare(0);
        setSeniorFare(0);
        setAssignedBusesCount(0);
        setDbSettingsExist(false);
      }
    } catch (err) {
      console.error('Failed to load route config:', err);
      setErrorMessage('Failed to load route configuration.');
    } finally {
      setLoading(false);
    }
  };

  const getRouteCode = (route) => {
    if (!route) return 'R001';
    return route.routeNumber || route.routeCode || `R00${route.id || 1}`;
  };

  const busStopsCount = useMemo(() => {
    if (!selectedRouteId || !selectedRoute) return "";
    if (!dbSettingsExist) return 0;
    return Array.isArray(selectedRoute.stops) ? selectedRoute.stops.length : 0;
  }, [selectedRouteId, selectedRoute, dbSettingsExist]);

  const passengerCategoriesCount = useMemo(() => {
    if (!selectedRouteId || !selectedRoute) return "";
    return "3 Categories";
  }, [selectedRouteId, selectedRoute]);

  const isDirty = useMemo(() => {
    if (!selectedRoute) return false;
    const baseStudent = dbSettingsExist ? (selectedRoute.studentFare ?? 0) : 0;
    const baseAdult = dbSettingsExist ? (selectedRoute.adultFare ?? 0) : 0;
    const baseSenior = dbSettingsExist ? (selectedRoute.seniorFare ?? 0) : 0;
    const baseBuses = dbSettingsExist ? (selectedRoute.assignedBusesCount ?? 0) : 0;

    return (
      (studentFare !== "" && Number(studentFare) !== baseStudent) ||
      (adultFare !== "" && Number(adultFare) !== baseAdult) ||
      (seniorFare !== "" && Number(seniorFare) !== baseSenior) ||
      (assignedBusesCount !== "" && Number(assignedBusesCount) !== baseBuses)
    );
  }, [selectedRoute, studentFare, adultFare, seniorFare, assignedBusesCount, dbSettingsExist]);

  const handleReset = async () => {
    if (selectedRouteId) {
      try {
        setLoading(true);
        const settingsRes = await getRouteSettings(selectedRouteId);
        populateForm(selectedRoute, settingsRes.data);
        toast.success('Form reset to saved route values');
      } catch (err) {
        setStudentFare(0);
        setAdultFare(0);
        setSeniorFare(0);
        setAssignedBusesCount(0);
        setDbSettingsExist(false);
        toast.success('Form reset to unconfigured defaults (0)');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleCancel = () => {
    handleReset();
    setSuccessMessage('');
    setErrorMessage('');
  };

  const handleSaveSettings = async (e) => {
    if (e) e.preventDefault();
    if (!selectedRouteId || !selectedRoute) return;
    try {
      setSaving(true);
      setSuccessMessage('');
      setErrorMessage('');
      const payload = {
        studentFare: studentFare === "" ? 0 : Number(studentFare),
        adultFare: adultFare === "" ? 0 : Number(adultFare),
        seniorFare: seniorFare === "" ? 0 : Number(seniorFare),
        assignedBusesCount: assignedBusesCount === "" ? 0 : Number(assignedBusesCount),
      };
      const res = await updateRouteSettings(selectedRouteId, payload);
      const updatedRoute = res.data;
      setRoutes((prev) =>
        prev.map((r) => (String(r.id) === String(selectedRouteId) ? { ...r, ...updatedRoute } : r))
      );
      setSelectedRoute(updatedRoute);
      setDbSettingsExist(true);
      window.dispatchEvent(new CustomEvent('zanusafiri:data-refresh'));
      toast.success(`Route settings for "${selectedRoute.name}" saved!`);
      setSuccessMessage(`Settings for "${selectedRoute.name}" updated successfully!`);
      setTimeout(() => setSuccessMessage(''), 4000);
      await loadData();
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
              <option value="">-- Select Route --</option>
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

      {/* ── Configuration Status Alert ── */}
      {!selectedRouteId ? (
        <div className="rs-alert rs-alert-info">
          <Info style={{ fontSize: 18 }} />
          <span>Select a route to load or configure settings.</span>
        </div>
      ) : (
        <div style={{ margin: '0' }}>
          {!dbSettingsExist ? (
            isDirty ? (
              <div className="rs-alert rs-alert-info">
                <Info style={{ fontSize: 18 }} />
                <span>Click "Save Route Settings" to save these changes.</span>
              </div>
            ) : (
              <div className="rs-alert rs-alert-info">
                <Info style={{ fontSize: 18 }} />
                <span>This route has not been configured yet. Please assign buses and set passenger fares.</span>
              </div>
            )
          ) : (
            isDirty && (
              <div className="rs-alert rs-alert-info">
                <Info style={{ fontSize: 18 }} />
                <span>Click "Save Route Settings" to save these changes.</span>
              </div>
            )
          )}
        </div>
      )}

      {/* ── Statistics Cards ── */}
      <div className="rs-stats-grid">
        <StatCard
          icon={<DirectionsBus style={{ fontSize: 26 }} />}
          iconBg="rgba(18,161,80,0.12)" iconColor="#12a150"
          label="Assigned Buses" value={selectedRouteId ? assignedBusesCount : ""}
          subtitle={selectedRouteId ? "Buses on this route" : ""}
        />
        <StatCard
          icon={<Place style={{ fontSize: 26 }} />}
          iconBg="rgba(139,92,246,0.12)" iconColor="#8B5CF6"
          label="Bus Stops" value={selectedRouteId ? `${busStopsCount} Stops` : ""}
          subtitle={selectedRouteId ? "Stops on this route" : ""}
        />
        <StatCard
          icon={<People style={{ fontSize: 26 }} />}
          iconBg="rgba(245,158,11,0.12)" iconColor="#F59E0B"
          label="Passenger Categories" value={selectedRouteId ? passengerCategoriesCount : ""}
          subtitle={selectedRouteId ? "Student, Adult, Senior (70+)" : ""}
        />
        <StatCard
          icon={<CheckCircle style={{ fontSize: 26 }} />}
          iconBg="rgba(18,161,80,0.12)" iconColor="#12a150"
          label="Route Status"
          value={
            selectedRouteId && selectedRoute ? (
              <span className={dbSettingsExist ? "rs-status-badge" : "rs-unconfigured-badge"}>
                {dbSettingsExist ? (selectedRoute.status || 'ACTIVE') : 'Not Configured'}
              </span>
            ) : ""
          }
          subtitle={selectedRouteId ? (dbSettingsExist ? "Route is active and configured" : "Route needs configuration setup") : ""}
        />
      </div>

      {/* ── Fleet + Fare Management ── */}
      <div className="rs-two-col">
        {/* Left: Fleet Management (45%) */}
        <div className="rs-card rs-fleet-card">
          <div className="rs-card-header">
            <div className="rs-card-icon" style={{ background: 'rgba(18,161,80,0.12)', color: '#12a150' }}>
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
                onClick={() => setAssignedBusesCount((p) => Math.max(0, Number(p) - 1))}
                disabled={!selectedRouteId || assignedBusesCount <= 0}
                className="rs-bus-btn rs-bus-btn-minus"
              >
                <Remove style={{ fontSize: 20 }} />
              </button>
              <input
                type="number" min="0" max="200"
                value={assignedBusesCount}
                onChange={(e) => setAssignedBusesCount(Math.max(0, parseInt(e.target.value) || 0))}
                disabled={!selectedRouteId}
                className="rs-bus-input"
              />
              <button
                type="button"
                onClick={() => setAssignedBusesCount((p) => Number(p) + 1)}
                disabled={!selectedRouteId}
                className="rs-bus-btn rs-bus-btn-plus"
              >
                <Add style={{ fontSize: 20 }} />
              </button>
            </div>
          </div>

          {!selectedRouteId ? (
            <div className="rs-info-alert rs-info-alert-blue">
              <Info style={{ fontSize: 16 }} />
              <span>Select a route to load or configure settings.</span>
            </div>
          ) : (
            <div className="rs-info-alert rs-info-alert-green">
              <Info style={{ fontSize: 16 }} />
              <span>Changing this value automatically updates the buses visible on the Public User portal.</span>
            </div>
          )}
        </div>

        {/* Right: Fare Management (55%) */}
        <div className="rs-card rs-fare-card">
          <div className="rs-card-header">
            <div className="rs-card-icon" style={{ background: 'rgba(18,161,80,0.12)', color: '#12a150' }}>
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
                  onChange={(e) => setStudentFare(Math.max(0, parseInt(e.target.value) || 0))}
                  disabled={!selectedRouteId}
                  className="rs-fare-input"
                />
              </div>
            </div>
            {/* Adult */}
            <div className="rs-fare-item">
              <div className="rs-fare-icon" style={{ background: 'rgba(18,161,80,0.12)', color: '#12a150' }}>
                <Person style={{ fontSize: 20 }} />
              </div>
              <h3 className="rs-fare-name">Adult</h3>
              <p className="rs-fare-desc">Standard Passenger Fare</p>
              <div className="rs-fare-input-wrap">
                <label className="rs-fare-label">Fare (TZS)</label>
                <input
                  type="number" min="0" step="50" value={adultFare}
                  onChange={(e) => setAdultFare(Math.max(0, parseInt(e.target.value) || 0))}
                  disabled={!selectedRouteId}
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
                  onChange={(e) => setSeniorFare(Math.max(0, parseInt(e.target.value) || 0))}
                  disabled={!selectedRouteId}
                  className="rs-fare-input"
                />
              </div>
            </div>
          </div>

          {!selectedRouteId ? (
            <div className="rs-info-alert rs-info-alert-blue">
              <Info style={{ fontSize: 16 }} />
              <span>Select a route to load or configure settings.</span>
            </div>
          ) : (
            <div className="rs-info-alert rs-info-alert-blue">
              <Info style={{ fontSize: 16 }} />
              <span>These fares are automatically displayed to Public Users and used during ticket booking.</span>
            </div>
          )}
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
                <th style={{ textAlign: 'center' }}>Assigned Buses</th>
                <th style={{ textAlign: 'center' }}>Bus Stops</th>
                <th style={{ textAlign: 'center' }}>Student Fare</th>
                <th style={{ textAlign: 'center' }}>Adult Fare</th>
                <th style={{ textAlign: 'center' }}>Senior Fare</th>
                <th style={{ textAlign: 'center' }}>Status</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRoutes.length === 0 ? (
                <tr>
                  <td colSpan="10" className="rs-table-empty">No matching routes found.</td>
                </tr>
              ) : (
                paginatedRoutes.map((route, idx) => {
                  const isSelected = String(route.id) === String(selectedRouteId);
                  const rCode = getRouteCode(route);
                  const hasConfig = route.studentFare !== null && route.adultFare !== null && route.seniorFare !== null && route.assignedBusesCount !== null;
                  const sFare = hasConfig ? Number(route.studentFare) : 0;
                  const aFare = hasConfig ? Number(route.adultFare) : 0;
                  const senFare = hasConfig ? Number(route.seniorFare) : 0;
                  const busCount = hasConfig ? (route.assignedBusesCount || 0) : 0;
                  const stopsCount = hasConfig ? (Array.isArray(route.stops) ? route.stops.length : 0) : 0;
                  return (
                    <tr key={route.id} className={isSelected ? 'rs-row-selected' : ''}>
                      <td className="rs-td-num">{tablePage * ROWS_PER_PAGE + idx + 1}</td>
                      <td>
                        <div className="rs-route-name">{route.name}</div>
                        <div className="rs-route-sub">{route.startPoint || 'Origin'} – {route.endPoint || 'Destination'}</div>
                      </td>
                      <td className="rs-td-code">{rCode}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="rs-bus-badge">
                          <DirectionsBus style={{ fontSize: 16, color: '#12a150' }} />
                          {busCount}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: '700', color: '#64748B' }}>
                        {stopsCount}
                      </td>
                      <td className="rs-td-fare" style={{ color: '#6366F1' }}>{sFare.toLocaleString()}</td>
                      <td className="rs-td-fare" style={{ color: '#12a150' }}>{aFare.toLocaleString()}</td>
                      <td className="rs-td-fare" style={{ color: '#F59E0B' }}>{senFare.toLocaleString()}</td>
                      <td style={{ textAlign: 'center' }}>
                        {hasConfig ? (
                          <span className="rs-active-badge">Configured</span>
                        ) : (
                          <span className="rs-unconfigured-badge">Not Configured</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => {
                            handleRouteSelect(route.id);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
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
        <button
          type="button"
          onClick={handleCancel}
          disabled={!selectedRouteId}
          className="rs-btn rs-btn-cancel"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleReset}
          disabled={!selectedRouteId || !isDirty}
          className="rs-btn rs-btn-reset"
        >
          <RestartAlt style={{ fontSize: 18 }} />
          Reset Changes
        </button>
        <button
          type="button"
          onClick={handleSaveSettings}
          disabled={saving || !selectedRouteId || !isDirty}
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

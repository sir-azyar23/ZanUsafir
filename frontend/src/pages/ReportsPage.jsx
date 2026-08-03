import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Assessment,
  CalendarMonth,
  DirectionsBus,
  Download,
  FilterAlt,
  LocalAtm,
  People,
  Place,
  Print,
  Route,
  Search,
  Sort,
  Summarize,
  TableChart,
} from '@mui/icons-material';
import { getBuses, getBusStops, getDrivers, getFares, getRoutes } from '../services/api';

const REPORT_MODULES = [
  { key: 'routes', label: 'Routes', description: 'All route information', icon: Route },
  { key: 'stops', label: 'Bus Stops', description: 'All bus stop information', icon: Place },
  { key: 'buses', label: 'Buses', description: 'All registered buses', icon: DirectionsBus },
  { key: 'drivers', label: 'Drivers', description: 'All registered drivers', icon: People },
  { key: 'fares', label: 'Fares', description: 'Fare information', icon: LocalAtm },
];

const BASE_COLUMNS = [
  { key: 'routeName', label: 'Route Name', filterable: true },
  { key: 'startPoint', label: 'Start Point', filterable: true },
  { key: 'endPoint', label: 'End Point', filterable: true },
  { key: 'distance', label: 'Distance', filterable: true },
  { key: 'busStops', label: 'Related Bus Stops', filterable: true },
  { key: 'busNumber', label: 'Bus Number', filterable: true },
  { key: 'plateNumber', label: 'Plate Number', filterable: true },
  { key: 'capacity', label: 'Capacity', filterable: true },
  { key: 'assignedDriver', label: 'Assigned Driver', filterable: true },
  { key: 'driverContact', label: 'Driver Contact', filterable: true },
  { key: 'fareAmount', label: 'Fare Amount', filterable: true },
  { key: 'status', label: 'Status', filterable: true },
];

const moduleColumns = {
  routes: ['routeName', 'startPoint', 'endPoint', 'distance', 'status'],
  stops: ['busStops'],
  buses: ['busNumber', 'plateNumber', 'capacity', 'status'],
  drivers: ['assignedDriver', 'driverContact'],
  fares: ['fareAmount'],
};

const emptyFilters = {
  routeId: '',
  stopId: '',
  busId: '',
  driverId: '',
  dateFrom: '',
  dateTo: '',
};

const normalizeList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const asText = (value) => (value == null || value === '' ? '—' : String(value));
const hasModule = (modules, key) => modules.includes(key);
const getBusNumber = (bus) => bus?.busNumber || bus?.busNo || bus?.number || (bus?.id ? `#${bus.id}` : '—');

const formatMoney = (amount, currency = 'TZS') => {
  if (amount == null || amount === '') return '—';
  return new Intl.NumberFormat('sw-TZ', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number(amount));
};

const formatDateTime = (value) => new Intl.DateTimeFormat('en-TZ', {
  year: 'numeric',
  month: 'short',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
}).format(value);

const dateInRange = (value, from, to) => {
  if (!from && !to) return true;
  if (!value) return true;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return true;

  if (from) {
    const start = new Date(`${from}T00:00:00`);
    if (date < start) return false;
  }

  if (to) {
    const end = new Date(`${to}T23:59:59`);
    if (date > end) return false;
  }

  return true;
};

const joinNames = (items, fallback = '—') => {
  const names = items.filter(Boolean);
  return names.length ? names.join(', ') : fallback;
};

function buildIndexes({ routes, stops, buses, drivers, fares }) {
  return {
    routesById: new Map(routes.map(route => [route.id, route])),
    stopsById: new Map(stops.map(stop => [stop.id, stop])),
    busesById: new Map(buses.map(bus => [bus.id, bus])),
    driversById: new Map(drivers.map(driver => [driver.id, driver])),
    faresByRouteId: fares.reduce((map, fare) => {
      const list = map.get(fare.routeId) || [];
      list.push(fare);
      map.set(fare.routeId, list);
      return map;
    }, new Map()),
    busesByRouteId: buses.reduce((map, bus) => {
      const list = map.get(bus.routeId) || [];
      list.push(bus);
      map.set(bus.routeId, list);
      return map;
    }, new Map()),
  };
}

function buildReportRows(data, selectedModules, filters) {
  const indexes = buildIndexes(data);
  const rows = [];
  const selectedRouteId = filters.routeId ? Number(filters.routeId) : null;
  const selectedStopId = filters.stopId ? Number(filters.stopId) : null;
  const selectedBusId = filters.busId ? Number(filters.busId) : null;
  const selectedDriverId = filters.driverId ? Number(filters.driverId) : null;

  const withinDates = (items) => items.some(item => dateInRange(item?.createdAt, filters.dateFrom, filters.dateTo));
  const routeMatchesStop = (route) => !selectedStopId || (route.stops || []).some(stop => stop.stopId === selectedStopId);

  if (hasModule(selectedModules, 'routes')) {
    data.routes.forEach(route => {
      if (selectedRouteId && route.id !== selectedRouteId) return;
      if (!routeMatchesStop(route)) return;

      const routeBuses = indexes.busesByRouteId.get(route.id) || [];
      const routeFares = indexes.faresByRouteId.get(route.id) || [];
      const buses = hasModule(selectedModules, 'buses') ? routeBuses : [null];
      const fares = hasModule(selectedModules, 'fares') ? routeFares : [null];
      const usableBuses = buses.length ? buses : [null];
      const usableFares = fares.length ? fares : [null];

      usableBuses.forEach(bus => {
        const driver = bus?.driverId ? indexes.driversById.get(bus.driverId) : null;
        if (selectedBusId && bus?.id !== selectedBusId) return;
        if (selectedDriverId && driver?.id !== selectedDriverId) return;

        usableFares.forEach(fare => {
          const dateItems = [route, bus, driver, fare].filter(Boolean);
          if (!withinDates(dateItems.length ? dateItems : [route])) return;

          rows.push({
            id: `route-${route.id}-bus-${bus?.id || 'none'}-fare-${fare?.id || 'none'}`,
            routeName: route.name,
            startPoint: route.startPoint,
            endPoint: route.endPoint,
            distance: route.distance || '—',
            busStops: joinNames((route.stops || []).map(stop => stop.stopName)),
            busNumber: bus ? getBusNumber(bus) : '—',
            plateNumber: bus?.plateNumber,
            capacity: bus?.capacity ? `${bus.capacity} seats` : '—',
            assignedDriver: hasModule(selectedModules, 'drivers') ? (driver?.fullName || bus?.driverName || 'Unassigned') : '—',
            driverContact: hasModule(selectedModules, 'drivers') ? (driver?.phone || driver?.email || '—') : '—',
            fareAmount: fare ? formatMoney(fare.amount, fare.currency) : '—',
            status: route.status,
            raw: { route, bus, driver, fare },
          });
        });
      });
    });

    return rows;
  }

  if (hasModule(selectedModules, 'buses')) {
    data.buses.forEach(bus => {
      const driver = bus.driverId ? indexes.driversById.get(bus.driverId) : data.drivers.find(item => item.busId === bus.id);
      if (selectedRouteId && bus.routeId !== selectedRouteId) return;
      if (selectedBusId && bus.id !== selectedBusId) return;
      if (selectedDriverId && driver?.id !== selectedDriverId) return;
      if (!withinDates([bus, driver].filter(Boolean))) return;

      rows.push({
        id: `bus-${bus.id}`,
        routeName: bus.routeName,
        startPoint: indexes.routesById.get(bus.routeId)?.startPoint,
        endPoint: indexes.routesById.get(bus.routeId)?.endPoint,
        distance: indexes.routesById.get(bus.routeId)?.distance || '—',
        busStops: '—',
        busNumber: getBusNumber(bus),
        plateNumber: bus.plateNumber,
        capacity: bus.capacity ? `${bus.capacity} seats` : '—',
        assignedDriver: hasModule(selectedModules, 'drivers') ? (driver?.fullName || bus.driverName || 'Unassigned') : '—',
        driverContact: hasModule(selectedModules, 'drivers') ? (driver?.phone || driver?.email || '—') : '—',
        fareAmount: '—',
        status: bus.status,
        raw: { bus, driver },
      });
    });

    return rows;
  }

  if (hasModule(selectedModules, 'drivers')) {
    data.drivers.forEach(driver => {
      const bus = driver.busId ? indexes.busesById.get(driver.busId) : null;
      if (selectedDriverId && driver.id !== selectedDriverId) return;
      if (selectedBusId && bus?.id !== selectedBusId) return;
      if (selectedRouteId && bus?.routeId !== selectedRouteId) return;
      if (!withinDates([driver, bus].filter(Boolean))) return;

      rows.push({
        id: `driver-${driver.id}`,
        routeName: bus?.routeName,
        startPoint: indexes.routesById.get(bus?.routeId)?.startPoint,
        endPoint: indexes.routesById.get(bus?.routeId)?.endPoint,
        distance: indexes.routesById.get(bus?.routeId)?.distance || '—',
        busStops: '—',
        busNumber: bus ? getBusNumber(bus) : '—',
        plateNumber: driver.busPlateNumber || bus?.plateNumber,
        capacity: bus?.capacity ? `${bus.capacity} seats` : '—',
        assignedDriver: driver.fullName,
        driverContact: driver.phone || driver.email,
        fareAmount: '—',
        status: driver.status,
        raw: { driver, bus },
      });
    });

    return rows;
  }

  if (hasModule(selectedModules, 'stops')) {
    data.stops.forEach(stop => {
      if (selectedStopId && stop.id !== selectedStopId) return;
      if (!dateInRange(stop.createdAt, filters.dateFrom, filters.dateTo)) return;

      rows.push({
        id: `stop-${stop.id}`,
        routeName: '—',
        startPoint: '—',
        endPoint: '—',
        distance: '—',
        busStops: stop.name,
        busNumber: '—',
        plateNumber: '—',
        capacity: '—',
        assignedDriver: '—',
        driverContact: '—',
        fareAmount: '—',
        status: stop.status,
        raw: { stop },
      });
    });

    return rows;
  }

  data.fares.forEach(fare => {
    if (selectedRouteId && fare.routeId !== selectedRouteId) return;
    if (selectedStopId && fare.fromStopId !== selectedStopId && fare.toStopId !== selectedStopId) return;
    if (!dateInRange(fare.createdAt, filters.dateFrom, filters.dateTo)) return;

    rows.push({
      id: `fare-${fare.id}`,
      routeName: fare.routeName,
      startPoint: indexes.routesById.get(fare.routeId)?.startPoint,
      endPoint: indexes.routesById.get(fare.routeId)?.endPoint,
      distance: indexes.routesById.get(fare.routeId)?.distance || '—',
      busStops: joinNames([fare.fromStopName, fare.toStopName]),
      busNumber: '—',
      plateNumber: '—',
      capacity: '—',
      assignedDriver: '—',
      driverContact: '—',
      fareAmount: formatMoney(fare.amount, fare.currency),
      status: '—',
      raw: { fare },
    });
  });

  return rows;
}

function getColumns(selectedModules) {
  const keys = selectedModules.flatMap(module => moduleColumns[module] || []);
  const unique = [...new Set(keys)];
  return BASE_COLUMNS.filter(column => unique.includes(column.key));
}

function SummaryCard({ icon, label, value }) {
  return (
    <div className="stat-card reports-summary-card">
      <div className="reports-summary-icon">{icon}</div>
      <div>
        <div className="reports-summary-label">{label}</div>
        <div className="reports-summary-value">{value}</div>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const [selectedModules, setSelectedModules] = useState([]);
  const [filters, setFilters] = useState(emptyFilters);
  const [data, setData] = useState({ routes: [], stops: [], buses: [], drivers: [], fares: [] });
  const [loadingSources, setLoadingSources] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(null);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState({ key: 'routeName', direction: 'asc' });
  const [columnFilters, setColumnFilters] = useState({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const loadReportSources = useCallback(async ({ silent = false } = {}) => {
    setLoadingSources(true);

    const sources = await Promise.allSettled([
      getRoutes(),
      getBusStops(),
      getBuses(),
      getDrivers(),
      getFares(),
    ]);

    const [routes, stops, buses, drivers, fares] = sources.map(result => (
      result.status === 'fulfilled' ? normalizeList(result.value.data) : []
    ));
    const failedSources = sources.filter(result => result.status === 'rejected');

    setData({ routes, stops, buses, drivers, fares });
    setLoadingSources(false);

    if (failedSources.length === sources.length) {
      toast.error('Failed to load report data');
    } else if (failedSources.length > 0 && !silent) {
      console.warn('Some report sources failed:', failedSources.map(result => result.reason));
      toast.error('Some report sections could not load. Please refresh if data looks incomplete.');
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => loadReportSources({ silent: true }));
  }, [loadReportSources]);

  useEffect(() => {
    const handleRefresh = () => {
      loadReportSources();
    };

    window.addEventListener('focus', handleRefresh);
    window.addEventListener('zanusafiri:data-refresh', handleRefresh);
    return () => {
      window.removeEventListener('focus', handleRefresh);
      window.removeEventListener('zanusafiri:data-refresh', handleRefresh);
    };
  }, [loadReportSources]);

  const stats = useMemo(() => ({
    routes: data.routes.length,
    stops: data.stops.length,
    buses: data.buses.length,
    drivers: data.drivers.length,
    fares: data.fares.length,
  }), [data]);

  const columns = useMemo(
    () => getColumns(generated?.modules || selectedModules),
    [generated?.modules, selectedModules]
  );

  const visibleRows = useMemo(() => {
    if (!generated) return [];
    const query = search.trim().toLowerCase();
    const activeColumns = columns.length ? columns : BASE_COLUMNS;

    const searched = generated.rows.filter(row => {
      const searchMatch = !query || activeColumns.some(column => asText(row[column.key]).toLowerCase().includes(query));
      const filtersMatch = Object.entries(columnFilters).every(([key, value]) => {
        if (!value) return true;
        return asText(row[key]).toLowerCase().includes(value.toLowerCase());
      });
      return searchMatch && filtersMatch;
    });

    return [...searched].sort((a, b) => {
      const aValue = asText(a[sort.key]).toLowerCase();
      const bValue = asText(b[sort.key]).toLowerCase();
      return sort.direction === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    });
  }, [columnFilters, columns, generated, search, sort]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return visibleRows.slice(start, start + pageSize);
  }, [page, pageSize, visibleRows]);

  const totalPages = Math.max(1, Math.ceil(visibleRows.length / pageSize));

  const toggleModule = (key) => {
    setSelectedModules(current => (
      current.includes(key) ? current.filter(item => item !== key) : [...current, key]
    ));
  };

  const updateFilter = (key, value) => {
    setFilters(current => ({ ...current, [key]: value }));
  };

  const generateReport = () => {
    if (selectedModules.length === 0) {
      toast.error('Select at least one report category');
      return;
    }

    setGenerating(true);
    setTimeout(() => {
      const rows = buildReportRows(data, selectedModules, filters);
      setGenerated({
        rows,
        modules: selectedModules,
        filters,
        generatedAt: new Date(),
      });
      setPage(1);
      setGenerating(false);
      toast.success('Report generated');
    }, 250);
  };

  const reportType = generated?.modules
    ?.map(key => REPORT_MODULES.find(module => module.key === key)?.label)
    .filter(Boolean)
    .join(' + ') || 'Custom Report';

  const exportRows = visibleRows.length ? visibleRows : generated?.rows || [];

  const exportExcel = () => {
    if (!generated) return;
    const table = `
      <table>
        <thead><tr>${columns.map(column => `<th>${column.label}</th>`).join('')}</tr></thead>
        <tbody>
          ${exportRows.map(row => `<tr>${columns.map(column => `<td>${asText(row[column.key])}</td>`).join('')}</tr>`).join('')}
        </tbody>
      </table>
    `;
    const blob = new Blob([table], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `zanusafiri-report-${Date.now()}.xls`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = () => {
    if (!generated) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const rows = exportRows.map(row => (
      `<tr>${columns.map(column => `<td>${asText(row[column.key])}</td>`).join('')}</tr>`
    )).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>ZanUsafiri Report</title>
          <style>
            body { font-family: Arial, sans-serif; color: #1F2937; padding: 24px; }
            h1 { margin-bottom: 4px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th { background: #0B4F8A; color: white; text-align: left; padding: 8px; }
            td { border-bottom: 1px solid rgba(221,227,234,0.9); padding: 8px; }
            .meta { color: #475569; margin-bottom: 18px; }
          </style>
        </head>
        <body>
          <h1>ZanUsafiri Transport Authority Report</h1>
          <div class="meta">${reportType} | ${formatDateTime(generated.generatedAt)} | ${exportRows.length} records</div>
          <table>
            <thead><tr>${columns.map(column => `<th>${column.label}</th>`).join('')}</tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const printReport = () => exportPdf();

  return (
    <div className="reports-page">
      <div className="reports-header">
        <div>
          <div className="reports-breadcrumb">Dashboard &gt; Reports</div>
          <h2>Reports Management</h2>
          <p>Generate custom transport authority reports from live route, fleet, driver, stop, and fare records.</p>
        </div>
        <div className="reports-header-badge">
          <Assessment fontSize="small" />
          Transport Authority Reporting System
        </div>
      </div>

      <div className="reports-stats-grid">
        <SummaryCard icon={<Route />} label="Total Routes" value={stats.routes} />
        <SummaryCard icon={<Place />} label="Total Bus Stops" value={stats.stops} />
        <SummaryCard icon={<DirectionsBus />} label="Total Buses" value={stats.buses} />
        <SummaryCard icon={<People />} label="Total Drivers" value={stats.drivers} />
        <SummaryCard icon={<LocalAtm />} label="Total Fares" value={stats.fares} />
      </div>

      <section className="stat-card reports-panel">
        <div className="reports-section-title">
          <div>
            <h3>Report Generator</h3>
            <p>Select one or more categories to compose a relationship-aware report.</p>
          </div>
          <span>{selectedModules.length} selected</span>
        </div>

        <div className="reports-card-grid">
          {REPORT_MODULES.map(module => {
            const Icon = module.icon;
            const selected = selectedModules.includes(module.key);
            return (
              <button
                key={module.key}
                type="button"
                className={`reports-select-card ${selected ? 'selected' : ''}`}
                onClick={() => toggleModule(module.key)}
                aria-pressed={selected}
              >
                <span className="reports-select-icon"><Icon /></span>
                <span>
                  <strong>{module.label}</strong>
                  <small>{module.description}</small>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="stat-card reports-panel">
        <div className="reports-section-title">
          <div>
            <h3>Filters</h3>
            <p>Optional filters narrow the live records used in the generated report.</p>
          </div>
          <FilterAlt />
        </div>

        <div className="reports-filter-grid">
          <label>
            <span className="form-label">Route Dropdown</span>
            <select className="form-input" value={filters.routeId} onChange={e => updateFilter('routeId', e.target.value)} disabled={loadingSources}>
              <option value="">All Routes</option>
              {data.routes.map(route => <option key={route.id} value={route.id}>{route.name}</option>)}
            </select>
          </label>
          <label>
            <span className="form-label">Bus Stop Dropdown</span>
            <select className="form-input" value={filters.stopId} onChange={e => updateFilter('stopId', e.target.value)} disabled={loadingSources}>
              <option value="">All Bus Stops</option>
              {data.stops.map(stop => <option key={stop.id} value={stop.id}>{stop.name}</option>)}
            </select>
          </label>
          <label>
            <span className="form-label">Bus Dropdown</span>
            <select className="form-input" value={filters.busId} onChange={e => updateFilter('busId', e.target.value)} disabled={loadingSources}>
              <option value="">All Buses</option>
              {data.buses.map(bus => <option key={bus.id} value={bus.id}>{bus.plateNumber || getBusNumber(bus)}</option>)}
            </select>
          </label>
          <label>
            <span className="form-label">Driver Dropdown</span>
            <select className="form-input" value={filters.driverId} onChange={e => updateFilter('driverId', e.target.value)} disabled={loadingSources}>
              <option value="">All Drivers</option>
              {data.drivers.map(driver => <option key={driver.id} value={driver.id}>{driver.fullName}</option>)}
            </select>
          </label>
          <label>
            <span className="form-label">Date From</span>
            <input className="form-input" type="date" value={filters.dateFrom} onChange={e => updateFilter('dateFrom', e.target.value)} />
          </label>
          <label>
            <span className="form-label">Date To</span>
            <input className="form-input" type="date" value={filters.dateTo} onChange={e => updateFilter('dateTo', e.target.value)} />
          </label>
        </div>

        <button className="btn btn-primary reports-generate-btn" type="button" onClick={generateReport} disabled={loadingSources || generating}>
          {generating ? <CalendarMonth fontSize="small" /> : <Summarize fontSize="small" />}
          {generating ? 'Generating Report...' : 'Generate Report'}
        </button>
      </section>

      {generated && (
        <section className="stat-card reports-panel reports-preview">
          <div className="reports-preview-top">
            <div>
              <div className="reports-breadcrumb">Report Preview</div>
              <h3>{reportType}</h3>
              <p>{generated.rows.length} total records generated on {formatDateTime(generated.generatedAt)}</p>
            </div>
            <div className="reports-action-row">
              <button className="btn btn-ghost" type="button" onClick={exportPdf}><Download fontSize="small" /> Export PDF</button>
              <button className="btn btn-ghost" type="button" onClick={exportExcel}><TableChart fontSize="small" /> Export Excel</button>
              <button className="btn btn-secondary" type="button" onClick={printReport}><Print fontSize="small" /> Print Report</button>
            </div>
          </div>

          <div className="reports-preview-summary">
            <SummaryCard icon={<TableChart />} label="Total Records" value={generated.rows.length} />
            <SummaryCard icon={<CalendarMonth />} label="Generated Date" value={formatDateTime(generated.generatedAt)} />
            <SummaryCard icon={<Summarize />} label="Report Type" value={reportType} />
          </div>

          <div className="reports-table-toolbar">
            <div className="reports-search">
              <Search fontSize="small" />
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search report..." />
            </div>
            <select className="form-input" value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}>
              {[10, 25, 50].map(size => <option key={size} value={size}>{size} rows</option>)}
            </select>
          </div>

          <div className="reports-table-wrap">
            <table className="data-table reports-table">
              <thead>
                <tr>
                  {columns.map(column => (
                    <th key={column.key}>
                      <button type="button" className="reports-sort-btn" onClick={() => setSort(current => ({
                        key: column.key,
                        direction: current.key === column.key && current.direction === 'asc' ? 'desc' : 'asc',
                      }))}>
                        {column.label}
                        <Sort fontSize="inherit" />
                      </button>
                    </th>
                  ))}
                </tr>
                <tr className="reports-column-filter-row">
                  {columns.map(column => (
                    <th key={column.key}>
                      <input
                        value={columnFilters[column.key] || ''}
                        onChange={e => { setColumnFilters(current => ({ ...current, [column.key]: e.target.value })); setPage(1); }}
                        placeholder={`Filter ${column.label}`}
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagedRows.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length || 1} className="reports-empty">No records match the selected report criteria.</td>
                  </tr>
                ) : pagedRows.map(row => (
                  <tr key={row.id}>
                    {columns.map(column => <td key={column.key}>{asText(row[column.key])}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="reports-pagination">
            <span>Showing {pagedRows.length} of {visibleRows.length} records</span>
            <div>
              <button className="btn btn-ghost" type="button" disabled={page <= 1} onClick={() => setPage(current => Math.max(1, current - 1))}>Previous</button>
              <span>Page {page} of {totalPages}</span>
              <button className="btn btn-ghost" type="button" disabled={page >= totalPages} onClick={() => setPage(current => Math.min(totalPages, current + 1))}>Next</button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getRoutes, createRoute, updateRoute, deleteRoute } from '../services/api';
import { Add, Edit, Delete, Search, Place, Flag, Visibility } from '@mui/icons-material';
import { Tooltip } from '@mui/material';
import toast from 'react-hot-toast';
import RouteFormModal from '../components/RouteFormModal';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON as GeoJSONLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const statusColors = {
  ACTIVE: 'badge-success',
  INACTIVE: 'badge-danger',
  SUSPENDED: 'badge-warning',
};

const asText = (value) => (value == null ? '' : String(value));

const normalizeRoutes = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const getRouteNumber = (route) => (
  route?.routeNumber || route?.routeCode || route?.code || (route?.id ? String(route.id) : '—')
);

// Map markers setup
const makeIcon = (color) =>
  L.divIcon({
    html: `<div style="width:16px;height:16px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);"></div>`,
    className: '',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -12],
  });
const startIcon = makeIcon('var(--success)');
const endIcon   = makeIcon('var(--danger)');

function FitBounds({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) map.fitBounds(bounds, { padding: [50, 50] });
  }, [bounds, map]);
  return null;
}

export default function RoutesPage({ pageTitle = 'Routes', pageDescription = null }) {
  const [routes, setRoutes] = useState([]);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [viewTarget, setViewTarget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null); // inline delete confirm
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getRoutes();
      const routeList = normalizeRoutes(response.data);
      setRoutes(routeList);

      if (!Array.isArray(response.data) && !Array.isArray(response.data?.content) && !Array.isArray(response.data?.data)) {
        console.warn('Unexpected routes response:', response.data);
        setError('Routes loaded, but the response format was not recognized.');
      }
    } catch (e) {
      console.error('Failed to load routes:', e);
      setRoutes([]);
      setError(e.response?.data?.message || e.message || 'Failed to load routes.');
      toast.error('Failed to load routes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(load);
  }, [load]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return routes;
    return routes.filter(r =>
      asText(r.name).toLowerCase().includes(q) ||
      asText(getRouteNumber(r)).toLowerCase().includes(q) ||
      asText(r.startPoint).toLowerCase().includes(q) ||
      asText(r.endPoint).toLowerCase().includes(q) ||
      asText(r.description).toLowerCase().includes(q)
    );
  }, [search, routes]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const startIdx = (currentPage - 1) * pageSize;
  const paginatedRoutes = useMemo(() => {
    return filtered.slice(startIdx, startIdx + pageSize);
  }, [filtered, startIdx, pageSize]);

  const handleSave = async (form) => {
    if (editTarget) {
      await updateRoute(editTarget.id, form);
      toast.success('Route updated');
    } else {
      await createRoute(form);
      toast.success('Route created');
    }
    load();
  };

  const handleDelete = async (route) => {
    setConfirmDeleteId(route.id);
  };

  const confirmDelete = async (route) => {
    setConfirmDeleteId(null);
    try {
      await deleteRoute(route.id);
      toast.success(`Route "${route.name}" deleted`);
      load();
      window.dispatchEvent(new CustomEvent('zanusafiri:data-refresh'));
    } catch (e) {
      const msg = e.response?.data?.message || e.message || 'Failed to delete route';
      toast.error(msg);
    }
  };

  const openAdd = () => { setEditTarget(null); setFormOpen(true); };
  const openEdit = (route) => { setEditTarget(route); setFormOpen(true); };
  const cancelDelete = () => setConfirmDeleteId(null);

  return (
    <div>
      {/* Redesigned Premium Page Hero Banner to match reference image */}
      <div className="page-hero" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap', padding: '24px 32px' }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>{pageTitle}</h2>
          <p style={{ margin: '4px 0 0', color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.88rem' }}>
            {pageDescription || `${filtered.length} route${filtered.length !== 1 ? 's' : ''} found`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255, 255, 255, 0.5)', fontSize: 18 }} />
            <input
              style={{
                paddingLeft: 38,
                width: 240,
                height: 40,
                background: 'rgba(15, 23, 42, 0.25)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '10px',
                color: '#ffffff',
                fontSize: '0.875rem',
                outline: 'none',
                transition: 'all 0.2s',
              }}
              placeholder="Search routes..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button
            onClick={openAdd}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              height: 40,
              padding: '0 20px',
              background: 'var(--primary)',
              border: 'none',
              borderRadius: '10px',
              color: '#ffffff',
              fontWeight: 650,
              fontSize: '0.875rem',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(18, 161, 80, 0.2)',
              transition: 'all 0.2s',
            }}
            onMouseOver={e => e.currentTarget.style.background = '#0f7a3f'}
            onMouseOut={e => e.currentTarget.style.background = 'var(--primary)'}
          >
            <Add fontSize="small" /> Add Route
          </button>
        </div>
      </div>

      {/* Redesigned Premium Routes Table */}
      <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #E5E7EB', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 56, textAlign: 'center', color: '#6B7280' }}>Loading routes...</div>
        ) : error ? (
          <div style={{ padding: 56, textAlign: 'center', color: '#6B7280' }}>
            <div style={{ color: 'var(--danger)', fontWeight: 700, marginBottom: 8 }}>Could not load routes</div>
            <div style={{ marginBottom: 16 }}>{error}</div>
            <button className="btn btn-primary" onClick={load}>Retry</button>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 56, textAlign: 'center', color: '#6B7280' }}>
            {routes.length === 0 ? 'No routes found.' : 'No routes match your search.'}
            {routes.length === 0 && (
              <button className="btn btn-primary" style={{ marginLeft: 16 }} onClick={openAdd}>
                Add first route
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E5E7EB' }}>
                  <th style={{ padding: '16px 20px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: '#475569', letterSpacing: '0.05em' }}>#</th>
                  <th style={{ padding: '16px 20px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: '#475569', letterSpacing: '0.05em' }}>Route Name</th>
                  <th style={{ padding: '16px 20px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: '#475569', letterSpacing: '0.05em' }}>From</th>
                  <th style={{ padding: '16px 20px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: '#475569', letterSpacing: '0.05em' }}>To</th>
                  <th style={{ padding: '16px 20px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: '#475569', letterSpacing: '0.05em' }}>Distance</th>
                  <th style={{ padding: '16px 20px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: '#475569', letterSpacing: '0.05em' }}>Status</th>
                  <th style={{ padding: '16px 20px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: '#475569', letterSpacing: '0.05em' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRoutes.map(route => (
                  <tr
                    key={route.id}
                    style={{ borderBottom: '1px solid #F1F5F9', transition: 'background-color 0.2s' }}
                    onMouseOver={e => e.currentTarget.style.backgroundColor = '#F8FAFC'}
                    onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    {/* Route number badge */}
                    <td style={{ padding: '14px 20px', verticalAlign: 'middle' }}>
                      <div style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: 'var(--primary)',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '700',
                        fontSize: '0.85rem'
                      }}>
                        {getRouteNumber(route)}
                      </div>
                    </td>

                    {/* Route name & description */}
                    <td style={{ padding: '14px 20px', verticalAlign: 'middle' }}>
                      <div style={{ fontWeight: '750', color: '#0F172A', textTransform: 'uppercase', fontSize: '0.875rem' }}>{route.name}</div>
                      {route.description && (
                        <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: 3, fontWeight: '400' }}>{route.description}</div>
                      )}
                    </td>

                    {/* From point badge */}
                    <td style={{ padding: '14px 20px', verticalAlign: 'middle' }}>
                      {route.startPoint ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          background: 'var(--primary-tint)',
                          border: '1px solid var(--border)',
                          color: '#0f7a3f',
                          padding: '5px 12px',
                          borderRadius: '8px',
                          fontWeight: '600',
                          fontSize: '0.8rem'
                        }}>
                          <Place style={{ fontSize: 14, color: 'var(--primary)' }} />
                          {route.startPoint}
                        </span>
                      ) : (
                        <span style={{ color: '#94A3B8' }}>—</span>
                      )}
                    </td>

                    {/* To point badge */}
                    <td style={{ padding: '14px 20px', verticalAlign: 'middle' }}>
                      {route.endPoint ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          background: 'rgba(13, 95, 160, 0.08)',
                          border: '1px solid rgba(13, 95, 160, 0.15)',
                          color: '#0d5fa0',
                          padding: '5px 12px',
                          borderRadius: '8px',
                          fontWeight: '600',
                          fontSize: '0.8rem'
                        }}>
                          <Flag style={{ fontSize: 14, color: '#36A9E1' }} />
                          {route.endPoint}
                        </span>
                      ) : (
                        <span style={{ color: '#94A3B8' }}>—</span>
                      )}
                    </td>

                    {/* Distance badge */}
                    <td style={{ padding: '14px 20px', verticalAlign: 'middle' }}>
                      {route.distance ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          background: '#EFF6FF',
                          color: '#2563EB',
                          border: '1px solid rgba(37, 99, 235, 0.1)',
                          padding: '5px 12px',
                          borderRadius: '8px',
                          fontWeight: '600',
                          fontSize: '0.8rem'
                        }}>
                          {route.distance}
                        </span>
                      ) : (
                        <span style={{ color: '#94A3B8' }}>—</span>
                      )}
                    </td>

                    {/* Status badge with colored dot */}
                    <td style={{ padding: '14px 20px', verticalAlign: 'middle' }}>
                      {route.status === 'ACTIVE' ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          background: 'var(--primary-tint)',
                          border: '1px solid var(--border)',
                          color: '#0f7a3f',
                          padding: '5px 12px',
                          borderRadius: '8px',
                          fontWeight: '600',
                          fontSize: '0.8rem'
                        }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)', display: 'inline-block' }}></span>
                          Active
                        </span>
                      ) : (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          background: 'rgba(220, 38, 38, 0.08)',
                          border: '1px solid rgba(220, 38, 38, 0.15)',
                          color: '#991B1B',
                          padding: '5px 12px',
                          borderRadius: '8px',
                          fontWeight: '600',
                          fontSize: '0.8rem'
                        }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#DC2626', display: 'inline-block' }}></span>
                          {route.status || 'Inactive'}
                        </span>
                      )}
                    </td>

                    {/* Action buttons */}
                    <td style={{ padding: '14px 20px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {confirmDeleteId === route.id ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(220, 38, 38, 0.08)', border: '1px solid rgba(220, 38, 38, 0.25)', borderRadius: 8, padding: '4px 10px' }}>
                            <span style={{ fontSize: '0.78rem', color: '#991B1B', fontWeight: 600, whiteSpace: 'nowrap' }}>Delete?</span>
                            <button
                              onClick={() => confirmDelete(route)}
                              style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                            >Yes</button>
                            <button
                              onClick={cancelDelete}
                              style={{ background: 'transparent', color: '#64748B', border: '1px solid #E2E8F0', borderRadius: 6, padding: '4px 10px', fontSize: '0.78rem', cursor: 'pointer' }}
                            >No</button>
                          </div>
                        ) : (
                          <>
                            <Tooltip title="View Route Details">
                              <button
                                onClick={() => setViewTarget(route)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  background: '#ffffff',
                                  border: '1px solid #E2E8F0',
                                  color: '#475569',
                                  padding: '6px 14px',
                                  borderRadius: '8px',
                                  fontSize: '0.8rem',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s',
                                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                }}
                                onMouseOver={e => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.borderColor = '#CBD5E1'; }}
                                onMouseOut={e => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#E2E8F0'; }}
                              >
                                <Visibility style={{ fontSize: 15 }} />
                                View
                              </button>
                            </Tooltip>

                            <Tooltip title="Edit Route">
                              <button
                                onClick={() => openEdit(route)}
                                style={{
                                  width: 32,
                                  height: 32,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  background: '#ffffff',
                                  border: '1px solid #E2E8F0',
                                  color: 'var(--primary)',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s',
                                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                }}
                                onMouseOver={e => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.borderColor = '#CBD5E1'; }}
                                onMouseOut={e => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#E2E8F0'; }}
                              >
                                <Edit style={{ fontSize: 15 }} />
                              </button>
                            </Tooltip>

                            <Tooltip title="Delete Route">
                              <button
                                onClick={() => handleDelete(route)}
                                style={{
                                  width: 32,
                                  height: 32,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  background: '#ffffff',
                                  border: '1px solid #FEE2E2',
                                  color: '#DC2626',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s',
                                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                }}
                                onMouseOver={e => { e.currentTarget.style.background = '#FEF2F2'; e.currentTarget.style.borderColor = '#FCA5A5'; }}
                                onMouseOut={e => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#FEE2E2'; }}
                              >
                                <Delete style={{ fontSize: 15 }} />
                              </button>
                            </Tooltip>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination aligned dynamically */}
        {filtered.length > 0 && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 20px',
            borderTop: '1px solid #E5E7EB',
            background: '#ffffff',
            fontSize: '0.85rem',
            color: '#64748B'
          }}>
            <div>
              Showing {startIdx + 1} to {Math.min(startIdx + pageSize, filtered.length)} of {filtered.length} route{filtered.length !== 1 ? 's' : ''}
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                style={{
                  width: 32,
                  height: 32,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#ffffff',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  color: currentPage === 1 ? '#CBD5E1' : '#475569',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  transition: 'all 0.2s'
                }}
              >
                &lt;
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  style={{
                    width: 32,
                    height: 32,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: currentPage === page ? 'var(--primary)' : '#ffffff',
                    border: currentPage === page ? '1px solid var(--primary)' : '1px solid #E2E8F0',
                    borderRadius: '8px',
                    color: currentPage === page ? '#ffffff' : '#475569',
                    cursor: 'pointer',
                    fontWeight: '600',
                    transition: 'all 0.2s'
                  }}
                >
                  {page}
                </button>
              ))}
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                style={{
                  width: 32,
                  height: 32,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#ffffff',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  color: currentPage === totalPages ? '#CBD5E1' : '#475569',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  transition: 'all 0.2s'
                }}
              >
                &gt;
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      <RouteFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
        initial={editTarget}
      />

      {/* Redesigned Read-only View Route Details Modal */}
      {viewTarget && (
        <div className="modal-overlay" onClick={() => setViewTarget(null)}>
          <div
            className="modal-box"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: 740, width: '96%', maxHeight: '90vh', overflowY: 'auto', borderRadius: 16, padding: 24 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Route Details
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: 4 }}>
                  Detailed information for Route Code #{getRouteNumber(viewTarget)}
                </p>
              </div>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setViewTarget(null)}
                style={{ minWidth: 'auto', padding: '6px 12px', border: '1px solid var(--border)', borderRadius: 8 }}
              >
                Close
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Route Name & status */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 750, color: '#0F172A', textTransform: 'uppercase' }}>
                  {viewTarget.name}
                </h3>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: viewTarget.status === 'ACTIVE' ? 'var(--primary-tint)' : 'rgba(220, 38, 38, 0.08)',
                  border: viewTarget.status === 'ACTIVE' ? '1px solid var(--border)' : '1px solid rgba(220, 38, 38, 0.15)',
                  color: viewTarget.status === 'ACTIVE' ? '#0f7a3f' : '#991B1B',
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontWeight: '600',
                  fontSize: '0.82rem'
                }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: viewTarget.status === 'ACTIVE' ? 'var(--primary)' : '#DC2626', display: 'inline-block' }}></span>
                  {viewTarget.status}
                </span>
              </div>

              {/* Description */}
              {viewTarget.description && (
                <div style={{ background: '#F8FAFC', padding: 14, borderRadius: 10, border: '1px solid #E5E7EB' }}>
                  <strong style={{ display: 'block', fontSize: '0.8rem', color: '#64748B', textTransform: 'uppercase', marginBottom: 6 }}>Description</strong>
                  <p style={{ margin: 0, fontSize: '0.88rem', color: '#334155', lineHeight: 1.5 }}>
                    {viewTarget.description}
                  </p>
                </div>
              )}

              {/* Details grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                <div style={{ border: '1px solid #E5E7EB', borderRadius: 10, padding: '12px 14px' }}>
                  <span style={{ fontSize: '0.78rem', color: '#64748B', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>From (Start Point)</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontWeight: 700, color: 'var(--primary)' }}>
                    <Place style={{ fontSize: 16, color: 'var(--primary)' }} />
                    {viewTarget.startPoint || '—'}
                  </div>
                </div>
                <div style={{ border: '1px solid #E5E7EB', borderRadius: 10, padding: '12px 14px' }}>
                  <span style={{ fontSize: '0.78rem', color: '#64748B', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>To (End Point)</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontWeight: 700, color: '#0d5fa0' }}>
                    <Flag style={{ fontSize: 16, color: '#36A9E1' }} />
                    {viewTarget.endPoint || '—'}
                  </div>
                </div>
                <div style={{ border: '1px solid #E5E7EB', borderRadius: 10, padding: '12px 14px' }}>
                  <span style={{ fontSize: '0.78rem', color: '#64748B', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Distance & Duration</span>
                  <div style={{ marginTop: 4, fontWeight: 700, color: '#334155', fontSize: '0.9rem' }}>
                    📏 {viewTarget.distance || '—'} {viewTarget.duration ? `(~ ${viewTarget.duration})` : ''}
                  </div>
                </div>
              </div>

              {/* Map Preview */}
              {viewTarget.startLat != null && viewTarget.endLat != null && (
                <div>
                  <strong style={{ display: 'block', fontSize: '0.8rem', color: '#64748B', textTransform: 'uppercase', marginBottom: 8 }}>Route Map</strong>
                  <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid #E5E7EB', height: 280 }}>
                    <MapContainer
                      center={[viewTarget.startLat, viewTarget.startLng]}
                      zoom={11}
                      style={{ height: '100%', width: '100%' }}
                      scrollWheelZoom={false}
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      {(() => {
                        let geojson = null;
                        try {
                          if (viewTarget.routeGeojson) geojson = JSON.parse(viewTarget.routeGeojson);
                        } catch (e) {}

                        const startLatLng = [viewTarget.startLat, viewTarget.startLng];
                        const endLatLng = [viewTarget.endLat, viewTarget.endLng];
                        const bounds = L.latLngBounds(startLatLng, endLatLng);

                        return (
                          <>
                            {geojson && (
                              <GeoJSONLayer
                                data={geojson}
                                style={{ color: 'var(--primary)', weight: 5, opacity: 0.85 }}
                              />
                            )}
                            <Marker position={startLatLng} icon={startIcon}>
                              <Popup><strong>📍 Start: {viewTarget.startPoint}</strong></Popup>
                            </Marker>
                            <Marker position={endLatLng} icon={endIcon}>
                              <Popup><strong>🏁 End: {viewTarget.endPoint}</strong></Popup>
                            </Marker>
                            <FitBounds bounds={bounds} />
                          </>
                        );
                      })()}
                    </MapContainer>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { getAuditLogs } from '../services/api';
import { Search, FilterList } from '@mui/icons-material';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [filterUser, setFilterUser] = useState('');
  const [filterEntity, setFilterEntity] = useState('');

  const load = useCallback((p = 0) => {
    setLoading(true);
    const params = { page: p, size: 20 };
    if (filterUser) params.user = filterUser;
    if (filterEntity) params.entity = filterEntity;
    getAuditLogs(params)
      .then(r => { setLogs(r.data.content || []); setTotalPages(r.data.totalPages || 0); })
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [filterUser, filterEntity]);

  useEffect(() => {
    queueMicrotask(() => load(page));
  }, [page, filterUser, filterEntity, load]);

  const actionColor = (action) => {
    if (action === 'CREATE') return { bg: 'var(--primary-tint-strong)', color: 'var(--dark)' };
    if (action === 'UPDATE') return { bg: 'var(--primary-tint-strong)', color: 'var(--primary-hover)' };
    if (action === 'DELETE') return { bg: 'rgba(var(--danger-rgb),0.12)', color: 'var(--danger)' };
    return { bg: 'var(--bg-light)', color: 'var(--text-secondary)' };
  };

  const entities = ['Route', 'BusStop', 'Bus', 'Driver', 'Fare'];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Audit Logs</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: 4 }}>Track all system activity</p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontSize: 18 }} />
            <input
              className="form-input"
              style={{ paddingLeft: 34, width: 180 }}
              placeholder="Filter by user..."
              value={filterUser}
              onChange={e => { setFilterUser(e.target.value); setPage(0); }}
            />
          </div>
          <select className="form-input" style={{ width: 160 }} value={filterEntity} onChange={e => { setFilterEntity(e.target.value); setPage(0); }}>
            <option value="">All Entities</option>
            {entities.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
      </div>

      <div className="stat-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-secondary)' }}>Loading audit logs...</div>
        ) : logs.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-secondary)' }}>No audit logs found</div>
        ) : (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Description</th>
                  <th>Performed By</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => {
                  const ac = actionColor(log.action);
                  return (
                    <tr key={log.id}>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td>
                        <span style={{ display: 'inline-flex', padding: '3px 10px', background: ac.bg, color: ac.color, borderRadius: 999, fontSize: '0.72rem', fontWeight: 700 }}>
                          {log.action}
                        </span>
                      </td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {log.entityName}
                          {log.entityId && <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>#{log.entityId}</span>}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.description}
                      </td>
                      <td>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--primary-hover))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.7rem', fontWeight: 700 }}>
                            {log.performedBy?.charAt(0)?.toUpperCase()}
                          </div>
                          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>{log.performedBy}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderTop: '1px solid var(--border)' }}>
                <button className="btn btn-ghost" style={{ padding: '6px 14px' }} onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
                  ← Prev
                </button>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Page {page + 1} of {totalPages}
                </span>
                <button className="btn btn-ghost" style={{ padding: '6px 14px' }} onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

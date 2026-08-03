import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function UnauthorizedPage() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px' }}>
      <div
        style={{
          width: '100%',
          maxWidth: 560,
          borderRadius: 24,
          border: '1px solid rgba(239, 68, 68, 0.16)',
          background: 'linear-gradient(135deg, #fff4f6 0%, #fef2f2 100%)',
          padding: 32,
          textAlign: 'center',
          boxShadow: '0 16px 40px rgba(15, 23, 42, 0.06)',
        }}
      >
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
          <ShieldAlert style={{ width: 28, height: 28, color: 'var(--danger)' }} />
        </div>
        <h2 style={{ marginTop: 20, fontSize: '1.5rem', fontWeight: 700, color: 'var(--danger)' }}>Access Denied</h2>
        <p style={{ marginTop: 12, fontSize: '0.95rem', lineHeight: 1.7, color: 'var(--text-secondary)' }}>
          This area is restricted to administrators. If you believe this is a mistake, please contact a system administrator.
        </p>
        <button
          type="button"
          onClick={() => navigate('/dashboard', { replace: true })}
          className="btn btn-primary"
          style={{ marginTop: 22, display: 'inline-flex', alignItems: 'center', gap: 8 }}
        >
          <ArrowLeft style={{ width: 16, height: 16 }} /> Go to Dashboard
        </button>
      </div>
    </div>
  );
}

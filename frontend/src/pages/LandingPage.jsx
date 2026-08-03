import { useNavigate } from 'react-router-dom';
import { ArrowRight, Bus, Compass, MapPinned, ShieldCheck, Sparkles, BadgeDollarSign, Route as RouteIcon, CheckCircle2 } from 'lucide-react';
import electricBusImage from '../assets/electric-bus.jpeg';
import zanusafiriLogo from '../assets/zanusafiri.png';

const featureCards = [
  {
    title: 'Search Bus Routes',
    description: 'Find routes quickly and view travel information without creating an account.',
    icon: RouteIcon,
  },
  {
    title: 'View Bus Stops',
    description: 'Explore bus stop locations and route order in a simple and clear way.',
    icon: MapPinned,
  },
  {
    title: 'Check Fares',
    description: 'See fare details for different journeys before you travel.',
    icon: BadgeDollarSign,
  },
  {
    title: 'Explore Transportation Info',
    description: 'Access route guidance and travel information in one professional portal.',
    icon: Compass,
  },
];

const steps = [
  'Open the website',
  'Search your destination',
  'View routes and stops',
  'Plan your journey',
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #F5F7FA 0%, rgba(54,169,225,0.18) 45%, #ffffff 100%)', color: 'var(--text-primary)' }}>
      <header style={{ borderBottom: '1px solid rgba(221,227,234,0.85)', background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(16px)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '18px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, overflow: 'hidden', boxShadow: '0 8px 24px rgba(31,41,55,0.14)', flexShrink: 0 }}>
              <img src={zanusafiriLogo} alt="ZanUsafiri" style={{ width: 44, height: 44, objectFit: 'cover', display: 'block' }} />
            </div>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 800 }}>ZanUsafiri</div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>Route Management System</div>
            </div>
          </div>
          <button type="button" onClick={() => navigate('/login')} style={{ border: '1px solid rgba(31,41,55,0.14)', background: 'white', color: 'var(--text-primary)', borderRadius: 999, padding: '10px 16px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 10px 24px rgba(31,41,55,0.08)' }}>
            Administrator Portal
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '30px 20px 54px' }}>
        {/* Hero Section with watermark */}
        <section style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 24, alignItems: 'center', padding: '10px 0 22px', position: 'relative', overflow: 'hidden' }}>

          {/* ── Watermark logo ── */}
          <div style={{
            position: 'absolute',
            top: '50%', right: '-60px',
            transform: 'translateY(-50%)',
            width: 520, height: 520,
            opacity: 0.055,
            filter: 'blur(2px) grayscale(20%)',
            pointerEvents: 'none',
            zIndex: 0,
          }}>
            <img src={zanusafiriLogo} alt="" aria-hidden="true"
              style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '50%' }}
            />
          </div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'rgba(57,181,74,0.12)', color: 'var(--primary)', borderRadius: 999, fontWeight: 700, fontSize: '0.82rem', marginBottom: 14 }}>
              <Sparkles size={16} /> Official Transport Information Portal
            </div>
            <h1 style={{ fontSize: 'clamp(2rem, 3.6vw, 3.2rem)', lineHeight: 1.08, fontWeight: 900, marginBottom: 14 }}>
              ZanUsafiri Route Management System
            </h1>
              <div style={{ maxWidth: 720, marginBottom: 18 }}>
                <p style={{ fontSize: '1.04rem', lineHeight: 1.8, color: 'var(--text-secondary)', margin: 0 }}>
                  ZanUsafiri is Zanzibar's electric bus platform for route discovery, station locations and fare information. The system shows buses on the map, so users can choose the best path and travel with confidence.
                </p>

                <div style={{ marginTop: 16, borderRadius: 18, overflow: 'hidden', boxShadow: '0 18px 40px rgba(31,41,55,0.16)' }}>
                  <img
                    src={electricBusImage}
                    alt="Electric bus in Zanzibar"
                    style={{ width: '100%', maxHeight: 260, height: 'auto', objectFit: 'cover', display: 'block', borderRadius: 18 }}
                  />
                </div>
              </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
              <button type="button" onClick={() => navigate('/explore')} className="btn btn-primary" style={{ padding: '13px 20px', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                Explore Routes <ArrowRight size={18} />
              </button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, color: 'var(--text-secondary)', fontSize: '0.93rem' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><CheckCircle2 size={16} color="var(--primary)" /> Public access without login</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><CheckCircle2 size={16} color="var(--primary)" /> Clear route and fare information</span>
            </div>
          </div>

          <div className="glass-card" style={{ padding: 20, borderRadius: 24, position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: 'var(--primary-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                <ShieldCheck size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 800 }}>Authorized Personnel</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Access to the administrative system</div>
              </div>
            </div>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 14 }}>Only authorized personnel can continue to the admin login page to manage routes, stops, and operational data.</p>
            <button type="button" onClick={() => navigate('/login')} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              Authorized Personnel
            </button>
          </div>
        </section>

        <section style={{ padding: '12px 0 18px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            {featureCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <div key={card.title} className="glass-card" style={{ padding: 18, animation: `fadeIn 0.4s ease ${index * 0.06}s both` }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: 'var(--primary-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', marginBottom: 10 }}>
                    <Icon size={19} />
                  </div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: 8 }}>{card.title}</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>{card.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section style={{ padding: '18px 0 8px' }}>
          <div className="glass-card" style={{ padding: 22 }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: 8 }}>How the system works for public users</h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 16 }}>The public can visit the website, search destinations, view routes and bus stops, and check available transport information without creating an account.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              {steps.map((step, index) => (
                <div key={step} style={{ borderRadius: 14, padding: '14px 12px', background: 'rgba(54,169,225,0.08)', border: '1px solid rgba(54,169,225,0.18)' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), var(--primary))', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, marginBottom: 8 }}>{index + 1}</div>
                  <div style={{ fontWeight: 700 }}>{step}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer style={{ borderTop: '1px solid rgba(221,227,234,0.88)', background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(10px)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '22px 20px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, color: 'var(--text-secondary)' }}>
          <div style={{ fontWeight: 700 }}>© 2026 ZanUsafiri. All rights reserved.</div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>About</a>
            <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Contact</a>
            <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Privacy</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

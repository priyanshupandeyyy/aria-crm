import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Filter,
  Megaphone,
  BarChart3,
  Sparkles,
} from 'lucide-react';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/aria', label: 'ARIA', icon: Sparkles },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/segments', label: 'Segments', icon: Filter },
  { to: '/campaigns', label: 'Campaigns', icon: Megaphone },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
];

export default function Layout({ children }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: 240,
          backgroundColor: '#1C1410',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 50,
        }}
      >
        {/* Brand header */}
        <div style={{ padding: '24px 20px 16px' }}>
          <span style={{ fontSize: 24 }}>☕</span>{' '}
          <span
            style={{
              color: '#D4A853',
              fontWeight: 700,
              fontSize: 20,
              letterSpacing: '-0.02em',
            }}
          >
            Brew &amp; Co.
          </span>{' '}
          <span style={{ color: '#9CA3AF', fontWeight: 500, fontSize: 14 }}>
            CRM
          </span>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 12px',
                borderRadius: 8,
                textDecoration: 'none',
                fontSize: 14,
                fontWeight: 500,
                transition: 'background 0.15s, color 0.15s',
                color: isActive ? '#D4A853' : '#9CA3AF',
                backgroundColor: isActive ? 'rgba(212, 168, 83, 0.1)' : 'transparent',
              })}
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div
          style={{
            padding: '16px 20px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            color: '#6B7280',
            fontSize: 11,
            textAlign: 'center',
          }}
        >
          Brew & Co. CRM
        </div>
      </aside>

      {/* ── Main content ────────────────────────────────────── */}
      <main
        style={{
          marginLeft: 240,
          flex: 1,
          backgroundColor: '#FDF6EC',
          overflowY: 'auto',
          minHeight: '100vh',
          padding: 32,
        }}
      >
        {children}
      </main>
    </div>
  );
}

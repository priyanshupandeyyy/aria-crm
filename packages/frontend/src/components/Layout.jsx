import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Filter,
  Megaphone,
  BarChart3,
  Sparkles,
  Menu,
  X
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const isAria = location.pathname === '/aria';

  return (
    <div className="flex min-h-screen bg-[#FDF6EC]">
      {/* ── Mobile Header ───────────────────────────────────── */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[#1C1410] flex items-center justify-between px-4 z-40">
        <div className="flex items-center gap-2">
          <span className="text-xl">☕</span>
          <span className="text-[#D4A853] font-bold text-lg tracking-tight">
            Brew &amp; Co.
          </span>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="text-gray-300 hover:text-white transition-colors"
        >
          <Menu size={24} />
        </button>
      </div>

      {/* ── Sidebar Overlay (Mobile) ────────────────────────── */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside
        className={`fixed top-0 bottom-0 left-0 w-64 bg-[#1C1410] flex flex-col z-50 transform transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand header */}
        <div className="p-6 pb-4 flex items-center justify-between md:block">
          <div>
            <span className="text-2xl">☕</span>{' '}
            <span className="text-[#D4A853] font-bold text-xl tracking-tight">
              Brew &amp; Co.
            </span>{' '}
            <span className="text-gray-400 font-medium text-sm">CRM</span>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden text-gray-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 flex flex-col gap-1 overflow-y-auto">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-[#D4A853] bg-[#D4A853]/10'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 text-gray-500 text-xs text-center">
          Brew & Co. CRM
        </div>
      </aside>

      {/* ── Main content ────────────────────────────────────── */}
      <main className={`flex-1 flex flex-col min-w-0 md:ml-64 pt-16 md:pt-0 ${isAria ? 'h-[100dvh]' : ''}`}>
        <div className={`flex-1 flex flex-col overflow-y-auto ${isAria ? 'p-0' : 'p-4 sm:p-6 md:p-8'}`}>
          {children}
        </div>
      </main>
    </div>
  );
}

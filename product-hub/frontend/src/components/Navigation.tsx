import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const sections = [
  {
    label: 'Work',
    links: [
      { to: '/dashboard', label: 'Dashboard' },
      { to: '/products', label: 'Products' },
    ],
  },
  {
    label: 'Build',
    links: [
      { to: '/activity', label: 'Activity' },
      { to: '/digest', label: 'Digest' },
      { to: '/insights', label: 'Insights' },
    ],
  },
];

const allLinks = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/products', label: 'Products' },
  { to: '/activity', label: 'Activity' },
  { to: '/digest', label: 'Digest' },
  { to: '/insights', label: 'Insights' },
  { to: '/settings', label: 'Settings' },
];

export default function Navigation() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const initials = user?.email?.[0]?.toUpperCase() ?? '?';

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-56 bg-neutral-950 border-r border-neutral-800 flex-col">
        {/* Org header */}
        <div className="px-4 py-4 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-brand-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {initials}
            </div>
            <span className="text-sm font-semibold text-neutral-100 truncate">Founder Mode</span>
          </div>
        </div>

        {/* New product CTA */}
        <div className="px-3 pt-3 pb-1">
          <button
            onClick={() => navigate('/products')}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded-md transition-colors text-left"
          >
            <span className="text-neutral-600">+</span>
            New Product
          </button>
        </div>

        {/* Nav sections */}
        <nav className="flex-1 px-3 py-2 space-y-4 overflow-y-auto">
          {sections.map(section => (
            <div key={section.label}>
              <p className="px-3 mb-1 text-[10px] font-semibold text-neutral-600 uppercase tracking-widest">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.links.map(({ to, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                      `flex items-center px-3 py-1.5 rounded-md text-sm transition-colors ${
                        isActive
                          ? 'bg-neutral-800 text-neutral-100 font-medium'
                          : 'text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800/60'
                      }`
                    }
                  >
                    {label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom: user + settings */}
        <div className="border-t border-neutral-800 px-3 py-3 space-y-0.5">
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center px-3 py-1.5 rounded-md text-sm transition-colors ${
                isActive
                  ? 'bg-neutral-800 text-neutral-100 font-medium'
                  : 'text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800/60'
              }`
            }
          >
            Settings
          </NavLink>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm text-neutral-600 hover:text-neutral-400 hover:bg-neutral-800/60 transition-colors text-left"
          >
            <span className="text-xs truncate">{user?.email}</span>
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between px-4 h-12">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-brand-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {initials}
          </div>
          <span className="text-sm font-semibold text-neutral-100">Founder Mode</span>
        </div>
        <button
          onClick={() => setMobileOpen(o => !o)}
          className="p-1.5 text-neutral-400 hover:text-neutral-100 transition-colors"
          aria-label="Toggle menu"
        >
          {mobileOpen ? (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="2" y1="2" x2="16" y2="16" /><line x1="16" y1="2" x2="2" y2="16" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="2" y1="5" x2="16" y2="5" /><line x1="2" y1="9" x2="16" y2="9" /><line x1="2" y1="13" x2="16" y2="13" />
            </svg>
          )}
        </button>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-neutral-950/95" onClick={() => setMobileOpen(false)}>
          <nav className="absolute top-12 left-0 right-0 border-b border-neutral-800 px-4 py-4 space-y-1" onClick={e => e.stopPropagation()}>
            {allLinks.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center px-3 py-2.5 rounded-md text-sm transition-colors ${
                    isActive
                      ? 'bg-neutral-800 text-neutral-100 font-medium'
                      : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800/60'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
            <div className="pt-3 border-t border-neutral-800 mt-2">
              <button
                onClick={logout}
                className="w-full flex items-center px-3 py-2.5 rounded-md text-sm text-neutral-600 hover:text-neutral-400 hover:bg-neutral-800/60 transition-colors text-left"
              >
                {user?.email}
              </button>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}

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
      { to: '/insights', label: 'Insights' },
    ],
  },
];

export default function Navigation() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const initials = user?.email?.[0]?.toUpperCase() ?? '?';

  return (
    <aside className="fixed left-0 top-0 h-full w-56 bg-neutral-950 border-r border-neutral-800 flex flex-col">
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
  );
}

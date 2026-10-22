import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';

const nav = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/dispatches', label: 'Dispatches' },
  { to: '/trips', label: 'Trips' },
  { to: '/users', label: 'Users' },
  { to: '/truck-types', label: 'Truck types' },
  { to: '/commissions', label: 'Commissions' },
];

export function AppShell() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-full flex">
      <aside className="w-56 shrink-0 border-r border-line bg-panel/90 backdrop-blur px-3 py-5 flex flex-col gap-6">
        <div className="px-2">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
            Ops
          </p>
          <h1 className="text-lg font-semibold tracking-tight text-ink">
            Captain Truck
          </h1>
        </div>
        <nav className="flex flex-col gap-0.5">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                [
                  'rounded-md px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-amber-50 text-accent-strong font-medium'
                    : 'text-ink-muted hover:bg-slate-50 hover:text-ink',
                ].join(' ')
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto px-2 pt-4 border-t border-line">
          <p className="text-sm font-medium truncate">{user?.fullName}</p>
          <p className="text-xs text-ink-muted truncate font-mono">
            {user?.email}
          </p>
          <button
            type="button"
            onClick={() => void logout()}
            className="mt-3 text-xs font-medium text-accent-strong hover:underline"
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0 p-6 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}

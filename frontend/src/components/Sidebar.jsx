import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Megaphone, X } from 'lucide-react';

const links = [
  { to: '/queries', label: 'Query Manager' },
  { to: '/leads', label: 'Lead Review' },
  { to: '/console', label: 'Console', icon: LayoutDashboard },
  { to: '/offers', label: 'Offers' },
  { to: '/campaigns', label: 'Campaigns', icon: Megaphone },
];

// On md+ the sidebar is a static column in Layout's flex row. Below md it becomes an
// off-canvas drawer: `fixed` (out of flow, so main takes the full width), slid out of
// view with -translate-x-full until `open`, with a tap-to-dismiss backdrop. `open` and
// `onClose` are owned by Layout so the header's hamburger can drive the same state.
export default function Sidebar({ open, onClose }) {
  return (
    <>
      {/* Backdrop — mobile only, only while open. */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-30 bg-black/40 md:hidden ${open ? '' : 'pointer-events-none opacity-0'} transition-opacity`}
        aria-hidden="true"
      />

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-slate-100 flex flex-col overflow-y-auto transition-transform duration-200 md:static md:z-auto md:w-56 md:shrink-0 md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="px-4 py-5 flex items-center gap-2.5 border-b border-slate-800">
          <img src="/logo.png" alt="" className="w-7 h-7 rounded-md shrink-0" />
          <span className="text-lg font-semibold">Capstone CRM</span>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto -mr-1 p-1 rounded-md text-slate-400 hover:bg-slate-800 hover:text-slate-100 md:hidden"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 py-4">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center justify-between gap-2.5 px-4 py-2 text-sm rounded-md mx-2 mb-1 ${
                  isActive ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-800'
                }`
              }
            >
              {link.label}
              {link.icon && <link.icon className="w-4 h-4 shrink-0" />}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}

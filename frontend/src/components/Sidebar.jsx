import { NavLink } from 'react-router-dom';

const links = [
  { to: '/console', label: 'Console' },
  { to: '/queries', label: 'Query Manager' },
  { to: '/leads', label: 'Lead Review' },
  { to: '/campaigns', label: 'Campaigns' },
  { to: '/owner-profile', label: 'Owner Profile' },
];

export default function Sidebar() {
  return (
    <aside className="w-56 shrink-0 bg-slate-900 text-slate-100 min-h-screen flex flex-col">
      <div className="px-4 py-5 text-lg font-semibold border-b border-slate-800">
        Carbonelle CRM
      </div>
      <nav className="flex-1 py-4">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `block px-4 py-2 text-sm rounded-md mx-2 mb-1 ${
                isActive ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

import { NavLink } from 'react-router-dom';

const links = [
  { to: '/console', label: 'Businesses' },
  { to: '/queries', label: 'Query Manager' },
  { to: '/leads', label: 'Lead Review' },
  { to: '/campaigns', label: 'Campaigns' },
  { to: '/offers', label: 'Offers' },
];

export default function Sidebar() {
  return (
    <aside className="w-56 shrink-0 bg-slate-900 text-slate-100 h-full flex flex-col overflow-y-auto">
      <div className="px-4 py-5 flex items-center gap-2.5 border-b border-slate-800">
        <img src="/logo.png" alt="" className="w-7 h-7 rounded-md shrink-0" />
        <span className="text-lg font-semibold">Capstone CRM</span>
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

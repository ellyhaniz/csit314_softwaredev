import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PM_LINKS = [
  { label: 'Reports', to: '/admin/reports' },
  { label: 'Campaigns', to: '/admin/reported' },
  { label: 'Categories', to: '/admin/categories' },
];

const UA_LINKS = [
  { label: 'Violations', to: '/admin/violations' },
  { label: 'Donations', to: '/admin/donations' },
  { label: 'Spikes', to: '/admin/spikes' },
];

export default function AdminSidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const links = user?.user_type === 'platform_management' ? PM_LINKS : UA_LINKS;

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <aside className="w-48 min-h-screen bg-white border-r border-gray-200 pt-4 flex-shrink-0 flex flex-col">
      <div className="flex-1">
        {links.map(({ label, to }) => (
          <NavLink
            key={label}
            to={to}
            className={({ isActive }) =>
              `block px-4 py-2.5 text-sm transition-colors ${
                isActive
                  ? 'bg-gray-100 text-gray-900 font-medium'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`
            }
          >
            {label}
          </NavLink>
        ))}
      </div>
      <div className="border-t border-gray-200 p-4">
        <p className="text-xs text-gray-400 mb-2 truncate">{user?.email}</p>
        <button
          onClick={handleLogout}
          className="w-full text-left text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          Log out
        </button>
      </div>
    </aside>
  );
}

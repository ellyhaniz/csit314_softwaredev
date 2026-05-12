import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navLinks = [
  { label: 'Home', to: '/' },
  { label: 'Browse', to: '/browse' },
  { label: 'Categories', to: '/search' },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  function handleSearch(e) {
    if (e.key === 'Enter' && e.target.value.trim()) {
      navigate(`/search?q=${encodeURIComponent(e.target.value.trim())}`);
    }
  }

  return (
    <nav className="border-b border-gray-200 bg-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
        <div className="flex items-center gap-8">
          <Link to="/" className="text-gray-900 font-semibold text-lg tracking-tight">
            Donate today
          </Link>
          <div className="flex gap-6">
            {navLinks.map(({ label, to }) => {
              const active =
                location.pathname === to ||
                (to === '/browse' && location.pathname.startsWith('/fra'));
              return (
                <Link
                  key={to}
                  to={to}
                  className={`text-sm transition-colors ${
                    active
                      ? 'text-gray-900 font-medium border-b-2 border-gray-900 pb-px'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <input
            type="text"
            placeholder="Search..."
            onKeyDown={handleSearch}
            className="border border-gray-200 rounded px-3 py-1.5 text-sm w-48 placeholder:text-gray-400 focus:outline-none focus:border-gray-400"
          />
          {user ? (
            <>
              <span className="text-sm text-gray-500 hidden sm:block">{user.email}</span>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
              >
                Log out
              </button>
            </>
          ) : (
            <Link to="/login" className="text-sm text-gray-500 hover:text-gray-900">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

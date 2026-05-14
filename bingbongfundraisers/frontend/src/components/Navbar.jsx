import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getNotifications, markAllRead } from '../lib/api';

const publicLinks = [
  { label: 'Browse', to: '/browse' },
  { label: 'Categories', to: '/search' },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const bellRef = useRef(null);

  const isDonorOrDonee = user?.user_type === 'donor' || user?.user_type === 'donee';
  const navLinks = isDonorOrDonee
    ? [{ label: 'Browse', to: '/browse' }, { label: 'Favourites', to: '/favourites' }]
    : publicLinks;

  useEffect(() => {
    if (!isDonorOrDonee || !user?.id) return;
    getNotifications(user.id)
      .then((data) => {
        setNotifications(data.notifications ?? []);
        setUnread(data.unread ?? 0);
      })
      .catch(() => null);
  }, [user?.id, isDonorOrDonee]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (bellRef.current && !bellRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleBellClick() {
    setOpen((prev) => !prev);
    if (!open && unread > 0 && user?.id) {
      markAllRead(user.id).catch(() => null);
      setUnread(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    }
  }

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
              {isDonorOrDonee && (
                <div className="relative" ref={bellRef}>
                  <button
                    onClick={handleBellClick}
                    className="relative text-gray-500 hover:text-gray-900 transition-colors p-1"
                    aria-label="Notifications"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    {unread > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                        {unread > 9 ? '9+' : unread}
                      </span>
                    )}
                  </button>

                  {open && (
                    <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-semibold text-gray-900">Notifications</p>
                      </div>
                      <ul className="max-h-72 overflow-y-auto divide-y divide-gray-50">
                        {notifications.length === 0 ? (
                          <li className="px-4 py-6 text-center text-sm text-gray-400">
                            No notifications yet
                          </li>
                        ) : (
                          notifications.map((n) => (
                            <li
                              key={n.id}
                              className={`px-4 py-3 text-sm ${n.is_read ? 'text-gray-500' : 'text-gray-900 font-medium bg-gray-50'}`}
                            >
                              <p className="leading-snug">{n.message}</p>
                              <p className="text-xs text-gray-400 mt-1">
                                {new Date(n.created_at).toLocaleDateString('en-SG', {
                                  day: 'numeric', month: 'short', year: 'numeric',
                                })}
                              </p>
                            </li>
                          ))
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              )}
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

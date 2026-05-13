import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { loginUser, checkExpiredFRAs } from '../../lib/api';

const REDIRECT = {
  fund_raiser: '/dashboard',
  donor: '/browse',
  donee: '/browse',
  user_admin: '/admin/violations',
  platform_management: '/admin/reports',
};

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await loginUser(email, password);
      login(user);
      checkExpiredFRAs().catch(() => null);
      navigate(REDIRECT[user.user_type] || '/browse');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center pt-24 px-4">
      <div className="bg-white border border-gray-200 rounded-lg p-8 w-full max-w-sm shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Donate today</h1>
        <p className="text-sm text-gray-500 mb-6">Sign in to your account</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded px-3 py-2 text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gray-900 text-white rounded py-2 text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-sm text-gray-500 text-center mt-4">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="text-indigo-700 hover:underline font-medium">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}

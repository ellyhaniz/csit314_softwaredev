import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { registerUser } from '../../lib/api';

const REDIRECT = { fund_raiser: '/dashboard', donor: '/browse', donee: '/browse' };

export default function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    phone: '',
    user_type: 'donor',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await registerUser(form);
      login(user);
      navigate(REDIRECT[user.user_type] || '/browse');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center pt-16 px-4">
      <div className="bg-white border border-gray-200 rounded-lg p-8 w-full max-w-sm shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Create your account</h1>
        <p className="text-sm text-gray-500 mb-6">Join Donate today</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded px-3 py-2 text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">
              Full name
            </label>
            <input
              id="full_name"
              type="text"
              required
              value={form.full_name}
              onChange={set('full_name')}
              className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
              placeholder="Your full name"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={form.email}
              onChange={set('email')}
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
              value={form.password}
              onChange={set('password')}
              className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone{' '}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              id="phone"
              type="tel"
              value={form.phone}
              onChange={set('phone')}
              className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
              placeholder="+65 ..."
            />
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">I am a</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'donor', label: 'Donor', sub: 'I want to donate' },
                { value: 'fund_raiser', label: 'Fund Raiser', sub: 'I want to raise funds' },
                { value: 'donee', label: 'Donee', sub: 'I am a beneficiary' },
              ].map(({ value, label, sub }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, user_type: value }))}
                  className={`border rounded-lg p-3 text-left transition-colors ${
                    form.user_type === value
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
                  }`}
                >
                  <p className="text-sm font-medium">{label}</p>
                  <p
                    className={`text-xs mt-0.5 ${
                      form.user_type === value ? 'text-gray-300' : 'text-gray-400'
                    }`}
                  >
                    {sub}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gray-900 text-white rounded py-2 text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-60 mt-2"
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="text-sm text-gray-500 text-center mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-700 hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

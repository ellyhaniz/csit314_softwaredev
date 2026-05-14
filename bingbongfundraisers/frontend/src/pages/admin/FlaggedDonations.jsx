import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AdminSidebar from '../../components/AdminSidebar';
import { getFlaggedDonations, reviewDonation } from '../../lib/api';

const TABS = ['Pending', 'Verified', 'Rejected'];

function formatSGD(n) {
  return `S$${Number(n || 0).toLocaleString('en-SG', { minimumFractionDigits: 0 })}`;
}

function timeAgo(dateStr) {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function FlaggedDonations() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  function handleLogout() { logout(); navigate('/login'); }
  const [tab, setTab] = useState('Pending');
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actioning, setActioning] = useState(null);

  function load() {
    setLoading(true);
    getFlaggedDonations()
      .then((data) => setDonations(Array.isArray(data) ? data : (data.flagged_donations ?? [])))
      .catch(() => setDonations([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleReview(donationId, decision) {
    setActioning(donationId);
    setError('');
    try {
      await reviewDonation(donationId, decision);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setActioning(null);
    }
  }

  const filtered = donations.filter((d) => {
    const status = (d.status || '').toLowerCase();
    if (tab === 'Pending') return status === 'flagged';
    if (tab === 'Verified') return status === 'completed';
    if (tab === 'Rejected') return status === 'refunded';
    return true;
  });

  const pendingCount = donations.filter((d) =>
    (d.status || '').toLowerCase() === 'flagged'
  ).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gray-900 text-white h-14 flex items-center justify-between px-6">
        <span className="font-semibold">Donate today · User Admin</span>
        <div className="flex items-center gap-4">
          <span className="text-gray-300 text-sm">{user?.email}</span>
          <button onClick={handleLogout} className="text-gray-300 text-sm hover:text-white transition-colors">Log out</button>
        </div>
      </div>

      <div className="flex">
        <AdminSidebar />

        <main className="flex-1 px-8 py-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Donations above verification threshold</h1>
            <p className="text-sm text-gray-500 mt-1">Threshold: S$5,000 single donation</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded px-3 py-2 text-sm mb-4">
              {error}
            </div>
          )}

          <div className="flex gap-1 border-b border-gray-200 mb-6">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  tab === t
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {t}
                {t === 'Pending' && pendingCount > 0 && (
                  <span className="ml-1.5 bg-gray-200 text-gray-700 text-xs font-medium px-1.5 py-0.5 rounded-full">
                    {pendingCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-900 text-white">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Donor</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Campaign</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">When</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Method</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">Loading…</td>
                  </tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                      No {tab.toLowerCase()} donations
                    </td>
                  </tr>
                )}
                {filtered.map((d) => {
                  const status = (d.status || '').toLowerCase();
                  const isPending = status === 'flagged';
                  return (
                    <tr key={d.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-semibold text-gray-900">{formatSGD(d.amount)}</td>
                      <td className="px-4 py-3 text-gray-600">{d.donor_name || d.donor_email || `User #${d.donor_id}`}</td>
                      <td className="px-4 py-3 text-gray-600">{d.fra_title || d.campaign_name || `FRA #${d.fra_id}`}</td>
                      <td className="px-4 py-3 text-gray-500">{timeAgo(d.created_at || d.donated_at)}</td>
                      <td className="px-4 py-3 text-gray-500">{d.payment_method || 'Card'}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                            isPending
                              ? 'bg-yellow-100 text-yellow-700'
                              : status === 'completed'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {isPending ? 'pending review' : status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {isPending && (
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => handleReview(d.id, 'approve')}
                              disabled={actioning === d.id}
                              className="text-xs bg-gray-900 text-white px-3 py-1 rounded hover:bg-gray-700 transition-colors disabled:opacity-60"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReview(d.id, 'reject')}
                              disabled={actioning === d.id}
                              className="text-xs border border-gray-200 px-3 py-1 rounded hover:border-gray-400 transition-colors disabled:opacity-60 text-gray-600"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  );
}

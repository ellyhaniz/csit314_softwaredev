import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AdminSidebar from '../../components/AdminSidebar';
import { getSpikeAlerts, dismissSpike, monitorSpikes } from '../../lib/api';

const TABS = ['Active', 'Dismissed'];

function timeAgo(dateStr) {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function SpikeAlerts() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  function handleLogout() { logout(); navigate('/login'); }
  const [tab, setTab] = useState('Active');
  const [spikes, setSpikes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dismissing, setDismissing] = useState(null);

  function load() {
    setLoading(true);
    monitorSpikes()
      .catch(() => {})
      .then(() => getSpikeAlerts())
      .then((data) => setSpikes(Array.isArray(data) ? data : (data.spike_alerts ?? [])))
      .catch(() => setSpikes([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleDismiss(fraId) {
    setDismissing(fraId);
    setError('');
    try {
      await dismissSpike(fraId);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setDismissing(null);
    }
  }

  const filtered = spikes.filter((s) => {
    const isDismissed = s.dismissed || s.status === 'dismissed';
    return tab === 'Dismissed' ? isDismissed : !isDismissed;
  });

  const activeCount = spikes.filter((s) => !s.dismissed && s.status !== 'dismissed').length;

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
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Unusual Donation Spikes</h1>

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
                {t === 'Active' && activeCount > 0 && (
                  <span className="ml-1.5 bg-gray-200 text-gray-700 text-xs font-medium px-1.5 py-0.5 rounded-full">
                    {activeCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {loading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-lg h-24 animate-pulse" />
              ))}
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <p className="text-lg">No {tab.toLowerCase()} spike alerts</p>
              {tab === 'Active' && (
                <p className="text-sm mt-1">All clear — no unusual activity detected</p>
              )}
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <div className="space-y-3">
              {filtered.map((spike) => (
                <div
                  key={spike.id || spike.fra_id}
                  className="bg-white border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0 mr-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="inline-block w-2 h-2 rounded-full bg-red-500 shrink-0" />
                        <p className="font-semibold text-gray-900 text-sm">
                          {spike.fra_title || spike.campaign_name || `Campaign #${spike.fra_id}`}
                        </p>
                      </div>
                      <p className="text-sm text-gray-600">
                        {spike.description ||
                          (spike.donation_count && spike.time_window
                            ? `${spike.donation_count} donations in ${spike.time_window}`
                            : spike.spike_amount
                            ? `Spike of S$${Number(spike.spike_amount).toLocaleString()} detected`
                            : 'Unusual donation activity detected')}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">{timeAgo(spike.detected_at || spike.created_at)}</p>
                    </div>
                    {!spike.dismissed && spike.status !== 'dismissed' && (
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => window.open(`/fra/${spike.fra_id || spike.id}`, '_blank')}
                          className="text-xs border border-gray-200 px-3 py-1.5 rounded hover:border-gray-400 transition-colors text-gray-600"
                        >
                          Investigate
                        </button>
                        <button
                          onClick={() => handleDismiss(spike.fra_id || spike.id)}
                          disabled={dismissing === (spike.fra_id || spike.id)}
                          className="text-xs bg-gray-900 text-white px-3 py-1.5 rounded hover:bg-gray-700 transition-colors disabled:opacity-60"
                        >
                          {dismissing === (spike.fra_id || spike.id) ? 'Dismissing…' : 'Dismiss'}
                        </button>
                      </div>
                    )}
                    {(spike.dismissed || spike.status === 'dismissed') && (
                      <span className="text-xs text-gray-400 shrink-0">Dismissed</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

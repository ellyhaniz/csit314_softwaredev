import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AdminSidebar from '../../components/AdminSidebar';
import { getFlaggedUsers, getUserViolations, actionUser } from '../../lib/api';

const SEVERITY_CONFIG = {
  CRITICAL: { min: 5, bg: 'bg-gray-900', text: 'text-white', badge: 'bg-gray-900 text-white' },
  HIGH: { min: 3, bg: 'bg-gray-700', text: 'text-white', badge: 'bg-gray-700 text-white' },
  MEDIUM: { min: 2, bg: 'bg-gray-400', text: 'text-white', badge: 'bg-gray-400 text-white' },
  LOW: { min: 0, bg: 'bg-gray-100', text: 'text-gray-900', badge: 'bg-gray-100 text-gray-700 border border-gray-300' },
};

const ACTION_OPTIONS = [
  { value: 'warn', label: 'Issue warning' },
  { value: 'suspend', label: 'Suspend account' },
  { value: 'ban', label: 'Ban user' },
];

function getSeverity(count) {
  if (count >= 5) return 'CRITICAL';
  if (count >= 3) return 'HIGH';
  if (count >= 2) return 'MEDIUM';
  return 'LOW';
}

export default function Violations() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  function handleLogout() { logout(); navigate('/login'); }
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [violations, setViolations] = useState({});
  const [selectedAction, setSelectedAction] = useState({});
  const [reason, setReason] = useState({});
  const [actioning, setActioning] = useState(null);

  function load() {
    setLoading(true);
    getFlaggedUsers()
      .then((data) => setUsers(Array.isArray(data) ? data : (data.flagged_users ?? [])))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function toggleExpand(userId) {
    if (expandedId === userId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(userId);
    if (!violations[userId]) {
      getUserViolations(userId)
        .then((data) => setViolations((v) => ({ ...v, [userId]: Array.isArray(data) ? data : [] })))
        .catch(() => setViolations((v) => ({ ...v, [userId]: [] })));
    }
  }

  async function handleAction(userId) {
    const action = selectedAction[userId];
    if (!action) return;
    setActioning(userId);
    setError('');
    try {
      await actionUser(userId, {
        action,
        reason: reason[userId] || action,
        actioned_by: user?.id,
      });
      setExpandedId(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setActioning(null);
    }
  }

  const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  users.forEach((u) => {
    const sev = u.severity || getSeverity(u.violation_count || 0);
    if (counts[sev] !== undefined) counts[sev]++;
  });

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
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Violation overview</h1>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded px-3 py-2 text-sm mb-4">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {Object.entries(SEVERITY_CONFIG).map(([sev, cfg]) => (
              <div key={sev} className={`rounded-lg p-5 ${cfg.bg} ${cfg.text}`}>
                <p className="text-xs font-semibold uppercase tracking-widest opacity-70">{sev}</p>
                <p className="text-3xl font-bold mt-1">{counts[sev]}</p>
                <p className={`text-xs mt-0.5 ${sev === 'LOW' ? 'text-gray-500' : 'opacity-60'}`}>
                  users flagged
                </p>
              </div>
            ))}
          </div>

          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-lg h-32 animate-pulse" />
              ))}
            </div>
          )}

          {!loading && users.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <p className="text-lg">No flagged users</p>
            </div>
          )}

          {!loading && users.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {users.map((u) => {
                const sev = u.severity || getSeverity(u.violation_count || 0);
                const cfg = SEVERITY_CONFIG[sev];
                const violationList = violations[u.id] || [];
                const reasons = violationList.map((v) => v.reason || v.type).filter(Boolean).slice(0, 2);

                return (
                  <div key={u.id} className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-semibold text-sm shrink-0">
                          {(u.full_name || u.email || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{u.full_name || u.email}</p>
                          <p className="text-xs text-gray-400">
                            {u.violation_count || 0} violation{(u.violation_count || 0) !== 1 ? 's' : ''}
                            {reasons.length > 0 && ` · ${reasons.join(' · ')}`}
                          </p>
                        </div>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${cfg.badge}`}>
                        {sev}
                      </span>
                    </div>

                    <div className="bg-gray-100 rounded-full h-1.5 mb-4">
                      <div
                        className="bg-gray-900 h-1.5 rounded-full transition-all"
                        style={{ width: `${Math.min(100, ((u.violation_count || 0) / 5) * 100)}%` }}
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleExpand(u.id)}
                        className="text-xs border border-gray-200 px-3 py-1.5 rounded hover:border-gray-400 transition-colors text-gray-600"
                      >
                        {expandedId === u.id ? 'Close' : 'Review'}
                      </button>
                      <button
                        onClick={() => toggleExpand(u.id)}
                        className="text-xs bg-gray-900 text-white px-3 py-1.5 rounded hover:bg-gray-700 transition-colors"
                      >
                        Take action
                      </button>
                    </div>

                    {expandedId === u.id && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        {violationList.length > 0 && (
                          <div className="mb-3 space-y-1">
                            {violationList.map((v, i) => (
                              <p key={i} className="text-xs text-gray-600">
                                · {v.reason || v.type || 'Violation'}{' '}
                                {v.created_at && (
                                  <span className="text-gray-400">
                                    {new Date(v.created_at).toLocaleDateString()}
                                  </span>
                                )}
                              </p>
                            ))}
                          </div>
                        )}
                        <div className="flex flex-wrap gap-2 mb-3">
                          {ACTION_OPTIONS.map(({ value, label }) => (
                            <button
                              key={value}
                              onClick={() => setSelectedAction((p) => ({ ...p, [u.id]: value }))}
                              className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors ${
                                selectedAction[u.id] === value
                                  ? 'bg-gray-900 text-white border-gray-900'
                                  : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
                              }`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                        <input
                          type="text"
                          placeholder="Reason (optional)"
                          value={reason[u.id] || ''}
                          onChange={(e) => setReason((r) => ({ ...r, [u.id]: e.target.value }))}
                          className="w-full border border-gray-200 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-gray-400 mb-2"
                        />
                        <button
                          onClick={() => handleAction(u.id)}
                          disabled={!selectedAction[u.id] || actioning === u.id}
                          className="bg-red-600 text-white px-4 py-1.5 rounded text-xs font-medium hover:bg-red-700 transition-colors disabled:opacity-40"
                        >
                          {actioning === u.id ? 'Processing…' : 'Confirm action'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

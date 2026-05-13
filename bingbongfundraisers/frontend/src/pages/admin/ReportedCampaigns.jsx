import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import AdminSidebar from '../../components/AdminSidebar';
import { getReportedCampaigns, actionReport } from '../../lib/api';

const TABS = ['Pending', 'Reviewed', 'Dismissed', 'Actioned'];

const ACTION_OPTIONS = [
  { value: 'warn', label: 'Warn fundraiser' },
  { value: 'suspend', label: 'Suspend campaign' },
  { value: 'remove', label: 'Remove campaign' },
];

export default function ReportedCampaigns() {
  const { user } = useAuth();
  const [tab, setTab] = useState('Pending');
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [selectedAction, setSelectedAction] = useState({});
  const [actioning, setActioning] = useState(null);

  function load() {
    setLoading(true);
    getReportedCampaigns()
      .then((data) => setReports(Array.isArray(data) ? data : []))
      .catch(() => setReports([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  const filtered = reports.filter((r) => {
    const status = (r.status || '').toLowerCase();
    return status === tab.toLowerCase();
  });

  async function handleAction(reportId) {
    const action = selectedAction[reportId];
    if (!action) return;
    setActioning(reportId);
    setError('');
    try {
      await actionReport(reportId, {
        action,
        reviewed_by: user?.id,
        fra_action: action,
      });
      setExpandedId(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setActioning(null);
    }
  }

  async function handleDismiss(reportId) {
    setActioning(reportId);
    setError('');
    try {
      await actionReport(reportId, {
        action: 'dismiss',
        reviewed_by: user?.id,
        fra_action: null,
      });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setActioning(null);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gray-900 text-white h-14 flex items-center justify-between px-6">
        <span className="font-semibold">Donate today · Admin</span>
        <span className="text-gray-300 text-sm">{user?.email}</span>
      </div>

      <div className="flex">
        <AdminSidebar />

        <main className="flex-1 px-8 py-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Reported Campaigns</h1>

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
                {t === 'Pending' && reports.filter((r) => (r.status || '').toLowerCase() === 'pending').length > 0 && (
                  <span className="ml-1.5 bg-gray-200 text-gray-700 text-xs font-medium px-1.5 py-0.5 rounded-full">
                    {reports.filter((r) => (r.status || '').toLowerCase() === 'pending').length}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Campaign</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reported by</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400">Loading…</td>
                  </tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                      No {tab.toLowerCase()} reports
                    </td>
                  </tr>
                )}
                {filtered.map((r) => (
                  <>
                    <tr key={r.id}>
                      <td className="px-4 py-3 font-medium text-gray-900">{r.fra_title || r.fra_id || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{r.reported_by || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{r.reason || '—'}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                            r.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-700'
                              : r.status === 'actioned'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {r.status || 'pending'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {tab === 'Pending' && (
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => handleDismiss(r.id)}
                              disabled={actioning === r.id}
                              className="text-xs border border-gray-200 px-3 py-1 rounded hover:border-gray-400 transition-colors disabled:opacity-60"
                            >
                              Dismiss
                            </button>
                            <button
                              onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                              className="text-xs bg-gray-900 text-white px-3 py-1 rounded hover:bg-gray-700 transition-colors"
                            >
                              Take action
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                    {expandedId === r.id && (
                      <tr key={`${r.id}-action`}>
                        <td colSpan={6} className="px-4 pb-4 bg-gray-50">
                          <div className="flex items-center gap-3 pt-3">
                            <span className="text-sm text-gray-700 font-medium">Action:</span>
                            <div className="flex gap-2">
                              {ACTION_OPTIONS.map(({ value, label }) => (
                                <button
                                  key={value}
                                  onClick={() =>
                                    setSelectedAction((prev) => ({ ...prev, [r.id]: value }))
                                  }
                                  className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors ${
                                    selectedAction[r.id] === value
                                      ? 'bg-gray-900 text-white border-gray-900'
                                      : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
                                  }`}
                                >
                                  {label}
                                </button>
                              ))}
                            </div>
                            <button
                              onClick={() => handleAction(r.id)}
                              disabled={!selectedAction[r.id] || actioning === r.id}
                              className="ml-2 bg-red-600 text-white px-4 py-1.5 rounded text-xs font-medium hover:bg-red-700 transition-colors disabled:opacity-40"
                            >
                              {actioning === r.id ? 'Processing…' : 'Confirm'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  );
}

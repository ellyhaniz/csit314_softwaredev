import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AdminSidebar from '../../components/AdminSidebar';
import { generateReport } from '../../lib/api';

function downloadCSV(report, startDate, endDate) {
  const rows = [
    ['Metric', 'Value'],
    ['Period', `${startDate} to ${endDate}`],
    ['Report Date', report.report_date ?? ''],
    ['New Campaigns', report.new_fras ?? 0],
    ['Total Donations (SGD)', report.total_donations ?? 0],
    ['Active Users', report.active_users ?? 0],
    ['New Users', report.new_users ?? 0],
  ];
  const csv = rows.map((r) => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `report_${startDate}_${endDate}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Reports() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  function handleLogout() { logout(); navigate('/login'); }

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleGenerate(e) {
    e.preventDefault();
    if (!startDate || !endDate) { setError('Please select both start and end dates.'); return; }
    if (startDate > endDate) { setError('Start date must be before end date.'); return; }
    setError('');
    setLoading(true);
    try {
      const data = await generateReport(startDate, endDate, user?.id);
      setReport(data.report ?? data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gray-900 text-white h-14 flex items-center justify-between px-6">
        <span className="font-semibold">Donate today · Platform Management</span>
        <div className="flex items-center gap-4">
          <span className="text-gray-300 text-sm">{user?.email}</span>
          <button onClick={handleLogout} className="text-gray-300 text-sm hover:text-white transition-colors">Log out</button>
        </div>
      </div>

      <div className="flex">
        <AdminSidebar />

        <main className="flex-1 px-8 py-8 max-w-4xl">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Generate Platform Report</h1>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded px-3 py-2 text-sm mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleGenerate} className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                  className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-gray-900 text-white px-6 py-2 rounded text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-60"
            >
              {loading ? 'Generating…' : 'Generate Report'}
            </button>
          </form>

          {report && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Report Results</h2>
                  <p className="text-xs text-gray-500 mt-0.5">{startDate} to {endDate}</p>
                </div>
                <button
                  onClick={() => downloadCSV(report, startDate, endDate)}
                  className="border border-gray-200 px-4 py-1.5 rounded text-sm text-gray-700 hover:border-gray-400 transition-colors"
                >
                  ↓ Download CSV
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'New Campaigns', value: report.new_fras ?? '—' },
                  { label: 'Total Donations', value: report.total_donations ? `S$${Number(report.total_donations).toLocaleString()}` : 'S$0' },
                  { label: 'Active Users', value: report.active_users ?? '—' },
                  { label: 'New Users', value: report.new_users ?? '—' },
                ].map(({ label, value }) => (
                  <div key={label} className="border border-gray-200 rounded-lg p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">{label}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{String(value)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

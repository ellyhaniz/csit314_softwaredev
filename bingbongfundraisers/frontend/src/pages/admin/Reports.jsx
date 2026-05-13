import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import AdminSidebar from '../../components/AdminSidebar';
import { generateReport } from '../../lib/api';

const REPORT_TYPES = ['Daily', 'Weekly', 'Monthly'];

export default function Reports() {
  const { user } = useAuth();
  const [reportType, setReportType] = useState('Monthly');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleGenerate(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await generateReport(reportType.toLowerCase(), user?.id);
      setReport(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
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

        <main className="flex-1 px-8 py-8 max-w-4xl">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Generate Platform Report</h1>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded px-3 py-2 text-sm mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleGenerate} className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
            <p className="text-sm font-medium text-gray-700 mb-3">Report type</p>
            <div className="grid grid-cols-3 gap-4 mb-6">
              {REPORT_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setReportType(type)}
                  className={`border rounded-lg p-4 text-left transition-colors ${
                    reportType === type
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
                  }`}
                >
                  <p className="font-semibold">{type}</p>
                  <p className={`text-xs mt-0.5 ${reportType === type ? 'text-gray-300' : 'text-gray-400'}`}>
                    {type === 'Daily' && 'Last 24 hours'}
                    {type === 'Weekly' && 'Last 7 days'}
                    {type === 'Monthly' && 'Last 30 days'}
                  </p>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
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
                <h2 className="text-lg font-semibold text-gray-900">Report Results</h2>
                <button className="border border-gray-200 px-4 py-1.5 rounded text-sm text-gray-700 hover:border-gray-400 transition-colors">
                  ↓ Download Report
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'New FRAs', value: report.new_fras ?? '—' },
                  { label: 'Total Donations', value: report.total_donations ? `S$${Number(report.total_donations).toLocaleString()}` : '—' },
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

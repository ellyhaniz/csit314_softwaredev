import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getMyFRAs } from '../../lib/api';
import FundraiserHeader from '../../components/FundraiserHeader';
import StatCard from '../../components/StatCard';
import ProgressBar from '../../components/ProgressBar';

const STATUS_FILTERS = ['Active', 'Closed', 'Draft'];

function formatSGD(n) {
  return `S$${Number(n || 0).toLocaleString('en-SG', { minimumFractionDigits: 0 })}`;
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [fras, setFras] = useState([]);
  const [filter, setFilter] = useState('Active');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    getMyFRAs(user.id)
      .then((data) => setFras(Array.isArray(data) ? data : []))
      .catch(() => setFras([]))
      .finally(() => setLoading(false));
  }, [user]);

  const CLOSED_STATUSES = ['expired', 'completed', 'cancelled'];
  const filtered = fras.filter((f) => {
    if (filter === 'Active') return f.status === 'active';
    if (filter === 'Closed') return CLOSED_STATUSES.includes(f.status);
    if (filter === 'Draft') return f.status === 'draft';
    return false;
  });
  const totalRaised = fras.reduce((s, f) => s + Number(f.current_amount || 0), 0);
  const activeFRAs = fras.filter((f) => f.status === 'active').length;

  return (
    <div className="min-h-screen bg-gray-50">
      <FundraiserHeader />
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.full_name}
          </h1>
          <Link
            to="/fra/create"
            className="bg-gray-900 text-white px-4 py-2 rounded text-sm font-medium hover:bg-gray-700 transition-colors"
          >
            + Create FRA
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Active FRAs" value={String(activeFRAs)} />
          <StatCard label="Total Raised" value={formatSGD(totalRaised)} />
          <StatCard label="Donors" value="—" />
          <StatCard label="Avg Impact" value="—" />
        </div>

        <div className="flex gap-2 mb-6">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                filter === s
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-lg h-48 animate-pulse" />
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg">No {filter.toLowerCase()} campaigns</p>
            {filter === 'Active' && (
              <Link
                to="/fra/create"
                className="mt-3 inline-block text-indigo-700 text-sm hover:underline"
              >
                Create your first FRA
              </Link>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {filtered.map((fra) => {
            const imgSrc = localStorage.getItem(`fra_img_${fra.id}`);
            return (
              <div
                key={fra.id}
                className="bg-white border border-gray-200 rounded-lg overflow-hidden cursor-pointer hover:border-gray-400 transition-colors"
                onClick={() => navigate(`/fra/${fra.id}`)}
              >
                <div className="h-36 overflow-hidden">
                  {imgSrc ? (
                    <img src={imgSrc} alt={fra.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="bg-gray-200 h-full flex items-center justify-center">
                      <span className="text-gray-400 text-xs">No image</span>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 text-sm mb-2 line-clamp-1">{fra.title}</h3>
                  <ProgressBar current={fra.current_amount} target={fra.target_amount} />
                  <p className="text-xs text-gray-500 mt-1.5 mb-3">
                    {formatSGD(fra.current_amount)} of {formatSGD(fra.target_amount)}
                  </p>
                  <div className="flex gap-2">
                    <Link
                      to={`/fra/${fra.id}/update`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 text-center bg-gray-900 text-white text-xs py-1.5 rounded hover:bg-gray-700 transition-colors"
                    >
                      Post update
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

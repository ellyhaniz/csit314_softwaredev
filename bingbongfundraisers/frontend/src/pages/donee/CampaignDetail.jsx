import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { getFRA, getProgress, getImpactScore, getCampaignUpdates, reportCampaign } from '../../lib/api';
import Navbar from '../../components/Navbar';
import FundraiserHeader from '../../components/FundraiserHeader';
import ProgressBar from '../../components/ProgressBar';
import { useAuth } from '../../context/AuthContext';

function formatSGD(n) {
  return `S$${Number(n || 0).toLocaleString('en-SG', { minimumFractionDigits: 0 })}`;
}

function daysLeft(endDate) {
  const diff = new Date(endDate) - new Date();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-SG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function CampaignDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isFundraiser = user?.user_type === 'fund_raiser';
  const isDonor = user?.user_type === 'donor';
  const isDonee = user?.user_type === 'donee';
  const canReport = (isDonor || isDonee) && user;
  const [fra, setFra] = useState(null);
  const [progress, setProgress] = useState(null);
  const [impact, setImpact] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportLoading, setReportLoading] = useState(false);
  const [reportDone, setReportDone] = useState(false);
  const [reportError, setReportError] = useState('');

  useEffect(() => {
    Promise.all([
      getFRA(id),
      getProgress(id).catch(() => null),
      getImpactScore(id).catch(() => null),
      getCampaignUpdates(id).catch(() => []),
    ])
      .then(([fraData, progressData, impactData, updatesData]) => {
        setFra(fraData);
        setProgress(progressData);
        setImpact(impactData);
        setUpdates(Array.isArray(updatesData) ? updatesData : []);
      })
      .catch(() => setError('Campaign not found'))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleReport(e) {
    e.preventDefault();
    if (!reportReason.trim()) return;
    setReportLoading(true);
    setReportError('');
    try {
      await reportCampaign({ fra_id: Number(id), reported_by: user.id, reason: reportReason.trim() });
      setReportDone(true);
      setReportReason('');
    } catch (err) {
      setReportError(err.message);
    } finally {
      setReportLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {isFundraiser ? <FundraiserHeader /> : <Navbar />}
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-6" />
          <div className="bg-white border border-gray-200 rounded-lg h-96 animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !fra) {
    return (
      <div className="min-h-screen bg-gray-50">
        {isFundraiser ? <FundraiserHeader /> : <Navbar />}
        <div className="max-w-5xl mx-auto px-6 py-8 text-center text-gray-400 py-20">
          <p className="text-lg font-medium">{error || 'Campaign not found'}</p>
          <Link
            to={isFundraiser ? '/dashboard' : '/browse'}
            className="text-indigo-700 text-sm hover:underline mt-2 inline-block"
          >
            {isFundraiser ? '← My campaigns' : '← Back to Browse'}
          </Link>
        </div>
      </div>
    );
  }

  const isClosed = fra.status === 'expired' || fra.status === 'completed' || fra.status === 'cancelled';
  const imgSrc = localStorage.getItem(`fra_img_${fra.id}`) || null;
  const pct = fra.target_amount > 0
    ? Math.min(100, Math.round((fra.current_amount / fra.target_amount) * 100))
    : 0;
  const impactScore = impact?.impact_score ?? impact?.score ?? null;

  const donors = progress?.recent_donations ?? [];
  const donorCount = progress?.donor_count ?? fra.donor_count ?? 0;
  const avgDonation = donorCount > 0
    ? Math.round(fra.current_amount / donorCount)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {isFundraiser ? <FundraiserHeader /> : <Navbar />}

      {isClosed && (
        <div className="bg-gray-900 text-white px-6 py-3">
          <div className="max-w-5xl mx-auto">
            <p className="font-semibold tracking-wide uppercase text-sm">
              Campaign Closed · Auto-closed on {formatDate(fra.end_date)}
            </p>
            <p className="text-gray-300 text-xs mt-0.5">
              This campaign reached its end date and is no longer accepting donations.
            </p>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Link
            to={isFundraiser ? '/dashboard' : '/browse'}
            className="hover:text-gray-900 transition-colors"
          >
            {isFundraiser ? '← My campaigns' : '← Browse'}
          </Link>
          <span>/</span>
          <span className="text-gray-900 truncate">{fra.title}</span>
        </div>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{fra.title}</h1>
          {canReport && !isClosed && (
            <button
              onClick={() => { setShowReport(true); setReportDone(false); setReportError(''); }}
              className="text-xs text-gray-400 hover:text-red-600 transition-colors underline"
            >
              Report this campaign
            </button>
          )}
        </div>

        {isClosed ? (
          <ClosedView fra={fra} pct={pct} donorCount={donorCount} updates={updates} imgSrc={imgSrc} />
        ) : (
          <ActiveView
            fra={fra}
            pct={pct}
            donorCount={donorCount}
            avgDonation={avgDonation}
            impactScore={impactScore}
            donors={donors}
            updates={updates}
            imgSrc={imgSrc}
            onDonate={isDonor ? () => navigate(`/fra/${id}/donate`) : null}
            onThankDonors={isDonee ? () => navigate(`/fra/${id}/thank-donors`) : null}
          />
        )}
      </div>

      {showReport && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-lg border border-gray-200 p-6 w-full max-w-sm shadow-lg">
            {reportDone ? (
              <>
                <p className="font-semibold text-gray-900 mb-1">Report submitted</p>
                <p className="text-sm text-gray-500 mb-4">
                  Thank you. Our team will review this campaign.
                </p>
                <button
                  onClick={() => setShowReport(false)}
                  className="w-full bg-gray-900 text-white py-2 rounded text-sm font-medium hover:bg-gray-700 transition-colors"
                >
                  Close
                </button>
              </>
            ) : (
              <>
                <p className="font-semibold text-gray-900 mb-1">Report this campaign</p>
                <p className="text-sm text-gray-500 mb-4">
                  Describe why you believe this campaign violates our guidelines.
                </p>
                {reportError && (
                  <p className="text-xs text-red-600 mb-3">{reportError}</p>
                )}
                <form onSubmit={handleReport}>
                  <textarea
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    required
                    rows={4}
                    placeholder="e.g. This campaign appears to be fraudulent..."
                    className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-400 resize-none mb-4"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowReport(false)}
                      className="flex-1 border border-gray-200 text-gray-700 py-2 rounded text-sm font-medium hover:border-gray-400 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={reportLoading || !reportReason.trim()}
                      className="flex-1 bg-red-600 text-white py-2 rounded text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-60"
                    >
                      {reportLoading ? 'Submitting…' : 'Submit Report'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ClosedView({ fra, pct, donorCount, updates, imgSrc }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <div className="relative rounded-lg h-72 overflow-hidden mb-4">
          {imgSrc
            ? <img src={imgSrc} alt={fra.title} className="w-full h-full object-cover" />
            : <div className="w-full h-full bg-gray-200" />
          }
          <span className="absolute inset-0 bg-gray-900 bg-opacity-60 rounded-lg flex flex-col items-center justify-center">
            <span className="text-white font-bold text-lg tracking-widest">— CLOSED —</span>
            <span className="text-white text-2xl font-bold mt-2">
              Final total: {formatSGD(fra.current_amount)}
            </span>
            <span className="text-gray-300 text-sm mt-1">
              Goal reached · {donorCount} donors
            </span>
          </span>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          <span className="border border-gray-900 rounded px-2 py-0.5 text-xs font-medium text-gray-900">CLOSED</span>
          {fra.category && (
            <span className="border border-gray-300 rounded px-2 py-0.5 text-xs text-gray-600">{fra.category}</span>
          )}
          {fra.location_text && (
            <span className="border border-gray-300 rounded px-2 py-0.5 text-xs text-gray-600">{fra.location_text}</span>
          )}
        </div>

        <div>
          <ProgressBar current={fra.current_amount} target={fra.target_amount} />
          <p className="text-xs text-gray-500 mt-1">
            {formatSGD(fra.current_amount)} raised of {formatSGD(fra.target_amount)} goal · 100% funded
          </p>
        </div>

        {updates.length > 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-2">
              Final update from the fund raiser
            </p>
            <p className="font-semibold text-sm text-gray-900">{updates[0].title}</p>
            <p className="text-sm text-gray-600 mt-1 line-clamp-4">{updates[0].content}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ActiveView({ fra, pct, donorCount, avgDonation, impactScore, donors, updates, imgSrc, onDonate, onThankDonors }) {
  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-4xl font-bold text-gray-900">{formatSGD(fra.current_amount)}</p>
            <p className="text-sm text-gray-500 mt-1">raised of {formatSGD(fra.target_amount)} goal</p>
          </div>
          {impactScore !== null && (
            <div className="flex flex-col items-center">
              <div className="rounded-full border-2 border-gray-900 w-16 h-16 flex items-center justify-center text-xl font-bold text-gray-900">
                {impactScore}
              </div>
              <span className="text-xs text-gray-500 mt-1">Impact</span>
            </div>
          )}
        </div>

        <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-2">
          <div
            className="bg-gray-900 h-3 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>{pct}% funded</span>
          <span>{donorCount} donors · {daysLeft(fra.end_date)} days left</span>
        </div>

        {onDonate && (
          <button
            onClick={onDonate}
            className="mt-4 w-full bg-indigo-700 text-white py-2.5 rounded text-sm font-medium hover:bg-indigo-800 transition-colors"
          >
            Donate now
          </button>
        )}
        {onThankDonors && (
          <button
            onClick={onThankDonors}
            className="mt-3 w-full border border-gray-300 text-gray-700 py-2.5 rounded text-sm font-medium hover:border-gray-500 transition-colors"
          >
            Thank donors
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Avg Donation', value: formatSGD(avgDonation) },
          { label: 'Donors', value: donorCount },
          { label: 'Days Left', value: daysLeft(fra.end_date) },
          { label: 'Target', value: formatSGD(fra.target_amount) },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white border border-gray-200 rounded-lg p-4 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
            <p className="text-lg font-bold text-gray-900 mt-1">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm font-medium text-gray-900 mb-3">Campaign image</p>
          <div className="rounded-lg h-48 overflow-hidden bg-gray-100">
            {imgSrc
              ? <img src={imgSrc} alt={fra.title} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center">
                  <span className="text-gray-400 text-xs">No image uploaded</span>
                </div>
            }
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm font-medium text-gray-900 mb-3">Recent Donations</p>
          {donors.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No donations yet — be the first!</p>
          ) : (
            <ul className="space-y-2">
              {donors.slice(0, 6).map((d, i) => (
                <li key={i} className="flex justify-between text-sm">
                  <span className="text-gray-900">{d.donor_name ?? 'Anonymous'}</span>
                  <span className="text-gray-500">
                    {formatSGD(d.amount)} · {timeAgo(d.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {fra.description && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <p className="text-sm font-medium text-gray-900 mb-2">About this campaign</p>
          <p className="text-sm text-gray-600 leading-relaxed">{fra.description}</p>
        </div>
      )}

      {updates.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <p className="text-sm font-medium text-gray-900 mb-4">Latest Updates</p>
          <div className="space-y-4">
            {updates.slice(0, 3).map((u, i) => (
              <div key={i} className="border-l-2 border-gray-200 pl-4">
                <p className="font-semibold text-sm text-gray-900">{u.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{formatDate(u.created_at)}</p>
                <p className="text-sm text-gray-600 mt-1 line-clamp-3">{u.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

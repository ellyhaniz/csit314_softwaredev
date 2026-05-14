import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getFRA, getDonorsForFRA, sendThankYou } from '../../lib/api';
import FundraiserHeader from '../../components/FundraiserHeader';
import Navbar from '../../components/Navbar';
import { useAuth } from '../../context/AuthContext';

function formatSGD(n) {
  return `S$${Number(n || 0).toLocaleString('en-SG', { minimumFractionDigits: 0 })}`;
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

const TABS = ['All', 'Not yet thanked', 'Already thanked'];

export default function ThankDonors() {
  const { id } = useParams();
  const { user } = useAuth();
  const isDonee = user?.user_type === 'donee';
  const [fra, setFra] = useState(null);
  const [donors, setDonors] = useState([]);
  const [messages, setMessages] = useState({});
  const [thankedIds, setThankedIds] = useState(new Set());
  const [sending, setSending] = useState(new Set());
  const [activeTab, setActiveTab] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getFRA(id),
      getDonorsForFRA(id),
    ])
      .then(([fraData, donorData]) => {
        setFra(fraData);
        const list = Array.isArray(donorData) ? donorData : (donorData?.donors ?? []);
        setDonors(list);
        const alreadyThanked = new Set(
          list.filter((d) => d.thank_you_sent || d.thanked).map((d) => d.donor_id ?? d.id)
        );
        setThankedIds(alreadyThanked);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSendThankYou(donor) {
    const donorKey = donor.donor_id ?? donor.id;
    const msg = messages[donorKey] || '';
    setSending((prev) => new Set(prev).add(donorKey));
    try {
      await sendThankYou({
        fra_id: id,
        fund_raiser_id: user?.id,
        donor_id: donorKey,
        message: msg || `Thank you so much for your generous donation to our campaign!`,
      });
      setThankedIds((prev) => new Set(prev).add(donorKey));
    } catch {
      // keep button enabled so user can retry
    } finally {
      setSending((prev) => {
        const next = new Set(prev);
        next.delete(donorKey);
        return next;
      });
    }
  }

  async function handleThankAll() {
    const unthanked = donors.filter((d) => {
      const key = d.donor_id ?? d.id;
      return !thankedIds.has(key);
    });
    for (const donor of unthanked) {
      await handleSendThankYou(donor);
    }
  }

  const notThankedCount = donors.filter((d) => !thankedIds.has(d.donor_id ?? d.id)).length;
  const thankedCount = donors.filter((d) => thankedIds.has(d.donor_id ?? d.id)).length;

  const tabCounts = {
    All: donors.length,
    'Not yet thanked': notThankedCount,
    'Already thanked': thankedCount,
  };

  const filtered = donors.filter((d) => {
    const key = d.donor_id ?? d.id;
    if (activeTab === 'Not yet thanked') return !thankedIds.has(key);
    if (activeTab === 'Already thanked') return thankedIds.has(key);
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {isDonee ? <Navbar /> : <FundraiserHeader />}
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-lg h-36 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {isDonee ? <Navbar /> : <FundraiserHeader />}
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          {isDonee
            ? <Link to={`/fra/${id}`} className="hover:text-gray-900 transition-colors">← Back to campaign</Link>
            : <Link to="/dashboard" className="hover:text-gray-900 transition-colors">← My campaigns</Link>
          }
        </div>

        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Donor wall — say thank you</h1>
            {fra && (
              <p className="text-sm text-gray-500 mt-1">{fra.title}</p>
            )}
          </div>
          {notThankedCount > 0 && (
            <button
              onClick={handleThankAll}
              className="bg-gray-900 text-white px-4 py-2 rounded text-sm font-medium hover:bg-gray-700 transition-colors"
            >
              Thank all remaining ({notThankedCount})
            </button>
          )}
        </div>

        <div className="flex gap-0 border-b border-gray-200 mb-6">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm whitespace-nowrap transition-colors ${
                activeTab === tab
                  ? 'border-b-2 border-gray-900 font-medium text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab} {tabCounts[tab]}
            </button>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg font-medium">
              {activeTab === 'Already thanked' ? 'No donors thanked yet' : 'All donors have been thanked!'}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {filtered.map((donor) => {
            const donorKey = donor.donor_id ?? donor.id;
            const isThanked = thankedIds.has(donorKey);
            const isSending = sending.has(donorKey);

            return (
              <div key={donorKey} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-semibold text-sm shrink-0">
                    {(donor.donor_name || donor.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-900">
                      {donor.donor_name || donor.name || 'Anonymous'}
                    </p>
                    <p className="text-xs text-gray-500">
                      Donated {formatSGD(donor.amount)} · {timeAgo(donor.created_at)}
                    </p>
                  </div>
                </div>

                {isThanked ? (
                  <div>
                    <span className="inline-block bg-gray-900 text-white text-xs px-3 py-1 rounded-full mb-2">
                      Thanked ✓
                    </span>
                    {(donor.thank_you_message || messages[donorKey]) && (
                      <blockquote className="text-xs text-gray-500 italic border-l-2 border-gray-200 pl-2 mt-2">
                        {donor.thank_you_message || messages[donorKey]}
                      </blockquote>
                    )}
                  </div>
                ) : (
                  <div>
                    <textarea
                      rows={2}
                      placeholder="Write a short thank-you message..."
                      value={messages[donorKey] || ''}
                      onChange={(e) =>
                        setMessages((prev) => ({ ...prev, [donorKey]: e.target.value }))
                      }
                      className="w-full border border-gray-200 rounded px-3 py-2 text-xs text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-gray-400 resize-none mb-2"
                    />
                    <button
                      onClick={() => handleSendThankYou(donor)}
                      disabled={isSending}
                      className="w-full bg-gray-900 text-white text-xs py-1.5 rounded hover:bg-gray-700 transition-colors disabled:opacity-50"
                    >
                      {isSending ? 'Sending...' : 'Send thank you'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

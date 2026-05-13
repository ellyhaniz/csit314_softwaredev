import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { getFRA, donateToCampaign } from '../../lib/api';
import Navbar from '../../components/Navbar';
import { useAuth } from '../../context/AuthContext';

function formatSGD(n) {
  return `S$${Number(n || 0).toLocaleString('en-SG', { minimumFractionDigits: 0 })}`;
}

export default function Donate() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [fra, setFra] = useState(null);
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [flagged, setFlagged] = useState(false);

  useEffect(() => {
    getFRA(id)
      .then(setFra)
      .catch(() => setError('Campaign not found'))
      .finally(() => setPageLoading(false));
  }, [id]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) {
      setError('Please enter a valid amount greater than S$0');
      return;
    }
    setLoading(true);
    try {
      const result = await donateToCampaign({
        fra_id: parseInt(id),
        donor_id: user.id,
        amount: parsed,
        message: message.trim() || null,
        is_anonymous: isAnonymous,
      });
      setFlagged(result.flagged ?? false);
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-lg mx-auto px-6 py-12">
          <div className="h-8 w-64 bg-gray-200 rounded animate-pulse mb-4" />
          <div className="bg-white border border-gray-200 rounded-lg h-64 animate-pulse" />
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-lg mx-auto px-6 py-12 text-center">
          <div className="bg-white border border-gray-200 rounded-lg p-8">
            <div className="w-14 h-14 rounded-full bg-gray-900 flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-2xl">✓</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Thank you for your donation!</h1>
            {flagged ? (
              <p className="text-sm text-gray-500 mb-6">
                Your donation of {formatSGD(parseFloat(amount))} is being reviewed for verification before it is applied to the campaign.
              </p>
            ) : (
              <p className="text-sm text-gray-500 mb-6">
                Your donation of {formatSGD(parseFloat(amount))} to <span className="font-medium text-gray-900">{fra?.title}</span> has been received.
              </p>
            )}
            <Link
              to={`/fra/${id}`}
              className="inline-block bg-gray-900 text-white px-6 py-2 rounded text-sm font-medium hover:bg-gray-700 transition-colors"
            >
              ← Back to campaign
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-lg mx-auto px-6 py-8">
        <Link to={`/fra/${id}`} className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
          ← Back to campaign
        </Link>

        <div className="mt-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Make a donation</h1>
          {fra && (
            <p className="text-sm text-gray-500 mt-1">{fra.title}</p>
          )}
        </div>

        {fra && (
          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Raised so far</span>
              <span className="font-semibold text-gray-900">{formatSGD(fra.current_amount)} of {formatSGD(fra.target_amount)}</span>
            </div>
            <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="bg-gray-900 h-1.5 rounded-full"
                style={{ width: `${Math.min(100, Math.round((fra.current_amount / fra.target_amount) * 100))}%` }}
              />
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded px-3 py-2 text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Donation amount (SGD) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">S$</span>
              <input
                type="number"
                min="1"
                step="1"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full border border-gray-200 rounded pl-8 pr-3 py-2 text-sm focus:outline-none focus:border-gray-400"
                placeholder="0"
              />
            </div>
            <div className="flex gap-2 mt-2">
              {[10, 20, 50, 100].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(String(preset))}
                  className="border border-gray-200 rounded px-3 py-1 text-xs text-gray-600 hover:border-gray-400 transition-colors"
                >
                  S${preset}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={300}
              className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-400 resize-none"
              placeholder="Leave a message of support..."
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">Donate anonymously</span>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-700 text-white py-2.5 rounded text-sm font-medium hover:bg-indigo-800 transition-colors disabled:opacity-60"
          >
            {loading ? 'Processing…' : `Donate${amount ? ` S$${amount}` : ''}`}
          </button>
        </form>
      </div>
    </div>
  );
}

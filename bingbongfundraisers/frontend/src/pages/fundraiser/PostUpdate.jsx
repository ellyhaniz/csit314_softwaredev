import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { getFRA, postCampaignUpdate } from '../../lib/api';
import Navbar from '../../components/Navbar';

export default function PostUpdate() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    getFRA(id)
      .then((data) => setCampaign(data))
      .catch(() => setCampaign(null));
  }, [id]);

  async function handlePublish(e) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError('Please fill in both title and content.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await postCampaignUpdate(id, { title: title.trim(), content: content.trim() });
      setSuccess(true);
      setTimeout(() => navigate(`/dashboard`), 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDraft(e) {
    e.preventDefault();
    navigate('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-2xl mx-auto px-6 py-8">
        <Link to="/dashboard" className="text-sm text-gray-500 hover:text-gray-900 mb-4 inline-block">
          ← My campaigns
        </Link>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h1 className="text-xl font-bold text-gray-900 mb-1">Post a campaign update</h1>
          <p className="text-sm text-gray-500 mb-6">
            {campaign ? (
              <>
                <span className="font-medium text-gray-700">{campaign.title}</span>
                {campaign.supporters_count != null && (
                  <> · {campaign.supporters_count} supporters</>
                )}
              </>
            ) : (
              'Loading campaign…'
            )}
          </p>

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 rounded px-3 py-2 text-sm mb-4">
              Update published! Redirecting…
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded px-3 py-2 text-sm mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handlePublish} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Update title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
                placeholder="e.g. Treatment going well — thank you!"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">What&apos;s new?</label>
              <textarea
                rows={6}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-400 resize-none"
                placeholder="Share an update with your donors…"
              />
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">
                Photos <span className="text-gray-400 font-normal">(optional)</span>
              </p>
              <div className="flex gap-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="w-20 h-20 bg-gray-100 border border-dashed border-gray-300 rounded flex items-center justify-center cursor-pointer hover:border-gray-500 transition-colors"
                  >
                    <span className="text-gray-400 text-xl">+</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleDraft}
                className="border border-gray-200 px-4 py-2 rounded text-sm text-gray-700 hover:border-gray-400 transition-colors"
              >
                Save draft
              </button>
              <button
                type="submit"
                disabled={loading || success}
                className="bg-gray-900 text-white px-4 py-2 rounded text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-60"
              >
                {loading ? 'Publishing…' : 'Publish'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

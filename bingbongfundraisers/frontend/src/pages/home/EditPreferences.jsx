import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/Navbar';
import { getCategories, getPreferences, savePreferences } from '../../lib/api';

export default function EditPreferences() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getCategories(), getPreferences(user.id)])
      .then(([catData, prefData]) => {
        setCategories(catData.categories ?? []);
        setSelected(new Set(prefData.preferred_categories ?? []));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user.id]);

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      await savePreferences(user.id, [...selected]);
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="mb-2">
          <h1 className="text-2xl font-bold text-gray-900">Your Interests</h1>
          <p className="text-sm text-gray-500 mt-1">
            Select the causes you care about. We'll use these to personalise your recommendations.
          </p>
        </div>

        <p className="text-xs text-gray-400 mb-6">
          {selected.size === 0 ? 'None selected — you'll see trending campaigns instead' : `${selected.size} selected`}
        </p>

        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-14 bg-white border border-gray-200 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 mb-8">
            {categories.map((cat) => {
              const isSelected = selected.has(cat.id);
              return (
                <button
                  key={cat.id}
                  onClick={() => toggle(cat.id)}
                  className={`text-left px-4 py-3 rounded-lg border text-sm font-medium transition-all ${
                    isSelected
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
                  }`}
                >
                  {cat.name}
                  {isSelected && <span className="float-right">✓</span>}
                </button>
              );
            })}
          </div>
        )}

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

        <div className="flex items-center gap-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-gray-900 text-white px-6 py-2 rounded text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : saved ? 'Saved!' : 'Save preferences'}
          </button>
          {saved && (
            <button
              onClick={() => navigate('/recommendations')}
              className="text-sm text-gray-600 hover:text-gray-900 underline"
            >
              See your recommendations →
            </button>
          )}
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

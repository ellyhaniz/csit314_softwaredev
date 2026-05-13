import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getRecommendations, getTrending, saveFavourite, getFavourites } from '../../lib/api';
import Navbar from '../../components/Navbar';
import CampaignCard from '../../components/CampaignCard';

export default function Home() {
  const { user } = useAuth();
  const [fras, setFras] = useState([]);
  const [favouriteIds, setFavouriteIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [isTrending, setIsTrending] = useState(false);

  useEffect(() => {
    if (user && user.user_type === 'donee') {
      getFavourites(user.id)
        .then((data) => {
          const ids = Array.isArray(data) ? data.map((f) => f.fra_id ?? f.id) : [];
          setFavouriteIds(new Set(ids));
        })
        .catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    if (user && user.user_type === 'donee') {
      getRecommendations(user.id)
        .then((data) => {
          const list = Array.isArray(data) ? data : [];
          if (list.length === 0) {
            return getTrending().then((t) => {
              setFras(Array.isArray(t) ? t : []);
              setIsTrending(true);
            });
          }
          setFras(list);
        })
        .catch(() => {
          getTrending()
            .then((t) => { setFras(Array.isArray(t) ? t : []); setIsTrending(true); })
            .catch(() => setFras([]));
        })
        .finally(() => setLoading(false));
    } else {
      getTrending()
        .then((t) => { setFras(Array.isArray(t) ? t : []); setIsTrending(true); })
        .catch(() => setFras([]))
        .finally(() => setLoading(false));
    }
  }, [user]);

  async function toggleFavourite(fraId) {
    if (!user) return;
    const next = new Set(favouriteIds);
    if (next.has(fraId)) {
      next.delete(fraId);
    } else {
      next.add(fraId);
      await saveFavourite(user.id, fraId).catch(() => null);
    }
    setFavouriteIds(next);
  }

  const categories = [...new Set(fras.flatMap((f) => (f.category ? [f.category] : [])))];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isTrending ? 'Trending now' : `Recommended for you, ${user?.full_name}`}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {isTrending
                ? 'Popular campaigns on Donate today'
                : 'Based on your donation history and saved campaigns'}
            </p>
            {!isTrending && categories.length > 0 && (
              <p className="text-xs text-gray-400 mt-0.5">
                Matches your interests in {categories.slice(0, 3).join(', ')}
              </p>
            )}
          </div>
          {!isTrending && (
            <div className="flex gap-2 shrink-0">
              <button className="text-xs border border-gray-200 px-3 py-1.5 rounded hover:border-gray-400 transition-colors text-gray-600">
                Why these?
              </button>
              <button className="text-xs border border-gray-200 px-3 py-1.5 rounded hover:border-gray-400 transition-colors text-gray-600">
                Edit preferences
              </button>
            </div>
          )}
        </div>

        <h2 className="text-sm font-medium text-gray-700 mb-4 mt-6">
          {isTrending ? 'Popular campaigns' : 'Picked for you'}
        </h2>

        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-lg h-64 animate-pulse" />
            ))}
          </div>
        )}

        {!loading && fras.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg font-medium">No recommendations yet</p>
            <p className="text-sm mt-1">Start browsing and saving campaigns to get personalised picks</p>
          </div>
        )}

        {!loading && fras.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {fras.map((fra) => (
              <CampaignCard
                key={fra.id}
                fra={fra}
                matchPct={fra.match_pct ?? fra.match_score ?? null}
                isFavourited={favouriteIds.has(fra.id)}
                onFavouriteClick={toggleFavourite}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

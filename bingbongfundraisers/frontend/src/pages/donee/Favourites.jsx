import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getFavourites, getFRA, saveFavourite } from '../../lib/api';
import Navbar from '../../components/Navbar';
import CampaignCard from '../../components/CampaignCard';
import { useAuth } from '../../context/AuthContext';

export default function Favourites() {
  const { user } = useAuth();
  const [fras, setFras] = useState([]);
  const [favouriteIds, setFavouriteIds] = useState(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getFavourites(user.id)
      .then(async (data) => {
        const favs = Array.isArray(data) ? data : [];
        const ids = new Set(favs.map((f) => f.fra_id ?? f.id));
        setFavouriteIds(ids);
        const details = await Promise.all(
          favs.map((f) => getFRA(f.fra_id ?? f.id).catch(() => null))
        );
        setFras(details.filter(Boolean));
      })
      .catch(() => setFras([]))
      .finally(() => setLoading(false));
  }, [user]);

  async function toggleFavourite(fraId) {
    const next = new Set(favouriteIds);
    if (next.has(fraId)) {
      next.delete(fraId);
      setFras((prev) => prev.filter((f) => f.id !== fraId));
    } else {
      next.add(fraId);
      await saveFavourite(user.id, fraId).catch(() => null);
    }
    setFavouriteIds(next);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Favourites</h1>
          <p className="text-sm text-gray-500 mt-1">
            {fras.length} {fras.length === 1 ? 'campaign' : 'campaigns'} saved
          </p>
        </div>

        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-lg h-64 animate-pulse" />
            ))}
          </div>
        )}

        {!loading && fras.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <p className="text-3xl mb-4">♥</p>
            <p className="text-lg font-medium">No saved campaigns yet</p>
            <p className="text-sm mt-1">Browse and click ♥ on a campaign to save it here</p>
            <Link
              to="/browse"
              className="mt-4 inline-block bg-gray-900 text-white px-5 py-2 rounded text-sm font-medium hover:bg-gray-700 transition-colors"
            >
              Browse campaigns
            </Link>
          </div>
        )}

        {!loading && fras.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {fras.map((fra) => (
              <CampaignCard
                key={fra.id}
                fra={fra}
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

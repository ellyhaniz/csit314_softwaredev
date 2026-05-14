import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { searchFRAs, getCategories, saveFavourite, getFavourites } from '../../lib/api';
import Navbar from '../../components/Navbar';
import CampaignCard from '../../components/CampaignCard';
import { useAuth } from '../../context/AuthContext';

export default function Browse() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const [keyword, setKeyword] = useState(searchParams.get('q') || '');
  const [toDate, setToDate] = useState('');
  const [activeCat, setActiveCat] = useState('all');

  const [categories, setCategories] = useState([]);
  const [fras, setFras] = useState([]);
  const [favouriteIds, setFavouriteIds] = useState(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (user) {
      getFavourites(user.id)
        .then((data) => {
          const ids = Array.isArray(data) ? data.map((f) => f.fra_id ?? f.id) : [];
          setFavouriteIds(new Set(ids));
        })
        .catch(() => {});
    }
  }, [user]);

  function runSearch(catId) {
    setLoading(true);
    const params = {};
    if (keyword.trim()) params.keyword = keyword.trim();
    if (toDate) params.end_date = toDate;
    if (catId && catId !== 'all') params.category_id = catId;
    searchFRAs(params)
      .then((data) => setFras(Array.isArray(data) ? data : []))
      .catch(() => setFras([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    runSearch(activeCat);
  }, []); // eslint-disable-line

  function handleSearch(e) {
    e.preventDefault();
    runSearch(activeCat);
  }

  function handleCatChange(catId) {
    setActiveCat(catId);
    runSearch(catId);
  }

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

  const catCounts = {};
  fras.forEach((f) => {
    if (f.category_id) catCounts[f.category_id] = (catCounts[f.category_id] || 0) + 1;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Find Fund Raising Activities</h1>

        <form onSubmit={handleSearch} className="flex flex-wrap gap-3 mb-6">
          <input
            type="text"
            placeholder="Search campaigns..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="flex-1 min-w-48 border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
          />
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500 shrink-0">Ends before</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
            />
          </div>
          <button
            type="submit"
            className="bg-gray-900 text-white px-5 py-2 rounded text-sm font-medium hover:bg-gray-700 transition-colors"
          >
            Search
          </button>
        </form>

        <div className="flex gap-0 border-b border-gray-200 mb-6 overflow-x-auto">
          <button
            onClick={() => handleCatChange('all')}
            className={`px-4 py-2.5 text-sm whitespace-nowrap transition-colors ${
              activeCat === 'all'
                ? 'border-b-2 border-gray-900 font-medium text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            All {fras.length}
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCatChange(cat.id)}
              className={`px-4 py-2.5 text-sm whitespace-nowrap transition-colors ${
                activeCat === cat.id
                  ? 'border-b-2 border-gray-900 font-medium text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {cat.name} {catCounts[cat.id] || ''}
            </button>
          ))}
        </div>

        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-lg h-64 animate-pulse" />
            ))}
          </div>
        )}

        {!loading && fras.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg font-medium">No campaigns found</p>
            <p className="text-sm mt-1">Try different keywords or remove filters</p>
          </div>
        )}

        {!loading && fras.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {fras.map((fra) => (
              <CampaignCard
                key={fra.id}
                fra={fra}
                isFavourited={favouriteIds.has(fra.id)}
                onFavouriteClick={user ? toggleFavourite : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

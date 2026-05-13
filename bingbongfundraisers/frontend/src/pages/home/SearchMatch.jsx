import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { searchMatch, getCategories } from '../../lib/api';
import Navbar from '../../components/Navbar';
import CampaignCard from '../../components/CampaignCard';

const SORT_OPTIONS = ['Best match', 'Newest', 'Most funded', 'Ending soon'];

export default function SearchMatch() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [inputQuery, setInputQuery] = useState(searchParams.get('q') || '');
  const [categories, setCategories] = useState([]);
  const [selectedCats, setSelectedCats] = useState([]);
  const [country, setCountry] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sort, setSort] = useState('Best match');

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    getCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setInputQuery(q);
      setQuery(q);
      runSearch(q);
    }
  }, []); // eslint-disable-line

  function runSearch(q = query) {
    if (!q.trim()) return;
    setLoading(true);
    setSearched(true);
    searchMatch(q.trim(), user?.id || '')
      .then((data) => setResults(Array.isArray(data) ? data : []))
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }

  function handleSubmit(e) {
    e.preventDefault();
    setQuery(inputQuery);
    setSearchParams(inputQuery ? { q: inputQuery } : {});
    runSearch(inputQuery);
  }

  function toggleCat(catId) {
    setSelectedCats((prev) =>
      prev.includes(catId) ? prev.filter((c) => c !== catId) : [...prev, catId]
    );
  }

  let displayed = [...results];

  if (selectedCats.length > 0) {
    displayed = displayed.filter((f) => selectedCats.includes(f.category_id));
  }
  if (country.trim()) {
    displayed = displayed.filter((f) =>
      (f.location_text || '').toLowerCase().includes(country.trim().toLowerCase())
    );
  }
  if (endDate) {
    displayed = displayed.filter((f) => !f.end_date || f.end_date <= endDate);
  }

  if (sort === 'Newest') {
    displayed = [...displayed].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  } else if (sort === 'Most funded') {
    displayed = [...displayed].sort((a, b) => Number(b.current_amount) - Number(a.current_amount));
  } else if (sort === 'Ending soon') {
    displayed = [...displayed].sort((a, b) => new Date(a.end_date) - new Date(b.end_date));
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Search & match campaigns</h1>
        <p className="text-sm text-gray-500 mb-6">
          Describe what you care about — we'll find the closest matches
        </p>

        <form onSubmit={handleSubmit} className="flex gap-3 mb-8">
          <input
            type="text"
            placeholder="e.g. clean water for children in rural areas"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            className="flex-1 border border-gray-200 rounded px-4 py-2.5 text-sm focus:outline-none focus:border-gray-400"
          />
          <button
            type="submit"
            className="bg-gray-900 text-white px-6 py-2.5 rounded text-sm font-medium hover:bg-gray-700 transition-colors shrink-0"
          >
            Search
          </button>
        </form>

        <div className="flex gap-8">
          <aside className="w-52 shrink-0">
            <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-5">
              <div>
                <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">Category</p>
                <div className="space-y-2">
                  {categories.map((cat) => (
                    <label key={cat.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedCats.includes(cat.id)}
                        onChange={() => toggleCat(cat.id)}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-700">{cat.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Country</p>
                <input
                  type="text"
                  placeholder="e.g. Singapore"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-gray-400"
                />
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Ends before</p>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-gray-400"
                />
              </div>

              <button
                onClick={() => { setSelectedCats([]); setCountry(''); setEndDate(''); }}
                className="w-full bg-gray-900 text-white py-2 rounded text-sm font-medium hover:bg-gray-700 transition-colors"
              >
                Clear filters
              </button>
            </div>
          </aside>

          <div className="flex-1 min-w-0">
            {searched && !loading && (
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-500">
                  {displayed.length > 0
                    ? `Showing ${displayed.length} campaign${displayed.length !== 1 ? 's' : ''} matching "${query}"`
                    : `No campaigns found for "${query}"`}
                </p>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="border border-gray-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-gray-400"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </div>
            )}

            {loading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="bg-white border border-gray-200 rounded-lg h-64 animate-pulse" />
                ))}
              </div>
            )}

            {!loading && !searched && (
              <div className="text-center py-24 text-gray-400">
                <p className="text-lg font-medium">Enter a search to find matching campaigns</p>
              </div>
            )}

            {!loading && searched && displayed.length === 0 && (
              <div className="text-center py-24 text-gray-400">
                <p className="text-lg font-medium">No results</p>
                <p className="text-sm mt-1">Try different keywords or remove filters</p>
              </div>
            )}

            {!loading && displayed.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {displayed.map((fra) => (
                  <CampaignCard
                    key={fra.id}
                    fra={fra}
                    matchPct={fra.match_pct ?? fra.match_score ?? null}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

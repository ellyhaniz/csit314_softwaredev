import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import AdminSidebar from '../../components/AdminSidebar';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../../lib/api';

export default function Categories() {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    getCategories()
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => setCategories([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleAdd(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    setError('');
    try {
      await createCategory(newName.trim());
      setNewName('');
      setShowAdd(false);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit(e) {
    e.preventDefault();
    if (!editName.trim()) return;
    setSaving(true);
    setError('');
    try {
      await updateCategory(editId, editName.trim());
      setEditId(null);
      setEditName('');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(cat) {
    if (!window.confirm(`Delete category "${cat.name}"? This cannot be undone.`)) return;
    setError('');
    try {
      await deleteCategory(cat.id);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  function toSlug(name) {
    return name.toLowerCase().replace(/\s+/g, '-');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gray-900 text-white h-14 flex items-center justify-between px-6">
        <span className="font-semibold">Donate today · Admin</span>
        <span className="text-gray-300 text-sm">{user?.email}</span>
      </div>

      <div className="flex">
        <AdminSidebar />

        <main className="flex-1 px-8 py-8 max-w-3xl">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Manage Categories</h1>
            <button
              onClick={() => { setShowAdd(true); setEditId(null); }}
              className="bg-gray-900 text-white px-4 py-2 rounded text-sm font-medium hover:bg-gray-700 transition-colors"
            >
              + Add category
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded px-3 py-2 text-sm mb-4">
              {error}
            </div>
          )}

          {showAdd && (
            <form onSubmit={handleAdd} className="bg-white border border-gray-200 rounded-lg p-4 mb-4 flex gap-3">
              <input
                type="text"
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Category name"
                className="flex-1 border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
              />
              <button
                type="submit"
                disabled={saving}
                className="bg-gray-900 text-white px-4 py-2 rounded text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => { setShowAdd(false); setNewName(''); }}
                className="border border-gray-200 px-4 py-2 rounded text-sm text-gray-600 hover:border-gray-400 transition-colors"
              >
                Cancel
              </button>
            </form>
          )}

          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Slug</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-gray-400 text-sm">
                      Loading…
                    </td>
                  </tr>
                )}
                {!loading && categories.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-gray-400 text-sm">
                      No categories yet
                    </td>
                  </tr>
                )}
                {categories.map((cat) => (
                  <tr key={cat.id}>
                    <td className="px-4 py-3">
                      {editId === cat.id ? (
                        <form onSubmit={handleEdit} className="flex gap-2">
                          <input
                            autoFocus
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:border-gray-400 w-40"
                          />
                          <button
                            type="submit"
                            disabled={saving}
                            className="text-xs bg-gray-900 text-white px-2 py-1 rounded hover:bg-gray-700 disabled:opacity-60"
                          >
                            {saving ? '…' : 'Save'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditId(null)}
                            className="text-xs border border-gray-200 px-2 py-1 rounded hover:border-gray-400"
                          >
                            Cancel
                          </button>
                        </form>
                      ) : (
                        <span className="font-medium text-gray-900">{cat.name}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{toSlug(cat.name)}</td>
                    <td className="px-4 py-3 text-right">
                      {editId !== cat.id && (
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => { setEditId(cat.id); setEditName(cat.name); setShowAdd(false); }}
                            className="text-xs border border-gray-200 px-3 py-1 rounded hover:border-gray-400 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(cat)}
                            className="text-xs border border-red-200 text-red-600 px-3 py-1 rounded hover:bg-red-50 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  );
}

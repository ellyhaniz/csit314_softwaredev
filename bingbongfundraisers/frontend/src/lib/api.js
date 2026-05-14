async function request(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(err.detail || 'Request failed');
  }
  return res.json();
}

// Auth
export const loginUser = (email, password) =>
  request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });

export const registerUser = (data) =>
  request('/api/auth/register', { method: 'POST', body: JSON.stringify(data) });

// Donations
export const donateToCampaign = (data) =>
  request('/api/donations', { method: 'POST', body: JSON.stringify(data) });

// FRA
export const createFRA = (data) =>
  request('/api/fra', { method: 'POST', body: JSON.stringify(data) });

export const getFRA = (fraId) => request(`/api/fra/${fraId}`);

export const getMyFRAs = (fundraiserId) => request(`/api/fra/fundraiser/${fundraiserId}`);

export const checkExpiredFRAs = () =>
  request('/api/fra/check-expired', { method: 'POST' });

export const postCampaignUpdate = (fraId, data) =>
  request(`/api/fra/${fraId}/updates`, { method: 'POST', body: JSON.stringify(data) });

export const getCampaignUpdates = (fraId) => request(`/api/fra/${fraId}/updates`);

export const getImpactScore = (fraId) => request(`/api/fra/${fraId}/impact`);

export const getProgress = (fraId) => request(`/api/fra/${fraId}/progress`);

// Search & Discovery
export const searchFRAs = (params) => {
  const q = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v))
  );
  return request(`/api/search?${q}`).then((data) =>
    Array.isArray(data) ? data : (data?.results ?? [])
  );
};

export const searchMatch = (query, donorId) =>
  request(`/api/search/match?query=${encodeURIComponent(query)}&donor_id=${donorId}`)
    .then((data) => Array.isArray(data) ? data : (data?.results ?? []));

export const getTrending = () => request('/api/recommendations/trending');

export const getRecommendations = (donorId) =>
  request(`/api/recommendations/${donorId}`);

export const getPreferences = (userId) =>
  request(`/api/preferences/${userId}`);

export const savePreferences = (userId, preferredCategories) =>
  request(`/api/preferences/${userId}`, {
    method: 'PUT',
    body: JSON.stringify({ preferred_categories: preferredCategories }),
  });

// Favourites
export const saveFavourite = (userId, fraId) =>
  request('/api/favourites', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, fra_id: fraId }),
  });

export const getFavourites = (userId) => request(`/api/favourites/${userId}`);

// Thank You
export const getDonorsForFRA = (fraId) => request(`/api/thank-you/donors/${fraId}`);

export const sendThankYou = (data) =>
  request('/api/thank-you', { method: 'POST', body: JSON.stringify(data) });

// Categories
export const getCategories = () => request('/api/categories');

export const createCategory = (name) =>
  request('/api/categories', { method: 'POST', body: JSON.stringify({ name }) });

export const updateCategory = (catId, name) =>
  request(`/api/categories/${catId}`, { method: 'PUT', body: JSON.stringify({ name }) });

export const deleteCategory = (catId) =>
  request(`/api/categories/${catId}`, { method: 'DELETE' });

// Reports
export const generateReport = (startDate, endDate, generatedBy) =>
  request('/api/reports', {
    method: 'POST',
    body: JSON.stringify({ start_date: startDate, end_date: endDate, generated_by: generatedBy }),
  });

export const getReport = (reportId) => request(`/api/reports/${reportId}`);

// Notifications
export const getNotifications = (userId) => request(`/api/notifications/${userId}`);
export const markAllRead = (userId) =>
  request(`/api/notifications/${userId}/read-all`, { method: 'POST' });

// Moderation
export const reportCampaign = (data) =>
  request('/api/moderation/reported', { method: 'POST', body: JSON.stringify(data) });

export const getReportedCampaigns = () => request('/api/moderation/reported');

export const actionReport = (reportId, data) =>
  request(`/api/moderation/reported/${reportId}/action`, {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const getFlaggedUsers = () => request('/api/moderation/users/flagged');

export const getUserViolations = (userId) =>
  request(`/api/moderation/users/${userId}/violations`);

export const actionUser = (userId, data) =>
  request(`/api/moderation/users/${userId}/action`, {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const getFlaggedDonations = () => request('/api/moderation/donations/flagged');

export const reviewDonation = (donationId, decision) =>
  request(`/api/moderation/donations/${donationId}/review`, {
    method: 'POST',
    body: JSON.stringify({ decision }),
  });

export const monitorSpikes = () =>
  request('/api/moderation/spikes/monitor', { method: 'POST' });

export const getSpikeAlerts = () => request('/api/moderation/spikes');

export const dismissSpike = (fraId) =>
  request(`/api/moderation/spikes/${fraId}/dismiss`, { method: 'POST' });

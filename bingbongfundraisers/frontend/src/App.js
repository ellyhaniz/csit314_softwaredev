import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

import Dashboard from './pages/fundraiser/Dashboard';
import CreateFRA from './pages/fundraiser/CreateFRA';
import PostUpdate from './pages/fundraiser/PostUpdate';

import Browse from './pages/donee/Browse';
import CampaignDetail from './pages/donee/CampaignDetail';
import Donate from './pages/donee/Donate';
import ThankDonors from './pages/donee/ThankDonors';
import Favourites from './pages/donee/Favourites';

import Home from './pages/home/Home';
import SearchMatch from './pages/home/SearchMatch';
import EditPreferences from './pages/home/EditPreferences';

import Reports from './pages/admin/Reports';
import Categories from './pages/admin/Categories';
import ReportedCampaigns from './pages/admin/ReportedCampaigns';
import Violations from './pages/admin/Violations';
import FlaggedDonations from './pages/admin/FlaggedDonations';
import SpikeAlerts from './pages/admin/SpikeAlerts';

function RequireAuth({ children, allowedTypes }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (allowedTypes && !allowedTypes.includes(user.user_type)) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function HomeRoute() {
  const { user } = useAuth();
  if (user?.user_type === 'fund_raiser') return <Navigate to="/dashboard" replace />;
  if (user?.user_type === 'donor') return <Navigate to="/recommendations" replace />;
  if (user?.user_type === 'donee') return <Navigate to="/browse" replace />;
  if (user?.user_type === 'user_admin') return <Navigate to="/admin/violations" replace />;
  if (user?.user_type === 'platform_management') return <Navigate to="/admin/reports" replace />;
  return <Home />;
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/browse" element={<Browse />} />
      <Route path="/fra/:id" element={<CampaignDetail />} />
      <Route path="/fra/:id/donate" element={
        <RequireAuth allowedTypes={['donor']}>
          <Donate />
        </RequireAuth>
      } />
      <Route path="/search" element={<SearchMatch />} />

      {/* Public home — redirects logged-in non-donee users to their page */}
      <Route path="/" element={<HomeRoute />} />
      <Route path="/recommendations" element={
        <RequireAuth allowedTypes={['donor', 'donee']}>
          <Home />
        </RequireAuth>
      } />
      <Route path="/preferences" element={
        <RequireAuth allowedTypes={['donor']}>
          <EditPreferences />
        </RequireAuth>
      } />
      <Route path="/favourites" element={
        <RequireAuth allowedTypes={['donor', 'donee']}>
          <Favourites />
        </RequireAuth>
      } />

      {/* Fund Raiser only */}
      <Route path="/dashboard" element={
        <RequireAuth allowedTypes={['fund_raiser']}>
          <Dashboard />
        </RequireAuth>
      } />
      <Route path="/fra/create" element={
        <RequireAuth allowedTypes={['fund_raiser']}>
          <CreateFRA />
        </RequireAuth>
      } />
      <Route path="/fra/:id/update" element={
        <RequireAuth allowedTypes={['fund_raiser']}>
          <PostUpdate />
        </RequireAuth>
      } />
      <Route path="/fra/:id/thank-donors" element={
        <RequireAuth allowedTypes={['fund_raiser', 'donee']}>
          <ThankDonors />
        </RequireAuth>
      } />

      {/* Platform Management */}
      <Route path="/admin/reports" element={
        <RequireAuth allowedTypes={['platform_management']}>
          <Reports />
        </RequireAuth>
      } />
      <Route path="/admin/categories" element={
        <RequireAuth allowedTypes={['platform_management']}>
          <Categories />
        </RequireAuth>
      } />
      <Route path="/admin/reported" element={
        <RequireAuth allowedTypes={['platform_management']}>
          <ReportedCampaigns />
        </RequireAuth>
      } />

      {/* User Admin */}
      <Route path="/admin/violations" element={
        <RequireAuth allowedTypes={['user_admin']}>
          <Violations />
        </RequireAuth>
      } />
      <Route path="/admin/donations" element={
        <RequireAuth allowedTypes={['user_admin']}>
          <FlaggedDonations />
        </RequireAuth>
      } />
      <Route path="/admin/spikes" element={
        <RequireAuth allowedTypes={['user_admin']}>
          <SpikeAlerts />
        </RequireAuth>
      } />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

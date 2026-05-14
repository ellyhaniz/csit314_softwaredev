import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthContext';
import Dashboard from './Dashboard';
import * as api from '../../lib/api';

jest.mock('../../lib/api');

const user = { id: 1, email: 'fr@b.com', user_type: 'fund_raiser', full_name: 'Patrick' };

function renderDashboard() {
  localStorage.setItem('dt_user', JSON.stringify(user));
  return render(<MemoryRouter><AuthProvider><Dashboard /></AuthProvider></MemoryRouter>);
}

afterEach(() => localStorage.clear());

test('shows welcome message with user name', async () => {
  api.searchFRAs.mockResolvedValue([]);
  renderDashboard();
  await waitFor(() => expect(screen.getByText(/Welcome back, Patrick/i)).toBeInTheDocument());
});

test('shows Create FRA button', async () => {
  api.searchFRAs.mockResolvedValue([]);
  renderDashboard();
  expect(screen.getByText('+ Create FRA')).toBeInTheDocument();
});

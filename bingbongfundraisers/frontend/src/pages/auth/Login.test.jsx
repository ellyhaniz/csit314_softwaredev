import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthContext';
import Login from './Login';
import * as api from '../../lib/api';

jest.mock('../../lib/api');

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

function renderLogin() {
  return render(
    <MemoryRouter><AuthProvider><Login /></AuthProvider></MemoryRouter>
  );
}

beforeEach(() => { localStorage.clear(); mockNavigate.mockClear(); });

test('renders email and password inputs', () => {
  renderLogin();
  expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
});

test('shows error on failed login', async () => {
  api.loginUser.mockRejectedValue(new Error('Invalid email or password'));
  renderLogin();
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'a@b.com' } });
  fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrong' } });
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
  await waitFor(() => expect(screen.getByText('Invalid email or password')).toBeInTheDocument());
});

test('redirects fund_raiser to /dashboard on success', async () => {
  api.loginUser.mockResolvedValue({ id: 1, email: 'fr@b.com', user_type: 'fund_raiser', full_name: 'FR' });
  renderLogin();
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'fr@b.com' } });
  fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'pass' } });
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/dashboard'));
});

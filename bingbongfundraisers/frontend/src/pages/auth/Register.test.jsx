import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthContext';
import Register from './Register';
import * as api from '../../lib/api';

jest.mock('../../lib/api');
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

function renderRegister() {
  return render(<MemoryRouter><AuthProvider><Register /></AuthProvider></MemoryRouter>);
}

beforeEach(() => { localStorage.clear(); mockNavigate.mockClear(); });

test('renders all required fields', () => {
  renderRegister();
  expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
});

test('shows error when registration fails', async () => {
  api.registerUser.mockRejectedValue(new Error('Email already registered'));
  renderRegister();
  fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Test' } });
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'a@b.com' } });
  fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'pass' } });
  fireEvent.click(screen.getByRole('button', { name: /create account/i }));
  await waitFor(() => expect(screen.getByText('Email already registered')).toBeInTheDocument());
});

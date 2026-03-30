import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import Login from '@/pages/Login';

const mockedNavigate = vi.fn();
const mockedLogin = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockedNavigate,
  };
});

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ login: mockedLogin }),
}));

vi.mock('@/components/Navbar', () => ({
  Navbar: () => <div data-testid="navbar" />,
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

describe('Login role redirects', () => {
  beforeEach(() => {
    mockedNavigate.mockReset();
    mockedLogin.mockReset();
    mockedLogin.mockResolvedValue(true);
  });

  it('routes management users to /management after success', async () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('tab', { name: /management/i }));
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'mgmt_user' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: /login as management/i }));

    await waitFor(() => {
      expect(mockedLogin).toHaveBeenCalledWith('mgmt_user', 'secret', 'management');
      expect(mockedNavigate).toHaveBeenCalledWith('/management');
    });
  });

  it('routes team users to /management/teams-dashboard after success', async () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('tab', { name: /team/i }));
    fireEvent.change(screen.getByLabelText('Team Username / Team Name'), { target: { value: 'royals' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: /login as team/i }));

    await waitFor(() => {
      expect(mockedLogin).toHaveBeenCalledWith('royals', 'secret', 'team');
      expect(mockedNavigate).toHaveBeenCalledWith('/management/teams-dashboard');
    });
  });
});

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SignUpForm } from './sign-up-form';

const mockPush = jest.fn();
const mockRefresh = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

// Relative path: next/jest resolves the `@/` alias for imports but not inside
// jest.mock(); both resolve to the same file so the page's import is intercepted.
const mockSignUp = jest.fn();
jest.mock('../../../lib/auth/client', () => ({
  authClient: {
    signUp: { email: (input: unknown) => mockSignUp(input) },
    signIn: { social: jest.fn() },
  },
}));

beforeEach(() => {
  mockSignUp.mockReset();
});

describe('SignUpForm validation', () => {
  it('marks every failing field on an empty submit and does not call the API', async () => {
    render(<SignUpForm />);

    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(screen.getByText('Enter your name.')).toBeInTheDocument();
    expect(screen.getByText('Enter your email.')).toBeInTheDocument();
    expect(screen.getByText('Password must be at least 8 characters.')).toBeInTheDocument();
    expect(screen.getByText('Please accept the Terms to continue.')).toBeInTheDocument();
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('submits to Neon Auth when every field is valid and consent is checked', async () => {
    mockSignUp.mockResolvedValue({ error: null });
    render(<SignUpForm />);

    await userEvent.type(screen.getByLabelText('Name'), 'Ana Skukan');
    await userEvent.type(screen.getByLabelText('Email'), 'ana@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'supersecret');
    await userEvent.type(screen.getByLabelText('Confirm password'), 'supersecret');
    await userEvent.click(screen.getByRole('checkbox'));

    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(mockSignUp).toHaveBeenCalledWith({
      name: 'Ana Skukan',
      email: 'ana@example.com',
      password: 'supersecret',
    });
  });
});

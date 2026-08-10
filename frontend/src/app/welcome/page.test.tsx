import { render, screen } from '@testing-library/react';
import WelcomePage from './page';

describe('WelcomePage', () => {
  it('shows the hero copy and overline', () => {
    render(<WelcomePage />);

    expect(screen.getByText('TRACK EVERYTHING YOU WATCH')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Every movie and show, in one place.' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Build your watchlist/)).toBeInTheDocument();
  });

  it('sends "Get started" to create account', () => {
    render(<WelcomePage />);

    expect(screen.getByRole('link', { name: 'Get started' })).toHaveAttribute(
      'href',
      '/auth/sign-up',
    );
  });

  it('shows the footer', () => {
    render(<WelcomePage />);

    expect(screen.getByText('© 2025 Scene · Made for film lovers')).toBeInTheDocument();
  });
});

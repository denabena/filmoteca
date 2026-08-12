import { render, screen } from '@testing-library/react';
import { AuthField } from './auth-field';

describe('AuthField', () => {
  it('shows the hint and no error state by default', () => {
    render(<AuthField id="password" label="Password" hint="At least 8 characters." />);

    expect(screen.getByText('At least 8 characters.')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).not.toHaveAttribute('aria-invalid');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders the error state associated with the field and announced', () => {
    render(
      <AuthField id="password" label="Password" error="Wrong password. Try again or reset it." />,
    );

    const input = screen.getByLabelText('Password');
    const alert = screen.getByRole('alert');

    expect(alert).toHaveTextContent('Wrong password. Try again or reset it.');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    // Associated with the field for screen readers.
    expect(input).toHaveAttribute('aria-describedby', 'password-error');
    expect(alert).toHaveAttribute('id', 'password-error');
  });

  it('shows the error instead of the hint when both are given', () => {
    render(
      <AuthField
        id="password"
        label="Password"
        hint="At least 8 characters."
        error="Wrong password. Try again or reset it."
      />,
    );

    expect(screen.getByText('Wrong password. Try again or reset it.')).toBeInTheDocument();
    expect(screen.queryByText('At least 8 characters.')).not.toBeInTheDocument();
  });
});

import { authErrorMessage, signInFieldError } from './errors';

describe('authErrorMessage', () => {
  it.each([
    ['USER_NOT_FOUND', 'No account found for this email.'],
    ['CREDENTIAL_ACCOUNT_NOT_FOUND', 'No account found for this email.'],
    ['INVALID_PASSWORD', 'Wrong password. Try again or reset it.'],
    ['INVALID_EMAIL_OR_PASSWORD', 'Email or password incorrect. Try again.'],
    ['USER_ALREADY_EXISTS', 'An account with this email already exists.'],
  ])('maps %s to its designed copy', (code, expected) => {
    expect(authErrorMessage({ code }, 'fallback')).toBe(expected);
  });

  it('falls back to the error message, then the fallback, for unknown codes', () => {
    expect(authErrorMessage({ code: 'WHATEVER', message: 'boom' }, 'fallback')).toBe('boom');
    expect(authErrorMessage({ code: 'WHATEVER' }, 'fallback')).toBe('fallback');
    expect(authErrorMessage(null, 'fallback')).toBe('fallback');
  });
});

describe('signInFieldError', () => {
  it('marks the Email field for an unknown account', () => {
    expect(signInFieldError({ code: 'USER_NOT_FOUND' })).toEqual({
      field: 'email',
      message: 'No account found for this email.',
    });
  });

  it('marks the Password field for a wrong password', () => {
    expect(signInFieldError({ code: 'INVALID_PASSWORD' })).toEqual({
      field: 'password',
      message: 'Wrong password. Try again or reset it.',
    });
  });

  it('marks the Password field with the combined copy for the collapsed default', () => {
    expect(signInFieldError({ code: 'INVALID_EMAIL_OR_PASSWORD' })).toEqual({
      field: 'password',
      message: 'Email or password incorrect. Try again.',
    });
  });
});

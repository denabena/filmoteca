import { avatarInitials, profileFromUser, shortName } from './current-user';

/**
 * A35, pinned down. The design draws the footer as "Mara K." and "MK", but
 * Create account captures a single **Name** field, so those two strings only
 * happen for a user who typed two words. Everything else here is a real shape a
 * Neon Auth account can arrive in, and the point of the file is that none of them
 * render blank.
 */
describe('the sidebar profile (FIL-83)', () => {
  describe('profileFromUser', () => {
    it('splits a two-word name the way the design assumes', () => {
      expect(profileFromUser({ name: 'Mara Kovač', email: 'mara@email.com' })).toEqual({
        firstName: 'Mara',
        lastName: 'Kovač',
        email: 'mara@email.com',
      });
    });

    // Everything after the first space is the last name, so a middle name or a
    // two-part surname stays intact rather than being dropped.
    it('keeps everything after the first space as the last name', () => {
      expect(profileFromUser({ name: 'Ana Maria de Souza', email: 'a@b.com' })).toMatchObject({
        firstName: 'Ana',
        lastName: 'Maria de Souza',
      });
    });

    it('leaves the last name empty for a one-word name', () => {
      expect(profileFromUser({ name: 'Mara', email: 'mara@email.com' })).toMatchObject({
        firstName: 'Mara',
        lastName: '',
      });
    });

    it.each([
      ['null', null],
      ['undefined', undefined],
      ['blank', '   '],
    ])('tolerates a %s name rather than rendering "undefined"', (_label, name) => {
      expect(profileFromUser({ name, email: 'mara@email.com' })).toMatchObject({
        firstName: '',
        lastName: '',
      });
    });
  });

  describe('shortName', () => {
    it('abbreviates the surname, as designed', () => {
      expect(shortName({ firstName: 'Mara', lastName: 'Kovač', email: 'mara@email.com' })).toBe(
        'Mara K.',
      );
    });

    // Not a designed state, and the common one for anyone who types a first name
    // only. "Mara ." would be worse than no abbreviation.
    it('renders a one-word name unabbreviated', () => {
      expect(shortName({ firstName: 'Mara', lastName: '', email: 'mara@email.com' })).toBe('Mara');
    });

    it('falls back to the email local part when there is no name at all', () => {
      expect(shortName({ firstName: '', lastName: '', email: 'mara@email.com' })).toBe('mara');
    });
  });

  describe('avatarInitials', () => {
    it('takes one letter from each name', () => {
      expect(
        avatarInitials({ firstName: 'Mara', lastName: 'Kovač', email: 'mara@email.com' }),
      ).toBe('MK');
    });

    it('takes one letter from a one-word name', () => {
      expect(avatarInitials({ firstName: 'Mara', lastName: '', email: 'mara@email.com' })).toBe(
        'M',
      );
    });

    // An empty circle reads as a failed image load rather than as a person with
    // no name, which is why this falls back rather than rendering nothing.
    it('falls back to the email initial when there is no name at all', () => {
      expect(avatarInitials({ firstName: '', lastName: '', email: 'mara@email.com' })).toBe('M');
    });

    it('uppercases whatever it derives', () => {
      expect(avatarInitials({ firstName: 'mara', lastName: 'kovač', email: 'm@e.com' })).toBe('MK');
    });
  });
});

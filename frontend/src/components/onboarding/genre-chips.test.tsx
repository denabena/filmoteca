import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { GENRES } from '@/lib/genres';
import { GenreChips } from './genre-chips';

function Harness() {
  const [value, setValue] = useState<string[]>([]);
  return <GenreChips value={value} onChange={setValue} />;
}

describe('GenreChips', () => {
  it('renders all twelve genres, none selected', () => {
    render(<Harness />);

    expect(screen.getAllByRole('button')).toHaveLength(GENRES.length);
    expect(screen.getByRole('button', { name: 'Sci-Fi' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('selects and deselects a chip on click', async () => {
    render(<Harness />);
    const scifi = screen.getByRole('button', { name: 'Sci-Fi' });

    await userEvent.click(scifi);
    expect(scifi).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(scifi);
    expect(scifi).toHaveAttribute('aria-pressed', 'false');
  });

  it('keeps multiple chips selected at once', async () => {
    render(<Harness />);

    await userEvent.click(screen.getByRole('button', { name: 'Drama' }));
    await userEvent.click(screen.getByRole('button', { name: 'Horror' }));

    expect(screen.getByRole('button', { name: 'Drama' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Horror' })).toHaveAttribute('aria-pressed', 'true');
  });
});

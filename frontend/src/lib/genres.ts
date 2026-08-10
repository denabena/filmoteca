/**
 * The app's twelve genres (A7), the set the onboarding chips and Settings use.
 * `id` is what gets stored on the profile's favoriteGenres; `color` is the chip
 * dot, taken from the Genre palette (Genre/1-8), cycling for the last four.
 *
 * The canonical genre-to-colour mapping ultimately belongs to the genre work
 * (FIL-43); this is a faithful assignment from the same palette until then.
 */
export interface Genre {
  id: string;
  label: string;
  color: string;
}

export const GENRES: Genre[] = [
  { id: 'sci-fi', label: 'Sci-Fi', color: '#A85CD6' },
  { id: 'drama', label: 'Drama', color: '#4E86E8' },
  { id: 'comedy', label: 'Comedy', color: '#E8A33D' },
  { id: 'thriller', label: 'Thriller', color: '#46C08A' },
  { id: 'action', label: 'Action', color: '#F0455F' },
  { id: 'romance', label: 'Romance', color: '#E85C9E' },
  { id: 'documentary', label: 'Documentary', color: '#33B1C4' },
  { id: 'horror', label: 'Horror', color: '#7B6EF0' },
  { id: 'animation', label: 'Animation', color: '#E8A33D' },
  { id: 'fantasy', label: 'Fantasy', color: '#A85CD6' },
  { id: 'mystery', label: 'Mystery', color: '#4E86E8' },
  { id: 'crime', label: 'Crime', color: '#F0455F' },
];

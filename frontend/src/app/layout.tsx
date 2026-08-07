import type { Metadata } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
// globals.css imports the Neon Auth stylesheet itself, into a named cascade
// layer. Importing it here instead would leave it unlayered, where its Preflight
// outranks every Tailwind utility in the app. See the comment in globals.css.
import './globals.css';
import { Providers } from './providers';

// Inter carries every text style in the design; Space Grotesk Bold is used only
// for the "Scene" wordmark. Both are variable fonts, so no weight list is needed.
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Scene',
  description: 'Every movie and show, in one place.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning because Neon Auth's UI provider uses next-themes,
    // which sets `style="color-scheme:…"` (and a theme class) on <html> from an
    // inline script before React hydrates. That is an intended pre-hydration
    // mutation, so the attribute diff on this one element is expected; the flag
    // silences only that, not real mismatches elsewhere in the tree.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

import type { Metadata } from 'next';
import './globals.css';
import '@neondatabase/auth/ui/css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Decode Academy Demo',
  description: 'Next.js frontend for the Decode Academy Demo teaching repo.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

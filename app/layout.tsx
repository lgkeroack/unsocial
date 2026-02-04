import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';

export const metadata: Metadata = {
  title: 'unsocial.me - Exit Social Media Gracefully',
  description: 'Back up your social media data and leave platforms on your own terms. Preserve your digital memories before deleting your accounts.',
  keywords: 'social media, backup, data export, delete account, privacy, digital freedom',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

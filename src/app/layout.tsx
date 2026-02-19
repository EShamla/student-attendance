import type { Metadata } from 'next';
import { Heebo } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';

const heebo = Heebo({
  subsets: ['hebrew', 'latin'],
  display: 'swap',
  variable: '--font-heebo',
});

export const metadata: Metadata = {
  title: 'מערכת נוכחות',
  description: 'מערכת ניהול נוכחות אקדמית עם אימות GPS',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl" className={heebo.variable}>
      <body className="font-sans antialiased bg-gray-50 text-gray-900 min-h-screen">
        {children}
        <Toaster richColors position="top-center" dir="rtl" />
      </body>
    </html>
  );
}

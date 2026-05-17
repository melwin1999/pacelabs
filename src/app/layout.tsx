import { Inter } from 'next/font/google'
import './globals.css'
import AppShell from '@/components/layout/AppShell'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  weight: ['400', '500', '600', '700', '800', '900'],
})

export const metadata = {
  title: 'PaceLabs',
  description: 'Claude-powered running coach',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'PaceLabs',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/icon-192.png', sizes: '192x192' },
      { url: '/icon-512.png', sizes: '512x512' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180' },
    ],
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0a0a0a',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} dark`}>
      <body className="antialiased font-sans">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
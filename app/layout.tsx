import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from '@/components/theme-provider'
import { PWAInstallPrompt } from '@/components/pwa-install-prompt'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'PersonaLink — AI LinkedIn Manager | Auto-Post Without Interference',
  description: 'PersonaLink is an AI LinkedIn manager that generates posts in your voice and publishes automatically. The best LinkedIn profile manager for founders, consultants and professionals in India.',
  keywords: [
    'AI LinkedIn manager',
    'LinkedIn profile manager',
    'LinkedIn automation tool India',
    'LinkedIn post generator AI',
    'auto post LinkedIn without interference',
    'LinkedIn content manager',
    'LinkedIn scheduler India',
    'AI post generator LinkedIn',
    'LinkedIn growth tool',
    'personal branding AI tool',
    'LinkedIn autopilot',
    'LinkedIn ghostwriter AI',
    'LinkedIn management software',
    'automated LinkedIn posting',
    'LinkedIn content automation India',
  ],
  authors: [{ name: 'PersonaLink' }],
  creator: 'PersonaLink',
  publisher: 'PersonaLink',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'PersonaLink',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: 'https://personalink.in',
    siteName: 'PersonaLink',
    title: 'PersonaLink — AI LinkedIn Manager | Posts Without Interference',
    description: 'Generate LinkedIn posts in your exact voice. Schedule and auto-publish without lifting a finger. Used by 100+ Indian professionals.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'PersonaLink AI LinkedIn Manager' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PersonaLink — AI LinkedIn Manager',
    description: 'AI generates LinkedIn posts in your voice and posts automatically. No interference needed.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://personalink.in',
  },
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0B458B',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://aoirhksbkoraaywephya.supabase.co" />
        <link rel="preconnect" href="https://checkout.razorpay.com" />
        <meta name="application-name" content="PersonaLink" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="PersonaLink" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="apple-touch-startup-image" href="/apple-touch-icon.png" />
      </head>
      <body className="overflow-x-hidden">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
          <PWAInstallPrompt />
          <Toaster richColors position="top-center" />
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  )
}

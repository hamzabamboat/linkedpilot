import type { Metadata, Viewport } from 'next'
import {
  Cormorant_Garamond,
  DM_Sans,
  Instrument_Serif,
  Playfair_Display,
  Fraunces,
  Geist,
  Inter,
  JetBrains_Mono,
} from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'
import { Analytics } from '@vercel/analytics/next'
import { AppearanceProvider } from '@/components/appearance-provider'
import { PWAInstallPrompt } from '@/components/pwa-install-prompt'

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
})
const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-dm-sans',
  display: 'swap',
})
const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: ['400'],
  style: ['normal', 'italic'],
  variable: '--font-instrument',
  display: 'swap',
})
const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['500'],
  style: ['normal', 'italic'],
  variable: '--font-playfair',
  display: 'swap',
})
const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['500'],
  style: ['italic'],
  variable: '--font-fraunces',
  display: 'swap',
})
const geist = Geist({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-geist',
  display: 'swap',
})
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
})
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-jetbrains',
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

const fontVars = [
  cormorant.variable,
  dmSans.variable,
  instrumentSerif.variable,
  playfair.variable,
  fraunces.variable,
  geist.variable,
  inter.variable,
  jetbrainsMono.variable,
].join(' ')

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontVars} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://aoirhksbkoraaywephya.supabase.co" />
        <link rel="preconnect" href="https://checkout.razorpay.com" />
        <meta name="application-name" content="PersonaLink" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="PersonaLink" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className="overflow-x-hidden">
        <AppearanceProvider>
          {children}
          <PWAInstallPrompt />
          <Toaster richColors position="top-center" />
          <Analytics />
        </AppearanceProvider>
      </body>
    </html>
  )
}

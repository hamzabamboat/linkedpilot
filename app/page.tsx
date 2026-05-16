'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion'
import { motion, useInView } from 'framer-motion'
import { useCurrency } from '@/hooks/use-currency'
import { AppearanceTrigger } from '@/components/appearance-trigger'
import { WordMark } from '@/components/word-mark'
import {
  Brain, CalendarClock, Mic, TrendingUp, Lightbulb, Repeat2, Check, ArrowRight, Zap,
} from 'lucide-react'

function LinkedinIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  )
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

const FEATURES = [
  { icon: Brain,        title: 'AI in Your Voice',    desc: 'Analyses your writing style and generates posts that sound exactly like you wrote them.' },
  { icon: CalendarClock,title: 'Smart Scheduling',    desc: 'Posts go live at the best times for your audience — automatically, no babysitting.' },
  { icon: Mic,          title: 'Voice Notes',         desc: 'Ramble for 2 minutes. We transcribe, refine, and turn it into a polished post.' },
  { icon: TrendingUp,   title: 'LinkedIn Score',      desc: 'Track your profile strength, engagement trends, and consistency over time.' },
  { icon: Lightbulb,    title: 'Trend Suggestions',   desc: 'Get 5 fresh post ideas every week based on what is trending in your industry.' },
  { icon: Repeat2,      title: 'Repurpose Engine',    desc: 'Turn your best post into 3 new angles. Maximum reach, minimum effort.' },
]

const FAQS = [
  { q: 'Will the posts sound like me?',          a: 'Yes. During onboarding we analyse your writing sample and build a voice fingerprint. Every post matches your vocabulary, sentence rhythm, and tone.' },
  { q: 'Can I edit posts before they go live?',  a: 'Always. You can choose Full Autopilot, Approve Before Posting, or Suggest Only. You are always in control.' },
  { q: 'How does the LinkedIn connection work?', a: "We use LinkedIn's official OAuth API. We only request posting permissions, never read your messages or connections." },
  { q: 'What happens if I hit my post limit?',   a: 'We send you a heads-up. You can upgrade your plan or wait for the next monthly reset — no surprise charges.' },
  { q: 'Is payment secure?',                     a: "Yes. All payments go through Razorpay or Dodo, trusted payment gateways. We never store your card details." },
  { q: 'Can I cancel anytime?',                  a: 'Yes. Cancel in one click from Settings. You keep access until the end of your billing period.' },
]

const PLANS = [
  { id: 'starter',  label: 'Starter',  price: 999,  posts: 12, features: ['AI generation', 'Scheduling', 'Story bank', 'Trends & suggestions', 'Image posts', 'LinkedIn Score'] },
  { id: 'standard', label: 'Standard', price: 2499, posts: 20, features: ['Everything in Starter', 'Voice notes', 'Analytics dashboard', 'Monthly image brief'], popular: true },
  { id: 'pro',      label: 'Pro',      price: 4999, posts: 30, features: ['Everything in Standard', 'Repurpose engine', 'Bulk generate 30 days', 'Team mode (3 profiles)', 'Priority AI generation'] },
]

const MARQUEE_PHRASES = [
  'Your voice, amplified.',
  'Consistency without burnout.',
  'Posts that sound like you.',
  'Grow while you sleep.',
  '3× more DMs.',
  'From lurker to thought leader.',
  'AI that learns your style.',
  'Your LinkedIn, on autopilot.',
]

const ease = [0.22, 1, 0.36, 1] as const

function FadeUp({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-72px' })
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 28 }} animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.65, delay, ease }} className={className}>
      {children}
    </motion.div>
  )
}

const staggerContainer = { hidden: {}, show: { transition: { staggerChildren: 0.09 } } }
const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease } },
}

function AnimatedPost() {
  const post = [
    '3 things I wish someone told me before my first VC meeting:',
    '',
    '1. They fund trajectories, not snapshots. Come with a narrative.',
    '',
    '2. The best pitch decks have 1 memorable slide. Not 30 okay ones.',
    '',
    '3. "We\'ll follow" usually means "we won\'t lead." Ask directly.',
    '',
    'P.S. — The meeting that changed everything for us started with a cold LinkedIn DM.',
    '',
    '#FounderLife #StartupAdvice #VentureCapital',
  ]
  const fullText = post.join('\n')
  const [displayed, setDisplayed] = useState('')
  const [cursor, setCursor] = useState(true)
  const idx = useRef(0)
  const done = useRef(false)

  useEffect(() => {
    const t = setInterval(() => setCursor(c => !c), 530)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (done.current) return
    const timer = setInterval(() => {
      if (idx.current >= fullText.length) { done.current = true; clearInterval(timer); return }
      setDisplayed(fullText.slice(0, idx.current + 1))
      idx.current++
    }, 18)
    return () => clearInterval(timer)
  }, [fullText])

  return (
    <motion.div
      initial={{ opacity: 0, x: 36, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ duration: 0.85, delay: 0.4, ease }}
      style={{
        background: '#fff', borderRadius: 20, padding: '24px 28px',
        maxWidth: 440, width: '100%',
        boxShadow: '0 32px 80px rgba(0,0,0,0.45), 0 0 80px color-mix(in srgb, var(--pl-accent) 12%, transparent), 0 1px 0 rgba(255,255,255,0.08)',
        border: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-lg"
          style={{ background: 'var(--pl-accent)' }}>A</div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: '#0a1024' }}>Arjun Mehta</div>
          <div style={{ fontSize: 12, color: '#8a92a6' }}>Founder &amp; CEO · 1st</div>
        </div>
        <div className="ml-auto rounded-full px-3.5 py-1 text-xs font-semibold" style={{ background: 'var(--pl-accent)', color: '#fff' }}>+ Follow</div>
      </div>
      <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.75, whiteSpace: 'pre-wrap', minHeight: 200 }}>
        {displayed}
        <motion.span animate={{ opacity: cursor ? 1 : 0 }} transition={{ duration: 0 }} style={{ fontWeight: 700, color: 'var(--pl-accent)' }}>|</motion.span>
      </div>
      <div className="mt-4 flex gap-5 pt-3.5" style={{ borderTop: '1px solid #f1f5f9' }}>
        {['👍 Like', '💬 Comment', '🔁 Repost'].map(a => (
          <span key={a} style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>{a}</span>
        ))}
      </div>
      <div className="mt-2.5">
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5" style={{ fontSize: 11, fontWeight: 600, background: 'var(--pl-accent-soft)', color: 'var(--pl-accent)', border: '1px solid var(--pl-accent-2)' }}>
          <span className="w-1.5 h-1.5 rounded-full inline-block animate-pulse" style={{ background: 'var(--pl-accent)' }} />
          AI-generated in your voice
        </span>
      </div>
    </motion.div>
  )
}

/* Eyebrow label for landing sections */
function SectionEyebrow({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return (
    <div style={{ fontFamily: 'var(--f-mono)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 14, color: light ? 'rgba(255,255,255,0.45)' : 'var(--pl-accent)' }}>
      // {children}
    </div>
  )
}

function HomeContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const currency = useCurrency()

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <div style={{ background: 'var(--bg)', color: 'var(--ink)' }}>

      {/* ── Nav ── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: scrolled ? 'color-mix(in srgb, var(--surface) 95%, transparent)' : 'transparent',
          backdropFilter: scrolled ? 'blur(16px)' : 'none',
          borderBottom: scrolled ? '1px solid var(--line)' : '1px solid rgba(255,255,255,0.06)',
          boxShadow: scrolled ? '0 1px 16px rgba(0,0,0,0.06)' : 'none',
        }}
      >
        <div className="max-w-[1140px] mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <WordMark />

          <div className="hidden md:flex gap-1 items-center">
            {['#features', '#pricing', '#faq'].map((href, i) => (
              <a key={href} href={href} className="transition-colors"
                style={{ padding: '8px 16px', fontSize: 14, fontWeight: 500, borderRadius: 8, color: scrolled ? 'var(--ink-2)' : 'rgba(255,255,255,0.65)' }}>
                {['Features', 'Pricing', 'FAQ'][i]}
              </a>
            ))}
            <div className="mx-1"><AppearanceTrigger variant="nav" /></div>
            <a
              href="/api/auth/linkedin"
              className="flex items-center gap-2 transition-all hover:opacity-90 ml-1"
              style={{
                padding: '8px 18px', borderRadius: 8, fontSize: 14, fontWeight: 600,
                background: 'var(--pl-accent)', color: '#fff',
              }}
            >
              <LinkedinIcon className="w-4 h-4" />
              Connect LinkedIn
            </a>
          </div>

          <button
            className="md:hidden p-2 rounded-lg transition-colors"
            style={{ color: scrolled ? 'var(--ink-2)' : 'rgba(255,255,255,0.8)' }}
            onClick={() => setMobileMenuOpen(o => !o)}
            aria-label="Menu"
          >
            {mobileMenuOpen
              ? <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
              : <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/></svg>
            }
          </button>
        </div>

        {mobileMenuOpen && (
          <div style={{ background: 'var(--surface)', borderTop: '1px solid var(--line)', padding: '16px' }} className="md:hidden flex flex-col gap-3">
            {[['#pricing', 'Pricing'], ['#faq', 'FAQ']].map(([href, label]) => (
              <a key={href} href={href} onClick={() => setMobileMenuOpen(false)}
                style={{ padding: '12px 0', color: 'var(--ink-2)', fontSize: 16, fontWeight: 500, borderBottom: '1px solid var(--line)' }}>
                {label}
              </a>
            ))}
            <a href="/api/auth/linkedin" className="flex items-center justify-center gap-2 transition-opacity hover:opacity-80"
              style={{ background: 'var(--pl-accent)', color: '#fff', borderRadius: 10, padding: '14px 20px', fontSize: 16, fontWeight: 600, marginTop: 4 }}>
              <LinkedinIcon className="w-4 h-4" />
              Connect LinkedIn
            </a>
          </div>
        )}
      </nav>

      {error && (
        <div className="text-center text-sm px-6 py-3" style={{ background: '#fef2f2', borderBottom: '1px solid #fecaca', color: '#dc2626', marginTop: 64 }}>
          {error === 'linkedin_denied' ? 'LinkedIn permissions were denied. Please try again.' : 'Something went wrong. Please try again.'}
        </div>
      )}

      {/* ── Hero ── */}
      <section
        className="relative overflow-hidden"
        style={{ minHeight: '92vh' }}
      >
        <div className="max-w-[1140px] mx-auto px-4 md:px-8 pt-28 md:pt-36 pb-36 md:pb-44 grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center relative">
          <motion.div initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }} className="text-center md:text-left">
            <motion.div variants={staggerItem}>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6" style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', fontSize: 13, fontWeight: 600, color: 'var(--ink-3)' }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--pl-accent)' }} />
                AI-powered LinkedIn growth
              </div>
            </motion.div>

            <motion.h1 variants={staggerItem} className="mb-5"
              style={{ fontFamily: 'var(--f-sans)', fontWeight: 800, fontSize: 'clamp(40px,7vw,72px)', lineHeight: 1.0, letterSpacing: '-0.04em', color: 'var(--ink)' }}>
              Your LinkedIn,<br />
              <span style={{ fontFamily: 'var(--f-display)', fontStyle: 'italic', fontWeight: 400, color: 'var(--pl-accent)', letterSpacing: '-0.02em' }}>on autopilot.</span>
            </motion.h1>

            <motion.p variants={staggerItem} className="leading-relaxed mb-8 max-w-[460px] mx-auto md:mx-0"
              style={{ fontSize: 'clamp(15px,1.5vw,18px)', color: 'var(--ink-3)', lineHeight: 1.8 }}>
              AI writes posts in your exact voice, schedules them at peak times, and grows your personal brand — while you focus on your actual work.
            </motion.p>

            <motion.div variants={staggerItem} className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
              <a href="/api/auth/linkedin"
                className="flex items-center justify-center gap-2.5 transition-all hover:opacity-90"
                style={{ height: 56, padding: '0 28px', borderRadius: 12, fontSize: 16, fontWeight: 700, background: 'var(--pl-accent)', color: '#fff', boxShadow: '0 24px 64px color-mix(in srgb, var(--pl-accent) 30%, transparent)' }}>
                <LinkedinIcon className="w-5 h-5" />
                Connect LinkedIn — Free
              </a>
              <button onClick={() => window.location.href = '/api/auth/google'}
                className="flex items-center justify-center gap-2.5 transition-all hover:opacity-80"
                style={{ height: 56, padding: '0 28px', borderRadius: 12, fontSize: 16, fontWeight: 600, color: 'var(--ink-2)', background: 'var(--surface-2)', border: '1px solid var(--line)' }}>
                <GoogleIcon className="w-5 h-5" />
                Continue with Google
              </button>
            </motion.div>

            <motion.p variants={staggerItem} className="mt-5 flex items-center gap-2 justify-center md:justify-start"
              style={{ fontSize: 13, color: 'var(--ink-4)' }}>
              <span className="flex -space-x-1.5">
                {['var(--pl-accent)', '#7c3aed', '#059669'].map((c, i) => (
                  <span key={i} className="w-6 h-6 rounded-full border-2" style={{ background: c, borderColor: 'var(--bg)' }} />
                ))}
              </span>
              Join 500+ founders already growing on LinkedIn
            </motion.p>
          </motion.div>

          <div className="flex justify-center">
            <AnimatedPost />
          </div>
        </div>

      </section>

      {/* ── Marquee strip ── */}
      <div className="overflow-hidden py-4" style={{ background: 'var(--pl-accent)', borderTop: 'none' }}>
        <div className="pl-marquee-track">
          <div className="pl-marquee-inner">
            {[...MARQUEE_PHRASES, ...MARQUEE_PHRASES].map((phrase, i) => (
              <span key={i} className="inline-flex items-center gap-4 px-6" style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.9)', fontFamily: 'var(--f-display)', fontStyle: 'italic', whiteSpace: 'nowrap' }}>
                {phrase}
                <span style={{ opacity: 0.4 }}>◆</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Stats grid ── */}
      <FadeUp>
        <section className="py-16 px-4 md:px-8" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--line)' }}>
          <div className="max-w-[1140px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: '500+', label: 'Founders & creators' },
              { value: '3×',   label: 'Avg DM increase' },
              { value: '98%',  label: 'Voice accuracy' },
              { value: '7-day',label: 'Free trial, no card' },
            ].map(stat => (
              <div key={stat.value} className="text-center">
                <div style={{ fontFamily: 'var(--f-sans)', fontWeight: 800, fontSize: 'clamp(28px,4vw,40px)', color: 'var(--pl-accent)', letterSpacing: '-0.04em', marginBottom: 4 }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: 13, color: 'var(--ink-4)', fontWeight: 500 }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </section>
      </FadeUp>

      {/* ── Floating fluid section ── */}
      <section className="relative overflow-hidden py-24 md:py-36 px-4 md:px-8 text-center" style={{ background: 'var(--bg-2)' }}>
        {/* Animated blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="pl-mesh">
            <div className="pl-mesh__blob" style={{ top: '-20%', left: '-10%' }} />
            <div className="pl-mesh__blob" style={{ bottom: '-20%', right: '-10%', animationDelay: '-8s' }} />
          </div>
        </div>
        <div className="relative max-w-[760px] mx-auto">
          <FadeUp>
            <SectionEyebrow>The difference</SectionEyebrow>
            <h2 style={{ fontFamily: 'var(--f-sans)', fontWeight: 700, fontSize: 'clamp(26px,4vw,48px)', color: 'var(--ink)', letterSpacing: '-0.035em', lineHeight: 1.08, marginBottom: 20 }}>
              Most &ldquo;AI writers&rdquo; hand you{' '}
              <span style={{ fontFamily: 'var(--f-display)', fontStyle: 'italic', fontWeight: 400, color: 'var(--pl-accent)' }}>a blank box.</span>
              <br />We hand you your own voice.
            </h2>
            <p style={{ fontSize: 16, color: 'var(--ink-4)', lineHeight: 1.7, maxWidth: 540, margin: '0 auto' }}>
              We analyse how you write — sentence rhythm, vocabulary, tone, punctuation quirks. Then every post sounds like you wrote it on a good day.
            </p>
          </FadeUp>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="features" className="py-20 md:py-28 px-4 md:px-8" style={{ background: 'var(--surface)', borderTop: '1px solid var(--line)' }}>
        <div className="max-w-[1140px] mx-auto">
          <FadeUp className="mb-16 md:mb-20">
            <SectionEyebrow>How it works</SectionEyebrow>
            <h2 style={{ fontFamily: 'var(--f-sans)', fontWeight: 700, fontSize: 'clamp(28px,4vw,52px)', color: 'var(--ink)', letterSpacing: '-0.035em', lineHeight: 1.05 }}>
              Three steps to LinkedIn<br className="hidden md:block" />{' '}
              <span style={{ fontFamily: 'var(--f-display)', fontStyle: 'italic', fontWeight: 400, color: 'var(--pl-accent)' }}>on autopilot</span>
            </h2>
          </FadeUp>

          <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-x-12 gap-y-14 md:gap-y-0"
            variants={staggerContainer} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }}>
            {[
              { n: '01', title: 'Connect LinkedIn',   desc: 'One-click OAuth. We get permission to post on your behalf. Takes 30 seconds.' },
              { n: '02', title: 'Tell us about you',  desc: 'Quick onboarding: your voice, goals, content pillars, and how much control you want.' },
              { n: '03', title: 'We handle the rest', desc: 'AI generates posts in your voice, schedules them, tracks analytics, and keeps improving.' },
            ].map(step => (
              <motion.div key={step.n} variants={staggerItem} className="relative">
                <div style={{ fontWeight: 900, lineHeight: 1, marginBottom: 8, fontSize: 96, color: 'var(--pl-accent)', opacity: 0.08, fontFamily: 'var(--f-sans)', letterSpacing: '-0.05em', userSelect: 'none' }}>
                  {step.n}
                </div>
                <div style={{ width: 32, height: 3, background: 'var(--pl-accent)', borderRadius: 2, marginBottom: 20 }} />
                <h3 style={{ fontWeight: 700, fontSize: 19, color: 'var(--ink)', letterSpacing: '-0.02em', marginBottom: 10 }}>{step.title}</h3>
                <p style={{ fontSize: 15, color: 'var(--ink-4)', lineHeight: 1.7 }}>{step.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Features bento ── */}
      <section className="py-20 md:py-28 px-4 md:px-8" style={{ background: 'var(--bg-2)', borderTop: '1px solid var(--line)' }}>
        <div className="max-w-[1140px] mx-auto">
          <FadeUp className="mb-14">
            <SectionEyebrow>Features</SectionEyebrow>
            <h2 style={{ fontFamily: 'var(--f-sans)', fontWeight: 700, fontSize: 'clamp(28px,4vw,52px)', color: 'var(--ink)', letterSpacing: '-0.035em', lineHeight: 1.05, marginBottom: 10 }}>
              Everything you need
            </h2>
            <p style={{ fontSize: 16, color: 'var(--ink-4)', maxWidth: 480, lineHeight: 1.6 }}>
              Built for founders, executives, and professionals serious about LinkedIn growth.
            </p>
          </FadeUp>

          <motion.div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-5"
            variants={staggerContainer} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }}>
            {FEATURES.map(f => {
              const Icon = f.icon
              return (
                <motion.div key={f.title} variants={staggerItem}>
                  <div
                    className="h-full transition-all duration-300 hover:-translate-y-1"
                    style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: '28px', boxShadow: 'var(--sh-1)' }}
                  >
                    <div className="flex items-center justify-center mb-5"
                      style={{ width: 44, height: 44, borderRadius: 'var(--r-md)', background: 'var(--pl-accent-soft)', border: '1px solid var(--pl-accent-2)' }}>
                      <Icon className="w-5 h-5" style={{ color: 'var(--pl-accent)' }} strokeWidth={1.75} />
                    </div>
                    <h3 style={{ fontWeight: 700, fontSize: 17, color: 'var(--ink)', letterSpacing: '-0.02em', marginBottom: 8 }}>{f.title}</h3>
                    <p style={{ fontSize: 14, color: 'var(--ink-4)', lineHeight: 1.65 }}>{f.desc}</p>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      </section>

      {/* ── Trust strip ── */}
      <FadeUp>
        <section className="py-14 px-4 md:px-8" style={{ background: 'var(--surface)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
          <div className="max-w-[1140px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { icon: '🔒', title: 'LinkedIn Official OAuth',  desc: 'Posting-only permissions. We never read your messages.' },
              { icon: '🛡️', title: 'No data resold',          desc: 'Your writing sample never leaves our servers.' },
              { icon: '💳', title: 'No surprise charges',     desc: 'Cancel anytime. You keep access until billing ends.' },
              { icon: '⚡', title: 'Built in India, for all', desc: 'INR pricing, Razorpay + Dodo, 99.9% uptime SLA.' },
            ].map(t => (
              <div key={t.title}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>{t.icon}</div>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)', marginBottom: 4 }}>{t.title}</div>
                <div style={{ fontSize: 13, color: 'var(--ink-4)', lineHeight: 1.5 }}>{t.desc}</div>
              </div>
            ))}
          </div>
        </section>
      </FadeUp>

      {/* ── Testimonials ── */}
      <section className="py-20 md:py-28 px-4 md:px-8" style={{ background: 'var(--bg)', borderTop: '1px solid var(--line)' }}>
        <div className="max-w-[1140px] mx-auto">
          <FadeUp className="mb-14">
            <SectionEyebrow>Social proof</SectionEyebrow>
            <h2 style={{ fontFamily: 'var(--f-sans)', fontWeight: 700, fontSize: 'clamp(28px,4vw,52px)', color: 'var(--ink)', letterSpacing: '-0.035em', lineHeight: 1.05, marginBottom: 10 }}>
              Real results,{' '}
              <span style={{ fontFamily: 'var(--f-display)', fontStyle: 'italic', fontWeight: 400, color: 'var(--pl-accent)' }}>real people</span>
            </h2>
            <p style={{ fontSize: 16, color: 'var(--ink-4)' }}>Founders, consultants and professionals growing on LinkedIn every day</p>
          </FadeUp>

          <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
            variants={staggerContainer} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }}>
            {[
              { quote: 'Went from posting once a month to 3× a week — without spending more time. My inbound DMs from potential clients tripled.', name: 'Rahul Gupta',     title: 'VP Sales, B2B SaaS',           initial: 'R' },
              { quote: 'As a career coach I need to stay visible. PersonaLink keeps me top-of-mind without taking up my whole morning.',           name: 'Neha Kapoor',    title: 'Career Coach, Delhi',          initial: 'N' },
              { quote: 'Generated 3 inbound investor leads in my first month. My posts were finally reaching the right people.',                   name: 'James Osei',     title: 'Co-founder, Accra',            initial: 'J' },
              { quote: "I'd been \"planning to post more\" for 2 years. PersonaLink made it happen in week one.",                                  name: 'Sofia Lindqvist', title: 'Marketing Director, Stockholm',initial: 'S' },
              { quote: 'The voice matching is eerily accurate. My team could not tell which posts were AI-assisted. That is the real magic.',       name: 'Marcus Williams', title: 'Product Manager, New York',   initial: 'M' },
              { quote: 'From lurker to thought leader in 90 days. LinkedIn profile views up 6×. Completely worth it.',                            name: 'Layla Hassan',   title: 'Brand Consultant, Dubai',      initial: 'L' },
            ].map(t => (
              <motion.div key={t.name} variants={staggerItem}>
                <div
                  className="h-full flex flex-col transition-all duration-300 hover:-translate-y-0.5"
                  style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: '24px', boxShadow: 'var(--sh-1)' }}
                >
                  <div className="flex gap-0.5 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className="w-4 h-4 fill-current" style={{ color: '#f59e0b' }} viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                      </svg>
                    ))}
                  </div>
                  <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.7, flexGrow: 1, marginBottom: 20 }}>&ldquo;{t.quote}&rdquo;</p>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                      style={{ background: 'var(--pl-accent)' }}>{t.initial}</div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink)' }}>{t.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-4)' }}>{t.title}</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-20 md:py-28 px-4 md:px-8" style={{ background: 'var(--surface)', borderTop: '1px solid var(--line)' }}>
        <div className="max-w-[1140px] mx-auto">
          <FadeUp className="text-center mb-12 md:mb-16">
            <SectionEyebrow>Pricing</SectionEyebrow>
            <h2 style={{ fontFamily: 'var(--f-sans)', fontWeight: 700, fontSize: 'clamp(28px,4vw,52px)', color: 'var(--ink)', letterSpacing: '-0.035em', lineHeight: 1.05, marginBottom: 10 }}>
              Simple, transparent pricing
            </h2>
            <div className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 mt-2"
              style={{ background: '#059669' + '18', border: '1px solid #059669' + '30', fontSize: 14, fontWeight: 600, color: '#059669' }}>
              <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
              7-day free trial on all plans — no credit card required
            </div>
          </FadeUp>

          <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch"
            variants={staggerContainer} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }}>
            {PLANS.map(p => (
              <motion.div key={p.id} variants={staggerItem}
                className="relative overflow-hidden h-full transition-all duration-300 hover:-translate-y-1"
                style={{
                  background: p.popular ? 'var(--pl-accent)' : 'var(--surface)',
                  border: p.popular ? 'none' : '1px solid var(--line)',
                  borderRadius: 'var(--r-lg)',
                  padding: '28px',
                  boxShadow: p.popular ? 'var(--sh-blue)' : 'var(--sh-1)',
                }}>
                <div className="h-full flex flex-col">
                  {p.popular && (
                    <div className="inline-block rounded-full px-3.5 py-1 mb-4 w-fit"
                      style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 11, fontWeight: 700 }}>
                      Most Popular
                    </div>
                  )}
                  <div className="flex items-center gap-2 mb-2">
                    <span style={{ fontSize: 13, fontWeight: 600, color: p.popular ? 'rgba(255,255,255,0.7)' : 'var(--ink-3)' }}>{p.label}</span>
                    <span className="rounded-full px-2 py-0.5" style={{ fontSize: 10, fontWeight: 700, background: p.popular ? 'rgba(255,255,255,0.15)' : '#ecfdf5', color: p.popular ? '#fff' : '#059669' }}>7-day trial</span>
                  </div>
                  <div style={{ fontSize: 42, fontWeight: 800, letterSpacing: '-0.04em', color: p.popular ? '#fff' : 'var(--ink)', marginBottom: 4 }}>
                    {currency.symbol}{(p.id === 'starter' ? currency.starter : p.id === 'standard' ? currency.standard : currency.pro).toLocaleString()}
                  </div>
                  <div style={{ fontSize: 13, marginBottom: 24, color: p.popular ? 'rgba(255,255,255,0.6)' : 'var(--ink-4)' }}>/month · {p.posts} posts</div>
                  <div className="flex flex-col gap-3 flex-1">
                    {p.features.map(f => (
                      <div key={f} className="flex items-center gap-2.5" style={{ fontSize: 14, color: p.popular ? 'rgba(255,255,255,0.85)' : 'var(--ink-2)' }}>
                        <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                          style={{ background: p.popular ? 'rgba(255,255,255,0.18)' : 'var(--pl-accent-soft)' }}>
                          <Check className="w-2.5 h-2.5" style={{ color: p.popular ? '#fff' : 'var(--pl-accent)' }} strokeWidth={2.5} />
                        </div>
                        {f}
                      </div>
                    ))}
                  </div>
                  <div className="mt-8">
                    <a href="/api/auth/linkedin"
                      className="flex items-center justify-center gap-2 w-full transition-all hover:opacity-90"
                      style={{
                        padding: '14px 20px', borderRadius: 'var(--r-md)', fontWeight: 700, fontSize: 15,
                        background: p.popular ? '#fff' : 'var(--pl-accent)',
                        color: p.popular ? 'var(--pl-accent)' : '#fff',
                        border: 'none',
                      }}>
                      Start Free Trial <ArrowRight className="w-4 h-4" />
                    </a>
                    <div className="text-center mt-2.5" style={{ fontSize: 11, color: p.popular ? 'rgba(255,255,255,0.45)' : 'var(--ink-4)' }}>
                      Free for 7 days, then {currency.symbol}{(p.id === 'starter' ? currency.starter : p.id === 'standard' ? currency.standard : currency.pro).toLocaleString()}/mo
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-20 md:py-28 px-4 md:px-8" style={{ background: 'var(--bg-2)', borderTop: '1px solid var(--line)' }}>
        <div className="max-w-[760px] mx-auto">
          <FadeUp className="mb-12 md:mb-16">
            <SectionEyebrow>FAQ</SectionEyebrow>
            <h2 style={{ fontFamily: 'var(--f-sans)', fontWeight: 700, fontSize: 'clamp(28px,4vw,52px)', color: 'var(--ink)', letterSpacing: '-0.035em' }}>
              Frequently asked
            </h2>
          </FadeUp>
          <FadeUp delay={0.08}>
            <Accordion multiple={false} className="flex flex-col gap-2">
              {FAQS.map((faq, i) => (
                <AccordionItem key={i} value={String(i)}
                  className="overflow-hidden px-0"
                  style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)' }}>
                  <AccordionTrigger
                    className="px-6 py-5 hover:no-underline transition-colors"
                    style={{ fontWeight: 600, fontSize: 15, color: 'var(--ink)' }}>
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-5" style={{ fontSize: 15, color: 'var(--ink-4)', lineHeight: 1.75 }}>
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </FadeUp>
        </div>
      </section>

      {/* ── CTA ── */}
      <FadeUp>
        <section
          className="relative py-20 md:py-32 px-4 md:px-8 text-center overflow-hidden"
          style={{ background: 'linear-gradient(170deg, #070d1c 0%, #0b1628 65%, #0f1e3a 100%)', borderTop: '1px solid rgba(255,255,255,0.04)' }}
        >
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[600px] h-[400px]"
              style={{ background: 'radial-gradient(ellipse at center top, color-mix(in srgb, var(--pl-accent) 50%, transparent) 0%, transparent 65%)' }} />
            <div className="absolute inset-0 opacity-[0.02]"
              style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '28px 28px' }} />
          </div>

          <div className="relative max-w-[640px] mx-auto">
            <SectionEyebrow light>Get started today</SectionEyebrow>
            <h2 style={{ fontFamily: 'var(--f-sans)', fontWeight: 800, fontSize: 'clamp(26px,5vw,52px)', color: '#fff', letterSpacing: '-0.04em', lineHeight: 1.0, marginBottom: 16 }}>
              Start growing on LinkedIn{' '}
              <span style={{ fontFamily: 'var(--f-display)', fontStyle: 'italic', fontWeight: 400 }}>today</span>
            </h2>
            <p className="mb-8" style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>
              No credit card required. Set up in 10 minutes.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a href="/api/auth/linkedin"
                className="flex items-center justify-center gap-2.5 transition-all hover:opacity-90 hover:scale-[1.02]"
                style={{ height: 56, padding: '0 32px', borderRadius: 12, fontSize: 16, fontWeight: 700, background: '#fff', color: 'var(--pl-accent)', boxShadow: '0 24px 64px rgba(43,77,255,0.3)' }}>
                <LinkedinIcon className="w-5 h-5" style={{ color: 'var(--pl-accent)' }} />
                Connect LinkedIn — Free
              </a>
              <a href="/api/auth/google"
                className="flex items-center justify-center gap-2.5 transition-all hover:opacity-80"
                style={{ height: 56, padding: '0 32px', borderRadius: 12, fontSize: 16, fontWeight: 600, color: 'rgba(255,255,255,0.85)', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)' }}>
                <Zap className="w-5 h-5" />
                Continue with Google
              </a>
            </div>
          </div>
        </section>
      </FadeUp>

      {/* ── Footer ── */}
      <footer className="py-12 px-6 text-center" style={{ background: '#070d1c', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center justify-center mb-5">
          <WordMark iconSize={28} />
        </div>
        <div className="flex items-center justify-center gap-6 mb-5">
          {[['#features', 'Features'], ['#pricing', 'Pricing'], ['#faq', 'FAQ']].map(([href, label]) => (
            <a key={href} href={href} style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>{label}</a>
          ))}
        </div>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.22)' }}>© 2025 PersonaLink. Your LinkedIn, on autopilot.</p>
      </footer>
    </div>
  )
}

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'PersonaLink',
  applicationCategory: 'BusinessApplication',
  description: 'AI LinkedIn manager that generates posts in your voice and publishes automatically',
  url: 'https://personalink.in',
  offers: { '@type': 'AggregateOffer', lowPrice: '999', highPrice: '4999', priceCurrency: 'INR' },
  operatingSystem: 'Web',
  aggregateRating: { '@type': 'AggregateRating', ratingValue: '4.9', reviewCount: '47' },
}

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <Suspense><HomeContent /></Suspense>
    </>
  )
}

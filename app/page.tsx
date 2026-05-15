'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion'
import { motion, useInView } from 'framer-motion'
import { useCurrency } from '@/hooks/use-currency'
import { ThemeToggle } from '@/components/theme-toggle'
import {
  Brain,
  CalendarClock,
  Mic,
  TrendingUp,
  Lightbulb,
  Repeat2,
  Check,
  ArrowRight,
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
  { icon: Brain,        color: '#0B458B', bg: '#e8f0fb', title: 'AI in Your Voice',    desc: 'Analyses your writing style and generates posts that sound exactly like you wrote them.' },
  { icon: CalendarClock,color: '#059669', bg: '#ecfdf5', title: 'Smart Scheduling',    desc: 'Posts go live at the best times for your audience — automatically, no babysitting.' },
  { icon: Mic,          color: '#7c3aed', bg: '#f5f3ff', title: 'Voice Notes',         desc: 'Ramble for 2 minutes. We transcribe, refine, and turn it into a polished post.' },
  { icon: TrendingUp,   color: '#d97706', bg: '#fffbeb', title: 'LinkedIn Score',      desc: 'Track your profile strength, engagement trends, and consistency over time.' },
  { icon: Lightbulb,    color: '#0891b2', bg: '#ecfeff', title: 'Trend Suggestions',   desc: 'Get 5 fresh post ideas every week based on what is trending in your industry.' },
  { icon: Repeat2,      color: '#dc2626', bg: '#fef2f2', title: 'Repurpose Engine',    desc: 'Turn your best post into 3 new angles. Maximum reach, minimum effort.' },
]

const FAQS = [
  { q: 'Will the posts sound like me?',          a: 'Yes. During onboarding we analyse your writing sample and build a voice fingerprint. Every post matches your vocabulary, sentence rhythm, and tone.' },
  { q: 'Can I edit posts before they go live?',  a: 'Always. You can choose Full Autopilot, Approve Before Posting, or Suggest Only. You are always in control.' },
  { q: 'How does the LinkedIn connection work?', a: "We use LinkedIn's official OAuth API. We only request posting permissions, never read your messages or connections." },
  { q: 'What happens if I hit my post limit?',   a: 'We send you a heads-up. You can upgrade your plan or wait for the next monthly reset — no surprise charges.' },
  { q: 'Is Razorpay secure?',                    a: "Yes. All payments go through Razorpay, one of India's most trusted payment gateways. We never store your card details." },
  { q: 'Can I cancel anytime?',                  a: 'Yes. Cancel in one click from Settings. You keep access until the end of your billing period.' },
]

const PLANS = [
  { id: 'starter',  label: 'Starter',  price: 999,  posts: 12, features: ['AI generation', 'Scheduling', 'Story bank', 'Trends & suggestions', 'Image posts', 'LinkedIn Score'], color: '#64748b' },
  { id: 'standard', label: 'Standard', price: 2499, posts: 20, features: ['Everything in Starter', 'Voice notes', 'Analytics dashboard', 'Monthly image brief'], color: '#0B458B', popular: true },
  { id: 'pro',      label: 'Pro',      price: 4999, posts: 30, features: ['Everything in Standard', 'Repurpose engine', 'Competitor tracking', 'Bulk generate 30 days', 'Team mode (3 profiles)', 'Priority AI generation'], color: '#7c3aed' },
]

const ease = [0.22, 1, 0.36, 1] as const

function FadeUp({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-72px' })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.65, delay, ease }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09 } },
}
const staggerItem = {
  hidden: { opacity: 0, y: 24 },
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
    'P.S. — The meeting that changed everything for us started with a cold LinkedIn DM. What\'s the worst that can happen?',
    '',
    '#FounderLife #StartupAdvice #VentureCapital',
  ]
  const fullText = post.join('\n')

  const [displayed, setDisplayed] = useState('')
  const [cursor, setCursor] = useState(true)
  const idx = useRef(0)
  const done = useRef(false)

  useEffect(() => {
    const cursorTimer = setInterval(() => setCursor(c => !c), 530)
    return () => clearInterval(cursorTimer)
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
      initial={{ opacity: 0, x: 40, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ duration: 0.85, delay: 0.4, ease }}
      className="bg-white rounded-2xl p-5 md:p-7 max-w-[460px] w-full border border-white/10"
      style={{ boxShadow: '0 32px 80px rgba(0,0,0,0.5), 0 0 80px rgba(37,99,235,0.12), 0 1px 0 rgba(255,255,255,0.08)' }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#0B458B] to-[#083670] flex items-center justify-center text-white font-bold text-lg shadow-sm">A</div>
        <div>
          <div className="font-semibold text-slate-900 text-sm">Arjun Mehta</div>
          <div className="text-slate-500 text-xs">Founder & CEO · 1st</div>
        </div>
        <div className="ml-auto bg-[#0B458B] text-white rounded-full px-3.5 py-1 text-xs font-semibold">+ Follow</div>
      </div>

      <div className="text-sm text-slate-600 leading-[1.75] whitespace-pre-wrap min-h-[220px] font-[system-ui]">
        {displayed}
        <motion.span
          animate={{ opacity: cursor ? 1 : 0 }}
          transition={{ duration: 0 }}
          className="font-bold text-[#0B458B]"
        >|</motion.span>
      </div>

      <div className="mt-4 flex gap-5 border-t border-slate-100 pt-3.5">
        {['👍 Like', '💬 Comment', '🔁 Repost'].map(a => (
          <span key={a} className="text-xs text-slate-500 font-medium">{a}</span>
        ))}
      </div>
      <div className="mt-2.5">
        <span className="inline-flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-full px-2.5 py-0.5 text-[11px] text-green-700 font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
          AI-generated in your voice
        </span>
      </div>
    </motion.div>
  )
}

function PricingSlider() {
  const [idx, setIdx] = useState(1)
  const plan = PLANS[idx]
  const currency = useCurrency()
  const prices: Record<string, number> = { starter: currency.starter, standard: currency.standard, pro: currency.pro }
  const price = prices[plan.id]

  return (
    <div className="bg-white rounded-2xl p-6 md:p-10 border border-slate-200/70 max-w-[600px] mx-auto" style={{ boxShadow: '0 4px 32px rgba(0,0,0,0.05)' }}>
      <div className="text-center mb-8">
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease }}
          className="text-5xl font-black tracking-tight"
          style={{ color: plan.color }}
        >
          {currency.symbol}{price.toLocaleString()}<span className="text-lg font-medium text-slate-400">/mo</span>
        </motion.div>
        <div className="text-slate-500 text-base mt-1.5">
          {plan.posts} posts/month
          {currency.code !== 'INR' && <span className="text-xs text-slate-400 ml-1.5">(Billed in INR)</span>}
        </div>
      </div>

      <input
        type="range" min={0} max={2} step={1} value={idx}
        onChange={e => setIdx(Number(e.target.value))}
        className="mb-4"
        style={{ background: `linear-gradient(to right, ${plan.color} ${idx * 50}%, #e2e8f0 ${idx * 50}%)` }}
      />

      <div className="flex justify-between mb-8">
        {PLANS.map((p, i) => (
          <button key={p.id} onClick={() => setIdx(i)}
            className="bg-transparent border-none cursor-pointer text-sm px-2 py-1 transition-colors rounded-lg"
            style={{ fontWeight: i === idx ? 700 : 400, color: i === idx ? plan.color : '#94a3b8' }}>
            {p.label}
          </button>
        ))}
      </div>

      <motion.div
        key={idx}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="flex flex-col gap-3"
      >
        {plan.features.map(f => (
          <div key={f} className="flex items-center gap-2.5 text-[15px] text-slate-600">
            <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: plan.color + '15' }}>
              <Check className="w-3 h-3" style={{ color: plan.color }} strokeWidth={2.5} />
            </div>
            {f}
          </div>
        ))}
      </motion.div>

      <Button
        render={<a href="/api/auth/linkedin" />}
        className="w-full mt-8 h-14 text-base font-bold"
        style={{ background: plan.color }}
      >
        Start Free Trial — {plan.label}
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
      <p className="text-center text-[12px] text-slate-400 mt-3">Free for 7 days, then {currency.symbol}{price.toLocaleString()}/mo. Cancel anytime.</p>
    </div>
  )
}

/* ── Section label shared style ── */
function SectionLabel({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return (
    <div className={`text-[11px] font-bold uppercase tracking-[0.14em] mb-4 ${light ? 'text-blue-400' : 'text-[#0B458B]'}`}>
      {children}
    </div>
  )
}

function HomeContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <div>
      {/* ── Nav ── fixed, scroll-aware */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b ${
        scrolled
          ? 'bg-white/95 backdrop-blur-md border-slate-200/60 shadow-[0_1px_16px_rgba(0,0,0,0.06)]'
          : 'bg-transparent border-white/[0.08]'
      }`}>
        <div className="max-w-[1140px] mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="bg-white rounded-xl px-3 py-1.5 inline-flex items-center justify-center shadow-sm border border-slate-100 logo-always-white">
            <Image src="/logo-text.png" alt="PersonaLink" width={180} height={28} className="h-7 w-auto" priority />
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex gap-1 items-center">
            <a href="#pricing" className={`px-4 py-2 text-sm font-medium transition-colors rounded-lg ${scrolled ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-50' : 'text-white/70 hover:text-white'}`}>Pricing</a>
            <a href="#faq" className={`px-4 py-2 text-sm font-medium transition-colors rounded-lg ${scrolled ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-50' : 'text-white/70 hover:text-white'}`}>FAQ</a>
            <div className="mx-1"><ThemeToggle /></div>
            <Button render={<a href="/api/auth/linkedin" />} className="h-9 px-5 text-sm font-bold gap-2 shadow-sm ml-1">
              <LinkedinIcon className="w-4 h-4" />
              Connect LinkedIn
            </Button>
          </div>

          {/* Mobile hamburger */}
          <button
            className={`md:hidden p-2 rounded-lg transition-colors ${scrolled ? 'text-slate-600 hover:bg-slate-100' : 'text-white hover:bg-white/10'}`}
            onClick={() => setMobileMenuOpen(o => !o)}
            aria-label="Menu"
          >
            {mobileMenuOpen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/></svg>
            )}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-slate-100 px-4 py-4 flex flex-col gap-3">
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="py-3 text-slate-700 text-base font-medium border-b border-slate-100">Pricing</a>
            <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="py-3 text-slate-700 text-base font-medium border-b border-slate-100">FAQ</a>
            <Button render={<a href="/api/auth/linkedin" />} className="w-full h-12 text-base font-bold gap-2 mt-1">
              <LinkedinIcon className="w-4 h-4" />
              Connect LinkedIn
            </Button>
          </div>
        )}
      </nav>

      {error && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-3 text-center text-sm text-red-600 relative z-40" style={{ marginTop: '64px' }}>
          {error === 'linkedin_denied' ? 'LinkedIn permissions were denied. Please try again and accept all permissions.' : 'Something went wrong. Please try again.'}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          HERO — dark navy with Wispr-style blue glow
          ══════════════════════════════════════════════════════ */}
      <section
        className="relative overflow-hidden"
        style={{ background: 'linear-gradient(170deg, #070d1c 0%, #0b1628 65%, #0f1e3a 100%)', minHeight: '92vh' }}
      >
        {/* Radial blue glow */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute -top-48 left-1/2 -translate-x-1/2 w-[900px] h-[700px]"
            style={{ background: 'radial-gradient(ellipse at center top, rgba(37,99,235,0.55) 0%, rgba(37,99,235,0.12) 40%, transparent 70%)' }}
          />
          {/* Dot grid texture */}
          <div
            className="absolute inset-0 opacity-[0.025]"
            style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.9) 1px, transparent 0)', backgroundSize: '28px 28px' }}
          />
        </div>

        <div className="max-w-[1140px] mx-auto px-4 md:px-8 pt-28 md:pt-36 pb-36 md:pb-44 grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center relative">
          {/* Left — copy */}
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }}
            className="text-center md:text-left"
          >
            <motion.div variants={staggerItem}>
              <div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 text-[13px] font-semibold text-blue-300"
                style={{ background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(37,99,235,0.28)', backdropFilter: 'blur(8px)' }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                AI-powered LinkedIn growth
              </div>
            </motion.div>

            <motion.h1
              variants={staggerItem}
              className="text-[44px] md:text-[72px] font-black text-white leading-[1.0] mb-5 tracking-[-0.04em]"
            >
              Your LinkedIn,<br />
              <span className="gradient-text-hero">on autopilot.</span>
            </motion.h1>

            <motion.p
              variants={staggerItem}
              className="text-base md:text-lg leading-[1.8] mb-8 max-w-[460px] mx-auto md:mx-0"
              style={{ color: 'rgba(255,255,255,0.58)' }}
            >
              AI writes posts in your exact voice, schedules them at peak times, and grows your personal brand — while you focus on your actual work.
            </motion.p>

            <motion.div variants={staggerItem} className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
              <Button
                render={<a href="/api/auth/linkedin" />}
                className="h-14 px-7 text-base font-bold gap-2.5 bg-white hover:bg-blue-50 text-[#0B458B] shadow-2xl shadow-blue-500/20 transition-all duration-200 w-full sm:w-auto"
              >
                <LinkedinIcon className="w-5 h-5 text-[#0B458B]" />
                Connect LinkedIn — Free
              </Button>
              <button
                onClick={() => window.location.href = '/api/auth/google'}
                className="h-14 px-7 text-base font-semibold gap-2.5 text-white rounded-lg transition-all duration-200 w-full sm:w-auto flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.14)', backdropFilter: 'blur(8px)' }}
              >
                <GoogleIcon className="w-5 h-5 mr-2" />
                Continue with Google
              </button>
            </motion.div>

            <motion.p
              variants={staggerItem}
              className="mt-5 text-[13px] flex items-center gap-2 justify-center md:justify-start"
              style={{ color: 'rgba(255,255,255,0.35)' }}
            >
              <span className="flex -space-x-1.5">
                {['bg-blue-500', 'bg-purple-500', 'bg-emerald-500'].map((c, i) => (
                  <span key={i} className={`w-6 h-6 rounded-full border-2 ${c}`} style={{ borderColor: '#0b1628' }} />
                ))}
              </span>
              Join 500+ founders already growing on LinkedIn
            </motion.p>
          </motion.div>

          {/* Right — animated post card */}
          <div className="flex justify-center">
            <AnimatedPost />
          </div>
        </div>

        {/* Fade bottom to white */}
        <div
          className="absolute bottom-0 left-0 right-0 h-36 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, transparent, #ffffff)' }}
        />
      </section>

      {/* ══════════════════════════════════════════════════════
          HOW IT WORKS — Runlayer numbered ghost style
          ══════════════════════════════════════════════════════ */}
      <section className="bg-white py-20 md:py-28 px-4 md:px-8">
        <div className="max-w-[1140px] mx-auto">
          <FadeUp className="mb-16 md:mb-20">
            <SectionLabel>How it works</SectionLabel>
            <h2 className="text-3xl md:text-[52px] font-black text-slate-900 tracking-[-0.035em] leading-[1.05]">
              Three steps to LinkedIn<br className="hidden md:block" /> on autopilot
            </h2>
          </FadeUp>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-x-12 gap-y-14 md:gap-y-0"
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-60px' }}
          >
            {[
              { n: '01', title: 'Connect LinkedIn',  desc: 'One-click OAuth. We get permission to post on your behalf. Takes 30 seconds.' },
              { n: '02', title: 'Tell us about you', desc: 'Quick onboarding: your voice, goals, content pillars, and how much control you want.' },
              { n: '03', title: 'We handle the rest', desc: 'AI generates posts in your voice, schedules them, tracks analytics, and keeps improving.' },
            ].map((step) => (
              <motion.div key={step.n} variants={staggerItem} className="relative">
                <div
                  className="font-black leading-none mb-2 tracking-tight select-none"
                  style={{ fontSize: '96px', color: '#0B458B', opacity: 0.08 }}
                >
                  {step.n}
                </div>
                <div className="w-8 h-[3px] bg-[#0B458B] rounded-full mb-5" />
                <h3 className="font-bold text-slate-900 mb-3 text-[19px] tracking-tight">{step.title}</h3>
                <p className="text-slate-500 leading-relaxed text-[15px]">{step.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          FEATURES — sharp white cards on pale blue bg
          ══════════════════════════════════════════════════════ */}
      <section className="py-20 md:py-28 px-4 md:px-8 border-t border-slate-100" style={{ background: '#f7f9ff' }}>
        <div className="max-w-[1140px] mx-auto">
          <FadeUp className="mb-14">
            <SectionLabel>Features</SectionLabel>
            <h2 className="text-3xl md:text-[52px] font-black text-slate-900 tracking-[-0.035em] leading-[1.05] mb-3">Everything you need</h2>
            <p className="text-slate-500 text-base md:text-lg max-w-[480px]">Built for founders, executives, and professionals serious about LinkedIn</p>
          </FadeUp>

          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-5"
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-60px' }}
          >
            {FEATURES.map(f => {
              const Icon = f.icon
              return (
                <motion.div key={f.title} variants={staggerItem}>
                  <Card className="h-full bg-white border-slate-200/60 cursor-default transition-all duration-300 hover:border-blue-200 hover:shadow-[0_8px_40px_rgba(11,69,139,0.08)] hover:-translate-y-1">
                    <CardContent className="pt-7 pb-7">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-5" style={{ background: f.bg }}>
                        <Icon className="w-5 h-5" style={{ color: f.color }} strokeWidth={1.75} />
                      </div>
                      <h3 className="font-bold text-slate-900 mb-2 text-[17px] tracking-tight">{f.title}</h3>
                      <p className="text-slate-500 leading-relaxed text-sm">{f.desc}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          TESTIMONIALS — white, cleaner layout
          ══════════════════════════════════════════════════════ */}
      <section className="py-20 md:py-28 px-4 md:px-8 bg-white border-t border-slate-100">
        <div className="max-w-[1140px] mx-auto">
          <FadeUp className="mb-14">
            <SectionLabel>What our users say</SectionLabel>
            <h2 className="text-3xl md:text-[52px] font-black text-slate-900 tracking-[-0.035em] leading-[1.05] mb-3">Real results, real people</h2>
            <p className="text-slate-500 text-base md:text-lg">Founders, consultants and professionals growing on LinkedIn every day</p>
          </FadeUp>

          {/* Featured rotating quote */}
          <div className="relative mx-auto mb-14" style={{ height: '190px', maxWidth: '700px' }}>
            <div className="testimonial-item absolute inset-0 flex flex-col items-center justify-center text-center px-4">
              <blockquote className="text-lg md:text-xl font-medium text-slate-700 leading-[1.65] mb-5">
                &ldquo;PersonaLink completely transformed my LinkedIn presence. I went from 0 to 3,000 followers in 60 days without writing a single post myself.&rdquo;
              </blockquote>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0B458B] to-[#083670] flex items-center justify-center text-white font-bold text-sm shrink-0">A</div>
                <div className="text-left">
                  <div className="font-semibold text-slate-900 text-sm">Arjun Mehta</div>
                  <div className="text-slate-400 text-xs">Founder &amp; CEO, Fintech Startup</div>
                </div>
              </div>
            </div>
            <div className="testimonial-item-2 absolute inset-0 flex flex-col items-center justify-center text-center px-4" style={{ opacity: 0 }}>
              <blockquote className="text-lg md:text-xl font-medium text-slate-700 leading-[1.65] mb-5">
                &ldquo;I was spending 3 hours a week on LinkedIn content. Now PersonaLink handles everything and my engagement is up 400%. Game changer.&rdquo;
              </blockquote>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#7c3aed] to-[#6d28d9] flex items-center justify-center text-white font-bold text-sm shrink-0">P</div>
                <div className="text-left">
                  <div className="font-semibold text-slate-900 text-sm">Priya Sharma</div>
                  <div className="text-slate-400 text-xs">Independent Consultant, Mumbai</div>
                </div>
              </div>
            </div>
          </div>

          {/* Grid */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-60px' }}
          >
            {[
              { quote: 'Went from posting once a month to 3× a week — without spending more time. My inbound DMs from potential clients tripled.', name: 'Rahul Gupta',     title: 'VP Sales, B2B SaaS',                initial: 'R', from: '#059669', to: '#047857' },
              { quote: 'As a career coach I need to stay visible. PersonaLink keeps me top-of-mind without taking up my whole morning.',           name: 'Neha Kapoor',    title: 'Career Coach, Delhi',               initial: 'N', from: '#7c3aed', to: '#6d28d9' },
              { quote: 'Generated 3 inbound investor leads in my first month. My posts were finally reaching the right people.',                    name: 'James Osei',     title: 'Co-founder, Accra',                 initial: 'J', from: '#0891b2', to: '#0e7490' },
              { quote: "I'd been \"planning to post more\" for 2 years. PersonaLink made it happen in week one. 40 new followers in the first 10 days.", name: 'Sofia Lindqvist', title: 'Marketing Director, Stockholm', initial: 'S', from: '#d97706', to: '#b45309' },
              { quote: 'The voice matching is eerily accurate. My team could not tell which posts were AI-assisted. That is the real magic.',        name: 'Marcus Williams', title: 'Product Manager, New York',        initial: 'M', from: '#dc2626', to: '#b91c1c' },
              { quote: 'From lurker to thought leader in 90 days. LinkedIn profile views up 6×. Completely worth it.',                             name: 'Layla Hassan',   title: 'Brand Consultant, Dubai',           initial: 'L', from: '#0B458B', to: '#083670' },
            ].map(t => (
              <motion.div key={t.name} variants={staggerItem}>
                <Card className="h-full border-slate-200/60 transition-all duration-300 hover:shadow-[0_4px_24px_rgba(0,0,0,0.07)] hover:-translate-y-0.5">
                  <CardContent className="pt-6 pb-6 flex flex-col h-full">
                    <div className="flex gap-0.5 mb-4">
                      {[...Array(5)].map((_, i) => (
                        <svg key={i} className="w-4 h-4 text-amber-400 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                      ))}
                    </div>
                    <p className="text-slate-600 text-[14px] leading-relaxed flex-1 mb-5">&ldquo;{t.quote}&rdquo;</p>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0" style={{ background: `linear-gradient(135deg, ${t.from}, ${t.to})` }}>{t.initial}</div>
                      <div>
                        <div className="font-semibold text-slate-900 text-[13px]">{t.name}</div>
                        <div className="text-slate-400 text-[11px]">{t.title}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          PRICING — pale blue bg
          ══════════════════════════════════════════════════════ */}
      <section id="pricing" className="py-20 md:py-28 px-4 md:px-8 border-t border-slate-100" style={{ background: '#f7f9ff' }}>
        <div className="max-w-[1140px] mx-auto">
          <FadeUp className="text-center mb-12 md:mb-16">
            <SectionLabel>Pricing</SectionLabel>
            <h2 className="text-3xl md:text-[52px] font-black text-slate-900 tracking-[-0.035em] leading-[1.05] mb-3">Simple, transparent pricing</h2>
            <p className="text-slate-500 text-base md:text-lg mb-5">Slide to see what each plan includes</p>
            <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-full px-4 py-1.5 text-sm font-semibold text-emerald-700">
              <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
              7-day free trial on all plans — no charge for 7 days
            </div>
          </FadeUp>

          <FadeUp delay={0.1}>
            <PricingSlider />
          </FadeUp>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-8 md:mt-12 items-stretch"
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-60px' }}
          >
            {PLANS.map(p => (
              <motion.div
                key={p.id}
                variants={staggerItem}
                className="rounded-2xl relative overflow-hidden h-full transition-all duration-300 hover:-translate-y-1"
                style={{
                  background: p.popular ? 'linear-gradient(145deg, #0B458B 0%, #083670 100%)' : 'white',
                  border: p.popular ? 'none' : '1px solid #e2e8f0',
                  padding: '32px 28px',
                  boxShadow: p.popular ? '0 24px 64px rgba(10,102,194,0.3)' : '0 1px 8px rgba(0,0,0,0.04)',
                }}
              >
                <div className="h-full flex flex-col">
                  {p.popular && (
                    <div className="inline-block bg-gradient-to-r from-amber-400 to-orange-400 text-white rounded-full px-3.5 py-1 text-xs font-bold mb-4 w-fit">
                      Most Popular
                    </div>
                  )}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-semibold" style={{ color: p.popular ? 'rgba(255,255,255,0.7)' : '#64748b' }}>{p.label}</span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: p.popular ? 'rgba(255,255,255,0.15)' : '#ecfdf5', color: p.popular ? 'white' : '#059669' }}>7-day free trial</span>
                  </div>
                  <div className="text-[42px] font-black mb-1 tracking-tight" style={{ color: p.popular ? 'white' : '#0f172a' }}>₹{p.price.toLocaleString('en-IN')}</div>
                  <div className="text-[13px] mb-7" style={{ color: p.popular ? 'rgba(255,255,255,0.6)' : '#64748b' }}>/month · {p.posts} posts</div>
                  <div className="flex flex-col gap-3 flex-1">
                    {p.features.map(f => (
                      <div key={f} className="flex items-center gap-2.5 text-sm" style={{ color: p.popular ? 'rgba(255,255,255,0.85)' : '#374151' }}>
                        <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{ background: p.popular ? 'rgba(255,255,255,0.18)' : '#e8f0fb' }}>
                          <Check className="w-2.5 h-2.5" style={{ color: p.popular ? 'white' : '#0B458B' }} strokeWidth={2.5} />
                        </div>
                        {f}
                      </div>
                    ))}
                  </div>
                  <div className="mt-8">
                    <a
                      href="/api/auth/linkedin"
                      className="w-full py-3.5 rounded-xl font-bold text-[15px] transition-all duration-200 flex items-center justify-center gap-2 hover:opacity-90"
                      style={{
                        border: p.popular ? 'none' : '1.5px solid #0B458B',
                        background: p.popular ? 'white' : 'transparent',
                        color: '#0B458B',
                        textDecoration: 'none',
                      }}
                    >
                      Start Free Trial
                      <ArrowRight className="w-4 h-4" />
                    </a>
                    <div className="text-center text-[11px] mt-2.5" style={{ color: p.popular ? 'rgba(255,255,255,0.45)' : '#94a3b8' }}>
                      Free for 7 days, then ₹{p.price.toLocaleString('en-IN')}/mo
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          FAQ — white
          ══════════════════════════════════════════════════════ */}
      <section id="faq" className="py-20 md:py-28 px-4 md:px-8 bg-white border-t border-slate-100">
        <div className="max-w-[760px] mx-auto">
          <FadeUp className="mb-12 md:mb-16">
            <SectionLabel>FAQ</SectionLabel>
            <h2 className="text-3xl md:text-[52px] font-black text-slate-900 tracking-[-0.035em]">Frequently asked</h2>
          </FadeUp>
          <FadeUp delay={0.08}>
            <Accordion multiple={false} className="flex flex-col gap-2">
              {FAQS.map((faq, i) => (
                <AccordionItem key={i} value={String(i)} className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden px-0">
                  <AccordionTrigger className="px-6 py-5 font-semibold text-slate-900 text-[15px] hover:no-underline hover:text-[#0B458B] transition-colors">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-5 text-slate-500 text-[15px] leading-[1.75]">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </FadeUp>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          CTA — dark navy matching hero
          ══════════════════════════════════════════════════════ */}
      <FadeUp>
        <section
          className="relative py-20 md:py-32 px-4 md:px-8 text-center overflow-hidden border-t border-white/5"
          style={{ background: 'linear-gradient(170deg, #070d1c 0%, #0b1628 65%, #0f1e3a 100%)' }}
        >
          {/* Glow */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div
              className="absolute -top-24 left-1/2 -translate-x-1/2 w-[600px] h-[400px]"
              style={{ background: 'radial-gradient(ellipse at center top, rgba(37,99,235,0.5) 0%, transparent 65%)' }}
            />
            <div
              className="absolute inset-0 opacity-[0.02]"
              style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '28px 28px' }}
            />
          </div>

          <div className="relative max-w-[640px] mx-auto">
            <SectionLabel light>Get started today</SectionLabel>
            <h2 className="text-[28px] md:text-[52px] font-black text-white mb-4 tracking-[-0.04em] leading-[1.0]">
              Start growing on LinkedIn today
            </h2>
            <p className="mb-8 text-base md:text-lg" style={{ color: 'rgba(255,255,255,0.52)' }}>
              No credit card required. Set up in 10 minutes.
            </p>
            <Button
              render={<a href="/api/auth/linkedin" />}
              className="h-14 px-9 text-base font-bold gap-2.5 bg-white hover:bg-blue-50 text-[#0B458B] shadow-2xl shadow-blue-500/25 transition-all duration-200 hover:scale-[1.03] w-full sm:w-auto"
            >
              <LinkedinIcon className="w-5 h-5 text-[#0B458B]" />
              Connect LinkedIn — Free
            </Button>
          </div>
        </section>
      </FadeUp>

      {/* ── Footer ── */}
      <footer className="border-t border-white/[0.06] py-12 px-6 text-center" style={{ background: '#070d1c' }}>
        <div className="flex items-center justify-center mb-4">
          <div className="bg-white rounded-lg px-3 py-1.5 logo-always-white">
            <Image src="/logo-text.png" alt="PersonaLink" width={154} height={24} className="h-6 w-auto" />
          </div>
        </div>
        <p className="text-[13px]" style={{ color: 'rgba(255,255,255,0.28)' }}>© 2025 PersonaLink. Your LinkedIn, on autopilot.</p>
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
  offers: {
    '@type': 'AggregateOffer',
    lowPrice: '999',
    highPrice: '4999',
    priceCurrency: 'INR',
  },
  operatingSystem: 'Web',
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.9',
    reviewCount: '47',
  },
}

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <Suspense><HomeContent /></Suspense>
    </>
  )
}

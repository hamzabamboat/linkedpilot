'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion'
import { motion, useInView } from 'framer-motion'
import {
  Brain,
  CalendarClock,
  Mic,
  TrendingUp,
  Lightbulb,
  Repeat2,
  Check,
  ArrowRight,
  ChevronRight,
} from 'lucide-react'

function LinkedinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  )
}

const FEATURES = [
  {
    icon: Brain,
    color: '#0A66C2',
    bg: '#e8f0fb',
    title: 'AI in Your Voice',
    desc: 'Analyses your writing style and generates posts that sound exactly like you wrote them.',
  },
  {
    icon: CalendarClock,
    color: '#059669',
    bg: '#ecfdf5',
    title: 'Smart Scheduling',
    desc: 'Posts go live at the best times for your audience — automatically, no babysitting.',
  },
  {
    icon: Mic,
    color: '#7c3aed',
    bg: '#f5f3ff',
    title: 'Voice Notes',
    desc: 'Ramble for 2 minutes. We transcribe, refine, and turn it into a polished post.',
  },
  {
    icon: TrendingUp,
    color: '#d97706',
    bg: '#fffbeb',
    title: 'LinkedIn Score',
    desc: 'Track your profile strength, engagement trends, and consistency over time.',
  },
  {
    icon: Lightbulb,
    color: '#0891b2',
    bg: '#ecfeff',
    title: 'Trend Suggestions',
    desc: 'Get 5 fresh post ideas every week based on what is trending in your industry.',
  },
  {
    icon: Repeat2,
    color: '#dc2626',
    bg: '#fef2f2',
    title: 'Repurpose Engine',
    desc: 'Turn your best post into 3 new angles. Maximum reach, minimum effort.',
  },
]

const FAQS = [
  { q: 'Will the posts sound like me?', a: 'Yes. During onboarding we analyse your writing sample and build a voice fingerprint. Every post matches your vocabulary, sentence rhythm, and tone.' },
  { q: 'Can I edit posts before they go live?', a: 'Always. You can choose Full Autopilot, Approve Before Posting, or Suggest Only. You are always in control.' },
  { q: "How does the LinkedIn connection work?", a: "We use LinkedIn's official OAuth API. We only request posting permissions, never read your messages or connections." },
  { q: 'What happens if I hit my post limit?', a: 'We send you a heads-up. You can upgrade your plan or wait for the next monthly reset — no surprise charges.' },
  { q: 'Is Razorpay secure?', a: "Yes. All payments go through Razorpay, one of India's most trusted payment gateways. We never store your card details." },
  { q: 'Can I cancel anytime?', a: 'Yes. Cancel in one click from Settings. You keep access until the end of your billing period.' },
]

const PLANS = [
  { id: 'starter', label: 'Starter', price: 999, posts: 12, features: ['AI generation', 'Scheduling', 'Story bank', 'Trends & suggestions', 'Image posts', 'LinkedIn Score'], color: '#64748b' },
  { id: 'standard', label: 'Standard', price: 2500, posts: 20, features: ['Everything in Starter', 'Voice notes', 'Analytics dashboard', 'Monthly image brief'], color: '#0A66C2', popular: true },
  { id: 'pro', label: 'Pro', price: 5000, posts: 30, features: ['Everything in Standard', 'Repurpose engine', 'Competitor tracking', 'Bulk generate 30 days', 'Team mode (3 profiles)', 'Priority AI generation'], color: '#7c3aed' },
]

const ease = [0.22, 1, 0.36, 1] as const

function FadeUp({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-72px' })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay, ease }}
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
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease } },
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
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, x: 32, scale: 0.97 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ duration: 0.75, delay: 0.35, ease }}
      className="bg-white rounded-2xl p-4 md:p-6 shadow-[0_24px_64px_rgba(0,0,0,0.10)] max-w-[460px] w-full border border-slate-200/80"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-brand to-brand-dark flex items-center justify-center text-white font-bold text-lg shadow-sm">A</div>
        <div>
          <div className="font-semibold text-slate-900 text-sm">Arjun Mehta</div>
          <div className="text-slate-500 text-xs">Founder & CEO · 1st</div>
        </div>
        <div className="ml-auto bg-brand text-white rounded-full px-3.5 py-1 text-xs font-semibold">+ Follow</div>
      </div>

      <div className="text-sm text-slate-600 leading-[1.75] whitespace-pre-wrap min-h-[220px] font-[system-ui]">
        {displayed}
        <motion.span
          animate={{ opacity: cursor ? 1 : 0 }}
          transition={{ duration: 0 }}
          className="font-bold text-brand"
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

  return (
    <div className="bg-white rounded-2xl p-5 md:p-10 shadow-[0_4px_24px_rgba(0,0,0,0.07)] max-w-[600px] mx-auto border border-slate-100">
      <div className="text-center mb-8">
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease }}
          className="text-5xl font-extrabold"
          style={{ color: plan.color }}
        >
          ₹{plan.price.toLocaleString('en-IN')}<span className="text-lg font-medium text-slate-400">/mo</span>
        </motion.div>
        <div className="text-slate-500 text-base mt-1.5">
          {plan.posts} posts/month
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
        className="flex flex-col gap-2.5"
      >
        {plan.features.map(f => (
          <div key={f} className="flex items-center gap-2.5 text-[15px] text-slate-600">
            <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: plan.color + '18' }}>
              <Check className="w-3 h-3" style={{ color: plan.color }} strokeWidth={2.5} />
            </div>
            {f}
          </div>
        ))}
      </motion.div>

      <Button
        onClick={() => window.location.href = '/api/auth/linkedin'}
        className="w-full mt-7 h-14 text-base font-bold"
        style={{ background: plan.color }}
      >
        Start Free Trial — {plan.label}
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
      <p className="text-center text-[12px] text-slate-400 mt-2.5">Free for 7 days, then ₹{plan.price.toLocaleString('en-IN')}/mo. Cancel anytime.</p>
    </div>
  )
}

function HomeContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="bg-slate-50">
      {/* Nav */}
      <nav className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-50">
        <div className="max-w-[1100px] mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-brand to-brand-dark rounded-[10px] flex items-center justify-center text-white font-extrabold text-lg shadow-sm">P</div>
            <span className="font-bold text-lg text-slate-900">PersonaLink</span>
          </div>
          {/* Desktop nav links */}
          <div className="hidden md:flex gap-2 items-center">
            <a href="#pricing" className="px-4 py-2 text-slate-500 text-sm font-medium hover:text-slate-900 transition-colors">Pricing</a>
            <a href="#faq" className="px-4 py-2 text-slate-500 text-sm font-medium hover:text-slate-900 transition-colors">FAQ</a>
            <Button
              onClick={() => window.location.href = '/api/auth/linkedin'}
              className="h-9 px-5 text-sm font-semibold gap-2 shadow-sm"
            >
              <LinkedinIcon className="w-4 h-4" />
              Connect LinkedIn
            </Button>
          </div>
          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
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
        {/* Mobile menu overlay */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-slate-100 px-4 py-4 flex flex-col gap-3">
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="py-3 text-slate-700 text-base font-medium border-b border-slate-100">Pricing</a>
            <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="py-3 text-slate-700 text-base font-medium border-b border-slate-100">FAQ</a>
            <Button
              onClick={() => window.location.href = '/api/auth/linkedin'}
              className="w-full h-12 text-base font-semibold gap-2 mt-1"
            >
              <LinkedinIcon className="w-4 h-4" />
              Connect LinkedIn
            </Button>
          </div>
        )}
      </nav>

      {error && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-3 text-center text-sm text-red-600">
          {error === 'linkedin_denied' ? 'LinkedIn permissions were denied. Please try again and accept all permissions.' : 'Something went wrong. Please try again.'}
        </div>
      )}

      {/* ── Hero ── */}
      <section className="hero-bg max-w-full">
        <div className="max-w-[1100px] mx-auto px-4 md:px-6 py-12 md:py-24 md:pb-20 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-center">
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.12 } } }}
          >
            <motion.div variants={staggerItem}>
              <div className="inline-flex items-center gap-2 bg-brand-light border border-brand/10 rounded-full px-3.5 py-1.5 mb-5 text-[13px] font-semibold text-brand">
                <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
                AI-powered LinkedIn growth
              </div>
            </motion.div>

            <motion.h1
              variants={staggerItem}
              className="text-[28px] md:text-[58px] font-extrabold text-slate-900 leading-[1.08] mb-4 md:mb-5 tracking-tight"
            >
              Your LinkedIn,<br />
              <span className="gradient-text">on autopilot.</span>
            </motion.h1>

            <motion.p variants={staggerItem} className="text-base md:text-lg text-slate-500 leading-[1.75] mb-7 md:mb-9 max-w-[440px]">
              AI writes posts in your exact voice, schedules them at peak times, and grows your personal brand — while you focus on your actual work.
            </motion.p>

            <motion.div variants={staggerItem} className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => window.location.href = '/api/auth/linkedin'}
                className="h-12 md:h-13 px-6 md:px-7 text-base font-bold gap-2.5 shadow-md shadow-brand/20 hover:shadow-lg hover:shadow-brand/25 transition-all duration-200 w-full sm:w-auto"
              >
                <LinkedinIcon className="w-5 h-5" />
                Connect LinkedIn — Free
              </Button>
              <Button
                render={<a href="#pricing" />}
                variant="outline"
                className="h-12 md:h-13 px-6 md:px-7 text-base font-semibold border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all duration-200 w-full sm:w-auto"
              >
                See pricing
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </motion.div>

            <motion.p variants={staggerItem} className="mt-4 text-[13px] text-slate-400 flex items-center gap-1.5">
              <span className="flex -space-x-1.5">
                {['bg-blue-500', 'bg-purple-500', 'bg-emerald-500'].map((c, i) => (
                  <span key={i} className={`w-5 h-5 rounded-full border-2 border-white ${c}`} />
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

      {/* ── How it works ── */}
      <section className="bg-white py-12 md:py-20 border-t border-b border-slate-100">
        <div className="max-w-[900px] mx-auto px-4 md:px-6 text-center">
          <FadeUp>
            <div className="inline-flex items-center gap-2 text-[12px] font-bold text-slate-400 uppercase tracking-widest mb-4">How it works</div>
            <h2 className="text-2xl md:text-4xl font-extrabold text-slate-900 mb-3 tracking-tight">Three steps to LinkedIn on autopilot</h2>
            <p className="text-slate-500 text-base md:text-lg mb-10 md:mb-14">Set up in 10 minutes, posts flowing within the hour.</p>
          </FadeUp>
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8"
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-72px' }}
          >
            {[
              { n: '01', title: 'Connect LinkedIn', desc: 'One-click OAuth. We get permission to post on your behalf. Takes 30 seconds.' },
              { n: '02', title: 'Tell us about you', desc: 'Quick onboarding: your voice, goals, content pillars, and how much control you want.' },
              { n: '03', title: 'We handle the rest', desc: 'AI generates posts in your voice, schedules them, tracks analytics, and keeps improving.' },
            ].map((step, i) => (
              <motion.div key={step.n} variants={staggerItem} className="text-center">
                <div className="relative inline-block mb-5">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand/10 to-brand/5 border border-brand/10 flex items-center justify-center mx-auto text-xl font-extrabold text-brand">
                    {step.n}
                  </div>
                  {i < 2 && (
                    <div className="absolute top-7 left-full w-8 h-px bg-gradient-to-r from-slate-200 to-transparent hidden" />
                  )}
                </div>
                <h3 className="font-bold text-slate-900 mb-2.5 text-lg">{step.title}</h3>
                <p className="text-slate-500 leading-relaxed text-[15px]">{step.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-12 md:py-20 px-4 md:px-6 section-gradient">
        <div className="max-w-[1100px] mx-auto">
          <FadeUp className="text-center mb-10 md:mb-14">
            <div className="inline-flex items-center gap-2 text-[12px] font-bold text-slate-400 uppercase tracking-widest mb-4">Features</div>
            <h2 className="text-2xl md:text-4xl font-extrabold text-slate-900 mb-3 tracking-tight">Everything you need</h2>
            <p className="text-slate-500 text-base md:text-lg">Built for founders, executives, and professionals serious about LinkedIn</p>
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
                  <Card className="h-full card-hover border-slate-100 cursor-default">
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

      {/* ── Pricing ── */}
      <section id="pricing" className="bg-white py-12 md:py-20 px-4 md:px-6 border-t border-slate-100">
        <div className="max-w-[1100px] mx-auto">
          <FadeUp className="text-center mb-10 md:mb-14">
            <div className="inline-flex items-center gap-2 text-[12px] font-bold text-slate-400 uppercase tracking-widest mb-4">Pricing</div>
            <h2 className="text-2xl md:text-4xl font-extrabold text-slate-900 mb-3 tracking-tight">Simple, transparent pricing</h2>
            <p className="text-slate-500 text-base md:text-lg mb-3">Slide to see what each plan includes</p>
            <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-full px-4 py-1.5 text-sm font-semibold text-emerald-700">
              <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
              7-day free trial on all plans — no charge for 7 days
            </div>
          </FadeUp>
          <FadeUp delay={0.1}>
            <PricingSlider />
          </FadeUp>
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-8 md:mt-12"
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-60px' }}
          >
            {PLANS.map(p => (
              <motion.div
                key={p.id}
                variants={staggerItem}
                className="rounded-2xl relative card-hover"
                style={{
                  background: p.popular ? 'linear-gradient(135deg, #0A66C2 0%, #084d93 100%)' : 'white',
                  border: p.popular ? 'none' : '1px solid #e2e8f0',
                  padding: '32px 28px',
                  boxShadow: p.popular ? '0 16px 48px rgba(10,102,194,0.25)' : '0 1px 3px rgba(0,0,0,0.05)',
                }}
              >
                {p.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-400 to-orange-400 text-white rounded-full px-4 py-1 text-xs font-bold whitespace-nowrap shadow-sm">
                    Most Popular
                  </div>
                )}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-semibold" style={{ color: p.popular ? 'rgba(255,255,255,0.7)' : '#64748b' }}>{p.label}</span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: p.popular ? 'rgba(255,255,255,0.2)' : '#ecfdf5', color: p.popular ? 'white' : '#059669' }}>7-day free trial</span>
                </div>
                <div className="text-[40px] font-extrabold mb-1 tracking-tight" style={{ color: p.popular ? 'white' : '#0f172a' }}>₹{p.price.toLocaleString('en-IN')}</div>
                <div className="text-[13px] mb-6" style={{ color: p.popular ? 'rgba(255,255,255,0.65)' : '#64748b' }}>/month · {p.posts} posts</div>
                <div className="flex flex-col gap-2.5 mb-7">
                  {p.features.map(f => (
                    <div key={f} className="flex items-center gap-2.5 text-sm" style={{ color: p.popular ? 'rgba(255,255,255,0.9)' : '#374151' }}>
                      <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{ background: p.popular ? 'rgba(255,255,255,0.2)' : '#e8f0fb' }}>
                        <Check className="w-2.5 h-2.5" style={{ color: p.popular ? 'white' : '#0A66C2' }} strokeWidth={2.5} />
                      </div>
                      {f}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => window.location.href = '/api/auth/linkedin'}
                  className="w-full py-3 rounded-xl font-bold text-[15px] cursor-pointer transition-all duration-200 flex items-center justify-center gap-2"
                  style={{
                    border: p.popular ? 'none' : '1.5px solid #0A66C2',
                    background: p.popular ? 'white' : 'transparent',
                    color: '#0A66C2',
                  }}
                >
                  Start Free Trial
                  <ArrowRight className="w-4 h-4" />
                </button>
                <div className="text-center text-[11px] mt-2" style={{ color: p.popular ? 'rgba(255,255,255,0.5)' : '#94a3b8' }}>
                  Free for 7 days, then ₹{p.price.toLocaleString('en-IN')}/mo
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-12 md:py-20 px-4 md:px-6 bg-slate-50">
        <div className="max-w-[720px] mx-auto">
          <FadeUp className="text-center mb-10 md:mb-14">
            <div className="inline-flex items-center gap-2 text-[12px] font-bold text-slate-400 uppercase tracking-widest mb-4">FAQ</div>
            <h2 className="text-2xl md:text-4xl font-extrabold text-slate-900 tracking-tight">Frequently asked</h2>
          </FadeUp>
          <FadeUp delay={0.08}>
            <Accordion multiple={false} className="flex flex-col gap-1">
              {FAQS.map((faq, i) => (
                <AccordionItem key={i} value={String(i)} className="bg-white rounded-xl border border-slate-200/80 overflow-hidden px-0 shadow-sm">
                  <AccordionTrigger className="px-6 py-5 font-semibold text-slate-900 text-[15px] hover:no-underline hover:text-brand transition-colors">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-5 text-slate-500 text-[15px] leading-[1.7]">
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
        <section className="relative py-14 md:py-24 px-4 md:px-6 text-center overflow-hidden" style={{ background: 'linear-gradient(135deg, #0A66C2 0%, #084d93 100%)' }}>
          <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
          <div className="relative">
            <h2 className="text-[24px] md:text-[42px] font-extrabold text-white mb-4 tracking-tight">Start growing on LinkedIn today</h2>
            <p className="text-white/75 text-base md:text-lg mb-7 md:mb-9">No credit card required. Set up in 10 minutes.</p>
            <Button
              onClick={() => window.location.href = '/api/auth/linkedin'}
              className="bg-white text-brand hover:bg-white/95 h-12 md:h-14 px-6 md:px-9 text-base md:text-[17px] font-bold shadow-xl shadow-black/20 gap-2.5 transition-all duration-200 hover:scale-105 w-full sm:w-auto"
            >
              <LinkedinIcon className="w-5 h-5" />
              Connect LinkedIn — Free
            </Button>
          </div>
        </section>
      </FadeUp>

      {/* Footer */}
      <footer className="bg-slate-900 py-10 px-6 text-center">
        <div className="flex items-center justify-center gap-2.5 mb-4">
          <div className="w-8 h-8 bg-gradient-to-br from-brand to-brand-dark rounded-lg flex items-center justify-center text-white font-extrabold text-base shadow-sm">P</div>
          <span className="font-bold text-base text-white">PersonaLink</span>
        </div>
        <p className="text-slate-500 text-[13px]">© 2025 PersonaLink. Your LinkedIn, on autopilot.</p>
      </footer>
    </div>
  )
}

export default function Home() {
  return <Suspense><HomeContent /></Suspense>
}

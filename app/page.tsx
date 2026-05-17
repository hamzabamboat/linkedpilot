'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, useInView } from 'framer-motion'
import { useCurrency } from '@/hooks/use-currency'
import { AppearanceTrigger } from '@/components/appearance-trigger'
import { WordMark } from '@/components/word-mark'
import { Check } from 'lucide-react'

/* ─── SVG icons ─── */
function LinkedinIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04s-2.14 1.44-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 .01-4.13 2.06 2.06 0 0 1-.01 4.13zm1.78 13.02H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
    </svg>
  )
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

/* ─── Framer Motion helpers ─── */
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

/* ─── Animated post card ─── */
function AnimatedPost() {
  const postLines = [
    '3 things I wish someone told me before my first VC meeting:',
    '',
    '1. They fund trajectories, not snapshots. Come with a narrative.',
    '',
    '2. The best pitch decks have 1 memorable slide. Not 30 okay ones.',
    '',
    "3. \"We'll follow\" usually means \"we won't lead.\" Ask directly.",
    '',
    "P.S. — The meeting that changed everything for us started with a cold LinkedIn DM.",
    '',
    '#FounderLife #StartupAdvice #VentureCapital',
  ]
  const fullText = postLines.join('\n')
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
    <div style={{ position: 'relative', width: '100%', maxWidth: 440 }}>
      {/* Ghost cards behind */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 20,
        background: 'var(--surface)', border: '1px solid var(--line)',
        transform: 'rotate(4deg) translateY(8px)',
        boxShadow: 'var(--sh-1)', zIndex: 0,
      }} />
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 20,
        background: 'var(--surface)', border: '1px solid var(--line)',
        transform: 'rotate(2deg) translateY(4px)',
        boxShadow: 'var(--sh-1)', zIndex: 1,
      }} />

      {/* Floating chip A — top-right */}
      <div style={{
        position: 'absolute', top: -18, right: -10, zIndex: 10,
        background: 'var(--surface)', border: '1px solid var(--line)',
        borderRadius: 'var(--r-pill)', padding: '6px 12px',
        fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--ink-3)',
        boxShadow: 'var(--sh-2)',
        animation: 'floaty 3.2s ease-in-out infinite',
        whiteSpace: 'nowrap',
      }}>
        ⌘&nbsp; draft&nbsp; →&nbsp; scheduled tue 9:14
      </div>

      {/* Floating chip B — bottom-left */}
      <div style={{
        position: 'absolute', bottom: 52, left: -16, zIndex: 10,
        background: 'var(--pl-accent)', borderRadius: 'var(--r-pill)', padding: '6px 12px',
        fontFamily: 'var(--f-mono)', fontSize: 11, color: '#fff',
        boxShadow: 'var(--sh-blue)',
        animation: 'floaty 3.8s ease-in-out infinite',
        animationDelay: '-1.2s',
        whiteSpace: 'nowrap',
      }}>
        tone match&nbsp; 98%
      </div>

      {/* Main card */}
      <motion.div
        initial={{ opacity: 0, x: 36, scale: 0.96 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        transition={{ duration: 0.85, delay: 0.4, ease }}
        style={{
          position: 'relative', zIndex: 2,
          background: 'var(--surface)',
          borderRadius: 20, padding: '24px 28px',
          boxShadow: 'var(--sh-3)',
          border: '1px solid var(--line)',
        }}
      >
        {/* Card header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            background: 'var(--pl-accent)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 18, flexShrink: 0,
          }}>A</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>Arjun Mehta</div>
            <div style={{ fontSize: 12, color: 'var(--ink-4)' }}>Founder &amp; CEO · 2nd</div>
          </div>
          <span style={{
            marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 5,
            fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--pl-accent)',
            background: 'var(--pl-accent-soft)', border: '1px solid var(--pl-accent)',
            borderRadius: 'var(--r-pill)', padding: '3px 10px',
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%', background: 'var(--pl-accent)',
              animation: 'pulseDot 2.4s ease-in-out infinite', flexShrink: 0,
            }} />
            in your voice
          </span>
        </div>

        {/* Typewriter body */}
        <div style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.75, whiteSpace: 'pre-wrap', minHeight: 180 }}>
          {displayed}
          <motion.span animate={{ opacity: cursor ? 1 : 0 }} transition={{ duration: 0 }}
            style={{ fontWeight: 700, color: 'var(--pl-accent)' }}>|</motion.span>
        </div>

        {/* Card footer */}
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--line)', display: 'flex', gap: 18, alignItems: 'center' }}>
          {[
            { label: 'Like', svg: <svg style={{ width: 14, height: 14 }} viewBox="0 0 16 16" fill="currentColor"><path d="M8 14s-5-3.4-5-7a3 3 0 0 1 5-2.2A3 3 0 0 1 13 7c0 3.6-5 7-5 7z"/></svg> },
            { label: 'Comment', svg: <svg style={{ width: 14, height: 14 }} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M14 9.5a2 2 0 0 1-2 2H6l-3 2.5v-9a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v4.5z"/></svg> },
            { label: 'Repost', svg: <svg style={{ width: 14, height: 14 }} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M3 6.5l3-3M3 6.5l3 3M3 6.5h7a3 3 0 0 1 3 3v0"/></svg> },
          ].map(a => (
            <span key={a.label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--ink-4)', fontWeight: 500, cursor: 'pointer' }}>
              {a.svg} {a.label}
            </span>
          ))}
          <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--ink-4)' }}>
            <svg style={{ width: 13, height: 13 }} viewBox="0 0 16 16" fill="currentColor"><path d="M2 13h12v1H2zM3 12V8h2v4zM6 12V5h2v7zM9 12V9h2v3zM12 12V6h2v6z"/></svg>
            4,218 impressions
          </span>
        </div>
      </motion.div>
    </div>
  )
}

/* ─── Voice Bars (animated on scroll) ─── */
const VOICE_DIMS = [
  { label: 'Sentence rhythm', w: 88 },
  { label: 'Vocabulary fit', w: 94 },
  { label: 'Opening patterns', w: 82 },
  { label: 'Pet phrases', w: 76 },
  { label: 'Emotional register', w: 90 },
  { label: 'Punctuation tics', w: 71 },
]

function VoiceBars() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-60px' })
  return (
    <ul ref={ref} style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {VOICE_DIMS.map((d, i) => (
        <li key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: 'var(--ink-3)', minWidth: 160, fontFamily: 'var(--f-sans)' }}>{d.label}</span>
          <span style={{ flex: 1, height: 6, background: 'var(--surface-3)', borderRadius: 'var(--r-pill)', overflow: 'hidden' }}>
            <span style={{
              display: 'block', height: '100%', borderRadius: 'var(--r-pill)',
              background: 'var(--pl-accent)',
              width: isInView ? `${d.w}%` : '0%',
              transition: `width 0.8s cubic-bezier(.22,1,.36,1) ${i * 0.08}s`,
            }} />
          </span>
          <span style={{ fontSize: 12, fontFamily: 'var(--f-mono)', color: 'var(--pl-accent)', minWidth: 34, textAlign: 'right' }}>{d.w}%</span>
        </li>
      ))}
    </ul>
  )
}

/* ─── Sample transformation data ─── */
const SAMPLES = [
  {
    chip: 'A lesson from this week',
    input: '"thought i\'d close the round in 6 weeks. took 4 months. learned a lot. mostly that conviction isn\'t a thing investors hand you."',
    output: `I thought I'd close my Series A in 6 weeks.\n\nIt took 4 months.\n\nHere's what I learned — most of it the hard way:\n\n1. Conviction isn't a thing investors hand you. You build it for them, one data point at a time.\n2. The "soft no" is the cruellest no. It costs you a month before you accept it.\n3. Momentum is currency. The fastest investor in the round sets the price of everyone else's hesitation.\n\nIf you're mid-raise: don't optimise for the perfect investor. Optimise for the one who'll move this week.\n\n#FoundersLife · #Fundraising · #StartupLessons`,
  },
  {
    chip: 'A counterintuitive take',
    input: '"everyone says to niche down. but the founders doing best in our cohort are the generalists who went deep on one problem."',
    output: `Counterintuitive thing I keep seeing:\n\nThe founders crushing it aren't the ones who niched down perfectly from day one.\n\nThey're generalists who picked one problem and went very, very deep.\n\nNiching down ≠ narrow thinking. It means relentless focus on one surface area while your mental model stays wide.\n\nThe niche is the trench. The generalist brain is the weapon.\n\n#Founders · #ProductThinking · #StartupStrategy`,
  },
  {
    chip: 'Behind the scenes',
    input: '"we almost ran out of runway last march. three customers renewed the same week. saved us. never told anyone till now."',
    output: `We almost didn't make it.\n\nMarch last year. Runway: 6 weeks. Pipeline: thin.\n\nThen three customers renewed the same week — unprompted, no discount, no push.\n\nI've never talked about this publicly. But I think about it every time someone asks me about product-market fit.\n\nFit isn't a graph inflecting. It's your customers showing up when you need them most, before you ask.\n\nWe didn't save ourselves that week. They did.\n\n#Founders · #StartupLife · #BehindTheScenes`,
  },
]

/* ─── Main page content ─── */
function HomeContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [activeSample, setActiveSample] = useState(0)
  const [accountType, setAccountType] = useState<'personal' | 'business'>('personal')
  const currency = useCurrency()

  function handleLinkedInAuth() {
    document.cookie = `account_type=${accountType}; path=/; max-age=${30 * 24 * 60 * 60}; samesite=lax`
    window.location.href = '/api/auth/linkedin'
  }

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const serif = (text: React.ReactNode) => (
    <em style={{ fontFamily: 'var(--f-display)', fontStyle: 'italic', fontWeight: 400, color: 'var(--serif-ink)' }}>{text}</em>
  )

  return (
    <div style={{ background: 'var(--bg)', color: 'var(--ink)', fontFamily: 'var(--f-sans)' }}>

      {/* ── Nav ── */}
      <header
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: scrolled ? 'color-mix(in srgb, var(--surface) 95%, transparent)' : 'transparent',
          backdropFilter: scrolled ? 'blur(16px)' : 'none',
          borderBottom: scrolled ? '1px solid var(--line)' : '1px solid transparent',
          boxShadow: scrolled ? 'var(--sh-1)' : 'none',
        }}
      >
        <div style={{ maxWidth: 'var(--max)', margin: '0 auto', padding: '0 var(--pad)', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <WordMark />

          {/* Desktop nav */}
          <nav className="hidden md:flex" style={{ gap: 4, alignItems: 'center' }}>
            {[['#features', 'Features'], ['#voice', 'Voice'], ['#pricing', 'Pricing'], ['#faq', 'FAQ']].map(([href, label]) => (
              <a key={href} href={href} style={{
                padding: '8px 14px', fontSize: 14, fontWeight: 500, borderRadius: 'var(--r-sm)',
                color: 'var(--ink-2)', textDecoration: 'none', transition: 'color .15s',
              }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--ink)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink-2)')}
              >{label}</a>
            ))}
            <div style={{ margin: '0 4px' }}><AppearanceTrigger variant="nav" /></div>
            <button onClick={handleLinkedInAuth} style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '9px 18px', fontSize: 14, fontWeight: 600,
              background: 'var(--ink)', color: 'var(--bg)',
              borderRadius: 'var(--r-sm)', border: 'none', cursor: 'pointer',
              transition: 'opacity .15s',
            }}>
              <LinkedinIcon className="w-4 h-4" />
              Connect LinkedIn
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 14, height: 14 }}>
                <path d="M3 8h10M9 4l4 4-4 4" />
              </svg>
            </button>
          </nav>

          {/* Mobile hamburger */}
          <button
            className="md:hidden"
            style={{ padding: 8, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--ink-2)' }}
            onClick={() => setMobileMenuOpen(o => !o)}
            aria-label="Menu"
          >
            {mobileMenuOpen
              ? <svg style={{ width: 20, height: 20 }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              : <svg style={{ width: 20, height: 20 }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
            }
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div style={{ background: 'var(--surface)', borderTop: '1px solid var(--line)', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[['#features', 'Features'], ['#voice', 'Voice'], ['#pricing', 'Pricing'], ['#faq', 'FAQ']].map(([href, label]) => (
              <a key={href} href={href} onClick={() => setMobileMenuOpen(false)}
                style={{ padding: '12px 0', color: 'var(--ink-2)', fontSize: 16, fontWeight: 500, borderBottom: '1px solid var(--line)', textDecoration: 'none' }}>
                {label}
              </a>
            ))}
            <button onClick={handleLinkedInAuth} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              background: 'var(--ink)', color: 'var(--bg)', borderRadius: 'var(--r-md)',
              padding: '14px 20px', fontSize: 16, fontWeight: 600, cursor: 'pointer',
              border: 'none', marginTop: 4,
            }}>
              <LinkedinIcon className="w-4 h-4" /> Connect LinkedIn
            </button>
            <a href="/api/auth/google" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              background: 'transparent', color: 'var(--ink)', borderRadius: 'var(--r-md)',
              padding: '14px 20px', fontSize: 16, fontWeight: 600, textDecoration: 'none',
              border: '1px solid var(--line)',
            }}>
              <GoogleIcon className="w-5 h-5" /> Continue with Google
            </a>
          </div>
        )}
      </header>

      {/* Error banner */}
      {error && (
        <div style={{ background: '#fef2f2', borderBottom: '1px solid #fecaca', color: '#dc2626', textAlign: 'center', fontSize: 14, padding: '12px 24px', marginTop: 64 }}>
          {error === 'linkedin_denied' ? 'LinkedIn permissions were denied. Please try again.' : 'Something went wrong. Please try again.'}
        </div>
      )}

      {/* ── Hero ── */}
      <section style={{ position: 'relative', overflow: 'hidden', background: 'var(--bg)', minHeight: '94vh', paddingTop: 64 }}>
        {/* Mesh blobs */}
        <div style={{ position: 'absolute', inset: '-10%', zIndex: 0, pointerEvents: 'none', filter: 'blur(60px)', opacity: 0.55 }}>
          <div style={{
            position: 'absolute', width: '38vw', height: '38vw', maxWidth: 580, maxHeight: 580,
            borderRadius: '50%', top: '-10%', left: '8%',
            background: 'radial-gradient(circle, rgba(43,77,255,.28), transparent 65%)',
            animation: 'drift1 22s ease-in-out infinite alternate',
          }} />
          <div style={{
            position: 'absolute', width: '38vw', height: '38vw', maxWidth: 580, maxHeight: 580,
            borderRadius: '50%', top: '18%', right: '-6%',
            background: 'radial-gradient(circle, rgba(107,134,255,.2), transparent 65%)',
            animation: 'drift2 28s ease-in-out infinite alternate',
          }} />
          <div style={{
            position: 'absolute', width: '38vw', height: '38vw', maxWidth: 580, maxHeight: 580,
            borderRadius: '50%', bottom: '-20%', left: '35%',
            background: 'radial-gradient(circle, rgba(30,58,138,.18), transparent 65%)',
            animation: 'drift3 24s ease-in-out infinite alternate',
          }} />
        </div>

        {/* Animated SVG flow waves */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }}
          viewBox="0 0 1440 360" preserveAspectRatio="none" aria-hidden="true">
          <path fill="none" stroke="var(--pl-accent)" strokeWidth="1.4" strokeOpacity="0.12">
            <animate attributeName="d" dur="14s" repeatCount="indefinite"
              values="M0,180 Q360,40 720,180 T1440,180;M0,180 Q360,320 720,180 T1440,180;M0,180 Q360,40 720,180 T1440,180" />
          </path>
          <path fill="none" stroke="var(--pl-accent)" strokeWidth="1.2" strokeOpacity="0.08">
            <animate attributeName="d" dur="18s" repeatCount="indefinite"
              values="M0,200 Q480,80 960,200 T1920,200;M0,200 Q480,300 960,200 T1920,200;M0,200 Q480,80 960,200 T1920,200" />
          </path>
          <path fill="none" stroke="var(--pl-accent)" strokeWidth="1" strokeOpacity="0.06">
            <animate attributeName="d" dur="22s" repeatCount="indefinite"
              values="M0,220 Q240,160 480,220 T960,220 T1440,220;M0,220 Q240,280 480,220 T960,220 T1440,220;M0,220 Q240,160 480,220 T960,220 T1440,220" />
          </path>
        </svg>

        {/* Grid dot overlay */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
          backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(var(--pl-accent-glow),.07) 1px, transparent 0)',
          backgroundSize: '28px 28px',
        }} />

        <div style={{ maxWidth: 'var(--max)', margin: '0 auto', padding: '0 var(--pad)', paddingTop: 'clamp(60px,10vw,100px)', paddingBottom: 'clamp(60px,10vw,120px)', position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'clamp(40px,6vw,72px)', alignItems: 'center' }}>

          {/* Left copy */}
          <motion.div initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease }}>
            {/* Eyebrow */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 28,
              fontFamily: 'var(--f-mono)', fontSize: 11.5, fontWeight: 500, letterSpacing: '0.04em',
              color: 'var(--ink-3)', padding: '6px 12px', border: '1px solid var(--line)',
              borderRadius: 'var(--r-xs)', background: 'var(--surface)',
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%', background: 'var(--pl-accent)',
                animation: 'pulseDot 2.4s ease-in-out infinite', flexShrink: 0,
                boxShadow: '0 0 0 3px rgba(var(--pl-accent-glow),.15)',
              }} />
              // 01 — Personal brand, on autopilot
            </div>

            {/* H1 */}
            <h1 style={{
              fontFamily: 'var(--f-sans)', fontWeight: 700, lineHeight: 1.06,
              fontSize: 'clamp(36px,5.5vw,64px)', letterSpacing: '-0.035em',
              color: 'var(--ink)', marginBottom: 24,
            }}>
              Write LinkedIn posts<br />
              {serif('that sound')}{' '}
              exactly like<br />
              {serif('you wrote them.')}
            </h1>

            {/* Lede */}
            <p style={{ fontSize: 'clamp(15px,1.4vw,17px)', color: 'var(--ink-3)', lineHeight: 1.8, marginBottom: 20, maxWidth: 480 }}>
              PersonaLink studies how you actually write — your rhythm, your vocabulary, the way you start sentences — then generates posts in your exact voice, schedules them, and shows you what resonates. One tool, full loop.
            </p>

            {/* Workflow pill strip */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 32, flexWrap: 'wrap' }}>
              {[
                { label: 'Generate', color: 'var(--pl-accent)' },
                { label: 'Post', color: 'var(--pl-accent)' },
                { label: 'Analyse', color: 'var(--pl-accent)' },
              ].map((item, i) => (
                <span key={item.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    fontFamily: 'var(--f-mono)', fontSize: 12, fontWeight: 600,
                    color: item.color, background: 'var(--pl-accent-soft)',
                    border: '1px solid var(--pl-accent)', borderRadius: 'var(--r-pill)',
                    padding: '4px 12px', letterSpacing: '0.03em',
                  }}>{item.label}</span>
                  {i < 2 && <span style={{ color: 'var(--ink-4)', fontSize: 12, fontFamily: 'var(--f-mono)' }}>→</span>}
                </span>
              ))}
              <span style={{ fontSize: 12.5, color: 'var(--ink-4)', fontFamily: 'var(--f-mono)', marginLeft: 4 }}>all in one place</span>
            </div>

            {/* Account type toggle */}
            <div style={{ display: 'inline-flex', alignItems: 'center', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', padding: 3, gap: 2, marginBottom: 16 }}>
              {(['personal', 'business'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setAccountType(type)}
                  style={{
                    padding: '6px 16px', borderRadius: 'calc(var(--r-sm) - 2px)',
                    fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
                    transition: 'all .15s',
                    background: accountType === type ? 'var(--ink)' : 'transparent',
                    color: accountType === type ? 'var(--bg)' : 'var(--ink-3)',
                  }}
                >
                  {type === 'personal' ? 'Personal' : 'Business'}
                </button>
              ))}
            </div>

            {/* CTAs */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
              <button onClick={handleLinkedInAuth} style={{
                display: 'inline-flex', alignItems: 'center', gap: 9,
                height: 52, padding: '0 26px', borderRadius: 'var(--r-md)',
                fontSize: 15, fontWeight: 700, cursor: 'pointer',
                background: 'var(--ink)', color: 'var(--bg)',
                border: 'none', boxShadow: 'var(--sh-2)', transition: 'opacity .15s',
              }}>
                <LinkedinIcon style={{ width: 17, height: 17 }} />
                {accountType === 'business' ? 'Connect LinkedIn — business' : 'Connect LinkedIn — free'}
              </button>
              <a href="/api/auth/google" style={{
                display: 'inline-flex', alignItems: 'center', gap: 9,
                height: 52, padding: '0 26px', borderRadius: 'var(--r-md)',
                fontSize: 15, fontWeight: 600, textDecoration: 'none',
                background: 'var(--surface)', color: 'var(--ink-2)',
                border: '1px solid var(--line)', transition: 'border-color .15s',
              }}>
                <GoogleIcon className="w-5 h-5" />
                Continue with Google
              </a>
            </div>

            <a href="#voice" style={{
              fontFamily: 'var(--f-mono)', fontSize: 12.5, color: 'var(--pl-accent)',
              textDecoration: 'none', letterSpacing: '0.02em',
            }}>
              See how voice matching works →
            </a>

            {/* Social proof */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 24 }}>
              <div style={{ display: 'flex' }}>
                {['var(--pl-accent)', '#7c3aed', '#059669', '#ea580c'].map((c, i) => (
                  <span key={i} style={{
                    width: 26, height: 26, borderRadius: '50%',
                    background: c, border: '2px solid var(--bg)',
                    marginLeft: i === 0 ? 0 : -8, display: 'inline-block', flexShrink: 0,
                  }} />
                ))}
              </div>
              <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>
                <strong style={{ color: 'var(--ink-2)' }}>500+ founders</strong> shipping in their voice every week
              </span>
            </div>
          </motion.div>

          {/* Right: animated post */}
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 24 }}>
            <AnimatedPost />
          </div>
        </div>
      </section>

      {/* ── Marquee ── */}
      <section aria-label="Used by professionals at" style={{
        background: 'var(--surface)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)',
        overflow: 'hidden', padding: '14px 0',
      }}>
        <div style={{ display: 'flex', overflow: 'hidden' }}>
          <div style={{
            display: 'flex', whiteSpace: 'nowrap',
            animation: 'marqueeRoll 38s linear infinite',
          }}>
            {[...Array(2)].map((_, dupIdx) => (
              <span key={dupIdx} style={{ display: 'inline-flex', alignItems: 'center' }}>
                {['Founders', 'VPs of Sales', 'Indie Consultants', 'Product Leaders', 'Career Coaches', 'Marketing Directors', 'Brand Builders', 'Solo Operators'].map((item, i) => (
                  <span key={i} style={{ display: 'inline-flex', alignItems: 'center' }}>
                    <span style={{
                      fontFamily: 'var(--f-display)', fontStyle: 'italic', fontWeight: 500,
                      fontSize: 18, color: 'var(--ink-2)', padding: '0 20px',
                    }}>{item}</span>
                    <span style={{ color: 'var(--pl-accent)', opacity: 0.5, fontSize: 10 }}>◆</span>
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <FadeUp>
        <section style={{ background: 'var(--surface)', borderBottom: '1px solid var(--line)', padding: 'clamp(40px,6vw,72px) var(--pad)' }}>
          <div style={{ maxWidth: 'var(--max)', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 0 }}>
            {[
              { num: '3200', suffix: '+', label: 'posts shipped\nin customer voices' },
              { num: '98',   suffix: '%', label: 'avg. tone-match\nagainst original writing' },
              { num: '6',    suffix: '×', label: 'median profile-view lift\nin first 60 days' },
              { num: '10',   suffix: 'min', label: 'setup, from sign-in\nto first scheduled post' },
            ].map((s, i) => (
              <div key={i} style={{
                textAlign: 'center', padding: 'clamp(24px,4vw,40px) 20px',
                borderRight: i < 3 ? '1px solid var(--line)' : 'none',
              }}>
                <div style={{ fontFamily: 'var(--f-sans)', fontWeight: 400, fontSize: 'clamp(36px,5vw,56px)', color: 'var(--ink)', lineHeight: 1, marginBottom: 8, letterSpacing: '-0.04em' }}>
                  {s.num}<em style={{ fontFamily: 'var(--f-display)', fontStyle: 'italic', color: 'var(--pl-accent)', fontWeight: 400, fontSize: '0.65em' }}>{s.suffix}</em>
                </div>
                <div style={{ fontSize: 13, color: 'var(--ink-4)', lineHeight: 1.5, whiteSpace: 'pre-line' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </section>
      </FadeUp>

      {/* ── Workflow Strip: Generate → Post → Analyse ── */}
      <section style={{ background: 'var(--bg)', borderTop: '1px solid var(--line)', padding: 'clamp(56px,8vw,88px) var(--pad)' }}>
        <div style={{ maxWidth: 'var(--max)', margin: '0 auto' }}>
          <FadeUp>
            <p style={{ textAlign: 'center', fontFamily: 'var(--f-mono)', fontSize: 11.5, letterSpacing: '0.08em', color: 'var(--ink-4)', marginBottom: 52, textTransform: 'uppercase' }}>
              The full loop — in one place
            </p>
          </FadeUp>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'clamp(2px,3vw,2px)', position: 'relative' }}>
            {[
              {
                step: '01',
                action: 'Generate',
                desc: 'Drop a thought, a voice note, or a topic. AI drafts a post in your exact rhythm and vocabulary — not "professional AI" voice.',
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 28, height: 28, color: 'var(--pl-accent)' }}>
                    <path d="M12 19l7-7-7-7" /><path d="M5 12h14" />
                    <circle cx="5" cy="12" r="2" fill="var(--pl-accent)" stroke="none" />
                  </svg>
                ),
              },
              {
                step: '02',
                action: 'Post',
                desc: 'Auto-publishes at peak times, or lands in your inbox for a one-tap approve. Your cadence, on autopilot.',
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 28, height: 28, color: 'var(--pl-accent)' }}>
                    <rect x="3" y="4" width="18" height="16" rx="2" />
                    <path d="M8 2v4M16 2v4M3 10h18" />
                    <path d="M8 14h2M14 14h2M8 18h2" />
                  </svg>
                ),
              },
              {
                step: '03',
                action: 'Analyse',
                desc: 'See impressions, engagement velocity, and which topics land. Know what to double down on — and what to skip.',
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 28, height: 28, color: 'var(--pl-accent)' }}>
                    <path d="M3 17l4-4 4 4 4-6 4 3" />
                    <path d="M3 21h18" />
                  </svg>
                ),
              },
            ].map((item, i) => (
              <FadeUp key={item.step} delay={i * 0.1}>
                <div style={{
                  padding: 'clamp(24px,4vw,36px)',
                  borderLeft: i > 0 ? '1px solid var(--line)' : 'none',
                  position: 'relative',
                }}>
                  {i > 0 && (
                    <span style={{
                      position: 'absolute', top: '50%', left: -14, transform: 'translateY(-50%)',
                      fontFamily: 'var(--f-mono)', fontSize: 18, color: 'var(--pl-accent)', opacity: 0.5,
                      display: 'none',
                    }} aria-hidden="true">→</span>
                  )}
                  <div style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--pl-accent)', marginBottom: 16, letterSpacing: '0.04em' }}>{item.step}</div>
                  <div style={{ marginBottom: 14 }}>{item.icon}</div>
                  <h3 style={{
                    fontFamily: 'var(--f-sans)', fontWeight: 700,
                    fontSize: 'clamp(22px,2.8vw,30px)', color: 'var(--ink)',
                    letterSpacing: '-0.035em', lineHeight: 1.1, marginBottom: 12,
                  }}>{item.action}</h3>
                  <p style={{ fontSize: 14, color: 'var(--ink-4)', lineHeight: 1.7, maxWidth: 280 }}>{item.desc}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── Kinetic Words ── */}
      <section style={{ position: 'relative', overflow: 'hidden', background: 'var(--bg)', padding: 'clamp(60px,10vw,120px) var(--pad)', textAlign: 'center' }}>
        {/* Blobs */}
        <div style={{ position: 'absolute', inset: '-10%', zIndex: 0, pointerEvents: 'none', filter: 'blur(70px)', opacity: 0.45 }}>
          <div style={{
            position: 'absolute', width: '40vw', height: '40vw', maxWidth: 600, maxHeight: 600,
            borderRadius: '50%', top: '-15%', left: '5%',
            background: 'radial-gradient(circle, rgba(43,77,255,.22), transparent 65%)',
            animation: 'fwDrift1 24s ease-in-out infinite alternate',
          }} />
          <div style={{
            position: 'absolute', width: '35vw', height: '35vw', maxWidth: 500, maxHeight: 500,
            borderRadius: '50%', bottom: '-15%', right: '5%',
            background: 'radial-gradient(circle, rgba(107,134,255,.18), transparent 65%)',
            animation: 'fwDrift2 30s ease-in-out infinite alternate',
          }} />
        </div>

        {/* Animated SVG waves */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }}
          viewBox="0 0 1440 480" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="fwGrad" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="var(--pl-accent)" stopOpacity="0" />
              <stop offset="20%" stopColor="var(--pl-accent)" stopOpacity=".4" />
              <stop offset="80%" stopColor="var(--pl-accent-2)" stopOpacity=".4" />
              <stop offset="100%" stopColor="var(--pl-accent-2)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path fill="none" stroke="url(#fwGrad)" strokeWidth="1.6">
            <animate attributeName="d" dur="16s" repeatCount="indefinite"
              values="M-40,260 C220,140 520,360 760,220 S1200,120 1480,280;M-40,240 C220,360 520,140 760,300 S1200,360 1480,220;M-40,260 C220,140 520,360 760,220 S1200,120 1480,280" />
          </path>
          <path fill="none" stroke="url(#fwGrad)" strokeWidth="1.2">
            <animate attributeName="d" dur="22s" repeatCount="indefinite"
              values="M-40,300 C260,200 540,400 820,260 S1240,200 1480,340;M-40,320 C260,420 540,180 820,360 S1240,420 1480,260;M-40,300 C260,200 540,400 820,260 S1240,200 1480,340" />
          </path>
        </svg>

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 760, margin: '0 auto' }}>
          <FadeUp>
            <h2 style={{
              fontFamily: 'var(--f-sans)', fontWeight: 700, fontSize: 'clamp(28px,4.5vw,52px)',
              color: 'var(--ink)', letterSpacing: '-0.035em', lineHeight: 1.1,
            }}>
              Most &ldquo;AI writers&rdquo; hand you a blank box.<br />
              {serif('We hand you your own voice.')}
            </h2>
          </FadeUp>
        </div>
      </section>

      {/* ── How it Works ── */}
      <section id="how" style={{ background: 'var(--surface)', borderTop: '1px solid var(--line)', padding: 'clamp(60px,8vw,100px) var(--pad)' }}>
        <div style={{ maxWidth: 'var(--max)', margin: '0 auto' }}>
          <FadeUp>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 20, fontFamily: 'var(--f-mono)', fontSize: 11.5, fontWeight: 500, letterSpacing: '0.04em', color: 'var(--ink-3)', padding: '6px 12px', border: '1px solid var(--line)', borderRadius: 'var(--r-xs)', background: 'var(--surface-2)' }}>
              // 02 — How it works
            </div>
            <h2 style={{ fontFamily: 'var(--f-sans)', fontWeight: 700, fontSize: 'clamp(26px,4vw,48px)', color: 'var(--ink)', letterSpacing: '-0.035em', lineHeight: 1.08, marginBottom: 14 }}>
              Three quiet steps.{' '}{serif('Then it just runs.')}
            </h2>
            <p style={{ fontSize: 16, color: 'var(--ink-4)', lineHeight: 1.7, maxWidth: 560, marginBottom: 56 }}>
              Most &ldquo;AI writers&rdquo; hand you a blank box and a prompt. PersonaLink starts the other way around — by learning you first.
            </p>
          </FadeUp>

          <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {[
              {
                n: '01', title: 'Connect & sample',
                desc: "One-click LinkedIn OAuth. Paste 3 posts you're proud of. We extract sentence rhythm, vocabulary, openings, and pet phrases — your voice fingerprint.",
                art: (
                  <div style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', padding: '16px 20px', fontFamily: 'var(--f-mono)', fontSize: 12.5 }}>
                    {[
                      { dot: 'blue', text: 'linkedin · connected' },
                      { dot: 'blue', text: 'posting permission · granted' },
                      { dot: 'ok',   text: 'sample posts · 3 ingested' },
                      { dot: 'mute', text: 'extracting voice fingerprint…' },
                    ].map((row, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', color: row.dot === 'mute' ? 'var(--ink-4)' : 'var(--ink-2)', borderBottom: i < 3 ? '1px solid var(--line)' : 'none' }}>
                        {row.dot !== 'mute' && <span style={{ width: 7, height: 7, borderRadius: '50%', background: row.dot === 'ok' ? '#10b981' : 'var(--pl-accent)', flexShrink: 0 }} />}
                        {row.dot === 'mute' && <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--ink-4)', flexShrink: 0, opacity: 0.4 }} />}
                        {row.text}
                      </div>
                    ))}
                  </div>
                ),
              },
              {
                n: '02', title: 'Tell us the shape of you',
                desc: "Five minutes. Pillars you care about, audiences you write for, how much control you want — from full autopilot to \"ask me before posting.\"",
                art: (
                  <div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 14 }}>
                      {[['Founder lessons', true], ['Fundraising', true], ['Hiring', false], ['Product craft', true], ['Industry takes', false], ['Behind the scenes', true]].map(([label, on]) => (
                        <span key={String(label)} style={{
                          padding: '5px 12px', borderRadius: 'var(--r-pill)', fontSize: 12.5, fontWeight: 500,
                          background: on ? 'var(--pl-accent-soft)' : 'var(--surface-2)',
                          color: on ? 'var(--pl-accent)' : 'var(--ink-4)',
                          border: `1px solid ${on ? 'var(--pl-accent)' : 'var(--line)'}`,
                        }}>{String(label)}</span>
                      ))}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'var(--f-mono)', fontSize: 11.5, color: 'var(--ink-4)' }}>
                      <span>Autopilot</span>
                      <span style={{ flex: 1, height: 4, background: 'var(--surface-3)', borderRadius: 'var(--r-pill)', position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '65%', top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, borderRadius: '50%', background: 'var(--pl-accent)', boxShadow: '0 0 0 3px rgba(var(--pl-accent-glow),.2)' }} />
                      </span>
                      <span>Approve</span>
                    </div>
                  </div>
                ),
              },
              {
                n: '03', title: 'Posts ship. You stay you.',
                desc: 'Drafts arrive in your inbox or post automatically at peak times. Approve in one tap, edit in two, or let it run. Analytics tells you what\'s actually working.',
                art: (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 6 }}>
                      {['M','T','W','T','F','S','S'].map((d, i) => (
                        <div key={i} style={{ textAlign: 'center', fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--ink-4)', paddingBottom: 4 }}>{d}</div>
                      ))}
                      {[false, true, false, true, false, true, false].map((on, i) => (
                        <div key={i} style={{
                          height: 32, borderRadius: 'var(--r-sm)',
                          background: on ? 'var(--pl-accent)' : 'var(--surface-2)',
                          border: on ? 'none' : '1px solid var(--line)',
                          boxShadow: on ? 'var(--sh-blue)' : 'none',
                        }} />
                      ))}
                    </div>
                  </div>
                ),
              },
            ].map((step, i) => (
              <li key={step.n}>
                {i > 0 && <hr style={{ border: 'none', borderTop: '1px solid var(--line)', margin: '0 0 40px' }} />}
                <FadeUp>
                  <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr auto', gap: 'clamp(20px,4vw,48px)', alignItems: 'center', paddingBottom: 40 }}>
                    <div style={{ fontFamily: 'var(--f-mono)', fontSize: 28, fontWeight: 500, color: 'var(--pl-accent)', lineHeight: 1 }}>{step.n}</div>
                    <div>
                      <h3 style={{ fontWeight: 600, fontSize: 'clamp(16px,2vw,20px)', color: 'var(--ink)', letterSpacing: '-0.02em', marginBottom: 10 }}>{step.title}</h3>
                      <p style={{ fontSize: 15, color: 'var(--ink-4)', lineHeight: 1.7, maxWidth: 440 }}>{step.desc}</p>
                    </div>
                    <div style={{ width: 'clamp(180px,22vw,260px)', flexShrink: 0 }}>{step.art}</div>
                  </div>
                </FadeUp>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Features Bento ── */}
      <section id="features" style={{ background: 'var(--surface-2)', borderTop: '1px solid var(--line)', padding: 'clamp(60px,8vw,100px) var(--pad)' }}>
        <div style={{ maxWidth: 'var(--max)', margin: '0 auto' }}>
          <FadeUp>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 20, fontFamily: 'var(--f-mono)', fontSize: 11.5, fontWeight: 500, letterSpacing: '0.04em', color: 'var(--ink-3)', padding: '6px 12px', border: '1px solid var(--line)', borderRadius: 'var(--r-xs)', background: 'var(--surface)' }}>
              // 03 — Features
            </div>
            <h2 style={{ fontFamily: 'var(--f-sans)', fontWeight: 700, fontSize: 'clamp(26px,4vw,48px)', color: 'var(--ink)', letterSpacing: '-0.035em', lineHeight: 1.08, marginBottom: 40 }}>
              Built for the post you would have written{' '}
              {serif('if you had the time.')}
            </h2>
          </FadeUp>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 16 }}>
            {/* Card 1: Voice fingerprint — span 3 */}
            <FadeUp className="col-span-6 md:col-span-3">
              <div style={{
                background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)',
                padding: 28, height: '100%', boxShadow: 'var(--sh-1)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--pl-accent)', padding: '4px 10px', background: 'var(--pl-accent-soft)', borderRadius: 'var(--r-pill)', border: '1px solid var(--pl-accent)' }}>Voice fingerprint</span>
                  <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--ink-4)' }}>01</span>
                </div>
                <h3 style={{ fontWeight: 600, fontSize: 18, color: 'var(--ink)', lineHeight: 1.3, marginBottom: 8 }}>
                  AI that writes <em style={{ fontStyle: 'italic' }}>in your voice</em> — not &ldquo;professional&nbsp;AI&rdquo; voice.
                </h3>
                <p style={{ fontSize: 14, color: 'var(--ink-4)', lineHeight: 1.65, marginBottom: 24 }}>We model your sentence length, openings, idioms, and pacing. Same post, written by you, on a day you had time.</p>
                {/* Wave bars */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 52 }}>
                  {[14,22,38,56,72,88,92,78,64,50,36,26,18,30,46,62,80,90,76,60,44,32,20,34,52,70,86,94,82,68].map((h, i) => (
                    <span key={i} style={{
                      flex: 1, background: 'var(--pl-accent)', borderRadius: 2,
                      height: `${h}%`, opacity: 0.6 + (h / 300),
                      animation: `micPulse ${1.2 + (i % 5) * 0.3}s ease-in-out infinite`,
                      animationDelay: `${i * 0.06}s`,
                    }} />
                  ))}
                </div>
              </div>
            </FadeUp>

            {/* Card 2: Smart scheduling — span 2 */}
            <FadeUp className="col-span-6 md:col-span-2" delay={0.06}>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: 24, height: '100%', boxShadow: 'var(--sh-1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--ink-4)', padding: '3px 8px', background: 'var(--surface-2)', borderRadius: 'var(--r-pill)', border: '1px solid var(--line)' }}>Smart scheduling</span>
                  <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--ink-4)' }}>02</span>
                </div>
                <h3 style={{ fontWeight: 600, fontSize: 16, color: 'var(--ink)', lineHeight: 1.3, marginBottom: 8 }}>Posts go live <em>at peak attention.</em></h3>
                <p style={{ fontSize: 13, color: 'var(--ink-4)', lineHeight: 1.6, marginBottom: 20 }}>We watch when your audience is awake and active, then queue accordingly.</p>
                {/* Mini bar chart */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 44 }}>
                  {[14,22,30,48,62,78,92,74,55,38,24,18].map((h, i) => (
                    <span key={i} style={{
                      flex: 1, borderRadius: 3,
                      background: i === 6 ? 'var(--pl-accent)' : 'var(--surface-3)',
                      height: `${h}%`,
                      border: i === 6 ? 'none' : '1px solid var(--line)',
                      transition: 'height .3s',
                    }} />
                  ))}
                </div>
              </div>
            </FadeUp>

            {/* Card 3: Voice notes — span 2 */}
            <FadeUp className="col-span-6 md:col-span-2" delay={0.12}>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: 24, height: '100%', boxShadow: 'var(--sh-1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--ink-4)', padding: '3px 8px', background: 'var(--surface-2)', borderRadius: 'var(--r-pill)', border: '1px solid var(--line)' }}>Voice notes</span>
                  <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--ink-4)' }}>03</span>
                </div>
                <h3 style={{ fontWeight: 600, fontSize: 16, color: 'var(--ink)', lineHeight: 1.3, marginBottom: 8 }}>Ramble for two minutes. <em>Ship a polished post.</em></h3>
                <p style={{ fontSize: 13, color: 'var(--ink-4)', lineHeight: 1.6, marginBottom: 20 }}>Hit record while walking. We transcribe, structure, and hand you a draft.</p>
                {/* Mic bars */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 44 }}>
                  {[18,45,78,54,92,32,66,48,84,24,58].map((h, i) => (
                    <span key={i} style={{
                      flex: 1, borderRadius: 2,
                      background: 'var(--pl-accent)',
                      height: `${h}%`, opacity: 0.7,
                      animation: `micPulse ${0.9 + (i % 4) * 0.35}s ease-in-out infinite`,
                      animationDelay: `${i * 0.08}s`,
                    }} />
                  ))}
                </div>
              </div>
            </FadeUp>

            {/* Card 4: Trend radar — span 2 */}
            <FadeUp className="col-span-6 md:col-span-2" delay={0.06}>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: 24, height: '100%', boxShadow: 'var(--sh-1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--ink-4)', padding: '3px 8px', background: 'var(--surface-2)', borderRadius: 'var(--r-pill)', border: '1px solid var(--line)' }}>Trend radar</span>
                  <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--ink-4)' }}>04</span>
                </div>
                <h3 style={{ fontWeight: 600, fontSize: 16, color: 'var(--ink)', lineHeight: 1.3, marginBottom: 8 }}>Five fresh angles, <em>every Monday.</em></h3>
                <p style={{ fontSize: 13, color: 'var(--ink-4)', lineHeight: 1.6, marginBottom: 16 }}>We scan what's moving in your industry and hand you five post-ready takes.</p>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {['+412% · Series B narratives', '+186% · Hiring under 10', '+94% · Pricing experiments'].map((item, i) => {
                    const [pct, ...rest] = item.split(' · ')
                    return (
                      <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                        <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: '#10b981', background: '#ecfdf5', border: '1px solid #d1fae5', borderRadius: 'var(--r-pill)', padding: '2px 8px', flexShrink: 0 }}>{pct}</span>
                        <span style={{ color: 'var(--ink-3)' }}>{rest.join(' · ')}</span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </FadeUp>

            {/* Card 5: Repurpose engine — span 2 */}
            <FadeUp className="col-span-6 md:col-span-2" delay={0.12}>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: 24, height: '100%', boxShadow: 'var(--sh-1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--ink-4)', padding: '3px 8px', background: 'var(--surface-2)', borderRadius: 'var(--r-pill)', border: '1px solid var(--line)' }}>Repurpose engine</span>
                  <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--ink-4)' }}>05</span>
                </div>
                <h3 style={{ fontWeight: 600, fontSize: 16, color: 'var(--ink)', lineHeight: 1.3, marginBottom: 8 }}>One great post. <em>Three new angles.</em></h3>
                <p style={{ fontSize: 13, color: 'var(--ink-4)', lineHeight: 1.6, marginBottom: 20 }}>When something lands, we mine it — a counterpoint, a deeper take, a behind-the-scenes.</p>
                {/* Branch diagram */}
                <div style={{ position: 'relative', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--pl-accent)', position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)' }} />
                  {[[-40, -20], [0, -30], [40, -20]].map(([x, y], i) => (
                    <div key={i} style={{ position: 'absolute', left: `calc(50% + ${x}px)`, top: `calc(50% + ${y}px)`, width: 8, height: 8, borderRadius: '50%', background: 'var(--surface-3)', border: '1px solid var(--pl-accent)' }} />
                  ))}
                  <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} viewBox="0 0 200 60">
                    <line x1="100" y1="30" x2="60" y2="10" stroke="var(--pl-accent)" strokeWidth="1" strokeOpacity="0.4" />
                    <line x1="100" y1="30" x2="100" y2="0" stroke="var(--pl-accent)" strokeWidth="1" strokeOpacity="0.4" />
                    <line x1="100" y1="30" x2="140" y2="10" stroke="var(--pl-accent)" strokeWidth="1" strokeOpacity="0.4" />
                  </svg>
                </div>
              </div>
            </FadeUp>

            {/* Card 6: Post Analytics */}
            <FadeUp className="col-span-6 md:col-span-2" delay={0.18}>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: 28, height: '100%', boxShadow: 'var(--sh-1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--pl-accent)', padding: '4px 10px', background: 'var(--pl-accent-soft)', borderRadius: 'var(--r-pill)', border: '1px solid var(--pl-accent)' }}>Post analytics</span>
                  <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--ink-4)' }}>06</span>
                </div>
                <h3 style={{ fontWeight: 600, fontSize: 18, color: 'var(--ink)', lineHeight: 1.3, marginBottom: 8 }}>
                  See what lands. <em>Double down on it.</em>
                </h3>
                <p style={{ fontSize: 14, color: 'var(--ink-4)', lineHeight: 1.65, marginBottom: 20 }}>Impressions, engagement rate, and topic patterns — so you always know what to write more of.</p>
                {/* Mini analytics rows */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { label: 'Impressions this week', value: '4,218', delta: '+31%', color: '#10b981' },
                    { label: 'Avg. engagement rate', value: '6.4%', delta: '+2.1pp', color: '#10b981' },
                    { label: 'Top topic: Founder lessons', value: '', delta: '↑ trending', color: 'var(--pl-accent)' },
                  ].map((row, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < 2 ? '1px solid var(--line)' : 'none' }}>
                      <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>{row.label}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {row.value && <span style={{ fontFamily: 'var(--f-mono)', fontSize: 12, fontWeight: 600, color: 'var(--ink-2)' }}>{row.value}</span>}
                        <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: row.color, background: i === 2 ? 'var(--pl-accent-soft)' : '#ecfdf5', border: `1px solid ${i === 2 ? 'var(--pl-accent)' : '#d1fae5'}`, borderRadius: 'var(--r-pill)', padding: '2px 8px' }}>{row.delta}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ── Voice Section ── */}
      <section id="voice" style={{ background: 'var(--surface)', borderTop: '1px solid var(--line)', padding: 'clamp(60px,8vw,100px) var(--pad)' }}>
        <div style={{ maxWidth: 'var(--max)', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 'clamp(40px,6vw,72px)', alignItems: 'start' }}>
          {/* Left */}
          <FadeUp>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 20, fontFamily: 'var(--f-mono)', fontSize: 11.5, fontWeight: 500, letterSpacing: '0.04em', color: 'var(--ink-3)', padding: '6px 12px', border: '1px solid var(--line)', borderRadius: 'var(--r-xs)', background: 'var(--surface-2)' }}>
              // 04 — The voice engine
            </div>
            <h2 style={{ fontFamily: 'var(--f-sans)', fontWeight: 700, fontSize: 'clamp(24px,3.5vw,44px)', color: 'var(--ink)', letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 16 }}>
              It doesn&apos;t sound like AI.{' '}{serif("It sounds like you on a good day.")}
            </h2>
            <p style={{ fontSize: 15, color: 'var(--ink-4)', lineHeight: 1.75, marginBottom: 32, maxWidth: 480 }}>
              Most generators ship one tone — corporate-helpful. We model six dimensions of how you actually write, then constrain the model inside that space.
            </p>
            <VoiceBars />
          </FadeUp>

          {/* Right: comparison card */}
          <FadeUp delay={0.15}>
            <div style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', overflow: 'hidden', boxShadow: 'var(--sh-2)' }}>
              {/* Header */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid var(--line)' }}>
                <div style={{ padding: '14px 20px', borderRight: '1px solid var(--line)' }}>
                  <div style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--ink-4)', marginBottom: 4 }}>// Generic AI</div>
                  <div style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: '#ef4444' }}>tone match · 41%</div>
                </div>
                <div style={{ padding: '14px 20px' }}>
                  <div style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--pl-accent)', marginBottom: 4 }}>// PersonaLink</div>
                  <div style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: '#10b981' }}>tone match · 98%</div>
                </div>
              </div>
              {/* Body */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                <div style={{ padding: '20px', borderRight: '1px solid var(--line)', background: '#fef2f2' }}>
                  <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.7, marginBottom: 16, fontStyle: 'italic' }}>
                    &ldquo;In today&apos;s rapidly evolving landscape, leveraging strategic insights is paramount. Here are 5 key takeaways from my recent meeting…&rdquo;
                  </p>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {['generic openers', 'buzzword density', 'nothing-rhythm'].map(t => (
                      <li key={t} style={{ fontSize: 11.5, fontFamily: 'var(--f-mono)', color: '#ef4444', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>✗</span> {t}
                      </li>
                    ))}
                  </ul>
                </div>
                <div style={{ padding: '20px', background: '#f0fdf4' }}>
                  <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.7, marginBottom: 16 }}>
                    &ldquo;3 things I wish someone told me before my first VC meeting:<br /><br />1. They fund trajectories, not snapshots.<br />2. The best decks have one slide you remember.<br />3. &apos;We&apos;ll follow&apos; usually means &apos;we won&apos;t lead.&apos;&rdquo;
                  </p>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {['your opener pattern', 'your numbered take', 'your dry close'].map(t => (
                      <li key={t} style={{ fontSize: 11.5, fontFamily: 'var(--f-mono)', color: '#10b981', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>✓</span> {t}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── Sample Transformation ── */}
      <section id="sample" style={{ background: 'var(--surface-2)', borderTop: '1px solid var(--line)', padding: 'clamp(60px,8vw,100px) var(--pad)' }}>
        <div style={{ maxWidth: 'var(--max)', margin: '0 auto' }}>
          <FadeUp>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 20, fontFamily: 'var(--f-mono)', fontSize: 11.5, fontWeight: 500, letterSpacing: '0.04em', color: 'var(--ink-3)', padding: '6px 12px', border: '1px solid var(--line)', borderRadius: 'var(--r-xs)', background: 'var(--surface)' }}>
              // Live demo
            </div>
            <h2 style={{ fontFamily: 'var(--f-sans)', fontWeight: 700, fontSize: 'clamp(26px,4vw,48px)', color: 'var(--ink)', letterSpacing: '-0.035em', lineHeight: 1.08, marginBottom: 12 }}>
              Watch a thought {serif('become a post.')}
            </h2>
            <p style={{ fontSize: 15, color: 'var(--ink-4)', lineHeight: 1.7, maxWidth: 560, marginBottom: 40 }}>
              Pick a starting line. We&apos;ll show you the post PersonaLink would draft — in a real founder&apos;s voice, not ours.
            </p>
          </FadeUp>

          <FadeUp delay={0.08}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', overflow: 'hidden', boxShadow: 'var(--sh-2)' }}>
              {/* Tab bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px', borderBottom: '1px solid var(--line)', background: 'var(--surface-2)', flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--ink-4)', marginRight: 4 }}>// raw thought</span>
                {SAMPLES.map((s, i) => (
                  <button key={i} onClick={() => setActiveSample(i)} style={{
                    padding: '5px 12px', borderRadius: 'var(--r-pill)', fontSize: 12.5, fontWeight: 500,
                    cursor: 'pointer', border: `1px solid ${activeSample === i ? 'var(--pl-accent)' : 'var(--line)'}`,
                    background: activeSample === i ? 'var(--pl-accent-soft)' : 'var(--surface)',
                    color: activeSample === i ? 'var(--pl-accent)' : 'var(--ink-3)',
                    transition: 'all .15s',
                  }}>{s.chip}</button>
                ))}
              </div>
              {/* Content grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))' }}>
                {/* Left: input */}
                <div style={{ padding: '24px 28px', borderRight: '1px solid var(--line)' }}>
                  <div style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--ink-4)', marginBottom: 16 }}>// you say —</div>
                  <p style={{ fontFamily: 'var(--f-mono)', fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.7, marginBottom: 24, animation: 'fadeSwap .4s ease' }}>
                    {SAMPLES[activeSample].input}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[
                      { dot: 'blue', text: 'voice fingerprint loaded' },
                      { dot: 'ok',   text: 'tone match · 98%' },
                      { dot: 'ok',   text: 'length · 142 words' },
                    ].map((m, i) => (
                      <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--ink-4)' }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: m.dot === 'ok' ? '#10b981' : 'var(--pl-accent)', flexShrink: 0 }} />
                        {m.text}
                      </span>
                    ))}
                  </div>
                </div>
                {/* Right: output */}
                <div style={{ padding: '24px 28px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                    <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--ink-4)' }}>// we ship —</span>
                    <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: '#10b981' }}>drafted in 2.4s</span>
                  </div>
                  <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.75, whiteSpace: 'pre-line', marginBottom: 24, animation: 'fadeSwap .4s ease' }}>
                    {SAMPLES[activeSample].output}
                  </p>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button style={{
                      padding: '9px 16px', fontSize: 13, fontWeight: 500, borderRadius: 'var(--r-sm)',
                      background: 'transparent', color: 'var(--ink-2)', border: '1px solid var(--line)', cursor: 'pointer',
                    }}>Edit draft</button>
                    <button style={{
                      padding: '9px 16px', fontSize: 13, fontWeight: 600, borderRadius: 'var(--r-sm)',
                      background: 'var(--ink)', color: 'var(--bg)', border: 'none', cursor: 'pointer',
                    }}>Schedule · Tue 9:14 AM</button>
                  </div>
                </div>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section style={{ background: 'var(--surface-2)', borderTop: '1px solid var(--line)', padding: 'clamp(60px,8vw,100px) var(--pad)' }}>
        <div style={{ maxWidth: 'var(--max)', margin: '0 auto' }}>
          <FadeUp>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 20, fontFamily: 'var(--f-mono)', fontSize: 11.5, fontWeight: 500, letterSpacing: '0.04em', color: 'var(--ink-3)', padding: '6px 12px', border: '1px solid var(--line)', borderRadius: 'var(--r-xs)', background: 'var(--surface)' }}>
              // 05 — In their voice
            </div>
            <h2 style={{ fontFamily: 'var(--f-sans)', fontWeight: 700, fontSize: 'clamp(26px,4vw,48px)', color: 'var(--ink)', letterSpacing: '-0.035em', lineHeight: 1.08, marginBottom: 40 }}>
              What it sounds like {serif('after a quiet quarter.')}
            </h2>
          </FadeUp>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 20 }}>
            {[
              { quote: 'Went from posting once a month to three times a week without spending more time on it. Inbound DMs from potential clients tripled.', name: 'Rahul Gupta',     title: 'VP Sales · B2B SaaS',          initial: 'R', c1: '#3257ff', c2: '#0b1a8b' },
              { quote: 'The voice match is almost uncomfortable. My team couldn\'t tell which posts were AI-assisted. That\'s the whole game.',             name: 'Marcus Williams', title: 'Product Manager · New York',   initial: 'M', c1: '#0a1024', c2: '#3a4868' },
              { quote: "I'd been \"planning to post more\" for two years. PersonaLink made it real in week one. Forty new followers in the first ten days.", name: 'Sofia Lindqvist', title: 'Marketing Director · Stockholm', initial: 'S', c1: '#2563eb', c2: '#1e3a8a' },
              { quote: 'Three inbound investor leads in my first month. The posts were finally reaching the right people, not just my mom.',                 name: 'James Osei',     title: 'Co-founder · Accra',           initial: 'J', c1: '#1e40af', c2: '#0a1024' },
            ].map((t, i) => (
              <FadeUp key={t.name} delay={i * 0.08}>
                <figure style={{ margin: 0, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: '28px', boxShadow: 'var(--sh-1)' }}>
                  <blockquote style={{ margin: '0 0 24px', fontFamily: 'var(--f-display)', fontStyle: 'italic', fontWeight: 500, fontSize: 'clamp(16px,1.6vw,19px)', color: 'var(--ink-2)', lineHeight: 1.55 }}>
                    &ldquo;{t.quote}&rdquo;
                  </blockquote>
                  <figcaption style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{
                      width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                      background: `linear-gradient(135deg, ${t.c1}, ${t.c2})`,
                      color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: 15,
                    }}>{t.initial}</span>
                    <div>
                      <strong style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{t.name}</strong>
                      <span style={{ fontSize: 12, color: 'var(--ink-4)' }}>{t.title}</span>
                    </div>
                  </figcaption>
                </figure>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── Integrations ── */}
      <section id="integrations" style={{ background: 'var(--surface)', borderTop: '1px solid var(--line)', padding: 'clamp(60px,8vw,100px) var(--pad)' }}>
        <div style={{ maxWidth: 'var(--max)', margin: '0 auto' }}>
          <FadeUp>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 20, fontFamily: 'var(--f-mono)', fontSize: 11.5, fontWeight: 500, letterSpacing: '0.04em', color: 'var(--ink-3)', padding: '6px 12px', border: '1px solid var(--line)', borderRadius: 'var(--r-xs)', background: 'var(--surface-2)' }}>
              // Plays well with
            </div>
            <h2 style={{ fontFamily: 'var(--f-sans)', fontWeight: 700, fontSize: 'clamp(26px,4vw,48px)', color: 'var(--ink)', letterSpacing: '-0.035em', lineHeight: 1.08, marginBottom: 12 }}>
              Lives where {serif('you already work.')}
            </h2>
            <p style={{ fontSize: 15, color: 'var(--ink-4)', lineHeight: 1.7, maxWidth: 480, marginBottom: 40 }}>
              Capture from your phone, schedule from your calendar, approve from your inbox. No new tab to babysit.
            </p>
          </FadeUp>

          <FadeUp delay={0.08}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14 }}>
              {/* LinkedIn — featured */}
              <div style={{
                background: 'linear-gradient(135deg, #0a66c2, #0b1a8b)',
                border: 'none', borderRadius: 'var(--r-lg)', padding: '24px',
                boxShadow: 'var(--sh-2)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <LinkedinIcon style={{ width: 28, height: 28, color: '#fff' }} />
                  <span style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'rgba(255,255,255,.6)', padding: '3px 8px', border: '1px solid rgba(255,255,255,.2)', borderRadius: 'var(--r-pill)' }}>core integration</span>
                </div>
                <h3 style={{ fontWeight: 600, fontSize: 15, color: '#fff', marginBottom: 6 }}>LinkedIn</h3>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,.65)', lineHeight: 1.6 }}>Official OAuth. Post, schedule, track impressions without leaving PersonaLink.</p>
              </div>

              {[
                { tag: 'sync', name: 'Google Calendar', desc: 'Pull your travel & speaking days. We avoid scheduling posts on heads-down hours.', svg: <svg viewBox="0 0 24 24" fill="none" style={{ width: 24, height: 24 }}><rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.6"/><path d="M3 9h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg> },
                { tag: 'capture', name: 'Notion', desc: 'Drop a page link. We mine it into 3 post angles in your voice.', svg: <svg viewBox="0 0 24 24" fill="none" style={{ width: 24, height: 24 }}><path d="M4 6h16M4 12h10M4 18h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg> },
                { tag: 'capture', name: 'Voice notes', desc: 'iOS / Android share sheet. Ramble for 2 minutes. Ship a polished draft.', svg: <svg viewBox="0 0 24 24" fill="none" style={{ width: 24, height: 24 }}><path d="M12 3v12m0 0l-4-4m4 4l4-4M5 17v2a2 2 0 002 2h10a2 2 0 002-2v-2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg> },
                { tag: 'approval', name: 'Email', desc: 'Approve, edit or skip drafts in one tap — straight from your inbox.', svg: <svg viewBox="0 0 24 24" fill="none" style={{ width: 24, height: 24 }}><path d="M4 4h16v16H4zM4 4l8 8 8-8" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg> },
                { tag: 'automation', name: 'Zapier', desc: 'Trigger drafts from anywhere — a closed deal, a podcast, a metric milestone.', svg: <svg viewBox="0 0 24 24" fill="none" style={{ width: 24, height: 24 }}><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6"/><path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg> },
              ].map(integ => (
                <div key={integ.name} style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: '24px', boxShadow: 'var(--sh-1)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ color: 'var(--ink-3)' }}>{integ.svg}</span>
                    <span style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--ink-4)', padding: '3px 8px', border: '1px solid var(--line)', borderRadius: 'var(--r-pill)' }}>{integ.tag}</span>
                  </div>
                  <h3 style={{ fontWeight: 600, fontSize: 15, color: 'var(--ink)', marginBottom: 6 }}>{integ.name}</h3>
                  <p style={{ fontSize: 13, color: 'var(--ink-4)', lineHeight: 1.6 }}>{integ.desc}</p>
                </div>
              ))}
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" style={{ background: 'var(--bg)', borderTop: '1px solid var(--line)', padding: 'clamp(60px,8vw,100px) var(--pad)' }}>
        <div style={{ maxWidth: 'var(--max)', margin: '0 auto' }}>
          <FadeUp>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 20, fontFamily: 'var(--f-mono)', fontSize: 11.5, fontWeight: 500, letterSpacing: '0.04em', color: 'var(--ink-3)', padding: '6px 12px', border: '1px solid var(--line)', borderRadius: 'var(--r-xs)', background: 'var(--surface)' }}>
              // 06 — Pricing
            </div>
            <h2 style={{ fontFamily: 'var(--f-sans)', fontWeight: 700, fontSize: 'clamp(26px,4vw,48px)', color: 'var(--ink)', letterSpacing: '-0.035em', lineHeight: 1.08, marginBottom: 12 }}>
              Three plans. {serif('One free week each.')}
            </h2>
            <p style={{ fontSize: 15, color: 'var(--ink-4)', lineHeight: 1.7, maxWidth: 480, marginBottom: 44 }}>
              Pick the cadence that matches the year you&apos;re trying to have. Upgrade anytime. Cancel in one click.
            </p>
          </FadeUp>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 16, alignItems: 'stretch' }}>
            {[
              {
                id: 'starter', name: 'Starter', posts: '12 posts per month', popular: false,
                features: ['AI generation in your voice', 'Smart scheduling', 'Story bank · 100 entries', 'Weekly trend radar', 'Image posts', 'LinkedIn Score'],
              },
              {
                id: 'standard', name: 'Standard', posts: '20 posts per month', popular: true,
                features: ['Everything in Starter, plus —', 'Voice-note → post', 'Analytics dashboard', 'Monthly image brief', 'Priority queue', 'Advanced tone controls'],
              },
              {
                id: 'pro', name: 'Pro', posts: '30 posts per month', popular: false,
                features: ['Everything in Standard, plus —', 'Repurpose engine', 'Competitor tracking', 'Bulk generate 30 days', 'Team mode · 3 profiles', 'Priority AI generation'],
              },
            ].map(plan => {
              const price = plan.id === 'starter' ? currency.starter : plan.id === 'standard' ? currency.standard : currency.pro
              return (
                <FadeUp key={plan.id}>
                  <div style={{
                    position: 'relative', height: '100%',
                    background: plan.popular ? 'var(--ink)' : 'var(--surface)',
                    border: plan.popular ? 'none' : '1px solid var(--line)',
                    borderRadius: 'var(--r-lg)', padding: '28px', boxShadow: plan.popular ? 'var(--sh-3)' : 'var(--sh-1)',
                    display: 'flex', flexDirection: 'column',
                  }}>
                    {plan.popular && (
                      <span style={{
                        position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)',
                        background: 'var(--pl-accent)', color: '#fff',
                        fontFamily: 'var(--f-mono)', fontSize: 11, fontWeight: 600,
                        padding: '5px 14px', borderRadius: 'var(--r-pill)',
                        whiteSpace: 'nowrap',
                      }}>Most chosen</span>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div style={{ fontWeight: 600, fontSize: 15, color: plan.popular ? 'rgba(255,255,255,.7)' : 'var(--ink-3)' }}>{plan.name}</div>
                      <span style={{
                        fontSize: 10.5, fontFamily: 'var(--f-mono)', fontWeight: 600,
                        padding: '3px 8px', borderRadius: 'var(--r-pill)',
                        background: plan.popular ? 'rgba(255,255,255,.12)' : '#ecfdf5',
                        color: plan.popular ? '#fff' : '#059669',
                      }}>7-day free trial</span>
                    </div>
                    <div style={{ fontSize: 44, fontWeight: 700, letterSpacing: '-0.04em', color: plan.popular ? '#fff' : 'var(--ink)', lineHeight: 1, marginBottom: 4 }}>
                      <span style={{ fontSize: 22, fontWeight: 400 }}>{currency.symbol}</span>{price.toLocaleString()}
                    </div>
                    <div style={{ fontSize: 13, color: plan.popular ? 'rgba(255,255,255,.5)' : 'var(--ink-4)', marginBottom: 24 }}>/ mo · {plan.posts}</div>
                    <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {plan.features.map(f => (
                        <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: plan.popular ? 'rgba(255,255,255,.8)' : 'var(--ink-2)' }}>
                          <Check style={{ width: 14, height: 14, color: plan.popular ? 'rgba(255,255,255,.6)' : 'var(--pl-accent)', flexShrink: 0 }} strokeWidth={2.5} />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <button onClick={handleLinkedInAuth} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: '13px 20px', borderRadius: 'var(--r-md)', fontWeight: 600, fontSize: 14,
                      cursor: 'pointer', transition: 'opacity .15s',
                      background: plan.popular ? '#fff' : 'transparent',
                      color: plan.popular ? 'var(--ink)' : 'var(--ink)',
                      border: plan.popular ? 'none' : '1px solid var(--line)',
                    }}>
                      Start free trial
                    </button>
                  </div>
                </FadeUp>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" style={{ background: 'var(--surface-2)', borderTop: '1px solid var(--line)', padding: 'clamp(60px,8vw,100px) var(--pad)' }}>
        <div style={{ maxWidth: 'var(--max)', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 'clamp(40px,6vw,72px)', alignItems: 'start' }}>
          <FadeUp>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 20, fontFamily: 'var(--f-mono)', fontSize: 11.5, fontWeight: 500, letterSpacing: '0.04em', color: 'var(--ink-3)', padding: '6px 12px', border: '1px solid var(--line)', borderRadius: 'var(--r-xs)', background: 'var(--surface)' }}>
              // 07 — FAQ
            </div>
            <h2 style={{ fontFamily: 'var(--f-sans)', fontWeight: 700, fontSize: 'clamp(24px,3.5vw,44px)', color: 'var(--ink)', letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 16 }}>
              Quiet answers {serif('to loud questions.')}
            </h2>
            <p style={{ fontSize: 15, color: 'var(--ink-4)', lineHeight: 1.7 }}>
              Still on the fence? Drop a question — we&apos;ll write back in our voice, not a template.
            </p>
          </FadeUp>

          <FadeUp delay={0.1}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {[
                { q: 'Will the posts actually sound like me?', a: 'During onboarding we ingest 3–5 of your own posts and build a voice fingerprint — sentence rhythm, vocabulary, openings, pet phrases. Every draft is constrained inside that space. Tone match averages 96–98% on the second week.' },
                { q: 'Can I edit before it goes live?', a: 'Always. Pick Full Autopilot, Approve Before Posting, or Suggest Only. You own the publish button.' },
                { q: 'How does the LinkedIn connection work?', a: 'Official LinkedIn OAuth. We only request posting permission. We never read your DMs, never touch your network, never store your password.' },
                { q: "What if I hit my post limit?", a: "You get a heads-up at 80%. Upgrade your plan or wait for the monthly reset — no surprise charges, ever." },
                { q: 'Is payment secure?', a: 'All payments run through Razorpay — one of India\'s most trusted gateways. We never see or store your card details.' },
                { q: 'Can I cancel anytime?', a: 'One click in Settings. You keep full access until the end of your billing period.' },
              ].map((faq, i) => (
                <details key={i} style={{ borderBottom: '1px solid var(--line)' }}>
                  <summary style={{
                    padding: '18px 0', cursor: 'pointer', fontWeight: 600, fontSize: 15, color: 'var(--ink)',
                    listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    userSelect: 'none',
                  }}>
                    {faq.q}
                    <svg style={{ width: 16, height: 16, color: 'var(--ink-4)', flexShrink: 0, transition: 'transform .2s' }} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M4 6l4 4 4-4" />
                    </svg>
                  </summary>
                  <div style={{ paddingBottom: 18, fontSize: 14.5, color: 'var(--ink-4)', lineHeight: 1.75 }}>{faq.a}</div>
                </details>
              ))}
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── Trust Strip ── */}
      <FadeUp>
        <section style={{ background: 'var(--surface)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)', padding: 'clamp(40px,6vw,64px) var(--pad)' }}>
          <div style={{ maxWidth: 'var(--max)', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 32 }}>
            {[
              {
                title: 'Your data, locked',
                desc: 'SOC-2 in progress. Your posts and writing samples never train shared models.',
                svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" style={{ width: 24, height: 24 }}><path d="M12 2l9 4v6c0 5-3.5 8.5-9 10-5.5-1.5-9-5-9-10V6l9-4z"/></svg>,
              },
              {
                title: 'Official LinkedIn API',
                desc: 'OAuth-only. Posting permission. No DMs, no networks, no passwords stored.',
                svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" style={{ width: 24, height: 24 }}><rect x="4" y="11" width="16" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/></svg>,
              },
              {
                title: 'Cancel any time',
                desc: 'One click in Settings. You keep your data and full access through your billing period.',
                svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" style={{ width: 24, height: 24 }}><circle cx="12" cy="12" r="9"/><path d="M9 12l2 2 4-5"/></svg>,
              },
              {
                title: 'Razorpay-secured',
                desc: 'Payments processed by Razorpay. Card details never touch our servers.',
                svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" style={{ width: 24, height: 24 }}><path d="M4 6h16v12H4z"/><path d="M4 10h16M9 14h2M9 18v-4"/></svg>,
              },
            ].map(t => (
              <div key={t.title} style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: 'var(--r-md)', background: 'var(--surface-2)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--pl-accent)' }}>
                  {t.svg}
                </div>
                <div>
                  <strong style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>{t.title}</strong>
                  <p style={{ fontSize: 13, color: 'var(--ink-4)', lineHeight: 1.6, margin: 0 }}>{t.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </FadeUp>

      {/* ── Final CTA ── */}
      <section style={{
        position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(180deg,#050813,#0a1024)',
        padding: 'clamp(72px,10vw,120px) var(--pad)', textAlign: 'center',
      }}>
        {/* Mesh */}
        <div style={{ position: 'absolute', inset: '-10%', zIndex: 0, pointerEvents: 'none', filter: 'blur(70px)', opacity: 0.5 }}>
          <div style={{
            position: 'absolute', width: '45vw', height: '45vw', maxWidth: 640, maxHeight: 640,
            borderRadius: '50%', top: '-20%', left: '-5%',
            background: 'radial-gradient(circle, rgba(43,77,255,.35), transparent 65%)',
            animation: 'drift1 24s ease-in-out infinite alternate',
          }} />
          <div style={{
            position: 'absolute', width: '35vw', height: '35vw', maxWidth: 520, maxHeight: 520,
            borderRadius: '50%', bottom: '-20%', right: '-5%',
            background: 'radial-gradient(circle, rgba(107,134,255,.28), transparent 65%)',
            animation: 'drift2 30s ease-in-out infinite alternate',
          }} />
        </div>
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 680, margin: '0 auto' }}>
          <FadeUp>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 24, fontFamily: 'var(--f-mono)', fontSize: 11.5, fontWeight: 500, letterSpacing: '0.04em', color: 'rgba(255,255,255,.4)', padding: '6px 12px', border: '1px solid rgba(255,255,255,.12)', borderRadius: 'var(--r-xs)' }}>
              // Start
            </div>
            <h2 style={{ fontFamily: 'var(--f-sans)', fontWeight: 700, fontSize: 'clamp(28px,4.5vw,52px)', color: '#fff', letterSpacing: '-0.04em', lineHeight: 1.1, marginBottom: 16 }}>
              Write once in your voice.<br />Post on schedule. See what lands.
            </h2>
            <p style={{ fontSize: 'clamp(15px,1.3vw,17px)', color: 'rgba(255,255,255,.45)', lineHeight: 1.7, marginBottom: 32, maxWidth: 480, margin: '0 auto 32px' }}>
              Generate, post, and analyse — <em style={{ fontFamily: 'var(--f-display)', fontStyle: 'italic', fontWeight: 400, color: 'rgba(255,255,255,.65)' }}>all in one place.</em>
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginBottom: 20 }}>
              <button onClick={handleLinkedInAuth} style={{
                display: 'inline-flex', alignItems: 'center', gap: 9,
                height: 54, padding: '0 28px', borderRadius: 'var(--r-md)',
                fontSize: 15, fontWeight: 700, cursor: 'pointer',
                background: '#fff', color: '#0a1024', border: 'none',
                boxShadow: '0 24px 64px rgba(43,77,255,.3)',
              }}>
                <LinkedinIcon style={{ width: 17, height: 17 }} />
                {accountType === 'business' ? 'Connect LinkedIn — business' : 'Connect LinkedIn — free'}
              </button>
              <a href="#pricing" style={{
                display: 'inline-flex', alignItems: 'center', gap: 9,
                height: 54, padding: '0 28px', borderRadius: 'var(--r-md)',
                fontSize: 15, fontWeight: 600, textDecoration: 'none',
                background: 'rgba(255,255,255,.08)', color: 'rgba(255,255,255,.8)',
                border: '1px solid rgba(255,255,255,.14)',
              }}>
                See pricing
              </a>
            </div>
            <p style={{ fontFamily: 'var(--f-mono)', fontSize: 12, color: 'rgba(255,255,255,.3)', lineHeight: 1.6 }}>
              No card required · 10 minutes to first scheduled post · Cancel anytime
            </p>
          </FadeUp>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ background: '#050813', borderTop: '1px solid rgba(255,255,255,.06)', padding: 'clamp(48px,6vw,72px) var(--pad) 0' }}>
        <div style={{ maxWidth: 'var(--max)', margin: '0 auto', display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 'clamp(40px,6vw,80px)', paddingBottom: 'clamp(40px,5vw,64px)' }}>
          {/* Brand */}
          <div style={{ maxWidth: 280 }}>
            <WordMark />
            <p style={{ marginTop: 16, fontSize: 14, color: 'rgba(255,255,255,.35)', lineHeight: 1.7 }}>
              Your LinkedIn, on autopilot — without sounding like everyone else&apos;s autopilot.
            </p>
            <a href="mailto:support@personalink.in" style={{ display: 'inline-block', marginTop: 12, fontSize: 13, color: 'rgba(255,255,255,.4)', textDecoration: 'none', transition: 'color .15s' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,.7)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,.4)')}
            >support@personalink.in</a>
          </div>
          {/* Link columns */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24 }}>
            {[
              { heading: 'Product', links: [['#features', 'Features'], ['#voice', 'Voice engine'], ['#pricing', 'Pricing'], ['#faq', 'FAQ']] },
              { heading: 'Company', links: [['#', 'About'], ['#', 'Blog'], ['#', 'Changelog'], ['#', 'Careers']] },
              { heading: 'Legal',   links: [['#', 'Privacy'], ['#', 'Terms'], ['#', 'Security'], ['mailto:support@personalink.in', 'Contact']] },
            ].map(col => (
              <div key={col.heading}>
                <h4 style={{ fontFamily: 'var(--f-mono)', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: 'rgba(255,255,255,.4)', marginBottom: 16, textTransform: 'uppercase' }}>{col.heading}</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {col.links.map(([href, label]) => (
                    <a key={label} href={href} style={{ fontSize: 13.5, color: 'rgba(255,255,255,.35)', textDecoration: 'none', transition: 'color .15s' }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,.7)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,.35)')}
                    >{label}</a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Bottom bar */}
        <div style={{ maxWidth: 'var(--max)', margin: '0 auto', borderTop: '1px solid rgba(255,255,255,.06)', padding: '20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,.25)' }}>© 2026 PersonaLink</span>
          <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11.5, color: 'rgba(255,255,255,.2)' }}>— shipped from Bengaluru, in your voice.</span>
        </div>
      </footer>

    </div>
  )
}

/* ─── JSON-LD schema ─── */
const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'PersonaLink',
  applicationCategory: 'BusinessApplication',
  description: 'AI LinkedIn manager that generates posts in your voice, auto-publishes on schedule, and shows you what resonates — all in one place',
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

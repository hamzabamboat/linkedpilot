'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import type { Post, UserProfile } from '@/lib/supabase'
import { ConcentricRings } from '@/components/concentric-rings'
import { toast } from 'sonner'
import {
  Sparkles,
  Mic,
  CalendarDays,
  RefreshCw,
  ArrowRight,
  Clock,
  Edit3,
  Send,
  Calendar,
} from 'lucide-react'
import { showUpgradeModal } from '@/components/upgrade-limit-modal'
import { PostCard, PostCardSkeleton } from '@/components/post-card'
import { EmptyState } from '@/components/empty-state'
import { DisplayHeading } from '@/components/display-heading'
import { Eyebrow } from '@/components/eyebrow'

type ProfileAnalysis = {
  score: number
  improvements: string[]
  analysed_at: string
}

const TIPS = [
  'Posts with a personal story get 3× more comments than pure opinion pieces.',
  'Ask a question at the end — it doubles the comment rate.',
  'The first line is 80% of the post. Rewrite it until it demands a click.',
  'Post between 7–9 AM or 5–6 PM in your timezone for maximum reach.',
  'Short paragraphs win on LinkedIn. One idea per line.',
  'Carousels get 3× the impressions of text posts — try one this week.',
  'Consistency beats virality. One post per week for 3 months beats a one-hit wonder.',
  'Numbers in your headline increase click-through by 36%. Try "5 lessons from..."',
  'Tag 1–2 people max — over-tagging kills reach.',
  "Don't start with \"I\". Open with your hook statement instead.",
  'Emojis boost engagement by 48% when used sparingly — max 3 per post.',
  'A post that teaches one thing beats a post that covers ten.',
  'Reply to every comment in the first hour — LinkedIn rewards it with more reach.',
  'Your headline is your tagline. Describe what you do for others, not just your title.',
  'Native video gets 5× the reach of shared links — record something this week.',
]

/* ── Score Ring ─────────────────────────────────────────────── */
function ScoreRing({ score }: { score: number }) {
  const r = 42
  const c = 2 * Math.PI * r
  const filled = (score / 100) * c
  const color = score >= 70 ? 'var(--pl-accent)' : score >= 40 ? '#d97706' : '#ef4444'
  return (
    <svg width={100} height={100} viewBox="0 0 100 100" className="-rotate-90">
      <circle cx={50} cy={50} r={r} fill="none" stroke="var(--line-2)" strokeWidth={7} />
      <circle cx={50} cy={50} r={r} fill="none" stroke={color} strokeWidth={7}
        strokeDasharray={`${filled} ${c - filled}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 1.2s ease' }} />
    </svg>
  )
}

/* ── Voice Fingerprint (SVG art) ────────────────────────────── */
function VoiceFingerprint() {
  const pts1 = [0,18,6,14,12,22,18,10,24,20,30,8,36,18,42,12,48,20,54,6,60,16,66,10,72,22,78,14,84,18]
  const pts2 = [0,22,6,26,12,20,18,28,24,18,30,24,36,16,42,26,48,18,54,28,60,20,66,24,72,18,78,28,84,22]
  const toPath = (pts: number[]) => {
    const pairs: [number, number][] = []
    for (let i = 0; i < pts.length; i += 2) pairs.push([pts[i], pts[i + 1]])
    return `M ${pairs.map(([x, y]) => `${x},${y}`).join(' L ')}`
  }
  return (
    <svg viewBox="0 0 84 36" width="100%" height={36} style={{ display: 'block' }}>
      <path d={toPath(pts1)} fill="none" stroke="var(--pl-accent)" strokeWidth={1.5} opacity={0.8} />
      <path d={toPath(pts2)} fill="none" stroke="var(--pl-accent-2)" strokeWidth={1} opacity={0.4} />
    </svg>
  )
}

/* ── 7-Day Strip ────────────────────────────────────────────── */
function ScheduleStrip({ posts }: { posts: Post[] }) {
  const days: { label: string; date: Date; posts: Post[] }[] = []
  const today = new Date(); today.setHours(0, 0, 0, 0)
  for (let i = 0; i < 7; i++) {
    const d = new Date(today); d.setDate(today.getDate() + i)
    const dayPosts = posts.filter(p => {
      if (!p.scheduled_at) return false
      const pd = new Date(p.scheduled_at); pd.setHours(0, 0, 0, 0)
      return pd.getTime() === d.getTime()
    })
    days.push({ label: i === 0 ? 'Today' : d.toLocaleDateString('en-IN', { weekday: 'short' }), date: d, posts: dayPosts })
  }
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {days.map((day, i) => (
        <div key={i} className="flex flex-col items-center gap-1.5">
          <span className="text-[9px]" style={{ fontFamily: 'var(--f-mono)', color: 'var(--ink-4)', letterSpacing: '.06em' }}>{day.label}</span>
          <div
            className="w-full aspect-square rounded flex items-center justify-center text-[11px] font-semibold"
            style={{
              background: day.posts.length > 0 ? 'var(--pl-accent-soft)' : 'var(--surface-3)',
              color: day.posts.length > 0 ? 'var(--pl-accent)' : 'var(--ink-4)',
              border: i === 0 ? '1px solid var(--pl-accent)' : '1px solid transparent',
            }}
          >
            {day.posts.length > 0 ? day.posts.length : '·'}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── Main dashboard content ─────────────────────────────────── */
function DashboardContent() {
  const searchParams = useSearchParams()
  const upgraded = searchParams.get('upgraded')

  const [profile,    setProfile]    = useState<UserProfile | null>(null)
  const [posts,      setPosts]      = useState<Post[]>([])
  const [analysis,   setAnalysis]   = useState<ProfileAnalysis | null>(null)
  const [reanalysing, setReanalysing] = useState(false)
  const [loading,    setLoading]    = useState(true)
  const [monthStats, setMonthStats] = useState({ generated: 0, published: 0, pending: 0 })

  useEffect(() => {
    if (upgraded) toast.success('Subscription activated! Welcome to the plan.')
  }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const meRes = await fetch('/api/me')
        if (!meRes.ok) { window.location.href = '/'; return }
        const { user: _u, profile: p } = await meRes.json()
        if (!p || cancelled) return
        if (!cancelled) setProfile(p)

        const now = new Date()
        const createdMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

        const [scheduledRes, analysisRes, monthRes] = await Promise.all([
          fetch('/api/posts?status=scheduled&order=scheduled_at&limit=7').then(r => r.json()),
          fetch('/api/profile/analyse').then(r => r.json()),
          fetch(`/api/posts?created_month=${createdMonth}`).then(r => r.json()),
        ])

        if (!cancelled) {
          setPosts(scheduledRes.posts || [])
          const latestAnalysis = analysisRes?.analyses?.[0]
          if (latestAnalysis) setAnalysis(latestAnalysis)
          const all: Post[] = monthRes.posts || []
          setMonthStats({
            generated: all.length,
            published: all.filter(p => p.status === 'published').length,
            pending:   all.filter(p => p.status === 'pending_approval' || p.status === 'scheduled').length,
          })
        }
      } catch {
        /* non-fatal */
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  async function handleReanalyse() {
    setReanalysing(true)
    try {
      const res = await fetch('/api/profile/analyse', { method: 'POST' })
      const data = await res.json()
      if (res.status === 429 && data.feature) {
        showUpgradeModal({ feature: data.feature, plan: data.plan, used: data.used, limit: data.limit }); return
      }
      if (data.error) { toast.error('Analysis failed: ' + data.error); return }
      setAnalysis({ ...data, analysed_at: new Date().toISOString() })
      toast.success('Profile analysed! Score: ' + data.score + '/100')
    } catch {
      toast.error('Failed to analyse profile.')
    } finally {
      setReanalysing(false)
    }
  }

  const firstName  = profile?.name?.split(' ')[0] || 'there'
  const hour       = new Date().getHours()
  const greeting   = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : hour < 21 ? 'Good evening' : 'Good night'
  const todayStr   = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })
  const postsUsed  = profile?.posts_used_this_month || 0
  const postsLimit = profile?.posts_limit || 12
  const pillars    = profile?.content_pillars || []
  const plan       = profile?.plan || 'starter'
  const _now       = new Date()
  const _dayOfYear = Math.floor((_now.getTime() - new Date(_now.getFullYear(), 0, 0).getTime()) / 86400000)
  const tipOfDay   = TIPS[_dayOfYear % TIPS.length]
  const nextPost   = posts[0] || null

  if (loading) {
    return (
      <div className="p-3 sm:p-5 md:p-8">
        <div style={{ height: 56, background: 'var(--surface-3)', borderRadius: 'var(--r-md)' }} className="animate-pulse mb-6 w-72" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 flex flex-col gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} style={{ height: 80, background: 'var(--surface-3)', borderRadius: 'var(--r-lg)' }} className="animate-pulse" />
            ))}
          </div>
          <div className="flex flex-col gap-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} style={{ height: 140, background: 'var(--surface-3)', borderRadius: 'var(--r-lg)' }} className="animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-3 sm:p-5 md:p-8">
      {/* ── Greeting ── */}
      <div className="mb-8">
        <Eyebrow dot className="mb-4">{todayStr}</Eyebrow>
        <DisplayHeading
          as="h1"
          size="h"
          text={`${greeting}, ${firstName}.`}
          accent="Your week is already written."
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ── Left (col-span-2) ── */}
        <div className="lg:col-span-2 flex flex-col gap-5">

          {/* Next post hero card */}
          <div className="rounded-xl p-5 relative overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--line)', boxShadow: 'var(--sh-2)' }}>
            <div className="text-[10px] mb-3" style={{ fontFamily: 'var(--f-mono)', color: 'var(--ink-4)', letterSpacing: '.06em' }}>// next post</div>
            {nextPost ? (
              <>
                <p className="text-[14px] leading-relaxed line-clamp-3 mb-4" style={{ color: 'var(--ink-2)', fontFamily: 'var(--f-sans)' }}>
                  {nextPost.content}
                </p>
                {nextPost.scheduled_at && (
                  <div className="flex items-center gap-1.5 mb-4" style={{ color: 'var(--ink-4)', fontFamily: 'var(--f-mono)', fontSize: 11 }}>
                    <Clock size={11} />
                    {new Date(nextPost.scheduled_at).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
                <div className="flex gap-2">
                  <Link href={`/dashboard/posts?edit=${nextPost.id}`}
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[12.5px] font-medium transition-colors"
                    style={{ background: 'var(--bg-2)', color: 'var(--ink-2)', border: '1px solid var(--line)', fontFamily: 'var(--f-sans)' }}>
                    <Edit3 size={12} /> Edit
                  </Link>
                  <Link href="/dashboard/calendar"
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[12.5px] font-medium transition-colors"
                    style={{ background: 'var(--bg-2)', color: 'var(--ink-2)', border: '1px solid var(--line)', fontFamily: 'var(--f-sans)' }}>
                    <Calendar size={12} /> Reschedule
                  </Link>
                  <button
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[12.5px] font-semibold text-white transition-all ml-auto"
                    style={{ background: 'var(--pl-accent)', fontFamily: 'var(--f-sans)' }}>
                    <Send size={12} /> Publish now
                  </button>
                </div>
              </>
            ) : (
              <EmptyState
                icon={CalendarDays}
                title="No posts scheduled"
                subtitle="Generate your first post and schedule it to go live automatically."
                ctaLabel="Generate a post"
                ctaHref="/dashboard/generate"
              />
            )}
          </div>

          {/* Quick actions */}
          <div>
            <div className="text-[10px] mb-3" style={{ fontFamily: 'var(--f-mono)', color: 'var(--ink-4)', letterSpacing: '.06em' }}>// quick actions</div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { href: '/dashboard/generate',          label: 'Generate',        sub: 'Write with AI',     icon: Sparkles },
                { href: '/dashboard/generate?tab=voice', label: 'Voice note',     sub: 'Speak your idea',   icon: Mic },
                { href: '/dashboard/generate?tab=bulk',  label: 'Plan a month',   sub: 'Bulk generate',     icon: CalendarDays },
              ].map(a => {
                const Icon = a.icon
                return (
                  <Link key={a.href} href={a.href}
                    className="flex flex-col gap-2 p-4 rounded-xl transition-all duration-200 hover:-translate-y-0.5 group"
                    style={{ background: 'var(--surface)', border: '1px solid var(--line)', boxShadow: 'var(--sh-1)' }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--pl-accent-soft)' }}>
                      <Icon size={15} style={{ color: 'var(--pl-accent)' }} strokeWidth={1.75} />
                    </div>
                    <div>
                      <div className="text-[13px] font-semibold" style={{ color: 'var(--ink)', fontFamily: 'var(--f-sans)' }}>{a.label}</div>
                      <div className="text-[11px]" style={{ color: 'var(--ink-4)' }}>{a.sub}</div>
                    </div>
                    <ArrowRight size={12} className="ml-auto transition-transform group-hover:translate-x-0.5" style={{ color: 'var(--ink-4)' }} />
                  </Link>
                )
              })}
            </div>
          </div>

          {/* 7-day schedule strip */}
          <div className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-[10px]" style={{ fontFamily: 'var(--f-mono)', color: 'var(--ink-4)', letterSpacing: '.06em' }}>// 7-day schedule</div>
              <Link href="/dashboard/calendar" className="text-[11px] flex items-center gap-0.5 transition-opacity hover:opacity-70" style={{ color: 'var(--pl-accent)', fontFamily: 'var(--f-mono)' }}>
                View all <ArrowRight size={10} />
              </Link>
            </div>
            <ScheduleStrip posts={posts} />
          </div>

          {/* Content pillars */}
          {pillars.length > 0 && (
            <div className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
              <div className="text-[10px] mb-3" style={{ fontFamily: 'var(--f-mono)', color: 'var(--ink-4)', letterSpacing: '.06em' }}>// content pillars</div>
              <div className="flex flex-wrap gap-2">
                {pillars.map(p => (
                  <Link key={p} href={`/dashboard/generate?idea=${encodeURIComponent(p)}`}
                    className="text-[12px] font-medium px-3 py-1.5 rounded-full transition-colors"
                    style={{ background: 'var(--pl-accent-soft)', color: 'var(--pl-accent)' }}>
                    {p}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Right column ── */}
        <div className="flex flex-col gap-4">
          {/* LinkedIn Score */}
          <div className="rounded-xl p-5 relative overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--line)', boxShadow: 'var(--sh-2)' }}>
            <ConcentricRings size={160} className="absolute inset-0 m-auto pointer-events-none" opacity={0.04} />
            <div className="text-[10px] mb-4 relative" style={{ fontFamily: 'var(--f-mono)', color: 'var(--ink-4)', letterSpacing: '.06em' }}>// linkedin score</div>
            {analysis ? (
              <>
                <div className="flex items-center gap-4 mb-3">
                  <div className="relative shrink-0">
                    <ScoreRing score={analysis.score} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[17px] font-extrabold" style={{ color: 'var(--ink)' }}>{analysis.score}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-extrabold" style={{ color: 'var(--ink)' }}>
                      {analysis.score}<span className="text-sm font-normal" style={{ color: 'var(--ink-4)' }}>/100</span>
                    </div>
                    <div className="text-[10px] mt-0.5" style={{ color: 'var(--ink-4)', fontFamily: 'var(--f-mono)' }}>
                      {(() => {
                        const days = Math.floor((Date.now() - new Date(analysis.analysed_at).getTime()) / (1000 * 60 * 60 * 24))
                        if (days < 1) return 'analysed today'
                        if (days === 1) return 'analysed yesterday'
                        return `${days} days ago`
                      })()}
                    </div>
                  </div>
                </div>
                {analysis.improvements?.slice(0, 2).map((tip, i) => (
                  <div key={i} className="flex gap-2 items-start text-[12px] mb-1.5" style={{ color: 'var(--ink-3)' }}>
                    <span className="mt-0.5 shrink-0" style={{ color: 'var(--pl-accent)' }}>→</span>
                    <span>{tip}</span>
                  </div>
                ))}
              </>
            ) : (
              <div className="text-center py-2">
                <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3" style={{ border: '3px solid var(--line-2)' }}>
                  <span className="text-[20px] font-extrabold" style={{ color: 'var(--ink-4)' }}>?</span>
                </div>
                <p className="text-[12px]" style={{ color: 'var(--ink-4)' }}>Run an AI analysis of your LinkedIn profile</p>
              </div>
            )}
            <button onClick={handleReanalyse} disabled={reanalysing}
              className="mt-3 w-full py-2 px-3 rounded-lg text-[12px] font-semibold flex items-center justify-center gap-1.5 transition-opacity disabled:opacity-60"
              style={{ background: 'var(--pl-accent-soft)', color: 'var(--pl-accent)', fontFamily: 'var(--f-sans)' }}>
              <RefreshCw size={13} className={reanalysing ? 'animate-spin' : ''} />
              {reanalysing ? 'Analysing...' : 'Analyse Profile'}
            </button>
          </div>

          {/* This month stats */}
          <div className="rounded-xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-[10px]" style={{ fontFamily: 'var(--f-mono)', color: 'var(--ink-4)', letterSpacing: '.06em' }}>// this month</div>
              <span className="text-[10px]" style={{ fontFamily: 'var(--f-mono)', color: 'var(--ink-4)' }}>{postsUsed}/{postsLimit}</span>
            </div>
            <div className="h-1 rounded-full mb-4 overflow-hidden" style={{ background: 'var(--line-2)' }}>
              <div className="h-full rounded-full" style={{ width: `${Math.min((postsUsed / postsLimit) * 100, 100)}%`, background: 'var(--pl-accent)' }} />
            </div>
            <div className="flex gap-2 flex-wrap">
              {[
                { label: 'Generated', value: monthStats.generated },
                { label: 'Published', value: monthStats.published, accent: true },
                { label: 'Pending',   value: monthStats.pending },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full" style={{ background: s.accent ? 'var(--pl-accent-soft)' : 'var(--surface-3)' }}>
                  <span className="text-sm font-bold" style={{ color: s.accent ? 'var(--pl-accent)' : 'var(--ink-2)' }}>{s.value}</span>
                  <span className="text-[10px]" style={{ color: s.accent ? 'var(--pl-accent)' : 'var(--ink-4)', fontFamily: 'var(--f-mono)' }}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Voice fingerprint */}
          <div className="rounded-xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
            <div className="text-[10px] mb-3" style={{ fontFamily: 'var(--f-mono)', color: 'var(--ink-4)', letterSpacing: '.06em' }}>// voice fingerprint</div>
            <VoiceFingerprint />
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[11px]" style={{ color: 'var(--ink-4)', fontFamily: 'var(--f-mono)' }}>match score</span>
              <span className="text-[13px] font-bold" style={{ color: 'var(--pl-accent)' }}>98%</span>
            </div>
          </div>

          {/* Tip of the day */}
          <div className="rounded-xl p-4 relative overflow-hidden" style={{ background: 'var(--pl-accent)', color: '#fff' }}>
            <div className="text-[9px] font-bold uppercase tracking-widest mb-2 opacity-70" style={{ fontFamily: 'var(--f-mono)' }}>// tip of the day</div>
            <p className="text-[13px] leading-relaxed font-medium opacity-90">{tipOfDay}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return <Suspense><DashboardContent /></Suspense>
}

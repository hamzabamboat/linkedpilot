'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import type { Post, UserProfile } from '@/lib/supabase'
import { toast } from 'sonner'
import {
  Sparkles,
  Mic,
  CalendarDays,
  RefreshCw,
  ArrowRight,
  Edit3,
  Send,
  Calendar,
} from 'lucide-react'
import { showUpgradeModal } from '@/components/upgrade-limit-modal'
import { DisplayHeading } from '@/components/display-heading'
import { Eyebrow } from '@/components/eyebrow'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'

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
  const r = 64
  const c = 2 * Math.PI * r
  const filled = (score / 100) * c
  const color = score >= 70 ? 'var(--pl-accent)' : score >= 40 ? '#d97706' : '#ef4444'
  return (
    <svg width={160} height={160} viewBox="0 0 160 160" className="-rotate-90">
      <circle cx={80} cy={80} r={r} fill="none" stroke="var(--line-2)" strokeWidth={10} />
      <circle
        cx={80} cy={80} r={r}
        fill="none" stroke={color} strokeWidth={10}
        strokeDasharray={`${filled} ${c - filled}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 1.2s ease' }}
      />
    </svg>
  )
}

/* ── Tone Wave ──────────────────────────────────────────────── */
function ToneWave() {
  return (
    <div style={{ height: 80 }}>
      <svg viewBox="0 0 200 80" preserveAspectRatio="none" width="100%" height="100%">
        <path
          d="M0,40 Q20,20 40,40 T80,40 T120,40 T160,40 T200,40"
          fill="none" stroke="var(--pl-accent)" strokeWidth={2}
        />
        <path
          d="M0,40 Q20,60 40,40 T80,40 T120,40 T160,40 T200,40"
          fill="none" stroke="var(--pl-accent)" strokeWidth={2} opacity={0.4}
        />
      </svg>
    </div>
  )
}

/* ── Schedule List ──────────────────────────────────────────── */
function ScheduleList({ posts }: { posts: Post[] }) {
  if (posts.length === 0) {
    return (
      <p style={{ fontSize: 13, color: 'var(--ink-4)', fontFamily: 'var(--f-mono)', padding: '16px 0', margin: 0 }}>
        No posts scheduled in the next 7 days.
      </p>
    )
  }
  return (
    <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {posts.map((post, i) => {
        const scheduled = post.scheduled_at ? new Date(post.scheduled_at) : null
        const day  = scheduled ? scheduled.toLocaleDateString('en-IN', { weekday: 'short' }) : '—'
        const time = scheduled ? scheduled.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—'
        const title = post.content?.split('\n')[0]?.slice(0, 80) || '(untitled)'
        const isLast = i === posts.length - 1

        let stateColor = 'var(--pl-accent)'
        let stateBg    = 'var(--pl-accent-soft)'
        let stateBorder = 'color-mix(in srgb, var(--pl-accent) 25%, transparent)'
        let stateLabel  = 'scheduled'
        if (post.status === 'draft') {
          stateColor = 'var(--ink-3)'; stateBg = 'var(--surface-2)'; stateBorder = 'var(--line)'; stateLabel = 'draft'
        } else if (post.status === 'pending_approval') {
          stateColor = '#d97706'; stateBg = 'rgba(245,158,11,.12)'; stateBorder = 'rgba(245,158,11,.25)'; stateLabel = 'needs approval'
        } else if (post.status === 'published') {
          stateColor = '#2ec27e'; stateBg = 'rgba(46,194,126,.12)'; stateBorder = 'rgba(46,194,126,.25)'; stateLabel = 'published'
        }

        return (
          <li
            key={post.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '40px 80px 1fr auto',
              gap: 12,
              alignItems: 'center',
              padding: '12px 0',
              borderBottom: isLast ? 'none' : '1px dashed var(--line)',
            }}
          >
            <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--ink-4)' }}>{day}</span>
            <span style={{ fontFamily: 'var(--f-mono)', fontSize: 12, color: 'var(--ink-2)' }}>{time}</span>
            <span style={{
              color: 'var(--ink)', fontWeight: 500, fontSize: 13.5,
              overflow: 'hidden', display: '-webkit-box',
              WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', lineHeight: 1.35,
            }}>
              {title}
            </span>
            <span style={{
              fontFamily: 'var(--f-mono)', fontSize: 10.5,
              padding: '3px 8px', borderRadius: 4, whiteSpace: 'nowrap',
              color: stateColor, background: stateBg,
              border: `1px solid ${stateBorder}`,
            }}>
              {stateLabel}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

/* ── Main dashboard content ─────────────────────────────────── */
function DashboardContent() {
  const searchParams = useSearchParams()
  const upgraded = searchParams.get('upgraded')

  const [profile,     setProfile]     = useState<UserProfile | null>(null)
  const [posts,       setPosts]       = useState<Post[]>([])
  const [analysis,    setAnalysis]    = useState<ProfileAnalysis | null>(null)
  const [reanalysing, setReanalysing] = useState(false)
  const [loading,     setLoading]     = useState(true)
  const [monthStats,  setMonthStats]  = useState({ generated: 0, scheduled: 0, draft: 0, needsApproval: 0 })
  const [user,        setUser]        = useState<{ linkedin_name?: string; linkedin_picture?: string } | null>(null)

  useEffect(() => {
    if (upgraded) toast.success('Subscription activated! Welcome to the plan.')
  }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const meRes = await fetch('/api/me')
        if (!meRes.ok) { window.location.href = '/'; return }
        const { user: u, profile: p } = await meRes.json()
        if (!p || cancelled) return
        if (!cancelled) { setProfile(p); setUser(u) }

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
            generated:     all.length,
            scheduled:     all.filter(p => p.status === 'scheduled').length,
            draft:         all.filter(p => p.status === 'draft').length,
            needsApproval: all.filter(p => p.status === 'pending_approval').length,
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

  const firstName  = profile?.name?.split(' ')[0] || user?.linkedin_name?.split(' ')[0] || 'there'
  const hour       = new Date().getHours()
  const greeting   = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : hour < 21 ? 'Good evening' : 'Good night'
  const todayStr   = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })
  const postsUsed  = profile?.posts_used_this_month || 0
  const postsLimit = profile?.posts_limit || 12
  const _now       = new Date()
  const _dayOfYear = Math.floor((_now.getTime() - new Date(_now.getFullYear(), 0, 0).getTime()) / 86400000)
  const tipOfDay   = TIPS[_dayOfYear % TIPS.length]
  const nextPost   = posts[0] || null

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <div className="p-5 md:p-8">
        <div style={{ height: 56, background: 'var(--surface-3)', borderRadius: 'var(--r-md)' }} className="animate-pulse mb-6 w-72" />
        <div style={{ height: 130, background: 'var(--surface-3)', borderRadius: 'var(--r-lg)' }} className="animate-pulse mb-4" />
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[0, 1, 2].map(i => (
            <div key={i} style={{ height: 90, background: 'var(--surface-3)', borderRadius: 'var(--r-md)' }} className="animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[0, 1, 2].map(i => (
            <div key={i} style={{ height: 220, background: 'var(--surface-3)', borderRadius: 'var(--r-md)' }} className="animate-pulse" />
          ))}
        </div>
        <div style={{ height: 200, background: 'var(--surface-3)', borderRadius: 'var(--r-md)' }} className="animate-pulse" />
      </div>
    )
  }

  return (
    <div className="p-5 md:p-8">

      {/* ── Greeting ── */}
      <header className="mb-7">
        <Eyebrow dot className="mb-3">{todayStr}</Eyebrow>
        <DisplayHeading as="h1" size="h" text={`${greeting}, ${firstName}.`} accent="Your week is already written." />
      </header>

      {/* ── Next Post Hero ── */}
      <div
        className="rounded-xl p-5 mb-4"
        style={{
          background: 'linear-gradient(180deg, var(--surface) 0%, color-mix(in srgb, var(--pl-accent) 4%, var(--surface)) 120%)',
          border: '1px solid color-mix(in srgb, var(--pl-accent) 14%, var(--line))',
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--ink-4)', letterSpacing: '.04em' }}>
            Next post
          </span>
          {nextPost?.scheduled_at && (
            <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--ink-3)' }}>
              scheduled · {new Date(nextPost.scheduled_at).toLocaleDateString('en-IN', { weekday: 'short' })}{' '}
              {new Date(nextPost.scheduled_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
            </span>
          )}
        </div>

        {nextPost ? (
          <div className="rounded-lg p-4" style={{ background: 'var(--surface-2)', border: '1px solid var(--line)' }}>
            {/* Author row */}
            <div className="flex items-center gap-2.5 mb-3">
              <Avatar className="w-8 h-8 shrink-0">
                <AvatarImage src={user?.linkedin_picture || ''} />
                <AvatarFallback style={{
                  background: 'linear-gradient(135deg, var(--pl-accent), var(--pl-accent))',
                  color: '#fff', fontWeight: 700, fontSize: 13,
                }}>
                  {(user?.linkedin_name || firstName)[0]?.toUpperCase() || 'A'}
                </AvatarFallback>
              </Avatar>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.25 }}>
                  {user?.linkedin_name || firstName}
                </div>
                <div style={{ fontFamily: 'var(--f-mono)', fontSize: 10.5, color: 'var(--ink-4)' }}>
                  in your voice · approved
                </div>
              </div>
            </div>

            {/* Content */}
            <p style={{
              fontSize: 14, lineHeight: 1.6, color: 'var(--ink-2)', margin: '0 0 14px',
              display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>
              {nextPost.content}
            </p>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href={`/dashboard/posts?edit=${nextPost.id}`}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[12.5px] font-medium transition-colors"
                style={{ background: 'var(--surface)', color: 'var(--ink-2)', border: '1px solid var(--line)', fontFamily: 'var(--f-sans)' }}
              >
                <Edit3 size={12} /> Edit
              </Link>
              <Link
                href="/dashboard/calendar"
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[12.5px] font-medium transition-colors"
                style={{ background: 'transparent', color: 'var(--ink-3)', fontFamily: 'var(--f-sans)' }}
              >
                <Calendar size={12} /> Reschedule
              </Link>
              <button
                className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-md text-[12.5px] font-semibold text-white transition-all ml-auto"
                style={{ background: 'var(--pl-accent)', fontFamily: 'var(--f-sans)' }}
              >
                <Send size={12} /> Publish now
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-lg p-6 text-center" style={{ background: 'var(--surface-2)', border: '1px solid var(--line)' }}>
            <CalendarDays size={28} className="mx-auto mb-2" style={{ color: 'var(--ink-4)' }} strokeWidth={1.5} />
            <p style={{ fontSize: 14, color: 'var(--ink-3)', margin: '0 0 12px' }}>No posts scheduled yet</p>
            <Link
              href="/dashboard/generate"
              className="inline-flex items-center gap-1.5 h-8 px-4 rounded-md text-[13px] font-semibold text-white"
              style={{ background: 'var(--pl-accent)' }}
            >
              <Sparkles size={13} /> Generate a post
            </Link>
          </div>
        )}
      </div>

      {/* ── Quick Actions ── */}
      <div className="grid grid-cols-3 gap-2.5 mb-6">
        {[
          { href: '/dashboard/generate',            icon: Sparkles,     label: 'Generate post',     sub: 'AI · in your voice' },
          { href: '/dashboard/generate?tab=voice',  icon: Mic,          label: 'Voice note → post', sub: 'Ramble. Get a draft.' },
          { href: '/dashboard/generate?tab=bulk',   icon: CalendarDays, label: 'Bulk plan month',   sub: '30 posts · 8 minutes' },
        ].map(a => {
          const Icon = a.icon
          return (
            <Link
              key={a.href}
              href={a.href}
              className="flex flex-col items-start gap-1 p-3.5 rounded-xl transition-all duration-200 hover:-translate-y-0.5"
              style={{ background: 'var(--surface)', border: '1px solid var(--line)', boxShadow: 'var(--sh-1)' }}
            >
              <Icon size={18} style={{ color: 'var(--pl-accent)', marginBottom: 6 }} strokeWidth={1.5} />
              <strong style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 600, lineHeight: 1.25, display: 'block' }}>
                {a.label}
              </strong>
              <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--ink-4)', lineHeight: 1.4, display: 'block' }}>
                {a.sub}
              </span>
            </Link>
          )
        })}
      </div>

      {/* ── Overview Grid (12-col) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 14 }}>

        {/* LinkedIn Score — span 4 */}
        <div
          className="flex flex-col gap-3.5 ov-card"
          style={{
            gridColumn: 'span 4',
            background: 'var(--surface)', border: '1px solid var(--line)',
            borderRadius: 'var(--r-md)', padding: 22,
          }}
        >
          <div className="flex items-center justify-between">
            <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--ink-4)', letterSpacing: '.04em' }}>
              LinkedIn Score
            </span>
            {analysis && (
              <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--ink-3)' }}>
                ↑ updated
              </span>
            )}
          </div>

          {analysis ? (
            <>
              <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', margin: '8px 0' }}>
                <ScoreRing score={analysis.score} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
                  <strong style={{ fontSize: 44, fontWeight: 500, letterSpacing: '-.03em', color: 'var(--ink)' }}>
                    {analysis.score}
                  </strong>
                  <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--ink-4)', marginTop: 4 }}>
                    / 100
                  </span>
                </div>
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {analysis.improvements?.slice(0, 3).map((tip, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.4 }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: 4,
                      background: i < 2 ? '#2ec27e' : '#f59e0b',
                    }} />
                    {tip}
                  </li>
                ))}
              </ul>

              <Link
                href="/dashboard/analytics"
                style={{ fontFamily: 'var(--f-mono)', fontSize: 11.5, color: 'var(--pl-accent)', marginTop: 'auto' }}
              >
                See full breakdown →
              </Link>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 0', gap: 12 }}>
              <div style={{ width: 120, height: 120, borderRadius: '50%', border: '10px solid var(--line-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 38, fontWeight: 500, color: 'var(--ink-4)' }}>?</span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--ink-4)', textAlign: 'center', margin: 0 }}>
                Run an AI analysis of your LinkedIn profile
              </p>
            </div>
          )}

          <button
            onClick={handleReanalyse}
            disabled={reanalysing}
            className="w-full py-2 px-3 rounded-lg text-[12px] font-semibold flex items-center justify-center gap-1.5 transition-opacity disabled:opacity-60"
            style={{ background: 'var(--pl-accent-soft)', color: 'var(--pl-accent)', fontFamily: 'var(--f-sans)' }}
          >
            <RefreshCw size={13} className={reanalysing ? 'animate-spin' : ''} />
            {reanalysing ? 'Analysing...' : 'Analyse Profile'}
          </button>
        </div>

        {/* This Month — span 4 */}
        <div
          className="flex flex-col ov-card"
          style={{
            gridColumn: 'span 4',
            background: 'var(--surface)', border: '1px solid var(--line)',
            borderRadius: 'var(--r-md)', padding: 22,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--ink-4)', letterSpacing: '.04em' }}>
              This month
            </span>
            <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--ink-3)' }}>
              {new Date().toLocaleDateString('en-IN', { month: 'short' })} 1 – {new Date().getDate()}
            </span>
          </div>

          {/* Big number */}
          <div style={{ padding: '4px 0' }}>
            <div style={{ fontSize: 'clamp(36px, 4vw, 48px)', fontWeight: 500, letterSpacing: '-.035em', lineHeight: 1, color: 'var(--ink)' }}>
              {postsUsed}
              <em style={{ fontFamily: 'var(--f-mono)', fontStyle: 'normal', fontSize: '0.35em', color: 'var(--ink-4)', marginLeft: 6 }}>
                / {postsLimit}
              </em>
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 6 }}>Posts shipped</div>
            <div style={{ marginTop: 12, height: 6, background: 'var(--surface-3)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${Math.min((postsUsed / postsLimit) * 100, 100)}%`,
                background: 'linear-gradient(90deg, var(--pl-accent), var(--pl-accent-2))',
                borderRadius: 99,
              }} />
            </div>
          </div>

          {/* 3-col stat row */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10,
            marginTop: 18, paddingTop: 18, borderTop: '1px dashed var(--line)',
          }}>
            {[
              { label: 'scheduled',     value: monthStats.scheduled },
              { label: 'in draft',      value: monthStats.draft },
              { label: 'need approval', value: monthStats.needsApproval },
            ].map(s => (
              <div key={s.label}>
                <strong style={{ display: 'block', fontSize: 22, fontWeight: 500, letterSpacing: '-.025em', color: 'var(--ink)' }}>
                  {s.value}
                </strong>
                <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--ink-4)' }}>{s.label}</span>
              </div>
            ))}
          </div>

          {/* Embedded tip */}
          <div style={{ marginTop: 18, paddingTop: 18, borderTop: '1px dashed var(--line)' }}>
            <span style={{ fontFamily: 'var(--f-mono)', fontSize: 10.5, color: 'var(--ink-4)', letterSpacing: '.04em', display: 'block', marginBottom: 8 }}>
              // tip of the day
            </span>
            <blockquote style={{
              margin: 0,
              fontFamily: 'var(--f-display, Georgia, serif)',
              fontStyle: 'italic',
              fontSize: 'clamp(14px, 1.3vw, 17px)',
              lineHeight: 1.45,
              color: 'var(--ink)',
            }}>
              <span style={{ color: 'var(--pl-accent)', fontSize: '1.3em', lineHeight: 1, marginRight: 2 }}>"</span>
              {tipOfDay}
            </blockquote>
          </div>
        </div>

        {/* Voice Fingerprint — span 4 */}
        <div
          className="flex flex-col gap-3.5 ov-card"
          style={{
            gridColumn: 'span 4',
            background: 'var(--surface)', border: '1px solid var(--line)',
            borderRadius: 'var(--r-md)', padding: 22,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--ink-4)', letterSpacing: '.04em' }}>
              Voice fingerprint
            </span>
            <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--ink-3)' }}>
              98% tone match
            </span>
          </div>

          <ToneWave />

          <p style={{ fontSize: 13.5, color: 'var(--ink-3)', lineHeight: 1.55, margin: 0, flex: 1 }}>
            Your last 5 posts averaged{' '}
            <strong style={{ color: 'var(--pl-accent)', fontWeight: 600 }}>98%</strong>{' '}
            match against your reference samples. Keep going — the model is locking in.
          </p>

          <Link
            href="/dashboard/profile"
            style={{ fontFamily: 'var(--f-mono)', fontSize: 11.5, color: 'var(--pl-accent)', marginTop: 'auto' }}
          >
            Inspect voice →
          </Link>
        </div>

        {/* Upcoming Schedule — span 12 */}
        <div
          style={{
            gridColumn: 'span 12',
            background: 'var(--surface)', border: '1px solid var(--line)',
            borderRadius: 'var(--r-md)', padding: 22,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--ink-4)', letterSpacing: '.04em' }}>
              Upcoming · 7 days
            </span>
            <Link
              href="/dashboard/calendar"
              style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--pl-accent)', display: 'flex', alignItems: 'center', gap: 2 }}
            >
              See calendar <ArrowRight size={10} />
            </Link>
          </div>
          <ScheduleList posts={posts} />
        </div>

      </div>

      {/* Responsive override for small screens */}
      <style>{`
        @media (max-width: 900px) {
          .ov-card { grid-column: span 6 !important; }
        }
        @media (max-width: 600px) {
          .ov-card { grid-column: span 12 !important; }
        }
      `}</style>
    </div>
  )
}

export default function DashboardPage() {
  return <Suspense><DashboardContent /></Suspense>
}

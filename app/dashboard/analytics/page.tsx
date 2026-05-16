'use client'

import { useState, useEffect } from 'react'
import { supabase, Post } from '@/lib/supabase'
import Link from 'next/link'
import {
  ThumbsUp, Eye, FileEdit, BarChart3, Zap, Trophy, TrendingUp, RefreshCw,
} from 'lucide-react'

type ScoreRecord = { score: number; recorded_at: string }

function LineChart({ data }: { data: number[] }) {
  if (data.length === 0) return (
    <div className="h-28 flex items-center justify-center flex-col gap-2">
      <TrendingUp className="w-7 h-7" style={{ color: 'var(--ink-4)' }} strokeWidth={1.5} />
      <div style={{ fontSize: 13, color: 'var(--ink-4)' }}>No data yet</div>
    </div>
  )
  const max = Math.max(...data, 1)
  const w = 600; const h = 100; const pad = 10
  const step = (w - pad * 2) / Math.max(data.length - 1, 1)
  const points = data.map((v, i) => `${pad + i * step},${h - pad - (v / max) * (h - pad * 2)}`)
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-28">
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--pl-accent)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="var(--pl-accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`${pad},${h - pad} ${points.join(' ')} ${pad + (data.length - 1) * step},${h - pad}`} fill="url(#chartGrad)" />
      <polyline points={points.join(' ')} fill="none" stroke="var(--pl-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((v, i) => (
        <circle key={i} cx={pad + i * step} cy={h - pad - (v / max) * (h - pad * 2)} r="3.5" fill="var(--surface)" stroke="var(--pl-accent)" strokeWidth="2" />
      ))}
    </svg>
  )
}

function HeatmapCell({ value, max }: { value: number; max: number }) {
  const intensity = max > 0 ? value / max : 0
  return (
    <div
      className="w-9 h-9 rounded-lg flex items-center justify-center text-[11px] font-semibold transition-all"
      style={{
        background: intensity === 0 ? 'var(--surface-2)' : `color-mix(in srgb, var(--pl-accent) ${Math.round(10 + intensity * 80)}%, var(--surface-2))`,
        color: intensity > 0.5 ? '#fff' : intensity > 0 ? 'var(--pl-accent)' : 'var(--ink-4)',
      }}
    >
      {value || ''}
    </div>
  )
}

const STAT_CONFIGS = [
  { key: 'reactions', label: 'Avg Reactions', icon: ThumbsUp },
  { key: 'impressions', label: 'Total Impressions', icon: Eye },
  { key: 'posts', label: 'Posts Published', icon: FileEdit },
  { key: 'score', label: 'Current Score', icon: BarChart3 },
]

export default function AnalyticsPage() {
  const [plan, setPlan] = useState('starter')
  const [loading, setLoading] = useState(true)
  const [scores, setScores] = useState<ScoreRecord[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)

  async function fetchData(uid: string) {
    const [scoresRes, postsRes] = await Promise.all([
      supabase.from('linkedin_scores').select('score, recorded_at').eq('user_id', uid).order('recorded_at', { ascending: true }).limit(12),
      supabase.from('posts').select('*').eq('user_id', uid).eq('status', 'published').order('reactions', { ascending: false }),
    ])
    setScores(scoresRes.data || [])
    setPosts(postsRes.data || [])
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const meRes = await fetch('/api/me')
        if (!meRes.ok) { window.location.href = '/'; return }
        const { user, profile } = await meRes.json()
        if (!user) { window.location.href = '/'; return }
        if (cancelled) return
        setPlan(profile?.plan || 'starter')
        if (profile?.plan === 'starter') { if (!cancelled) setLoading(false); return }
        setUserId(user.id)
        await fetchData(user.id)
        const lastScore = (await supabase.from('linkedin_scores').select('recorded_at').eq('user_id', user.id).order('recorded_at', { ascending: false }).limit(1)).data?.[0]
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
        if (!lastScore || new Date(lastScore.recorded_at).getTime() < oneDayAgo) {
          fetch('/api/scoring', { method: 'POST' }).then(() => { if (!cancelled) fetchData(user.id) }).catch(() => {})
        }
      } catch { /* non-fatal */ } finally { if (!cancelled) setLoading(false) }
    }
    load()
    return () => { cancelled = true }
  }, [])

  async function syncFromLinkedIn() {
    if (!userId) return
    setSyncing(true); setSyncMsg(null)
    try {
      const res = await fetch('/api/linkedin/sync-stats', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setSyncMsg(data.error || 'Sync failed') }
      else {
        const base = data.message || `Synced ${data.synced} of ${data.total} posts`
        setSyncMsg(data.warning ? `${base}. ${data.warning}` : base)
        if (data.synced > 0) await fetchData(userId)
      }
    } catch { setSyncMsg('Sync failed. Please try again.') } finally {
      setSyncing(false)
      setTimeout(() => setSyncMsg(null), 8000)
    }
  }

  if (loading) {
    return (
      <div className="p-3 sm:p-4 md:p-7">
        <div className="skeleton h-8 w-48 mb-6 rounded" />
        <div className="skeleton h-48 rounded-2xl mb-5" />
        <div className="skeleton h-48 rounded-2xl" />
      </div>
    )
  }

  if (plan === 'starter') {
    return (
      <div className="p-3 sm:p-4 md:p-7 max-w-2xl">
        <h1 style={{ fontFamily: 'var(--f-sans)', fontWeight: 600, fontSize: 22, color: 'var(--ink)', letterSpacing: '-0.025em', marginBottom: 24 }}>
          Analytics
        </h1>
        <div className="flex flex-col items-center justify-center py-16 text-center"
          style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', background: 'var(--surface)' }}>
          <div className="flex items-center justify-center mb-5"
            style={{ width: 56, height: 56, borderRadius: 'var(--r-md)', background: 'var(--pl-accent-soft)', border: '1px solid var(--pl-accent-2)' }}>
            <BarChart3 className="w-7 h-7" style={{ color: 'var(--pl-accent)' }} strokeWidth={1.5} />
          </div>
          <h2 style={{ fontWeight: 600, fontSize: 18, color: 'var(--ink)', marginBottom: 10 }}>Analytics is a Standard+ feature</h2>
          <p style={{ fontSize: 13, color: 'var(--ink-4)', lineHeight: 1.55, marginBottom: 24, maxWidth: 340 }}>
            Get LinkedIn Score history, engagement trends, best posting times heatmap, and your top-performing posts.
          </p>
          <Link href="/dashboard/settings?tab=plan"
            className="flex items-center gap-1.5 transition-opacity hover:opacity-80"
            style={{ background: 'var(--pl-accent)', color: '#fff', borderRadius: 'var(--r-sm)', padding: '9px 18px', fontSize: 14, fontWeight: 600 }}>
            <Zap className="w-4 h-4" /> Upgrade to Standard
          </Link>
        </div>
      </div>
    )
  }

  const scoreValues = scores.map(s => s.score)
  const topPosts = posts.slice(0, 3)
  const publishedByPillar: Record<string, number> = {}
  posts.forEach(p => { if (p.content_pillar) publishedByPillar[p.content_pillar] = (publishedByPillar[p.content_pillar] || 0) + 1 })

  const now = new Date()
  const weekBuckets = [0, 0, 0, 0]
  posts.forEach(p => {
    if (!p.published_at) return
    const weeksAgo = Math.floor((now.getTime() - new Date(p.published_at).getTime()) / (7 * 24 * 60 * 60 * 1000))
    if (weeksAgo >= 0 && weeksAgo < 4) weekBuckets[3 - weeksAgo]++
  })
  const weekMax = Math.max(...weekBuckets, 1)
  const weekLabels = ['3w ago', '2w ago', 'Last week', 'This week']
  const pillarMax = Math.max(...Object.values(publishedByPillar), 1)

  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17]
  const heatmapData: Record<string, number> = {}
  posts.forEach(p => {
    if (p.published_at) {
      const d = new Date(p.published_at)
      const day = DAYS[d.getDay() === 0 ? 6 : d.getDay() - 1]
      const key = `${day}-${d.getHours()}`
      heatmapData[key] = (heatmapData[key] || 0) + (p.reactions || 0)
    }
  })
  const heatmapMax = Math.max(...Object.values(heatmapData), 1)
  const avgEngagement = posts.length > 0 ? Math.round(posts.reduce((s, p) => s + (p.reactions || 0), 0) / posts.length) : 0
  const totalImpressions = posts.reduce((s, p) => s + (p.impressions || 0), 0)
  const statValues = {
    reactions: avgEngagement,
    impressions: totalImpressions > 0 ? totalImpressions.toLocaleString('en-IN') : '–',
    posts: posts.length,
    score: scores[scores.length - 1]?.score ?? '–',
  }
  const medalColors = ['#f59e0b', '#94a3b8', '#d97706']

  return (
    <div className="p-3 sm:p-4 md:p-7 max-w-4xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 style={{ fontFamily: 'var(--f-sans)', fontWeight: 600, fontSize: 22, color: 'var(--ink)', letterSpacing: '-0.025em', marginBottom: 4 }}>
            Analytics
          </h1>
          <p style={{ fontSize: 13, color: 'var(--ink-4)', fontFamily: 'var(--f-mono)' }}>// your LinkedIn performance at a glance</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button
            onClick={syncFromLinkedIn}
            disabled={syncing}
            className="flex items-center gap-1.5 transition-all hover:opacity-80"
            style={{
              border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', padding: '7px 14px',
              fontSize: 13, fontWeight: 500, color: 'var(--ink-2)', background: 'var(--surface)',
              opacity: syncing ? 0.6 : 1,
            }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing…' : 'Sync LinkedIn'}
          </button>
          {syncMsg && <p style={{ fontSize: 12, color: 'var(--ink-4)' }}>{syncMsg}</p>}
        </div>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-5">
        {STAT_CONFIGS.map(cfg => {
          const Icon = cfg.icon
          return (
            <div key={cfg.key} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: '18px 16px' }}>
              <div className="flex items-center justify-center mb-3"
                style={{ width: 36, height: 36, borderRadius: 'var(--r-sm)', background: 'var(--pl-accent-soft)' }}>
                <Icon className="w-4 h-4" style={{ color: 'var(--pl-accent)' }} strokeWidth={1.75} />
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.04em', marginBottom: 4 }}>
                {statValues[cfg.key as keyof typeof statValues]}
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-4)', fontWeight: 500 }}>{cfg.label}</div>
            </div>
          )
        })}
      </div>

      {/* Posts per week bar chart */}
      <div className="mb-5" style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: '18px 20px' }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)', marginBottom: 2 }}>Posts Published</div>
        <div style={{ fontSize: 12, color: 'var(--ink-4)', marginBottom: 16, fontFamily: 'var(--f-mono)' }}>// last 4 weeks</div>
        <div className="flex items-end gap-3 h-28 pt-2">
          {weekBuckets.map((count, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>{count}</span>
              <div
                className="w-full rounded-t-lg transition-all"
                style={{ background: 'var(--pl-accent)', height: `${Math.max((count / weekMax) * 72, count > 0 ? 6 : 0)}px`, opacity: 0.85 }}
              />
              <span style={{ fontSize: 10, color: 'var(--ink-4)', whiteSpace: 'nowrap' }}>{weekLabels[i]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[3fr_2fr] gap-4 md:gap-5 mb-5">
        {/* Score history */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: '18px 20px' }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)', marginBottom: 2 }}>LinkedIn Score History</div>
          <div style={{ fontSize: 12, color: 'var(--ink-4)', marginBottom: 14, fontFamily: 'var(--f-mono)' }}>// last 12 weeks</div>
          <LineChart data={scoreValues} />
          {scores.length > 0 && (
            <div className="flex justify-between mt-3">
              {scores.slice(-6).map((s, i) => (
                <div key={i} className="text-center">
                  <div style={{ fontSize: 10, color: 'var(--ink-4)' }}>{new Date(s.recorded_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>{s.score}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Content pillars */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: '18px 20px' }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)', marginBottom: 14 }}>Content Pillars</div>
          {Object.keys(publishedByPillar).length === 0 ? (
            <div className="text-center pt-6">
              <BarChart3 className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--ink-4)' }} strokeWidth={1.5} />
              <div style={{ fontSize: 13, color: 'var(--ink-4)' }}>No published posts yet</div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {Object.entries(publishedByPillar).sort((a, b) => b[1] - a[1]).map(([pillar, count]) => (
                <div key={pillar}>
                  <div className="flex justify-between mb-1.5">
                    <span style={{ fontSize: 13, color: 'var(--ink-2)', fontWeight: 500 }}>{pillar}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{count}</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--surface-2)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: 'var(--pl-accent)', borderRadius: 3, width: `${(count / pillarMax) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Heatmap */}
      <div className="mb-5" style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: '18px 20px' }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)', marginBottom: 2 }}>Best Posting Times</div>
        <div style={{ fontSize: 12, color: 'var(--ink-4)', marginBottom: 16, fontFamily: 'var(--f-mono)' }}>// based on reactions per time slot</div>
        <div className="overflow-x-auto">
          <div className="grid gap-1 min-w-[360px]" style={{ gridTemplateColumns: `60px repeat(${DAYS.length}, 36px)` }}>
            <div />
            {DAYS.map(d => <div key={d} className="text-center h-9 flex items-center justify-center" style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-4)' }}>{d}</div>)}
            {HOURS.map(h => (
              <div key={h} className="contents">
                <div className="h-9 flex items-center justify-end pr-2" style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--f-mono)' }}>{h}:00</div>
                {DAYS.map(d => <HeatmapCell key={`${d}-${h}`} value={heatmapData[`${d}-${h}`] || 0} max={heatmapMax} />)}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top posts */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: '18px 20px' }}>
        <div className="flex items-center gap-2 mb-14px" style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)', marginBottom: 14 }}>
          <Trophy className="w-4 h-4" style={{ color: '#f59e0b' }} />
          Top Posts of All Time
        </div>
        {topPosts.length === 0 ? (
          <div className="text-center py-8">
            <Trophy className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--ink-4)' }} strokeWidth={1.5} />
            <div style={{ fontSize: 13, color: 'var(--ink-4)' }}>No published posts yet. Start generating and publishing!</div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {topPosts.map((post, i) => (
              <div key={post.id} className="flex gap-4 p-4 transition-colors"
                style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-md)', background: 'var(--surface-2)' }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: medalColors[i] + '18' }}>
                  <Trophy className="w-4 h-4" style={{ color: medalColors[i] }} strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="overflow-hidden mb-2.5" style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {post.content}
                  </p>
                  <div className="flex gap-4 flex-wrap">
                    {post.impressions != null && (
                      <span className="flex items-center gap-1" style={{ fontSize: 12, color: 'var(--ink-4)' }}>
                        <Eye className="w-3 h-3" /> {post.impressions.toLocaleString()}
                      </span>
                    )}
                    {post.reactions != null && (
                      <span className="flex items-center gap-1" style={{ fontSize: 12, color: 'var(--ink-4)' }}>
                        <ThumbsUp className="w-3 h-3" /> {post.reactions}
                      </span>
                    )}
                    {post.published_at && (
                      <span style={{ fontSize: 12, color: 'var(--ink-4)', fontFamily: 'var(--f-mono)' }}>
                        {new Date(post.published_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

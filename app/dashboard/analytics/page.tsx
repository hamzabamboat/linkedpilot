'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase, Post } from '@/lib/supabase'
import Link from 'next/link'
import {
  ThumbsUp, Eye, FileEdit, BarChart3, Zap, Trophy, TrendingUp, Sparkles,
} from 'lucide-react'

type ScoreRecord = { score: number; recorded_at: string }
type ProfileAnalysis = { score: number; improvements: string[]; analysed_at: string }

const LS_KEY_PREFIX = 'plAnalysis_'

function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function LineChart({ data }: { data: number[] }) {
  if (data.length === 0) return (
    <div className="h-24 sm:h-28 flex items-center justify-center flex-col gap-2">
      <TrendingUp className="w-6 h-6 sm:w-7 sm:h-7" style={{ color: 'var(--ink-4)' }} strokeWidth={1.5} />
      <div style={{ fontSize: 13, color: 'var(--ink-4)' }}>No data yet</div>
    </div>
  )
  const max = Math.max(...data, 1)
  const w = 600; const h = 100; const pad = 10
  const step = (w - pad * 2) / Math.max(data.length - 1, 1)
  const points = data.map((v, i) => `${pad + i * step},${h - pad - (v / max) * (h - pad * 2)}`)
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-24 sm:h-28">
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
      className="rounded-md sm:rounded-lg flex items-center justify-center font-semibold transition-all"
      style={{
        width: 28, height: 28,
        fontSize: 10,
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
  const [analysis, setAnalysis] = useState<ProfileAnalysis | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshMsg, setRefreshMsg] = useState<string | null>(null)

  async function fetchData(uid: string) {
    const [scoresRes, postsRes] = await Promise.all([
      supabase.from('linkedin_scores').select('score, recorded_at').eq('user_id', uid).order('recorded_at', { ascending: true }).limit(12),
      supabase.from('posts').select('*').eq('user_id', uid).eq('status', 'published').order('reactions', { ascending: false }),
    ])
    setScores(scoresRes.data || [])
    setPosts(postsRes.data || [])
  }

  const fetchAnalysis = useCallback(async (uid: string, forceRefresh = false) => {
    const lsKey = LS_KEY_PREFIX + uid
    if (!forceRefresh) {
      const cached = localStorage.getItem(lsKey)
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as ProfileAnalysis
          setAnalysis(parsed)
          return
        } catch { /* ignore bad cache */ }
      }
    }
    try {
      const res = await fetch('/api/profile/analyse')
      if (res.ok) {
        const data = await res.json()
        const latest = data?.analyses?.[0]
        if (latest) {
          setAnalysis(latest)
          localStorage.setItem(lsKey, JSON.stringify(latest))
          return
        }
      }
    } catch { /* non-fatal */ }
  }, [])

  async function refreshAnalytics() {
    if (!userId || refreshing) return
    setRefreshing(true)
    setRefreshMsg(null)
    try {
      const syncRes = await fetch('/api/linkedin/sync-stats', { method: 'POST' })
      const syncData = await syncRes.json()
      if (!syncRes.ok) {
        setRefreshMsg(syncData.error || 'Sync failed')
        return
      }
      if (syncData.synced > 0) await fetchData(userId)

      const res = await fetch('/api/profile/analyse', { method: 'POST' })
      const data = await res.json()
      if (res.status === 429) {
        setRefreshMsg(data.error || 'Limit reached — try again later.')
        return
      }
      if (!res.ok || data.error) {
        setRefreshMsg(data.error || 'Analysis failed. Please try again.')
        return
      }
      const analysisResult: ProfileAnalysis = { ...data, analysed_at: new Date().toISOString() }
      setAnalysis(analysisResult)
      localStorage.setItem(LS_KEY_PREFIX + userId, JSON.stringify(analysisResult))
      setRefreshMsg(null)
    } catch {
      setRefreshMsg('Refresh failed. Please try again.')
    } finally {
      setRefreshing(false)
      setTimeout(() => setRefreshMsg(null), 8000)
    }
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
        await Promise.all([
          fetchData(user.id),
          fetchAnalysis(user.id),
        ])
        const lastScore = (await supabase.from('linkedin_scores').select('recorded_at').eq('user_id', user.id).order('recorded_at', { ascending: false }).limit(1)).data?.[0]
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
        if (!lastScore || new Date(lastScore.recorded_at).getTime() < oneDayAgo) {
          fetch('/api/scoring', { method: 'POST' }).then(() => { if (!cancelled) fetchData(user.id) }).catch(() => {})
        }
      } catch { /* non-fatal */ } finally { if (!cancelled) setLoading(false) }
    }
    load()
    return () => { cancelled = true }
  }, [fetchAnalysis])

  if (loading) {
    return (
      <div className="p-4 sm:p-5 md:p-7">
        <div className="skeleton h-4 w-24 mb-3 rounded" />
        <div className="skeleton h-8 w-64 mb-6 rounded" />
        <div className="skeleton h-40 rounded-2xl mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-28 rounded-xl" />)}
        </div>
        <div className="skeleton h-48 rounded-2xl" />
      </div>
    )
  }

  if (plan === 'starter') {
    return (
      <div className="p-4 sm:p-5 md:p-7 max-w-2xl">
        <div className="db-screen__eyebrow">// Last 30 days</div>
        <h1 className="db-screen__title" style={{ marginBottom: 24 }}>
          What your audience <em>actually said back.</em>
        </h1>
        <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-center"
          style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', background: 'var(--surface)' }}>
          <div className="flex items-center justify-center mb-4"
            style={{ width: 52, height: 52, borderRadius: 'var(--r-md)', background: 'var(--pl-accent-soft)', border: '1px solid var(--pl-accent-2)' }}>
            <BarChart3 className="w-6 h-6" style={{ color: 'var(--pl-accent)' }} strokeWidth={1.5} />
          </div>
          <h2 style={{ fontWeight: 600, fontSize: 17, color: 'var(--ink)', marginBottom: 8 }}>Analytics is a Standard+ feature</h2>
          <p style={{ fontSize: 13, color: 'var(--ink-4)', lineHeight: 1.55, marginBottom: 24, maxWidth: 300, padding: '0 16px' }}>
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
  const weekLabels = ['3w ago', '2w ago', 'Last wk', 'This wk']
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
    score: analysis?.score ?? scores[scores.length - 1]?.score ?? '–',
  }
  const medalColors = ['#f59e0b', '#94a3b8', '#d97706']

  return (
    <div className="p-4 sm:p-5 md:p-7 max-w-4xl">

      {/* Header: title left, refresh right — stacks on mobile */}
      <div className="mb-5 sm:mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
        <div>
          <div className="db-screen__eyebrow">// Last 30 days</div>
          <h1 className="db-screen__title" style={{ marginBottom: 0 }}>
            What your audience <em>actually said back.</em>
          </h1>
        </div>
        <div className="flex flex-col items-start sm:items-end gap-1.5 shrink-0">
          <button
            type="button"
            onClick={refreshAnalytics}
            disabled={refreshing}
            className="flex items-center gap-1.5 transition-all hover:opacity-80"
            style={{
              border: '1px solid var(--pl-accent)',
              borderRadius: 'var(--r-sm)',
              padding: '7px 14px',
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--pl-accent)',
              background: 'var(--pl-accent-soft)',
              opacity: refreshing ? 0.6 : 1,
              whiteSpace: 'nowrap',
            }}
          >
            <Sparkles className={`w-3.5 h-3.5 ${refreshing ? 'animate-pulse' : ''}`} />
            {refreshing ? 'Refreshing…' : 'Refresh Analytics'}
          </button>
          {refreshMsg && (
            <p style={{ fontSize: 12, color: 'var(--ink-4)' }}>{refreshMsg}</p>
          )}
          {analysis?.analysed_at && !refreshMsg && (
            <p style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--f-mono)' }}>
              refreshed {timeAgo(analysis.analysed_at)}
            </p>
          )}
        </div>
      </div>

      {/* Profile Analysis Card */}
      {analysis && (
        <div className="mb-4 sm:mb-5"
          style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: '16px' }}>
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="min-w-0">
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)', marginBottom: 2 }}>Profile Analysis</div>
              <div style={{ fontSize: 12, color: 'var(--ink-4)', fontFamily: 'var(--f-mono)' }}>
                // AI-powered · {timeAgo(analysis.analysed_at)}
              </div>
            </div>
            <div style={{
              width: 48, height: 48, borderRadius: '50%', border: '3px solid var(--pl-accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.03em' }}>{analysis.score}</span>
            </div>
          </div>
          {analysis.improvements?.length > 0 && (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {analysis.improvements.slice(0, 4).map((tip, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.5 }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%', flexShrink: 0, marginTop: 5,
                    background: i < 2 ? 'var(--pl-accent)' : '#f59e0b',
                  }} />
                  {tip}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Stat grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 sm:mb-5">
        {STAT_CONFIGS.map(cfg => {
          const Icon = cfg.icon
          return (
            <div key={cfg.key}
              style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: '14px 14px 12px' }}>
              <div className="flex items-center justify-center mb-2.5"
                style={{ width: 32, height: 32, borderRadius: 'var(--r-sm)', background: 'var(--pl-accent-soft)' }}>
                <Icon className="w-4 h-4" style={{ color: 'var(--pl-accent)' }} strokeWidth={1.75} />
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.04em', marginBottom: 3, lineHeight: 1 }}>
                {statValues[cfg.key as keyof typeof statValues]}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-4)', fontWeight: 500 }}>{cfg.label}</div>
            </div>
          )
        })}
      </div>

      {/* Posts per week bar chart */}
      <div className="mb-4 sm:mb-5"
        style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: '16px' }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)', marginBottom: 2 }}>Posts Published</div>
        <div style={{ fontSize: 12, color: 'var(--ink-4)', marginBottom: 14, fontFamily: 'var(--f-mono)' }}>// last 4 weeks</div>
        <div className="flex items-end gap-2 sm:gap-3 h-24 sm:h-28 pt-2">
          {weekBuckets.map((count, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink)' }}>{count}</span>
              <div
                className="w-full rounded-t-lg transition-all"
                style={{ background: 'var(--pl-accent)', height: `${Math.max((count / weekMax) * 64, count > 0 ? 6 : 0)}px`, opacity: 0.85 }}
              />
              <span style={{ fontSize: 10, color: 'var(--ink-4)', whiteSpace: 'nowrap' }}>{weekLabels[i]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Score history + Content pillars */}
      <div className="grid grid-cols-1 md:grid-cols-[3fr_2fr] gap-4 mb-4 sm:mb-5">
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: '16px' }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)', marginBottom: 2 }}>LinkedIn Score History</div>
          <div style={{ fontSize: 12, color: 'var(--ink-4)', marginBottom: 12, fontFamily: 'var(--f-mono)' }}>// last 12 weeks</div>
          <LineChart data={scoreValues} />
          {scores.length > 0 && (
            <div className="flex justify-between mt-3 gap-1">
              {scores.slice(-6).map((s, i) => (
                <div key={i} className="text-center min-w-0">
                  <div style={{ fontSize: 10, color: 'var(--ink-4)', whiteSpace: 'nowrap' }}>
                    {new Date(s.recorded_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink)' }}>{s.score}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: '16px' }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)', marginBottom: 12 }}>Content Pillars</div>
          {Object.keys(publishedByPillar).length === 0 ? (
            <div className="text-center pt-4 sm:pt-6">
              <BarChart3 className="w-7 h-7 mx-auto mb-2" style={{ color: 'var(--ink-4)' }} strokeWidth={1.5} />
              <div style={{ fontSize: 13, color: 'var(--ink-4)' }}>No published posts yet</div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {Object.entries(publishedByPillar).sort((a, b) => b[1] - a[1]).map(([pillar, count]) => (
                <div key={pillar}>
                  <div className="flex justify-between mb-1.5 gap-2">
                    <span className="truncate" style={{ fontSize: 13, color: 'var(--ink-2)', fontWeight: 500 }}>{pillar}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', flexShrink: 0 }}>{count}</span>
                  </div>
                  <div style={{ height: 5, background: 'var(--surface-2)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: 'var(--pl-accent)', borderRadius: 3, width: `${(count / pillarMax) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Heatmap */}
      <div className="mb-4 sm:mb-5"
        style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: '16px' }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)', marginBottom: 2 }}>Best Posting Times</div>
        <div style={{ fontSize: 12, color: 'var(--ink-4)', marginBottom: 14, fontFamily: 'var(--f-mono)' }}>// based on reactions per time slot</div>
        <div className="overflow-x-auto -mx-1 px-1">
          <div style={{ display: 'grid', gridTemplateColumns: `44px repeat(${DAYS.length}, 28px)`, gap: 3, minWidth: 260 }}>
            <div />
            {DAYS.map(d => (
              <div key={d} className="flex items-center justify-center" style={{ height: 20, fontSize: 10, fontWeight: 600, color: 'var(--ink-4)' }}>{d}</div>
            ))}
            {HOURS.map(h => (
              <div key={h} className="contents">
                <div className="flex items-center justify-end pr-1.5" style={{ height: 28, fontSize: 10, color: 'var(--ink-4)', fontFamily: 'var(--f-mono)' }}>
                  {h}:00
                </div>
                {DAYS.map(d => <HeatmapCell key={`${d}-${h}`} value={heatmapData[`${d}-${h}`] || 0} max={heatmapMax} />)}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top posts */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: '16px' }}>
        <div className="flex items-center gap-2 mb-3" style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>
          <Trophy className="w-4 h-4" style={{ color: '#f59e0b' }} />
          Top Posts of All Time
        </div>
        {topPosts.length === 0 ? (
          <div className="text-center py-8">
            <Trophy className="w-9 h-9 mx-auto mb-3" style={{ color: 'var(--ink-4)' }} strokeWidth={1.5} />
            <div style={{ fontSize: 13, color: 'var(--ink-4)' }}>No published posts yet. Start generating and publishing!</div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {topPosts.map((post, i) => (
              <div key={post.id} className="flex gap-3 p-3 sm:p-4"
                style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-md)', background: 'var(--surface-2)' }}>
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: medalColors[i] + '18' }}>
                  <Trophy className="w-4 h-4" style={{ color: medalColors[i] }} strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="mb-2" style={{
                    fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5,
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  }}>
                    {post.content}
                  </p>
                  <div className="flex gap-3 flex-wrap" style={{ rowGap: 4 }}>
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

'use client'

import { useState, useEffect } from 'react'
import { supabase, Post } from '@/lib/supabase'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  ThumbsUp,
  Eye,
  FileEdit,
  BarChart3,
  Zap,
  Trophy,
  TrendingUp,
} from 'lucide-react'

type ScoreRecord = { score: number; recorded_at: string }

function LineChart({ data }: { data: number[] }) {
  if (data.length === 0) return (
    <div className="h-28 flex items-center justify-center">
      <div className="text-center">
        <TrendingUp className="w-8 h-8 text-slate-200 mx-auto mb-2" strokeWidth={1.5} />
        <div className="text-sm text-slate-400">No data yet</div>
      </div>
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
          <stop offset="0%" stopColor="#0A66C2" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#0A66C2" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`${pad},${h - pad} ${points.join(' ')} ${pad + (data.length - 1) * step},${h - pad}`} fill="url(#chartGrad)" />
      <polyline points={points.join(' ')} fill="none" stroke="#0A66C2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((v, i) => (
        <circle key={i} cx={pad + i * step} cy={h - pad - (v / max) * (h - pad * 2)} r="3.5" fill="white" stroke="#0A66C2" strokeWidth="2" />
      ))}
    </svg>
  )
}

function HeatmapCell({ value, max }: { value: number; max: number }) {
  const intensity = max > 0 ? value / max : 0
  const bg = intensity === 0 ? '#f8faff' : `rgba(10,102,194,${0.1 + intensity * 0.8})`
  return (
    <div className="w-9 h-9 rounded-lg flex items-center justify-center text-[11px] font-semibold transition-all"
      style={{ background: bg, color: intensity > 0.5 ? 'white' : intensity > 0 ? '#0A66C2' : '#cbd5e1' }}>
      {value || ''}
    </div>
  )
}

const STAT_CONFIGS = [
  { key: 'reactions', label: 'Avg Reactions', icon: ThumbsUp, color: '#0A66C2', bg: '#e8f0fb' },
  { key: 'impressions', label: 'Total Impressions', icon: Eye, color: '#7c3aed', bg: '#f5f3ff' },
  { key: 'posts', label: 'Posts Published', icon: FileEdit, color: '#059669', bg: '#ecfdf5' },
  { key: 'score', label: 'Current Score', icon: BarChart3, color: '#d97706', bg: '#fffbeb' },
]

export default function AnalyticsPage() {
  const [plan, setPlan] = useState('starter')
  const [loading, setLoading] = useState(true)
  const [scores, setScores] = useState<ScoreRecord[]>([])
  const [posts, setPosts] = useState<Post[]>([])

  useEffect(() => {
    async function load() {
      const meRes = await fetch('/api/me')
      const { user, profile } = await meRes.json()
      if (!user) { window.location.href = '/'; return }
      setPlan(profile?.plan || 'starter')
      if (profile?.plan === 'starter') { setLoading(false); return }
      const [scoresRes, postsRes] = await Promise.all([
        supabase.from('linkedin_scores').select('score, recorded_at').eq('user_id', user.id).order('recorded_at', { ascending: true }).limit(12),
        supabase.from('posts').select('*').eq('user_id', user.id).eq('status', 'published').order('reactions', { ascending: false }),
      ])
      setScores(scoresRes.data || [])
      setPosts(postsRes.data || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="p-8">
        <div className="skeleton h-8 w-48 mb-6 rounded" />
        <div className="skeleton h-48 rounded-xl mb-5" />
        <div className="skeleton h-48 rounded-xl" />
      </div>
    )
  }

  if (plan === 'starter') {
    return (
      <div className="p-4 md:p-8 max-w-2xl">
        <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-2 tracking-tight">Analytics</h1>
        <Card className="mt-6 border-slate-100 shadow-sm">
          <CardContent className="py-16 px-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand/10 to-pro/10 flex items-center justify-center mx-auto mb-5">
              <BarChart3 className="w-8 h-8 text-brand" strokeWidth={1.5} />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-3">Analytics is a Standard+ feature</h2>
            <p className="text-slate-500 text-sm leading-relaxed mb-7 max-w-sm mx-auto">
              Get LinkedIn Score history, engagement trends, best posting times heatmap, and your top-performing posts.
            </p>
            <Button render={<Link href="/dashboard/settings?tab=plan" />} className="gap-1.5">
              <Zap className="w-4 h-4" />
              Upgrade to Standard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const scoreValues = scores.map(s => s.score)
  const topPosts = posts.slice(0, 3)
  const publishedByPillar: Record<string, number> = {}
  posts.forEach(p => { if (p.content_pillar) publishedByPillar[p.content_pillar] = (publishedByPillar[p.content_pillar] || 0) + 1 })
  const pillarMax = Math.max(...Object.values(publishedByPillar), 1)

  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17]
  const heatmapData: Record<string, number> = {}
  posts.forEach(p => {
    if (p.published_at) {
      const d = new Date(p.published_at)
      const day = DAYS[d.getDay() === 0 ? 6 : d.getDay() - 1]
      const h = d.getHours()
      const key = `${day}-${h}`
      heatmapData[key] = (heatmapData[key] || 0) + (p.reactions || 0)
    }
  })
  const heatmapMax = Math.max(...Object.values(heatmapData), 1)
  const avgEngagement = posts.length > 0 ? Math.round(posts.reduce((s, p) => s + (p.reactions || 0), 0) / posts.length) : 0
  const totalImpressions = posts.reduce((s, p) => s + (p.impressions || 0), 0)

  const statValues = {
    reactions: avgEngagement,
    impressions: totalImpressions.toLocaleString('en-IN'),
    posts: posts.length,
    score: scores[scores.length - 1]?.score ?? '–',
  }

  const medalColors = ['#f59e0b', '#94a3b8', '#d97706']
  const medalBgs = ['#fffbeb', '#f8fafc', '#fff7ed']

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <div className="mb-5 md:mb-7">
        <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-1 tracking-tight">Analytics</h1>
        <p className="text-slate-400 text-sm font-medium">Your LinkedIn performance at a glance</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-5 md:mb-6">
        {STAT_CONFIGS.map(cfg => {
          const Icon = cfg.icon
          return (
            <Card key={cfg.key} className="border-slate-100 shadow-sm card-hover">
              <CardContent className="pt-5 pb-5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: cfg.bg }}>
                  <Icon className="w-4.5 h-4.5" style={{ color: cfg.color }} strokeWidth={1.75} />
                </div>
                <div className="text-2xl font-extrabold text-slate-900 mb-1 tracking-tight">
                  {statValues[cfg.key as keyof typeof statValues]}
                </div>
                <div className="text-xs text-slate-400 font-medium">{cfg.label}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[3fr_2fr] gap-4 md:gap-5 mb-4 md:mb-5">
        <Card className="border-slate-100 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-[14px] font-semibold text-slate-900">LinkedIn Score History</CardTitle>
            <p className="text-xs text-slate-400">Last 12 weeks</p>
          </CardHeader>
          <CardContent>
            <LineChart data={scoreValues} />
            {scores.length > 0 && (
              <div className="flex justify-between mt-3">
                {scores.slice(-6).map((s, i) => (
                  <div key={i} className="text-center">
                    <div className="text-[10px] text-slate-400">{new Date(s.recorded_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
                    <div className="text-xs font-bold text-slate-900">{s.score}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-100 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-[14px] font-semibold text-slate-900">Content Pillars</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(publishedByPillar).length === 0 ? (
              <div className="text-center pt-6">
                <BarChart3 className="w-8 h-8 text-slate-200 mx-auto mb-2" strokeWidth={1.5} />
                <div className="text-sm text-slate-400">No published posts yet</div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {Object.entries(publishedByPillar).sort((a, b) => b[1] - a[1]).map(([pillar, count]) => (
                  <div key={pillar}>
                    <div className="flex justify-between mb-1.5">
                      <span className="text-sm text-slate-600 font-medium">{pillar}</span>
                      <span className="text-sm font-bold text-slate-900">{count}</span>
                    </div>
                    <Progress value={(count / pillarMax) * 100} className="h-1.5" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mb-5 border-slate-100 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-[14px] font-semibold text-slate-900">Best Posting Times</CardTitle>
          <p className="text-xs text-slate-400">Based on reactions earned per time slot</p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="grid gap-1 min-w-[360px]" style={{ gridTemplateColumns: `60px repeat(${DAYS.length}, 36px)` }}>
              <div />
              {DAYS.map(d => <div key={d} className="text-center text-[11px] font-bold text-slate-400 h-9 flex items-center justify-center">{d}</div>)}
              {HOURS.map(h => (
                <div key={h} className="contents">
                  <div className="text-[11px] text-slate-400 h-9 flex items-center justify-end pr-2 font-medium">{h}:00</div>
                  {DAYS.map(d => <HeatmapCell key={`${d}-${h}`} value={heatmapData[`${d}-${h}`] || 0} max={heatmapMax} />)}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-100 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-[14px] font-semibold text-slate-900 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            Top Posts of All Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topPosts.length === 0 ? (
            <div className="text-center py-8">
              <Trophy className="w-10 h-10 text-slate-200 mx-auto mb-3" strokeWidth={1.5} />
              <div className="text-sm text-slate-400">No published posts yet. Start generating and publishing!</div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {topPosts.map((post, i) => (
                <div key={post.id} className="flex gap-4 p-4 border border-slate-100 rounded-xl hover:bg-slate-50/50 transition-colors">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                    style={{ background: medalBgs[i], color: medalColors[i] }}>
                    <Trophy className="w-4 h-4" style={{ color: medalColors[i] }} strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-600 leading-relaxed mb-2.5 overflow-hidden" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{post.content}</p>
                    <div className="flex gap-4 flex-wrap">
                      {post.impressions != null && (
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          <Eye className="w-3 h-3" /> {post.impressions.toLocaleString()}
                        </span>
                      )}
                      {post.reactions != null && (
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          <ThumbsUp className="w-3 h-3" /> {post.reactions}
                        </span>
                      )}
                      {post.published_at && (
                        <span className="text-xs text-slate-300">
                          {new Date(post.published_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase, User, Post, UserProfile, PostSuggestion } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  Sparkles,
  Mic,
  BookOpen,
  Calendar,
  ThumbsUp,
  Eye,
  FileText,
  Lightbulb,
  ArrowRight,
  TrendingUp,
  Clock,
} from 'lucide-react'

type Score = { score: number; breakdown: { posting_consistency: number; avg_engagement: number; profile_completeness: number }; recorded_at: string }

function ScoreRing({ score }: { score: number }) {
  const r = 38; const c = 2 * Math.PI * r
  const filled = (score / 100) * c
  const color = score >= 70 ? '#059669' : score >= 40 ? '#d97706' : '#ef4444'
  return (
    <svg width={100} height={100} viewBox="0 0 100 100">
      <circle cx={50} cy={50} r={r} fill="none" stroke="#f1f5f9" strokeWidth={8} />
      <circle cx={50} cy={50} r={r} fill="none" stroke={color} strokeWidth={8}
        strokeDasharray={`${filled} ${c - filled}`} strokeDashoffset={c * 0.25} strokeLinecap="round" />
      <text x={50} y={54} textAnchor="middle" fontSize={20} fontWeight={800} fill={color}>{score}</text>
      <text x={50} y={68} textAnchor="middle" fontSize={10} fill="#94a3b8">/100</text>
    </svg>
  )
}

const STATUS_COLOR: Record<string, string> = {
  draft: '#94a3b8', pending_approval: '#f59e0b', approved: '#10b981',
  scheduled: '#0A66C2', publishing: '#8b5cf6', published: '#059669', failed: '#ef4444', rejected: '#dc2626',
}

function DashboardContent() {
  const searchParams = useSearchParams()
  const upgraded = searchParams.get('upgraded')
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [score, setScore] = useState<Score | null>(null)
  const [suggestions, setSuggestions] = useState<PostSuggestion[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (upgraded) toast.success('Subscription activated! Welcome to the plan.')
  }, [])

  useEffect(() => {
    async function load() {
      const meRes = await fetch('/api/me')
      if (!meRes.ok) { window.location.href = '/'; return }
      const { user: u, profile: p } = await meRes.json()
      setUser(u); setProfile(p)

      const [postsRes, scoreRes, suggestionsRes] = await Promise.all([
        supabase.from('posts').select('*').eq('user_id', u.id).order('created_at', { ascending: false }).limit(5),
        supabase.from('linkedin_scores').select('*').eq('user_id', u.id).order('recorded_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('post_suggestions').select('*').eq('user_id', u.id).eq('status', 'pending').order('created_at', { ascending: false }).limit(3),
      ])
      setPosts(postsRes.data || [])
      setScore(scoreRes.data)
      setSuggestions(suggestionsRes.data || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <div className="skeleton h-8 w-56 mb-2.5 rounded" />
          <div className="skeleton h-4 w-40 rounded" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="border-slate-100">
              <CardContent className="pt-6">
                <div className="skeleton h-4 w-3/5 mb-3 rounded" />
                <div className="skeleton h-7 w-2/5 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!user) return null

  const scheduledPosts = posts.filter(p => p.status === 'scheduled')
  const nextPost = scheduledPosts.sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime())[0]
  const postsUsed = profile?.posts_used_this_month || 0
  const postsLimit = profile?.posts_limit || 12
  const planLabel = profile?.plan ? profile.plan.charAt(0).toUpperCase() + profile.plan.slice(1) : 'Starter'
  const firstName = user.linkedin_name?.split(' ')[0] || 'there'
  const usagePct = Math.min((postsUsed / postsLimit) * 100, 100)

  return (
    <div className="p-4 md:p-7 max-w-[1000px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-6 md:mb-8">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-1 tracking-tight">
            Good morning, {firstName}
          </h1>
          <p className="text-sm text-slate-400 font-medium">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <Button render={<Link href="/dashboard/generate" />} className="gap-2 shadow-sm hover:shadow-md transition-shadow w-full sm:w-auto">
          <Sparkles className="size-4" />
          Generate Post
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-5 md:mb-7">
        {/* LinkedIn Score */}
        <Card className="border-slate-100 card-hover">
          <CardContent className="pt-5 flex items-center gap-3.5">
            <ScoreRing score={score?.score || 0} />
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">LinkedIn Score</div>
              <div className="flex items-center gap-1 text-[12px] text-slate-500">
                <TrendingUp className="w-3 h-3 text-emerald-500" />
                Updated weekly
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Posts this month */}
        <Card className="border-slate-100 card-hover">
          <CardContent className="pt-5">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Posts This Month</div>
            <div className="text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">
              {postsUsed}<span className="text-base font-medium text-slate-300">/{postsLimit}</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-1.5">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${usagePct}%`, background: postsUsed >= postsLimit ? '#ef4444' : '#0A66C2' }}
              />
            </div>
            <div className="text-[11px] text-slate-400">{planLabel} · {postsLimit - postsUsed} remaining</div>
          </CardContent>
        </Card>

        {/* Next post */}
        <Card className="border-slate-100 card-hover">
          <CardContent className="pt-5">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Next Scheduled</div>
            {nextPost ? (
              <>
                <p className="text-[13px] text-slate-700 leading-snug line-clamp-3 mb-2">{nextPost.content}</p>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-brand">
                  <Clock className="w-3 h-3" />
                  {new Date(nextPost.scheduled_at!).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </div>
              </>
            ) : (
              <div className="text-center pt-2">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center mx-auto mb-2.5">
                  <Calendar className="w-5 h-5 text-slate-300" />
                </div>
                <div className="text-[12px] text-slate-400 mb-2">No posts scheduled</div>
                <Link href="/dashboard/generate" className="text-[12px] text-brand font-semibold flex items-center justify-center gap-1">
                  Schedule one <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick actions */}
        <Card className="border-slate-100 card-hover">
          <CardContent className="pt-5">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3.5">Quick Actions</div>
            <div className="flex flex-col gap-2">
              {[
                { href: '/dashboard/generate', label: 'Generate Post', icon: Sparkles, bg: '#e8f0fb', color: '#0A66C2' },
                { href: '/dashboard/generate?tab=voice', label: 'Voice Note', icon: Mic, bg: '#f5f3ff', color: '#7c3aed' },
                { href: '/dashboard/generate?tab=story', label: 'Story Bank', icon: BookOpen, bg: '#f0fdf4', color: '#059669' },
              ].map(a => {
                const Icon = a.icon
                return (
                  <Link key={a.href} href={a.href}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-semibold transition-all duration-150 hover:brightness-95"
                    style={{ background: a.bg, color: a.color }}>
                    <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
                    {a.label}
                  </Link>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr] gap-4 md:gap-5">
        {/* Recent posts */}
        <Card className="overflow-hidden border-slate-100">
          <CardHeader className="py-4 px-6 border-b border-slate-50 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-[14px] font-semibold text-slate-900">Recent Posts</CardTitle>
            <Link href="/dashboard/posts" className="text-[13px] text-brand font-semibold flex items-center gap-1 hover:gap-1.5 transition-all">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          {posts.length === 0 ? (
            <CardContent className="py-14 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-4">
                <FileText className="w-6 h-6 text-slate-300" strokeWidth={1.5} />
              </div>
              <div className="font-semibold text-slate-700 mb-1.5">No posts yet</div>
              <div className="text-[13px] text-slate-400 mb-5">Generate your first AI post and start growing</div>
              <Button render={<Link href="/dashboard/generate" />} size="sm" className="gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Generate Now
              </Button>
            </CardContent>
          ) : (
            <div>
              {posts.map(post => (
                <div key={post.id} className="px-6 py-4 border-b border-slate-50 last:border-0 flex gap-3.5 items-start hover:bg-slate-50/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-slate-600 leading-relaxed line-clamp-2">{post.content}</p>
                    <div className="flex gap-3 mt-2.5 items-center flex-wrap">
                      <span
                        className="text-[11px] px-2 py-0.5 rounded-full font-semibold"
                        style={{ background: (STATUS_COLOR[post.status] || '#94a3b8') + '18', color: STATUS_COLOR[post.status] || '#94a3b8' }}
                      >
                        {post.status.replace('_', ' ')}
                      </span>
                      {post.reactions != null && (
                        <span className="flex items-center gap-1 text-[11px] text-slate-400">
                          <ThumbsUp className="w-3 h-3" /> {post.reactions}
                        </span>
                      )}
                      {post.impressions != null && (
                        <span className="flex items-center gap-1 text-[11px] text-slate-400">
                          <Eye className="w-3 h-3" /> {post.impressions}
                        </span>
                      )}
                      <span className="text-[11px] text-slate-300 ml-auto">
                        {new Date(post.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Trending suggestions */}
        <Card className="overflow-hidden border-slate-100">
          <CardHeader className="py-4 px-6 border-b border-slate-50 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-[14px] font-semibold text-slate-900">Trending Ideas</CardTitle>
            <Link href="/dashboard/suggestions" className="text-[13px] text-brand font-semibold flex items-center gap-1 hover:gap-1.5 transition-all">
              See all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          {suggestions.length === 0 ? (
            <CardContent className="py-14 text-center">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
                <Lightbulb className="w-6 h-6 text-amber-400" strokeWidth={1.5} />
              </div>
              <div className="text-[13px] text-slate-500 font-medium mb-1">Generating ideas...</div>
              <div className="text-[12px] text-slate-400 mb-4">Fresh ideas based on your industry</div>
              <Link href="/dashboard/suggestions" className="text-[13px] text-brand font-semibold flex items-center justify-center gap-1">
                View suggestions <ArrowRight className="w-3 h-3" />
              </Link>
            </CardContent>
          ) : (
            <div>
              {suggestions.map(s => (
                <div key={s.id} className="px-5 py-4 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                  <p className="text-[13px] text-slate-600 leading-relaxed mb-2.5 line-clamp-2">{s.suggestion_text}</p>
                  <div className="flex gap-2 items-center">
                    <Badge variant="secondary" className="text-[11px] font-medium">{s.source}</Badge>
                    <Link
                      href={`/dashboard/generate?idea=${encodeURIComponent(s.suggestion_text)}`}
                      className="text-[12px] font-semibold text-brand ml-auto flex items-center gap-1 hover:gap-1.5 transition-all"
                    >
                      Generate <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return <Suspense><DashboardContent /></Suspense>
}

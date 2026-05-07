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
  CheckCircle2,
  Circle,
  RefreshCw,
  ImageIcon,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'

type ProfileAnalysis = {
  score: number
  breakdown: Record<string, { score: number; max: number; tip: string }>
  improvements: string[]
  analysed_at: string
}

type RoadmapStep = {
  label: string
  done: boolean
  current: boolean
  href: string
}

function getRoadmapSteps(
  preference: string,
  profileComplete: boolean,
  pillarsSet: boolean,
  hasPost: boolean,
): { title: string; steps: RoadmapStep[] } {
  if (preference === 'autopilot') {
    return {
      title: 'Your path to full autopilot',
      steps: [
        { label: 'Complete your profile', done: profileComplete, current: !profileComplete, href: '/dashboard/settings' },
        { label: 'Set your content pillars', done: pillarsSet, current: profileComplete && !pillarsSet, href: '/dashboard/settings#pillars' },
        { label: 'Upload your first images', done: false, current: profileComplete && pillarsSet && !hasPost, href: '/dashboard/generate#images' },
        { label: 'Generate your first batch of posts', done: hasPost, current: profileComplete && pillarsSet, href: '/dashboard/generate' },
        { label: 'Posts go live automatically', done: false, current: hasPost, href: '/dashboard/posts' },
      ],
    }
  }
  if (preference === 'suggest') {
    return {
      title: 'Your quick start guide',
      steps: [
        { label: 'Complete your profile', done: profileComplete, current: !profileComplete, href: '/dashboard/settings' },
        { label: 'Browse today\'s suggestions', done: false, current: profileComplete, href: '/dashboard/suggestions' },
        { label: 'Generate your first post', done: hasPost, current: !hasPost && profileComplete, href: '/dashboard/generate' },
        { label: 'Review analytics', done: false, current: hasPost, href: '/dashboard/analytics' },
      ],
    }
  }
  return {
    title: 'Your path to growth',
    steps: [
      { label: 'Complete your profile', done: profileComplete, current: !profileComplete, href: '/dashboard/settings' },
      { label: 'Set your content pillars', done: pillarsSet, current: profileComplete && !pillarsSet, href: '/dashboard/settings#pillars' },
      { label: 'Generate your first batch of posts', done: hasPost, current: pillarsSet && !hasPost, href: '/dashboard/generate' },
      { label: 'Browse today\'s suggestions', done: false, current: hasPost, href: '/dashboard/suggestions' },
      { label: 'Review analytics', done: false, current: false, href: '/dashboard/analytics' },
    ],
  }
}

function RoadmapPanel({ profile, posts, analysis, onReanalyse, reanalysing, analyseError }: {
  profile: UserProfile | null
  posts: Post[]
  analysis: ProfileAnalysis | null
  onReanalyse: () => void
  reanalysing: boolean
  analyseError: string
}) {
  const preference = (profile as Record<string, unknown>)?.control_preference as string || 'approve'
  const profileComplete = !!(profile?.name && profile?.industry && profile?.content_pillars?.length)
  const pillarsSet = !!(profile?.content_pillars?.length)
  const hasPost = posts.length > 0
  const { title, steps } = getRoadmapSteps(preference, profileComplete, pillarsSet, hasPost)

  return (
    <div className="flex flex-col gap-4">
      {/* Roadmap card */}
      <Card className="border-slate-100 shadow-sm">
        <CardContent className="pt-5 pb-5">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">{title}</div>
          <div className="flex flex-col gap-2">
            {steps.map((step, i) => (
              <Link
                key={i}
                href={step.href}
                className={`flex items-center gap-2.5 text-[13px] rounded-lg px-2 py-1.5 -mx-2 transition-colors cursor-pointer ${
                  step.done
                    ? 'text-slate-300 hover:bg-slate-50'
                    : step.current
                    ? 'text-[#0B458B] font-semibold hover:bg-blue-50'
                    : 'text-slate-400 hover:bg-slate-50'
                }`}
              >
                {step.done
                  ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" strokeWidth={2} />
                  : step.current
                  ? <div className="w-4 h-4 rounded-full border-2 border-[#0B458B] bg-[#0B458B]/10 shrink-0 animate-pulse" />
                  : <Circle className="w-4 h-4 text-slate-200 shrink-0" strokeWidth={2} />
                }
                <span className={step.done ? 'line-through' : ''}>{step.label}</span>
                {step.current && <ArrowRight className="w-3 h-3 ml-auto shrink-0" />}
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Profile score card */}
      <Card className="border-slate-100 shadow-sm">
        <CardContent className="pt-5 pb-5">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">LinkedIn Profile Score</div>
          {analyseError && (
            <div className="mb-3 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
                <p className="text-[11px] text-red-600 leading-relaxed">{analyseError}</p>
              </div>
            </div>
          )}
          {analysis ? (
            <>
              <div className="flex items-center gap-3 mb-3">
                <div className="relative w-14 h-14 shrink-0">
                  <svg viewBox="0 0 56 56" className="w-14 h-14 -rotate-90">
                    <circle cx={28} cy={28} r={22} fill="none" stroke="#f1f5f9" strokeWidth={5} />
                    <circle cx={28} cy={28} r={22} fill="none" stroke="#0B458B" strokeWidth={5}
                      strokeDasharray={`${(analysis.score / 100) * 2 * Math.PI * 22} ${2 * Math.PI * 22}`}
                      strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[13px] font-extrabold text-[#0B458B]">{analysis.score}</span>
                  </div>
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">{analysis.score}/100</div>
                  <div className="text-[11px] text-slate-400">
                    {new Date(analysis.analysed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </div>
                </div>
              </div>
              {analysis.improvements?.slice(0, 3).map((tip, i) => (
                <div key={i} className="flex gap-2 items-start text-[12px] text-slate-500 mb-1.5">
                  <span className="text-[#0B458B] mt-0.5 shrink-0">→</span>
                  <span>{tip}</span>
                </div>
              ))}
              <button
                onClick={onReanalyse}
                disabled={reanalysing}
                className="mt-3 flex items-center gap-1.5 text-[12px] text-slate-400 hover:text-brand transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${reanalysing ? 'animate-spin' : ''}`} />
                {reanalysing ? 'Analysing...' : 'Re-analyse now'}
              </button>
            </>
          ) : (
            <div className="text-center py-3">
              <div className="text-[12px] text-slate-400 mb-3">Run an AI analysis of your LinkedIn profile</div>
              <button
                onClick={onReanalyse}
                disabled={reanalysing}
                className="w-full py-2 px-3 bg-[#0B458B] text-white text-[12px] font-semibold rounded-lg hover:bg-[#0B458B]/90 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60"
              >
                <RefreshCw className={`w-3 h-3 ${reanalysing ? 'animate-spin' : ''}`} />
                {reanalysing ? 'Analysing...' : 'Analyse My Profile'}
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

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

function MonthAutomation({ profile, posts }: { profile: UserProfile | null; posts: Post[] }) {
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<{ postsGenerated: number; monthName: string; nextPostDate: string | null } | null>(null)
  const [error, setError] = useState('')

  const monthName = new Date().toLocaleDateString('en-IN', { month: 'long' })
  const postsLimit = profile?.posts_limit || 12
  const plan = profile?.plan || 'starter'
  const controlPreference = (profile as Record<string, unknown>)?.control_preference as string || 'approve'
  const hasApprovalMode = controlPreference === 'approve'
  const scheduledPosts = posts.filter(p => p.status === 'scheduled' || p.status === 'pending_approval')
  const pendingApproval = posts.filter(p => p.status === 'pending_approval')
  const nextPost = scheduledPosts.sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime())[0]

  // Steps completion
  const step1Done = posts.length > 0
  const step2Done = !hasApprovalMode || pendingApproval.length === 0
  const step3Done = false // image brief — approximate
  const allDone = step1Done && step2Done

  const stepsCompleted = [step1Done, step2Done].filter(Boolean).length
  const totalSteps = hasApprovalMode ? 3 : 2

  async function handleGenerate() {
    setGenerating(true); setError(''); setResult(null)
    try {
      const res = await fetch('/api/posts/generate-batch', { method: 'POST' })
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      setResult({ postsGenerated: data.postsGenerated, monthName: data.monthName, nextPostDate: data.nextPostDate })
      toast.success(`${data.postsGenerated} posts generated for ${data.monthName}!`)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  if (allDone && nextPost) {
    return (
      <Card className="border-emerald-200 bg-emerald-50 shadow-sm">
        <CardContent className="pt-5">
          <div className="flex items-center gap-2 text-emerald-700 font-semibold text-sm mb-1">
            <CheckCircle className="w-4 h-4" />
            You&apos;re all set for {monthName}!
          </div>
          <div className="text-[13px] text-emerald-600">
            PersonaLink will handle the rest. Next post: {new Date(nextPost.scheduled_at!).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-slate-100 shadow-sm">
      <CardHeader className="py-4 px-6 border-b border-slate-50 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-[14px] font-semibold text-slate-900">Set up this month in 5 minutes</CardTitle>
        <div className="text-[12px] text-slate-400 font-medium">{stepsCompleted}/{totalSteps} steps done</div>
      </CardHeader>
      <CardContent className="pt-5 pb-5">
        {/* Progress bar */}
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-5">
          <div className="h-full bg-[#0B458B] rounded-full transition-all duration-700" style={{ width: `${(stepsCompleted / totalSteps) * 100}%` }} />
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
            {error}
          </div>
        )}

        {result && (
          <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 rounded-xl">
            <div className="font-semibold text-sm text-green-700 mb-1">{result.postsGenerated} posts generated for {result.monthName}</div>
            {result.nextPostDate && <div className="text-[12px] text-green-600">Next post: {result.nextPostDate}</div>}
            <Link href="/dashboard/posts" className="text-[12px] font-semibold text-green-700 flex items-center gap-1 mt-2 hover:underline">
              View all posts <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        )}

        <div className="flex flex-col gap-4">
          {/* Step 1 */}
          <div className="flex items-start gap-3">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5 ${step1Done ? 'bg-emerald-500 text-white' : 'bg-[#0B458B] text-white'}`}>
              {step1Done ? '✓' : '1'}
            </div>
            <div className="flex-1">
              <div className="text-[13px] font-semibold text-slate-800 mb-1.5">Generate your posts</div>
              {!step1Done && (
                <Button
                  onClick={handleGenerate}
                  disabled={generating}
                  size="sm"
                  className="h-8 text-[12px] gap-1.5"
                >
                  {generating
                    ? <><RefreshCw className="w-3 h-3 animate-spin" /> Generating...</>
                    : <><Sparkles className="w-3 h-3" /> Generate {postsLimit} posts for {monthName} →</>
                  }
                </Button>
              )}
              {step1Done && <div className="text-[12px] text-emerald-600 font-medium">{posts.length} posts ready</div>}
            </div>
          </div>

          {/* Step 2 — only shown in approval mode */}
          {hasApprovalMode && (
            <div className="flex items-start gap-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5 ${step2Done ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                {step2Done ? '✓' : '2'}
              </div>
              <div className="flex-1">
                <div className="text-[13px] font-semibold text-slate-800 mb-1.5">Review &amp; approve</div>
                {pendingApproval.length > 0 && (
                  <Link href="/dashboard/posts">
                    <Button variant="outline" size="sm" className="h-8 text-[12px] gap-1.5 border-amber-300 text-amber-600 hover:bg-amber-50">
                      Review {pendingApproval.length} pending posts →
                    </Button>
                  </Link>
                )}
                {step2Done && <div className="text-[12px] text-emerald-600 font-medium">All posts approved</div>}
              </div>
            </div>
          )}

          {/* Step 3 — images */}
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5 bg-slate-200 text-slate-500">
              {hasApprovalMode ? '3' : '2'}
            </div>
            <div className="flex-1">
              <div className="text-[13px] font-semibold text-slate-800 mb-1.5">Upload your monthly images</div>
              <Link href="/dashboard/generate#images">
                <Button variant="outline" size="sm" className="h-8 text-[12px] gap-1.5 border-slate-200">
                  <ImageIcon className="w-3 h-3" /> View image brief →
                </Button>
              </Link>
            </div>
          </div>

          {/* Final state */}
          {nextPost && (
            <div className="mt-1 px-4 py-3 bg-[#0B458B]/5 rounded-xl border border-[#0B458B]/10">
              <div className="text-[12px] font-semibold text-[#0B458B]">
                Next post: {new Date(nextPost.scheduled_at!).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
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
  const [profileAnalysis, setProfileAnalysis] = useState<ProfileAnalysis | null>(null)
  const [reanalysing, setReanalysing] = useState(false)
  const [analyseError, setAnalyseError] = useState('')

  useEffect(() => {
    if (upgraded) toast.success('Subscription activated! Welcome to the plan.')
  }, [])

  useEffect(() => {
    async function load() {
      const meRes = await fetch('/api/me')
      if (!meRes.ok) { window.location.href = '/'; return }
      const { user: u, profile: p } = await meRes.json()
      setUser(u); setProfile(p)

      const [postsRes, scoreRes, suggestionsRes, analysisRes] = await Promise.all([
        supabase.from('posts').select('*').eq('user_id', u.id).order('created_at', { ascending: false }).limit(10),
        supabase.from('linkedin_scores').select('*').eq('user_id', u.id).order('recorded_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('post_suggestions').select('*').eq('user_id', u.id).eq('status', 'pending').order('created_at', { ascending: false }).limit(3),
        supabase.from('profile_analyses').select('*').eq('user_id', u.id).order('analysed_at', { ascending: false }).limit(1).maybeSingle(),
      ])
      setPosts(postsRes.data || [])
      setScore(scoreRes.data)
      setSuggestions(suggestionsRes.data || [])
      setProfileAnalysis(analysisRes.data || null)
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

  async function handleReanalyse() {
    setReanalysing(true); setAnalyseError('')
    try {
      const res = await fetch('/api/profile/analyse', { method: 'POST' })
      const data = await res.json()
      if (data.error) {
        setAnalyseError(data.error)
        toast.error('Analysis failed: ' + data.error)
      } else {
        setProfileAnalysis({ ...data, analysed_at: new Date().toISOString() })
        toast.success('Profile analysed! Score: ' + data.score + '/100')
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Network error'
      setAnalyseError(msg)
    } finally {
      setReanalysing(false)
    }
  }

  const scheduledPosts = posts.filter(p => p.status === 'scheduled')
  const nextPost = scheduledPosts.sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime())[0]
  const postsUsed = profile?.posts_used_this_month || 0
  const postsLimit = profile?.posts_limit || 12
  const planLabel = profile?.plan ? profile.plan.charAt(0).toUpperCase() + profile.plan.slice(1) : 'Starter'
  const firstName = user.linkedin_name?.split(' ')[0] || 'there'
  const usagePct = Math.min((postsUsed / postsLimit) * 100, 100)

  return (
    <div className="flex xl:gap-0">
    <div className="p-4 md:p-7 flex-1 max-w-[1000px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1 tracking-tight">
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
        <Card className="border-slate-100 shadow-sm hover:shadow-md transition-shadow card-hover">
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
        <Card className="border-slate-100 shadow-sm hover:shadow-md transition-shadow card-hover">
          <CardContent className="pt-5">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Posts This Month</div>
            <div className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">
              {postsUsed}<span className="text-base font-medium text-slate-300">/{postsLimit}</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-1.5">
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${usagePct}%`, background: postsUsed >= postsLimit ? '#ef4444' : '#0A66C2' }} />
            </div>
            <div className="text-[11px] text-slate-400">{planLabel} · {postsLimit - postsUsed} remaining</div>
          </CardContent>
        </Card>

        {/* Next post */}
        <Card className="border-slate-100 shadow-sm hover:shadow-md transition-shadow card-hover">
          <CardContent className="pt-5">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Next Scheduled</div>
            {nextPost ? (
              <>
                <p className="text-[13px] text-slate-600 leading-relaxed line-clamp-3 mb-2">{nextPost.content}</p>
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
        <Card className="border-slate-100 shadow-sm hover:shadow-md transition-shadow card-hover">
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

      <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr] gap-4 md:gap-5 mb-5">
        {/* Recent posts */}
        <Card className="overflow-hidden border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="py-4 px-6 border-b border-slate-50 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base font-semibold text-gray-800">Recent Posts</CardTitle>
            <Link href="/dashboard/posts" className="text-[13px] text-brand font-semibold flex items-center gap-1 hover:gap-1.5 transition-all">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          {posts.length === 0 ? (
            <CardContent className="py-14 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-4">
                <FileText className="w-6 h-6 text-slate-300" strokeWidth={1.5} />
              </div>
              <div className="font-semibold text-gray-800 mb-1.5">No posts yet</div>
              <div className="text-sm text-slate-400 leading-relaxed mb-5">Generate your first AI post and start growing</div>
              <Button render={<Link href="/dashboard/generate" />} size="sm" className="gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Generate Now
              </Button>
            </CardContent>
          ) : (
            <div>
              {posts.slice(0, 5).map(post => (
                <div key={post.id} className="px-6 py-4 border-b border-slate-50 last:border-0 flex gap-3.5 items-start hover:bg-slate-50/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">{post.content}</p>
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
        <Card className="overflow-hidden border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="py-4 px-6 border-b border-slate-50 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base font-semibold text-gray-800">Trending Ideas</CardTitle>
            <Link href="/dashboard/suggestions" className="text-[13px] text-brand font-semibold flex items-center gap-1 hover:gap-1.5 transition-all">
              See all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </CardHeader>
          {suggestions.length === 0 ? (
            <CardContent className="py-14 text-center">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
                <Lightbulb className="w-6 h-6 text-amber-400" strokeWidth={1.5} />
              </div>
              <div className="font-semibold text-gray-800 mb-1">Generating ideas...</div>
              <div className="text-sm text-slate-400 leading-relaxed mb-4">Fresh ideas based on your industry</div>
              <Link href="/dashboard/suggestions" className="text-[13px] text-brand font-semibold flex items-center justify-center gap-1">
                View suggestions <ArrowRight className="w-3 h-3" />
              </Link>
            </CardContent>
          ) : (
            <div>
              {suggestions.map(s => (
                <div key={s.id} className="px-5 py-4 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                  <p className="text-sm text-gray-600 leading-relaxed mb-2.5 line-clamp-2">{s.suggestion_text}</p>
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

      {/* Month Automation */}
      <MonthAutomation profile={profile} posts={posts} />
    </div>

    {/* Right panel */}
    <div className="hidden xl:block w-72 pt-7 pr-6 shrink-0">
      <RoadmapPanel
        profile={profile}
        posts={posts}
        analysis={profileAnalysis}
        onReanalyse={handleReanalyse}
        reanalysing={reanalysing}
        analyseError={analyseError}
      />
    </div>
  </div>
  )
}

export default function DashboardPage() {
  return <Suspense><DashboardContent /></Suspense>
}

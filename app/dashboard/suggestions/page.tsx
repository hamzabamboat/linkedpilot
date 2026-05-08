'use client'

import { useState, useEffect } from 'react'
import { supabase, PostSuggestion, Post } from '@/lib/supabase'
import Link from 'next/link'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  RefreshCw,
  Flame,
  TrendingUp,
  BookOpen,
  Repeat2,
  Lightbulb,
  X,
  ArrowRight,
  Zap,
  Lock,
  ThumbsUp,
  Eye,
  Loader2,
} from 'lucide-react'

type SuggestionTab = 'trending' | 'history' | 'stories' | 'repurpose'

export default function SuggestionsPage() {
  const [tab, setTab] = useState<SuggestionTab>('trending')
  const [suggestions, setSuggestions] = useState<PostSuggestion[]>([])
  const [topPosts, setTopPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [repurposedPost, setRepurposedPost] = useState<Post | null>(null)
  const [repurposed, setRepurposed] = useState<string[]>([])
  const [repurposing, setRepurposing] = useState(false)
  const [plan, setPlan] = useState('starter')
  const [userId, setUserId] = useState<string | null>(null)
  const [ideasAge, setIdeasAge] = useState<string | null>(null)
  const [ideasFresh, setIdeasFresh] = useState(true)

  useEffect(() => {
    async function load() {
      const meRes = await fetch('/api/me')
      const { user, profile } = await meRes.json()
      if (!user) { window.location.href = '/'; return }
      setPlan(profile?.plan || 'starter')
      setUserId(user.id)
      const [suggestionsRes, postsRes] = await Promise.all([
        supabase.from('post_suggestions').select('*').eq('user_id', user.id).eq('status', 'pending').order('created_at', { ascending: false }),
        supabase.from('posts').select('*').eq('user_id', user.id).eq('status', 'published').order('reactions', { ascending: false }).limit(10),
      ])
      const data = suggestionsRes.data || []
      setSuggestions(data)
      setTopPosts(postsRes.data || [])

      // Compute age of most recent idea
      if (data.length > 0) {
        const newest = new Date(data[0].created_at)
        const hoursDiff = (Date.now() - newest.getTime()) / (1000 * 60 * 60)
        const fresh = hoursDiff < 6
        setIdeasFresh(fresh)
        if (hoursDiff < 1) setIdeasAge('just now')
        else if (hoursDiff < 24) setIdeasAge(`${Math.floor(hoursDiff)} hours ago`)
        else setIdeasAge(`${Math.floor(hoursDiff / 24)} days ago`)

        // Auto-refresh in background if older than 6 hours — don't clear existing ideas
        if (!fresh) {
          fetch('/api/suggestions/refresh', { method: 'POST' })
            .then(r => r.json())
            .then(async () => {
              const { data: fresh } = await supabase.from('post_suggestions').select('*').eq('user_id', user.id).eq('status', 'pending').order('created_at', { ascending: false })
              if (fresh && fresh.length > 0) {
                setSuggestions(fresh)
                setIdeasAge('just now')
                setIdeasFresh(true)
              }
            })
            .catch(() => {})
        }
      }

      setLoading(false)
    }
    load()
  }, [])

  async function refreshSuggestions() {
    setGenerating(true)
    const res = await fetch('/api/suggestions/refresh', { method: 'POST' })
    const data = await res.json()
    if (data.error) { toast.error('Error refreshing: ' + data.error); setGenerating(false); return }
    if (!userId) { setGenerating(false); return }
    const { data: newSuggestions } = await supabase.from('post_suggestions').select('*').eq('user_id', userId).eq('status', 'pending').order('created_at', { ascending: false })
    setSuggestions(newSuggestions || [])
    setIdeasAge('just now')
    setIdeasFresh(true)
    setGenerating(false)
    toast.success('Fresh ideas generated!')
  }

  async function dismissSuggestion(id: string) {
    await supabase.from('post_suggestions').update({ status: 'dismissed' }).eq('id', id)
    setSuggestions(s => s.filter(x => x.id !== id))
  }

  async function repurposePost(post: Post) {
    setRepurposedPost(post)
    setRepurposing(true)
    const res = await fetch('/api/posts/repurpose', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ postId: post.id }) })
    const data = await res.json()
    setRepurposing(false)
    if (data.error) { toast.error('Error: ' + data.error); return }
    setRepurposed(data.angles || [])
  }

  const bySource = {
    trending: suggestions.filter(s => ['news', 'trends'].includes(s.source)),
    history: suggestions.filter(s => s.source === 'history'),
    stories: suggestions.filter(s => s.source === 'story_bank'),
  }

  if (loading) {
    return (
      <div className="p-4 md:p-8">
        <div className="h-8 w-56 bg-slate-200 rounded-lg animate-pulse mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-slate-200 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const currentSuggestions = tab === 'trending' ? bySource.trending : tab === 'history' ? bySource.history : bySource.stories

  const emptyIcons = {
    trending: Flame,
    history: TrendingUp,
    stories: BookOpen,
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-5 md:mb-7">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-1 tracking-tight">Post Ideas</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-slate-400 text-sm font-medium">Fresh ideas tailored to your industry and voice</p>
            {ideasAge && (
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${ideasFresh ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-amber-50 text-amber-600 border border-amber-200'}`}>
                {ideasFresh ? '● ' : '⚠ '}{generating ? 'Refreshing...' : `Generated ${ideasAge}`}
              </span>
            )}
          </div>
        </div>
        <Button variant="outline" onClick={refreshSuggestions} disabled={generating} size="sm" className="gap-1.5 border-slate-200 w-full sm:w-auto">
          <RefreshCw className={`size-3.5 ${generating ? 'animate-spin' : ''}`} />
          {generating ? 'Generating...' : 'Refresh Ideas'}
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as SuggestionTab)}>
        <TabsList className="mb-6 h-10 gap-1 p-1">
          <TabsTrigger value="trending" className="gap-1.5 text-[13px]">
            <Flame className="w-3.5 h-3.5" />
            Trending
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5 text-[13px]">
            <TrendingUp className="w-3.5 h-3.5" />
            Your History
          </TabsTrigger>
          <TabsTrigger value="stories" className="gap-1.5 text-[13px]">
            <BookOpen className="w-3.5 h-3.5" />
            Story Bank
          </TabsTrigger>
          <TabsTrigger value="repurpose" className="gap-1.5 text-[13px]" disabled={plan === 'starter'}>
            <Repeat2 className="w-3.5 h-3.5" />
            Repurpose
            {plan === 'starter' && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-brand-light text-brand ml-0.5">PRO</Badge>}
          </TabsTrigger>
        </TabsList>

        {(['trending', 'history', 'stories'] as SuggestionTab[]).map(tabId => (
          <TabsContent key={tabId} value={tabId}>
            {currentSuggestions.length === 0 ? (
              <Card className="border-slate-100 shadow-sm">
                <CardContent className="py-16 text-center">
                  {(() => {
                    const Icon = emptyIcons[tabId as keyof typeof emptyIcons]
                    return (
                      <>
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
                          <Icon className="w-6 h-6 text-amber-400" strokeWidth={1.5} />
                        </div>
                        <div className="font-semibold text-slate-700 mb-1.5">No suggestions yet</div>
                        <div className="text-sm text-slate-400 mb-6">
                          Click &quot;Refresh Ideas&quot; to generate fresh post ideas for your industry.
                        </div>
                        <Button onClick={refreshSuggestions} disabled={generating} className="gap-1.5">
                          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lightbulb className="w-4 h-4" />}
                          Generate Ideas Now
                        </Button>
                      </>
                    )
                  })()}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
                {currentSuggestions.map(s => (
                  <div key={s.id} className="border border-slate-200 rounded-xl p-4 hover:border-brand hover:shadow-md transition-all cursor-pointer bg-white flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-brand bg-brand-light px-2 py-1 rounded-full capitalize">
                        {s.source || 'General'}
                      </span>
                      <button
                        onClick={() => dismissSuggestion(s.id)}
                        className="text-slate-300 hover:text-slate-500 transition-colors"
                        title="Dismiss"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="font-semibold text-slate-900 mb-2 text-sm leading-snug flex-1">{s.suggestion_text}</p>
                    {s.why_it_works && (
                      <p className="text-slate-500 text-xs mb-3 leading-relaxed line-clamp-2">{s.why_it_works}</p>
                    )}
                    {s.hashtags && s.hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {s.hashtags.slice(0, 3).map(h => (
                          <span key={h} className="text-[11px] text-brand bg-brand-light px-1.5 py-0.5 rounded">#{h}</span>
                        ))}
                      </div>
                    )}
                    <Button
                      render={<Link href={`/dashboard/generate?idea=${encodeURIComponent(s.suggestion_text)}`} />}
                      size="sm"
                      className="w-full text-sm mt-auto"
                    >
                      Generate this post →
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        ))}

        <TabsContent value="repurpose">
          {plan === 'starter' ? (
            <Card className="border-slate-100 shadow-sm">
              <CardContent className="py-16 text-center">
                <div className="relative inline-block mb-5">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto">
                    <Repeat2 className="w-8 h-8 text-slate-300" strokeWidth={1.5} />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center shadow-sm">
                    <Lock className="w-3 h-3 text-white" strokeWidth={2.5} />
                  </div>
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-3">Repurpose Engine is a Pro feature</h2>
                <p className="text-slate-500 text-sm mb-7 max-w-sm mx-auto">Turn your best post into 3 new angles. Maximum reach, minimum effort.</p>
                <Button render={<Link href="/dashboard/settings?tab=plan" />} className="gap-1.5">
                  <Zap className="w-4 h-4" />
                  Upgrade to Pro
                </Button>
              </CardContent>
            </Card>
          ) : !repurposedPost ? (
            <div>
              <div className="text-[13px] font-bold text-slate-700 mb-4 flex items-center gap-2">
                <Repeat2 className="w-4 h-4 text-slate-400" />
                Pick a post to repurpose:
              </div>
              {topPosts.length === 0 ? (
                <Card className="border-slate-100 shadow-sm">
                  <CardContent className="py-12 text-center">
                    <Repeat2 className="w-8 h-8 text-slate-200 mx-auto mb-3" strokeWidth={1.5} />
                    <div className="text-sm text-slate-400">No published posts yet. Publish some posts first!</div>
                  </CardContent>
                </Card>
              ) : (
                <div className="flex flex-col gap-3">
                  {topPosts.map(post => (
                    <Card
                      key={post.id}
                      className="border-slate-100 shadow-sm card-hover cursor-pointer group"
                      onClick={() => repurposePost(post)}
                    >
                      <CardContent className="pt-4 pb-4">
                        <p className="text-sm text-slate-600 leading-relaxed mb-2.5 overflow-hidden" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{post.content}</p>
                        <div className="flex gap-4 items-center">
                          <div className="flex gap-3">
                            {post.reactions != null && (
                              <span className="flex items-center gap-1 text-xs text-slate-400">
                                <ThumbsUp className="w-3 h-3" /> {post.reactions}
                              </span>
                            )}
                            {post.impressions != null && (
                              <span className="flex items-center gap-1 text-xs text-slate-400">
                                <Eye className="w-3 h-3" /> {post.impressions?.toLocaleString()}
                              </span>
                            )}
                          </div>
                          <div className="ml-auto flex items-center gap-1 text-xs text-brand font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                            <Repeat2 className="w-3 h-3" /> Repurpose
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              <Button variant="ghost" size="sm" onClick={() => { setRepurposedPost(null); setRepurposed([]) }} className="mb-5 -ml-2 text-slate-500 gap-1.5">
                ← Pick a different post
              </Button>
              {repurposing ? (
                <Card className="border-slate-100 shadow-sm">
                  <CardContent className="py-14 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-pro/10 flex items-center justify-center mx-auto mb-4">
                      <Repeat2 className="w-6 h-6 text-pro animate-spin" strokeWidth={1.5} />
                    </div>
                    <div className="text-sm text-slate-500 font-medium">Generating 3 new angles...</div>
                  </CardContent>
                </Card>
              ) : (
                <div className="flex flex-col gap-4">
                  {repurposed.map((angle, i) => (
                    <Card key={i} className="border-slate-100 shadow-sm card-hover">
                      <CardContent className="pt-5 pb-5">
                        <div className="text-[11px] font-bold text-brand uppercase tracking-wider mb-3">Angle {i + 1}</div>
                        <p className="text-sm text-slate-600 leading-relaxed mb-4 whitespace-pre-wrap">{angle}</p>
                        <Button
                          render={<Link href={`/dashboard/generate?idea=${encodeURIComponent(angle.slice(0, 100))}`} />}
                          size="sm" variant="outline"
                          className="gap-1.5 border-slate-200"
                        >
                          Use this angle <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

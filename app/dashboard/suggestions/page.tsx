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

  useEffect(() => {
    async function load() {
      const meRes = await fetch('/api/me')
      const { user, profile } = await meRes.json()
      if (!user) { window.location.href = '/'; return }
      setPlan(profile?.plan || 'starter')
      const [suggestionsRes, postsRes] = await Promise.all([
        supabase.from('post_suggestions').select('*').eq('user_id', user.id).eq('status', 'pending').order('created_at', { ascending: false }),
        supabase.from('posts').select('*').eq('user_id', user.id).eq('status', 'published').order('reactions', { ascending: false }).limit(10),
      ])
      setSuggestions(suggestionsRes.data || [])
      setTopPosts(postsRes.data || [])
      setLoading(false)
    }
    load()
  }, [])

  async function refreshSuggestions() {
    setGenerating(true)
    const res = await fetch('/api/suggestions/refresh', { method: 'POST' })
    const data = await res.json()
    if (data.error) { toast.error('Error refreshing: ' + data.error); setGenerating(false); return }
    const meRes = await fetch('/api/me')
    const { user } = await meRes.json()
    const { data: newSuggestions } = await supabase.from('post_suggestions').select('*').eq('user_id', user.id).eq('status', 'pending').order('created_at', { ascending: false })
    setSuggestions(newSuggestions || [])
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
      <div className="p-8">
        <div className="skeleton h-8 w-56 mb-6 rounded" />
        {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-36 rounded-xl mb-3" />)}
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
    <div className="p-4 md:p-8 max-w-3xl">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-5 md:mb-7">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-1 tracking-tight">Post Ideas</h1>
          <p className="text-slate-400 text-sm font-medium">Fresh ideas tailored to your industry and voice</p>
        </div>
        <Button variant="outline" onClick={refreshSuggestions} disabled={generating} size="sm" className="gap-1.5 border-slate-200 w-full sm:w-auto">
          <RefreshCw className={`size-3.5 ${generating ? 'animate-spin' : ''}`} />
          {generating ? 'Refreshing...' : 'Refresh Ideas'}
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
              <div className="flex flex-col gap-3">
                {currentSuggestions.map(s => (
                  <Card key={s.id} className="border-slate-100 shadow-sm card-hover">
                    <CardContent className="pt-5 pb-5">
                      <div className="flex gap-2 mb-3 flex-wrap items-center">
                        <Badge variant="secondary" className="text-[11px] font-medium capitalize">{s.source}</Badge>
                        {s.hashtags?.slice(0, 3).map(h => (
                          <Badge key={h} variant="outline" className="text-[11px] text-brand border-brand/20 bg-brand-light">#{h}</Badge>
                        ))}
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed font-medium mb-3">{s.suggestion_text}</p>
                      {s.why_it_works && (
                        <details className="mb-4 group">
                          <summary className="text-xs text-slate-400 cursor-pointer font-semibold hover:text-slate-600 transition-colors list-none flex items-center gap-1">
                            <span className="group-open:rotate-90 transition-transform inline-block">›</span>
                            Why this works
                          </summary>
                          <p className="mt-2 text-xs text-slate-400 leading-relaxed pl-3 border-l-2 border-slate-100">{s.why_it_works}</p>
                        </details>
                      )}
                      <div className="flex gap-2">
                        <Button render={<Link href={`/dashboard/generate?idea=${encodeURIComponent(s.suggestion_text)}`} />} size="sm" className="gap-1.5">
                          Generate Post <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => dismissSuggestion(s.id)} className="border-slate-200 gap-1.5 text-slate-500 hover:text-slate-700">
                          <X className="w-3.5 h-3.5" />
                          Dismiss
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
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

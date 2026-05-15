'use client'

import { useState, useEffect } from 'react'
import { supabase, PostSuggestion, Post } from '@/lib/supabase'
import Link from 'next/link'

function formatAge(createdAt: string): { label: string; fresh: boolean } {
  const ms = Date.now() - new Date(createdAt).getTime()
  const minutes = ms / (1000 * 60)
  const hours = ms / (1000 * 60 * 60)
  const days = ms / (1000 * 60 * 60 * 24)
  if (minutes < 2) return { label: 'just now', fresh: true }
  if (hours < 1) return { label: `${Math.floor(minutes)}m ago`, fresh: true }
  if (hours < 6) return { label: `${Math.floor(hours)}h ago`, fresh: true }
  if (hours < 24) return { label: `${Math.floor(hours)} hours ago`, fresh: false }
  return { label: `${Math.floor(days)} day${Math.floor(days) !== 1 ? 's' : ''} ago`, fresh: false }
}

import { toast } from 'sonner'
import {
  RefreshCw, Flame, TrendingUp, BookOpen, Repeat2, Lightbulb, X,
  ArrowRight, Zap, Lock, ThumbsUp, Eye,
} from 'lucide-react'

type SuggestionTab = 'trending' | 'history' | 'stories' | 'repurpose'

const SOURCE_LABEL: Record<string, string> = {
  news: 'Trending', trends: 'Trending', history: 'Your History', story_bank: 'Story Bank',
}

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

  function applySuggestions(data: PostSuggestion[], lastGeneratedAt?: string | null) {
    setSuggestions(data)
    const ts = lastGeneratedAt || (data.length > 0 ? data[0].created_at : null)
    if (ts) { const { label, fresh } = formatAge(ts); setIdeasAge(label); setIdeasFresh(fresh) }
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const meRes = await fetch('/api/me')
        const { user, profile } = await meRes.json()
        if (!user) { window.location.href = '/'; return }
        if (cancelled) return
        setPlan(profile?.plan || 'starter')
        setUserId(user.id)
        const [suggestionsRes, postsRes] = await Promise.all([
          fetch('/api/suggestions/refresh'),
          supabase.from('posts').select('*').eq('user_id', user.id).eq('status', 'published').order('reactions', { ascending: false }).limit(10),
        ])
        if (cancelled) return
        const suggestionsData = await suggestionsRes.json()
        const data: PostSuggestion[] = suggestionsData.suggestions || []
        applySuggestions(data, suggestionsData.last_generated_at)
        setTopPosts(postsRes.data || [])
        if (data.length > 0) {
          const hoursDiff = (Date.now() - new Date(data[0].created_at).getTime()) / (1000 * 60 * 60)
          if (hoursDiff >= 6) {
            fetch('/api/suggestions/refresh', { method: 'POST' }).then(r => r.json()).then(d => {
              if (!cancelled && d.suggestions?.length > 0) applySuggestions(d.suggestions, d.last_generated_at)
            }).catch(() => {})
          }
        }
      } catch { /* non-fatal */ } finally { if (!cancelled) setLoading(false) }
    }
    load()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function refreshSuggestions() {
    setGenerating(true)
    const res = await fetch('/api/suggestions/refresh', { method: 'POST' })
    const data = await res.json()
    setGenerating(false)
    if (data.error) { toast.error('Error refreshing: ' + data.error); return }
    if (data.suggestions?.length > 0) { applySuggestions(data.suggestions, data.last_generated_at); toast.success('Fresh ideas generated!') }
    else toast.error(data.error || 'No ideas were generated. Please try again.')
  }

  async function dismissSuggestion(id: string) {
    setSuggestions(s => s.filter(x => x.id !== id))
    fetch('/api/suggestions/dismiss', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }).catch(() => {})
  }

  async function repurposePost(post: Post) {
    setRepurposedPost(post); setRepurposing(true)
    const res = await fetch('/api/posts/repurpose', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ postId: post.id }) })
    const data = await res.json(); setRepurposing(false)
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
      <div className="p-4 md:p-7 w-full">
        <div className="h-8 w-56 rounded-lg animate-pulse mb-6" style={{ background: 'var(--surface-2)' }} />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-48 rounded-2xl animate-pulse" style={{ background: 'var(--surface-2)' }} />)}
        </div>
      </div>
    )
  }

  const tabs: { id: SuggestionTab; label: string; icon: React.ElementType; count?: number; locked?: boolean }[] = [
    { id: 'trending', label: 'Trending', icon: Flame, count: bySource.trending.length },
    { id: 'history', label: 'Your History', icon: TrendingUp, count: bySource.history.length },
    { id: 'stories', label: 'Story Bank', icon: BookOpen, count: bySource.stories.length },
    { id: 'repurpose', label: 'Repurpose', icon: Repeat2, locked: plan === 'starter' },
  ]

  const currentSuggestions = tab === 'trending' ? bySource.trending : tab === 'history' ? bySource.history : bySource.stories

  return (
    <div className="p-4 md:p-7 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-6">
        <div>
          <h1 style={{ fontFamily: 'var(--f-sans)', fontWeight: 600, fontSize: 22, color: 'var(--ink)', letterSpacing: '-0.025em', marginBottom: 4 }}>
            Trending Ideas
          </h1>
          <div className="flex items-center gap-2 flex-wrap">
            <p style={{ fontSize: 13, color: 'var(--ink-4)' }}>Fresh ideas tailored to your industry and voice</p>
            {ideasAge && (
              <span style={{
                fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 'var(--r-full)',
                background: ideasFresh ? '#059669' + '18' : '#f59e0b' + '18',
                color: ideasFresh ? '#059669' : '#d97706',
                border: '1px solid ' + (ideasFresh ? '#059669' + '30' : '#f59e0b' + '30'),
              }}>
                {generating ? 'Refreshing…' : `Generated ${ideasAge}`}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={refreshSuggestions}
          disabled={generating}
          className="flex items-center gap-1.5 transition-all hover:opacity-80 w-full sm:w-auto justify-center sm:justify-start"
          style={{
            border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', padding: '7px 14px',
            fontSize: 13, fontWeight: 500, color: 'var(--ink-2)', background: 'var(--surface)',
            opacity: generating ? 0.6 : 1,
          }}
        >
          <RefreshCw className={`size-3.5 ${generating ? 'animate-spin' : ''}`} />
          {generating ? 'Generating…' : 'Refresh Ideas'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 overflow-x-auto" style={{ background: 'var(--surface-2)', borderRadius: 'var(--r-md)', width: 'fit-content' }}>
        {tabs.map(t => {
          const Icon = t.icon
          const active = tab === t.id
          return (
            <button
              key={t.id}
              onClick={() => { if (!t.locked) setTab(t.id) }}
              className="flex items-center gap-1.5 transition-all whitespace-nowrap"
              style={{
                padding: '6px 12px', borderRadius: 'var(--r-sm)', fontSize: 13, fontWeight: 500,
                background: active ? 'var(--surface)' : 'transparent',
                color: active ? 'var(--ink)' : t.locked ? 'var(--ink-4)' : 'var(--ink-3)',
                boxShadow: active ? 'var(--sh-1)' : 'none',
                cursor: t.locked ? 'not-allowed' : 'pointer',
                opacity: t.locked ? 0.6 : 1,
              }}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
              {t.locked && <Lock className="w-3 h-3 ml-0.5" style={{ color: '#f59e0b' }} />}
              {t.count !== undefined && t.count > 0 && (
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 'var(--r-full)',
                  background: active ? 'var(--pl-accent)' : 'var(--surface-3)', color: active ? '#fff' : 'var(--ink-3)',
                }}>
                  {t.count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Trending / History / Stories tab content */}
      {tab !== 'repurpose' && (
        currentSuggestions.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
            <div className="flex items-center justify-center mb-4"
              style={{ width: 48, height: 48, borderRadius: 'var(--r-md)', background: 'var(--surface-2)', border: '1px solid var(--line)' }}>
              {tab === 'trending' ? <Flame className="w-5 h-5" style={{ color: 'var(--ink-4)' }} strokeWidth={1.5} />
                : tab === 'history' ? <TrendingUp className="w-5 h-5" style={{ color: 'var(--ink-4)' }} strokeWidth={1.5} />
                : <BookOpen className="w-5 h-5" style={{ color: 'var(--ink-4)' }} strokeWidth={1.5} />}
            </div>
            <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--ink)', marginBottom: 6 }}>No suggestions yet</div>
            <div style={{ fontSize: 13, color: 'var(--ink-4)', marginBottom: 16 }}>Click &ldquo;Refresh Ideas&rdquo; to generate fresh post ideas.</div>
            <button
              onClick={generating ? undefined : refreshSuggestions}
              disabled={generating}
              className="flex items-center gap-1.5 transition-opacity hover:opacity-80"
              style={{ background: 'var(--pl-accent)', color: '#fff', borderRadius: 'var(--r-sm)', padding: '8px 16px', fontSize: 13, fontWeight: 600 }}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {generating ? 'Generating…' : 'Generate Ideas Now'}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
            {currentSuggestions.map(s => (
              <div
                key={s.id}
                className="flex flex-col transition-all"
                style={{
                  background: 'var(--surface)', border: '1px solid var(--line)',
                  borderRadius: 'var(--r-lg)', padding: '14px 16px',
                }}
              >
                <div className="flex items-center justify-between mb-2.5">
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--r-full)',
                    textTransform: 'uppercase', letterSpacing: '0.07em',
                    background: 'var(--pl-accent-soft)', color: 'var(--pl-accent)',
                  }}>
                    {SOURCE_LABEL[s.source] || 'General'}
                  </span>
                  <button
                    onClick={() => dismissSuggestion(s.id)}
                    className="transition-opacity hover:opacity-60"
                    style={{ color: 'var(--ink-4)', padding: 2 }}
                    title="Dismiss"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink)', lineHeight: 1.5, flexGrow: 1, marginBottom: 8 }}>{s.suggestion_text}</p>
                {s.why_it_works && (
                  <p style={{ fontSize: 12, color: 'var(--ink-4)', lineHeight: 1.5, marginBottom: 10 }} className="line-clamp-2">{s.why_it_works}</p>
                )}
                {s.hashtags && s.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {s.hashtags.slice(0, 3).map(h => (
                      <span key={h} style={{ fontSize: 11, color: 'var(--pl-accent)', background: 'var(--pl-accent-soft)', borderRadius: 'var(--r-sm)', padding: '1px 6px' }}>
                        #{h}
                      </span>
                    ))}
                  </div>
                )}
                <Link
                  href={`/dashboard/generate?idea=${encodeURIComponent(s.suggestion_text)}`}
                  className="flex items-center justify-center gap-1.5 transition-opacity hover:opacity-80 mt-auto"
                  style={{
                    background: 'var(--pl-accent)', color: '#fff', borderRadius: 'var(--r-sm)',
                    padding: '7px 12px', fontSize: 13, fontWeight: 600,
                  }}
                >
                  <Lightbulb className="w-3.5 h-3.5" />
                  Use this idea
                </Link>
              </div>
            ))}
          </div>
        )
      )}

      {/* Repurpose tab */}
      {tab === 'repurpose' && (
        plan === 'starter' ? (
          <div className="flex flex-col items-center justify-center py-16 text-center"
            style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', background: 'var(--surface)' }}>
            <div className="relative inline-block mb-5">
              <div className="flex items-center justify-center"
                style={{ width: 56, height: 56, borderRadius: 'var(--r-md)', background: 'var(--surface-2)', border: '1px solid var(--line)' }}>
                <Repeat2 className="w-7 h-7" style={{ color: 'var(--ink-4)' }} strokeWidth={1.5} />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: '#f59e0b', boxShadow: 'var(--sh-1)' }}>
                <Lock className="w-3 h-3 text-white" strokeWidth={2.5} />
              </div>
            </div>
            <h2 style={{ fontWeight: 600, fontSize: 18, color: 'var(--ink)', marginBottom: 10 }}>Repurpose Engine is a Pro feature</h2>
            <p style={{ fontSize: 13, color: 'var(--ink-4)', marginBottom: 20, maxWidth: 320, lineHeight: 1.5 }}>
              Turn your best post into 3 new angles. Maximum reach, minimum effort.
            </p>
            <Link href="/dashboard/settings?tab=plan"
              className="flex items-center gap-1.5 transition-opacity hover:opacity-80"
              style={{ background: 'var(--pl-accent)', color: '#fff', borderRadius: 'var(--r-sm)', padding: '9px 18px', fontSize: 14, fontWeight: 600 }}>
              <Zap className="w-4 h-4" /> Upgrade to Pro
            </Link>
          </div>
        ) : !repurposedPost ? (
          <div>
            <div className="flex items-center gap-2 mb-4" style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-2)' }}>
              <Repeat2 className="w-4 h-4" style={{ color: 'var(--ink-4)' }} />
              Pick a post to repurpose:
            </div>
            {topPosts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center"
                style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', background: 'var(--surface)' }}>
                <Repeat2 className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--ink-4)' }} strokeWidth={1.5} />
                <div style={{ fontSize: 13, color: 'var(--ink-4)' }}>No published posts yet. Publish some posts first!</div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {topPosts.map(post => (
                  <div
                    key={post.id}
                    className="group cursor-pointer transition-all"
                    onClick={() => repurposePost(post)}
                    style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: '14px 16px', background: 'var(--surface)' }}
                  >
                    <p className="overflow-hidden mb-2" style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {post.content}
                    </p>
                    <div className="flex gap-4 items-center">
                      <div className="flex gap-3">
                        {post.reactions != null && (
                          <span className="flex items-center gap-1" style={{ fontSize: 12, color: 'var(--ink-4)' }}>
                            <ThumbsUp className="w-3 h-3" /> {post.reactions}
                          </span>
                        )}
                        {post.impressions != null && (
                          <span className="flex items-center gap-1" style={{ fontSize: 12, color: 'var(--ink-4)' }}>
                            <Eye className="w-3 h-3" /> {post.impressions?.toLocaleString()}
                          </span>
                        )}
                      </div>
                      <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ fontSize: 12, color: 'var(--pl-accent)', fontWeight: 600 }}>
                        <Repeat2 className="w-3 h-3" /> Repurpose
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            <button
              onClick={() => { setRepurposedPost(null); setRepurposed([]) }}
              className="flex items-center gap-1.5 mb-5 transition-opacity hover:opacity-70"
              style={{ fontSize: 13, color: 'var(--ink-4)' }}
            >
              ← Pick a different post
            </button>
            {repurposing ? (
              <div className="flex flex-col items-center justify-center py-14 text-center"
                style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', background: 'var(--surface)' }}>
                <div className="flex items-center justify-center mb-4"
                  style={{ width: 48, height: 48, borderRadius: 'var(--r-md)', background: 'var(--pl-accent-soft)' }}>
                  <Repeat2 className="w-6 h-6 animate-spin" style={{ color: 'var(--pl-accent)' }} strokeWidth={1.5} />
                </div>
                <div style={{ fontSize: 13, color: 'var(--ink-4)', fontWeight: 500 }}>Generating 3 new angles…</div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {repurposed.map((angle, i) => (
                  <div key={i} style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: '16px 18px', background: 'var(--surface)' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--pl-accent)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10, fontFamily: 'var(--f-mono)' }}>
                      // Angle {i + 1}
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6, marginBottom: 14, whiteSpace: 'pre-wrap' }}>{angle}</p>
                    <Link
                      href={`/dashboard/generate?idea=${encodeURIComponent(angle.slice(0, 100))}`}
                      className="flex items-center gap-1.5 transition-opacity hover:opacity-80"
                      style={{
                        border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', padding: '6px 12px',
                        fontSize: 13, fontWeight: 500, color: 'var(--ink-2)',
                      }}
                    >
                      Use this angle <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      )}
    </div>
  )
}

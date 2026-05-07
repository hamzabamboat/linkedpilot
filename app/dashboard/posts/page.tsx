'use client'

import { useState, useEffect, Suspense } from 'react'
import { supabase, Post } from '@/lib/supabase'
import Link from 'next/link'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Plus,
  Zap,
  List,
  Calendar,
  FileText,
  ThumbsUp,
  Eye,
  MessageCircle,
  Pencil,
  Trash2,
  Sparkles,
} from 'lucide-react'

const STATUS_COLOR: Record<string, string> = {
  draft: '#94a3b8', pending_approval: '#f59e0b', approved: '#10b981',
  scheduled: '#0A66C2', publishing: '#8b5cf6', published: '#059669', failed: '#ef4444', rejected: '#dc2626',
}
const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft', pending_approval: 'Awaiting Approval', approved: 'Approved',
  scheduled: 'Scheduled', publishing: 'Publishing', published: 'Published', failed: 'Failed', rejected: 'Rejected',
}

type ViewMode = 'list' | 'calendar'
type FilterStatus = 'all' | 'scheduled' | 'draft' | 'published'

function PostsContent() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<ViewMode>('list')
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [editingPost, setEditingPost] = useState<Post | null>(null)
  const [editContent, setEditContent] = useState('')
  const [editSchedule, setEditSchedule] = useState('')
  const [saving, setSaving] = useState(false)
  const [plan, setPlan] = useState('starter')

  useEffect(() => {
    async function load() {
      const meRes = await fetch('/api/me')
      const { user, profile } = await meRes.json()
      if (!user) { window.location.href = '/'; return }
      setPlan(profile?.plan || 'starter')
      const { data } = await supabase.from('posts').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      setPosts(data || [])
      setLoading(false)
    }
    load()
  }, [])

  async function deletePost(id: string) {
    if (!confirm('Delete this post?')) return
    await supabase.from('posts').delete().eq('id', id)
    setPosts(p => p.filter(x => x.id !== id))
    toast('Post deleted')
  }

  async function saveEdit() {
    if (!editingPost) return
    setSaving(true)
    const updates: Record<string, unknown> = { content: editContent, updated_at: new Date().toISOString() }
    if (editSchedule) updates.scheduled_at = editSchedule
    await supabase.from('posts').update(updates).eq('id', editingPost.id)
    setPosts(p => p.map(x => x.id === editingPost.id ? { ...x, ...updates as Partial<Post> } : x))
    setSaving(false)
    setEditingPost(null)
    toast.success('Post updated')
  }

  async function bulkGenerate() {
    toast('Bulk generating 30 days of posts...')
    const res = await fetch('/api/posts/bulk-generate', { method: 'POST' })
    const data = await res.json()
    if (data.error) { toast.error('Error: ' + data.error); return }
    const meRes = await fetch('/api/me')
    const { user } = await meRes.json()
    const { data: newPosts } = await supabase.from('posts').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    setPosts(newPosts || [])
    toast.success(`Generated ${data.count} posts for the next 30 days!`)
  }

  const filtered = posts.filter(p => {
    if (filter === 'all') return true
    if (filter === 'scheduled') return p.status === 'scheduled'
    if (filter === 'draft') return ['draft', 'pending_approval'].includes(p.status)
    if (filter === 'published') return p.status === 'published'
    return true
  })

  const byDate: Record<string, Post[]> = {}
  posts.filter(p => p.scheduled_at || p.published_at).forEach(p => {
    const d = new Date(p.scheduled_at || p.published_at!).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    if (!byDate[d]) byDate[d] = []
    byDate[d].push(p)
  })

  if (loading) {
    return (
      <div className="p-8">
        <div className="skeleton h-8 w-48 mb-6 rounded" />
        {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-24 rounded-xl mb-3" />)}
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl">
      <Dialog open={!!editingPost} onOpenChange={(open) => { if (!open) setEditingPost(null) }}>
        <DialogContent className="max-w-lg mx-4 md:mx-auto w-[calc(100vw-2rem)] md:w-full">
          <DialogHeader><DialogTitle className="text-base font-bold">Edit Post</DialogTitle></DialogHeader>
          <Textarea value={editContent} onChange={e => setEditContent(e.target.value)} className="h-48 resize-none text-[14px]" />
          <div className="space-y-2">
            <Label className="text-[13px] font-semibold">Reschedule <span className="text-slate-400 font-normal">(optional)</span></Label>
            <Input type="datetime-local" value={editSchedule} onChange={e => setEditSchedule(e.target.value)} min={new Date().toISOString().slice(0, 16)} />
          </div>
          <div className="flex gap-3 pt-1">
            <Button onClick={saveEdit} disabled={saving} className="flex-1">
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button variant="outline" onClick={() => setEditingPost(null)} className="border-slate-200">Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-5 md:mb-7">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-1 tracking-tight">My Posts</h1>
          <p className="text-slate-400 text-sm font-medium">{posts.length} posts total</p>
        </div>
        <div className="flex gap-2">
          {plan === 'pro' && (
            <Button onClick={bulkGenerate} size="sm" className="gap-1.5 bg-pro hover:bg-pro/90 text-white shadow-sm">
              <Zap className="size-3.5" />
              <span className="hidden sm:inline">Bulk Fill 30 Days</span>
              <span className="sm:hidden">Bulk Fill</span>
            </Button>
          )}
          <Button render={<Link href="/dashboard/generate" />} size="sm" className="gap-1.5 shadow-sm">
            <Plus className="size-3.5" />
            New Post
          </Button>
        </div>
      </div>

      <div className="flex gap-3 mb-6 items-center flex-wrap">
        <div className="flex gap-0.5 bg-slate-100 rounded-xl p-1">
          {(['list', 'calendar'] as ViewMode[]).map(v => (
            <Button key={v} size="sm" variant={view === v ? 'secondary' : 'ghost'} onClick={() => setView(v)}
              className={`h-7 text-xs px-3 gap-1.5 rounded-lg ${view === v ? 'bg-white shadow-sm text-slate-900 font-semibold' : 'text-slate-500 hover:text-slate-700'}`}>
              {v === 'list' ? <><List className="size-3" />List</> : <><Calendar className="size-3" />Calendar</>}
            </Button>
          ))}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {(['all', 'scheduled', 'draft', 'published'] as FilterStatus[]).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`h-7 text-xs rounded-full px-3.5 font-medium transition-all duration-150 border ${
                filter === f
                  ? 'bg-brand text-white border-brand shadow-sm'
                  : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700 bg-white'
              }`}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {view === 'list' && (
        <div className="flex flex-col gap-2.5">
          {filtered.length === 0 ? (
            <Card className="border-slate-100 shadow-sm">
              <CardContent className="py-16 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-6 h-6 text-slate-300" strokeWidth={1.5} />
                </div>
                <div className="font-semibold text-slate-700 mb-1.5">No posts found</div>
                <div className="text-[13px] text-slate-400 mb-5">
                  {filter !== 'all' ? `No ${filter} posts yet.` : 'Generate your first post to get started.'}
                </div>
                <Button render={<Link href="/dashboard/generate" />} size="sm" className="gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Generate a Post
                </Button>
              </CardContent>
            </Card>
          ) : filtered.map(post => (
            <Card key={post.id} className="border-slate-100 shadow-sm card-hover">
              <CardContent className="pt-4 pb-4 flex gap-4 items-start">
                <div className="flex-1 min-w-0">
                  <div className="flex gap-2 items-center mb-2.5 flex-wrap">
                    <Badge
                      className="text-[11px] rounded-full font-semibold px-2.5"
                      style={{ background: (STATUS_COLOR[post.status] || '#94a3b8') + '18', color: STATUS_COLOR[post.status] || '#94a3b8', border: 'none' }}
                    >
                      {STATUS_LABEL[post.status] || post.status}
                    </Badge>
                    {post.content_pillar && (
                      <Badge variant="secondary" className="text-[11px] font-medium">{post.content_pillar}</Badge>
                    )}
                    {post.scheduled_at && (
                      <span className="flex items-center gap-1 text-[11px] text-slate-400">
                        <Calendar className="w-3 h-3" />
                        {new Date(post.scheduled_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed overflow-hidden" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{post.content}</p>
                  {post.status === 'published' && (post.reactions != null || post.impressions != null) && (
                    <div className="flex gap-4 mt-2.5">
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
                      {post.comments != null && (
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          <MessageCircle className="w-3 h-3" /> {post.comments}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button size="sm" variant="outline" className="gap-1.5 border-slate-200 text-[13px] min-w-[36px]"
                    onClick={() => { setEditingPost(post); setEditContent(post.content); setEditSchedule(post.scheduled_at?.slice(0, 16) || '') }}>
                    <Pencil className="size-3.5" />
                    <span className="hidden sm:inline">Edit</span>
                  </Button>
                  <Button size="sm" variant="outline"
                    className="border-red-100 text-red-400 hover:bg-red-50 hover:text-red-600 hover:border-red-200 min-w-[36px]"
                    onClick={() => deletePost(post.id)}>
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {view === 'calendar' && (
        <div>
          {Object.keys(byDate).length === 0 ? (
            <Card className="border-slate-100 shadow-sm">
              <CardContent className="py-16 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-6 h-6 text-slate-300" strokeWidth={1.5} />
                </div>
                <div className="font-semibold text-slate-700 mb-1.5">No scheduled posts</div>
                <div className="text-sm text-slate-400">Schedule posts to see them in your calendar.</div>
              </CardContent>
            </Card>
          ) : Object.entries(byDate).map(([month, monthPosts]) => (
            <div key={month} className="mb-7">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">{month}</div>
              <div className="flex flex-col gap-2">
                {monthPosts.sort((a, b) => new Date(a.scheduled_at || a.published_at!).getTime() - new Date(b.scheduled_at || b.published_at!).getTime()).map(post => (
                  <Card key={post.id} className="border-slate-100 shadow-sm card-hover">
                    <CardContent className="pt-3.5 pb-3.5 flex gap-3.5 items-center">
                      <div className="text-center w-11 flex-shrink-0">
                        <div className="text-lg font-extrabold text-slate-900 leading-none tracking-tight">
                          {new Date(post.scheduled_at || post.published_at!).getDate()}
                        </div>
                        <div className="text-[10px] text-slate-400 uppercase font-medium">
                          {new Date(post.scheduled_at || post.published_at!).toLocaleDateString('en-IN', { weekday: 'short' })}
                        </div>
                      </div>
                      <div className="w-px h-8 bg-slate-100 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-600 leading-relaxed overflow-hidden mb-1" style={{ display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>{post.content}</p>
                        <div className="flex gap-2 items-center">
                          <span className="text-[11px] font-semibold" style={{ color: STATUS_COLOR[post.status] }}>{STATUS_LABEL[post.status]}</span>
                          <span className="text-[11px] text-slate-300">·</span>
                          <span className="text-[11px] text-slate-400">
                            {new Date(post.scheduled_at || post.published_at!).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="gap-1.5 border-slate-200 text-[13px] shrink-0"
                        onClick={() => { setEditingPost(post); setEditContent(post.content); setEditSchedule(post.scheduled_at?.slice(0, 16) || '') }}>
                        <Pencil className="size-3.5" /> Edit
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function PostsPage() {
  return <Suspense><PostsContent /></Suspense>
}

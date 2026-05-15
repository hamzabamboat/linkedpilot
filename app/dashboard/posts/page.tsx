'use client'

import { useState, useEffect, Suspense } from 'react'
import type { Post } from '@/lib/supabase'
import type { PostImage } from '@/lib/supabase'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ImageSelector } from '@/components/image-selector'
import {
  Plus, Zap, List, Calendar, FileText, ThumbsUp, Eye, MessageCircle,
  Pencil, Trash2, Sparkles, ImageIcon, X,
} from 'lucide-react'

const STATUS_COLOR: Record<string, string> = {
  draft: 'var(--ink-3)',
  pending_approval: '#f59e0b',
  approved: '#10b981',
  scheduled: 'var(--pl-accent)',
  publishing: '#8b5cf6',
  published: '#059669',
  failed: '#ef4444',
  rejected: '#dc2626',
}
const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  pending_approval: 'Awaiting Approval',
  approved: 'Approved',
  scheduled: 'Scheduled',
  publishing: 'Publishing',
  published: 'Published',
  failed: 'Failed',
  rejected: 'Rejected',
}

function utcToLocalInput(utcString: string): string {
  if (!utcString) return ''
  const date = new Date(utcString)
  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
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
  const [editImages, setEditImages] = useState<PostImage[]>([])
  const [imageSelectorOpen, setImageSelectorOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [plan, setPlan] = useState('starter')

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
        const postsRes = await fetch('/api/posts?order=scheduled_at')
        const postsData = await postsRes.json()
        if (!cancelled) setPosts(postsData.posts || [])
      } catch {
        /* non-fatal */
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  function openEdit(post: Post) {
    setEditingPost(post)
    setEditContent(post.content)
    setEditSchedule(post.scheduled_at ? utcToLocalInput(post.scheduled_at) : '')
    setEditImages([])
  }

  async function deletePost(id: string) {
    if (!confirm('Delete this post?')) return
    await fetch(`/api/posts/${id}/update`, { method: 'DELETE' })
    setPosts(p => p.filter(x => x.id !== id))
    toast('Post deleted')
  }

  async function saveEdit() {
    if (!editingPost) return
    setSaving(true)
    const body: Record<string, unknown> = { content: editContent }
    if (editSchedule) body.scheduled_at = new Date(editSchedule).toISOString()
    if (editImages.length > 0) body.image_urls = editImages.map(i => i.public_url)
    const res = await fetch(`/api/posts/${editingPost.id}/update`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (data.post) {
      setPosts(p => p.map(x => x.id === editingPost.id ? { ...x, ...data.post } : x))
    }
    setSaving(false)
    setEditingPost(null)
    toast.success('Post updated')
  }

  async function bulkGenerate() {
    toast('Bulk generating 30 days of posts...')
    const res = await fetch('/api/posts/bulk-generate', { method: 'POST' })
    const data = await res.json()
    if (data.error) { toast.error('Error: ' + data.error); return }
    const postsRes = await fetch('/api/posts?order=scheduled_at')
    const postsData = await postsRes.json()
    setPosts(postsData.posts || [])
    toast.success(`Generated ${data.count} posts for the next 30 days!`)
  }

  const sortedPosts = [...posts].sort((a, b) => {
    const aTime = a.scheduled_at ? new Date(a.scheduled_at).getTime() : (a.published_at ? new Date(a.published_at).getTime() : new Date(a.created_at).getTime())
    const bTime = b.scheduled_at ? new Date(b.scheduled_at).getTime() : (b.published_at ? new Date(b.published_at).getTime() : new Date(b.created_at).getTime())
    return aTime - bTime
  })

  const filtered = sortedPosts.filter(p => {
    if (filter === 'all') return true
    if (filter === 'scheduled') return p.status === 'scheduled'
    if (filter === 'draft') return ['draft', 'pending_approval'].includes(p.status)
    if (filter === 'published') return p.status === 'published'
    return true
  })

  const byDate: Record<string, Post[]> = {}
  sortedPosts.filter(p => p.scheduled_at || p.published_at).forEach(p => {
    const d = new Date(p.scheduled_at || p.published_at!).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    if (!byDate[d]) byDate[d] = []
    byDate[d].push(p)
  })

  if (loading) {
    return (
      <div className="p-4 md:p-7">
        <div className="skeleton h-8 w-48 mb-6 rounded" />
        {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl mb-3" />)}
      </div>
    )
  }

  return (
    <div className="p-4 md:p-7 max-w-3xl">
      <ImageSelector
        open={imageSelectorOpen}
        onClose={() => setImageSelectorOpen(false)}
        onSelect={imgs => setEditImages(imgs)}
        maxSelect={4}
        alreadySelected={editImages.map(i => i.id)}
      />

      <Dialog open={!!editingPost} onOpenChange={(open) => { if (!open) setEditingPost(null) }}>
        <DialogContent
          className="max-w-lg mx-4 md:mx-auto w-[calc(100vw-2rem)] md:w-full"
          style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)' }}
        >
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'var(--f-sans)', fontWeight: 600, fontSize: 15, color: 'var(--ink)' }}>
              Edit Post
            </DialogTitle>
          </DialogHeader>

          <Textarea
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
            className="h-48 resize-none text-[14px]"
            style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--ink)', borderRadius: 'var(--r-md)' }}
          />

          <div>
            <Label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-2)', display: 'block', marginBottom: 6 }}>
              Photos <span style={{ fontWeight: 400, color: 'var(--ink-4)' }}>(optional)</span>
            </Label>
            {editImages.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {editImages.map(img => (
                  <div key={img.id} className="relative w-16 h-16 rounded-lg overflow-hidden group"
                    style={{ border: '1px solid var(--line)' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.public_url} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setEditImages(prev => prev.filter(i => i.id !== img.id))}
                      className="absolute inset-0 flex items-center justify-center transition-opacity opacity-0 group-hover:opacity-100"
                      style={{ background: 'rgba(0,0,0,0.45)' }}
                    >
                      <X className="w-3.5 h-3.5 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => setImageSelectorOpen(true)}
              className="flex items-center gap-2 transition-all"
              style={{
                fontSize: 12, fontWeight: 500, color: 'var(--ink-3)',
                border: '1px solid var(--line)', borderRadius: 'var(--r-sm)',
                padding: '6px 12px',
              }}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              {editImages.length > 0 ? `${editImages.length} photo${editImages.length > 1 ? 's' : ''} selected` : 'Add photos from library'}
            </button>
          </div>

          <div className="space-y-2">
            <Label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-2)' }}>
              Reschedule <span style={{ fontWeight: 400, color: 'var(--ink-4)' }}>(optional)</span>
            </Label>
            <Input
              type="datetime-local"
              value={editSchedule}
              onChange={e => setEditSchedule(e.target.value)}
              min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
              style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--ink)', borderRadius: 'var(--r-sm)' }}
            />
            <p style={{ fontSize: 11, color: 'var(--ink-4)' }}>Time is in your local timezone</p>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              onClick={saveEdit}
              disabled={saving}
              className="flex-1 transition-opacity"
              style={{
                background: 'var(--pl-accent)', color: '#fff',
                borderRadius: 'var(--r-sm)', padding: '9px 16px',
                fontSize: 14, fontWeight: 600,
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
            <button
              onClick={() => setEditingPost(null)}
              style={{
                border: '1px solid var(--line)', borderRadius: 'var(--r-sm)',
                padding: '9px 16px', fontSize: 14, fontWeight: 500, color: 'var(--ink-2)',
              }}
            >
              Cancel
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-6">
        <div>
          <h1 style={{ fontFamily: 'var(--f-sans)', fontWeight: 600, fontSize: 22, color: 'var(--ink)', letterSpacing: '-0.025em', marginBottom: 4 }}>
            Posts
          </h1>
          <p style={{ fontSize: 13, color: 'var(--ink-4)', fontFamily: 'var(--f-mono)' }}>
            // {posts.length} total
          </p>
        </div>
        <div className="flex gap-2">
          {plan === 'pro' && (
            <button
              onClick={bulkGenerate}
              className="flex items-center gap-1.5 transition-opacity hover:opacity-80"
              style={{
                background: 'var(--pl-accent-soft)', color: 'var(--pl-accent)',
                border: '1px solid var(--pl-accent-2)', borderRadius: 'var(--r-sm)',
                padding: '7px 14px', fontSize: 13, fontWeight: 600,
              }}
            >
              <Zap className="size-3.5" />
              <span className="hidden sm:inline">Bulk Fill 30 Days</span>
              <span className="sm:hidden">Bulk Fill</span>
            </button>
          )}
          <Link
            href="/dashboard/generate"
            className="flex items-center gap-1.5 transition-opacity hover:opacity-80"
            style={{
              background: 'var(--pl-accent)', color: '#fff',
              borderRadius: 'var(--r-sm)', padding: '7px 14px',
              fontSize: 13, fontWeight: 600,
            }}
          >
            <Plus className="size-3.5" />
            New Post
          </Link>
        </div>
      </div>

      {/* View + filter controls */}
      <div className="flex gap-3 mb-6 items-center flex-wrap">
        <div
          className="flex gap-0.5 p-1"
          style={{ background: 'var(--surface-2)', borderRadius: 'var(--r-md)' }}
        >
          {(['list', 'calendar'] as ViewMode[]).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="flex items-center gap-1.5 transition-all"
              style={{
                height: 28, padding: '0 12px', fontSize: 12, fontWeight: 500,
                borderRadius: 'var(--r-sm)',
                background: view === v ? 'var(--surface)' : 'transparent',
                color: view === v ? 'var(--ink)' : 'var(--ink-3)',
                boxShadow: view === v ? 'var(--sh-1)' : 'none',
              }}
            >
              {v === 'list' ? <><List className="size-3" />List</> : <><Calendar className="size-3" />Calendar</>}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {(['all', 'scheduled', 'draft', 'published'] as FilterStatus[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="transition-all"
              style={{
                height: 28, padding: '0 14px', fontSize: 12, fontWeight: 500,
                borderRadius: 'var(--r-full)',
                background: filter === f ? 'var(--pl-accent)' : 'var(--surface)',
                color: filter === f ? '#fff' : 'var(--ink-3)',
                border: filter === f ? '1px solid var(--pl-accent)' : '1px solid var(--line)',
              }}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* List view */}
      {view === 'list' && (
        <div className="flex flex-col gap-2">
          {filtered.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-16 text-center"
              style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', background: 'var(--surface)' }}
            >
              <div
                className="flex items-center justify-center mb-4"
                style={{ width: 44, height: 44, borderRadius: 'var(--r-md)', background: 'var(--surface-2)', border: '1px solid var(--line)' }}
              >
                <FileText className="w-5 h-5" style={{ color: 'var(--ink-4)' }} strokeWidth={1.5} />
              </div>
              <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--ink)', marginBottom: 6 }}>No posts found</div>
              <div style={{ fontSize: 13, color: 'var(--ink-4)', marginBottom: 20 }}>
                {filter !== 'all' ? `No ${filter} posts yet.` : 'Generate your first post to get started.'}
              </div>
              <Link
                href="/dashboard/generate"
                className="flex items-center gap-1.5 transition-opacity hover:opacity-80"
                style={{
                  background: 'var(--pl-accent)', color: '#fff',
                  borderRadius: 'var(--r-sm)', padding: '8px 16px',
                  fontSize: 13, fontWeight: 600,
                }}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Generate a Post
              </Link>
            </div>
          ) : filtered.map(post => (
            <div
              key={post.id}
              style={{
                background: 'var(--surface)', border: '1px solid var(--line)',
                borderRadius: 'var(--r-lg)', padding: '14px 16px',
                transition: 'border-color 0.15s',
              }}
              className="group"
            >
              <div className="flex gap-4 items-start">
                <div className="flex-1 min-w-0">
                  <div className="flex gap-2 items-center mb-2 flex-wrap">
                    {/* Status badge */}
                    <span
                      style={{
                        fontSize: 11, fontWeight: 600, padding: '2px 8px',
                        borderRadius: 'var(--r-full)',
                        background: (STATUS_COLOR[post.status] || 'var(--ink-4)') + '18',
                        color: STATUS_COLOR[post.status] || 'var(--ink-4)',
                      }}
                    >
                      {STATUS_LABEL[post.status] || post.status}
                    </span>
                    {post.content_pillar && (
                      <span
                        style={{
                          fontSize: 11, fontWeight: 500, padding: '2px 8px',
                          borderRadius: 'var(--r-full)',
                          background: 'var(--surface-2)', color: 'var(--ink-3)',
                          border: '1px solid var(--line)',
                        }}
                      >
                        {post.content_pillar}
                      </span>
                    )}
                    {post.scheduled_at && (
                      <span
                        className="flex items-center gap-1"
                        style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--f-mono)' }}
                      >
                        <Calendar className="w-3 h-3" />
                        {new Date(post.scheduled_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>

                  <p
                    className="overflow-hidden"
                    style={{
                      fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.55,
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {post.content}
                  </p>

                  {post.image_urls && post.image_urls.length > 0 && (
                    <div className="flex gap-1.5 mt-2">
                      {post.image_urls.slice(0, 3).map((url, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={i} src={url} alt="" className="w-10 h-10 rounded-lg object-cover"
                          style={{ border: '1px solid var(--line)' }} />
                      ))}
                      {post.image_urls.length > 3 && (
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ background: 'var(--surface-2)', fontSize: 11, color: 'var(--ink-4)', fontWeight: 600 }}
                        >
                          +{post.image_urls.length - 3}
                        </div>
                      )}
                    </div>
                  )}

                  {post.status === 'published' && (post.reactions != null || post.impressions != null) && (
                    <div className="flex gap-4 mt-2">
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
                      {post.comments != null && (
                        <span className="flex items-center gap-1" style={{ fontSize: 12, color: 'var(--ink-4)' }}>
                          <MessageCircle className="w-3 h-3" /> {post.comments}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => openEdit(post)}
                    className="flex items-center gap-1.5 transition-all hover:opacity-80"
                    style={{
                      fontSize: 12, fontWeight: 500, color: 'var(--ink-2)',
                      border: '1px solid var(--line)', borderRadius: 'var(--r-sm)',
                      padding: '5px 10px',
                    }}
                  >
                    <Pencil className="size-3.5" />
                    <span className="hidden sm:inline">Edit</span>
                  </button>
                  <button
                    onClick={() => deletePost(post.id)}
                    className="flex items-center justify-center transition-all hover:opacity-80"
                    style={{
                      width: 30, height: 30,
                      border: '1px solid var(--line)', borderRadius: 'var(--r-sm)',
                      color: '#ef4444',
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Calendar view */}
      {view === 'calendar' && (
        <div>
          {Object.keys(byDate).length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-16 text-center"
              style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', background: 'var(--surface)' }}
            >
              <div
                className="flex items-center justify-center mb-4"
                style={{ width: 44, height: 44, borderRadius: 'var(--r-md)', background: 'var(--surface-2)', border: '1px solid var(--line)' }}
              >
                <Calendar className="w-5 h-5" style={{ color: 'var(--ink-4)' }} strokeWidth={1.5} />
              </div>
              <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--ink)', marginBottom: 6 }}>No scheduled posts</div>
              <div style={{ fontSize: 13, color: 'var(--ink-4)' }}>Schedule posts to see them in your calendar.</div>
            </div>
          ) : Object.entries(byDate).map(([month, monthPosts]) => (
            <div key={month} className="mb-7">
              <div style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--ink-4)', marginBottom: 10, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                // {month}
              </div>
              <div className="flex flex-col gap-2">
                {monthPosts.map(post => (
                  <div
                    key={post.id}
                    className="flex gap-3.5 items-center"
                    style={{
                      background: 'var(--surface)', border: '1px solid var(--line)',
                      borderRadius: 'var(--r-lg)', padding: '12px 14px',
                    }}
                  >
                    <div className="text-center flex-shrink-0" style={{ width: 40 }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', lineHeight: 1, letterSpacing: '-0.03em' }}>
                        {new Date(post.scheduled_at || post.published_at!).getDate()}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--ink-4)', textTransform: 'uppercase', fontWeight: 500, marginTop: 2 }}>
                        {new Date(post.scheduled_at || post.published_at!).toLocaleDateString(undefined, { weekday: 'short' })}
                      </div>
                    </div>
                    <div style={{ width: 1, height: 32, background: 'var(--line)', flexShrink: 0 }} />
                    <div className="flex-1 min-w-0">
                      <p
                        className="overflow-hidden mb-1"
                        style={{
                          fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.45,
                          display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical',
                        }}
                      >
                        {post.content}
                      </p>
                      <div className="flex gap-2 items-center">
                        <span style={{ fontSize: 11, fontWeight: 600, color: STATUS_COLOR[post.status] }}>{STATUS_LABEL[post.status]}</span>
                        <span style={{ color: 'var(--line-2)', fontSize: 11 }}>·</span>
                        <span style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--f-mono)' }}>
                          {new Date(post.scheduled_at || post.published_at!).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => openEdit(post)}
                      className="flex items-center gap-1.5 flex-shrink-0 transition-all hover:opacity-80"
                      style={{
                        fontSize: 12, fontWeight: 500, color: 'var(--ink-2)',
                        border: '1px solid var(--line)', borderRadius: 'var(--r-sm)',
                        padding: '5px 10px',
                      }}
                    >
                      <Pencil className="size-3.5" /> Edit
                    </button>
                  </div>
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

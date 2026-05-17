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
  Pencil, Trash2, Sparkles, ImageIcon, X, CheckCircle2,
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

function statusStateClass(status: string): string {
  if (status === 'published' || status === 'approved') return 'state state--done'
  if (status === 'draft') return 'state state--draft'
  if (status === 'pending_approval' || status === 'publishing') return 'state state--review'
  if (status === 'scheduled') return 'state state--on'
  if (status === 'failed' || status === 'rejected') return 'state state--review'
  return 'state state--draft'
}

type ViewMode = 'list' | 'calendar'
type FilterStatus = 'all' | 'scheduled' | 'draft' | 'published'

function PostsContent() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<ViewMode>('list')
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [search, setSearch] = useState('')
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

  async function approvePost(id: string) {
    const res = await fetch(`/api/posts/${id}/approve`, { method: 'POST' })
    const data = await res.json()
    if (data.error) { toast.error(data.error); return }
    setPosts(p => p.map(x => x.id === id ? { ...x, status: data.post.status } : x))
    const label = data.post.status === 'scheduled' ? 'Post approved and scheduled' : 'Post approved'
    toast.success(label)
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
  }).filter(p => {
    if (!search.trim()) return true
    return p.content.toLowerCase().includes(search.toLowerCase())
  })

  const byDate: Record<string, Post[]> = {}
  sortedPosts.filter(p => p.scheduled_at || p.published_at).forEach(p => {
    const d = new Date(p.scheduled_at || p.published_at!).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    if (!byDate[d]) byDate[d] = []
    byDate[d].push(p)
  })

  const tabCounts: Record<FilterStatus, number> = {
    all: posts.length,
    scheduled: posts.filter(p => p.status === 'scheduled').length,
    draft: posts.filter(p => ['draft', 'pending_approval'].includes(p.status)).length,
    published: posts.filter(p => p.status === 'published').length,
  }

  if (loading) {
    return (
      <div className="db-screen">
        <div className="skeleton" style={{ height: 36, width: 200, marginBottom: 28, borderRadius: 6 }} />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 56, borderRadius: 8, marginBottom: 4 }} />
        ))}
      </div>
    )
  }

  return (
    <div className="db-screen">
      {/* Edit post dialog — preserved exactly */}
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

      {/* Page header */}
      <div className="db-screen__head">
        <div>
          <p className="db-screen__eyebrow">// 02 — Posts</p>
          <h1 className="db-screen__title">
            Your <em>content</em> queue
          </h1>
        </div>
        <div className="db-screen__actions">
          {plan === 'pro' && (
            <button onClick={bulkGenerate} className="btn-dash btn-dash--outline">
              <Zap />
              <span className="hidden sm:inline">Bulk Fill 30 Days</span>
              <span className="sm:hidden">Bulk Fill</span>
            </button>
          )}
          <Link href="/dashboard/generate" className="btn-dash btn-dash--primary">
            <Plus />
            New Post
          </Link>
        </div>
      </div>

      {/* Filter bar */}
      <div className="filter-bar">
        <div className="filter-tabs">
          {(['all', 'scheduled', 'draft', 'published'] as FilterStatus[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`ft${filter === f ? ' is-on' : ''}`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              <em>{tabCounts[f]}</em>
            </button>
          ))}
        </div>
        <div className="filter-controls">
          <input
            type="search"
            placeholder="Search posts…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="db-input"
            style={{ width: 200 }}
          />
          <button
            className={`chip-btn${view === 'list' ? '' : ' is-on'}`}
            onClick={() => setView(v => v === 'list' ? 'calendar' : 'list')}
          >
            {view === 'list' ? <Calendar /> : <List />}
            {view === 'list' ? 'Calendar' : 'List'}
          </button>
        </div>
      </div>

      {/* List view */}
      {view === 'list' && (
        filtered.length === 0 ? (
          <div className="posts-table">
            <div className="db-empty">
              <FileText strokeWidth={1.5} />
              <strong>No posts found</strong>
              <span>
                {filter !== 'all'
                  ? `No ${filter} posts yet.`
                  : search
                  ? 'No posts match your search.'
                  : 'Generate your first post to get started.'}
              </span>
              <Link href="/dashboard/generate" className="btn-dash btn-dash--primary" style={{ marginTop: 6 }}>
                <Sparkles />
                Generate a Post
              </Link>
            </div>
          </div>
        ) : (
          <div className="posts-table">
            {/* Table header */}
            <div className="pt-row pt-row--head">
              <span>POST</span>
              <span>SCHEDULED</span>
              <span>PLATFORM</span>
              <span>STATUS</span>
              <span>IMPRESSIONS</span>
              <span>ENGAGEMENT</span>
              <span />
            </div>

            {filtered.map(post => {
              const scheduledDate = post.scheduled_at
                ? new Date(post.scheduled_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
                : post.published_at
                ? new Date(post.published_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
                : '—'
              const scheduledTime = post.scheduled_at
                ? new Date(post.scheduled_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
                : post.published_at
                ? new Date(post.published_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
                : null

              return (
                <div key={post.id} className="pt-row">
                  {/* Title + snippet */}
                  <div className="pt-title">
                    <strong>{post.content_pillar || 'Post'}</strong>
                    <em>{post.content}</em>
                  </div>

                  {/* Scheduled date */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <span style={{ color: 'var(--ink-2)', fontWeight: 500 }}>{scheduledDate}</span>
                    {scheduledTime && (
                      <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--ink-4)' }}>{scheduledTime}</span>
                    )}
                  </div>

                  {/* Platform */}
                  <span style={{ color: 'var(--ink-3)', fontFamily: 'var(--f-mono)', fontSize: 11.5 }}>
                    LinkedIn
                  </span>

                  {/* Status badge */}
                  <span className={statusStateClass(post.status)}>
                    {STATUS_LABEL[post.status] || post.status}
                  </span>

                  {/* Impressions */}
                  <span className={post.impressions != null && post.impressions > 0 ? 'pt-up' : ''}>
                    {post.impressions != null ? post.impressions.toLocaleString() : '—'}
                  </span>

                  {/* Engagement (reactions + comments) */}
                  <span className={((post.reactions ?? 0) + (post.comments ?? 0)) > 0 ? 'pt-up' : ''}>
                    {post.reactions != null || post.comments != null
                      ? ((post.reactions ?? 0) + (post.comments ?? 0)).toLocaleString()
                      : '—'}
                  </span>

                  {/* Actions */}
                  <div className="pt-more" style={{ display: 'flex', gap: 4 }}>
                    <button
                      onClick={() => openEdit(post)}
                      className="btn-dash btn-dash--ghost btn-dash--sm"
                      title="Edit post"
                    >
                      <Pencil />
                    </button>
                    <button
                      onClick={() => deletePost(post.id)}
                      className="btn-dash btn-dash--ghost btn-dash--sm btn-dash--danger"
                      title="Delete post"
                      style={{ background: 'transparent', border: 'none' }}
                    >
                      <Trash2 />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      {/* Calendar view */}
      {view === 'calendar' && (
        <div>
          {Object.keys(byDate).length === 0 ? (
            <div className="posts-table">
              <div className="db-empty">
                <Calendar strokeWidth={1.5} />
                <strong>No scheduled posts</strong>
                <span>Schedule posts to see them in your calendar.</span>
              </div>
            </div>
          ) : Object.entries(byDate).map(([month, monthPosts]) => (
            <div key={month} style={{ marginBottom: 28 }}>
              <p className="db-screen__eyebrow" style={{ marginBottom: 10 }}>// {month}</p>
              <div className="posts-table">
                {monthPosts.map(post => (
                  <div
                    key={post.id}
                    className="pt-row"
                    style={{ gridTemplateColumns: '52px 1px 1fr auto' }}
                  >
                    {/* Day number */}
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.03em', lineHeight: 1 }}>
                        {new Date(post.scheduled_at || post.published_at!).getDate()}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--ink-4)', textTransform: 'uppercase', fontWeight: 500, marginTop: 2 }}>
                        {new Date(post.scheduled_at || post.published_at!).toLocaleDateString(undefined, { weekday: 'short' })}
                      </div>
                    </div>

                    {/* Divider */}
                    <div style={{ width: 1, height: 32, background: 'var(--line)', alignSelf: 'center' }} />

                    {/* Content */}
                    <div className="pt-title">
                      <strong>{post.content_pillar || 'Post'}</strong>
                      <em>{post.content}</em>
                    </div>

                    {/* Status + edit */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className={statusStateClass(post.status)}>
                        {STATUS_LABEL[post.status]}
                      </span>
                      <button
                        onClick={() => openEdit(post)}
                        className="btn-dash btn-dash--ghost btn-dash--sm"
                        title="Edit"
                      >
                        <Pencil />
                      </button>
                    </div>
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

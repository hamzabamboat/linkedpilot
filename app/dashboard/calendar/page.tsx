'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { Post } from '@/lib/supabase'
import type { PostImage } from '@/lib/supabase'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ImageSelector } from '@/components/image-selector'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Sparkles, ChevronLeft, ChevronRight, Plus, X, CalendarDays, Pencil, Clock, ImageIcon } from 'lucide-react'

function utcToLocalInput(utcString: string): string {
  if (!utcString) return ''
  const date = new Date(utcString)
  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

const STATUS_COLOR: Record<string, string> = {
  draft: 'var(--ink-4)',
  pending_approval: '#f59e0b',
  approved: '#10b981',
  scheduled: 'var(--pl-accent)',
  publishing: '#8b5cf6',
  published: '#059669',
  failed: '#ef4444',
}
const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft', pending_approval: 'Pending', approved: 'Approved',
  scheduled: 'Scheduled', publishing: 'Publishing', published: 'Published', failed: 'Failed',
}

const LEGEND = ['scheduled', 'published', 'pending_approval', 'failed']
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfWeek(year: number, month: number) {
  const d = new Date(year, month, 1).getDay()
  return d === 0 ? 6 : d - 1
}

export default function CalendarPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [addPostDay, setAddPostDay] = useState<number | null>(null)
  const [editingPost, setEditingPost] = useState<Post | null>(null)
  const [editTime, setEditTime] = useState('')
  const [editImages, setEditImages] = useState<PostImage[]>([])
  const [imageSelectorOpen, setImageSelectorOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const meRes = await fetch('/api/me')
        if (!meRes.ok) return
        const { user } = await meRes.json()
        if (!user || cancelled) return
        const monthParam = `${year}-${String(month + 1).padStart(2, '0')}`
        const res = await fetch(`/api/posts?scheduled_month=${monthParam}&order=scheduled_at`)
        const data = await res.json()
        if (!cancelled) setPosts(data.posts || [])
      } catch { /* non-fatal */ } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [year, month])

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) } else setMonth(m => m - 1)
    closePanel()
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) } else setMonth(m => m + 1)
    closePanel()
  }
  function jumpToToday() { setYear(now.getFullYear()); setMonth(now.getMonth()); closePanel() }
  function closePanel() { setPanelOpen(false); setSelectedDay(null); setEditingPost(null); setEditTime(''); setEditImages([]) }

  function startEditPost(post: Post) {
    setEditingPost(post)
    setEditTime(post.scheduled_at ? utcToLocalInput(post.scheduled_at) : '')
    setEditImages([])
  }

  async function savePostEdit() {
    if (!editingPost) return
    setSaving(true)
    const body: Record<string, unknown> = {}
    if (editTime) body.scheduled_at = new Date(editTime).toISOString()
    if (editImages.length > 0) body.image_urls = editImages.map(i => i.public_url)
    const res = await fetch(`/api/posts/${editingPost.id}/update`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    const data = await res.json()
    if (data.post) { setPosts(prev => prev.map(p => p.id === editingPost.id ? { ...p, ...data.post } : p)); toast.success('Post updated') }
    else toast.error(data.error || 'Failed to update post')
    setSaving(false); setEditingPost(null); setEditTime(''); setEditImages([])
  }

  function handleDayClick(day: number) {
    const dayPosts = getPostsForDay(day)
    if (dayPosts.length > 0) { setSelectedDay(day); setPanelOpen(true) }
    else if (!isDayPast(day)) setAddPostDay(day)
  }

  const daysInMonth = getDaysInMonth(year, month)
  const firstDayOffset = getFirstDayOfWeek(year, month)
  const today = now.getDate()
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() === month

  function isDayPast(day: number): boolean {
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    return new Date(year, month, day) < todayMidnight
  }
  function getPostsForDay(day: number): Post[] {
    return posts.filter(p => {
      if (!p.scheduled_at) return false
      const d = new Date(p.scheduled_at)
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day
    })
  }

  const selectedDayPosts = selectedDay ? getPostsForDay(selectedDay) : []
  const cells: (number | null)[] = []
  for (let i = 0; i < firstDayOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  const addPostDateStr = addPostDay ? `${MONTH_NAMES[month]} ${addPostDay}, ${year}` : ''

  return (
    <div className="p-4 md:p-7 max-w-[960px]">
      <ImageSelector
        open={imageSelectorOpen}
        onClose={() => setImageSelectorOpen(false)}
        onSelect={imgs => setEditImages(imgs)}
        maxSelect={4}
        alreadySelected={editImages.map(i => i.id)}
      />

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 style={{ fontFamily: 'var(--f-sans)', fontWeight: 600, fontSize: 22, color: 'var(--ink)', letterSpacing: '-0.025em', marginBottom: 4 }}>
            Calendar
          </h1>
          <p style={{ fontSize: 13, color: 'var(--ink-4)', fontFamily: 'var(--f-mono)' }}>
            // {posts.length} post{posts.length !== 1 ? 's' : ''} this month
          </p>
        </div>
        <Link
          href="/dashboard/generate"
          className="flex items-center gap-1.5 transition-opacity hover:opacity-80"
          style={{
            background: 'var(--pl-accent)', color: '#fff',
            borderRadius: 'var(--r-sm)', padding: '7px 14px',
            fontSize: 13, fontWeight: 600,
          }}
        >
          <Plus className="w-3.5 h-3.5" />
          Add post
        </Link>
      </div>

      {/* Calendar card */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
        {/* Month nav */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--line)' }}>
          <button
            onClick={prevMonth}
            className="flex items-center justify-center transition-all hover:opacity-70"
            style={{ width: 32, height: 32, borderRadius: 'var(--r-sm)', border: '1px solid var(--line)', background: 'var(--surface-2)', color: 'var(--ink-2)' }}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3">
            <h2 style={{ fontFamily: 'var(--f-sans)', fontWeight: 600, fontSize: 16, color: 'var(--ink)', letterSpacing: '-0.02em' }}>
              {MONTH_NAMES[month]} {year}
            </h2>
            {!isCurrentMonth && (
              <button
                onClick={jumpToToday}
                className="transition-all hover:opacity-80"
                style={{
                  fontSize: 11, fontWeight: 600, padding: '3px 10px',
                  borderRadius: 'var(--r-full)',
                  background: 'var(--pl-accent-soft)', color: 'var(--pl-accent)',
                  border: '1px solid var(--pl-accent-2)',
                }}
              >
                Today
              </button>
            )}
          </div>
          <button
            onClick={nextMonth}
            className="flex items-center justify-center transition-all hover:opacity-70"
            style={{ width: 32, height: 32, borderRadius: 'var(--r-sm)', border: '1px solid var(--line)', background: 'var(--surface-2)', color: 'var(--ink-2)' }}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7" style={{ borderBottom: '1px solid var(--line)' }}>
          {DAY_NAMES.map(d => (
            <div key={d} className="text-center py-2.5" style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: 'var(--f-mono)' }}>
              {d}
            </div>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-7">
            {[...Array(35)].map((_, i) => (
              <div key={i} className="min-h-[80px] md:min-h-[96px] p-1.5" style={{ borderBottom: '1px solid var(--line)', borderRight: '1px solid var(--line)' }}>
                <div className="animate-pulse h-5 w-5 rounded-full mb-1.5" style={{ background: 'var(--surface-2)' }} />
                {i % 4 === 0 && <div className="animate-pulse h-3 rounded w-full" style={{ background: 'var(--surface-2)' }} />}
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-7">
            {cells.map((day, i) => {
              if (day === null) {
                return <div key={`e-${i}`} className="min-h-[80px] md:min-h-[96px]"
                  style={{ borderBottom: '1px solid var(--line)', borderRight: '1px solid var(--line)', background: 'var(--bg-2)' }} />
              }
              const isToday = isCurrentMonth && day === today
              const isSelected = selectedDay === day && panelOpen
              const isPast = isDayPast(day)
              const dayPosts = getPostsForDay(day)
              const isClickable = dayPosts.length > 0 || !isPast

              return (
                <div
                  key={day}
                  onClick={() => handleDayClick(day)}
                  className="min-h-[80px] md:min-h-[96px] p-1.5 transition-colors"
                  style={{
                    borderBottom: '1px solid var(--line)',
                    borderRight: '1px solid var(--line)',
                    cursor: isClickable ? 'pointer' : 'default',
                    background: isSelected
                      ? 'var(--pl-accent-soft)'
                      : isToday
                      ? 'color-mix(in srgb, var(--pl-accent) 6%, var(--surface))'
                      : isPast
                      ? 'var(--bg-2)'
                      : 'var(--surface)',
                  }}
                >
                  <div
                    className="text-[13px] font-semibold mb-1 w-6 h-6 flex items-center justify-center rounded-full"
                    style={{
                      background: isToday ? 'var(--pl-accent)' : isSelected ? 'var(--pl-accent-soft)' : 'transparent',
                      color: isToday ? '#fff' : isSelected ? 'var(--pl-accent)' : 'var(--ink-2)',
                    }}
                  >
                    {day}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {dayPosts.slice(0, 2).map(post => (
                      <div
                        key={post.id}
                        className="text-[10px] rounded px-1 py-0.5 truncate font-medium leading-tight"
                        style={{
                          background: (STATUS_COLOR[post.status] || 'var(--ink-4)') + '18',
                          color: STATUS_COLOR[post.status] || 'var(--ink-4)',
                        }}
                      >
                        {post.content?.slice(0, 22)}…
                      </div>
                    ))}
                    {dayPosts.length > 2 && (
                      <div style={{ fontSize: 10, color: 'var(--ink-4)', paddingLeft: 2 }}>+{dayPosts.length - 2} more</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-3">
        {LEGEND.map(key => (
          <div key={key} className="flex items-center gap-1.5">
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_COLOR[key] || 'var(--ink-4)' }} />
            <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink-4)' }}>{STATUS_LABEL[key]}</span>
          </div>
        ))}
      </div>

      {/* Day detail panel */}
      {panelOpen && (
        <>
          <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.25)' }} onClick={closePanel} />
          <div
            className="fixed right-0 top-0 h-full w-full sm:w-80 z-50 flex flex-col"
            style={{ background: 'var(--surface)', borderLeft: '1px solid var(--line)', boxShadow: 'var(--sh-3)' }}
          >
            <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: '1px solid var(--line)' }}>
              <h3 style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)', fontFamily: 'var(--f-sans)' }}>
                {MONTH_NAMES[month]} {selectedDay}, {year}
              </h3>
              <button onClick={closePanel} className="transition-opacity hover:opacity-70"
                style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--r-sm)', color: 'var(--ink-3)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {selectedDayPosts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div style={{ fontSize: 13, color: 'var(--ink-4)', marginBottom: 12 }}>No posts for this day.</div>
                  <Link href="/dashboard/generate"
                    className="flex items-center gap-1.5 transition-opacity hover:opacity-80"
                    style={{ background: 'var(--pl-accent)', color: '#fff', borderRadius: 'var(--r-sm)', padding: '7px 14px', fontSize: 13, fontWeight: 600 }}>
                    <Sparkles className="w-3.5 h-3.5" /> Generate a post
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {selectedDayPosts.map(post => (
                    <div key={post.id}>
                      <div style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', padding: 12 }}>
                        <div className="flex items-center gap-2 mb-2">
                          <span style={{
                            fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 'var(--r-full)',
                            background: (STATUS_COLOR[post.status] || 'var(--ink-4)') + '18',
                            color: STATUS_COLOR[post.status] || 'var(--ink-4)',
                          }}>
                            {STATUS_LABEL[post.status] || post.status}
                          </span>
                          {post.scheduled_at && (
                            <span style={{ fontSize: 10, color: 'var(--ink-4)', fontFamily: 'var(--f-mono)' }}>
                              {new Date(post.scheduled_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                        <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>{post.content?.slice(0, 120)}{(post.content?.length || 0) > 120 ? '…' : ''}</p>
                      </div>
                      {editingPost?.id === post.id ? (
                        <div className="mt-2 p-3 flex flex-col gap-3" style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)' }}>
                          <div>
                            <div className="flex items-center gap-1 mb-1" style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)' }}>
                              <Clock className="w-3 h-3" /> Reschedule time
                            </div>
                            <Input type="datetime-local" value={editTime} onChange={e => setEditTime(e.target.value)}
                              min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                              className="text-[13px] h-8"
                              style={{ background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
                            <p style={{ fontSize: 10, color: 'var(--ink-4)', marginTop: 4 }}>Your local timezone</p>
                          </div>
                          <div>
                            <div className="flex items-center gap-1 mb-1" style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)' }}>
                              <ImageIcon className="w-3 h-3" /> Add photos
                            </div>
                            {editImages.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mb-2">
                                {editImages.map(img => (
                                  <div key={img.id} className="relative w-12 h-12 rounded-lg overflow-hidden group" style={{ border: '1px solid var(--line)' }}>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={img.public_url} alt="" className="w-full h-full object-cover" />
                                    <button onClick={() => setEditImages(prev => prev.filter(i => i.id !== img.id))}
                                      className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                      style={{ background: 'rgba(0,0,0,0.4)' }}>
                                      <X className="w-3 h-3 text-white" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                            <button type="button" onClick={() => setImageSelectorOpen(true)}
                              className="flex items-center gap-1.5 transition-all hover:opacity-70"
                              style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink-3)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', padding: '5px 10px' }}>
                              <ImageIcon className="w-3 h-3" />
                              {editImages.length > 0 ? `${editImages.length} selected` : 'Pick from library'}
                            </button>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={savePostEdit} disabled={saving}
                              className="flex-1 transition-opacity"
                              style={{ background: 'var(--pl-accent)', color: '#fff', borderRadius: 'var(--r-sm)', padding: '6px 12px', fontSize: 12, fontWeight: 600, opacity: saving ? 0.6 : 1 }}>
                              {saving ? 'Saving…' : 'Save'}
                            </button>
                            <button onClick={() => { setEditingPost(null); setEditTime(''); setEditImages([]) }}
                              style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', padding: '6px 12px', fontSize: 12, fontWeight: 500, color: 'var(--ink-2)' }}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => startEditPost(post)}
                          className="mt-1.5 flex items-center gap-1 transition-all hover:opacity-70"
                          style={{ fontSize: 11, color: 'var(--ink-4)' }}>
                          <Pencil className="w-3 h-3" /> Edit time &amp; photos
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedDay && !isDayPast(selectedDay) && (
              <div className="px-4 py-3 shrink-0" style={{ borderTop: '1px solid var(--line)' }}>
                <Link href="/dashboard/generate"
                  className="flex items-center justify-center gap-1.5 w-full transition-opacity hover:opacity-80"
                  style={{ background: 'var(--pl-accent)', color: '#fff', borderRadius: 'var(--r-sm)', padding: '8px 16px', fontSize: 13, fontWeight: 600 }}>
                  <Plus className="w-3.5 h-3.5" /> Add post to this date
                </Link>
              </div>
            )}
          </div>
        </>
      )}

      {/* Empty day dialog */}
      <Dialog open={addPostDay !== null} onOpenChange={open => { if (!open) setAddPostDay(null) }}>
        <DialogContent className="sm:max-w-md" style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)' }}>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'var(--f-sans)', fontWeight: 600, color: 'var(--ink)' }}>
              Schedule for {addPostDateStr}
            </DialogTitle>
          </DialogHeader>
          <p style={{ fontSize: 13, color: 'var(--ink-4)', marginTop: -4, marginBottom: 16 }}>
            No posts scheduled for this day. Generate one with AI or browse all posts.
          </p>
          <div className="flex flex-col gap-2">
            <Link href="/dashboard/generate" onClick={() => setAddPostDay(null)}
              className="flex items-center justify-center gap-2 transition-opacity hover:opacity-80"
              style={{ background: 'var(--pl-accent)', color: '#fff', borderRadius: 'var(--r-sm)', padding: '10px 16px', fontSize: 14, fontWeight: 600 }}>
              <Sparkles className="w-4 h-4" /> Generate with AI
            </Link>
            <Link href="/dashboard/posts" onClick={() => setAddPostDay(null)}
              className="flex items-center justify-center gap-2 transition-opacity hover:opacity-80"
              style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', padding: '10px 16px', fontSize: 14, fontWeight: 500, color: 'var(--ink-2)' }}>
              <CalendarDays className="w-4 h-4" /> View all posts
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

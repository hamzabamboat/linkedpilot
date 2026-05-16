'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PostImage } from '@/lib/supabase'
import {
  CloudUpload, CheckCircle2, X, Trash2, Loader2, Image as ImageIcon,
  ExternalLink, Lightbulb, RefreshCw, Lock, Zap, Camera,
} from 'lucide-react'

const MOOD_CSS: Record<string, { bg: string; color: string }> = {
  professional:        { bg: 'rgba(10,102,194,0.10)',  color: '#0A66C2' },
  casual:              { bg: 'rgba(217,119,6,0.10)',   color: '#d97706' },
  celebratory:         { bg: 'rgba(5,150,105,0.10)',   color: '#059669' },
  'behind-the-scenes': { bg: 'rgba(124,58,237,0.10)', color: '#7c3aed' },
  educational:         { bg: 'rgba(8,145,178,0.10)',   color: '#0891b2' },
  inspirational:       { bg: 'rgba(220,38,38,0.10)',   color: '#dc2626' },
}

const IDEA_ICONS = ['📸', '🤝', '💼', '🏆', '🎯', '💡', '🌟', '📊', '🎤', '🏢']

type UploadFile = {
  name: string
  status: 'uploading' | 'analysing' | 'done' | 'error'
  progress: number
  error?: string
}

function ImageCard({ image, onDelete }: { image: PostImage; onDelete: (id: string) => void }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const isAnalysed = !!image.analysed_at
  const topics = image.ai_topics || []
  const mood = image.ai_mood ? (MOOD_CSS[image.ai_mood] || null) : null

  async function handleDelete() {
    setDeleting(true)
    await fetch(`/api/images/${image.id}`, { method: 'DELETE' })
    onDelete(image.id)
  }

  return (
    <div className="relative group overflow-hidden"
      style={{ borderRadius: 'var(--r-lg)', border: '1px solid var(--line)', background: 'var(--surface)' }}>
      <div className="aspect-square relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image.public_url} alt={image.file_name || ''} className="w-full h-full object-cover" />

        {!isAnalysed && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2"
            style={{ background: 'rgba(0,0,0,0.6)' }}>
            <Loader2 className="w-5 h-5 text-white animate-spin" />
            <span style={{ color: '#fff', fontSize: 11, fontWeight: 600 }}>Analysing…</span>
          </div>
        )}

        {isAnalysed && (
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3"
            style={{ background: 'rgba(0,0,0,0.72)' }}>
            <div className="flex justify-end gap-1.5">
              <Link
                href={`/dashboard/generate?imageId=${image.id}`}
                className="flex items-center gap-1 transition-opacity hover:opacity-80"
                style={{ fontSize: 11, fontWeight: 600, background: '#fff', color: 'var(--ink)', borderRadius: 'var(--r-sm)', padding: '4px 8px' }}
              >
                Use in Post <ExternalLink className="w-3 h-3" />
              </Link>
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center justify-center transition-opacity hover:opacity-80"
                style={{ padding: 6, borderRadius: 'var(--r-sm)', background: 'rgba(220,38,38,0.85)', color: '#fff' }}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            {image.ai_description && (
              <p className="line-clamp-3" style={{ color: '#fff', fontSize: 11, lineHeight: 1.45 }}>{image.ai_description}</p>
            )}
          </div>
        )}
      </div>

      <div className="p-2.5">
        {mood && image.ai_mood && (
          <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 'var(--r-full)', background: mood.bg, color: mood.color }}>
            {image.ai_mood}
          </span>
        )}
        {topics.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {topics.slice(0, 2).map(t => (
              <span key={t} style={{ fontSize: 10, background: 'var(--surface-2)', color: 'var(--ink-4)', border: '1px solid var(--line)', borderRadius: 'var(--r-full)', padding: '2px 6px' }}>{t}</span>
            ))}
            {topics.length > 2 && (
              <span style={{ fontSize: 10, color: 'var(--ink-4)' }}>+{topics.length - 2}</span>
            )}
          </div>
        )}
      </div>

      {confirmDelete && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-3"
          style={{ background: 'var(--surface)', borderRadius: 'var(--r-lg)' }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', textAlign: 'center' }}>Delete this photo?</p>
          <div className="flex gap-2">
            <button onClick={handleDelete} disabled={deleting}
              className="flex items-center justify-center gap-1 transition-opacity hover:opacity-80"
              style={{ height: 28, padding: '0 10px', borderRadius: 'var(--r-sm)', background: '#ef4444', color: '#fff', fontSize: 12, fontWeight: 600, opacity: deleting ? 0.6 : 1 }}>
              {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Delete'}
            </button>
            <button onClick={() => setConfirmDelete(false)}
              className="transition-opacity hover:opacity-70"
              style={{ height: 28, padding: '0 10px', borderRadius: 'var(--r-sm)', border: '1px solid var(--line)', background: 'var(--surface-2)', color: 'var(--ink-2)', fontSize: 12, fontWeight: 500 }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function PhotoIdeasSection({ plan }: { plan: string }) {
  const STORAGE_KEY = 'photo_brief_prompts'
  const [prompts, setPrompts] = useState<string[]>(() => {
    if (typeof window === 'undefined') return []
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const isPaid = plan === 'standard' || plan === 'pro'

  async function fetchIdeas() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/images/brief-prompts')
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      setPrompts(data.prompts || [])
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data.prompts || []))
    } catch {
      setError('Failed to generate ideas. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!isPaid) {
    return (
      <div className="mb-6 flex items-start gap-4 p-5"
        style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', background: 'var(--surface)' }}>
        <div className="relative shrink-0">
          <div className="flex items-center justify-center"
            style={{ width: 44, height: 44, borderRadius: 'var(--r-md)', background: 'var(--surface-2)' }}>
            <Camera className="w-5 h-5" style={{ color: 'var(--ink-4)' }} strokeWidth={1.5} />
          </div>
          <div className="absolute -bottom-1 -right-1 flex items-center justify-center"
            style={{ width: 20, height: 20, borderRadius: '50%', background: '#f59e0b', boxShadow: 'var(--sh-1)' }}>
            <Lock className="w-2.5 h-2.5 text-white" strokeWidth={2.5} />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)', marginBottom: 4 }}>AI Photo Ideas for This Month</div>
          <p style={{ fontSize: 13, color: 'var(--ink-4)', lineHeight: 1.55, marginBottom: 12 }}>
            Get 5 specific, actionable photo prompts tailored to your industry and content pillars — so you always know what to shoot.
          </p>
          <Link href="/dashboard/settings?tab=plan"
            className="flex items-center gap-1.5 w-fit transition-opacity hover:opacity-80"
            style={{ padding: '7px 14px', borderRadius: 'var(--r-sm)', background: 'var(--pl-accent)', color: '#fff', fontSize: 13, fontWeight: 600 }}>
            <Zap className="w-3.5 h-3.5" /> Upgrade to Standard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-6 p-5"
      style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', background: 'var(--surface)' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center"
            style={{ width: 36, height: 36, borderRadius: 'var(--r-md)', background: 'var(--pl-accent-soft)' }}>
            <Lightbulb className="w-4 h-4" style={{ color: 'var(--pl-accent)' }} strokeWidth={1.75} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>Photo Ideas for This Month</div>
            <div style={{ fontSize: 12, color: 'var(--ink-4)', fontFamily: 'var(--f-mono)' }}>// AI-generated shots tailored to your content pillars</div>
          </div>
        </div>
        <button
          onClick={fetchIdeas}
          disabled={loading}
          className="flex items-center gap-1.5 transition-opacity hover:opacity-70"
          style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', background: 'var(--surface-2)', color: 'var(--ink-2)', fontSize: 12, fontWeight: 500, padding: '6px 12px', opacity: loading ? 0.6 : 1 }}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {prompts.length > 0 ? 'Refresh' : 'Get Ideas'}
        </button>
      </div>

      {error && <div style={{ fontSize: 13, color: '#ef4444', marginBottom: 12 }}>{error}</div>}

      {loading && prompts.length === 0 && (
        <div className="flex flex-col gap-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton h-14 rounded-xl" />
          ))}
        </div>
      )}

      {prompts.length > 0 && (
        <div className="flex flex-col gap-2">
          {prompts.map((prompt, i) => (
            <div key={i} className="flex items-start gap-3 px-4 py-3"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)' }}>
              <span className="text-lg shrink-0 mt-0.5">{IDEA_ICONS[i % IDEA_ICONS.length]}</span>
              <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>{prompt}</p>
            </div>
          ))}
          <p style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 4 }}>
            Take these photos and upload them above — they&apos;ll be ready to use when generating posts.
          </p>
        </div>
      )}

      {!loading && prompts.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Camera className="w-10 h-10 mb-3" style={{ color: 'var(--line-2)' }} strokeWidth={1.5} />
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink-2)', marginBottom: 4 }}>No ideas yet</div>
          <div style={{ fontSize: 13, color: 'var(--ink-4)' }}>Click &quot;Get Ideas&quot; to generate this month&apos;s photo brief</div>
        </div>
      )}
    </div>
  )
}

export default function UploadPage() {
  const router = useRouter()
  const [images, setImages] = useState<PostImage[]>([])
  const [loadingImages, setLoadingImages] = useState(true)
  const [uploadQueue, setUploadQueue] = useState<UploadFile[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [plan, setPlan] = useState('starter')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadImages = useCallback(async () => {
    const res = await fetch('/api/images')
    const data = await res.json()
    setImages(data.images || [])
    setLoadingImages(false)
  }, [])

  useEffect(() => {
    fetch('/api/me').then(r => r.json()).then(d => {
      if (d.profile?.plan) setPlan(d.profile.plan)
    }).catch(() => {})
    loadImages()
  }, [loadImages])

  useEffect(() => {
    const unanalysed = images.filter(img => !img.analysed_at)
    if (!unanalysed.length) return
    const timer = setTimeout(loadImages, 3000)
    return () => clearTimeout(timer)
  }, [images, loadImages])

  async function uploadFiles(files: File[]) {
    const allowed = files.filter(f => ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'].includes(f.type))
    if (!allowed.length) return

    const chunks: File[][] = []
    for (let i = 0; i < allowed.length; i += 4) chunks.push(allowed.slice(i, i + 4))

    for (const chunk of chunks) {
      const queueEntries: UploadFile[] = chunk.map(f => ({ name: f.name, status: 'uploading', progress: 50 }))
      setUploadQueue(q => [...q, ...queueEntries])

      const form = new FormData()
      chunk.forEach(f => form.append('files', f))

      try {
        setUploadQueue(q => q.map(e => chunk.find(f => f.name === e.name) ? { ...e, status: 'analysing', progress: 80 } : e))
        const res = await fetch('/api/images/upload', { method: 'POST', body: form })
        const data = await res.json()

        for (const result of data.results || []) {
          if (result.image) {
            setImages(prev => [result.image, ...prev])
            setUploadQueue(q => q.map(e => e.name === result.image.file_name ? { ...e, status: 'done', progress: 100 } : e))
          } else if (result.error) {
            setUploadQueue(q => q.map(e => {
              const name = result.error.split(':')[0]
              return e.name === name ? { ...e, status: 'error', error: result.error, progress: 0 } : e
            }))
          }
        }
      } catch {
        setUploadQueue(q => q.map(e => chunk.find(f => f.name === e.name) ? { ...e, status: 'error', error: 'Upload failed', progress: 0 } : e))
      }
    }

    setTimeout(() => setUploadQueue(q => q.filter(e => e.status !== 'done')), 3000)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false)
    uploadFiles(Array.from(e.dataTransfer.files))
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    uploadFiles(Array.from(e.target.files || []))
    e.target.value = ''
  }

  return (
    <div className="p-3 sm:p-4 md:p-8 max-w-[900px]">
      <div className="mb-6">
        <h1 style={{ fontFamily: 'var(--f-sans)', fontWeight: 600, fontSize: 22, color: 'var(--ink)', letterSpacing: '-0.025em', marginBottom: 4 }}>
          Image Library
        </h1>
        <p style={{ fontSize: 13, color: 'var(--ink-4)', fontFamily: 'var(--f-mono)' }}>
          // upload photos — AI analyses them for hooks, mood, and topics
        </p>
      </div>

      <PhotoIdeasSection plan={plan} />

      {/* Upload zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className="cursor-pointer transition-all mb-4 flex flex-col items-center justify-center p-10 text-center"
        style={{
          border: `2px dashed ${dragOver ? 'var(--pl-accent)' : 'var(--line-2)'}`,
          borderRadius: 'var(--r-lg)',
          background: dragOver ? 'var(--pl-accent-soft)' : 'var(--surface)',
        }}
      >
        <CloudUpload className="w-10 h-10 mb-3" style={{ color: dragOver ? 'var(--pl-accent)' : 'var(--ink-4)' }} strokeWidth={1.5} />
        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)', marginBottom: 4 }}>
          Drag photos here or click to browse
        </div>
        <div style={{ fontSize: 13, color: 'var(--ink-4)' }}>
          JPG, PNG, WebP, HEIC — up to 10 MB each, 4 at a time
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic"
          multiple
          className="hidden"
          onChange={handleInput}
        />
      </div>

      {/* Upload queue */}
      {uploadQueue.length > 0 && (
        <div className="flex flex-col gap-2 mb-6">
          {uploadQueue.map((f, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3"
              style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-md)', background: 'var(--surface)' }}>
              <div className="flex-1 min-w-0">
                <div className="truncate" style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-2)' }}>{f.name}</div>
                {f.status === 'uploading' && (
                  <div className="mt-1.5 h-1 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
                    <div className="h-full w-1/2 animate-pulse rounded-full" style={{ background: 'var(--pl-accent)' }} />
                  </div>
                )}
                {f.status === 'analysing' && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <Loader2 className="w-3 h-3 animate-spin" style={{ color: 'var(--pl-accent)' }} />
                    <span style={{ fontSize: 11, color: 'var(--pl-accent)', fontWeight: 500 }}>Analysing with AI…</span>
                  </div>
                )}
                {f.status === 'error' && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 2 }}>{f.error}</div>}
              </div>
              {f.status === 'done' && <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: '#10b981' }} />}
              {f.status === 'error' && <X className="w-4 h-4 shrink-0" style={{ color: '#ef4444' }} />}
            </div>
          ))}
        </div>
      )}

      {/* Library header */}
      <div className="flex items-center justify-between mb-3">
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-4)', fontFamily: 'var(--f-mono)' }}>
          // your photos {images.length > 0 && `(${images.length})`}
        </div>
      </div>

      {loadingImages ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square skeleton rounded-xl" />
          ))}
        </div>
      ) : images.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center"
          style={{ border: '2px dashed var(--line)', borderRadius: 'var(--r-lg)' }}>
          <ImageIcon className="w-12 h-12 mb-3" style={{ color: 'var(--line-2)' }} strokeWidth={1.5} />
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink-2)', marginBottom: 4 }}>No photos yet</div>
          <div style={{ fontSize: 13, color: 'var(--ink-4)', marginBottom: 16 }}>Upload your first photo above</div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 transition-opacity hover:opacity-80"
            style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', background: 'var(--surface-2)', color: 'var(--ink-2)', fontSize: 13, fontWeight: 500, padding: '8px 16px' }}>
            <CloudUpload className="w-4 h-4" /> Upload Photos
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map(img => (
            <ImageCard
              key={img.id}
              image={img}
              onDelete={id => setImages(prev => prev.filter(i => i.id !== id))}
            />
          ))}
        </div>
      )}

      <div className="mt-8">
        <button
          onClick={() => router.push('/dashboard/generate')}
          className="flex items-center gap-2 transition-opacity hover:opacity-70"
          style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', background: 'var(--surface-2)', color: 'var(--ink-2)', fontSize: 13, fontWeight: 500, padding: '8px 16px' }}>
          Generate a post →
        </button>
      </div>
    </div>
  )
}

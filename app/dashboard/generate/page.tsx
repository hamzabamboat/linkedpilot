'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import posthog from 'posthog-js'
import { supabase, StoryBank, Post } from '@/lib/supabase'
import { PostCard, PostCardSkeleton } from '@/components/post-card'
import { ImageSelector } from '@/components/image-selector'
import { AiImageButton } from '@/components/ai-image-button'
import { PostImage } from '@/lib/supabase'
import {
  Loader2, Mic, MicOff, FolderOpen, Sparkles, CalendarClock, Mail,
  BookOpen, Lock, Zap, Check, Save, ArrowLeft, ImageIcon, Upload, X,
  CheckCircle2, ArrowRight, Brain,
} from 'lucide-react'
import { toast } from 'sonner'

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length
  const dp: number[] = Array.from({ length: n + 1 }, (_, i) => i)
  for (let i = 1; i <= m; i++) {
    let prev = dp[0]; dp[0] = i
    for (let j = 1; j <= n; j++) {
      const temp = dp[j]
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1])
      prev = temp
    }
  }
  return dp[n]
}

const LOADING_MESSAGES = [
  'Researching your industry...',
  'Writing in your voice...',
  'Crafting the hook...',
  'Adding hashtags...',
  'Polishing the post...',
]

function buildBatchSteps(postsLimit: number): string[] {
  const numBatches = Math.ceil(postsLimit / 10)
  const writingSteps = Array.from({ length: numBatches }, (_, i) => {
    const start = i * 10 + 1
    const end = Math.min((i + 1) * 10, postsLimit)
    return `Writing posts ${start}–${end}...`
  })
  return [
    'Analysing your profile and content pillars',
    'Researching trending topics in your industry',
    ...writingSteps,
    'Adding hashtags and optimising reach',
    'Scheduling across the month',
    'Done!',
  ]
}

function estimateEtaSecs(postsLimit: number): number {
  return Math.ceil(postsLimit / 10) * 35 + 30
}

type Tab = 'prompt' | 'voice' | 'story' | 'bulk'

/* ── Upgrade prompt ──────────────────────────────────────── */
function UpgradePrompt({ feature, minPlan, icon: Icon }: { feature: string; minPlan: string; icon: React.ElementType }) {
  return (
    <div className="db-empty">
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <div style={{ width: 56, height: 56, borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-3)' }}>
          <Icon style={{ width: 26, height: 26, color: 'var(--ink-4)' }} strokeWidth={1.5} />
        </div>
        <div style={{ position: 'absolute', bottom: -4, right: -4, width: 22, height: 22, borderRadius: '50%', background: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Lock size={10} color="#fff" strokeWidth={2.5} />
        </div>
      </div>
      <strong>{feature}</strong>
      <span>This feature is available on <strong style={{ color: 'var(--ink-2)' }}>{minPlan}</strong> and above.</span>
      <Link href="/dashboard/settings?tab=plan" className="btn-dash btn-dash--primary" style={{ marginTop: 4 }}>
        <Zap size={13} /> Upgrade Plan
      </Link>
    </div>
  )
}

/* ── Image upload section ────────────────────────────────── */
function ImageUploadSection({ onUpload }: { onUpload: (url: string) => void }) {
  const [uploading, setUploading] = useState(false)
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([])
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function uploadFile(file: File) {
    if (!file) return
    setUploading(true)
    const form = new FormData()
    form.append('file', file)
    try {
      const res = await fetch('/api/upload/image', { method: 'POST', body: form })
      const data = await res.json()
      if (data.url) { setUploadedUrls(prev => [...prev, data.url]); onUpload(data.url) }
    } catch {} finally { setUploading(false) }
  }

  return (
    <div style={{ borderTop: '1px solid var(--line)', paddingTop: 16, marginTop: 4 }}>
      <label className="db-label"><ImageIcon size={10} style={{ display: 'inline', marginRight: 4 }} />// add image</label>
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f?.type.startsWith('image/')) uploadFile(f) }}
        onClick={() => fileInputRef.current?.click()}
        className="upload-drop"
        style={{ minHeight: 100, borderColor: dragOver ? 'var(--accent)' : undefined, background: dragOver ? 'var(--accent-soft)' : undefined }}
      >
        {uploading
          ? <><Loader2 size={18} className="animate-spin" style={{ color: 'var(--ink-4)' }} /><span style={{ fontSize: 13, color: 'var(--ink-4)' }}>Uploading...</span></>
          : <><Upload size={18} style={{ color: 'var(--ink-4)' }} /><span style={{ fontSize: 13, color: 'var(--ink-3)' }}>Drop image or click to upload</span><span style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--f-mono)' }}>JPG · PNG · GIF · WebP — 5 MB max</span></>
        }
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = '' }} />
      </div>
      {uploadedUrls.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
          {uploadedUrls.map((url, i) => (
            <div key={i} style={{ position: 'relative', width: 60, height: 60, borderRadius: 'var(--r-sm)', overflow: 'hidden', border: '1px solid var(--line)' }}
              className="group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <button onClick={e => { e.stopPropagation(); setUploadedUrls(prev => prev.filter((_, j) => j !== i)) }}
                style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity .15s', border: 'none', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '0')}>
                <X size={13} color="#fff" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Batch generate tab ──────────────────────────────────── */
function BulkTab({ plan, postsLimit, postsRemaining, monthName }: { plan: string; postsLimit: number | null; postsRemaining: number | null; monthName: string }) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedCount, setSelectedCount] = useState<number | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [simulatedPostCount, setSimulatedPostCount] = useState(0)
  const [elapsedSecs, setElapsedSecs] = useState(0)
  const [result, setResult] = useState<{ postsGenerated: number; nextPostDate: string | null } | null>(null)
  const [batchPosts, setBatchPosts] = useState<Post[]>([])
  const [loadingPosts, setLoadingPosts] = useState(false)
  const [error, setError] = useState('')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const batchStartRef = useRef<string>('')

  const remaining = postsRemaining ?? postsLimit ?? 12
  const effectiveCount = selectedCount ?? remaining
  const steps = buildBatchSteps(effectiveCount)
  const etaTotalSecs = estimateEtaSecs(effectiveCount)
  const writingStepStart = 2
  const writingStepEnd = steps.length - 4

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current) }, [])

  useEffect(() => {
    if (!loading) return
    if (currentStep < writingStepStart || currentStep > writingStepEnd) return
    const batchIdx = currentStep - writingStepStart
    const start = batchIdx * 10 + 1
    const end = Math.min((batchIdx + 1) * 10, effectiveCount)
    let count = start
    const timer = setInterval(() => { if (count <= end) setSimulatedPostCount(count++) }, 1200)
    return () => clearInterval(timer)
  }, [currentStep, loading, effectiveCount])

  useEffect(() => {
    if (!loading) { setElapsedSecs(0); return }
    const timer = setInterval(() => setElapsedSecs(s => s + 1), 1000)
    return () => clearInterval(timer)
  }, [loading])

  async function handleBatchGenerate() {
    setShowConfirm(false); setLoading(true); setError(''); setResult(null); setBatchPosts([])
    setCurrentStep(0); setSimulatedPostCount(0)
    batchStartRef.current = new Date().toISOString()
    intervalRef.current = setInterval(() => setCurrentStep(s => Math.min(s + 1, steps.length - 2)), 4000)
    try {
      const res = await fetch('/api/posts/generate-batch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ count: effectiveCount }) })
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      setResult({ postsGenerated: data.postsGenerated, nextPostDate: data.nextPostDate })
      setLoadingPosts(true)
      const postsData = await fetch(`/api/posts?since=${encodeURIComponent(batchStartRef.current)}&order=scheduled_at`).then(r => r.json())
      setBatchPosts(postsData.posts || []); setLoadingPosts(false)
    } catch { setError('Something went wrong. Please try again.') }
    finally { if (intervalRef.current) clearInterval(intervalRef.current); setLoading(false) }
  }

  if (postsLimit === null || postsRemaining === null) {
    return <div className="gen-card" style={{ height: 80, background: 'var(--surface-3)', animation: 'shimmer 1.5s infinite' }} />
  }

  if (loading) {
    const remainingSecs = Math.max(0, etaTotalSecs - elapsedSecs)
    const etaLabel = remainingSecs > 60 ? `~${Math.ceil(remainingSecs / 60)} min remaining` : remainingSecs > 5 ? `~${remainingSecs}s remaining` : 'Finishing up...'
    return (
      <div style={{ position: 'fixed', inset: 0, backdropFilter: 'blur(8px)', zIndex: 50, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, background: 'rgba(var(--bg), 0.95)' }}>
        <h2 style={{ color: 'var(--ink)', fontFamily: 'var(--f-sans)', fontSize: 20, fontWeight: 600, margin: 0 }}>Generating posts for {monthName}...</h2>
        <p style={{ color: 'var(--ink-4)', fontFamily: 'var(--f-mono)', fontSize: 12, margin: 0 }}>{etaLabel}</p>
        <div style={{ width: 260, height: 6, borderRadius: 99, overflow: 'hidden', background: 'var(--line-2)' }}>
          <div style={{ height: '100%', borderRadius: 99, transition: 'width 1s', width: `${((currentStep + 1) / steps.length) * 100}%`, background: 'var(--accent)' }} />
        </div>
        <p style={{ color: 'var(--ink-3)', fontSize: 13, margin: 0 }}>
          {currentStep >= writingStepStart && currentStep <= writingStepEnd
            ? `Generating post ${simulatedPostCount || 1} of ${effectiveCount}...`
            : steps[currentStep]}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'left', width: '100%', maxWidth: 300 }}>
          {steps.map((step, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: i < currentStep ? '#059669' : i === currentStep ? 'var(--accent)' : 'var(--ink-4)' }}>
              <span style={{ fontSize: 11, width: 16, flexShrink: 0 }}>{i < currentStep ? '✓' : i === currentStep ? '▶' : '○'}</span>
              <span>{step}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (result) {
    return (
      <div className="gen-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CheckCircle2 size={18} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: 600, color: 'var(--ink)', fontSize: 14 }}>{result.postsGenerated} posts generated for {monthName}</div>
            {result.nextPostDate && <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>Next post: {result.nextPostDate}</div>}
          </div>
        </div>
        {loadingPosts
          ? <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{[1,2,3].map(i => <PostCardSkeleton key={i} />)}</div>
          : batchPosts.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 480, overflowY: 'auto' }}>
              {batchPosts.map(post => <PostCard key={post.id} id={post.id} content={post.content} scheduledAt={post.scheduled_at} status={post.status} />)}
            </div>
          )}
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/dashboard/calendar" className="btn-dash btn-dash--primary btn-dash--sm">
            View in Calendar <ArrowRight size={12} />
          </Link>
          <Link href="/dashboard/posts" className="btn-dash btn-dash--ghost btn-dash--sm">
            All posts
          </Link>
        </div>
      </div>
    )
  }

  if (showConfirm) {
    const presets = Array.from(new Set([1, 5, 10, 15, 20, 25, 30].filter(n => n < remaining).concat([remaining]))).sort((a, b) => a - b)
    return (
      <div className="gen-card">
        <label className="db-label">// how many posts?</label>
        <div className="pill-row">
          {presets.map(n => (
            <button key={n} type="button" onClick={() => setSelectedCount(n === remaining ? null : n)}
              className="trend-tag"
              style={{
                background: effectiveCount === n ? 'var(--accent)' : 'var(--accent-soft)',
                color: effectiveCount === n ? '#fff' : 'var(--accent)',
                borderColor: effectiveCount === n ? 'var(--accent)' : undefined,
                cursor: 'pointer',
                fontWeight: 600,
              }}>
              {n === remaining ? `All ${n}` : n}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-4)', fontFamily: 'var(--f-mono)' }}>
          {effectiveCount === remaining
            ? `Generating all ${remaining} remaining post${remaining !== 1 ? 's' : ''} this month`
            : `Generating ${effectiveCount} of ${remaining} remaining post${remaining !== 1 ? 's' : ''} this month`}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleBatchGenerate} className="btn-dash btn-dash--primary">
            <Sparkles size={13} /> Generate {effectiveCount} post{effectiveCount !== 1 ? 's' : ''}
          </button>
          <button onClick={() => setShowConfirm(false)} className="btn-dash btn-dash--outline">
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="gen-card">
      <label className="db-label">// bulk · plan a month</label>
      <div>
        <h3 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>Generate posts for {monthName}</h3>
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'var(--ink-3)' }}>
          AI writes LinkedIn posts in your voice and schedules them across the month.
          {remaining > 0
            ? ` You have ${remaining} post${remaining !== 1 ? 's' : ''} remaining this month.`
            : " You've used all your posts this month."}
        </p>
      </div>
      {error && <div style={{ padding: '10px 14px', borderRadius: 'var(--r-sm)', fontSize: 13, color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca' }}>{error}</div>}
      <button onClick={() => setShowConfirm(true)} disabled={remaining === 0} className="btn-dash btn-dash--primary" style={{ alignSelf: 'flex-start' }}>
        <Sparkles size={13} /> Generate posts →
      </button>
    </div>
  )
}

/* ── Main generate content ───────────────────────────────── */
function GenerateContent() {
  const searchParams = useSearchParams()
  const initTab = (searchParams.get('tab') as Tab) || 'prompt'
  const initIdea = searchParams.get('idea') || ''
  const initPrompt = searchParams.get('prompt') || ''
  const initStoryId = searchParams.get('storyId') || ''

  const [tab, setTab] = useState<Tab>(initTab)
  const [topic, setTopic] = useState(initIdea ? decodeURIComponent(initIdea) : initPrompt ? decodeURIComponent(initPrompt) : '')
  const [additionalContext, setAdditionalContext] = useState('')
  const [generatedPosts, setGeneratedPosts] = useState<Array<{ id: string; content: string }>>([])
  const [selectedPost, setSelectedPost] = useState<{ id: string; content: string } | null>(null)
  const [editContent, setEditContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [actionResult, setActionResult] = useState('')
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduling, setScheduling] = useState(false)
  const [plan, setPlan] = useState('starter')
  const [postsLimit, setPostsLimit] = useState<number | null>(null)
  const [postsRemaining, setPostsRemaining] = useState<number | null>(null)
  const [uploadedImageUrl, setUploadedImageUrl] = useState('')
  const [recording, setRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [transcribing, setTranscribing] = useState(false)
  const [voiceNoteId, setVoiceNoteId] = useState<string | null>(null)
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const autoGenerateFiredRef = useRef(false)
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0])
  const loadingMsgIdx = useRef(0)
  const [imageSuggestions, setImageSuggestions] = useState<Array<{ icon: string; suggestion: string; why: string }>>([])
  const [fetchingImages, setFetchingImages] = useState(false)
  const [selectedImages, setSelectedImages] = useState<PostImage[]>([])
  const [imageSelectorOpen, setImageSelectorOpen] = useState(false)
  const [pendingPillar, setPendingPillar] = useState<string | null>(null)
  const [voiceImages, setVoiceImages] = useState<File[]>([])
  const [storyImages, setStoryImages] = useState<File[]>([])
  const voiceImgRef = useRef<HTMLInputElement>(null)
  const storyImgRef = useRef<HTMLInputElement>(null)
  const [stories, setStories] = useState<StoryBank[]>([])
  const [newStory, setNewStory] = useState('')
  const [savingStory, setSavingStory] = useState(false)
  const [selectedStory, setSelectedStory] = useState<StoryBank | null>(null)
  const [contentPillars, setContentPillars] = useState<string[]>([])
  const [selectedTone, setSelectedTone] = useState('')

  const monthName = new Date().toLocaleDateString('en-IN', { month: 'long' })

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch('/api/me').then(r => r.json()),
      fetch('/api/usage').then(r => r.json()),
    ]).then(([meData, usageData]) => {
      if (cancelled) return
      if (meData.profile) {
        setPlan(meData.profile.plan || 'starter')
        setPostsLimit(meData.profile.posts_limit ?? 12)
        if (meData.profile.content_pillars?.length) setContentPillars(meData.profile.content_pillars)
      }
      if (usageData.usage?.posts_generated) setPostsRemaining(usageData.usage.posts_generated.remaining)
    }).catch(() => {})
    loadStories()
    const imageId = searchParams.get('imageId')
    if (imageId) {
      fetch('/api/images').then(r => r.json()).then(data => {
        if (cancelled) return
        const img = (data.images || []).find((i: PostImage) => i.id === imageId)
        if (img) setSelectedImages([img])
      }).catch(() => {})
    }
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (initStoryId && !autoGenerateFiredRef.current) {
      autoGenerateFiredRef.current = true
      handleGenerate(initStoryId)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadStories() {
    try {
      const res = await fetch('/api/story-bank')
      if (!res.ok) return
      const { stories: data } = await res.json()
      setStories(data || [])
      if (initStoryId && data) {
        const match = data.find((s: StoryBank) => s.id === initStoryId)
        if (match) setSelectedStory(match)
      }
    } catch { /* non-fatal */ }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = e => chunksRef.current.push(e.data)
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        stream.getTracks().forEach(t => t.stop())
        setTranscribing(true)
        const form = new FormData()
        form.append('audio', blob, 'recording.webm')
        try {
          const res = await fetch('/api/transcribe', { method: 'POST', body: form })
          const data = await res.json()
          if (data.transcript) setTranscript(data.transcript)
          if (data.voiceNoteId) setVoiceNoteId(data.voiceNoteId)
        } catch {} finally { setTranscribing(false) }
      }
      recorder.start(); mediaRef.current = recorder; setRecording(true)
    } catch (err) {
      const isDenied = err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')
      if (isDenied) {
        toast.error('Microphone access denied', { description: 'Enable in browser site settings.', duration: 8000 })
      } else {
        setError('Could not access microphone.')
      }
    }
  }

  function stopRecording() { mediaRef.current?.stop(); setRecording(false) }

  async function transcribeAudio(blob: Blob, fileName = 'recording.webm') {
    setTranscribing(true); setError('')
    const form = new FormData()
    form.append('audio', blob, fileName)
    const res = await fetch('/api/transcribe', { method: 'POST', body: form })
    const data = await res.json()
    setTranscribing(false)
    if (data.error) { setError(data.error); return }
    setTranscript(data.transcript); setVoiceNoteId(data.voiceNoteId)
  }

  async function saveStory() {
    if (!newStory.trim()) return
    setSavingStory(true)
    const res = await fetch('/api/story-bank', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ raw_text: newStory }) })
    const data = await res.json()
    setSavingStory(false)
    if (data.error) { setError(data.error); return }
    setNewStory(''); loadStories()
  }

  async function handleGenerate(overrideStoryId?: string) {
    setLoading(true); setError(''); setGeneratedPosts([]); setSelectedPost(null); setImageSuggestions([])
    loadingMsgIdx.current = 0; setLoadingMsg(LOADING_MESSAGES[0])
    const interval = setInterval(() => {
      loadingMsgIdx.current = (loadingMsgIdx.current + 1) % LOADING_MESSAGES.length
      setLoadingMsg(LOADING_MESSAGES[loadingMsgIdx.current])
    }, 2000)
    try {
      const tonePrefix = selectedTone ? `Write in a ${selectedTone.toLowerCase()} tone. ` : ''
      const body: Record<string, unknown> = { additionalContext: tonePrefix + additionalContext }
      // overrideStoryId is always a story-bank generation regardless of current tab state
      if (overrideStoryId) {
        body.storyBankId = overrideStoryId
      } else if (tab === 'prompt') {
        body.topic = topic
      } else if (tab === 'voice') {
        body.voiceNoteId = voiceNoteId
      } else if (tab === 'story') {
        const storyId = selectedStory?.id
        if (storyId) body.storyBankId = storyId
      }
      if (selectedImages.length > 0) body.imageIds = selectedImages.map(img => img.id)
      const res = await fetch('/api/posts/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      let data: Record<string, unknown>
      try { data = await res.json() } catch { setError('Server error — could not parse response.'); return }
      if (data.error) {
        if (data.error === 'trial_exhausted') { posthog.capture('post_generation_limit_reached', { reason: 'trial_exhausted' }); setError('Post limit reached. Upgrade to continue.') }
        else { setError(data.error as string) }
        return
      }
      const posts = data.posts as Array<{ id: string; content: string }> | undefined
      if (!posts?.length) { setError('No posts generated. Please try again.'); return }
      setGeneratedPosts(posts)
      if (overrideStoryId || initStoryId) selectPost(posts[0])
    } catch { setError('Generation failed — check your connection.') }
    finally { clearInterval(interval); setLoading(false) }
  }

  const originalDraftRef = useRef<string>('')

  function selectPost(post: { id: string; content: string }) {
    setSelectedPost(post); setEditContent(post.content); setActionResult(''); setScheduleDate(''); setImageSuggestions([]); setUploadedImageUrl('')
    originalDraftRef.current = post.content
    fetchImageSuggestions(post.content)
  }

  async function fetchImageSuggestions(postContent: string) {
    setFetchingImages(true)
    try {
      const res = await fetch('/api/posts/image-suggestions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ postContent }) })
      const data = await res.json()
      if (!data.error) setImageSuggestions(data.suggestions || [])
    } finally { setFetchingImages(false) }
  }

  async function schedulePost() {
    if (!selectedPost || !scheduleDate) return
    setScheduling(true)
    const original = originalDraftRef.current
    if (original && editContent !== original) {
      const dist = levenshtein(original, editContent)
      posthog.capture('post_edited_before_publish', { post_id: selectedPost.id, edit_percent: Math.round((dist / original.length) * 100) })
    }
    await fetch(`/api/posts/${selectedPost.id}/update`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: editContent, image_url: uploadedImageUrl || undefined }) })
    const res = await fetch(`/api/posts/${selectedPost.id}/schedule`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scheduledAt: scheduleDate }) })
    const data = await res.json()
    setScheduling(false); setActionResult(data.error ? `Error: ${data.error}` : 'scheduled')
  }

  async function sendApproval() {
    if (!selectedPost) return
    const res = await fetch(`/api/posts/${selectedPost.id}/send-approval`, { method: 'POST' })
    const data = await res.json()
    setActionResult(data.error ? `Error: ${data.error}` : 'approval_sent')
  }

  const canGenerate = tab === 'prompt' ? topic.trim().length > 0 : tab === 'voice' ? !!voiceNoteId : !!selectedStory

  return (
    <div className="db-screen">
      {/* ── Page header ── */}
      <div className="db-screen__head">
        <div>
          <div className="db-screen__eyebrow">// Generate</div>
          <h1 className="db-screen__title">A draft, <em>in your voice — in under thirty seconds.</em></h1>
        </div>
        <div className="db-screen__actions">
          <AiImageButton plan={plan} postContent={topic} onSelect={imgs => setSelectedImages(imgs)} />
          <Link href="/dashboard/posts" className="btn-dash btn-dash--outline">
            <ArrowLeft size={13} /> All Posts
          </Link>
        </div>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div style={{ marginBottom: 18, padding: '10px 16px', borderRadius: 'var(--r-sm)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
          {error}
          {error.includes('limit') && <Link href="/dashboard/settings?tab=plan" style={{ marginLeft: 4, fontWeight: 600, textDecoration: 'underline' }}>Upgrade →</Link>}
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="gen-tabs">
        {([
          { id: 'prompt', label: 'From a prompt',         icon: Brain },
          { id: 'voice',  label: 'From a voice note',     icon: Mic,      badge: plan === 'starter' ? 'STD+' : undefined },
          { id: 'story',  label: 'From your story bank',  icon: BookOpen, badge: undefined },
          { id: 'bulk',   label: 'Bulk · plan a month',   icon: Sparkles, badge: undefined },
        ] as Array<{ id: string; label: string; icon: React.ElementType; badge?: string }>).map(({ id, label, icon: Icon, badge }) => (
          <button key={id} onClick={() => setTab(id as Tab)} className={`gtab${tab === id ? ' is-on' : ''}`}>
            <Icon size={14} /> {label}
            {badge && <span className="trend-tag" style={{ fontSize: 9, padding: '2px 5px' }}>{badge}</span>}
          </button>
        ))}
      </div>

      {/* ── Two-column layout ── */}
      <div className="gen-grid">
        {/* ── LEFT: Input card ── */}
        <div>
          {tab === 'prompt' && (
            <div className="gen-card">
              <label className="db-label">// from a prompt</label>

              {/* Pillar pills */}
              {contentPillars.length > 0 && (
                <div>
                  <label className="db-label">// content pillars</label>
                  <div className="pill-row" style={{ marginTop: 6 }}>
                    {contentPillars.map(pillar => (
                      <button key={pillar} type="button" onClick={() => setPendingPillar(p => p === pillar ? null : pillar)}
                        className="trend-tag"
                        style={{
                          background: pendingPillar === pillar ? 'var(--accent)' : 'var(--accent-soft)',
                          color: pendingPillar === pillar ? '#fff' : 'var(--accent)',
                          borderColor: pendingPillar === pillar ? 'var(--accent)' : undefined,
                          cursor: 'pointer',
                        }}>
                        {pillar}
                      </button>
                    ))}
                  </div>
                  {pendingPillar && (
                    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '8px 12px', borderRadius: 'var(--r-sm)', background: 'var(--surface-2)', border: '1px solid var(--line)' }}>
                      <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                        <strong style={{ color: 'var(--ink)' }}>{pendingPillar}</strong> —
                      </span>
                      <button type="button" onClick={() => { setTopic(pendingPillar!); setPendingPillar(null) }}
                        className="btn-dash btn-dash--primary btn-dash--sm">
                        {topic.trim() ? 'Replace' : 'Use as topic'}
                      </button>
                      {topic.trim() && (
                        <button type="button" onClick={() => { setTopic(t => `${t.trimEnd()}, ${pendingPillar}`); setPendingPillar(null) }}
                          className="btn-dash btn-dash--outline btn-dash--sm">
                          Add to topic
                        </button>
                      )}
                      <button type="button" onClick={() => setPendingPillar(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-4)' }}>
                        <X size={13} />
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="db-field">
                <label className="db-label" htmlFor="topic">What do you want to post about?</label>
                <textarea
                  id="topic" value={topic} onChange={e => setTopic(e.target.value)}
                  placeholder="e.g. Why most startup advice is wrong, and what I learned building my first company..."
                  className="g-textarea"
                />
              </div>

              {/* Tone segmented control */}
              <div>
                <label className="db-label" style={{ marginBottom: 8 }}>// tone</label>
                <div className="seg">
                  {['Professional', 'Storytelling', 'Educational', 'Data-driven', 'Casual'].map(tone => (
                    <button key={tone} type="button" onClick={() => setSelectedTone(t => t === tone ? '' : tone)}
                      className={selectedTone === tone ? 'is-on' : ''}>
                      {tone}
                    </button>
                  ))}
                </div>
              </div>

              {/* Photos */}
              <div>
                <label className="db-label">// photos (optional)</label>
                <button type="button" onClick={() => setImageSelectorOpen(true)}
                  className="btn-dash btn-dash--outline" style={{ alignSelf: 'flex-start' }}>
                  <ImageIcon size={13} />
                  {selectedImages.length > 0 ? `${selectedImages.length} photo${selectedImages.length > 1 ? 's' : ''} selected` : 'Add Photos'}
                </button>
                {selectedImages.length > 0 && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                    {selectedImages.map(img => (
                      <div key={img.id} style={{ position: 'relative', width: 52, height: 52, borderRadius: 'var(--r-sm)', overflow: 'hidden', border: '1px solid var(--line)' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.public_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button onClick={() => setSelectedImages(prev => prev.filter(i => i.id !== img.id))}
                          style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', opacity: 0, transition: 'opacity .15s' }}
                          onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                          onMouseLeave={e => (e.currentTarget.style.opacity = '0')}>
                          <X size={12} color="#fff" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="db-field">
                <label className="db-label" htmlFor="context">Additional instructions <span style={{ fontWeight: 400, opacity: .7 }}>(optional)</span></label>
                <input id="context" value={additionalContext} onChange={e => setAdditionalContext(e.target.value)}
                  placeholder="e.g. Keep it under 200 words, mention a specific metric"
                  className="db-input" />
              </div>

              <div className="g-actions">
                <button onClick={() => handleGenerate()} disabled={loading || !canGenerate} className="btn-dash btn-dash--primary btn-dash--lg" style={{ width: '100%', justifyContent: 'center' }}>
                  {loading
                    ? <><Loader2 size={14} className="animate-spin" /> {loadingMsg}</>
                    : <><Sparkles size={14} /> Generate Post</>
                  }
                </button>
              </div>

              <ImageSelector open={imageSelectorOpen} onClose={() => setImageSelectorOpen(false)}
                onSelect={imgs => setSelectedImages(imgs)} maxSelect={4}
                alreadySelected={selectedImages.map(i => i.id)} onHookSelect={hook => setTopic(hook)}
                plan={plan} postContent={topic} />
            </div>
          )}

          {tab === 'voice' && (
            <div className="gen-card">
              {plan === 'starter'
                ? <UpgradePrompt feature="Voice Notes" minPlan="Standard" icon={Mic} />
                : (
                  <>
                    <label className="db-label">// from a voice note</label>
                    <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--ink-3)', margin: 0 }}>
                      Ramble for 2 minutes. We&apos;ll transcribe and turn it into a polished post.
                    </p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button onClick={recording ? stopRecording : startRecording}
                        className="btn-dash btn-dash--primary"
                        style={{ background: recording ? '#ef4444' : undefined }}>
                        {recording ? <><MicOff size={13} /> Stop Recording</> : <><Mic size={13} /> Start Recording</>}
                      </button>
                      <button onClick={() => fileInputRef.current?.click()} className="btn-dash btn-dash--outline">
                        <FolderOpen size={13} /> Upload Audio
                      </button>
                      <input ref={fileInputRef} type="file" accept="audio/*" style={{ display: 'none' }}
                        onChange={e => { const f = e.target.files?.[0]; if (f) transcribeAudio(f, f.name) }} />
                    </div>
                    {recording && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 'var(--r-sm)', background: '#fef2f2', border: '1px solid #fecaca' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', animation: 'plPulseDot 1.5s ease-in-out infinite' }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#dc2626' }}>Recording in progress...</span>
                      </div>
                    )}
                    {transcribing && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 'var(--r-sm)', background: 'var(--accent-soft)', border: '1px solid color-mix(in oklab, var(--accent) 20%, transparent)' }}>
                        <Loader2 size={13} className="animate-spin" style={{ color: 'var(--accent)' }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>Transcribing...</span>
                      </div>
                    )}
                    {transcript && (
                      <div style={{ padding: '12px 16px', borderRadius: 'var(--r-sm)', background: 'var(--surface-2)', border: '1px solid var(--line)' }}>
                        <label className="db-label">// transcript</label>
                        <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--ink-2)', margin: 0, marginTop: 6 }}>{transcript}</p>
                      </div>
                    )}
                    <div>
                      <label className="db-label">// photos from this moment (optional)</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                        {voiceImages.map((f, i) => (
                          <div key={i} style={{ position: 'relative', width: 60, height: 60, borderRadius: 'var(--r-sm)', overflow: 'hidden', border: '1px solid var(--line)' }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={URL.createObjectURL(f)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <button onClick={() => setVoiceImages(v => v.filter((_, j) => j !== i))}
                              style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', opacity: 0, transition: 'opacity .15s' }}
                              onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                              onMouseLeave={e => (e.currentTarget.style.opacity = '0')}>
                              <X size={13} color="#fff" />
                            </button>
                          </div>
                        ))}
                        {voiceImages.length < 5 && (
                          <button onClick={() => voiceImgRef.current?.click()}
                            style={{ width: 60, height: 60, borderRadius: 'var(--r-sm)', border: '2px dashed var(--line-2)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, cursor: 'pointer', background: 'none' }}>
                            <Upload size={13} style={{ color: 'var(--ink-4)' }} />
                            <span style={{ fontSize: 10, color: 'var(--ink-4)' }}>Add</span>
                          </button>
                        )}
                        <input ref={voiceImgRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
                          onChange={e => { const files = Array.from(e.target.files || []); setVoiceImages(v => [...v, ...files].slice(0, 5)); e.target.value = '' }} />
                      </div>
                    </div>
                    <div className="g-actions">
                      <button onClick={() => handleGenerate()} disabled={loading || !canGenerate} className="btn-dash btn-dash--primary btn-dash--lg" style={{ width: '100%', justifyContent: 'center' }}>
                        {loading
                          ? <><Loader2 size={14} className="animate-spin" /> {loadingMsg}</>
                          : <><Sparkles size={14} /> Generate Post</>
                        }
                      </button>
                    </div>
                  </>
                )
              }
            </div>
          )}

          {tab === 'story' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="gen-card">
                <label className="db-label">// dump a raw story</label>
                <textarea value={newStory} onChange={e => setNewStory(e.target.value)}
                  placeholder="This week I had a tough conversation with a potential investor..."
                  className="g-textarea" />
                {/* Story images */}
                <div>
                  <label className="db-label">// photos (optional)</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                    {storyImages.map((f, i) => (
                      <div key={i} style={{ position: 'relative', width: 60, height: 60, borderRadius: 'var(--r-sm)', overflow: 'hidden', border: '1px solid var(--line)' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={URL.createObjectURL(f)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button onClick={() => setStoryImages(v => v.filter((_, j) => j !== i))}
                          style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', opacity: 0, transition: 'opacity .15s' }}
                          onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                          onMouseLeave={e => (e.currentTarget.style.opacity = '0')}>
                          <X size={13} color="#fff" />
                        </button>
                      </div>
                    ))}
                    {storyImages.length < 5 && (
                      <button onClick={() => storyImgRef.current?.click()}
                        style={{ width: 60, height: 60, borderRadius: 'var(--r-sm)', border: '2px dashed var(--line-2)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, cursor: 'pointer', background: 'none' }}>
                        <Upload size={13} style={{ color: 'var(--ink-4)' }} />
                        <span style={{ fontSize: 10, color: 'var(--ink-4)' }}>Add</span>
                      </button>
                    )}
                    <input ref={storyImgRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
                      onChange={e => { const files = Array.from(e.target.files || []); setStoryImages(v => [...v, ...files].slice(0, 5)); e.target.value = '' }} />
                  </div>
                </div>
                <div className="g-actions">
                  <button onClick={saveStory} disabled={savingStory || !newStory.trim()} className="btn-dash btn-dash--outline">
                    {savingStory ? <><Loader2 size={13} className="animate-spin" /> Saving...</> : <><Save size={13} /> Save to Story Bank</>}
                  </button>
                </div>
              </div>

              {stories.length > 0 ? (
                <div>
                  <label className="db-label" style={{ marginBottom: 10 }}>// your story bank ({stories.length})</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                    {stories.map(s => (
                      <div key={s.id} onClick={() => setSelectedStory(selectedStory?.id === s.id ? null : s)}
                        style={{
                          background: 'var(--surface)',
                          border: `2px solid ${selectedStory?.id === s.id ? 'var(--accent)' : 'var(--line)'}`,
                          borderRadius: 'var(--r-md)',
                          padding: '14px 16px',
                          cursor: 'pointer',
                          transition: 'border-color .2s',
                        }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                          <p style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--ink-2)', margin: 0, flex: 1, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{s.raw_text}</p>
                          {selectedStory?.id === s.id && (
                            <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <Check size={11} color="#fff" strokeWidth={2.5} />
                            </div>
                          )}
                        </div>
                        <div style={{ fontSize: 10, marginTop: 8, color: 'var(--ink-4)', fontFamily: 'var(--f-mono)' }}>
                          {new Date(s.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {s.status}
                        </div>
                      </div>
                    ))}
                  </div>
                  {(selectedStory || initStoryId) && (
                    <div className="gen-card">
                      {selectedStory && (
                        <div className="db-field">
                          <label className="db-label" htmlFor="story-ctx">Additional context <span style={{ fontWeight: 400, opacity: .7 }}>(optional)</span></label>
                          <input id="story-ctx" value={additionalContext} onChange={e => setAdditionalContext(e.target.value)}
                            placeholder="e.g. Make it inspirational, add a question at the end"
                            className="db-input" />
                        </div>
                      )}
                      <div className="g-actions">
                        <button onClick={() => handleGenerate()} disabled={loading || !canGenerate} className="btn-dash btn-dash--primary btn-dash--lg" style={{ width: '100%', justifyContent: 'center' }}>
                          {loading
                            ? <><Loader2 size={14} className="animate-spin" /> {loadingMsg}</>
                            : <><Sparkles size={14} /> Generate Post</>
                          }
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="gen-card gen-card--ghost">
                  <div className="db-empty" style={{ padding: '32px 16px' }}>
                    <BookOpen size={28} style={{ color: 'var(--ink-4)' }} strokeWidth={1.5} />
                    <strong>Your story bank is empty</strong>
                    <span>Dump raw experiences above — we&apos;ll turn them into posts.</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'bulk' && (
            <BulkTab plan={plan} postsLimit={postsLimit} postsRemaining={postsRemaining} monthName={monthName} />
          )}
        </div>

        {/* ── RIGHT: Output panel ── */}
        <div>
          {/* Generated post chooser */}
          {generatedPosts.length > 0 && !selectedPost && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label className="db-label">// choose a version</label>
              {generatedPosts.map((post, i) => (
                <div key={post.id} onClick={() => selectPost(post)}
                  className="gen-card"
                  style={{ cursor: 'pointer', transition: 'transform .15s, box-shadow .15s, border-color .15s', borderColor: 'var(--line)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = 'var(--sh-2)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = ''; }}>
                  <div className="oc-head">
                    <span style={{ color: 'var(--accent)', fontFamily: 'var(--f-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' }}>Option {i + 1}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--ink-4)' }}>Select <ArrowRight size={11} /></span>
                  </div>
                  <div className="oc-post">
                    <p>{post.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Selected post editor */}
          {selectedPost && (
            <div className="gen-card gen-card--out">
              <div className="oc-head">
                <span style={{ fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--ink-4)' }}>// edit &amp; schedule</span>
                <button onClick={() => { posthog.capture('post_skipped', { post_id: selectedPost.id }); setSelectedPost(null) }} className="btn-dash btn-dash--ghost btn-dash--sm">
                  <ArrowLeft size={12} /> Choose different
                </button>
              </div>

              <div className="oc-post">
                <textarea value={editContent} onChange={e => setEditContent(e.target.value)}
                  className="g-textarea" style={{ minHeight: 220 }} />
              </div>

              {actionResult === 'scheduled' && (
                <div style={{ padding: '10px 14px', borderRadius: 'var(--r-sm)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, background: '#ecfdf5', color: '#059669', border: '1px solid #6ee7b7' }}>
                  <Check size={14} /> Post scheduled successfully!
                </div>
              )}
              {actionResult === 'approval_sent' && (
                <div style={{ padding: '10px 14px', borderRadius: 'var(--r-sm)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid color-mix(in oklab, var(--accent) 25%, transparent)' }}>
                  <Mail size={14} /> Approval email sent! Check your inbox.
                </div>
              )}
              {actionResult.startsWith('Error') && (
                <div style={{ padding: '10px 14px', borderRadius: 'var(--r-sm)', fontSize: 13, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>{actionResult}</div>
              )}

              <div className="oc-foot" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <input type="datetime-local" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)} className="db-input" style={{ flex: 1, minWidth: 160 }} />
                  <button onClick={schedulePost} disabled={scheduling || !scheduleDate} className="btn-dash btn-dash--primary">
                    {scheduling ? <><Loader2 size={13} className="animate-spin" /> Scheduling...</> : <><CalendarClock size={13} /> Schedule</>}
                  </button>
                </div>
                <button onClick={sendApproval} className="btn-dash btn-dash--outline" style={{ width: '100%', justifyContent: 'center' }}>
                  <Mail size={13} /> Send Approval Email
                </button>
              </div>

              {(fetchingImages || imageSuggestions.length > 0) && (
                <div style={{ borderTop: '1px dashed var(--line)', paddingTop: 14, marginTop: 4 }}>
                  <label className="db-label" style={{ marginBottom: 10 }}>// image ideas</label>
                  {fetchingImages
                    ? <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ink-4)' }}><Loader2 size={13} className="animate-spin" /> Generating ideas...</div>
                    : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {imageSuggestions.map((s, i) => (
                          <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 12px', borderRadius: 'var(--r-sm)', background: 'var(--surface-2)', border: '1px solid var(--line)' }}>
                            <span style={{ fontSize: 18, flexShrink: 0 }}>{s.icon}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{s.suggestion}</div>
                              <div style={{ fontSize: 12, marginTop: 2, color: 'var(--ink-4)' }}>{s.why}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                  }
                </div>
              )}

              <ImageUploadSection onUpload={url => setUploadedImageUrl(url)} />
              {uploadedImageUrl && (
                <div style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, color: '#059669', marginTop: 4 }}>
                  <Check size={12} /> Image ready — will be attached when you schedule
                </div>
              )}
            </div>
          )}

          {/* Loading state for right column during auto-generate */}
          {loading && !selectedPost && generatedPosts.length === 0 && (
            <div className="gen-card gen-card--ghost">
              <div className="db-empty">
                <Loader2 size={28} className="animate-spin" style={{ color: 'var(--accent)' }} />
                <strong style={{ color: 'var(--ink)' }}>{loadingMsg}</strong>
                <span>Writing in your voice…</span>
              </div>
            </div>
          )}

          {/* Empty state for right column */}
          {!loading && !selectedPost && generatedPosts.length === 0 && (
            <div className="gen-card gen-card--ghost">
              <div className="db-empty">
                <Sparkles size={28} style={{ color: 'var(--ink-4)' }} strokeWidth={1.5} />
                <strong>Your post will appear here</strong>
                <span>Fill in the details on the left and hit Generate to create your post.</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function GeneratePage() {
  return <Suspense><GenerateContent /></Suspense>
}

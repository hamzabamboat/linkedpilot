'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase, StoryBank, Post } from '@/lib/supabase'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { PostCard, PostCardSkeleton } from '@/components/post-card'
import { Eyebrow } from '@/components/eyebrow'
import { ImageSelector } from '@/components/image-selector'
import { PostImage } from '@/lib/supabase'
import { ConcentricRings } from '@/components/concentric-rings'
import {
  Loader2, Mic, MicOff, FolderOpen, Sparkles, CalendarClock, Mail,
  BookOpen, Lock, Zap, Check, Save, ArrowLeft, ImageIcon, Upload, X,
  CheckCircle2, ArrowRight, Brain,
} from 'lucide-react'
import { toast } from 'sonner'

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

/* ── Reusable card wrapper ────────────────────────────────── */
function PanelCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={className}
      style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: 24, boxShadow: 'var(--sh-1)' }}
    >
      {children}
    </div>
  )
}

/* ── Generate button ─────────────────────────────────────── */
function GenerateButton({ loading, disabled, onClick, loadingMsg }: { loading: boolean; disabled: boolean; onClick: () => void; loadingMsg?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      className="w-full h-11 flex items-center justify-center gap-2 text-[14px] font-semibold text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-5"
      style={{ background: 'var(--pl-accent)', fontFamily: 'var(--f-sans)', boxShadow: 'var(--sh-blue)' }}
    >
      {loading
        ? <><Loader2 size={15} className="animate-spin" /> {loadingMsg || 'Generating...'}</>
        : <><Sparkles size={15} /> Generate Posts</>
      }
    </button>
  )
}

/* ── Upgrade prompt ──────────────────────────────────────── */
function UpgradePrompt({ feature, minPlan, icon: Icon }: { feature: string; minPlan: string; icon: React.ElementType }) {
  return (
    <div className="text-center py-12">
      <div className="relative inline-block mb-5">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto" style={{ background: 'var(--surface-3)' }}>
          <Icon className="w-8 h-8" style={{ color: 'var(--ink-4)' }} strokeWidth={1.5} />
        </div>
        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center shadow-sm">
          <Lock size={11} className="text-white" strokeWidth={2.5} />
        </div>
      </div>
      <div className="text-lg font-bold mb-2" style={{ color: 'var(--ink)' }}>{feature}</div>
      <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--ink-3)' }}>
        This feature is available on <strong style={{ color: 'var(--ink-2)' }}>{minPlan}</strong> and above.
      </p>
      <Link href="/dashboard/settings?tab=plan"
        className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg text-[13.5px] font-semibold text-white transition-opacity hover:opacity-90"
        style={{ background: 'var(--pl-accent)' }}>
        <Zap size={14} /> Upgrade Plan
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
    <div className="mt-5 pt-5" style={{ borderTop: '1px solid var(--line)' }}>
      <div className="text-[11px] mb-3 flex items-center gap-2" style={{ fontFamily: 'var(--f-mono)', color: 'var(--ink-4)', letterSpacing: '.05em' }}>
        <ImageIcon size={11} /> // add image
      </div>
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f?.type.startsWith('image/')) uploadFile(f) }}
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all"
        style={{ borderColor: dragOver ? 'var(--pl-accent)' : 'var(--line-2)', background: dragOver ? 'var(--pl-accent-soft)' : 'var(--bg-2)' }}
      >
        {uploading
          ? <div className="flex flex-col items-center gap-2"><Loader2 size={20} className="animate-spin" style={{ color: 'var(--ink-4)' }} /><div className="text-sm" style={{ color: 'var(--ink-4)' }}>Uploading...</div></div>
          : <div className="flex flex-col items-center gap-2">
              <Upload size={20} style={{ color: 'var(--ink-4)' }} />
              <div className="text-[13px]" style={{ color: 'var(--ink-3)' }}>Drop image or click to upload</div>
              <div className="text-[11px]" style={{ color: 'var(--ink-4)', fontFamily: 'var(--f-mono)' }}>JPG · PNG · GIF · WebP — 5 MB max</div>
            </div>
        }
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = '' }} />
      </div>
      {uploadedUrls.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {uploadedUrls.map((url, i) => (
            <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden group" style={{ border: '1px solid var(--line)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button onClick={e => { e.stopPropagation(); setUploadedUrls(prev => prev.filter((_, j) => j !== i)) }}
                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <X size={14} className="text-white" />
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
    return <div style={{ height: 80, background: 'var(--surface-3)', borderRadius: 'var(--r-md)' }} className="animate-pulse" />
  }

  if (loading) {
    const remainingSecs = Math.max(0, etaTotalSecs - elapsedSecs)
    const etaLabel = remainingSecs > 60 ? `~${Math.ceil(remainingSecs / 60)} min remaining` : remainingSecs > 5 ? `~${remainingSecs}s remaining` : 'Finishing up...'
    return (
      <div className="fixed inset-0 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-6" style={{ background: 'rgba(var(--surface), 0.95)' }}>
        <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--ink)', fontFamily: 'var(--f-sans)' }}>Generating posts for {monthName}...</h2>
        <p className="text-sm mb-3" style={{ color: 'var(--ink-4)', fontFamily: 'var(--f-mono)' }}>{etaLabel}</p>
        <div className="w-64 h-1.5 rounded-full overflow-hidden mb-2" style={{ background: 'var(--line-2)' }}>
          <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${((currentStep + 1) / steps.length) * 100}%`, background: 'var(--pl-accent)' }} />
        </div>
        <p className="text-sm mb-6" style={{ color: 'var(--ink-3)' }}>
          {currentStep >= writingStepStart && currentStep <= writingStepEnd
            ? `Generating post ${simulatedPostCount || 1} of ${effectiveCount}...`
            : steps[currentStep]}
        </p>
        <div className="space-y-2 text-left w-full max-w-xs">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-2 text-sm transition-colors"
              style={{ color: i < currentStep ? '#059669' : i === currentStep ? 'var(--pl-accent)' : 'var(--ink-4)' }}>
              <span className="text-xs w-4 shrink-0">{i < currentStep ? '✓' : i === currentStep ? '▶' : '○'}</span>
              <span>{step}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (result) {
    return (
      <PanelCard>
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
            <CheckCircle2 size={18} className="text-white" />
          </div>
          <div>
            <div className="font-semibold" style={{ color: 'var(--ink)' }}>{result.postsGenerated} posts generated for {monthName}</div>
            {result.nextPostDate && <div className="text-[13px]" style={{ color: 'var(--ink-3)' }}>Next post: {result.nextPostDate}</div>}
          </div>
        </div>
        {loadingPosts ? <div className="flex flex-col gap-3 mb-4">{[1,2,3].map(i => <PostCardSkeleton key={i} />)}</div>
          : batchPosts.length > 0 && (
            <div className="flex flex-col gap-3 mb-4 max-h-[480px] overflow-y-auto pr-1">
              {batchPosts.map(post => <PostCard key={post.id} id={post.id} content={post.content} scheduledAt={post.scheduled_at} status={post.status} />)}
            </div>
          )}
        <div className="flex gap-2">
          <Link href="/dashboard/calendar"
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[12.5px] font-medium transition-colors"
            style={{ background: 'var(--pl-accent-soft)', color: 'var(--pl-accent)', fontFamily: 'var(--f-sans)' }}>
            View in Calendar <ArrowRight size={12} />
          </Link>
          <Link href="/dashboard/posts"
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[12.5px] transition-colors"
            style={{ color: 'var(--ink-3)', fontFamily: 'var(--f-sans)' }}>
            All posts
          </Link>
        </div>
      </PanelCard>
    )
  }

  if (showConfirm) {
    const presets = Array.from(new Set([1, 5, 10, 15, 20, 25, 30].filter(n => n < remaining).concat([remaining]))).sort((a, b) => a - b)
    return (
      <PanelCard>
        <div className="text-[11px] mb-4" style={{ fontFamily: 'var(--f-mono)', color: 'var(--ink-4)', letterSpacing: '.05em' }}>// how many posts?</div>
        <div className="flex flex-wrap gap-2 mb-4">
          {presets.map(n => (
            <button key={n} type="button" onClick={() => setSelectedCount(n === remaining ? null : n)}
              className="px-3.5 py-1.5 rounded-full text-[13px] font-semibold border transition-all"
              style={{
                background: effectiveCount === n ? 'var(--pl-accent)' : 'var(--surface-2)',
                borderColor: effectiveCount === n ? 'var(--pl-accent)' : 'var(--line)',
                color: effectiveCount === n ? '#fff' : 'var(--ink-2)',
              }}>
              {n === remaining ? `All ${n}` : n}
            </button>
          ))}
        </div>
        <div className="text-[12px] mb-5" style={{ color: 'var(--ink-4)', fontFamily: 'var(--f-mono)' }}>
          {effectiveCount === remaining
            ? `Generating all ${remaining} remaining post${remaining !== 1 ? 's' : ''} this month`
            : `Generating ${effectiveCount} of ${remaining} remaining post${remaining !== 1 ? 's' : ''} this month`}
        </div>
        <div className="flex gap-2">
          <button onClick={handleBatchGenerate}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: 'var(--pl-accent)' }}>
            <Sparkles size={14} /> Generate {effectiveCount} post{effectiveCount !== 1 ? 's' : ''}
          </button>
          <button onClick={() => setShowConfirm(false)}
            className="inline-flex items-center h-9 px-4 rounded-lg text-[13px] transition-colors"
            style={{ background: 'var(--surface-3)', color: 'var(--ink-3)' }}>
            Cancel
          </button>
        </div>
      </PanelCard>
    )
  }

  return (
    <PanelCard>
      <div className="text-[11px] mb-3" style={{ fontFamily: 'var(--f-mono)', color: 'var(--ink-4)', letterSpacing: '.05em' }}>// bulk · plan a month</div>
      <div className="text-[15px] font-semibold mb-1" style={{ color: 'var(--ink)', fontFamily: 'var(--f-sans)' }}>
        Generate posts for {monthName}
      </div>
      <p className="text-[13px] leading-relaxed mb-4" style={{ color: 'var(--ink-3)' }}>
        AI writes LinkedIn posts in your voice and schedules them across the month.
        {remaining > 0
          ? ` You have ${remaining} post${remaining !== 1 ? 's' : ''} remaining this month.`
          : " You've used all your posts this month."}
      </p>
      {error && <div className="mb-4 px-3 py-2 rounded-lg text-sm text-red-600 bg-red-50" style={{ border: '1px solid #fecaca' }}>{error}</div>}
      <button
        onClick={() => setShowConfirm(true)}
        disabled={remaining === 0}
        className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        style={{ background: 'var(--pl-accent)' }}>
        <Sparkles size={14} /> Generate posts →
      </button>
    </PanelCard>
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
    const meRes = await fetch('/api/me')
    const { user } = await meRes.json()
    if (!user) return
    const { data } = await supabase.from('story_bank').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    setStories(data || [])
    if (initStoryId && data) {
      const match = data.find((s: StoryBank) => s.id === initStoryId)
      if (match) setSelectedStory(match)
    }
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
      if (tab === 'prompt') body.topic = topic
      if (tab === 'voice')  body.voiceNoteId = voiceNoteId
      if (tab === 'story') {
        const storyId = overrideStoryId || selectedStory?.id
        if (storyId) body.storyBankId = storyId
      }
      if (selectedImages.length > 0) body.imageIds = selectedImages.map(img => img.id)
      const res = await fetch('/api/posts/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      let data: Record<string, unknown>
      try { data = await res.json() } catch { setError('Server error — could not parse response.'); return }
      if (data.error) { setError(data.error === 'trial_exhausted' ? 'Post limit reached. Upgrade to continue.' : data.error as string); return }
      const posts = data.posts as Array<{ id: string; content: string }> | undefined
      if (!posts?.length) { setError('No posts generated. Please try again.'); return }
      setGeneratedPosts(posts)
      if (overrideStoryId || initStoryId) selectPost(posts[0])
    } catch { setError('Generation failed — check your connection.') }
    finally { clearInterval(interval); setLoading(false) }
  }

  function selectPost(post: { id: string; content: string }) {
    setSelectedPost(post); setEditContent(post.content); setActionResult(''); setScheduleDate(''); setImageSuggestions([]); setUploadedImageUrl('')
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
    <div className="w-full max-w-2xl mx-auto px-4 pt-6 md:pt-8 pb-12 space-y-6">
      <div>
        <Eyebrow dot className="mb-4">Generate</Eyebrow>
        <h1 className="text-[28px] font-semibold mb-1" style={{ color: 'var(--ink)', fontFamily: 'var(--f-sans)', letterSpacing: '-0.03em' }}>
          Create a post
        </h1>
        <p className="text-[14px]" style={{ color: 'var(--ink-3)' }}>AI writes in your exact voice. You approve before it goes live.</p>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-lg text-sm flex items-center gap-2 bg-red-50 text-red-600" style={{ border: '1px solid #fecaca' }}>
          {error}
          {error.includes('limit') && <Link href="/dashboard/settings?tab=plan" className="ml-1 font-semibold underline">Upgrade →</Link>}
        </div>
      )}

      <Tabs value={tab} onValueChange={v => setTab(v as Tab)}>
        <div className="tabs-overflow -mx-1 px-1">
        <TabsList
          className="w-full min-w-[340px] h-10 gap-1 p-1"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)' }}
        >
          <TabsTrigger value="prompt" className="flex-1 gap-1.5 text-[12.5px] rounded data-[state=active]:bg-surface data-[state=active]:shadow-sm">
            <Brain size={13} /> From a prompt
          </TabsTrigger>
          <TabsTrigger value="voice" className="flex-1 gap-1.5 text-[12.5px] rounded">
            <Mic size={13} /> Voice note
            {plan === 'starter' && <span className="text-[9px] px-1 py-0.5 rounded" style={{ background: 'var(--pl-accent-soft)', color: 'var(--pl-accent)', fontFamily: 'var(--f-mono)' }}>STD+</span>}
          </TabsTrigger>
          <TabsTrigger value="story" className="flex-1 gap-1.5 text-[12.5px] rounded">
            <BookOpen size={13} /> Story bank
          </TabsTrigger>
          <TabsTrigger value="bulk" className="flex-1 gap-1.5 text-[12.5px] rounded">
            <Sparkles size={13} /> Bulk
          </TabsTrigger>
        </TabsList>
        </div>

        {/* ── From a prompt ── */}
        <TabsContent value="prompt" className="mt-4">
          <PanelCard>
            <div className="text-[10px] mb-4" style={{ fontFamily: 'var(--f-mono)', color: 'var(--ink-4)', letterSpacing: '.05em' }}>// from a prompt</div>

            {/* Pillar chips */}
            {contentPillars.length > 0 && (
              <div className="mb-5">
                <div className="text-[10px] mb-2" style={{ fontFamily: 'var(--f-mono)', color: 'var(--ink-4)', letterSpacing: '.05em' }}>// content pillars</div>
                <div className="flex flex-wrap gap-2">
                  {contentPillars.map(pillar => (
                    <button key={pillar} type="button" onClick={() => setPendingPillar(p => p === pillar ? null : pillar)}
                      className="text-[12px] font-medium px-3 py-1.5 rounded-full border transition-all"
                      style={{
                        background: pendingPillar === pillar ? 'var(--pl-accent)' : 'var(--surface-2)',
                        borderColor: pendingPillar === pillar ? 'var(--pl-accent)' : 'var(--line)',
                        color: pendingPillar === pillar ? '#fff' : 'var(--ink-2)',
                      }}>
                      {pillar}
                    </button>
                  ))}
                </div>
                {pendingPillar && (
                  <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg flex-wrap" style={{ background: 'var(--surface-2)', border: '1px solid var(--line)' }}>
                    <span className="text-[12px]" style={{ color: 'var(--ink-3)' }}>
                      <span className="font-semibold" style={{ color: 'var(--ink)' }}>{pendingPillar}</span> —
                    </span>
                    <button type="button" onClick={() => { setTopic(pendingPillar!); setPendingPillar(null) }}
                      className="px-2.5 py-1 rounded-md text-[12px] font-semibold text-white" style={{ background: 'var(--pl-accent)' }}>
                      {topic.trim() ? 'Replace' : 'Use as topic'}
                    </button>
                    {topic.trim() && (
                      <button type="button" onClick={() => { setTopic(t => `${t.trimEnd()}, ${pendingPillar}`); setPendingPillar(null) }}
                        className="px-2.5 py-1 rounded-md text-[12px] font-semibold" style={{ background: 'var(--surface-3)', color: 'var(--ink-2)', border: '1px solid var(--line)' }}>
                        Add to topic
                      </button>
                    )}
                    <button type="button" onClick={() => setPendingPillar(null)} className="ml-auto" style={{ color: 'var(--ink-4)' }}>
                      <X size={13} />
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="mb-4">
              <Label htmlFor="topic" className="text-[12px] font-medium mb-1.5 block" style={{ color: 'var(--ink-2)', fontFamily: 'var(--f-sans)' }}>What do you want to post about?</Label>
              <Textarea
                id="topic" value={topic} onChange={e => setTopic(e.target.value)}
                placeholder="e.g. Why most startup advice is wrong, and what I learned building my first company..."
                className="min-h-[100px] resize-none text-[14px]"
                style={{ background: 'var(--bg-2)', borderColor: 'var(--line)', color: 'var(--ink)' }}
              />
            </div>

            {/* Tone */}
            <div className="mb-4">
              <div className="text-[10px] mb-2" style={{ fontFamily: 'var(--f-mono)', color: 'var(--ink-4)', letterSpacing: '.05em' }}>// tone</div>
              <div className="flex flex-wrap gap-2">
                {['Professional', 'Storytelling', 'Educational', 'Data-driven', 'Casual'].map(tone => (
                  <button key={tone} type="button" onClick={() => setSelectedTone(t => t === tone ? '' : tone)}
                    className="text-[12px] font-medium px-3 py-1.5 rounded-full border transition-all"
                    style={{
                      background: selectedTone === tone ? 'var(--ink)' : 'var(--surface-2)',
                      borderColor: selectedTone === tone ? 'var(--ink)' : 'var(--line)',
                      color: selectedTone === tone ? 'var(--bg)' : 'var(--ink-2)',
                    }}>
                    {tone}
                  </button>
                ))}
              </div>
            </div>

            {/* Photos */}
            <div className="mb-4">
              <div className="text-[10px] mb-2" style={{ fontFamily: 'var(--f-mono)', color: 'var(--ink-4)', letterSpacing: '.05em' }}>// photos (optional)</div>
              <button type="button" onClick={() => setImageSelectorOpen(true)}
                className="flex items-center gap-2 text-[13px] px-3 py-2 rounded-lg border transition-all"
                style={{ borderColor: 'var(--line)', background: 'var(--surface-2)', color: 'var(--ink-3)' }}>
                <ImageIcon size={14} />
                {selectedImages.length > 0 ? `${selectedImages.length} photo${selectedImages.length > 1 ? 's' : ''} selected` : 'Add Photos'}
              </button>
              {selectedImages.length > 0 && (
                <div className="mt-2 flex gap-2 flex-wrap">
                  {selectedImages.map(img => (
                    <div key={img.id} className="relative w-14 h-14 rounded-lg overflow-hidden group" style={{ border: '1px solid var(--line)' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.public_url} alt="" className="w-full h-full object-cover" />
                      <button onClick={() => setSelectedImages(prev => prev.filter(i => i.id !== img.id))}
                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <X size={13} className="text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="context" className="text-[12px] font-medium mb-1.5 block" style={{ color: 'var(--ink-2)', fontFamily: 'var(--f-sans)' }}>
                Additional instructions <span style={{ color: 'var(--ink-4)', fontWeight: 400 }}>(optional)</span>
              </Label>
              <Input id="context" value={additionalContext} onChange={e => setAdditionalContext(e.target.value)}
                placeholder="e.g. Keep it under 200 words, mention a specific metric"
                className="text-[14px]" style={{ background: 'var(--bg-2)', borderColor: 'var(--line)', color: 'var(--ink)' }} />
            </div>

            <GenerateButton loading={loading} disabled={!canGenerate} onClick={handleGenerate} loadingMsg={loadingMsg} />
          </PanelCard>

          <ImageSelector open={imageSelectorOpen} onClose={() => setImageSelectorOpen(false)}
            onSelect={imgs => setSelectedImages(imgs)} maxSelect={4}
            alreadySelected={selectedImages.map(i => i.id)} onHookSelect={hook => setTopic(hook)} />
        </TabsContent>

        {/* ── Voice note ── */}
        <TabsContent value="voice" className="mt-4">
          <PanelCard>
            {plan === 'starter'
              ? <UpgradePrompt feature="Voice Notes" minPlan="Standard" icon={Mic} />
              : (
                <div className="flex flex-col gap-4">
                  <div className="text-[10px] mb-1" style={{ fontFamily: 'var(--f-mono)', color: 'var(--ink-4)', letterSpacing: '.05em' }}>// from a voice note</div>
                  <p className="text-[13px] leading-relaxed" style={{ color: 'var(--ink-3)' }}>
                    Ramble for 2 minutes. We'll transcribe and turn it into a polished post.
                  </p>
                  <div className="flex gap-2.5 flex-wrap">
                    <button onClick={recording ? stopRecording : startRecording}
                      className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
                      style={{ background: recording ? '#ef4444' : 'var(--pl-accent)' }}>
                      {recording ? <><MicOff size={14} /> Stop Recording</> : <><Mic size={14} /> Start Recording</>}
                    </button>
                    <button onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-[13px] transition-colors"
                      style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', color: 'var(--ink-2)' }}>
                      <FolderOpen size={14} /> Upload Audio
                    </button>
                    <input ref={fileInputRef} type="file" accept="audio/*" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) transcribeAudio(f, f.name) }} />
                  </div>
                  {recording && (
                    <div className="flex items-center gap-2.5 px-4 py-3 rounded-lg bg-red-50" style={{ border: '1px solid #fecaca' }}>
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-sm font-semibold text-red-600">Recording in progress...</span>
                    </div>
                  )}
                  {transcribing && (
                    <div className="flex items-center gap-2.5 px-4 py-3 rounded-lg" style={{ background: 'var(--pl-accent-soft)', border: '1px solid var(--line)' }}>
                      <Loader2 size={14} className="animate-spin" style={{ color: 'var(--pl-accent)' }} />
                      <span className="text-sm font-semibold" style={{ color: 'var(--pl-accent)' }}>Transcribing...</span>
                    </div>
                  )}
                  {transcript && (
                    <div className="p-4 rounded-lg" style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}>
                      <div className="text-[10px] mb-2" style={{ fontFamily: 'var(--f-mono)', color: 'var(--ink-4)' }}>// transcript</div>
                      <p className="text-sm leading-relaxed" style={{ color: 'var(--ink-2)' }}>{transcript}</p>
                    </div>
                  )}
                  {/* Voice images */}
                  <div>
                    <div className="text-[10px] mb-2" style={{ fontFamily: 'var(--f-mono)', color: 'var(--ink-4)' }}>// photos from this moment (optional)</div>
                    <div className="flex flex-wrap gap-2 items-center">
                      {voiceImages.map((f, i) => (
                        <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden group" style={{ border: '1px solid var(--line)' }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                          <button onClick={() => setVoiceImages(v => v.filter((_, j) => j !== i))}
                            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <X size={14} className="text-white" />
                          </button>
                        </div>
                      ))}
                      {voiceImages.length < 5 && (
                        <button onClick={() => voiceImgRef.current?.click()}
                          className="w-16 h-16 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-colors"
                          style={{ borderColor: 'var(--line-2)' }}>
                          <Upload size={14} style={{ color: 'var(--ink-4)' }} />
                          <span className="text-[10px]" style={{ color: 'var(--ink-4)' }}>Add</span>
                        </button>
                      )}
                      <input ref={voiceImgRef} type="file" accept="image/*" multiple className="hidden"
                        onChange={e => { const files = Array.from(e.target.files || []); setVoiceImages(v => [...v, ...files].slice(0, 5)); e.target.value = '' }} />
                    </div>
                  </div>
                  <GenerateButton loading={loading} disabled={!canGenerate} onClick={handleGenerate} loadingMsg={loadingMsg} />
                </div>
              )
            }
          </PanelCard>
        </TabsContent>

        {/* ── Story bank ── */}
        <TabsContent value="story" className="mt-4">
          <div className="flex flex-col gap-4">
            <PanelCard>
              <div className="text-[10px] mb-4" style={{ fontFamily: 'var(--f-mono)', color: 'var(--ink-4)', letterSpacing: '.05em' }}>// dump a raw story</div>
              <Textarea value={newStory} onChange={e => setNewStory(e.target.value)}
                placeholder="This week I had a tough conversation with a potential investor..."
                className="min-h-[130px] resize-none text-[14px] mb-4"
                style={{ background: 'var(--bg-2)', borderColor: 'var(--line)', color: 'var(--ink)' }} />
              {/* Story images */}
              <div className="mb-4">
                <div className="text-[10px] mb-2" style={{ fontFamily: 'var(--f-mono)', color: 'var(--ink-4)' }}>// photos (optional)</div>
                <div className="flex flex-wrap gap-2 items-center">
                  {storyImages.map((f, i) => (
                    <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden group" style={{ border: '1px solid var(--line)' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                      <button onClick={() => setStoryImages(v => v.filter((_, j) => j !== i))}
                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <X size={14} className="text-white" />
                      </button>
                    </div>
                  ))}
                  {storyImages.length < 5 && (
                    <button onClick={() => storyImgRef.current?.click()}
                      className="w-16 h-16 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-colors"
                      style={{ borderColor: 'var(--line-2)' }}>
                      <Upload size={14} style={{ color: 'var(--ink-4)' }} />
                      <span className="text-[10px]" style={{ color: 'var(--ink-4)' }}>Add</span>
                    </button>
                  )}
                  <input ref={storyImgRef} type="file" accept="image/*" multiple className="hidden"
                    onChange={e => { const files = Array.from(e.target.files || []); setStoryImages(v => [...v, ...files].slice(0, 5)); e.target.value = '' }} />
                </div>
              </div>
              <button onClick={saveStory} disabled={savingStory || !newStory.trim()}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ background: '#059669' }}>
                {savingStory ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : <><Save size={14} /> Save to Story Bank</>}
              </button>
            </PanelCard>

            {stories.length > 0 ? (
              <div>
                <div className="text-[10px] mb-3" style={{ fontFamily: 'var(--f-mono)', color: 'var(--ink-4)', letterSpacing: '.05em' }}>// your story bank ({stories.length})</div>
                <div className="flex flex-col gap-2 mb-4">
                  {stories.map(s => (
                    <div key={s.id} onClick={() => setSelectedStory(selectedStory?.id === s.id ? null : s)}
                      className="border-2 rounded-xl p-4 cursor-pointer transition-all"
                      style={{
                        background: 'var(--surface)',
                        borderColor: selectedStory?.id === s.id ? 'var(--pl-accent)' : 'var(--line)',
                        boxShadow: selectedStory?.id === s.id ? 'var(--sh-1)' : 'none',
                      }}>
                      <div className="flex justify-between items-start gap-3">
                        <p className="text-sm leading-relaxed line-clamp-2 flex-1" style={{ color: 'var(--ink-2)' }}>{s.raw_text}</p>
                        {selectedStory?.id === s.id && (
                          <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--pl-accent)' }}>
                            <Check size={11} className="text-white" strokeWidth={2.5} />
                          </div>
                        )}
                      </div>
                      <div className="text-[10px] mt-2" style={{ color: 'var(--ink-4)', fontFamily: 'var(--f-mono)' }}>
                        {new Date(s.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {s.status}
                      </div>
                    </div>
                  ))}
                </div>
                {selectedStory && (
                  <PanelCard>
                    <div className="mb-4">
                      <Label className="text-[12px] font-medium mb-1.5 block" style={{ color: 'var(--ink-2)', fontFamily: 'var(--f-sans)' }}>
                        Additional context <span style={{ color: 'var(--ink-4)', fontWeight: 400 }}>(optional)</span>
                      </Label>
                      <Input value={additionalContext} onChange={e => setAdditionalContext(e.target.value)}
                        placeholder="e.g. Make it inspirational, add a question at the end"
                        className="text-[14px]" style={{ background: 'var(--bg-2)', borderColor: 'var(--line)', color: 'var(--ink)' }} />
                    </div>
                    <GenerateButton loading={loading} disabled={!canGenerate} onClick={handleGenerate} loadingMsg={loadingMsg} />
                  </PanelCard>
                )}
              </div>
            ) : (
              <PanelCard>
                <div className="py-8 text-center">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--surface-3)' }}>
                    <BookOpen size={22} style={{ color: 'var(--ink-4)' }} strokeWidth={1.5} />
                  </div>
                  <div className="font-semibold mb-1.5" style={{ color: 'var(--ink)' }}>Your story bank is empty</div>
                  <div className="text-sm" style={{ color: 'var(--ink-3)' }}>Dump raw experiences above — we'll turn them into posts.</div>
                </div>
              </PanelCard>
            )}
          </div>
        </TabsContent>

        {/* ── Bulk ── */}
        <TabsContent value="bulk" className="mt-4">
          <BulkTab plan={plan} postsLimit={postsLimit} postsRemaining={postsRemaining} monthName={monthName} />
        </TabsContent>

        {/* ── Generated post chooser (shared across prompt/voice/story tabs) ── */}
        {generatedPosts.length > 0 && !selectedPost && (
          <div className="mt-4">
            <div className="text-[10px] mb-4" style={{ fontFamily: 'var(--f-mono)', color: 'var(--ink-4)', letterSpacing: '.05em' }}>// choose a version</div>
            <div className="flex flex-col gap-3">
              {generatedPosts.map((post, i) => (
                <div key={post.id} onClick={() => selectPost(post)}
                  className="rounded-xl p-5 cursor-pointer transition-all hover:-translate-y-0.5 group"
                  style={{ background: 'var(--surface)', border: '2px solid var(--line)', boxShadow: 'var(--sh-1)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--pl-accent)', fontFamily: 'var(--f-mono)' }}>Option {i + 1}</div>
                    <div className="text-[11px] flex items-center gap-1 transition-colors" style={{ color: 'var(--ink-4)' }}>
                      Select <ArrowLeft size={12} className="rotate-180" />
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--ink-2)' }}>{post.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Selected post editor ── */}
        {selectedPost && (
          <PanelCard className="mt-4">
            <div className="flex justify-between items-center mb-4">
              <div className="text-[10px]" style={{ fontFamily: 'var(--f-mono)', color: 'var(--ink-4)', letterSpacing: '.05em' }}>// edit & schedule</div>
              <button onClick={() => setSelectedPost(null)} className="text-[12px] flex items-center gap-1 transition-opacity hover:opacity-70" style={{ color: 'var(--ink-3)' }}>
                <ArrowLeft size={12} /> Choose different
              </button>
            </div>
            <Textarea value={editContent} onChange={e => setEditContent(e.target.value)}
              className="min-h-[200px] mb-5 whitespace-pre-wrap resize-none text-[14px]"
              style={{ background: 'var(--bg-2)', borderColor: 'var(--line)', color: 'var(--ink)' }} />

            {actionResult === 'scheduled' && (
              <div className="rounded-lg px-4 py-3 mb-4 text-sm flex items-center gap-2 bg-emerald-50 text-emerald-700" style={{ border: '1px solid #6ee7b7' }}>
                <Check size={15} className="text-emerald-600" /> Post scheduled successfully!
              </div>
            )}
            {actionResult === 'approval_sent' && (
              <div className="rounded-lg px-4 py-3 mb-4 text-sm flex items-center gap-2" style={{ background: 'var(--pl-accent-soft)', color: 'var(--pl-accent)', border: '1px solid var(--pl-accent)' }}>
                <Mail size={15} /> Approval email sent! Check your inbox.
              </div>
            )}
            {actionResult.startsWith('Error') && (
              <div className="rounded-lg px-4 py-3 mb-4 text-sm bg-red-50 text-red-600" style={{ border: '1px solid #fecaca' }}>{actionResult}</div>
            )}

            <div className="flex flex-col gap-2.5">
              <div className="flex flex-col sm:flex-row gap-2.5">
                <Input type="datetime-local" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)} className="flex-1 text-[14px]"
                  style={{ background: 'var(--bg-2)', borderColor: 'var(--line)', color: 'var(--ink)' }} />
                <button onClick={schedulePost} disabled={scheduling || !scheduleDate}
                  className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-lg text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
                  style={{ background: 'var(--pl-accent)' }}>
                  {scheduling ? <><Loader2 size={14} className="animate-spin" /> Scheduling...</> : <><CalendarClock size={14} /> Schedule</>}
                </button>
              </div>
              <button onClick={sendApproval}
                className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-lg text-[13px] font-medium transition-colors"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', color: 'var(--ink-2)' }}>
                <Mail size={14} /> Send Approval Email
              </button>
            </div>

            {(fetchingImages || imageSuggestions.length > 0) && (
              <div className="mt-5 pt-5" style={{ borderTop: '1px solid var(--line)' }}>
                <div className="text-[10px] mb-3" style={{ fontFamily: 'var(--f-mono)', color: 'var(--ink-4)', letterSpacing: '.05em' }}>// image ideas</div>
                {fetchingImages
                  ? <div className="flex items-center gap-2 text-[13px]" style={{ color: 'var(--ink-4)' }}><Loader2 size={13} className="animate-spin" /> Generating ideas...</div>
                  : <div className="flex flex-col gap-2.5">
                      {imageSuggestions.map((s, i) => (
                        <div key={i} className="flex gap-3 rounded-lg p-3" style={{ background: 'var(--surface-2)', border: '1px solid var(--line)' }}>
                          <span className="text-xl shrink-0">{s.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-semibold" style={{ color: 'var(--ink)' }}>{s.suggestion}</div>
                            <div className="text-[12px] mt-0.5" style={{ color: 'var(--ink-4)' }}>{s.why}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                }
              </div>
            )}

            <ImageUploadSection onUpload={url => setUploadedImageUrl(url)} />
            {uploadedImageUrl && (
              <div className="mt-2 text-[12px] flex items-center gap-1.5 text-emerald-600">
                <Check size={13} /> Image ready — will be attached when you schedule
              </div>
            )}
          </PanelCard>
        )}
      </Tabs>
    </div>
  )
}

export default function GeneratePage() {
  return <Suspense><GenerateContent /></Suspense>
}

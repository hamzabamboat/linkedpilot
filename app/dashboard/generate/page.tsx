'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase, StoryBank, Post } from '@/lib/supabase'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { PostCard, PostCardSkeleton } from '@/components/post-card'
import { Badge } from '@/components/ui/badge'
import {
  Loader2,
  Mic,
  MicOff,
  FolderOpen,
  Sparkles,
  CalendarClock,
  Mail,
  BookOpen,
  Brain,
  Lock,
  Zap,
  Check,
  Save,
  ArrowLeft,
  ImageIcon,
  Upload,
  X,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { ImageSelector } from '@/components/image-selector'
import { PostImage } from '@/lib/supabase'
import { ConcentricRings, QuarterRings } from '@/components/concentric-rings'

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

// ETA estimate: ~35s per 10-post batch + 30s overhead
function estimateEtaSecs(postsLimit: number): number {
  return Math.ceil(postsLimit / 10) * 35 + 30
}

type Tab = 'ai' | 'voice' | 'story'

function BatchGenerateCard({ plan, postsLimit, postsRemaining, monthName }: { plan: string; postsLimit: number | null; postsRemaining: number | null; monthName: string }) {
  const [loading, setLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
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
  // Writing steps are indices 2 through (steps.length - 4) inclusive
  const writingStepStart = 2
  const writingStepEnd = steps.length - 4  // before "Adding hashtags", "Scheduling", "Done!"

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [])

  // Simulate per-post counter during writing steps
  useEffect(() => {
    if (!loading) return
    if (currentStep < writingStepStart || currentStep > writingStepEnd) return
    const batchIdx = currentStep - writingStepStart
    const start = batchIdx * 10 + 1
    const end = Math.min((batchIdx + 1) * 10, effectiveCount)
    let count = start
    const timer = setInterval(() => {
      if (count <= end) setSimulatedPostCount(count++)
    }, 1200)
    return () => clearInterval(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, loading, effectiveCount])

  // Elapsed time counter for ETA
  useEffect(() => {
    if (!loading) { setElapsedSecs(0); return }
    const timer = setInterval(() => setElapsedSecs(s => s + 1), 1000)
    return () => clearInterval(timer)
  }, [loading])

  async function handleBatchGenerate() {
    setShowConfirm(false)
    setLoading(true)
    setError('')
    setResult(null)
    setBatchPosts([])
    setCurrentStep(0)
    setSimulatedPostCount(0)
    batchStartRef.current = new Date().toISOString()

    intervalRef.current = setInterval(() => {
      setCurrentStep(s => Math.min(s + 1, steps.length - 2))
    }, 4000)

    try {
      const res = await fetch('/api/posts/generate-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: effectiveCount }),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      setResult({ postsGenerated: data.postsGenerated, nextPostDate: data.nextPostDate })

      setLoadingPosts(true)
      const postsData = await fetch(
        `/api/posts?since=${encodeURIComponent(batchStartRef.current)}&order=scheduled_at`
      ).then(r => r.json())
      setBatchPosts(postsData.posts || [])
      setLoadingPosts(false)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      if (intervalRef.current) clearInterval(intervalRef.current)
      setLoading(false)
    }
  }

  if (postsLimit === null || postsRemaining === null) {
    return (
      <Card className="border-slate-100 shadow-sm rounded-2xl">
        <CardContent className="pt-6">
          <div className="skeleton h-6 w-48 rounded mb-2" />
          <div className="skeleton h-4 w-64 rounded" />
        </CardContent>
      </Card>
    )
  }

  // Loading overlay — priority early return so it always shows immediately regardless of prior state
  if (loading) {
    const remainingSecs = Math.max(0, etaTotalSecs - elapsedSecs)
    const etaLabel = remainingSecs > 60
      ? `~${Math.ceil(remainingSecs / 60)} min remaining`
      : remainingSecs > 5 ? `~${remainingSecs}s remaining` : 'Finishing up...'

    return (
      <div className="fixed inset-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-6">
        <div className="bg-white rounded-xl p-2 shadow-sm mb-6 border border-slate-100 logo-always-white">
          <img src="/logo-icon.png" className="h-12 w-12" alt="PersonaLink" width={48} height={48} />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">Generating your posts for {monthName}...</h2>
        <p className="text-sm text-slate-400 mb-3 font-medium">{etaLabel}</p>
        <div className="w-64 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-2">
          <div
            className="h-full bg-brand rounded-full transition-all duration-1000"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 font-medium">
          {currentStep >= writingStepStart && currentStep <= writingStepEnd
            ? `Generating post ${simulatedPostCount || 1} of ${effectiveCount}...`
            : steps[currentStep]}
        </p>
        <div className="space-y-2 text-left w-full max-w-xs">
          {steps.map((step, i) => (
            <div key={i} className={`flex items-center gap-2 text-sm transition-colors ${i < currentStep ? 'text-emerald-600' : i === currentStep ? 'text-brand font-medium' : 'text-slate-300 dark:text-slate-600'}`}>
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
      <Card className="border-emerald-200 bg-emerald-50 shadow-sm rounded-2xl">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-semibold text-emerald-800">{result.postsGenerated} posts generated for {monthName}</div>
              {result.nextPostDate && <div className="text-[13px] text-emerald-600">Next post: {result.nextPostDate}</div>}
            </div>
          </div>

          {loadingPosts ? (
            <div className="flex flex-col gap-3 mb-4">
              {[1, 2, 3].map(i => <PostCardSkeleton key={i} />)}
            </div>
          ) : batchPosts.length > 0 ? (
            <div className="flex flex-col gap-3 mb-4 max-h-[480px] overflow-y-auto pr-1">
              {batchPosts.map(post => (
                <PostCard key={post.id} id={post.id} content={post.content} scheduledAt={post.scheduled_at} status={post.status} />
              ))}
            </div>
          ) : null}

          <div className="flex gap-2">
            <Link href="/dashboard/calendar">
              <Button variant="outline" size="sm" className="gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-100">
                View in Calendar <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
            <Link href="/dashboard/posts">
              <Button variant="ghost" size="sm" className="gap-1.5 text-emerald-600 hover:bg-emerald-100">
                All posts
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (showConfirm) {
    // Build preset options: every 5 up to remaining, always include 1 and remaining itself
    const presets = Array.from(new Set([1, 5, 10, 15, 20, 25, 30].filter(n => n < remaining).concat([remaining]))).sort((a, b) => a - b)

    return (
      <Card className="border-amber-200 bg-amber-50 shadow-sm rounded-2xl">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-9 h-9 rounded-full bg-amber-500 flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-amber-900 text-base">Generate posts for {monthName}</div>
              <div className="text-sm text-amber-700 mt-1 leading-relaxed">
                AI writes LinkedIn posts in your voice and schedules them across the month, skipping dates you already have posts on.
                Uses <strong>1 batch run</strong> from your monthly quota.
              </div>
            </div>
          </div>

          {/* Count picker */}
          <div className="mb-5">
            <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider mb-2.5">How many posts?</div>
            <div className="flex flex-wrap gap-2">
              {presets.map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setSelectedCount(n === remaining ? null : n)}
                  className={`px-3.5 py-1.5 rounded-full text-[13px] font-semibold border transition-all ${
                    effectiveCount === n
                      ? 'bg-amber-600 border-amber-600 text-white shadow-sm'
                      : 'bg-white border-amber-300 text-amber-800 hover:border-amber-500 hover:bg-amber-100'
                  }`}
                >
                  {n === remaining ? `All ${n}` : n}
                </button>
              ))}
            </div>
            <div className="text-[12px] text-amber-600 mt-2">
              {effectiveCount === remaining
                ? `Generating all ${remaining} remaining post${remaining !== 1 ? 's' : ''} this month`
                : `Generating ${effectiveCount} of ${remaining} remaining post${remaining !== 1 ? 's' : ''} this month`}
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleBatchGenerate} size="sm" className="gap-1.5 bg-[#0B458B] hover:bg-[#083670]">
              <Sparkles className="w-3.5 h-3.5" />
              Generate {effectiveCount} post{effectiveCount !== 1 ? 's' : ''}
            </Button>
            <Button onClick={() => setShowConfirm(false)} size="sm" variant="outline" className="border-amber-300 text-amber-800 hover:bg-amber-100">
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="relative rounded-2xl p-6 overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-blue-500 dark:from-blue-900 dark:via-blue-800 dark:to-blue-700 shadow-sm">
      <QuarterRings size={240} color="white" className="absolute -bottom-8 -right-8 pointer-events-none" />
      <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <div className="font-bold text-lg text-white mb-1">Generate posts for {monthName}</div>
          <div className="text-sm text-blue-100 leading-relaxed">
            Based on your profile, industry, and content pillars — no input needed.
            {remaining > 0
              ? ` You have ${remaining} post${remaining !== 1 ? 's' : ''} remaining this month.`
              : " You've used all your posts this month."}
          </div>
          {error && <div className="mt-2 text-sm text-red-200">{error}</div>}
        </div>
        <div className="shrink-0">
          <Button
            onClick={() => setShowConfirm(true)}
            disabled={remaining === 0}
            className="gap-2 whitespace-nowrap bg-white text-blue-700 hover:bg-blue-50 shadow-sm hover:shadow-md transition-shadow disabled:opacity-60"
          >
            <Sparkles className="w-4 h-4" />
            Generate posts →
          </Button>
        </div>
      </div>
    </div>
  )
}

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
      if (data.url) {
        setUploadedUrls(prev => [...prev, data.url])
        onUpload(data.url)
      }
    } catch {
      // silent fail — user sees no thumbnail
    } finally {
      setUploading(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) uploadFile(file)
  }

  return (
    <div className="mt-6 pt-6 border-t border-slate-100" id="images">
      <div className="text-[13px] font-semibold text-gray-800 mb-3 flex items-center gap-2">
        <ImageIcon className="w-4 h-4 text-slate-400" />
        Add an image to this post
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          dragOver ? 'border-[#0B458B] bg-blue-50' : 'border-slate-200 hover:border-[#0B458B]/50 hover:bg-slate-50'
        }`}
      >
        {uploading
          ? <div className="flex flex-col items-center gap-2"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /><div className="text-sm text-slate-500">Uploading...</div></div>
          : <div className="flex flex-col items-center gap-2">
              <Upload className="w-8 h-8 text-slate-300" />
              <div className="text-sm font-medium text-slate-600">Drop your image here or click to upload</div>
              <div className="text-[12px] text-slate-400">JPG, PNG, GIF, WebP — up to 5 MB</div>
            </div>
        }
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = '' }}
        />
      </div>

      {/* Thumbnails */}
      {uploadedUrls.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {uploadedUrls.map((url, i) => (
            <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-slate-200 group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button
                onClick={e => { e.stopPropagation(); setUploadedUrls(prev => prev.filter((_, j) => j !== i)) }}
                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function GenerateContent() {
  const searchParams = useSearchParams()
  const initTab = (searchParams.get('tab') as Tab) || 'ai'
  const initIdea = searchParams.get('idea') || ''

  const [tab, setTab] = useState<Tab>(initTab)
  const [topic, setTopic] = useState(initIdea ? decodeURIComponent(initIdea) : '')
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
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [transcript, setTranscript] = useState('')
  const [transcribing, setTranscribing] = useState(false)
  const [voiceNoteId, setVoiceNoteId] = useState<string | null>(null)
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

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
      if (usageData.usage?.posts_generated) {
        setPostsRemaining(usageData.usage.posts_generated.remaining)
      }
    }).catch(() => {})
    loadStories()

    // Pre-select image from ?imageId= query param
    const imageId = searchParams.get('imageId')
    if (imageId) {
      fetch('/api/images').then(r => r.json()).then(data => {
        if (cancelled) return
        const img = (data.images || []).find((i: PostImage) => i.id === imageId)
        if (img) { setSelectedImages([img]); setImageSelectorOpen(false) }
      }).catch(() => {})
    }

    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadStories() {
    const meRes = await fetch('/api/me')
    const { user } = await meRes.json()
    if (!user) return
    const { data } = await supabase.from('story_bank').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    setStories(data || [])
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = e => chunksRef.current.push(e.data)
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        stream.getTracks().forEach(t => t.stop())
        setTranscribing(true)
        const form = new FormData()
        form.append('audio', blob, 'recording.webm')
        try {
          const res = await fetch('/api/transcribe', { method: 'POST', body: form })
          const data = await res.json()
          if (data.transcript) setTranscript(data.transcript)
          if (data.voiceNoteId) setVoiceNoteId(data.voiceNoteId)
        } catch (e) {
          console.error('Transcription failed', e)
        } finally {
          setTranscribing(false)
        }
      }
      recorder.start()
      mediaRef.current = recorder
      setRecording(true)
    } catch (err) {
      const isDenied = err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')
      if (isDenied) {
        toast.error('Microphone access denied', {
          description: 'To enable: click the 🔒 lock icon in your browser\'s address bar → Site settings → Allow Microphone, then try again.',
          action: { label: 'Try Again', onClick: startRecording },
          duration: 12000,
        })
      } else {
        setError('Could not access microphone. Please check your device.')
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
    setTranscript(data.transcript)
    setVoiceNoteId(data.voiceNoteId)
  }

  async function saveStory() {
    if (!newStory.trim()) return
    setSavingStory(true)
    const res = await fetch('/api/story-bank', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ raw_text: newStory }) })
    const data = await res.json()
    setSavingStory(false)
    if (data.error) { setError(data.error); return }
    setNewStory('')
    loadStories()
  }

  async function handleGenerate() {
    setLoading(true); setError(''); setGeneratedPosts([]); setSelectedPost(null); setImageSuggestions([])
    loadingMsgIdx.current = 0
    setLoadingMsg(LOADING_MESSAGES[0])
    const interval = setInterval(() => {
      loadingMsgIdx.current = (loadingMsgIdx.current + 1) % LOADING_MESSAGES.length
      setLoadingMsg(LOADING_MESSAGES[loadingMsgIdx.current])
    }, 2000)

    try {
      const tonePrefix = selectedTone ? `Write in a ${selectedTone.toLowerCase()} tone. ` : ''
      const finalContext = tonePrefix + additionalContext
      const body: Record<string, unknown> = { additionalContext: finalContext }
      if (tab === 'ai') body.topic = topic
      if (tab === 'voice') body.voiceNoteId = voiceNoteId
      if (tab === 'story' && selectedStory) body.storyBankId = selectedStory.id
      if (selectedImages.length > 0) body.imageIds = selectedImages.map(img => img.id)

      const res = await fetch('/api/posts/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

      let data: Record<string, unknown>
      try {
        data = await res.json()
      } catch {
        setError('Server error — could not parse response. Please try again.')
        return
      }

      if (data.error) {
        const errMsg = data.error as string
        setError(errMsg === 'trial_exhausted' ? 'Post limit reached. Upgrade your plan to continue.' : errMsg)
        return
      }

      const posts = data.posts as Array<{ id: string; content: string }> | undefined
      if (!posts || posts.length === 0) {
        setError('No posts were generated. Please try again.')
        return
      }

      setGeneratedPosts(posts)
    } catch {
      setError('Generation failed — please check your connection and try again.')
    } finally {
      clearInterval(interval)
      setLoading(false)
    }
  }

  function selectPost(post: { id: string; content: string }) {
    setSelectedPost(post); setEditContent(post.content); setActionResult(''); setScheduleDate('')
    setImageSuggestions([]); setUploadedImageUrl('')
    fetchImageSuggestions(post.content)
  }

  async function fetchImageSuggestions(postContent: string) {
    setFetchingImages(true)
    try {
      const res = await fetch('/api/posts/image-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postContent }),
      })
      const data = await res.json()
      if (!data.error) setImageSuggestions(data.suggestions || [])
    } finally {
      setFetchingImages(false)
    }
  }

  async function schedulePost() {
    if (!selectedPost || !scheduleDate) return
    setScheduling(true)
    await fetch(`/api/posts/${selectedPost.id}/update`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: editContent, image_url: uploadedImageUrl || undefined }),
    })
    const res = await fetch(`/api/posts/${selectedPost.id}/schedule`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scheduledAt: scheduleDate }),
    })
    const data = await res.json()
    setScheduling(false)
    setActionResult(data.error ? `Error: ${data.error}` : 'scheduled')
  }

  async function sendApproval() {
    if (!selectedPost) return
    const res = await fetch(`/api/posts/${selectedPost.id}/send-approval`, { method: 'POST' })
    const data = await res.json()
    setActionResult(data.error ? `Error: ${data.error}` : 'approval_sent')
  }

  const canGenerate = tab === 'ai' ? topic.trim().length > 0 : tab === 'voice' ? !!voiceNoteId : !!selectedStory

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pt-4 md:pt-7 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1 tracking-tight">Generate Post</h1>
        <p className="text-sm text-gray-600 leading-relaxed">AI writes in your exact voice. You approve before it goes live.</p>
      </div>

      {/* Zero-prompt batch card */}
      <BatchGenerateCard plan={plan} postsLimit={postsLimit} postsRemaining={postsRemaining} monthName={monthName} />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm flex items-center gap-2">
          {error}
          {error.includes('limit') && (
            <Link href="/dashboard/settings?tab=plan" className="ml-1 font-semibold underline">Upgrade →</Link>
          )}
        </div>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        {/* Tab bar — full width, directly below the banner */}
        <TabsList className="w-full h-10 justify-center gap-2 bg-transparent">
          <TabsTrigger value="ai" className="gap-1.5 text-[13px]">
            <Brain className="w-3.5 h-3.5" />
            AI Generate
          </TabsTrigger>
          <TabsTrigger value="voice" className="flex items-center gap-1.5 text-[13px]">
            <Mic className="w-3.5 h-3.5" />
            Voice Note
            {plan === 'starter' && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-brand-light text-brand ml-0.5">STD+</Badge>}
          </TabsTrigger>
          <TabsTrigger value="story" className="gap-1.5 text-[13px]">
            <BookOpen className="w-3.5 h-3.5" />
            Story Bank
          </TabsTrigger>
        </TabsList>

        <div className="w-full">

        {/* AI Generate */}
        <TabsContent value="ai" className="mt-0 w-full">
          <div className="w-full rounded-2xl bg-slate-900 dark:bg-slate-900 border border-slate-800 p-6 flex flex-col gap-6">
              {/* Content pillar chips */}
              {contentPillars.length > 0 && (
                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Your content pillars</div>
                  <div className="flex flex-wrap gap-2">
                    {contentPillars.map(pillar => (
                      <button
                        key={pillar}
                        type="button"
                        onClick={() => setPendingPillar(p => p === pillar ? null : pillar)}
                        className={`text-[12px] font-medium px-3 py-1.5 rounded-full border transition-all ${
                          pendingPillar === pillar
                            ? 'border-brand bg-brand text-white shadow-sm'
                            : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-brand/40 hover:bg-brand/10 hover:text-brand'
                        }`}
                      >
                        {pillar}
                      </button>
                    ))}
                  </div>

                  {pendingPillar && (
                    <div className="mt-2 flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-[12px] flex-wrap">
                      <span className="text-slate-400 font-medium shrink-0">
                        <span className="font-semibold text-slate-200">{pendingPillar}</span> —
                      </span>
                      <button
                        type="button"
                        onClick={() => { setTopic(pendingPillar!); setPendingPillar(null) }}
                        className="px-2.5 py-1 rounded-lg bg-brand text-white font-semibold hover:bg-brand/90 transition-colors"
                      >
                        {topic.trim() ? 'Replace' : 'Use as topic'}
                      </button>
                      {topic.trim() && (
                        <button
                          type="button"
                          onClick={() => { setTopic(t => `${t.trimEnd()}, ${pendingPillar}`); setPendingPillar(null) }}
                          className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 font-semibold hover:border-brand/40 hover:text-brand transition-colors"
                        >
                          Add to topic
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setPendingPillar(null)}
                        className="ml-auto text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div>
                <Label htmlFor="topic" className="font-medium text-sm text-slate-200 mb-1.5">What do you want to post about?</Label>
                <Textarea
                  id="topic"
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  placeholder="e.g. Why most startup advice is wrong, and what I learned building my first company..."
                  className="mt-1.5 min-h-[100px] resize-none border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500 focus:border-brand/50 text-[14px]"
                />
              </div>

              {/* Tone selector */}
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Tone</div>
                <div className="flex flex-wrap gap-2">
                  {['Professional', 'Storytelling', 'Educational', 'Data-driven', 'Casual'].map(tone => (
                    <button
                      key={tone}
                      type="button"
                      onClick={() => setSelectedTone(t => t === tone ? '' : tone)}
                      className={`text-[12px] font-medium px-3 py-1.5 rounded-full border transition-all ${
                        selectedTone === tone
                          ? 'border-brand bg-brand text-white shadow-sm'
                          : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-brand/40 hover:bg-brand/10 hover:text-brand'
                      }`}
                    >
                      {tone}
                    </button>
                  ))}
                </div>
              </div>

              {/* Photo selection */}
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Photos <span className="font-normal normal-case text-slate-300">(optional)</span></div>
                <button
                  type="button"
                  onClick={() => setImageSelectorOpen(true)}
                  className="flex items-center gap-2 text-[13px] font-medium text-slate-300 border border-slate-700 rounded-xl px-3 py-2 hover:border-brand/40 hover:bg-brand/10 hover:text-brand transition-all"
                >
                  <ImageIcon className="w-4 h-4" />
                  {selectedImages.length > 0 ? `${selectedImages.length} photo${selectedImages.length > 1 ? 's' : ''} selected` : 'Add Photos'}
                </button>

                {selectedImages.length > 0 && (
                  <div className="mt-3 space-y-3">
                    {/* Thumbnails */}
                    <div className="flex gap-2 flex-wrap">
                      {selectedImages.map(img => (
                        <div key={img.id} className="relative w-14 h-14 rounded-lg overflow-hidden border border-slate-700 group">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={img.public_url} alt="" className="w-full h-full object-cover" />
                          <button
                            onClick={() => setSelectedImages(prev => prev.filter(i => i.id !== img.id))}
                            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                          >
                            <X className="w-3.5 h-3.5 text-white" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Topics from photos */}
                    {selectedImages.flatMap(img => img.ai_topics || []).length > 0 && (
                      <div>
                        <div className="text-[11px] text-slate-400 font-semibold mb-1.5">Content from your photos:</div>
                        <div className="flex flex-wrap gap-1.5">
                          {[...new Set(selectedImages.flatMap(img => img.ai_topics || []))].map(t => (
                            <span key={t} className="text-[11px] bg-slate-800 border border-slate-700 text-slate-400 px-2 py-0.5 rounded-full">{t}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Hooks from photos */}
                    {selectedImages.flatMap(img => img.ai_post_hooks || []).length > 0 && (
                      <div>
                        <div className="text-[11px] text-slate-400 font-semibold mb-1.5">Try these angles:</div>
                        <div className="flex flex-col gap-1.5">
                          {selectedImages.flatMap(img => img.ai_post_hooks || []).slice(0, 4).map((hook, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setTopic(hook)}
                              className="text-left text-[12px] text-slate-300 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 hover:border-brand/40 hover:bg-brand/10 hover:text-brand transition-all"
                            >
                              {hook}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="context" className="font-medium text-sm text-slate-200 mb-1.5">Additional instructions <span className="text-slate-400 font-normal">(optional)</span></Label>
                <Input
                  id="context"
                  value={additionalContext}
                  onChange={e => setAdditionalContext(e.target.value)}
                  placeholder="e.g. Keep it under 200 words, mention a specific metric"
                  className="mt-1.5 border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500 focus:border-brand/50 text-[14px]"
                />
              </div>
              <GenerateButton loading={loading} disabled={!canGenerate} onClick={handleGenerate} loadingMsg={loadingMsg} />
          </div>
        </TabsContent>

        <ImageSelector
          open={imageSelectorOpen}
          onClose={() => setImageSelectorOpen(false)}
          onSelect={imgs => setSelectedImages(imgs)}
          maxSelect={4}
          alreadySelected={selectedImages.map(i => i.id)}
          onHookSelect={hook => setTopic(hook)}
        />

        {/* Voice Note */}
        <TabsContent value="voice" className="mt-0 w-full">
          <Card className="mt-4 border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              {plan === 'starter' ? (
                <UpgradePrompt feature="Voice Notes" minPlan="Standard" icon={Mic} />
              ) : (
                <div className="flex flex-col gap-4">
                  <div>
                    <Label className="font-medium text-sm text-gray-700">Record or upload a voice note</Label>
                    <p className="text-sm text-gray-600 leading-relaxed mt-1 mb-4">Ramble for 2 minutes. We&apos;ll transcribe and turn it into a polished post.</p>
                    <div className="flex gap-2.5 flex-wrap">
                      <Button variant={recording ? 'destructive' : 'default'} onClick={recording ? stopRecording : startRecording} className="gap-1.5">
                        {recording ? <><MicOff className="size-4" /> Stop Recording</> : <><Mic className="size-4" /> Start Recording</>}
                      </Button>
                      <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-1.5 border-slate-200">
                        <FolderOpen className="size-4" /> Upload Audio
                      </Button>
                      <input ref={fileInputRef} type="file" accept="audio/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) transcribeAudio(f, f.name) }} />
                    </div>
                  </div>
                  {recording && (
                    <div className="flex items-center gap-2.5 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-sm font-semibold text-red-600">Recording in progress...</span>
                    </div>
                  )}
                  {transcribing && (
                    <div className="flex items-center gap-2.5 bg-violet-50 border border-violet-100 rounded-xl px-4 py-3">
                      <Loader2 className="w-4 h-4 animate-spin text-violet-600 shrink-0" />
                      <span className="text-sm font-semibold text-violet-600">Transcribing...</span>
                    </div>
                  )}
                  {transcript && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Transcript</div>
                      <p className="text-sm text-gray-600 leading-relaxed">{transcript}</p>
                    </div>
                  )}
                  {/* Voice note images */}
                  <div>
                    <Label className="font-medium text-sm text-gray-700">Add photos from this moment <span className="text-gray-400 font-normal">(optional, up to 5)</span></Label>
                    <div className="mt-2 flex flex-wrap gap-2 items-center">
                      {voiceImages.map((f, i) => (
                        <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200 group">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                          <button onClick={() => setVoiceImages(v => v.filter((_, j) => j !== i))}
                            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <X className="w-4 h-4 text-white" />
                          </button>
                        </div>
                      ))}
                      {voiceImages.length < 5 && (
                        <button onClick={() => voiceImgRef.current?.click()}
                          className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-1 hover:border-brand/50 transition-colors">
                          <Upload className="w-4 h-4 text-slate-300" />
                          <span className="text-[10px] text-slate-400">Add</span>
                        </button>
                      )}
                      <input ref={voiceImgRef} type="file" accept="image/*" multiple className="hidden"
                        onChange={e => { const files = Array.from(e.target.files || []); setVoiceImages(v => [...v, ...files].slice(0, 5)); e.target.value = '' }} />
                    </div>
                  </div>
                  <GenerateButton loading={loading} disabled={!canGenerate} onClick={handleGenerate} loadingMsg={loadingMsg} />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Story Bank */}
        <TabsContent value="story" className="mt-0 w-full">
          <div className="mt-4 flex flex-col gap-5">
            <Card className="border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="pt-6 flex flex-col gap-3">
                <div>
                  <Label className="font-medium text-sm text-gray-700">Dump a raw experience or story</Label>
                  <p className="text-sm text-gray-600 leading-relaxed mt-1">Write about anything — a tough client meeting, a decision you made, a lesson learned.</p>
                </div>
                <Textarea
                  value={newStory}
                  onChange={e => setNewStory(e.target.value)}
                  placeholder="This week I had a tough conversation with a potential investor..."
                  className="min-h-[130px] resize-none border-slate-200 text-[14px]"
                />
                {/* Story images */}
                <div>
                  <Label className="font-medium text-sm text-gray-700">Add photos from this experience <span className="text-gray-400 font-normal">(optional, up to 5)</span></Label>
                  <div className="mt-2 flex flex-wrap gap-2 items-center">
                    {storyImages.map((f, i) => (
                      <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200 group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                        <button onClick={() => setStoryImages(v => v.filter((_, j) => j !== i))}
                          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <X className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    ))}
                    {storyImages.length < 5 && (
                      <button onClick={() => storyImgRef.current?.click()}
                        className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-1 hover:border-emerald-400/60 transition-colors">
                        <Upload className="w-4 h-4 text-slate-300" />
                        <span className="text-[10px] text-slate-400">Add</span>
                      </button>
                    )}
                    <input ref={storyImgRef} type="file" accept="image/*" multiple className="hidden"
                      onChange={e => { const files = Array.from(e.target.files || []); setStoryImages(v => [...v, ...files].slice(0, 5)); e.target.value = '' }} />
                  </div>
                </div>
                <Button onClick={saveStory} disabled={savingStory || !newStory.trim()} className="w-fit bg-emerald-600 hover:bg-emerald-700 gap-2">
                  {savingStory ? <><Loader2 className="size-4 animate-spin" /> Saving...</> : <><Save className="size-4" /> Save to Story Bank</>}
                </Button>
              </CardContent>
            </Card>

            {stories.length > 0 && (
              <div>
                <div className="text-[13px] font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-slate-400" />
                  Your Story Bank ({stories.length})
                </div>
                <div className="flex flex-col gap-2 mb-5">
                  {stories.map(s => (
                    <div
                      key={s.id}
                      onClick={() => setSelectedStory(selectedStory?.id === s.id ? null : s)}
                      className={`bg-white border-2 rounded-xl p-4 cursor-pointer transition-all duration-150 ${selectedStory?.id === s.id ? 'border-emerald-400 shadow-sm shadow-emerald-100' : 'border-slate-200 hover:border-slate-300'}`}
                    >
                      <div className="flex justify-between items-start gap-3">
                        <p className="text-sm text-gray-600 leading-relaxed line-clamp-2 flex-1">{s.raw_text}</p>
                        {selectedStory?.id === s.id && (
                          <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                            <Check className="w-3 h-3 text-white" strokeWidth={2.5} />
                          </div>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-2">
                        {new Date(s.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {s.status}
                      </div>
                    </div>
                  ))}
                </div>
                {selectedStory && (
                  <Card className="border-slate-100 shadow-sm">
                    <CardContent className="pt-6 flex flex-col gap-3">
                      <div>
                        <Label className="font-medium text-sm text-gray-700">Additional context <span className="text-gray-400 font-normal">(optional)</span></Label>
                        <Input value={additionalContext} onChange={e => setAdditionalContext(e.target.value)} placeholder="e.g. Make it inspirational, add a question at the end" className="mt-1.5 border-slate-200 text-[14px]" />
                      </div>
                      <GenerateButton loading={loading} disabled={!canGenerate} onClick={handleGenerate} loadingMsg={loadingMsg} />
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {stories.length === 0 && (
              <Card className="border-slate-100 shadow-sm">
                <CardContent className="py-14 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="w-6 h-6 text-slate-300" strokeWidth={1.5} />
                  </div>
                  <div className="font-semibold text-gray-800 mb-1.5">Your story bank is empty</div>
                  <div className="text-sm text-gray-600 leading-relaxed">Dump raw experiences above — we&apos;ll help turn them into posts.</div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

            {/* Generated post options */}
            {generatedPosts.length > 0 && !selectedPost && (
              <div className="mt-2">
                <div className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Sparkles className="w-4 h-4 text-brand" />
                  Choose a version:
                </div>
                <div className="flex flex-col gap-3">
                  {generatedPosts.map((post, i) => (
                    <div
                      key={post.id}
                      onClick={() => selectPost(post)}
                      className="bg-white border-2 border-slate-200 rounded-xl p-6 cursor-pointer transition-all duration-150 hover:border-brand hover:shadow-sm group"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-[11px] font-bold text-brand uppercase tracking-wider">Option {i + 1}</div>
                        <div className="text-xs text-slate-400 group-hover:text-brand transition-colors flex items-center gap-1">
                          Select <ArrowLeft className="w-3 h-3 rotate-180" />
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{post.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Selected post editor */}
            {selectedPost && (
              <Card className="mt-2 border-slate-100 shadow-sm">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-base font-semibold text-gray-800">Edit &amp; Schedule</h2>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedPost(null)} className="text-slate-400 text-sm gap-1.5 hover:text-slate-600">
                      <ArrowLeft className="w-3.5 h-3.5" /> Choose different
                    </Button>
                  </div>
                  <Textarea
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    className="min-h-[200px] mb-5 whitespace-pre-wrap resize-none border-slate-200 text-[14px]"
                  />
                  {actionResult === 'scheduled' && (
                    <div className="rounded-xl px-4 py-3 mb-4 text-sm bg-green-50 border border-green-200 text-green-700 flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-600" />
                      Post scheduled successfully!
                    </div>
                  )}
                  {actionResult === 'approval_sent' && (
                    <div className="rounded-xl px-4 py-3 mb-4 text-sm bg-blue-50 border border-blue-200 text-blue-700 flex items-center gap-2">
                      <Mail className="w-4 h-4 text-blue-600" />
                      Approval email sent! Check your inbox.
                    </div>
                  )}
                  {actionResult.startsWith('Error') && (
                    <div className="rounded-xl px-4 py-3 mb-4 text-sm bg-red-50 border border-red-200 text-red-600">
                      {actionResult}
                    </div>
                  )}
                  <div className="flex flex-col gap-2.5">
                    <div className="flex flex-col sm:flex-row gap-2.5">
                      <Input
                        type="datetime-local"
                        value={scheduleDate}
                        onChange={e => setScheduleDate(e.target.value)}
                        min={new Date().toISOString().slice(0, 16)}
                        className="flex-1 border-slate-200 text-[14px]"
                      />
                      <Button onClick={schedulePost} disabled={scheduling || !scheduleDate} className="whitespace-nowrap gap-1.5 shadow-sm w-full sm:w-auto px-4 py-2.5 font-medium rounded-lg">
                        {scheduling ? <><Loader2 className="size-4 animate-spin" /> Scheduling...</> : <><CalendarClock className="size-4" /> Schedule</>}
                      </Button>
                    </div>
                    <Button variant="outline" onClick={sendApproval} className="text-brand border-brand/30 hover:bg-brand-light gap-1.5 px-4 py-2.5 font-medium rounded-lg">
                      <Mail className="size-4" /> Send Approval Email
                    </Button>
                  </div>

                  {/* Image suggestions */}
                  {(fetchingImages || imageSuggestions.length > 0) && (
                    <div className="mt-6 pt-6 border-t border-slate-100">
                      <div className="text-[13px] font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-slate-400" />
                        Image Ideas
                      </div>
                      {fetchingImages ? (
                        <div className="flex items-center gap-2 text-[13px] text-slate-400">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating ideas...
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2.5">
                          {imageSuggestions.map((s, i) => (
                            <div key={i} className="flex gap-3 bg-slate-50 rounded-xl p-3.5 border border-slate-100">
                              <span className="text-xl shrink-0">{s.icon}</span>
                              <div className="flex-1 min-w-0">
                                <div className="text-[13px] font-semibold text-gray-800">{s.suggestion}</div>
                                <div className="text-[12px] text-slate-400 mt-0.5">{s.why}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Image upload */}
                  <ImageUploadSection onUpload={url => setUploadedImageUrl(url)} />
                  {uploadedImageUrl && (
                    <div className="mt-2 text-[12px] text-emerald-600 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5" /> Image ready — will be attached when you schedule
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

        </div>
      </Tabs>
    </div>
  )
}

function GeneratePageSidebar({ postsLimit }: { postsLimit: number | null }) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">Writing tips</p>
        {[
          'Be specific — name a real situation or result',
          'Start with a hook — a question or bold claim',
          'Keep it under 200 words for best engagement',
          'End with one clear question or CTA',
        ].map((tip, i) => (
          <div key={i} className="flex gap-2 mb-3 last:mb-0">
            <span className="text-blue-500 text-xs mt-0.5 shrink-0">✦</span>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{tip}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 p-5">
        <p className="text-xs font-medium text-blue-400 uppercase tracking-wide mb-1">Best time to post</p>
        <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">Tue–Thu</p>
        <p className="text-sm text-blue-600 dark:text-blue-400">8–10am gets 3× more views</p>
      </div>

      <div className="relative flex items-center justify-center py-6 overflow-hidden rounded-2xl bg-slate-50 dark:bg-slate-900/50">
        <ConcentricRings size={200} opacity={0.15} />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-3xl font-bold text-blue-600">{postsLimit ?? '—'}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">posts per month</p>
        </div>
      </div>
    </div>
  )
}

function GenerateButton({ loading, disabled, onClick, loadingMsg }: { loading: boolean; disabled: boolean; onClick: () => void; loadingMsg?: string }) {
  return (
    <Button
      onClick={onClick}
      disabled={loading || disabled}
      className="w-full mt-4 h-12 text-[15px] font-medium gap-2 shadow-sm hover:shadow-md transition-shadow rounded-lg"
    >
      {loading
        ? <><Loader2 className="size-4 animate-spin" /> {loadingMsg || 'Generating...'}</>
        : <><Sparkles className="size-4" /> Generate Posts</>
      }
    </Button>
  )
}

function UpgradePrompt({ feature, minPlan, icon: Icon }: { feature: string; minPlan: string; icon: React.ElementType }) {
  return (
    <div className="text-center py-12">
      <div className="relative inline-block mb-5">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto">
          <Icon className="w-8 h-8 text-slate-300" strokeWidth={1.5} />
        </div>
        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center shadow-sm">
          <Lock className="w-3 h-3 text-white" strokeWidth={2.5} />
        </div>
      </div>
      <div className="text-lg font-bold text-gray-900 mb-2">{feature}</div>
      <p className="text-sm text-gray-600 leading-relaxed mb-6">
        This feature is available on <strong>{minPlan}</strong> and above.
      </p>
      <Button render={<Link href="/dashboard/settings?tab=plan" />} className="gap-1.5 px-4 py-2.5 font-medium rounded-lg">
        <Zap className="w-4 h-4" />
        Upgrade Plan
      </Button>
    </div>
  )
}

export default function GeneratePage() {
  return <Suspense><GenerateContent /></Suspense>
}

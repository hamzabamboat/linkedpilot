'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase, StoryBank } from '@/lib/supabase'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
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

const LOADING_MESSAGES = [
  'Researching your industry...',
  'Writing in your voice...',
  'Crafting the hook...',
  'Adding hashtags...',
  'Polishing the post...',
]

const BATCH_MESSAGES = [
  'Analysing your profile and pillars...',
  'Researching trending topics in your industry...',
  'Writing posts in your voice...',
  'Distributing across your content pillars...',
  'Scheduling across the month...',
  'Almost done — finalising your calendar...',
]

type Tab = 'ai' | 'voice' | 'story'

function BatchGenerateCard({ plan, postsLimit, monthName }: { plan: string; postsLimit: number; monthName: string }) {
  const [loading, setLoading] = useState(false)
  const [msgIdx, setMsgIdx] = useState(0)
  const [result, setResult] = useState<{ postsGenerated: number; nextPostDate: string | null } | null>(null)
  const [error, setError] = useState('')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  async function handleBatchGenerate() {
    setLoading(true); setError(''); setResult(null); setMsgIdx(0)
    intervalRef.current = setInterval(() => {
      setMsgIdx(i => (i + 1) % BATCH_MESSAGES.length)
    }, 3000)
    try {
      const res = await fetch('/api/posts/generate-batch', { method: 'POST' })
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      setResult({ postsGenerated: data.postsGenerated, nextPostDate: data.nextPostDate })
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      if (intervalRef.current) clearInterval(intervalRef.current)
      setLoading(false)
    }
  }

  if (result) {
    return (
      <Card className="mb-6 border-emerald-200 bg-emerald-50 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-semibold text-emerald-800">{result.postsGenerated} posts generated for {monthName}</div>
              {result.nextPostDate && <div className="text-[13px] text-emerald-600">Next post: {result.nextPostDate}</div>}
            </div>
          </div>
          <Link href="/dashboard/posts">
            <Button variant="outline" size="sm" className="gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-100">
              View all posts <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mb-6 border-[#0B458B]/20 bg-gradient-to-br from-[#0B458B]/5 to-blue-50 shadow-sm">
      <CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <div className="font-bold text-lg text-gray-900 mb-1">Generate posts for {monthName}</div>
            <div className="text-sm text-gray-600 leading-relaxed">
              Based on your profile, industry, and content pillars — no input needed.
              AI will write {postsLimit} posts and schedule them across the month.
            </div>
            {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
          </div>
          <div className="shrink-0">
            {loading ? (
              <div className="flex flex-col items-center gap-2 min-w-[200px]">
                <Loader2 className="w-6 h-6 animate-spin text-[#0B458B]" />
                <div className="text-[12px] text-slate-500 text-center">{BATCH_MESSAGES[msgIdx]}</div>
              </div>
            ) : (
              <Button onClick={handleBatchGenerate} className="gap-2 whitespace-nowrap shadow-sm hover:shadow-md transition-shadow">
                <Sparkles className="w-4 h-4" />
                Generate my {postsLimit} posts for {monthName} →
              </Button>
            )}
          </div>
        </div>

        {loading && (
          <div className="mt-4 space-y-2">
            {BATCH_MESSAGES.slice(0, msgIdx + 1).map((msg, i) => (
              <div key={i} className="flex items-center gap-2 text-[12px] text-slate-500">
                {i < msgIdx
                  ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  : <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0B458B] shrink-0" />
                }
                {msg}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
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
  const [postsLimit, setPostsLimit] = useState(12)
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

  const [voiceImages, setVoiceImages] = useState<File[]>([])
  const [storyImages, setStoryImages] = useState<File[]>([])
  const voiceImgRef = useRef<HTMLInputElement>(null)
  const storyImgRef = useRef<HTMLInputElement>(null)

  const [stories, setStories] = useState<StoryBank[]>([])
  const [newStory, setNewStory] = useState('')
  const [savingStory, setSavingStory] = useState(false)
  const [selectedStory, setSelectedStory] = useState<StoryBank | null>(null)

  const monthName = new Date().toLocaleDateString('en-IN', { month: 'long' })

  useEffect(() => {
    fetch('/api/me').then(r => r.json()).then(d => {
      if (d.profile) {
        setPlan(d.profile.plan || 'starter')
        setPostsLimit(d.profile.posts_limit || 12)
      }
    })
    loadStories()
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
      recorder.onstop = () => { setAudioBlob(new Blob(chunksRef.current, { type: 'audio/webm' })); stream.getTracks().forEach(t => t.stop()) }
      recorder.start()
      mediaRef.current = recorder
      setRecording(true)
    } catch { setError('Microphone permission denied.') }
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
      const body: Record<string, unknown> = { additionalContext }
      if (tab === 'ai') body.topic = topic
      if (tab === 'voice') body.voiceNoteId = voiceNoteId
      if (tab === 'story' && selectedStory) body.storyBankId = selectedStory.id

      const res = await fetch('/api/posts/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (data.error) { setError(data.error === 'trial_exhausted' ? 'Post limit reached. Upgrade your plan to continue.' : data.error); return }
      setGeneratedPosts(data.posts || [])
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
    <div className="p-4 md:p-7 max-w-[820px]">
      <div className="mb-5 md:mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1 tracking-tight">Generate Post</h1>
        <p className="text-sm text-gray-600 leading-relaxed">AI writes in your exact voice. You approve before it goes live.</p>
      </div>

      {/* Zero-prompt batch card */}
      <BatchGenerateCard plan={plan} postsLimit={postsLimit} monthName={monthName} />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm mb-5 flex items-center gap-2">
          {error}
          {error.includes('limit') && (
            <Link href="/dashboard/settings?tab=plan" className="ml-1 font-semibold underline">Upgrade →</Link>
          )}
        </div>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="mb-6">
        <TabsList className="h-10 gap-1 p-1">
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

        {/* AI Generate */}
        <TabsContent value="ai">
          <Card className="mt-4 border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="pt-6 flex flex-col gap-4">
              <div>
                <Label htmlFor="topic" className="font-medium text-sm text-gray-700 mb-1.5">What do you want to post about?</Label>
                <Textarea
                  id="topic"
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  placeholder="e.g. Why most startup advice is wrong, and what I learned building my first company..."
                  className="mt-1.5 min-h-[100px] resize-none border-slate-200 focus:border-brand/50 text-[14px]"
                />
              </div>
              <div>
                <Label htmlFor="context" className="font-medium text-sm text-gray-700 mb-1.5">Additional instructions <span className="text-gray-400 font-normal">(optional)</span></Label>
                <Input
                  id="context"
                  value={additionalContext}
                  onChange={e => setAdditionalContext(e.target.value)}
                  placeholder="e.g. Keep it under 200 words, make it conversational"
                  className="mt-1.5 border-slate-200 focus:border-brand/50 text-[14px]"
                />
              </div>
              <GenerateButton loading={loading} disabled={!canGenerate} onClick={handleGenerate} loadingMsg={loadingMsg} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Voice Note */}
        <TabsContent value="voice">
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
                  {audioBlob && !voiceNoteId && (
                    <Button onClick={() => transcribeAudio(audioBlob)} disabled={transcribing} className="bg-pro hover:bg-pro/90 w-fit gap-2">
                      {transcribing ? <><Loader2 className="size-4 animate-spin" /> Transcribing...</> : <><Sparkles className="size-4" /> Transcribe</>}
                    </Button>
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
        <TabsContent value="story">
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
      </Tabs>

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

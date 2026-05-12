'use client'

import { useState, useEffect, useRef } from 'react'
import { StoryBank } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import {
  BookOpen, Plus, Sparkles, Trash2, Save, Loader2,
  Mic, MicOff, Upload, SquareIcon, CheckCircle2, Clock, RefreshCw,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { QuarterRings } from '@/components/concentric-rings'

type InputMode = 'text' | 'voice'

function storyStatusLabel(status: StoryBank['status']) {
  if (status === 'converted') return { label: 'Used in a post', color: 'text-emerald-600 bg-emerald-50' }
  if (status === 'dismissed') return { label: 'Skipped', color: 'text-slate-400 bg-slate-50' }
  return { label: 'Queued for next batch', color: 'text-blue-600 bg-blue-50' }
}

function storyStatusIcon(status: StoryBank['status']) {
  if (status === 'converted') return <CheckCircle2 className="w-3 h-3" />
  if (status === 'dismissed') return null
  return <Clock className="w-3 h-3" />
}

export default function StoryBankPage() {
  const [stories, setStories] = useState<StoryBank[]>([])
  const [loading, setLoading] = useState(true)
  const [newStory, setNewStory] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [inputMode, setInputMode] = useState<InputMode>('text')

  // Voice recording state
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [transcript, setTranscript] = useState('')
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchStories()
  }, [])

  async function fetchStories() {
    setLoading(true)
    try {
      const res = await fetch('/api/story-bank')
      if (!res.ok) return
      const { stories } = await res.json()
      setStories(stories || [])
    } catch {
      /* non-fatal */
    } finally {
      setLoading(false)
    }
  }

  async function saveStory() {
    const text = inputMode === 'voice' ? transcript : newStory
    if (!text.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/story-bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_text: text }),
      })
      const data = await res.json()
      if (data.error) { toast.error(data.error); return }
      setNewStory('')
      setTranscript('')
      setAudioBlob(null)
      setShowForm(false)
      toast.success('Story saved to your bank!')
      fetchStories()
    } catch {
      toast.error('Failed to save story. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function deleteStory(id: string) {
    setDeleting(id)
    try {
      const res = await fetch(`/api/story-bank?id=${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.error) { toast.error('Failed to delete story.'); return }
      setStories(prev => prev.filter(s => s.id !== id))
      toast.success('Story deleted.')
    } catch {
      toast.error('Failed to delete story.')
    } finally {
      setDeleting(null)
    }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      chunksRef.current = []
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        stream.getTracks().forEach(t => t.stop())
        transcribeAudio(blob)
      }
      mr.start()
      mediaRecorderRef.current = mr
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
        toast.error('Could not access microphone. Please check your device.')
      }
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop()
    setRecording(false)
  }

  async function transcribeAudio(blob: Blob) {
    setTranscribing(true)
    try {
      const formData = new FormData()
      formData.append('audio', blob, 'recording.webm')
      const res = await fetch('/api/transcribe', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.error) {
        toast.error(data.error)
        return
      }
      setTranscript(data.transcript || '')
      toast.success('Transcription complete — edit if needed before saving.')
    } catch {
      toast.error('Transcription failed. Please try again.')
    } finally {
      setTranscribing(false)
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAudioBlob(file)
    await transcribeAudio(file)
    e.target.value = ''
  }

  function resetVoice() {
    setAudioBlob(null)
    setTranscript('')
    setRecording(false)
    mediaRecorderRef.current?.stop()
  }

  const canSave = inputMode === 'voice' ? !!transcript.trim() : !!newStory.trim()

  return (
    <div className="p-4 md:p-7 max-w-[820px]">
      <div className="flex items-start justify-between mb-6 relative overflow-hidden">
        <QuarterRings size={200} color="blue" className="absolute top-0 right-0 pointer-events-none hidden lg:block" />
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1 tracking-tight">Story Bank</h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            Dump raw experiences here. AI turns them into authentic LinkedIn posts in your next batch.
          </p>
        </div>
        <Button onClick={() => { setShowForm(v => !v); setInputMode('text') }} className="gap-2 shrink-0">
          <Plus className="w-4 h-4" />
          Add Story
        </Button>
      </div>

      {/* Add story form */}
      {showForm && (
        <Card className="mb-6 border-brand/20 shadow-sm">
          <CardContent className="pt-5 pb-5">
            {/* Mode toggle */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => { setInputMode('text'); resetVoice() }}
                className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${inputMode === 'text' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                Text
              </button>
              <button
                onClick={() => { setInputMode('voice'); setNewStory('') }}
                className={`px-3 py-1.5 rounded-lg text-[13px] font-medium flex items-center gap-1.5 transition-colors ${inputMode === 'voice' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                <Mic className="w-3.5 h-3.5" />
                Voice note
              </button>
            </div>

            {inputMode === 'text' ? (
              <>
                <p className="text-[13px] text-slate-500 mb-3 leading-relaxed">
                  Write it unpolished — a tough meeting, a decision, a lesson. Don&apos;t overthink it.
                </p>
                <Textarea
                  value={newStory}
                  onChange={e => setNewStory(e.target.value)}
                  placeholder="This week I had a tough conversation with a potential investor who told me..."
                  className="min-h-[140px] resize-none border-slate-200 text-[14px] mb-3"
                  autoFocus
                />
              </>
            ) : (
              <div className="mb-3">
                <p className="text-[13px] text-slate-500 mb-3 leading-relaxed">
                  Record yourself talking through a story or upload an existing audio clip. It auto-transcribes.
                </p>

                {!audioBlob && !transcribing && !transcript && (
                  <div className="flex flex-wrap gap-3">
                    <Button
                      onClick={recording ? stopRecording : startRecording}
                      variant={recording ? 'destructive' : 'outline'}
                      className="gap-2"
                    >
                      {recording ? (
                        <><SquareIcon className="w-4 h-4" /> Stop recording</>
                      ) : (
                        <><Mic className="w-4 h-4" /> Record</>
                      )}
                    </Button>
                    {recording && (
                      <span className="flex items-center gap-1.5 text-[13px] text-red-500 font-medium">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        Recording…
                      </span>
                    )}
                    {!recording && (
                      <>
                        <Button variant="outline" className="gap-2" onClick={() => fileInputRef.current?.click()}>
                          <Upload className="w-4 h-4" /> Upload audio
                        </Button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="audio/*"
                          className="hidden"
                          onChange={handleFileUpload}
                        />
                      </>
                    )}
                  </div>
                )}

                {transcribing && (
                  <div className="flex items-center gap-2 py-4 text-slate-500 text-[13px]">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Transcribing your voice note…
                  </div>
                )}

                {transcript && !transcribing && (
                  <>
                    <div className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Transcript — edit if needed</div>
                    <Textarea
                      value={transcript}
                      onChange={e => setTranscript(e.target.value)}
                      className="min-h-[140px] resize-none border-slate-200 text-[14px] mb-2"
                      autoFocus
                    />
                    <button
                      onClick={resetVoice}
                      className="text-[12px] text-slate-400 hover:text-slate-600 flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" /> Re-record or upload different file
                    </button>
                  </>
                )}
              </div>
            )}

            <div className="flex gap-2 mt-3">
              <Button
                onClick={saveStory}
                disabled={saving || !canSave}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700"
              >
                {saving
                  ? <><Loader2 className="size-4 animate-spin" /> Saving...</>
                  : <><Save className="size-4" /> Save to Bank</>
                }
              </Button>
              <Button
                variant="outline"
                onClick={() => { setShowForm(false); setNewStory(''); resetVoice() }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* How it works banner */}
      {!loading && stories.length > 0 && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-blue-50 border border-blue-100 text-[13px] text-blue-700 leading-relaxed">
          <span className="font-semibold">How stories are used:</span> Stories queued in your bank are automatically picked up during your next AI batch generation and turned into posts that sound like you. Once a story is used, it&apos;s marked as <span className="font-medium">Used in a post</span>.
        </div>
      )}

      {/* Story list */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton h-36 rounded-2xl" />
          ))}
        </div>
      ) : stories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-emerald-300" strokeWidth={1.5} />
          </div>
          <h3 className="font-bold text-slate-800 text-lg mb-1">No stories yet</h3>
          <p className="text-slate-400 text-sm mb-6 max-w-xs leading-relaxed">
            Add raw experiences — text or voice — and let AI turn them into authentic posts in your next batch.
          </p>
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Add your first story
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {stories.map(story => {
            const statusInfo = storyStatusLabel(story.status)
            return (
              <Card key={story.id} className="border-slate-100 shadow-sm hover:shadow-md card-hover">
                <CardContent className="pt-5 pb-4">
                  {story.title && (
                    <div className="text-[12px] font-bold text-slate-400 uppercase tracking-wider mb-2">{story.title}</div>
                  )}
                  <p className="text-[14px] text-slate-600 leading-relaxed mb-4 line-clamp-4">{story.raw_text}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400">
                        {new Date(story.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${statusInfo.color}`}>
                        {storyStatusIcon(story.status)}
                        {statusInfo.label}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-red-400 hover:text-red-600 hover:bg-red-50 px-2"
                        onClick={() => deleteStory(story.id)}
                        disabled={deleting === story.id}
                      >
                        {deleting === story.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Trash2 className="w-3.5 h-3.5" />
                        }
                      </Button>
                      <Link href="/dashboard/generate?tab=story">
                        <Button size="sm" className="h-7 gap-1.5 text-xs">
                          <Sparkles className="w-3.5 h-3.5" />
                          Generate post
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect, useRef } from 'react'
import { StoryBank } from '@/lib/supabase'
import { Textarea } from '@/components/ui/textarea'
import {
  BookOpen, Plus, Sparkles, Trash2, Save, Loader2,
  Mic, Upload, SquareIcon, CheckCircle2, Clock, RefreshCw,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

type InputMode = 'text' | 'voice'

function storyStatusInfo(status: StoryBank['status']) {
  if (status === 'converted') return { label: 'Used in a post', color: '#059669' }
  if (status === 'dismissed') return { label: 'Skipped', color: 'var(--ink-4)' }
  return { label: 'Queued for next batch', color: 'var(--pl-accent)' }
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
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [transcript, setTranscript] = useState('')
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { fetchStories() }, [])

  async function fetchStories() {
    setLoading(true)
    try {
      const res = await fetch('/api/story-bank')
      if (!res.ok) return
      const { stories } = await res.json()
      setStories(stories || [])
    } catch { /* non-fatal */ } finally { setLoading(false) }
  }

  async function saveStory() {
    const text = inputMode === 'voice' ? transcript : newStory
    if (!text.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/story-bank', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_text: text }),
      })
      const data = await res.json()
      if (data.error) { toast.error(data.error); return }
      setNewStory(''); setTranscript(''); setAudioBlob(null); setShowForm(false)
      toast.success('Story saved!')
      fetchStories()
    } catch { toast.error('Failed to save story.') } finally { setSaving(false) }
  }

  async function deleteStory(id: string) {
    setDeleting(id)
    try {
      const res = await fetch(`/api/story-bank?id=${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.error) { toast.error('Failed to delete story.'); return }
      setStories(prev => prev.filter(s => s.id !== id))
      toast.success('Story deleted.')
    } catch { toast.error('Failed to delete story.') } finally { setDeleting(null) }
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
      mr.start(); mediaRecorderRef.current = mr; setRecording(true)
    } catch (err) {
      const isDenied = err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')
      if (isDenied) {
        toast.error('Microphone access denied', {
          description: 'Click the lock icon in the address bar → Site settings → Allow Microphone',
          action: { label: 'Try Again', onClick: startRecording }, duration: 12000,
        })
      } else { toast.error('Could not access microphone.') }
    }
  }

  function stopRecording() { mediaRecorderRef.current?.stop(); setRecording(false) }

  async function transcribeAudio(blob: Blob) {
    setTranscribing(true)
    try {
      const formData = new FormData()
      formData.append('audio', blob, 'recording.webm')
      const res = await fetch('/api/transcribe', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.error) { toast.error(data.error); return }
      setTranscript(data.transcript || '')
      toast.success('Transcription complete — edit if needed.')
    } catch { toast.error('Transcription failed.') } finally { setTranscribing(false) }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAudioBlob(file)
    await transcribeAudio(file)
    e.target.value = ''
  }

  function resetVoice() { setAudioBlob(null); setTranscript(''); setRecording(false); mediaRecorderRef.current?.stop() }

  const canSave = inputMode === 'voice' ? !!transcript.trim() : !!newStory.trim()

  return (
    <div className="p-4 md:p-7 max-w-[820px]">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 style={{ fontFamily: 'var(--f-sans)', fontWeight: 600, fontSize: 22, color: 'var(--ink)', letterSpacing: '-0.025em', marginBottom: 4 }}>
            Story Bank
          </h1>
          <p style={{ fontSize: 13, color: 'var(--ink-4)', lineHeight: 1.5 }}>
            Dump raw experiences here — AI turns them into authentic posts in your next batch.
          </p>
        </div>
        <button
          onClick={() => { setShowForm(v => !v); setInputMode('text') }}
          className="flex items-center gap-2 shrink-0 transition-opacity hover:opacity-80"
          style={{
            background: 'var(--pl-accent)', color: '#fff',
            borderRadius: 'var(--r-sm)', padding: '7px 14px',
            fontSize: 13, fontWeight: 600,
          }}
        >
          <Plus className="w-4 h-4" />
          Add Story
        </button>
      </div>

      {/* Add story form */}
      {showForm && (
        <div className="mb-6 p-5" style={{ background: 'var(--surface)', border: '1px solid var(--pl-accent-2)', borderRadius: 'var(--r-lg)' }}>
          {/* Mode toggle */}
          <div className="flex gap-2 mb-4">
            {(['text', 'voice'] as InputMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => { setInputMode(mode); if (mode === 'text') resetVoice(); else setNewStory('') }}
                className="flex items-center gap-1.5 transition-all"
                style={{
                  padding: '6px 12px', borderRadius: 'var(--r-sm)', fontSize: 13, fontWeight: 500,
                  background: inputMode === mode ? 'var(--ink)' : 'var(--surface-2)',
                  color: inputMode === mode ? '#fff' : 'var(--ink-3)',
                  border: '1px solid ' + (inputMode === mode ? 'var(--ink)' : 'var(--line)'),
                }}
              >
                {mode === 'voice' && <Mic className="w-3.5 h-3.5" />}
                {mode === 'text' ? 'Text' : 'Voice note'}
              </button>
            ))}
          </div>

          {inputMode === 'text' ? (
            <>
              <p style={{ fontSize: 13, color: 'var(--ink-4)', marginBottom: 10, lineHeight: 1.5 }}>
                Write it unpolished — a tough meeting, a decision, a lesson. Don&apos;t overthink it.
              </p>
              <Textarea
                value={newStory}
                onChange={e => setNewStory(e.target.value)}
                placeholder="This week I had a tough conversation with a potential investor who told me..."
                className="min-h-[140px] resize-none text-[14px] mb-3"
                style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--ink)', borderRadius: 'var(--r-md)' }}
                autoFocus
              />
            </>
          ) : (
            <div className="mb-3">
              <p style={{ fontSize: 13, color: 'var(--ink-4)', marginBottom: 10, lineHeight: 1.5 }}>
                Record yourself talking through a story or upload an existing audio clip. It auto-transcribes.
              </p>

              {!audioBlob && !transcribing && !transcript && (
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={recording ? stopRecording : startRecording}
                    className="flex items-center gap-2 transition-all hover:opacity-80"
                    style={{
                      padding: '8px 14px', borderRadius: 'var(--r-sm)', fontSize: 13, fontWeight: 500,
                      background: recording ? '#ef4444' : 'var(--surface-2)',
                      color: recording ? '#fff' : 'var(--ink-2)',
                      border: '1px solid ' + (recording ? '#ef4444' : 'var(--line)'),
                    }}
                  >
                    {recording ? <><SquareIcon className="w-4 h-4" /> Stop recording</> : <><Mic className="w-4 h-4" /> Record</>}
                  </button>
                  {recording && (
                    <span className="flex items-center gap-1.5" style={{ fontSize: 13, color: '#ef4444', fontWeight: 500 }}>
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      Recording…
                    </span>
                  )}
                  {!recording && (
                    <>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 transition-all hover:opacity-80"
                        style={{ padding: '8px 14px', borderRadius: 'var(--r-sm)', fontSize: 13, fontWeight: 500, color: 'var(--ink-2)', border: '1px solid var(--line)', background: 'var(--surface-2)' }}
                      >
                        <Upload className="w-4 h-4" /> Upload audio
                      </button>
                      <input ref={fileInputRef} type="file" accept="audio/*" className="hidden" onChange={handleFileUpload} />
                    </>
                  )}
                </div>
              )}

              {transcribing && (
                <div className="flex items-center gap-2 py-4" style={{ fontSize: 13, color: 'var(--ink-3)' }}>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Transcribing your voice note…
                </div>
              )}

              {transcript && !transcribing && (
                <>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8, fontFamily: 'var(--f-mono)' }}>
                    // transcript — edit if needed
                  </div>
                  <Textarea
                    value={transcript}
                    onChange={e => setTranscript(e.target.value)}
                    className="min-h-[140px] resize-none text-[14px] mb-2"
                    style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--ink)', borderRadius: 'var(--r-md)' }}
                    autoFocus
                  />
                  <button
                    onClick={resetVoice}
                    className="flex items-center gap-1 transition-opacity hover:opacity-70"
                    style={{ fontSize: 12, color: 'var(--ink-4)' }}
                  >
                    <RefreshCw className="w-3 h-3" /> Re-record or upload different file
                  </button>
                </>
              )}
            </div>
          )}

          <div className="flex gap-2 mt-3">
            <button
              onClick={saveStory}
              disabled={saving || !canSave}
              className="flex items-center gap-2 transition-opacity"
              style={{
                padding: '8px 16px', borderRadius: 'var(--r-sm)', fontSize: 13, fontWeight: 600,
                background: 'var(--pl-accent)', color: '#fff',
                opacity: saving || !canSave ? 0.5 : 1,
              }}
            >
              {saving ? <><Loader2 className="size-4 animate-spin" /> Saving…</> : <><Save className="size-4" /> Save to Bank</>}
            </button>
            <button
              onClick={() => { setShowForm(false); setNewStory(''); resetVoice() }}
              style={{ padding: '8px 14px', borderRadius: 'var(--r-sm)', fontSize: 13, fontWeight: 500, color: 'var(--ink-2)', border: '1px solid var(--line)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* How it works hint */}
      {!loading && stories.length > 0 && (
        <div className="mb-4 px-4 py-3" style={{ borderRadius: 'var(--r-md)', background: 'var(--pl-accent-soft)', border: '1px solid var(--pl-accent-2)', fontSize: 13, color: 'var(--pl-accent)', lineHeight: 1.5 }}>
          <span style={{ fontWeight: 600 }}>How stories are used:</span> Stories queued here are automatically picked up during your next AI batch and turned into posts that sound like you. Once used, a story is marked as <span style={{ fontWeight: 500 }}>Used in a post</span>.
        </div>
      )}

      {/* Story list */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-36 rounded-2xl" />)}
        </div>
      ) : stories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div
            className="flex items-center justify-center mb-4"
            style={{ width: 56, height: 56, borderRadius: 'var(--r-md)', background: 'var(--surface-2)', border: '1px solid var(--line)' }}
          >
            <BookOpen className="w-7 h-7" style={{ color: 'var(--ink-4)' }} strokeWidth={1.5} />
          </div>
          <h3 style={{ fontWeight: 600, fontSize: 16, color: 'var(--ink)', marginBottom: 6 }}>No stories yet</h3>
          <p style={{ fontSize: 13, color: 'var(--ink-4)', marginBottom: 20, maxWidth: 280, lineHeight: 1.5 }}>
            Add raw experiences — text or voice — and let AI turn them into authentic posts in your next batch.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 transition-opacity hover:opacity-80"
            style={{ background: 'var(--pl-accent)', color: '#fff', borderRadius: 'var(--r-sm)', padding: '8px 16px', fontSize: 13, fontWeight: 600 }}
          >
            <Plus className="w-4 h-4" /> Add your first story
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {stories.map(story => {
            const statusInfo = storyStatusInfo(story.status)
            return (
              <div
                key={story.id}
                style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: '16px 18px' }}
              >
                {story.title && (
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8, fontFamily: 'var(--f-mono)' }}>
                    // {story.title}
                  </div>
                )}
                <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.6, marginBottom: 14 }}
                  className="line-clamp-4">{story.raw_text}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--f-mono)' }}>
                      {new Date(story.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    <span
                      className="flex items-center gap-1"
                      style={{
                        fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 'var(--r-full)',
                        background: statusInfo.color + '18', color: statusInfo.color,
                      }}
                    >
                      {storyStatusIcon(story.status)}
                      {statusInfo.label}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => deleteStory(story.id)}
                      disabled={deleting === story.id}
                      className="flex items-center justify-center transition-opacity hover:opacity-70"
                      style={{ width: 30, height: 30, borderRadius: 'var(--r-sm)', color: '#ef4444' }}
                    >
                      {deleting === story.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                    <Link
                      href="/dashboard/generate?tab=story"
                      className="flex items-center gap-1.5 transition-opacity hover:opacity-80"
                      style={{
                        height: 30, padding: '0 12px', borderRadius: 'var(--r-sm)',
                        background: 'var(--pl-accent-soft)', color: 'var(--pl-accent)',
                        border: '1px solid var(--pl-accent-2)', fontSize: 12, fontWeight: 600,
                      }}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Generate post
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

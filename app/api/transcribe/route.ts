import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromRequest } from '@/lib/auth'
import { extractMemoriesFromContent } from '@/lib/anthropic'
import { checkLimit, incrementUsage, logViolation } from '@/lib/usage-limits'
import { checkCircuitBreaker, trackAndCheckSpend } from '@/lib/circuit-breaker'
import { checkRateLimit, incrementRateLimit } from '@/lib/rate-limiter'

export const maxDuration = 60

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('plan')
      .eq('user_id', user.id)
      .maybeSingle()

    const plan = profile?.plan || 'starter'

    const cb = await checkCircuitBreaker()
    if (cb.open) return NextResponse.json({ error: 'Service temporarily paused. Our team has been notified.' }, { status: 503 })

    const rl = await checkRateLimit(user.id, 'whisper_calls')
    if (!rl.allowed) {
      const retryAt = new Date(Date.now() + rl.retryAfterSeconds * 1000).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
      return NextResponse.json(
        { error: `Too many transcription requests this hour (limit: ${rl.limit}). Try again at ${retryAt}.` },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
      )
    }

    if (plan === 'starter') {
      return NextResponse.json({ error: 'Voice notes are not available on the Starter plan. Upgrade to Standard.', feature: 'voice_transcriptions', plan }, { status: 403 })
    }

    const transcriptCheck = await checkLimit(user.id, plan, 'voice_transcriptions')
    if (!transcriptCheck.allowed) {
      await logViolation(user.id, 'voice_transcriptions', plan)
      return NextResponse.json({ error: `You've used all ${transcriptCheck.limit} voice note transcriptions this month.`, feature: 'voice_transcriptions', used: transcriptCheck.used, limit: transcriptCheck.limit, plan }, { status: 429 })
    }

    const minutesCheck = await checkLimit(user.id, plan, 'voice_minutes')
    if (!minutesCheck.allowed) {
      return NextResponse.json({ error: `You've used all ${minutesCheck.limit} voice minutes this month.`, feature: 'voice_minutes', used: minutesCheck.used, limit: minutesCheck.limit, plan }, { status: 429 })
    }

    const formData = await request.formData()
    const file = formData.get('audio') as File | null
    if (!file) return NextResponse.json({ error: 'No audio file provided' }, { status: 400 })

    const MAX_SIZE = 25 * 1024 * 1024
    if (file.size > MAX_SIZE) return NextResponse.json({ error: 'File too large (max 25 MB)' }, { status: 400 })

    const estimatedMinutes = Math.ceil(file.size / (1024 * 1024))
    if (minutesCheck.remaining < estimatedMinutes) {
      return NextResponse.json({ error: `Not enough voice minutes remaining. You have ${minutesCheck.remaining} minute${minutesCheck.remaining !== 1 ? 's' : ''} left this month.`, feature: 'voice_minutes', used: minutesCheck.used, limit: minutesCheck.limit, plan }, { status: 429 })
    }

    const { data: voiceNote, error: insertError } = await supabaseAdmin
      .from('voice_notes')
      .insert({ user_id: user.id, file_name: file.name, status: 'pending' })
      .select()
      .single()

    if (insertError) return NextResponse.json({ error: 'Failed to save voice note' }, { status: 500 })

    try {
      const transcription = await openai.audio.transcriptions.create({ file, model: 'whisper-1', language: 'en' })
      await supabaseAdmin.from('voice_notes').update({ transcript: transcription.text, status: 'transcribed' }).eq('id', voiceNote.id)
      await Promise.all([
        incrementUsage(user.id, 'voice_transcriptions'),
        incrementUsage(user.id, 'voice_minutes', estimatedMinutes),
        incrementRateLimit(user.id, 'whisper_calls'),
        trackAndCheckSpend('openai_whisper', user.id, { minutes: estimatedMinutes }),
      ])

      // Fire-and-forget: extract life events and stories from the voice note
      extractMemoriesFromContent(transcription.text, 'voice_note').then(async (memories) => {
        if (!memories.length) return
        await supabaseAdmin.from('user_memories').insert(
          memories.map(m => ({
            user_id: user.id,
            memory_type: m.memory_type,
            content: m.content,
            occurred_at: m.occurred_at,
            source: 'voice_note',
            source_id: voiceNote.id,
            posted_about: false,
          }))
        )
      }).catch(() => { /* non-fatal */ })

      return NextResponse.json({ voiceNoteId: voiceNote.id, transcript: transcription.text })
    } catch (err) {
      await supabaseAdmin.from('voice_notes').update({ status: 'failed' }).eq('id', voiceNote.id)
      console.error('[transcribe] Whisper error:', err)
      return NextResponse.json({ error: 'Transcription failed. Please try again.' }, { status: 500 })
    }
  } catch (error) {
    console.error('[transcribe]', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

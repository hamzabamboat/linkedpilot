import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromRequest } from '@/lib/auth'
import { checkLimit, incrementUsage, logViolation } from '@/lib/usage-limits'
import { checkCircuitBreaker, trackAndCheckSpend } from '@/lib/circuit-breaker'
import { checkRateLimit, incrementRateLimit } from '@/lib/rate-limiter'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('plan')
    .eq('user_id', user.id)
    .maybeSingle()

  const plan = profile?.plan || 'starter'

  // Circuit breaker
  const cb = await checkCircuitBreaker()
  if (cb.open) return NextResponse.json({ error: 'Service temporarily unavailable. Please try again in a few minutes.' }, { status: 503 })

  // Per-user hourly rate limit for Whisper calls
  const rl = await checkRateLimit(user.id, 'whisper_calls')
  if (!rl.allowed) return NextResponse.json({ error: `Too many transcription requests this hour (limit: ${rl.limit}). Try again in ${Math.ceil(rl.retryAfterSeconds / 60)} minutes.` }, { status: 429 })

  // Starter plan cannot use voice notes
  if (plan === 'starter') {
    return NextResponse.json({
      error: 'Voice notes are not available on the Starter plan. Upgrade to Standard.',
      feature: 'voice_transcriptions',
      used: 0,
      limit: 0,
      plan,
    }, { status: 403 })
  }

  // Check voice_transcriptions limit
  const transcriptCheck = await checkLimit(user.id, plan, 'voice_transcriptions')
  if (!transcriptCheck.allowed) {
    await logViolation(user.id, 'voice_transcriptions', plan)
    return NextResponse.json({
      error: `You've used all ${transcriptCheck.limit} voice note transcriptions this month.`,
      feature: 'voice_transcriptions',
      used: transcriptCheck.used,
      limit: transcriptCheck.limit,
      plan,
    }, { status: 429 })
  }

  // Check voice_minutes limit
  const minutesCheck = await checkLimit(user.id, plan, 'voice_minutes')
  if (!minutesCheck.allowed) {
    return NextResponse.json({
      error: `You've used all ${minutesCheck.limit} voice minutes this month.`,
      feature: 'voice_minutes',
      used: minutesCheck.used,
      limit: minutesCheck.limit,
      plan,
    }, { status: 429 })
  }

  const formData = await request.formData()
  const file = formData.get('audio') as File | null

  if (!file) return NextResponse.json({ error: 'No audio file provided' }, { status: 400 })

  const MAX_SIZE = 25 * 1024 * 1024
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large (max 25MB)' }, { status: 400 })
  }

  // Estimate duration from file size (rough: ~1MB per minute for typical voice recordings)
  const estimatedMinutes = Math.ceil(file.size / (1024 * 1024))
  if (minutesCheck.remaining < estimatedMinutes) {
    return NextResponse.json({
      error: `Not enough voice minutes remaining. You have ${minutesCheck.remaining} minute${minutesCheck.remaining !== 1 ? 's' : ''} left this month.`,
      feature: 'voice_minutes',
      used: minutesCheck.used,
      limit: minutesCheck.limit,
      plan,
    }, { status: 429 })
  }

  const { data: voiceNote, error: insertError } = await supabaseAdmin
    .from('voice_notes')
    .insert({ user_id: user.id, file_name: file.name, status: 'pending' })
    .select()
    .single()

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  try {
    const transcription = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      language: 'en',
    })

    await supabaseAdmin
      .from('voice_notes')
      .update({ transcript: transcription.text, status: 'transcribed' })
      .eq('id', voiceNote.id)

    // Increment usage after successful transcription
    await Promise.all([
      incrementUsage(user.id, 'voice_transcriptions'),
      incrementUsage(user.id, 'voice_minutes', estimatedMinutes),
      incrementRateLimit(user.id, 'whisper_calls'),
      trackAndCheckSpend('openai_whisper', user.id, { minutes: estimatedMinutes }),
    ])

    return NextResponse.json({ voiceNoteId: voiceNote.id, transcript: transcription.text })
  } catch (err) {
    await supabaseAdmin.from('voice_notes').update({ status: 'failed' }).eq('id', voiceNote.id)
    console.error('Whisper transcription error:', err)
    return NextResponse.json({ error: 'Transcription failed' }, { status: 500 })
  }
}

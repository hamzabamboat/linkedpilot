import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getUserFromRequest } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { checkLimit, incrementUsage, logViolation } from '@/lib/usage-limits'
import { craftDallePrompt, analyseImageForPost } from '@/lib/anthropic'

export const maxDuration = 60

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })
const BUCKET = 'post-images'

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('plan')
    .eq('user_id', user.id)
    .maybeSingle()

  const plan = profile?.plan || 'starter'
  const limitCheck = await checkLimit(user.id, plan, 'ai_image_generations')
  return NextResponse.json({ remaining: limitCheck.remaining, limit: limitCheck.limit, used: limitCheck.used })
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('plan, industry')
      .eq('user_id', user.id)
      .maybeSingle()

    const plan = profile?.plan || 'starter'
    const industry = profile?.industry || 'business'

    const limitCheck = await checkLimit(user.id, plan, 'ai_image_generations')
    if (!limitCheck.allowed) {
      await logViolation(user.id, 'ai_image_generations', plan)
      return NextResponse.json(
        { error: `You've used all ${limitCheck.limit} AI image generations this month. Upgrade to get more.`, limitReached: true },
        { status: 403 }
      )
    }

    const body = await request.json()
    const postContent: string = body.postContent || ''

    const dallePrompt = await craftDallePrompt(postContent, industry)

    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: dallePrompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
      response_format: 'url',
    })

    const imageUrl = response.data?.[0]?.url
    if (!imageUrl) return NextResponse.json({ error: 'Image generation failed' }, { status: 500 })

    // Download the generated image (OpenAI URLs expire after ~1 hour)
    const imgRes = await fetch(imageUrl)
    if (!imgRes.ok) return NextResponse.json({ error: 'Failed to download generated image' }, { status: 500 })
    const buffer = Buffer.from(await imgRes.arrayBuffer())

    const storagePath = `${user.id}/ai-${Date.now()}-${crypto.randomUUID()}.png`
    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(storagePath, buffer, { contentType: 'image/png', upsert: false })

    if (uploadError) return NextResponse.json({ error: 'Storage upload failed' }, { status: 500 })

    const { data: { publicUrl } } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(storagePath)

    const { data: imageRow, error: dbError } = await supabaseAdmin
      .from('post_images')
      .insert({
        user_id: user.id,
        storage_path: storagePath,
        public_url: publicUrl,
        file_name: `ai-generated-${Date.now()}.png`,
        file_size: buffer.length,
        mime_type: 'image/png',
        ai_description: `AI-generated image: ${dallePrompt.slice(0, 200)}`,
      })
      .select()
      .single()

    if (dbError || !imageRow) return NextResponse.json({ error: 'DB insert failed' }, { status: 500 })

    await incrementUsage(user.id, 'ai_image_generations')

    // Non-blocking analysis
    analyseImageForPost(buffer.toString('base64'), 'image/png')
      .then(analysis =>
        supabaseAdmin.from('post_images').update({
          ai_description: analysis.description,
          ai_mood: analysis.mood,
          ai_topics: analysis.topics,
          ai_text_detected: analysis.text_detected,
          ai_post_hooks: analysis.post_hooks,
          ai_content_pillars: analysis.content_pillars,
          analysed_at: new Date().toISOString(),
        }).eq('id', imageRow.id)
      )
      .catch(err => console.error('[images/ai-generate] analysis failed', imageRow.id, err))

    return NextResponse.json({
      image: imageRow,
      remaining: limitCheck.remaining - 1,
      prompt: dallePrompt,
    })
  } catch (err) {
    console.error('[images/ai-generate]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

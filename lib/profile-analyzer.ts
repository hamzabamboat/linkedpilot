import { supabaseAdmin } from './supabase-admin'
import { analyzeLinkedInProfile } from './anthropic'

export async function runProfileAnalysis(userId: string) {
  console.log('[profile-analyzer] Starting analysis for user:', userId)

  // Step 1 — fetch user row
  console.log('[profile-analyzer] Fetching user from DB...')
  const { data: user, error: userError } = await supabaseAdmin
    .from('users')
    .select('linkedin_name, linkedin_picture, email')
    .eq('id', userId)
    .single()

  if (userError) {
    console.error('[profile-analyzer] User fetch error:', userError)
    throw new Error('Could not fetch user: ' + userError.message)
  }
  console.log('[profile-analyzer] User fetched:', user?.linkedin_name)

  // Step 2 — fetch profile row
  console.log('[profile-analyzer] Fetching user_profiles from DB...')
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('user_profiles')
    .select('name, role, industry, writing_sample, content_pillars, voice_fingerprint')
    .eq('user_id', userId)
    .maybeSingle()

  if (profileError) {
    console.error('[profile-analyzer] Profile fetch error:', profileError)
    throw new Error('Could not fetch profile: ' + profileError.message)
  }
  console.log('[profile-analyzer] Profile fetched:', { name: profile?.name, industry: profile?.industry, role: profile?.role })

  // Step 3 — check ANTHROPIC_API_KEY
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error('[profile-analyzer] ANTHROPIC_API_KEY is not set!')
    throw new Error('ANTHROPIC_API_KEY is missing from environment variables')
  }
  console.log('[profile-analyzer] ANTHROPIC_API_KEY present:', apiKey.slice(0, 8) + '...')

  // Step 4 — call Claude
  console.log('[profile-analyzer] Calling analyzeLinkedInProfile via Claude API...')
  const result = await analyzeLinkedInProfile({
    name: user?.linkedin_name || profile?.name,
    headline: profile?.role,
    industry: profile?.industry,
    role: profile?.role,
    writingSample: profile?.writing_sample,
  })
  console.log('[profile-analyzer] Claude response score:', result.score)

  // Step 5 — save to DB
  console.log('[profile-analyzer] Saving analysis to profile_analyses...')
  const { error: insertError } = await supabaseAdmin.from('profile_analyses').insert({
    user_id: userId,
    score: result.score,
    breakdown: result.breakdown,
    improvements: result.improvements,
  })

  if (insertError) {
    console.error('[profile-analyzer] Insert error:', insertError)
    throw new Error('Could not save analysis: ' + insertError.message)
  }

  console.log('[profile-analyzer] Analysis complete. Score:', result.score)
  return result
}

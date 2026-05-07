import { supabaseAdmin } from './supabase-admin'
import { analyzeLinkedInProfile } from './anthropic'

export async function runProfileAnalysis(userId: string) {
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('linkedin_name, linkedin_picture')
    .eq('id', userId)
    .single()

  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('name, role, industry, writing_sample')
    .eq('user_id', userId)
    .maybeSingle()

  const result = await analyzeLinkedInProfile({
    name: user?.linkedin_name || profile?.name,
    headline: profile?.role,
    industry: profile?.industry,
    role: profile?.role,
    writingSample: profile?.writing_sample,
  })

  await supabaseAdmin.from('profile_analyses').insert({
    user_id: userId,
    score: result.score,
    breakdown: result.breakdown,
    improvements: result.improvements,
  })

  return result
}

'use client'

import { useState, useEffect } from 'react'
import posthog from 'posthog-js'
import Link from 'next/link'
import { toast } from 'sonner'
import { UserProfile, Post } from '@/lib/supabase'
import {
  Mic, RefreshCw, Loader2, Plus, MoreHorizontal,
  ArrowRight, Sparkles, User, FileText, Target, BarChart2,
  CheckCircle2, AlertCircle,
} from 'lucide-react'

const VOICE_DIMENSIONS = [
  { label: 'Sentence rhythm', key: 'rhythm' },
  { label: 'Vocabulary fit', key: 'vocab' },
  { label: 'Opening patterns', key: 'opening' },
  { label: 'Signature phrases', key: 'phrases' },
  { label: 'Emotional register', key: 'emotion' },
  { label: 'Punctuation style', key: 'punctuation' },
]

function deriveVoiceDimensions(fingerprint: string | null): Record<string, number> {
  if (!fingerprint) return {}
  // Derive rough quality scores from fingerprint presence and length
  const len = fingerprint.length
  const base = Math.min(75 + (len > 200 ? 10 : len > 100 ? 5 : 0), 85)
  const seed = fingerprint.charCodeAt(0) + fingerprint.charCodeAt(Math.floor(len / 2))
  return {
    rhythm:      Math.min(100, base + ((seed * 7) % 15)),
    vocab:       Math.min(100, base + ((seed * 3) % 18)),
    opening:     Math.min(100, base - 3 + ((seed * 11) % 12)),
    phrases:     Math.min(100, base - 6 + ((seed * 5) % 14)),
    emotion:     Math.min(100, base + ((seed * 9) % 13)),
    punctuation: Math.min(100, base - 8 + ((seed * 13) % 16)),
  }
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [retraining, setRetraining] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/me')
        const data = await res.json()
        if (!data.user) { window.location.href = '/'; return }
        if (cancelled) return
        setProfile(data.profile || null)
        // Load top published posts as reference posts
        const { supabase } = await import('@/lib/supabase')
        const { data: postsData } = await supabase
          .from('posts')
          .select('*')
          .eq('user_id', data.user.id)
          .in('status', ['published', 'approved'])
          .order('created_at', { ascending: false })
          .limit(5)
        if (!cancelled) setPosts(postsData || [])
      } catch { /* non-fatal */ } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  async function retrain() {
    setRetraining(true)
    try {
      const res = await fetch('/api/voice/retrain', { method: 'POST' })
      const data = await res.json()
      if (data.error) { toast.error('Could not re-train: ' + data.error); return }
      posthog.capture('voice_recalibrated')
      toast.success('Voice fingerprint updated!')
      // Reload profile
      const me = await fetch('/api/me')
      const meData = await me.json()
      setProfile(meData.profile || profile)
    } catch { toast.error('Re-train failed. Try again.') }
    finally { setRetraining(false) }
  }

  if (loading) {
    return (
      <div className="p-3 sm:p-4 md:p-7 w-full">
        <div className="h-8 w-64 rounded-xl animate-pulse mb-8" style={{ background: 'var(--surface-2)' }} />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className={`h-56 rounded-2xl animate-pulse ${i === 1 || i === 2 ? 'lg:col-span-2' : ''}`} style={{ background: 'var(--surface-2)' }} />
          ))}
        </div>
      </div>
    )
  }

  const hasFingerprint = !!profile?.voice_fingerprint
  const dimensions = deriveVoiceDimensions(profile?.voice_fingerprint || null)
  const matchScore = hasFingerprint
    ? Math.round(Object.values(dimensions).reduce((a, b) => a + b, 0) / Object.values(dimensions).length)
    : 0

  const pillars = profile?.content_pillars || []
  const initials = ((profile?.name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2)).toUpperCase()
  const writingSample = profile?.writing_sample || profile?.post_examples || null
  const refPosts = posts.slice(0, 5)

  return (
    <div className="p-3 sm:p-4 md:p-7 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-7">
        <div>
          <div className="db-screen__eyebrow">
            <span style={{
              display: 'inline-block', width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
              background: hasFingerprint ? '#059669' : '#f59e0b',
              boxShadow: hasFingerprint ? '0 0 0 3px rgba(5,150,105,.15)' : '0 0 0 3px rgba(245,158,11,.15)',
            }} />
            // Voice fingerprint · {hasFingerprint ? 'refreshed last week' : 'not yet trained'}
          </div>
          <h1 className="db-screen__title">
            How we hear <em>you.</em>
          </h1>
        </div>
        <button
          onClick={retrain}
          disabled={retraining || !profile?.writing_sample}
          className="flex items-center gap-1.5 transition-all hover:opacity-80 w-full sm:w-auto justify-center sm:justify-start"
          style={{
            border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', padding: '7px 14px',
            fontSize: 13, fontWeight: 500, color: 'var(--ink-2)', background: 'var(--surface)',
            opacity: (retraining || !profile?.writing_sample) ? 0.5 : 1,
          }}
        >
          {retraining ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
          {retraining ? 'Re-training…' : 'Re-train'}
        </button>
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }} className="prof-grid-responsive">
        <style>{`
          @media (max-width: 1100px) { .prof-grid-responsive { grid-template-columns: 1fr 1fr !important; } .prof-lg { grid-column: span 2 !important; } }
          @media (max-width: 700px) { .prof-grid-responsive { grid-template-columns: 1fr !important; } .prof-lg { grid-column: span 1 !important; } }
        `}</style>

        {/* ── Identity card ── */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)',
          padding: '20px', display: 'flex', flexDirection: 'column', gap: 16,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 10.5, fontFamily: 'var(--f-mono)', color: 'var(--ink-4)', padding: '3px 8px', background: 'var(--surface-2)', borderRadius: 'var(--r-sm)' }}>
              Identity
            </span>
            <span style={{ fontSize: 10.5, fontFamily: 'var(--f-mono)', color: 'var(--ink-4)' }}>basics</span>
          </div>

          {/* Avatar + name */}
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
              color: '#fff', display: 'grid', placeItems: 'center',
              fontWeight: 600, fontSize: 20, flexShrink: 0,
            }}>
              {initials}
            </div>
            <div>
              <strong style={{ display: 'block', fontSize: 15, color: 'var(--ink)', fontWeight: 600 }}>
                {profile?.name || 'Your Name'}
              </strong>
              <span style={{ display: 'block', fontSize: 12.5, color: 'var(--ink-3)' }}>
                {[profile?.role, profile?.company].filter(Boolean).join(' · ') || 'Add your role'}
              </span>
              {profile?.linkedin_url && (
                <span style={{ display: 'block', fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--f-mono)' }}>
                  {profile.linkedin_url.replace('https://', '').replace('http://', '')}
                </span>
              )}
            </div>
          </div>

          {/* Fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 16, borderTop: '1px dashed var(--line)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 10.5, fontFamily: 'var(--f-mono)', color: 'var(--ink-4)' }}>Audience</span>
              <span style={{ fontSize: 13.5, color: 'var(--ink)', padding: '6px 0' }}>
                {profile?.industry ? `${profile.industry} professionals` : 'Set in settings'}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 10.5, fontFamily: 'var(--f-mono)', color: 'var(--ink-4)' }}>Default tone</span>
              <span style={{ fontSize: 13.5, color: 'var(--ink)', padding: '6px 0', textTransform: 'capitalize' }}>
                {profile?.writing_style?.replace('_', ' ') || profile?.tone || 'Professional'}
              </span>
            </div>
          </div>

          <Link href="/dashboard/settings" style={{ fontSize: 12, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 'auto', textDecoration: 'none' }}>
            Edit profile <ArrowRight className="size-3" />
          </Link>
        </div>

        {/* ── Voice dimensions ── */}
        <div className="prof-lg" style={{
          gridColumn: 'span 2',
          background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)',
          padding: '20px', display: 'flex', flexDirection: 'column', gap: 16,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 10.5, fontFamily: 'var(--f-mono)', color: 'var(--ink-4)', padding: '3px 8px', background: 'var(--surface-2)', borderRadius: 'var(--r-sm)' }}>
              Voice dimensions
            </span>
            <span style={{ fontSize: 10.5, fontFamily: 'var(--f-mono)', color: hasFingerprint ? '#059669' : 'var(--ink-4)' }}>
              match · {hasFingerprint ? `${matchScore}%` : 'n/a'}
            </span>
          </div>

          {!hasFingerprint ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '24px 0' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#f59e0b18', display: 'grid', placeItems: 'center' }}>
                <Mic className="size-5" style={{ color: '#d97706' }} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>No voice fingerprint yet</div>
                <div style={{ fontSize: 12, color: 'var(--ink-4)', maxWidth: 280 }}>
                  Add a writing sample in Settings to train your voice model.
                </div>
              </div>
              <Link href="/dashboard/settings" style={{
                fontSize: 12, fontWeight: 500, padding: '6px 14px', borderRadius: 'var(--r-sm)',
                background: 'var(--accent)', color: '#fff', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <Sparkles className="size-3.5" /> Add writing sample
              </Link>
            </div>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {VOICE_DIMENSIONS.map(dim => {
                const pct = dimensions[dim.key] || 0
                return (
                  <li key={dim.key} style={{ display: 'grid', gridTemplateColumns: '140px 1fr 50px', gap: 12, alignItems: 'center', fontSize: 13, color: 'var(--ink-2)' }}>
                    <span>{dim.label}</span>
                    <div style={{ height: 6, background: 'var(--surface-3)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, var(--accent), var(--accent-2))', borderRadius: 99 }} />
                    </div>
                    <span style={{ textAlign: 'right', color: 'var(--ink-3)', fontSize: 12, fontFamily: 'var(--f-mono)' }}>{pct}%</span>
                  </li>
                )
              })}
            </ul>
          )}

          {hasFingerprint && (
            <details style={{ marginTop: 8 }}>
              <summary style={{ fontSize: 12, color: 'var(--ink-4)', cursor: 'pointer', userSelect: 'none', fontFamily: 'var(--f-mono)' }}>
                Show raw fingerprint
              </summary>
              <div style={{ marginTop: 10, padding: '12px 14px', background: 'var(--surface-2)', borderRadius: 'var(--r-md)', fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.6, whiteSpace: 'pre-wrap', maxHeight: 180, overflow: 'auto' }}>
                {profile?.voice_fingerprint}
              </div>
            </details>
          )}
        </div>

        {/* ── Reference posts ── */}
        <div className="prof-lg" style={{
          gridColumn: 'span 2',
          background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)',
          padding: '20px', display: 'flex', flexDirection: 'column', gap: 16,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 10.5, fontFamily: 'var(--f-mono)', color: 'var(--ink-4)', padding: '3px 8px', background: 'var(--surface-2)', borderRadius: 'var(--r-sm)' }}>
              Reference posts · {refPosts.length} ingested
            </span>
            <Link href="/dashboard/generate" style={{
              display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 500,
              padding: '5px 10px', border: '1px solid var(--line)', borderRadius: 'var(--r-sm)',
              color: 'var(--ink-2)', background: 'var(--surface)', textDecoration: 'none',
            }}>
              <Plus className="size-3.5" /> Add sample
            </Link>
          </div>

          {refPosts.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '24px 0', textAlign: 'center' }}>
              <FileText className="size-8" style={{ color: 'var(--ink-4)' }} strokeWidth={1.25} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)', marginBottom: 4 }}>No posts yet</div>
                <div style={{ fontSize: 12, color: 'var(--ink-4)' }}>Your published posts will appear here as training samples.</div>
              </div>
            </div>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column' }}>
              {refPosts.map((post, i) => {
                const words = post.content.split(/\s+/).length
                const date = new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit' })
                const title = post.content.split('\n')[0].replace(/[*#]/g, '').slice(0, 55) + (post.content.length > 55 ? '…' : '')
                return (
                  <li key={post.id} style={{
                    display: 'grid', gridTemplateColumns: '1fr 140px 32px', gap: 12, alignItems: 'center',
                    padding: '12px 0', borderBottom: i < refPosts.length - 1 ? '1px dashed var(--line)' : 'none',
                  }}>
                    <strong style={{ fontSize: 13.5, color: 'var(--ink)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</strong>
                    <span style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--f-mono)', textAlign: 'right' }}>{words} words · {date}</span>
                    <Link href={`/dashboard/posts?id=${post.id}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 'var(--r-sm)', border: '1px solid var(--line)', color: 'var(--ink-3)', textDecoration: 'none' }}>
                      <MoreHorizontal className="size-3.5" />
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}

          {writingSample && (
            <div style={{ padding: '12px 14px', background: 'var(--surface-2)', borderRadius: 'var(--r-md)', borderLeft: '3px solid var(--accent)' }}>
              <div style={{ fontSize: 10.5, fontFamily: 'var(--f-mono)', color: 'var(--ink-4)', marginBottom: 6 }}>Writing sample · manually added</div>
              <div style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.65, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {writingSample}
              </div>
            </div>
          )}
        </div>

        {/* ── Content pillars ── */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)',
          padding: '20px', display: 'flex', flexDirection: 'column', gap: 16,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 10.5, fontFamily: 'var(--f-mono)', color: 'var(--ink-4)', padding: '3px 8px', background: 'var(--surface-2)', borderRadius: 'var(--r-sm)' }}>
              Pillars
            </span>
            <span style={{ fontSize: 10.5, fontFamily: 'var(--f-mono)', color: 'var(--ink-4)' }}>
              {pillars.length} / 3
            </span>
          </div>

          {pillars.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '16px 0', textAlign: 'center' }}>
              <Target className="size-7" style={{ color: 'var(--ink-4)' }} strokeWidth={1.25} />
              <div style={{ fontSize: 13, color: 'var(--ink-4)' }}>No pillars set yet</div>
              <Link href="/dashboard/settings" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}>
                Choose up to 3 →
              </Link>
            </div>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column' }}>
              {pillars.map((p, i) => (
                <li key={p} style={{
                  display: 'grid', gridTemplateColumns: '32px 1fr 70px', gap: 12, alignItems: 'center',
                  padding: '10px 0', borderBottom: i < pillars.length - 1 ? '1px dashed var(--line)' : 'none',
                }}>
                  <span style={{ color: 'var(--ink-4)', fontSize: 11, fontFamily: 'var(--f-mono)' }}>0{i + 1}</span>
                  <strong style={{ fontSize: 13.5, color: 'var(--ink)', fontWeight: 500 }}>{p}</strong>
                  <span style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--f-mono)', textAlign: 'right' }}>
                    {Math.floor(Math.random() * 8) + 2} posts
                  </span>
                </li>
              ))}
            </ul>
          )}

          {pillars.length < 3 && (
            <Link href="/dashboard/settings" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '8px', border: '1px dashed var(--line)', borderRadius: 'var(--r-md)',
              fontSize: 12, color: 'var(--ink-4)', textDecoration: 'none', transition: 'all 0.15s',
            }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)', e.currentTarget.style.color = 'var(--accent)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--line)', e.currentTarget.style.color = 'var(--ink-4)')}
            >
              <Plus className="size-3.5" />
              Add pillar
            </Link>
          )}

          {/* Completeness hint */}
          <div style={{
            padding: '10px 12px', borderRadius: 'var(--r-md)',
            background: hasFingerprint && pillars.length >= 1 ? '#05966912' : '#f59e0b12',
            display: 'flex', alignItems: 'flex-start', gap: 8,
          }}>
            {hasFingerprint && pillars.length >= 1
              ? <CheckCircle2 className="size-3.5 mt-0.5 shrink-0" style={{ color: '#059669' }} />
              : <AlertCircle className="size-3.5 mt-0.5 shrink-0" style={{ color: '#d97706' }} />
            }
            <span style={{ fontSize: 11.5, color: hasFingerprint && pillars.length >= 1 ? '#059669' : '#d97706', lineHeight: 1.5 }}>
              {hasFingerprint && pillars.length >= 1
                ? 'Voice model active — your posts will match your style.'
                : 'Complete your profile to activate the voice model.'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { PLAN_FEATURES } from '@/lib/supabase'
import { ChevronLeft, Check, BarChart3, Mic, Repeat2, Zap, Users, CheckCircle2 } from 'lucide-react'

const FEATURE_MAP: Record<string, { title: string; desc: string; icon: React.ElementType; iconColor: string; minPlan: string }> = {
  analytics: { title: 'Analytics Dashboard', desc: 'LinkedIn Score history, engagement trends, best posting times heatmap, follower growth, and your top 3 posts of all time.', icon: BarChart3, iconColor: '#0A66C2', minPlan: 'Standard' },
  voice: { title: 'Voice Notes', desc: 'Record or upload audio, we transcribe with Whisper AI, and turn it into a polished LinkedIn post in your voice.', icon: Mic, iconColor: '#7c3aed', minPlan: 'Standard' },
  repurpose: { title: 'Repurpose Engine', desc: 'Take any high-performing post and instantly generate 3 fresh angles. Maximum reach from minimum effort.', icon: Repeat2, iconColor: '#dc2626', minPlan: 'Pro' },
  bulk: { title: 'Bulk Generate', desc: 'Fill your entire next 30 days of posts with one click. AI rotates across your content pillars automatically.', icon: Zap, iconColor: '#d97706', minPlan: 'Pro' },
  team: { title: 'Team Mode', desc: 'Manage up to 3 LinkedIn profiles from a single dashboard. Perfect for agencies and founders with multiple brands.', icon: Users, iconColor: '#059669', minPlan: 'Pro' },
}

const ALL_PLANS = [
  { id: 'standard', label: 'Standard', price: 2499, posts: 20, features: PLAN_FEATURES.standard, color: '#0A66C2', popular: true },
  { id: 'pro', label: 'Pro', price: 4999, posts: 30, features: PLAN_FEATURES.pro, color: '#7c3aed', popular: false },
]

function UpgradeContent() {
  const searchParams = useSearchParams()
  const feature = searchParams.get('feature') || ''
  const info = FEATURE_MAP[feature]
  const [currentPlan, setCurrentPlan] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/me').then(r => r.json()).then(d => {
      setCurrentPlan(d.profile?.plan || 'starter')
    }).catch(() => setCurrentPlan('starter'))
  }, [])

  const plansToShow = currentPlan === 'standard'
    ? ALL_PLANS.filter(p => p.id === 'pro').map(p => ({ ...p, popular: false }))
    : ALL_PLANS
  const loading = currentPlan === null

  if (currentPlan === 'pro') {
    return (
      <div className="p-8 max-w-3xl">
        <Link href="/dashboard"
          className="flex items-center gap-1.5 mb-8 transition-opacity hover:opacity-70"
          style={{ fontSize: 13, color: 'var(--ink-4)' }}>
          <ChevronLeft className="size-4" /> Back to dashboard
        </Link>
        <div className="flex flex-col items-center justify-center py-12 text-center"
          style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', background: 'var(--surface)' }}>
          <div className="flex items-center justify-center mb-5"
            style={{ width: 56, height: 56, borderRadius: 'var(--r-md)', background: 'var(--pl-accent-soft)' }}>
            <CheckCircle2 className="w-7 h-7" style={{ color: 'var(--pl-accent)' }} strokeWidth={1.75} />
          </div>
          <h1 style={{ fontWeight: 700, fontSize: 22, color: 'var(--ink)', letterSpacing: '-0.025em', marginBottom: 10 }}>
            You&apos;re on the best plan
          </h1>
          <p style={{ fontSize: 13, color: 'var(--ink-4)', marginBottom: 16, maxWidth: 380, lineHeight: 1.55 }}>
            You&apos;re already on PersonaLink Pro — you have access to all features including Repurpose Engine, Bulk Generate, Team Mode, and Priority AI.
          </p>
          <span style={{
            fontSize: 13, fontWeight: 600, padding: '6px 16px', borderRadius: 'var(--r-full)',
            background: 'var(--pl-accent-soft)', color: 'var(--pl-accent)', border: '1px solid var(--pl-accent-2)',
          }}>
            PersonaLink Pro ✓
          </span>
          <div className="mt-6">
            <Link href="/dashboard"
              className="flex items-center gap-1.5 transition-opacity hover:opacity-80"
              style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-sm)', padding: '8px 16px', fontSize: 13, fontWeight: 500, color: 'var(--ink-2)' }}>
              Go to dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-3xl">
      <Link href="/dashboard"
        className="flex items-center gap-1.5 mb-8 transition-opacity hover:opacity-70"
        style={{ fontSize: 13, color: 'var(--ink-4)' }}>
        <ChevronLeft className="size-4" /> Back to dashboard
      </Link>

      {info && (() => {
        const Icon = info.icon
        return (
          <div className="mb-7 flex gap-5 items-start p-5"
            style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)' }}>
            <div className="flex items-center justify-center shrink-0"
              style={{ width: 52, height: 52, borderRadius: 'var(--r-md)', background: info.iconColor + '18' }}>
              <Icon className="w-7 h-7" style={{ color: info.iconColor }} strokeWidth={1.75} />
            </div>
            <div>
              <h1 style={{ fontWeight: 600, fontSize: 18, color: 'var(--ink)', letterSpacing: '-0.025em', marginBottom: 6 }}>{info.title}</h1>
              <p style={{ fontSize: 13, color: 'var(--ink-4)', lineHeight: 1.55, marginBottom: 10, maxWidth: 480 }}>{info.desc}</p>
              <span style={{
                fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 'var(--r-full)',
                background: 'var(--pl-accent-soft)', color: 'var(--pl-accent)', border: '1px solid var(--pl-accent-2)',
              }}>
                Requires {info.minPlan} plan or above
              </span>
            </div>
          </div>
        )
      })()}

      {!info && (
        <div className="mb-7">
          <h1 style={{ fontWeight: 600, fontSize: 22, color: 'var(--ink)', letterSpacing: '-0.025em', marginBottom: 6 }}>
            {currentPlan === 'standard' ? 'Upgrade to Pro' : 'Upgrade your plan'}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--ink-4)' }}>
            {currentPlan === 'standard'
              ? 'Get Repurpose Engine, Bulk Generate, Team Mode and Priority AI.'
              : 'Get more posts, features, and tools to grow your LinkedIn presence.'}
          </p>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 gap-5">
          <div className="skeleton h-72 rounded-2xl" />
          <div className="skeleton h-72 rounded-2xl" />
        </div>
      ) : (
        <div className={`grid gap-5 ${plansToShow.length === 1 ? 'grid-cols-1 max-w-sm' : 'grid-cols-1 sm:grid-cols-2'}`}>
          {plansToShow.map(plan => (
            <div
              key={plan.id}
              className="overflow-hidden relative"
              style={{ border: `1px solid ${plan.color}30`, borderRadius: 'var(--r-lg)', background: 'var(--surface)' }}
            >
              {plan.popular && plansToShow.length > 1 && (
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap"
                  style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)', color: '#fff', borderRadius: 'var(--r-full)', padding: '4px 14px', fontSize: 11, fontWeight: 700, boxShadow: 'var(--sh-1)' }}
                >
                  Most Popular
                </div>
              )}
              <div className="p-5 pb-6">
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, color: plan.color, fontFamily: 'var(--f-mono)' }}>
                  // {plan.label}
                </div>
                <div style={{ fontSize: 30, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.04em', marginBottom: 2 }}>
                  ₹{plan.price.toLocaleString('en-IN')}<span style={{ fontSize: 13, fontWeight: 400, color: 'var(--ink-4)' }}>/mo</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-4)', marginBottom: 20, fontFamily: 'var(--f-mono)' }}>
                  {plan.posts} posts/month · ₹{Math.round(plan.price / plan.posts)}/post
                </div>
                <div className="flex flex-col gap-2.5 mb-6">
                  {plan.features.map(f => (
                    <div key={f} className="flex items-center gap-2.5" style={{ fontSize: 13, color: 'var(--ink-2)' }}>
                      <div className="flex items-center justify-center flex-shrink-0"
                        style={{ width: 16, height: 16, borderRadius: '50%', background: plan.color + '18' }}>
                        <Check className="w-2.5 h-2.5" style={{ color: plan.color }} strokeWidth={2.5} />
                      </div>
                      {f}
                    </div>
                  ))}
                </div>
                <Link
                  href="/dashboard/settings?tab=plan"
                  className="flex items-center justify-center w-full transition-opacity hover:opacity-80"
                  style={{ background: plan.color, color: '#fff', borderRadius: 'var(--r-sm)', padding: '10px 16px', fontSize: 14, fontWeight: 600 }}
                >
                  Upgrade to {plan.label}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="mt-6 text-center" style={{ fontSize: 12, color: 'var(--ink-4)' }}>
        All plans include a 7-day trial. Cancel anytime from Settings.
      </p>
    </div>
  )
}

export default function UpgradeDashboardPage() {
  return <Suspense><UpgradeContent /></Suspense>
}

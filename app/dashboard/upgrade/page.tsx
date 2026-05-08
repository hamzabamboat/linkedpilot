'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PLAN_FEATURES } from '@/lib/supabase'
import { ChevronLeft, Check, BarChart3, Mic, Repeat2, Zap, Users, CheckCircle2 } from 'lucide-react'

const FEATURE_MAP: Record<string, { title: string; desc: string; icon: React.ElementType; iconColor: string; iconBg: string; minPlan: string }> = {
  analytics: { title: 'Analytics Dashboard', desc: 'LinkedIn Score history, engagement trends, best posting times heatmap, follower growth, and your top 3 posts of all time.', icon: BarChart3, iconColor: '#0A66C2', iconBg: '#e8f0fb', minPlan: 'Standard' },
  voice: { title: 'Voice Notes', desc: 'Record or upload audio, we transcribe with Whisper AI, and turn it into a polished LinkedIn post in your voice.', icon: Mic, iconColor: '#7c3aed', iconBg: '#f5f3ff', minPlan: 'Standard' },
  repurpose: { title: 'Repurpose Engine', desc: 'Take any high-performing post and instantly generate 3 fresh angles. Maximum reach from minimum effort.', icon: Repeat2, iconColor: '#dc2626', iconBg: '#fef2f2', minPlan: 'Pro' },
  bulk: { title: 'Bulk Generate', desc: 'Fill your entire next 30 days of posts with one click. AI rotates across your content pillars automatically.', icon: Zap, iconColor: '#d97706', iconBg: '#fffbeb', minPlan: 'Pro' },
  team: { title: 'Team Mode', desc: 'Manage up to 3 LinkedIn profiles from a single dashboard. Perfect for agencies and founders with multiple brands.', icon: Users, iconColor: '#059669', iconBg: '#ecfdf5', minPlan: 'Pro' },
}

// Plans shown based on current plan
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

  // Determine which plans to show based on current plan
  const plansToShow = currentPlan === 'standard'
    ? ALL_PLANS.filter(p => p.id === 'pro').map(p => ({ ...p, popular: false }))
    : ALL_PLANS // starter sees both

  const loading = currentPlan === null

  // Pro users see a "you're already on the best plan" message
  if (currentPlan === 'pro') {
    return (
      <div className="p-8 max-w-3xl">
        <Button variant="ghost" size="sm" render={<Link href="/dashboard" />} className="mb-8 -ml-2 text-slate-500 gap-1.5">
          <ChevronLeft className="size-4" />
          Back to dashboard
        </Button>
        <Card className="border-purple-100 shadow-sm bg-gradient-to-br from-purple-50 to-white">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-purple-100 flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-8 h-8 text-purple-600" strokeWidth={1.75} />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 mb-2 tracking-tight">You&apos;re on the best plan</h1>
            <p className="text-slate-500 text-base mb-5 max-w-md mx-auto">
              You&apos;re already on PersonaLink Pro — you have access to all features including Repurpose Engine, Bulk Generate, Team Mode, and Priority AI.
            </p>
            <Badge className="bg-purple-100 text-purple-700 text-sm font-bold px-4 py-1.5 border border-purple-200">
              PersonaLink Pro ✓
            </Badge>
            <div className="mt-6">
              <Button render={<Link href="/dashboard" />} variant="outline" className="border-purple-200 text-purple-700 hover:bg-purple-50">
                Go to dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-3xl">
      <Button variant="ghost" size="sm" render={<Link href="/dashboard" />} className="mb-8 -ml-2 text-slate-500 gap-1.5">
        <ChevronLeft className="size-4" />
        Back to dashboard
      </Button>

      {info && (() => {
        const Icon = info.icon
        return (
          <Card className="mb-7 border-slate-100 shadow-sm">
            <CardContent className="pt-6 pb-6 flex gap-5 items-start">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" style={{ background: info.iconBg }}>
                <Icon className="w-7 h-7" style={{ color: info.iconColor }} strokeWidth={1.75} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 mb-2 tracking-tight">{info.title}</h1>
                <p className="text-slate-500 text-sm leading-relaxed mb-3 max-w-lg">{info.desc}</p>
                <Badge variant="secondary" className="text-brand bg-brand-light text-xs font-semibold">
                  Requires {info.minPlan} plan or above
                </Badge>
              </div>
            </CardContent>
          </Card>
        )
      })()}

      {!info && (
        <div className="mb-7">
          <h1 className="text-2xl font-extrabold text-slate-900 mb-2 tracking-tight">
            {currentPlan === 'standard' ? 'Upgrade to Pro' : 'Upgrade your plan'}
          </h1>
          <p className="text-slate-400 font-medium text-sm">
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
        <div className={`grid gap-5 ${plansToShow.length === 1 ? 'grid-cols-1 max-w-sm' : 'grid-cols-2'}`}>
          {plansToShow.map(plan => (
            <Card
              key={plan.id}
              className="overflow-hidden shadow-sm card-hover relative"
              style={{ border: `1.5px solid ${plan.color}25` }}
            >
              {plan.popular && plansToShow.length > 1 && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-400 to-orange-400 text-white rounded-full px-4 py-1 text-xs font-bold whitespace-nowrap shadow-sm">
                  Most Popular
                </div>
              )}
              <CardContent className="pt-6 pb-6">
                <div className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: plan.color }}>{plan.label}</div>
                <div className="text-3xl font-extrabold text-slate-900 mb-1 tracking-tight">
                  ₹{plan.price.toLocaleString('en-IN')}<span className="text-sm font-normal text-slate-400">/mo</span>
                </div>
                <div className="text-xs text-slate-400 mb-5">{plan.posts} posts/month · ₹{Math.round(plan.price / plan.posts)}/post</div>
                <div className="flex flex-col gap-2.5 mb-6">
                  {plan.features.map(f => (
                    <div key={f} className="flex items-center gap-2.5 text-sm text-slate-600">
                      <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{ background: plan.color + '18' }}>
                        <Check className="w-2.5 h-2.5" style={{ color: plan.color }} strokeWidth={2.5} />
                      </div>
                      {f}
                    </div>
                  ))}
                </div>
                <Button
                  render={<Link href="/dashboard/settings?tab=plan" />}
                  className="w-full text-white gap-1.5"
                  style={{ background: plan.color }}
                >
                  Upgrade to {plan.label}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <p className="mt-6 text-center text-xs text-slate-400">All plans include a 7-day trial. Cancel anytime from Settings.</p>
    </div>
  )
}

export default function UpgradeDashboardPage() {
  return <Suspense><UpgradeContent /></Suspense>
}

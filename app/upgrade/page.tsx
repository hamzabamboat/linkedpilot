'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Script from 'next/script'
import { PLAN_FEATURES } from '@/lib/supabase'
import { getCurrency, getPaymentProcessor } from '@/lib/currency'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Loader2, Check, CheckCircle2 } from 'lucide-react'
import { ConcentricRings } from '@/components/concentric-rings'
import { WordMark } from '@/components/word-mark'

export default function UpgradePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<{ name?: string; email?: string } | null>(null)
  const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null)
  const [userCountry, setUserCountry] = useState('IN')
  const [codeInput, setCodeInput] = useState('')
  const [codeChecking, setCodeChecking] = useState(false)
  const [codeError, setCodeError] = useState('')
  const [appliedCode, setAppliedCode] = useState<{ code: string; plan: string } | null>(null)
  const [showCodeField, setShowCodeField] = useState(false)

  useEffect(() => { document.title = 'Upgrade — PersonaLink' }, [])

  useEffect(() => {
    const match = document.cookie.match(/user_country=([^;]+)/)
    if (match) setUserCountry(match[1])
  }, [])

  useEffect(() => {
    async function load() {
      try {
        const r = await fetch('/api/me')
        if (r.status === 401) {
          await fetch('/api/auth/logout', { method: 'POST' })
          router.replace('/')
          return
        }
        const data = await r.json()
        if (!data.user) {
          await fetch('/api/auth/logout', { method: 'POST' })
          router.replace('/')
          return
        }
        // Already has access — redirect to dashboard
        const status = data.subscription?.status
        if (status === 'active' || status === 'trialing' || status === 'trial') {
          router.replace('/dashboard')
          return
        }
        setUser(data.user)
        setLoading(false)
      } catch {
        setLoading(false)
      }
    }
    load()
  }, [router])

  const currencyInfo = getCurrency(userCountry)
  const processor = getPaymentProcessor(userCountry)

  const PLANS = [
    { id: 'starter', label: 'Starter', price: currencyInfo.starter, posts: 12, features: PLAN_FEATURES.starter, color: '#64748b' },
    { id: 'standard', label: 'Standard', price: currencyInfo.standard, posts: 20, features: PLAN_FEATURES.standard, color: '#2B4DFF', popular: true },
    { id: 'pro', label: 'Pro', price: currencyInfo.pro, posts: 30, features: PLAN_FEATURES.pro, color: '#7c3aed' },
  ]

  async function handleSubscribe(plan: { id: string; label: string; color: string }) {
    setUpgradingPlan(plan.id)

    if (processor === 'dodo') {
      try {
        const res = await fetch('/api/dodo/create-subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan: plan.id, currency: currencyInfo.code, force_new: true }),
        })
        const data = await res.json()
        if (data.error) { toast.error(data.error); setUpgradingPlan(null); return }
        if (!data.checkout_url) { toast.error('No checkout link returned. Please try again.'); setUpgradingPlan(null); return }
        window.location.href = data.checkout_url
      } catch {
        toast.error('Something went wrong. Please try again.')
        setUpgradingPlan(null)
      }
      return
    }

    // Razorpay for Indian users
    try {
      const res = await fetch('/api/razorpay/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: plan.id }),
      })
      const data = await res.json()
      if (data.error) { toast.error(data.error); setUpgradingPlan(null); return }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rzp = new (window as any).Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        subscription_id: data.subscription_id,
        name: 'PersonaLink',
        description: `${plan.label} Plan — 7-day free trial`,
        theme: { color: plan.color },
        prefill: { name: user?.name, email: user?.email },
        handler: async (response: { razorpay_payment_id: string; razorpay_subscription_id: string; razorpay_signature: string }) => {
          const verifyRes = await fetch('/api/razorpay/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_subscription_id: response.razorpay_subscription_id,
              razorpay_signature: response.razorpay_signature,
              plan: plan.id,
            }),
          })
          const verifyData = await verifyRes.json()
          if (verifyData.error) { toast.error('Payment verification failed. Please email support@personalink.in'); setUpgradingPlan(null); return }
          toast.success(`Welcome to ${plan.label}! Redirecting to your dashboard...`)
          setTimeout(() => { window.location.href = '/dashboard' }, 1500)
        },
        modal: { ondismiss: () => setUpgradingPlan(null) },
      })
      rzp.open()
    } catch {
      toast.error('Something went wrong. Please try again.')
      setUpgradingPlan(null)
    }
  }

  async function handleAccessCode() {
    if (!codeInput.trim()) return
    setCodeChecking(true); setCodeError(''); setAppliedCode(null)
    try {
      const res = await fetch(`/api/access-codes/validate?code=${encodeURIComponent(codeInput.trim())}`)
      const d = await res.json()
      if (d.valid) {
        setAppliedCode({ code: d.code, plan: d.plan })
        toast.success(`Access code applied! You get ${d.plan} plan.`)
      } else {
        setCodeError(d.error || 'Invalid or expired code.')
      }
    } catch {
      setCodeError('Failed to validate code. Please try again.')
    } finally {
      setCodeChecking(false)
    }
  }

  async function handleActivateCode() {
    if (!appliedCode) return
    setUpgradingPlan('code')
    try {
      const res = await fetch('/api/access-codes/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: appliedCode.code }),
      })
      const data = await res.json()
      if (!res.ok || data.error) { toast.error(data.error || 'Failed to activate code.'); setUpgradingPlan(null); return }
      toast.success(`${appliedCode.plan.charAt(0).toUpperCase() + appliedCode.plan.slice(1)} plan activated!`)
      setTimeout(() => { window.location.href = '/dashboard' }, 1500)
    } catch {
      toast.error('Something went wrong. Please try again.')
      setUpgradingPlan(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <Loader2 className="size-6 animate-spin" style={{ color: 'var(--ink-4)' }} />
      </div>
    )
  }

  return (
    <>
      {processor === 'razorpay' && <Script src="https://checkout.razorpay.com/v1/checkout.js" />}
      <div className="min-h-screen" style={{ background: 'var(--bg)', fontFamily: 'var(--f-sans)' }}>
        <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--line)' }} className="px-6">
          <div className="max-w-[860px] mx-auto h-16 flex items-center justify-between">
            <WordMark icon wordmark iconSize={30} />
            <button
              onClick={async () => {
                await fetch('/api/auth/logout', { method: 'POST' })
                window.location.href = '/'
              }}
              style={{ fontSize: 13, color: 'var(--ink-4)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--f-sans)' }}
              className="hover:opacity-70 transition-opacity"
            >
              Sign out
            </button>
          </div>
        </div>

        <div className="max-w-[860px] mx-auto px-4 py-12">
          <div className="text-center mb-10">
            <div className="pl-eyebrow" style={{ marginBottom: 16 }}>
              <span className="pl-eyebrow__dot" />
              Start your 7-day free trial
            </div>
            <h1 style={{ fontSize: 'clamp(24px,3vw,32px)', fontWeight: 500, letterSpacing: '-0.035em', color: 'var(--ink)', margin: '0 0 8px' }}>Choose your plan to get started</h1>
            <p style={{ fontSize: 14, color: 'var(--ink-3)' }}>Start your 7-day free trial — no charge until it ends. Cancel anytime.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {PLANS.map(plan => (
              <Card
                key={plan.id}
                className="overflow-hidden relative"
                style={{ border: `2px solid ${plan.color}30` }}
              >
                <ConcentricRings
                  size={120} opacity={0.06}
                  color={plan.id === 'pro' ? 'white' : 'blue'}
                  className="absolute -bottom-6 -right-6 pointer-events-none"
                />
                {plan.popular && (
                  <div
                    className="absolute top-0 inset-x-0 text-center text-[11px] font-bold py-1 text-white"
                    style={{ background: plan.color }}
                  >
                    MOST POPULAR
                  </div>
                )}
                <CardContent className={`${plan.popular ? 'pt-8' : 'pt-6'} pb-6 flex flex-col h-full`}>
                  <div className={plan.popular ? 'mt-2' : ''}>
                    <div className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: plan.color }}>
                      {plan.label}
                    </div>
                    <div style={{ fontSize: 32, fontWeight: 500, letterSpacing: '-0.04em', color: 'var(--ink)' }}>
                      {currencyInfo.symbol}{plan.price.toLocaleString()}
                      <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--ink-4)' }}>/mo</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink-4)', marginBottom: 20, marginTop: 2 }}>{plan.posts} posts/month</div>
                  </div>
                  <div className="flex flex-col gap-2.5 mb-6 flex-1">
                    {plan.features.map(f => (
                      <div key={f} className="flex items-start gap-2.5 text-[13px]" style={{ color: 'var(--ink-2)' }}>
                        <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: plan.color + '18' }}>
                          <Check className="w-2.5 h-2.5" style={{ color: plan.color }} strokeWidth={2.5} />
                        </div>
                        {f}
                      </div>
                    ))}
                  </div>
                  <Button
                    onClick={() => handleSubscribe(plan)}
                    disabled={!!upgradingPlan}
                    className="w-full text-white gap-2"
                    style={{ background: plan.color }}
                  >
                    {upgradingPlan === plan.id ? (
                      <><Loader2 className="size-4 animate-spin" /> Processing...</>
                    ) : (
                      `Start Free Trial · via ${processor === 'razorpay' ? 'Razorpay' : 'Dodo'}`
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Access code section */}
          <div className="mt-8 p-5 max-w-md mx-auto" style={{ background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--line)' }}>
            {!showCodeField ? (
              <button
                onClick={() => setShowCodeField(true)}
                style={{ fontSize: 13, color: 'var(--ink-4)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', width: '100%', fontFamily: 'var(--f-sans)' }}
              >
                Have an access code? Enter it here
              </button>
            ) : appliedCode ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5">
                  <CheckCircle2 className="size-4 shrink-0" />
                  <p className="text-[13px] font-semibold">
                    Code applied! You get <span className="capitalize">{appliedCode.plan}</span> plan free.
                  </p>
                </div>
                <Button
                  onClick={handleActivateCode}
                  disabled={upgradingPlan === 'code'}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2"
                >
                  {upgradingPlan === 'code'
                    ? <><Loader2 className="size-4 animate-spin" /> Activating...</>
                    : `Activate ${appliedCode.plan.charAt(0).toUpperCase() + appliedCode.plan.slice(1)} Plan →`
                  }
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-[13px] font-semibold text-slate-600 mb-1">Enter your access code</p>
                <div className="flex gap-2">
                  <Input
                    value={codeInput}
                    onChange={e => { setCodeInput(e.target.value.toUpperCase()); setCodeError('') }}
                    placeholder="PERSONALINK-FREE-1234"
                    className="font-mono text-sm flex-1"
                  />
                  <Button
                    variant="outline"
                    onClick={handleAccessCode}
                    disabled={codeChecking || !codeInput.trim()}
                    className="shrink-0"
                  >
                    {codeChecking ? <Loader2 className="size-4 animate-spin" /> : 'Apply'}
                  </Button>
                </div>
                {codeError && <p className="text-[12px] text-red-500">{codeError}</p>}
              </div>
            )}
          </div>

          <p style={{ textAlign: 'center', fontFamily: 'var(--f-mono)', fontSize: 11, color: 'var(--ink-4)', marginTop: 24, letterSpacing: '.04em' }}>
            Card required to start trial. No charge for 7 days. Cancel any time from Settings.
          </p>
        </div>
      </div>
    </>
  )
}

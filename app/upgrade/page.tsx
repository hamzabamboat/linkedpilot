'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Script from 'next/script'
import { PLAN_FEATURES } from '@/lib/supabase'
import { getCurrency, getPaymentProcessor } from '@/lib/currency'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, Check } from 'lucide-react'

export default function UpgradePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<{ name?: string; email?: string } | null>(null)
  const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null)
  const [userCountry, setUserCountry] = useState('IN')

  useEffect(() => {
    const match = document.cookie.match(/user_country=([^;]+)/)
    if (match) setUserCountry(match[1])
  }, [])

  useEffect(() => {
    fetch('/api/me').then(r => r.json()).then(data => {
      if (!data.user) { router.replace('/'); return }
      setUser(data.user)
      setLoading(false)
    })
  }, [router])

  const currencyInfo = getCurrency(userCountry)
  const processor = getPaymentProcessor(userCountry)

  const PLANS = [
    { id: 'starter', label: 'Starter', price: currencyInfo.starter, posts: 12, features: PLAN_FEATURES.starter, color: '#64748b' },
    { id: 'standard', label: 'Standard', price: currencyInfo.standard, posts: 20, features: PLAN_FEATURES.standard, color: '#0B458B', popular: true },
    { id: 'pro', label: 'Pro', price: currencyInfo.pro, posts: 30, features: PLAN_FEATURES.pro, color: '#7c3aed' },
  ]

  async function handleSubscribe(plan: { id: string; label: string; color: string }) {
    setUpgradingPlan(plan.id)

    if (processor === 'dodo') {
      try {
        const res = await fetch('/api/dodo/create-subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan: plan.id, currency: currencyInfo.code }),
        })
        const data = await res.json()
        if (data.error) { toast.error(data.error); setUpgradingPlan(null); return }
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
          if (verifyData.error) { toast.error('Payment verification failed. Please contact support.'); setUpgradingPlan(null); return }
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="size-6 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <>
      {processor === 'razorpay' && <Script src="https://checkout.razorpay.com/v1/checkout.js" />}
      <div className="min-h-screen bg-slate-50">
        <div className="bg-white border-b border-slate-200 px-6">
          <div className="max-w-[860px] mx-auto h-16 flex items-center">
            <div className="bg-white rounded-xl px-3 py-1.5 inline-flex items-center justify-center shadow-sm border border-slate-100">
              <img src="/logo-text.png" alt="PersonaLink" className="h-7 w-auto" />
            </div>
          </div>
        </div>

        <div className="max-w-[860px] mx-auto px-4 py-12">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-full px-4 py-1.5 text-[13px] font-semibold mb-4">
              Your trial or subscription has ended
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Choose your plan to continue</h1>
            <p className="text-slate-500">Start your 7-day free trial — no charge until it ends. Cancel anytime.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {PLANS.map(plan => (
              <Card
                key={plan.id}
                className="overflow-hidden relative"
                style={{ border: `2px solid ${plan.color}30` }}
              >
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
                    <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
                      {currencyInfo.symbol}{plan.price.toLocaleString()}
                      <span className="text-sm font-normal text-slate-400">/mo</span>
                    </div>
                    <div className="text-xs text-slate-400 mb-5 mt-0.5">{plan.posts} posts/month</div>
                  </div>
                  <div className="flex flex-col gap-2.5 mb-6 flex-1">
                    {plan.features.map(f => (
                      <div key={f} className="flex items-start gap-2.5 text-[13px] text-slate-600">
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

          <p className="text-center text-xs text-slate-400 mt-6">
            Card required to start trial. No charge for 7 days. Cancel any time from Settings.
          </p>
        </div>
      </div>
    </>
  )
}

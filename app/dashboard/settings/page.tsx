'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CONTENT_PILLARS, PLAN_FEATURES } from '@/lib/supabase'
import { getCurrency, getPaymentProcessor } from '@/lib/currency'
import Script from 'next/script'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Loader2,
  Link2,
  Bot,
  CheckCircle2,
  Lightbulb,
  Check,
  ArrowRight,
} from 'lucide-react'

function SettingsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<Record<string, unknown> | null>(null)
  const [profile, setProfile] = useState<Record<string, unknown>>({})
  const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null)
  const [subscription, setSubscription] = useState<{ status: string; trial_ends_at: string | null; next_billing_date: string | null } | null>(null)
  const [userCountry, setUserCountry] = useState('IN')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [codeInput, setCodeInput] = useState('')
  const [codeChecking, setCodeChecking] = useState(false)
  const [codeError, setCodeError] = useState('')
  const [appliedCode, setAppliedCode] = useState<{ code: string; plan: string } | null>(null)
  const [showCodeField, setShowCodeField] = useState(false)
  const [activatingCode, setActivatingCode] = useState(false)
  const planRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const match = document.cookie.match(/user_country=([^;]+)/)
    if (match) setUserCountry(match[1])
  }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/me')
        const data = await res.json()
        if (!data.user) { window.location.href = '/'; return }
        if (cancelled) return
        setUser(data.user)
        setProfile(data.profile || {})
        if (data.subscription) setSubscription(data.subscription)
      } catch {
        /* non-fatal */
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (loading) return
    const tab = searchParams.get('tab')
    if (tab === 'plan' && planRef.current) {
      setTimeout(() => planRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200)
    }
  }, [searchParams, loading])

  async function saveProfile() {
    setSaving(true)
    const res = await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    })
    const data = await res.json()
    setSaving(false)
    if (data.error) { toast.error('Error: ' + data.error); return }
    toast.success('Settings saved!')
  }

  async function handleUpgrade(planId: string, planLabel: string, planColor: string) {
    setUpgradingPlan(planId)
    const processor = getPaymentProcessor(userCountry)
    if (processor === 'dodo') {
      const currencyInfo = getCurrency(userCountry)
      try {
        const res = await fetch('/api/dodo/create-subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan: planId, currency: currencyInfo.code }),
        })
        const data = await res.json()
        if (data.error) { toast.error('Error: ' + data.error); setUpgradingPlan(null); return }
        window.location.href = data.checkout_url
      } catch {
        toast.error('Something went wrong. Please try again.')
        setUpgradingPlan(null)
      }
      return
    }
    try {
      const res = await fetch('/api/razorpay/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      })
      const data = await res.json()
      if (data.error) { toast.error('Error: ' + data.error); setUpgradingPlan(null); return }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rzp = new (window as any).Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        subscription_id: data.subscription_id,
        name: 'PersonaLink',
        description: `${planLabel} Plan`,
        theme: { color: planColor },
        handler: async (response: { razorpay_payment_id: string; razorpay_subscription_id: string; razorpay_signature: string }) => {
          const verifyRes = await fetch('/api/razorpay/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_subscription_id: response.razorpay_subscription_id,
              razorpay_signature: response.razorpay_signature,
              plan: planId,
            }),
          })
          const verifyData = await verifyRes.json()
          if (verifyData.error) { toast.error('Payment verification failed'); setUpgradingPlan(null); return }
          toast.success('Upgrade successful! Welcome to ' + planLabel)
          setTimeout(() => { window.location.href = '/dashboard?upgraded=1' }, 1500)
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
    setActivatingCode(true)
    try {
      const res = await fetch('/api/access-codes/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: appliedCode.code }),
      })
      const data = await res.json()
      if (!res.ok || data.error) { toast.error(data.error || 'Failed to activate code.'); setActivatingCode(false); return }
      toast.success(`${appliedCode.plan.charAt(0).toUpperCase() + appliedCode.plan.slice(1)} plan activated!`)
      setTimeout(() => { window.location.href = '/dashboard' }, 1500)
    } catch {
      toast.error('Something went wrong. Please try again.')
      setActivatingCode(false)
    }
  }

  function togglePillar(p: string) {
    const current = (profile.content_pillars as string[]) || []
    if (current.includes(p)) setProfile(f => ({ ...f, content_pillars: current.filter((x: string) => x !== p) }))
    else if (current.length < 3) setProfile(f => ({ ...f, content_pillars: [...current, p] }))
  }

  function toggleDay(d: string) {
    const current = (profile.preferred_days as string[]) || []
    if (current.includes(d)) setProfile(f => ({ ...f, preferred_days: current.filter((x: string) => x !== d) }))
    else setProfile(f => ({ ...f, preferred_days: [...current, d] }))
  }

  async function deleteAccount() {
    setDeleting(true)
    const res = await fetch('/api/account/delete', { method: 'DELETE' })
    const data = await res.json()
    setDeleting(false)
    if (data.error) { toast.error('Error: ' + data.error); return }
    window.location.href = '/'
  }

  const plan = (profile.plan as string) || 'starter'
  const planColor = plan === 'pro' ? '#7c3aed' : plan === 'standard' ? '#0A66C2' : '#64748b'
  const currencyInfo = getCurrency(userCountry)
  const processor = getPaymentProcessor(userCountry)

  const PLANS = [
    { id: 'starter', label: 'Starter', price: currencyInfo.starter, posts: 12, features: PLAN_FEATURES.starter, color: '#64748b' },
    { id: 'standard', label: 'Standard', price: currencyInfo.standard, posts: 20, features: PLAN_FEATURES.standard, color: '#0A66C2' },
    { id: 'pro', label: 'Pro', price: currencyInfo.pro, posts: 30, features: PLAN_FEATURES.pro, color: '#7c3aed' },
  ]

  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

  if (loading) {
    return (
      <div className="p-4 md:p-7">
        <div className="skeleton h-8 w-44 mb-8 rounded" />
        <div className="skeleton h-72 rounded-2xl mb-6" />
        <div className="skeleton h-48 rounded-2xl" />
      </div>
    )
  }

  function SectionLabel({ children, danger }: { children: React.ReactNode; danger?: boolean }) {
    return (
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14, fontFamily: 'var(--f-mono)', color: danger ? '#ef4444' : 'var(--ink-4)' }}>
        // {children}
      </div>
    )
  }

  function SaveButton({ label = 'Save Changes' }: { label?: string }) {
    return (
      <button
        onClick={saveProfile}
        disabled={saving}
        className="flex items-center gap-1.5 transition-opacity mt-2"
        style={{
          padding: '8px 18px', borderRadius: 'var(--r-sm)', fontSize: 13, fontWeight: 600,
          background: 'var(--pl-accent)', color: '#fff',
          opacity: saving ? 0.6 : 1,
        }}
      >
        {saving ? <><Loader2 className="size-4 animate-spin" /> Saving…</> : <><Check className="size-4" /> {label}</>}
      </button>
    )
  }

  return (
    <div className="p-4 md:p-7 max-w-[700px]">
      <div className="mb-6 md:mb-8">
        <h1 style={{ fontFamily: 'var(--f-sans)', fontWeight: 600, fontSize: 22, color: 'var(--ink)', letterSpacing: '-0.025em', marginBottom: 4 }}>Settings</h1>
        <p style={{ fontSize: 13, color: 'var(--ink-4)', fontFamily: 'var(--f-mono)' }}>// manage your account and preferences</p>
      </div>

      {/* ── Profile ── */}
      <section className="mb-8">
        <SectionLabel>Profile</SectionLabel>
        <Card className="border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl">
          <CardContent className="pt-6 flex flex-col gap-4">
            {[
              { label: 'Full name', key: 'name', placeholder: 'Your name' },
              { label: 'Role / Title', key: 'role', placeholder: 'e.g. Founder & CEO' },
              { label: 'Industry', key: 'industry', placeholder: 'e.g. SaaS, Fintech' },
              { label: 'Company', key: 'company', placeholder: 'Your company' },
              { label: 'LinkedIn profile URL', key: 'linkedin_url', placeholder: 'https://linkedin.com/in/...' },
            ].map(field => (
              <div key={field.key}>
                <Label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{field.label}</Label>
                <Input
                  value={(profile[field.key] as string) || ''}
                  onChange={e => setProfile(p => ({ ...p, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  className="border-slate-200 dark:border-slate-700 text-[14px]"
                />
              </div>
            ))}
            <div>
              <Label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Writing sample <span className="text-slate-400 font-normal">(used for voice matching)</span>
              </Label>
              <Textarea
                value={(profile.writing_sample as string) || ''}
                onChange={e => setProfile(p => ({ ...p, writing_sample: e.target.value }))}
                placeholder="Write a few paragraphs in your natural style..."
                className="min-h-[120px] resize-none border-slate-200 dark:border-slate-700 text-[14px]"
              />
            </div>
            <SaveButton label="Save Profile" />
          </CardContent>
        </Card>
      </section>

      {/* ── Content Preferences ── */}
      <section className="mb-8">
        <SectionLabel>Content Preferences</SectionLabel>
        <Card className="border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl">
          <CardContent className="pt-6 flex flex-col gap-6">
            <div>
              <Label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Content pillars <span className="text-slate-400 font-normal">(pick up to 3)</span>
              </Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {CONTENT_PILLARS.map(p => {
                  const selected = ((profile.content_pillars as string[]) || []).includes(p)
                  const maxed = ((profile.content_pillars as string[]) || []).length >= 3 && !selected
                  return (
                    <button
                      key={p}
                      onClick={() => togglePillar(p)}
                      disabled={maxed}
                      className={`px-3.5 py-1.5 rounded-full border text-[13px] transition-all duration-150 font-medium ${
                        selected
                          ? 'border-brand bg-brand-light text-brand shadow-sm'
                          : maxed
                          ? 'border-slate-100 text-slate-300 cursor-not-allowed bg-slate-50'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50 bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
                      }`}
                    >
                      {selected && <Check className="w-3 h-3 inline mr-1.5" strokeWidth={2.5} />}
                      {p}
                    </button>
                  )
                })}
              </div>
            </div>

            <Separator className="bg-slate-100 dark:bg-slate-800" />

            <div>
              <Label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-3">AI control preference</Label>
              <div className="flex flex-col gap-2.5 mt-2">
                {[
                  { id: 'autopilot', icon: Bot, iconColor: '#0A66C2', iconBg: '#e8f0fb', title: 'Full Autopilot', desc: 'AI generates and posts everything automatically on your preferred schedule.' },
                  { id: 'approve', icon: CheckCircle2, iconColor: '#059669', iconBg: '#ecfdf5', title: 'Approve Before Posting', desc: 'AI generates posts, you get an email to approve each one before it goes live.' },
                  { id: 'suggest', icon: Lightbulb, iconColor: '#d97706', iconBg: '#fffbeb', title: 'Suggest Only', desc: 'AI suggests ideas, you decide which ones to develop and post yourself.' },
                ].map(opt => {
                  const selected = profile.control_preference === opt.id
                  const Icon = opt.icon
                  return (
                    <button
                      key={opt.id}
                      onClick={() => setProfile(p => ({ ...p, control_preference: opt.id }))}
                      className={`p-4 rounded-xl border-2 text-left transition-all duration-150 ${
                        selected ? 'border-brand bg-brand-light dark:bg-brand/10 shadow-sm' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex gap-3 items-start">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: opt.iconBg }}>
                          <Icon className="w-4 h-4" style={{ color: opt.iconColor }} strokeWidth={1.75} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`font-bold text-[14px] mb-0.5 ${selected ? 'text-brand' : 'text-slate-900 dark:text-slate-100'}`}>{opt.title}</div>
                          <div className="text-slate-500 dark:text-slate-400 text-[12px] leading-relaxed">{opt.desc}</div>
                        </div>
                        {selected && (
                          <div className="w-5 h-5 rounded-full bg-brand flex items-center justify-center shrink-0 mt-0.5">
                            <Check className="w-3 h-3 text-white" strokeWidth={2.5} />
                          </div>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            <Separator className="bg-slate-100 dark:bg-slate-800" />

            <div className="flex flex-col gap-4">
              <Label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">Posting schedule</Label>
              <div>
                <div className="text-[12px] text-slate-500 mb-2">Preferred posting days</div>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map(d => {
                    const selected = ((profile.preferred_days as string[]) || []).includes(d)
                    return (
                      <button
                        key={d}
                        onClick={() => toggleDay(d)}
                        className={`px-3.5 py-1.5 rounded-full border text-[13px] font-medium transition-all duration-150 ${
                          selected
                            ? 'border-brand bg-brand-light text-brand shadow-sm'
                            : 'border-slate-200 text-slate-600 hover:border-slate-300 bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 hover:bg-slate-50'
                        }`}
                      >
                        {d.slice(0, 3)}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[12px] text-slate-500 mb-1.5">Posting time</div>
                  <select
                    value={(profile.preferred_post_hour as number) || 9}
                    onChange={e => setProfile(p => ({ ...p, preferred_post_hour: Number(e.target.value) }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-brand/20 bg-white dark:bg-slate-800 transition-colors"
                  >
                    {Array.from({ length: 16 }, (_, i) => i + 6).map(h => (
                      <option key={h} value={h}>{h.toString().padStart(2, '0')}:00</option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="text-[12px] text-slate-500 mb-1.5">Timezone</div>
                  <select
                    value={(profile.timezone as string) || 'Asia/Kolkata'}
                    onChange={e => setProfile(p => ({ ...p, timezone: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-brand/20 bg-white dark:bg-slate-800 transition-colors"
                  >
                    {['Asia/Kolkata', 'UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Asia/Singapore'].map(tz => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <SaveButton label="Save Preferences" />
          </CardContent>
        </Card>
      </section>

      {/* ── Plan & Billing ── */}
      <section className="mb-8" ref={planRef} id="plan">
        <SectionLabel>Plan & Billing</SectionLabel>
        <div className="flex flex-col gap-4">
          <Card className="border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl">
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
                <div className="rounded-2xl px-4 py-4" style={{ background: planColor + '0d', border: `1px solid ${planColor}25` }}>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <div className="text-xs font-bold uppercase tracking-wider" style={{ color: planColor }}>{plan} Plan</div>
                    {subscription?.status === 'trial' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Trial</span>
                    )}
                  </div>
                  <div className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                    {currencyInfo.symbol}{currencyInfo[plan as keyof typeof currencyInfo] ?? currencyInfo.starter}
                    <span className="text-sm font-normal text-slate-400">/mo</span>
                  </div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Posts Used</div>
                  <div className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                    {(profile.posts_used_this_month as number) || 0}
                    <span className="text-sm font-normal text-slate-400">/{(profile.posts_limit as number) || 12}</span>
                  </div>
                </div>
                {subscription?.status === 'trial' && subscription.trial_ends_at && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-4">
                    <div className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">Trial Ends</div>
                    <div className="text-xl font-bold text-slate-900 tracking-tight">
                      {new Date(subscription.trial_ends_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </div>
                    <div className="text-[11px] text-emerald-600 mt-0.5">No charge until then</div>
                  </div>
                )}
                {subscription?.status === 'active' && subscription.next_billing_date && (
                  <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-4">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Next Billing</div>
                    <div className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                      {new Date(subscription.next_billing_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </div>
                  </div>
                )}
              </div>
              <div className="text-[12px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">Included features</div>
              <div className="flex flex-wrap gap-1.5">
                {PLAN_FEATURES[plan as keyof typeof PLAN_FEATURES]?.map(f => (
                  <Badge key={f} variant="secondary" className="text-[11px] font-medium">{f}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {plan !== 'pro' && (
            <>
              <div className="text-[13px] font-bold text-slate-900 dark:text-slate-100 px-0.5 mt-1">Upgrade your plan</div>
              {PLANS.filter(p => p.id !== plan).map(p => (
                <Card key={p.id} className="shadow-sm rounded-2xl" style={{ borderColor: p.color + '30' }}>
                  <CardContent className="pt-5">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="font-bold text-[16px] mb-0.5 tracking-tight" style={{ color: p.color }}>{p.label}</div>
                        <div className="text-[13px] text-slate-400">{p.posts} posts/month</div>
                      </div>
                      <div className="text-2xl font-bold tracking-tight" style={{ color: p.color }}>
                        {currencyInfo.symbol}{p.price.toLocaleString()}<span className="text-xs font-normal text-slate-400">/mo</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {p.features.map(f => (
                        <Badge key={f} variant="secondary" className="text-[11px] font-medium" style={{ background: p.color + '0d', color: p.color, border: 'none' }}>{f}</Badge>
                      ))}
                    </div>
                    <Button
                      onClick={() => handleUpgrade(p.id, p.label, p.color)}
                      disabled={upgradingPlan === p.id}
                      className="w-full gap-2"
                      style={{ background: p.color }}
                    >
                      {upgradingPlan === p.id
                        ? <><Loader2 className="size-4 animate-spin" /> Opening checkout...</>
                        : <>Upgrade to {p.label} · {processor === 'razorpay' ? 'Razorpay' : 'Dodo'} <ArrowRight className="size-4" /></>
                      }
                    </Button>
                  </CardContent>
                </Card>
              ))}

          {/* Access code */}
          <div className="mt-1 pt-4 border-t border-slate-100 dark:border-slate-800">
            {!showCodeField ? (
              <button
                onClick={() => setShowCodeField(true)}
                className="text-[13px] text-slate-400 hover:text-brand transition-colors underline underline-offset-2"
              >
                Have an access code?
              </button>
            ) : appliedCode ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5">
                  <CheckCircle2 className="size-4 shrink-0" />
                  <p className="text-[13px] font-semibold">
                    Code applied! You get the <span className="capitalize">{appliedCode.plan}</span> plan.
                  </p>
                </div>
                <Button
                  onClick={handleActivateCode}
                  disabled={activatingCode}
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700 w-full sm:w-fit"
                >
                  {activatingCode
                    ? <><Loader2 className="size-4 animate-spin" /> Activating...</>
                    : `Activate ${appliedCode.plan.charAt(0).toUpperCase() + appliedCode.plan.slice(1)} Plan →`
                  }
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-[13px] font-semibold text-slate-600">Enter your access code</p>
                <div className="flex gap-2">
                  <Input
                    value={codeInput}
                    onChange={e => { setCodeInput(e.target.value.toUpperCase()); setCodeError('') }}
                    placeholder="PERSONALINK-FREE-1234"
                    className="font-mono text-sm flex-1 border-slate-200 dark:border-slate-700"
                    onKeyDown={e => { if (e.key === 'Enter') handleAccessCode() }}
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
            </>
          )}
        </div>
      </section>

      {/* ── LinkedIn Connection ── */}
      <section className="mb-8">
        <SectionLabel>LinkedIn Connection</SectionLabel>
        <Card className="border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl">
          <CardContent className="pt-6">
            <div className="flex gap-3.5 items-center mb-5 p-4 bg-green-50 dark:bg-green-950/20 rounded-xl border border-green-100 dark:border-green-900">
              <Avatar className="w-11 h-11 ring-2 ring-offset-1 ring-green-100">
                <AvatarImage src={String(user?.linkedin_picture || '')} alt="" />
                <AvatarFallback className="bg-green-100 text-green-700 font-bold">
                  {String(user?.linkedin_name || 'U')[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-semibold text-slate-900 dark:text-slate-100 text-[14px]">{String(user?.linkedin_name || '')}</div>
                <div className="flex items-center gap-1.5 text-[12px] text-emerald-600 font-semibold mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Connected
                </div>
                <div className="text-xs text-slate-400 mt-0.5">{String(user?.email || '')}</div>
              </div>
            </div>
            <Button variant="outline" onClick={() => window.location.href = '/api/auth/linkedin'} className="gap-1.5 border-slate-200 dark:border-slate-700">
              <Link2 className="w-4 h-4" />
              Reconnect LinkedIn
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* ── Notifications ── */}
      <section className="mb-8">
        <SectionLabel>Notifications</SectionLabel>
        <Card className="border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl">
          <CardContent className="pt-6 flex flex-col gap-0">
            {[
              { key: 'notify_approval', label: 'Post approval requests', desc: 'Get an email when a post is ready for your approval' },
              { key: 'notify_published', label: 'Post published', desc: 'Confirmation when a post goes live on LinkedIn' },
              { key: 'notify_weekly_digest', label: 'Weekly performance digest', desc: 'Summary of your LinkedIn performance every Monday' },
              { key: 'notify_image_brief', label: 'Monthly image brief', desc: 'Photo prompts for your content calendar each month' },
              { key: 'notify_suggestions', label: 'New post suggestions', desc: 'When fresh ideas are ready based on trending topics' },
            ].map((n, i, arr) => (
              <div key={n.key}>
                <div className="flex justify-between items-center py-4">
                  <div className="mr-4">
                    <div className="font-semibold text-slate-900 dark:text-slate-100 text-[13.5px] mb-0.5">{n.label}</div>
                    <div className="text-xs text-slate-400">{n.desc}</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input type="checkbox" defaultChecked={n.key !== 'notify_suggestions'} className="sr-only peer" />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:ring-2 peer-focus:ring-brand/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand" />
                  </label>
                </div>
                {i < arr.length - 1 && <Separator className="bg-slate-100 dark:bg-slate-800" />}
              </div>
            ))}
            <SaveButton label="Save Notification Preferences" />
          </CardContent>
        </Card>
      </section>

      {/* ── Danger Zone ── */}
      <section>
        <SectionLabel danger>Danger Zone</SectionLabel>
        <Card className="border-red-100 dark:border-red-900/50 shadow-sm rounded-2xl bg-red-50/30 dark:bg-red-950/10">
          <CardContent className="pt-6 flex flex-col gap-4">
            {plan !== 'starter' && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 pb-4 border-b border-red-100 dark:border-red-900/30">
                <div className="flex-1">
                  <div className="font-semibold text-slate-900 dark:text-slate-100 text-[14px] mb-0.5">Cancel Subscription</div>
                  <div className="text-xs text-slate-500">You&apos;ll keep access until the end of your billing period.</div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-red-200 text-red-500 hover:bg-red-50 hover:text-red-700 hover:border-red-300 shrink-0"
                  onClick={async () => {
                    if (!confirm('Cancel subscription?')) return
                    const res = await fetch('/api/razorpay/cancel', { method: 'POST' })
                    const data = await res.json()
                    if (data.error) { toast.error('Error: ' + data.error); return }
                    toast.success('Subscription cancelled.')
                    router.refresh()
                  }}
                >
                  Cancel Subscription
                </Button>
              </div>
            )}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1">
                <div className="font-semibold text-slate-900 dark:text-slate-100 text-[14px] mb-0.5">Delete Account</div>
                <div className="text-xs text-slate-500">Permanently delete your account and all data. This cannot be undone.</div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-400 shrink-0"
                onClick={() => setDeleteOpen(true)}
              >
                Delete Account
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Delete account confirmation dialog */}
      <Dialog open={deleteOpen} onOpenChange={open => { if (!open) { setDeleteOpen(false); setDeleteConfirm('') } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Account</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500 -mt-2 mb-4 leading-relaxed">
            This will permanently delete your account, all posts, and all data. This action <strong>cannot be undone</strong>.
          </p>
          <div className="mb-4">
            <Label className="text-[13px] font-semibold text-slate-700 mb-1.5">Type <strong>DELETE</strong> to confirm</Label>
            <Input
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
              placeholder="DELETE"
              className="border-slate-200 text-[14px] mt-1.5"
            />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={deleteAccount}
              disabled={deleteConfirm !== 'DELETE' || deleting}
              className="gap-1.5 bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? <><Loader2 className="size-4 animate-spin" /> Deleting...</> : 'Delete my account'}
            </Button>
            <Button variant="outline" onClick={() => { setDeleteOpen(false); setDeleteConfirm('') }}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <Suspense><SettingsContent /></Suspense>
    </>
  )
}

'use client'

import { useState, useEffect, Suspense } from 'react'
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
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Loader2,
  User,
  SlidersHorizontal,
  Calendar,
  CreditCard,
  Link2,
  Bell,
  Bot,
  CheckCircle2,
  Lightbulb,
  Check,
  Zap,
  ArrowRight,
} from 'lucide-react'

type SettingsTab = 'profile' | 'control' | 'schedule' | 'plan' | 'linkedin' | 'notifications'

const TABS: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'control', label: 'Control', icon: SlidersHorizontal },
  { id: 'schedule', label: 'Schedule', icon: Calendar },
  { id: 'plan', label: 'Plan', icon: CreditCard },
  { id: 'linkedin', label: 'LinkedIn', icon: Link2 },
  { id: 'notifications', label: 'Notifications', icon: Bell },
]

function SettingsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initTab = (searchParams.get('tab') as SettingsTab) || 'profile'
  const [tab, setTab] = useState<SettingsTab>(initTab)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<Record<string, unknown> | null>(null)
  const [profile, setProfile] = useState<Record<string, unknown>>({})
  const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null)
  const [subscription, setSubscription] = useState<{ status: string; trial_ends_at: string | null; next_billing_date: string | null } | null>(null)
  const [userCountry, setUserCountry] = useState('IN')

  useEffect(() => {
    const match = document.cookie.match(/user_country=([^;]+)/)
    if (match) setUserCountry(match[1])
  }, [])

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/me')
      const data = await res.json()
      if (!data.user) { window.location.href = '/'; return }
      setUser(data.user)
      setProfile(data.profile || {})
      if (data.subscription) setSubscription(data.subscription)
      setLoading(false)
    }
    load()
  }, [])

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

    // Razorpay flow for Indian users
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
      <div className="p-8">
        <div className="skeleton h-8 w-44 mb-8 rounded" />
        <div className="skeleton h-72 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-7 max-w-[820px]">
      <div className="mb-5 md:mb-7">
        <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-1 tracking-tight">Settings</h1>
        <p className="text-sm text-slate-400 font-medium">Manage your account preferences</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 md:gap-6">
        {/* Tab nav — horizontal scroll on mobile, vertical on desktop */}
        <div className="md:w-44 md:shrink-0">
          <nav className="flex md:flex-col gap-0.5 overflow-x-auto pb-1 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0">
            {TABS.map(t => {
              const Icon = t.icon
              const active = tab === t.id
              return (
                <Button
                  key={t.id}
                  variant="ghost"
                  onClick={() => setTab(t.id)}
                  className={`justify-start gap-2 text-[13px] font-medium h-9 relative shrink-0 md:shrink md:w-full ${
                    active
                      ? 'bg-brand-light text-brand font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {active && <span className="hidden md:block absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-brand rounded-full" />}
                  <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-brand' : 'text-slate-400'}`} strokeWidth={active ? 2 : 1.75} />
                  {t.label}
                </Button>
              )
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Profile */}
          {tab === 'profile' && (
            <Card className="border-slate-100 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-bold">Profile</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 pt-0">
                {[
                  { label: 'Full name', key: 'name', placeholder: 'Your name' },
                  { label: 'Role / Title', key: 'role', placeholder: 'e.g. Founder & CEO' },
                  { label: 'Industry', key: 'industry', placeholder: 'e.g. SaaS, Fintech' },
                  { label: 'Company', key: 'company', placeholder: 'Your company' },
                  { label: 'LinkedIn profile URL', key: 'linkedin_url', placeholder: 'https://linkedin.com/in/...' },
                ].map(field => (
                  <div key={field.key}>
                    <Label className="text-[13px] font-semibold text-slate-700 mb-1.5">{field.label}</Label>
                    <Input
                      value={(profile[field.key] as string) || ''}
                      onChange={e => setProfile(p => ({ ...p, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      className="border-slate-200 text-[14px]"
                    />
                  </div>
                ))}
                <div>
                  <Label className="text-[13px] font-semibold text-slate-700 mb-2">Content pillars <span className="text-slate-400 font-normal">(pick up to 3)</span></Label>
                  <div className="flex flex-wrap gap-2">
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
                              : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50 bg-white'
                          }`}
                        >
                          {selected && <Check className="w-3 h-3 inline mr-1.5" strokeWidth={2.5} />}
                          {p}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div>
                  <Label className="text-[13px] font-semibold text-slate-700 mb-1.5">Writing sample <span className="text-slate-400 font-normal">(used for voice matching)</span></Label>
                  <Textarea
                    value={(profile.writing_sample as string) || ''}
                    onChange={e => setProfile(p => ({ ...p, writing_sample: e.target.value }))}
                    placeholder="Write a few paragraphs in your natural style..."
                    className="min-h-[120px] resize-none border-slate-200 text-[14px]"
                  />
                </div>
                <Button onClick={saveProfile} disabled={saving} className="w-full sm:w-fit mt-2 gap-1.5 shadow-sm">
                  {saving ? <><Loader2 className="size-4 animate-spin" /> Saving...</> : <><Check className="size-4" /> Save Profile</>}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Control */}
          {tab === 'control' && (
            <Card className="border-slate-100 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-bold">Control Preference</CardTitle>
                <p className="text-sm text-slate-400">How much do you want AI to automate?</p>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 pt-0">
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
                      className={`p-5 rounded-xl border-2 text-left transition-all duration-150 ${
                        selected ? 'border-brand bg-brand-light shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex gap-3.5 items-start">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: opt.iconBg }}>
                          <Icon className="w-4.5 h-4.5" style={{ color: opt.iconColor }} strokeWidth={1.75} />
                        </div>
                        <div className="flex-1">
                          <div className={`font-bold text-[15px] mb-1 ${selected ? 'text-brand' : 'text-slate-900'}`}>{opt.title}</div>
                          <div className="text-slate-500 text-[13px] leading-relaxed">{opt.desc}</div>
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
                <Button onClick={saveProfile} disabled={saving} className="w-full sm:w-fit mt-2 gap-1.5 shadow-sm">
                  {saving ? <><Loader2 className="size-4 animate-spin" /> Saving...</> : <><Check className="size-4" /> Save Control Settings</>}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Schedule */}
          {tab === 'schedule' && (
            <Card className="border-slate-100 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-bold">Posting Schedule</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-5 pt-0">
                <div>
                  <Label className="text-[13px] font-semibold text-slate-700 mb-2">Preferred posting days</Label>
                  <div className="flex flex-wrap gap-2">
                    {DAYS.map(d => {
                      const selected = ((profile.preferred_days as string[]) || []).includes(d)
                      return (
                        <button
                          key={d}
                          onClick={() => toggleDay(d)}
                          className={`px-4 py-2 rounded-full border text-[13px] font-medium transition-all duration-150 ${
                            selected
                              ? 'border-brand bg-brand-light text-brand shadow-sm'
                              : 'border-slate-200 text-slate-600 hover:border-slate-300 bg-white hover:bg-slate-50'
                          }`}
                        >
                          {d.slice(0, 3)}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div>
                  <Label className="text-[13px] font-semibold text-slate-700 mb-1.5">Preferred posting hour</Label>
                  <select
                    value={(profile.preferred_post_hour as number) || 9}
                    onChange={e => setProfile(p => ({ ...p, preferred_post_hour: Number(e.target.value) }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-brand/20 bg-white transition-colors"
                  >
                    {Array.from({ length: 16 }, (_, i) => i + 6).map(h => (
                      <option key={h} value={h}>{h.toString().padStart(2, '0')}:00</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-[13px] font-semibold text-slate-700 mb-1.5">Timezone</Label>
                  <select
                    value={(profile.timezone as string) || 'Asia/Kolkata'}
                    onChange={e => setProfile(p => ({ ...p, timezone: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-brand/20 bg-white transition-colors"
                  >
                    {['Asia/Kolkata', 'UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Asia/Singapore'].map(tz => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </select>
                </div>
                <Button onClick={saveProfile} disabled={saving} className="w-full sm:w-fit gap-1.5 shadow-sm">
                  {saving ? <><Loader2 className="size-4 animate-spin" /> Saving...</> : <><Check className="size-4" /> Save Schedule</>}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Plan */}
          {tab === 'plan' && (
            <div className="flex flex-col gap-5">
              <Card className="border-slate-100 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base font-bold">Current Plan</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 md:flex gap-3 md:gap-4 mb-5">
                    <div className="rounded-xl px-5 py-4" style={{ background: planColor + '0d', border: `1px solid ${planColor}25` }}>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="text-xs font-bold uppercase tracking-wider" style={{ color: planColor }}>{plan} Plan</div>
                        {subscription?.status === 'trial' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Free Trial</span>
                        )}
                      </div>
                      <div className="text-[22px] font-extrabold text-slate-900 tracking-tight">
                        {currencyInfo.symbol}{currencyInfo[plan as keyof typeof currencyInfo] ?? currencyInfo.starter}
                        <span className="text-sm font-normal text-slate-400">/mo</span>
                      </div>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl px-5 py-4">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Posts Used</div>
                      <div className="text-[22px] font-extrabold text-slate-900 tracking-tight">
                        {(profile.posts_used_this_month as number) || 0}
                        <span className="text-sm font-normal text-slate-400">/{(profile.posts_limit as number) || 12}</span>
                      </div>
                    </div>
                    {subscription?.status === 'trial' && subscription.trial_ends_at && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4">
                        <div className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">Trial Ends</div>
                        <div className="text-[18px] font-extrabold text-slate-900 tracking-tight">
                          {new Date(subscription.trial_ends_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </div>
                        <div className="text-[11px] text-emerald-600 mt-0.5">No charge until then</div>
                      </div>
                    )}
                    {subscription?.status === 'active' && subscription.next_billing_date && (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl px-5 py-4">
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Next Billing</div>
                        <div className="text-[18px] font-extrabold text-slate-900 tracking-tight">
                          {new Date(subscription.next_billing_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="text-[12px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5">Included features</div>
                  <div className="flex flex-wrap gap-1.5">
                    {PLAN_FEATURES[plan as keyof typeof PLAN_FEATURES]?.map(f => (
                      <Badge key={f} variant="secondary" className="text-[11px] font-medium">{f}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {plan !== 'pro' && (
                <div className="flex flex-col gap-4">
                  <h3 className="text-[14px] font-bold text-slate-900">Upgrade your plan</h3>
                  {PLANS.filter(p => p.id !== plan).map(p => (
                    <Card key={p.id} className="border-slate-100 shadow-sm" style={{ borderColor: p.color + '25' }}>
                      <CardContent className="pt-5">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <div className="font-bold text-[17px] mb-0.5 tracking-tight" style={{ color: p.color }}>{p.label}</div>
                            <div className="text-[13px] text-slate-400">{p.posts} posts/month</div>
                          </div>
                          <div className="text-2xl font-extrabold tracking-tight" style={{ color: p.color }}>
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
                            : <>Upgrade to {p.label} · via {processor === 'razorpay' ? 'Razorpay' : 'Dodo'} <ArrowRight className="size-4" /></>
                          }
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {plan !== 'starter' && (
                <Card className="border-red-100 bg-red-50/50 shadow-sm">
                  <CardContent className="pt-5">
                    <h3 className="text-[14px] font-bold text-slate-900 mb-1.5">Cancel Subscription</h3>
                    <p className="text-[13px] text-slate-500 mb-4">You&apos;ll keep access until the end of your billing period.</p>
                    <Button
                      variant="outline"
                      className="border-red-200 text-red-500 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
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
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* LinkedIn */}
          {tab === 'linkedin' && (
            <Card className="border-slate-100 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-bold">LinkedIn Connection</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex gap-3.5 items-center mb-6 p-4 bg-green-50 rounded-xl border border-green-100">
                  <Avatar className="w-11 h-11 ring-2 ring-offset-1 ring-green-100">
                    <AvatarImage src={String(user?.linkedin_picture || '')} alt="" />
                    <AvatarFallback className="bg-green-100 text-green-700 font-bold">
                      {String(user?.linkedin_name || 'U')[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-semibold text-slate-900 text-[14px]">{String(user?.linkedin_name || '')}</div>
                    <div className="flex items-center gap-1.5 text-[12px] text-emerald-600 font-semibold mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Connected
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">{String(user?.email || '')}</div>
                  </div>
                </div>
                <p className="text-[13px] text-slate-500 mb-5 leading-relaxed">
                  Your LinkedIn account is connected. We can post on your behalf with your approval.
                </p>
                <Button variant="outline" onClick={() => window.location.href = '/api/auth/linkedin'} className="gap-1.5 border-slate-200">
                  <Link2 className="w-4 h-4" />
                  Reconnect LinkedIn
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Notifications */}
          {tab === 'notifications' && (
            <Card className="border-slate-100 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-bold">Email Notifications</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-0 pt-0">
                {[
                  { key: 'notify_approval', label: 'Post approval requests', desc: 'Get an email when a post is ready for your approval' },
                  { key: 'notify_published', label: 'Post published', desc: 'Confirmation when a post goes live on LinkedIn' },
                  { key: 'notify_weekly_digest', label: 'Weekly performance digest', desc: 'Summary of your LinkedIn performance every Monday' },
                  { key: 'notify_image_brief', label: 'Monthly image brief', desc: 'Photo prompts for your content calendar each month' },
                  { key: 'notify_suggestions', label: 'New post suggestions', desc: 'When fresh ideas are ready based on trending topics' },
                ].map((n, i) => (
                  <div key={n.key}>
                    <div className="flex justify-between items-center py-4">
                      <div>
                        <div className="font-semibold text-slate-900 text-[13.5px] mb-0.5">{n.label}</div>
                        <div className="text-xs text-slate-400">{n.desc}</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          defaultChecked={n.key !== 'notify_suggestions'}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:ring-2 peer-focus:ring-brand/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand" />
                      </label>
                    </div>
                    {i < 4 && <Separator className="bg-slate-100" />}
                  </div>
                ))}
                <Button onClick={saveProfile} disabled={saving} className="w-full sm:w-fit mt-4 gap-1.5 shadow-sm">
                  {saving ? <><Loader2 className="size-4 animate-spin" /> Saving...</> : <><Check className="size-4" /> Save Preferences</>}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
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

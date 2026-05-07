'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { User, UserProfile } from '@/lib/supabase'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import {
  Menu,
  LayoutDashboard,
  Sparkles,
  FileText,
  BarChart3,
  Lightbulb,
  Settings,
  Zap,
  ChevronRight,
  Lock,
  X,
  Clock,
} from 'lucide-react'

const BOTTOM_NAV_ITEMS = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/generate', label: 'Generate', icon: Sparkles },
  { href: '/dashboard/posts', label: 'Posts', icon: FileText },
  { href: '/dashboard/suggestions', label: 'Ideas', icon: Lightbulb },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
]
import { motion, AnimatePresence } from 'framer-motion'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/generate', label: 'Generate', icon: Sparkles },
  { href: '/dashboard/posts', label: 'Posts', icon: FileText },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3, minPlan: 'standard' },
  { href: '/dashboard/suggestions', label: 'Ideas', icon: Lightbulb },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
]

function planRank(plan: string) {
  return plan === 'pro' ? 3 : plan === 'standard' ? 2 : 1
}

function SidebarContent({ user, plan, planColor, pathname }: {
  user: User | null
  plan: string
  planColor: string
  pathname: string
}) {
  return (
    <div className="flex flex-col h-full bg-white">
      {/* Logo */}
      <div className="px-5 pt-5 pb-4 border-b border-slate-100">
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="w-[34px] h-[34px] bg-gradient-to-br from-brand to-brand-dark rounded-[9px] flex items-center justify-center text-white font-extrabold text-[17px] shadow-sm">P</div>
          <span className="font-bold text-[15px] text-slate-900 group-hover:text-brand transition-colors">PersonaLink</span>
        </Link>
      </div>

      {/* User */}
      {user && (
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2.5">
          <Avatar className="w-[34px] h-[34px] ring-2 ring-offset-1 ring-slate-100">
            <AvatarImage src={user.linkedin_picture || ''} alt={user.linkedin_name || ''} />
            <AvatarFallback className="bg-brand-light text-brand font-bold text-sm">
              {user.linkedin_name?.[0] || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-[13px] text-slate-900 truncate leading-tight">{user.linkedin_name}</div>
            <div className="text-[11px] font-semibold uppercase tracking-wider mt-0.5" style={{ color: planColor }}>{plan}</div>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-0.5">
        {NAV_ITEMS.map(item => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
          const locked = item.minPlan && planRank(plan) < planRank(item.minPlan)
          const href = locked ? `/dashboard/upgrade?feature=${item.href.split('/').pop()}` : item.href
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={href}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13.5px] font-medium transition-all duration-150 group relative ${
                active
                  ? 'bg-brand-light text-brand font-semibold'
                  : locked
                  ? 'text-slate-300 cursor-not-allowed'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-brand rounded-full" />
              )}
              <Icon
                className={`w-[17px] h-[17px] shrink-0 ${active ? 'text-brand' : locked ? 'text-slate-300' : 'text-slate-400 group-hover:text-slate-600'} transition-colors`}
                strokeWidth={active ? 2 : 1.75}
              />
              <span className="flex-1">{item.label}</span>
              {locked && (
                <Lock className="w-3 h-3 text-slate-300" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Upgrade banner */}
      {plan !== 'pro' && (
        <div className="px-3 py-3 border-t border-slate-100">
          <Link
            href="/dashboard/upgrade"
            className="flex items-center gap-2.5 rounded-xl px-3.5 py-3 transition-all duration-150 hover:opacity-90 group"
            style={{ background: `${planColor}0d`, border: `1px solid ${planColor}20` }}
          >
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: planColor + '20' }}>
              <Zap className="w-3.5 h-3.5" style={{ color: planColor }} strokeWidth={2} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold leading-tight mb-0.5" style={{ color: planColor }}>
                {plan === 'starter' ? 'Upgrade to Standard' : 'Upgrade to Pro'}
              </div>
              <div className="text-[11px] text-slate-400 leading-tight">
                {plan === 'starter' ? 'Unlock analytics & voice notes' : 'Get repurpose & bulk generate'}
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-400 transition-colors shrink-0" />
          </Link>
        </div>
      )}
    </div>
  )
}

interface Subscription {
  status: string
  trial_ends_at: string | null
  plan_id: string | null
  next_billing_date: string | null
}

function TrialBanner({ trialEndsAt, onDismiss }: { trialEndsAt: string; onDismiss: () => void }) {
  const end = new Date(trialEndsAt)
  const now = new Date()
  const msLeft = end.getTime() - now.getTime()
  const daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)))
  const endDate = end.toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })

  return (
    <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-4 py-2.5 flex items-center gap-3">
      <Clock className="w-4 h-4 shrink-0 opacity-90" strokeWidth={2} />
      <p className="text-sm font-medium flex-1">
        Your free trial ends in <strong>{daysLeft} day{daysLeft !== 1 ? 's' : ''}</strong> — you won&apos;t be charged until <strong>{endDate}</strong>.
      </p>
      <Link href="/dashboard/settings?tab=plan" className="text-xs font-bold bg-white/20 hover:bg-white/30 transition-colors rounded-full px-3 py-1 shrink-0 whitespace-nowrap">
        Manage plan
      </Link>
      <button onClick={onDismiss} className="opacity-70 hover:opacity-100 transition-opacity shrink-0 ml-1">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [trialDismissed, setTrialDismissed] = useState(false)

  useEffect(() => {
    fetch('/api/me').then(r => r.json()).then(d => {
      if (d.user) setUser(d.user)
      if (d.profile) setProfile(d.profile)
      if (d.subscription) setSubscription(d.subscription)
    })
  }, [])

  // eslint-disable-next-line react-hooks/static-components
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileOpen(false)
  }, [pathname])

  const plan = profile?.plan || 'starter'
  const planColor = plan === 'pro' ? '#7c3aed' : plan === 'standard' ? '#0A66C2' : '#64748b'

  const sidebarProps = { user, plan, planColor, pathname }

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      {/* Desktop sidebar */}
      <aside className="hide-mobile w-[220px] bg-white border-r border-slate-100 sticky top-0 h-screen overflow-y-auto shrink-0 flex flex-col shadow-[1px_0_0_0_#f1f5f9]">
        <SidebarContent {...sidebarProps} />
      </aside>

      {/* Mobile Sheet sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" showCloseButton={false} className="p-0 w-[240px]">
          <SidebarContent {...sidebarProps} />
        </SheetContent>
      </Sheet>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Trial banner */}
        {!trialDismissed && subscription?.status === 'trial' && subscription.trial_ends_at && new Date(subscription.trial_ends_at) > new Date() && (
          <TrialBanner trialEndsAt={subscription.trial_ends_at} onDismiss={() => setTrialDismissed(true)} />
        )}

        {/* Mobile top bar */}
        <div className="hide-desktop bg-white border-b border-slate-100 h-[54px] flex items-center justify-between px-4 shadow-sm">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-[30px] h-[30px] bg-gradient-to-br from-brand to-brand-dark rounded-lg flex items-center justify-center text-white font-extrabold text-[15px]">P</div>
            <span className="font-bold text-slate-900 text-[15px]">PersonaLink</span>
          </Link>
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(o => !o)} className="rounded-lg">
            <Menu className="size-5 text-slate-600" />
          </Button>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.main
            key={pathname}
            className="flex-1 overflow-x-hidden pb-16 md:pb-0"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            {children}
          </motion.main>
        </AnimatePresence>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-100 safe-pb">
        <div className="flex h-14">
          {BOTTOM_NAV_ITEMS.map(item => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 pt-1 transition-colors ${
                  active ? 'text-[#0B458B]' : 'text-slate-400'
                }`}
              >
                <Icon className="w-5 h-5" strokeWidth={active ? 2 : 1.75} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

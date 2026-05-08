'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
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
  LogOut,
  User as UserIcon,
  HelpCircle,
  ChevronDown,
} from 'lucide-react'

const BOTTOM_NAV_ITEMS = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/generate', label: 'Generate', icon: Sparkles },
  { href: '/dashboard/posts', label: 'Posts', icon: FileText },
  { href: '/dashboard/suggestions', label: 'Ideas', icon: Lightbulb },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
]
import { motion, AnimatePresence } from 'framer-motion'
import { ThemeToggle } from '@/components/theme-toggle'

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

function ProfileDropdown({ user, profile, plan, planColor }: {
  user: User
  profile: UserProfile | null
  plan: string
  planColor: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  const postsUsed = profile?.posts_used_this_month || 0
  const postsLimit = profile?.posts_limit || 12
  const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1)

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors group"
      >
        <Avatar className="w-[34px] h-[34px] ring-2 ring-offset-1 ring-slate-100 shrink-0">
          <AvatarImage src={user.linkedin_picture || ''} alt={user.linkedin_name || ''} />
          <AvatarFallback className="bg-brand-light text-brand font-bold text-sm">
            {user.linkedin_name?.[0] || 'U'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0 text-left">
          <div className="font-semibold text-[13px] text-slate-900 truncate leading-tight">{user.linkedin_name}</div>
          <div className="text-[11px] font-semibold uppercase tracking-wider mt-0.5" style={{ color: planColor }}>{planLabel}</div>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-50">
          {/* User info header */}
          <div className="px-4 py-3 border-b border-slate-100">
            <div className="font-semibold text-sm text-slate-900 truncate">{user.linkedin_name}</div>
            <div className="text-xs text-slate-500 truncate mt-0.5">{user.email}</div>
            <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold"
              style={{ background: planColor + '18', color: planColor }}>
              {planLabel} Plan
            </div>
          </div>

          {/* Usage */}
          <div className="px-4 py-2.5 border-b border-slate-100">
            <div className="text-[11px] text-slate-500 mb-1">Posts this month</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-brand" style={{ width: `${Math.min((postsUsed / postsLimit) * 100, 100)}%` }} />
              </div>
              <span className="text-[11px] font-semibold text-slate-600">{postsUsed}/{postsLimit}</span>
            </div>
          </div>

          {/* Menu items */}
          <div className="py-1">
            {plan !== 'pro' && (
              <Link href="/dashboard/upgrade"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-semibold hover:bg-slate-50 transition-colors"
                style={{ color: planColor }}>
                <Zap className="w-4 h-4 shrink-0" />
                Upgrade Plan
              </Link>
            )}
            <Link href="/dashboard/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-slate-700 hover:bg-slate-50 transition-colors">
              <UserIcon className="w-4 h-4 text-slate-400 shrink-0" />
              My Profile
            </Link>
            <Link href="/dashboard/settings?tab=help"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-slate-700 hover:bg-slate-50 transition-colors">
              <HelpCircle className="w-4 h-4 text-slate-400 shrink-0" />
              Help &amp; FAQ
            </Link>
          </div>

          {/* Logout */}
          <div className="border-t border-slate-100 py-1">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-semibold text-red-500 hover:bg-red-50 transition-colors">
              <LogOut className="w-4 h-4 shrink-0" />
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function SidebarContent({ user, profile, plan, planColor, pathname }: {
  user: User | null
  profile: UserProfile | null
  plan: string
  planColor: string
  pathname: string
}) {
  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900">
      {/* Logo */}
      <div className="px-5 pt-5 pb-4 border-b border-slate-100">
        <Link href="/dashboard" className="flex items-center group">
          <div className="bg-white rounded-xl p-1.5 inline-flex items-center justify-center shadow-sm border border-slate-100">
            <Image src="/logo-icon.png" alt="PersonaLink" width={32} height={32} className="h-8 w-8" />
          </div>
        </Link>
      </div>

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
              {locked && <Lock className="w-3 h-3 text-slate-300" />}
            </Link>
          )
        })}
      </nav>

      {/* Upgrade banner */}
      {plan !== 'pro' && (
        <div className="px-3 py-2 border-t border-slate-100">
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

      {/* Profile dropdown at bottom */}
      <div className="px-2 py-2 border-t border-slate-100">
        {user
          ? <ProfileDropdown user={user} profile={profile} plan={plan} planColor={planColor} />
          : <div className="h-12 animate-pulse bg-slate-100 rounded-lg" />
        }
      </div>
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
  const daysLeft = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
  const endDate = end.toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })

  return (
    <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-4 py-2.5 flex items-center gap-3">
      <Clock className="w-4 h-4 shrink-0 opacity-90" strokeWidth={2} />
      <p className="text-sm font-medium flex-1">
        Free trial ends in <strong>{daysLeft} day{daysLeft !== 1 ? 's' : ''}</strong> — no charge until <strong>{endDate}</strong>.
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
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [trialDismissed, setTrialDismissed] = useState(false)

  useEffect(() => {
    fetch('/api/me').then(r => {
      if (!r.ok) { router.push('/'); return r.json() }
      return r.json()
    }).then(d => {
      if (d?.user) setUser(d.user)
      if (d?.profile) setProfile(d.profile)
      if (d?.subscription) setSubscription(d.subscription)
    }).catch(() => router.push('/'))
  }, [])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setMobileOpen(false) }, [pathname])

  async function handleMobileLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  const plan = profile?.plan || 'starter'
  const planColor = plan === 'pro' ? '#7c3aed' : plan === 'standard' ? '#0B458B' : '#64748b'

  const sidebarProps = { user, profile, plan, planColor, pathname }

  return (
    <div className="flex min-h-screen bg-slate-50/50 dark:bg-slate-950">
      {/* Desktop sidebar */}
      <aside className="hide-mobile w-[220px] bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 sticky top-0 h-screen overflow-y-auto shrink-0 flex flex-col shadow-[1px_0_0_0_#f1f5f9]">
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
        <div className="hide-desktop bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 h-[54px] flex items-center justify-between px-4 shadow-sm">
          <Link href="/dashboard" className="flex items-center">
            <div className="bg-white rounded-xl p-1.5 inline-flex items-center justify-center shadow-sm border border-slate-100">
              <Image src="/logo-icon.png" alt="PersonaLink" width={32} height={32} className="h-8 w-8" />
            </div>
          </Link>
          <div className="flex items-center gap-1">
            {user && plan === 'pro' && (
              <button
                onClick={() => window.location.href = '/api/auth/linkedin?add_profile=true'}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-400"
                title="Add LinkedIn profile"
              >
                {user.linkedin_picture
                  ? <Image src={user.linkedin_picture} alt="" width={20} height={20} className="w-5 h-5 rounded-full" />
                  : <div className="w-5 h-5 rounded-full bg-brand-light" />
                }
                <span className="hidden sm:inline truncate max-w-[80px]">{user.linkedin_name?.split(' ')[0]}</span>
              </button>
            )}
            <ThemeToggle />
            {user && (
              <button onClick={handleMobileLogout} className="p-2 rounded-lg hover:bg-slate-50 transition-colors">
                <LogOut className="w-4 h-4 text-slate-500" />
              </button>
            )}
            <Button variant="ghost" size="icon" onClick={() => setMobileOpen(o => !o)} className="rounded-lg">
              <Menu className="size-5 text-slate-600" />
            </Button>
          </div>
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
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 safe-pb">
        <div className="flex h-14">
          {BOTTOM_NAV_ITEMS.map(item => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
            const Icon = item.icon
            const isHome = item.href === '/dashboard' && item.exact
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 pt-1 transition-colors ${
                  active ? 'text-[#0B458B]' : 'text-slate-400'
                }`}
              >
                {isHome ? (
                  <div className={`bg-white rounded-xl p-1 inline-flex items-center justify-center shadow-sm ${active ? 'ring-1 ring-[#0B458B]/30' : 'opacity-60'}`}>
                    <Image src="/logo-icon.png" alt="Home" width={24} height={24} className="w-6 h-6 rounded-md" />
                  </div>
                ) : (
                  <Icon className="w-5 h-5" strokeWidth={active ? 2 : 1.75} />
                )}
                {active && <span className="text-[9px] font-semibold">{item.label}</span>}
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

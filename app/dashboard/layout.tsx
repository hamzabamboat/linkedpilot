'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { User, UserProfile } from '@/lib/supabase'
import { useOnlineStatus } from '@/hooks/use-online-status'
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
  CalendarDays,
  BookOpen,
  MoreHorizontal,
  ImageIcon,
  Mail,
  Copy,
  Check as CheckIcon,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { ThemeToggle } from '@/components/theme-toggle'
import { ErrorBoundary } from '@/components/error-boundary'

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  exact?: boolean
  minPlan?: string
}

const NAV_SECTIONS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Content',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, exact: true },
      { href: '/dashboard/generate', label: 'Generate', icon: Sparkles },
      { href: '/dashboard/posts', label: 'Posts', icon: FileText },
      { href: '/dashboard/calendar', label: 'Calendar', icon: CalendarDays },
      { href: '/dashboard/story-bank', label: 'Story Bank', icon: BookOpen },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3, minPlan: 'standard' },
      { href: '/dashboard/suggestions', label: 'Ideas', icon: Lightbulb },
    ],
  },
  {
    label: 'Account',
    items: [
      { href: '/dashboard/settings', label: 'Settings', icon: Settings },
    ],
  },
]

const BOTTOM_NAV_ITEMS = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/generate', label: 'Generate', icon: Sparkles },
  { href: '/dashboard/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/dashboard/story-bank', label: 'Stories', icon: BookOpen },
]

const MORE_ITEMS = [
  { href: '/dashboard/posts', label: 'My Posts', icon: FileText },
  { href: '/dashboard/suggestions', label: 'Trending Ideas', icon: Lightbulb },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/dashboard/upload', label: 'Upload Photos', icon: ImageIcon },
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
        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group"
      >
        <Avatar className="w-[34px] h-[34px] ring-2 ring-offset-1 ring-slate-100 dark:ring-slate-700 shrink-0">
          <AvatarImage src={user.linkedin_picture || ''} alt={user.linkedin_name || ''} />
          <AvatarFallback className="bg-brand-light text-brand font-bold text-sm">
            {user.linkedin_name?.[0] || 'U'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0 text-left">
          <div className="font-semibold text-[13px] text-slate-900 dark:text-slate-100 truncate leading-tight">{user.linkedin_name}</div>
          <div className="text-[11px] font-semibold uppercase tracking-wider mt-0.5" style={{ color: planColor }}>{planLabel}</div>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 dark:text-slate-500 transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
            <div className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">{user.linkedin_name}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{user.email}</div>
            <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold"
              style={{ background: planColor + '18', color: planColor }}>
              {planLabel} Plan
            </div>
          </div>

          <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-700">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-1">Posts this month</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-brand" style={{ width: `${Math.min((postsUsed / postsLimit) * 100, 100)}%` }} />
              </div>
              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">{postsUsed}/{postsLimit}</span>
            </div>
          </div>

          <div className="py-1">
            {plan !== 'pro' && (
              <Link href="/dashboard/upgrade"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                style={{ color: planColor }}>
                <Zap className="w-4 h-4 shrink-0" />
                Upgrade Plan
              </Link>
            )}
            <Link href="/dashboard/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <UserIcon className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
              My Profile
            </Link>
            <Link href="/dashboard/settings?tab=help"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <HelpCircle className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
              Help &amp; FAQ
            </Link>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-700 py-1">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
              <LogOut className="w-4 h-4 shrink-0" />
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function SidebarNav({ plan, planColor, pathname, collapsed }: {
  plan: string
  planColor: string
  pathname: string
  collapsed: boolean
}) {
  return (
    <nav className="flex-1 px-2 py-3 overflow-y-auto">
      {NAV_SECTIONS.map((section, si) => (
        <div key={section.label} className={si > 0 ? 'mt-4' : ''}>
          {/* Section label — hidden in icon-only mode */}
          {!collapsed && (
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-1.5">
              {section.label}
            </div>
          )}
          <div className="flex flex-col gap-0.5">
            {section.items.map(item => {
              const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
              const locked = item.minPlan && planRank(plan) < planRank(item.minPlan)
              const href = locked ? `/dashboard/upgrade?feature=${item.href.split('/').pop()}` : item.href
              const Icon = item.icon

              return (
                <Link
                  key={item.href}
                  href={href}
                  title={collapsed ? item.label : undefined}
                  className={`relative flex items-center gap-2.5 rounded-lg transition-all duration-150 group ${
                    collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'
                  } ${
                    active
                      ? 'bg-brand-light text-brand font-semibold'
                      : locked
                      ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  {active && !collapsed && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-brand rounded-full" />
                  )}
                  <Icon
                    className={`shrink-0 ${collapsed ? 'w-[18px] h-[18px]' : 'w-[17px] h-[17px]'} ${
                      active ? 'text-brand' : locked ? 'text-slate-300 dark:text-slate-600' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                    } transition-colors`}
                    strokeWidth={active ? 2 : 1.75}
                  />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-[13.5px]">{item.label}</span>
                      {locked && <Lock className="w-3 h-3 text-slate-300 dark:text-slate-600" />}
                    </>
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </nav>
  )
}

function SidebarContent({ user, profile, plan, planColor, pathname, collapsed = false }: {
  user: User | null
  profile: UserProfile | null
  plan: string
  planColor: string
  pathname: string
  collapsed?: boolean
}) {
  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900">
      {/* Logo */}
      <div className={`pt-5 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center ${collapsed ? 'justify-center px-3' : 'justify-between px-5'}`}>
        <Link href="/dashboard" className="flex items-center group">
          <div className="bg-white rounded-xl p-1.5 inline-flex items-center justify-center shadow-sm border border-slate-100 logo-always-white">
            <Image src="/logo-icon.png" alt="PersonaLink" width={32} height={32} className="h-8 w-8" />
          </div>
        </Link>
        {!collapsed && <ThemeToggle />}
      </div>

      {/* Nav */}
      <SidebarNav plan={plan} planColor={planColor} pathname={pathname} collapsed={collapsed} />

      {/* Upgrade banner */}
      {plan !== 'pro' && (
        <div className={`border-t border-slate-100 dark:border-slate-800 ${collapsed ? 'px-2 py-2' : 'px-3 py-2'}`}>
          {collapsed ? (
            <Link href="/dashboard/upgrade" title="Upgrade Plan"
              className="flex items-center justify-center py-2 px-1.5 rounded-xl transition-opacity hover:opacity-80"
              style={{ background: planColor + '15' }}>
              <Zap className="w-4 h-4" style={{ color: planColor }} strokeWidth={2} />
            </Link>
          ) : (
            <Link href="/dashboard/upgrade"
              className="flex items-center gap-2.5 rounded-xl px-3.5 py-3 transition-all duration-150 hover:opacity-90 group"
              style={{ background: `${planColor}0d`, border: `1px solid ${planColor}20` }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: planColor + '20' }}>
                <Zap className="w-3.5 h-3.5" style={{ color: planColor }} strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold leading-tight mb-0.5" style={{ color: planColor }}>
                  {plan === 'starter' ? 'Upgrade to Standard' : 'Upgrade to Pro'}
                </div>
                <div className="text-[11px] text-slate-400 dark:text-slate-500 leading-tight">
                  {plan === 'starter' ? 'Unlock analytics & voice notes' : 'Get repurpose & bulk generate'}
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 group-hover:text-slate-400 transition-colors shrink-0" />
            </Link>
          )}
        </div>
      )}

      {/* Profile */}
      <div className={`border-t border-slate-100 dark:border-slate-800 ${collapsed ? 'px-2 py-2' : 'px-2 py-2'}`}>
        {collapsed ? (
          <div className="flex items-center justify-center py-1.5">
            <Avatar className="w-8 h-8 ring-2 ring-offset-1 ring-slate-100 dark:ring-slate-700">
              <AvatarImage src={user?.linkedin_picture || ''} alt={user?.linkedin_name || ''} />
              <AvatarFallback className="bg-brand-light text-brand font-bold text-xs">
                {user?.linkedin_name?.[0] || 'U'}
              </AvatarFallback>
            </Avatar>
          </div>
        ) : (
          user
            ? <ProfileDropdown user={user} profile={profile} plan={plan} planColor={planColor} />
            : <div className="h-12 animate-pulse bg-slate-100 dark:bg-slate-800 rounded-lg" />
        )}
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

const SENDER_EMAIL = 'noreply@personalink.in'
const CONTACT_DISMISSED_KEY = 'pl_add_contact_dismissed'

function AddContactToast() {
  const [visible, setVisible] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem(CONTACT_DISMISSED_KEY)) {
      const t = setTimeout(() => setVisible(true), 1500)
      return () => clearTimeout(t)
    }
  }, [])

  function dismiss() {
    setVisible(false)
    localStorage.setItem(CONTACT_DISMISSED_KEY, '1')
  }

  async function copy() {
    await navigator.clipboard.writeText(SENDER_EMAIL)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.96 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-20 md:bottom-6 right-4 z-50 w-[320px] bg-white dark:bg-slate-900 rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.14)] border border-slate-200 dark:border-slate-700 overflow-hidden"
        >
          <div className="flex items-start gap-3 p-4">
            <div className="w-9 h-9 rounded-xl bg-brand-light flex items-center justify-center shrink-0 mt-0.5">
              <Mail className="w-4 h-4 text-brand" strokeWidth={1.75} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13.5px] font-semibold text-slate-900 dark:text-slate-100 mb-1 leading-snug">
                Keep emails out of spam
              </p>
              <p className="text-[12px] text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
                Add our sender to your contacts so approval emails and weekly digests always reach your inbox.
              </p>
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2">
                <span className="text-[12px] font-mono text-slate-700 dark:text-slate-300 flex-1 truncate">{SENDER_EMAIL}</span>
                <button
                  onClick={copy}
                  className="text-brand hover:text-brand-dark transition-colors shrink-0"
                  title="Copy email"
                >
                  {copied
                    ? <CheckIcon className="w-3.5 h-3.5 text-emerald-500" strokeWidth={2.5} />
                    : <Copy className="w-3.5 h-3.5" strokeWidth={2} />
                  }
                </button>
              </div>
            </div>
            <button
              onClick={dismiss}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors shrink-0 -mt-0.5 -mr-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="border-t border-slate-100 dark:border-slate-800 flex">
            <button
              onClick={dismiss}
              className="flex-1 py-2.5 text-[12px] font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Got it
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
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
  const isOnline = useOnlineStatus()

  const sidebarProps = { user, profile, plan, planColor, pathname }

  return (
    <div className="flex min-h-screen bg-slate-50/50 dark:bg-slate-950">
      {/* Desktop sidebar — icon-only on md (768–1023px), full on lg (1024px+) */}
      <aside className="hidden md:flex md:w-16 lg:w-[240px] flex-col bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 sticky top-0 h-screen overflow-y-auto shrink-0 shadow-[1px_0_0_0_#f1f5f9] dark:shadow-none transition-all duration-200">
        {/* Collapsed (icon-only) version on md */}
        <div className="flex flex-col h-full lg:hidden">
          <SidebarContent {...sidebarProps} collapsed={true} />
        </div>
        {/* Full version on lg+ */}
        <div className="hidden lg:flex flex-col h-full">
          <SidebarContent {...sidebarProps} collapsed={false} />
        </div>
      </aside>

      {/* Mobile Sheet sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" showCloseButton={false} className="p-0 w-[240px]">
          <SidebarContent {...sidebarProps} collapsed={false} />
        </SheetContent>
      </Sheet>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Offline banner */}
        {!isOnline && (
          <div className="bg-slate-800 text-white text-center text-xs font-medium py-2 px-4">
            You're offline — changes won't be saved until you reconnect
          </div>
        )}

        {/* Trial banner */}
        {!trialDismissed && subscription?.status === 'trial' && subscription.trial_ends_at && new Date(subscription.trial_ends_at) > new Date() && (
          <TrialBanner trialEndsAt={subscription.trial_ends_at} onDismiss={() => setTrialDismissed(true)} />
        )}

        {/* Mobile top bar */}
        <div className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 h-[54px] flex items-center justify-between px-4 shadow-sm">
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
              <button onClick={handleMobileLogout} className="p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <LogOut className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              </button>
            )}
            <Button variant="ghost" size="icon" onClick={() => setMobileOpen(o => !o)} className="rounded-lg">
              <Menu className="size-5 text-slate-600 dark:text-slate-400" />
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
            <ErrorBoundary>{children}</ErrorBoundary>
          </motion.main>
        </AnimatePresence>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 safe-pb">
        <div className="flex h-14">
          {BOTTOM_NAV_ITEMS.map(item => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[44px] transition-colors ${
                  active ? 'text-[#0B458B]' : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                <Icon className="w-5 h-5" strokeWidth={active ? 2 : 1.75} />
                <span className={`text-[9px] font-semibold transition-opacity ${active ? 'opacity-100' : 'opacity-0 h-0'}`}>
                  {item.label}
                </span>
              </Link>
            )
          })}
          {/* More */}
          <button
            onClick={() => setMoreOpen(true)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[44px] text-slate-400 dark:text-slate-500 transition-colors"
          >
            <MoreHorizontal className="w-5 h-5" strokeWidth={1.75} />
            <span className="text-[9px] font-semibold opacity-0 h-0">More</span>
          </button>
        </div>
      </nav>

      <AddContactToast />

      {/* More sheet */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="pb-safe rounded-t-2xl px-4 pt-4">
          <div className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-5" />
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1 mb-2">More</div>
          <div className="flex flex-col gap-0.5">
            {MORE_ITEMS.map(item => {
              const Icon = item.icon
              const active = pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl min-h-[44px] transition-colors ${
                    active
                      ? 'bg-brand-light dark:bg-brand/10 text-brand font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className={`w-5 h-5 shrink-0 ${active ? 'text-brand' : 'text-slate-400 dark:text-slate-500'}`} strokeWidth={active ? 2 : 1.75} />
                  <span className="text-[14px]">{item.label}</span>
                </Link>
              )
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between px-3">
            <span className="text-[13px] text-slate-500 dark:text-slate-400">Appearance</span>
            <ThemeToggle />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

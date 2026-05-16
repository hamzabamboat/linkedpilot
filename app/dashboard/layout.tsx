'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { User, UserProfile } from '@/lib/supabase'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import {
  LayoutDashboard,
  Sparkles,
  FileText,
  BarChart3,
  Lightbulb,
  Settings,
  Zap,
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
  Bell,
  Search,
  ChevronRight,
  Menu,
  Upload,
  Plus,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { AppearanceTrigger } from '@/components/appearance-trigger'
import { WordMark } from '@/components/word-mark'
import { ErrorBoundary } from '@/components/error-boundary'

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number; style?: React.CSSProperties; size?: number; color?: string }>
  exact?: boolean
  minPlan?: string
  badge?: 'ai' | 'new' | number
}

const NAV_SECTIONS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Content',
    items: [
      { href: '/dashboard',             label: 'Overview',       icon: LayoutDashboard, exact: true },
      { href: '/dashboard/generate',    label: 'Generate',       icon: Sparkles,    badge: 'ai' },
      { href: '/dashboard/posts',       label: 'Posts',          icon: FileText },
      { href: '/dashboard/calendar',    label: 'Calendar',       icon: CalendarDays },
      { href: '/dashboard/story-bank',  label: 'Story bank',     icon: BookOpen },
    ],
  },
  {
    label: 'Insight',
    items: [
      { href: '/dashboard/analytics',   label: 'Analytics',      icon: BarChart3, minPlan: 'standard' },
      { href: '/dashboard/suggestions', label: 'Trending ideas', icon: Lightbulb, badge: 5 },
      { href: '/dashboard/upload',      label: 'Image library',  icon: ImageIcon },
    ],
  },
  {
    label: 'Account',
    items: [
      { href: '/dashboard/profile',     label: 'Voice & profile', icon: UserIcon },
      { href: '/dashboard/settings',    label: 'Settings',        icon: Settings },
    ],
  },
]

const BOTTOM_NAV_ITEMS = [
  { href: '/dashboard',              label: 'Home',     icon: LayoutDashboard, exact: true },
  { href: '/dashboard/generate',     label: 'Generate', icon: Sparkles },
  { href: '/dashboard/calendar',     label: 'Calendar', icon: CalendarDays },
  { href: '/dashboard/story-bank',   label: 'Stories',  icon: BookOpen },
]

const MORE_ITEMS = [
  { href: '/dashboard/posts',       label: 'My Posts',       icon: FileText },
  { href: '/dashboard/suggestions', label: 'Trending Ideas', icon: Lightbulb },
  { href: '/dashboard/analytics',   label: 'Analytics',      icon: BarChart3 },
  { href: '/dashboard/upload',      label: 'Image Library',  icon: ImageIcon },
  { href: '/dashboard/profile',     label: 'Voice & Profile',icon: UserIcon },
  { href: '/dashboard/settings',    label: 'Settings',       icon: Settings },
]

function planRank(plan: string) {
  return plan === 'pro' ? 3 : plan === 'standard' ? 2 : 1
}

/* ── Workspace Switcher ──────────────────────────────────── */
function WorkspaceSwitcher({ user, profile, plan }: { user: User | null; profile: UserProfile | null; plan: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const postsUsed  = profile?.posts_used_this_month ?? 0
  const postsLimit = profile?.posts_limit ?? 12
  const planLabel  = plan.charAt(0).toUpperCase() + plan.slice(1)
  const firstName  = user?.linkedin_name?.split(' ')[0] ?? 'You'

  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  return (
    <div ref={ref} className="relative px-3 py-3 border-b" style={{ borderColor: 'var(--line)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2.5 rounded-lg p-2 transition-colors hover:bg-surface-3"
        style={{ background: 'transparent' }}
      >
        <Avatar className="w-8 h-8 shrink-0" style={{ borderRadius: 'var(--r-sm)' }}>
          <AvatarImage src={user?.linkedin_picture || ''} alt={user?.linkedin_name || ''} />
          <AvatarFallback style={{ borderRadius: 'var(--r-sm)', background: 'var(--pl-accent-soft)', color: 'var(--pl-accent)', fontWeight: 700, fontSize: 13 }}>
            {user?.linkedin_name?.[0] || 'U'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0 text-left">
          <div className="text-[13px] font-semibold truncate leading-tight" style={{ color: 'var(--ink)', fontFamily: 'var(--f-sans)' }}>{user?.linkedin_name ?? '...'}</div>
          <div className="text-[11px] leading-tight mt-0.5" style={{ color: 'var(--ink-3)', fontFamily: 'var(--f-mono)' }}>
            {planLabel} · {postsUsed}/{postsLimit} posts
          </div>
        </div>
        <ChevronDown size={13} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} style={{ color: 'var(--ink-4)' }} />
      </button>

      {open && (
        <div
          className="absolute left-3 right-3 mt-1 rounded-lg overflow-hidden z-50"
          style={{ background: 'var(--surface)', border: '1px solid var(--line)', boxShadow: 'var(--sh-3)', top: '100%' }}
        >
          <div className="px-3 py-2.5" style={{ borderBottom: '1px solid var(--line)', background: 'var(--surface-2)' }}>
            <div className="text-[13px] font-semibold truncate" style={{ color: 'var(--ink)' }}>{user?.linkedin_name}</div>
            <div className="text-[11px] truncate" style={{ color: 'var(--ink-4)', fontFamily: 'var(--f-mono)' }}>{user?.email}</div>
          </div>
          <div className="py-1">
            {plan !== 'pro' && (
              <Link href="/dashboard/upgrade" onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-[13px] font-semibold transition-colors hover:bg-surface-3"
                style={{ color: 'var(--pl-accent)' }}>
                <Zap size={14} className="shrink-0" />
                Upgrade Plan
              </Link>
            )}
            <Link href="/dashboard/settings" onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-[13px] transition-colors hover:bg-surface-3"
              style={{ color: 'var(--ink-2)' }}>
              <UserIcon size={14} style={{ color: 'var(--ink-4)' }} className="shrink-0" />
              My Profile
            </Link>
            <Link href="/dashboard/settings?tab=help" onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-[13px] transition-colors hover:bg-surface-3"
              style={{ color: 'var(--ink-2)' }}>
              <HelpCircle size={14} style={{ color: 'var(--ink-4)' }} className="shrink-0" />
              Help &amp; FAQ
            </Link>
          </div>
          <div style={{ borderTop: '1px solid var(--line)' }} className="py-1">
            <button onClick={logout}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-semibold text-red-500 transition-colors hover:bg-red-50">
              <LogOut size={14} className="shrink-0" />
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Sidebar Nav ─────────────────────────────────────────── */
function SidebarNav({ plan, pathname, collapsed }: { plan: string; pathname: string; collapsed: boolean }) {
  return (
    <nav className="flex-1 px-2 py-2 overflow-y-auto">
      {NAV_SECTIONS.map((section, si) => (
        <div key={section.label} className={si > 0 ? 'mt-3' : ''}>
          {!collapsed && (
            <div className="px-2 mb-1.5 text-[10px]" style={{ fontFamily: 'var(--f-mono)', color: 'var(--ink-4)', letterSpacing: '.05em' }}>
              // {section.label.toLowerCase()}
            </div>
          )}
          <div className="flex flex-col gap-0.5">
            {section.items.map(item => {
              const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
              const locked = item.minPlan && planRank(plan) < planRank(item.minPlan)
              const href   = locked ? `/dashboard/upgrade?feature=${item.href.split('/').pop()}` : item.href
              const Icon   = item.icon

              return (
                <Link
                  key={item.href}
                  href={href}
                  title={collapsed ? item.label : undefined}
                  className={`sidebar-item relative flex items-center gap-2.5 rounded-md transition-all duration-150 group ${
                    collapsed ? 'justify-center px-2 py-2' : 'px-2.5 py-2'
                  }`}
                  style={{
                    background: active ? 'var(--pl-accent-soft)' : 'transparent',
                    color: active ? 'var(--pl-accent)' : locked ? 'var(--ink-4)' : 'var(--ink-3)',
                  }}
                >
                  {active && !collapsed && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full" style={{ background: 'var(--pl-accent)' }} />
                  )}
                  <Icon
                    className="shrink-0"
                    style={{
                      width: 16, height: 16,
                      color: active ? 'var(--pl-accent)' : locked ? 'var(--ink-4)' : 'var(--ink-3)',
                    }}
                    strokeWidth={active ? 2 : 1.75}
                  />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-[13px]" style={{ fontFamily: 'var(--f-sans)', fontWeight: active ? 600 : 400 }}>
                        {item.label}
                      </span>
                      {locked && <Lock size={11} style={{ color: 'var(--ink-4)' }} />}
                      {!locked && item.badge === 'ai' && (
                        <span className="px-1.5 py-0.5 text-[9px] font-bold rounded" style={{ background: 'var(--pl-accent-soft)', color: 'var(--pl-accent)', fontFamily: 'var(--f-mono)', letterSpacing: '.04em' }}>AI</span>
                      )}
                      {!locked && typeof item.badge === 'number' && (
                        <span className="inline-flex items-center justify-center w-4 h-4 text-[9px] font-bold rounded-full bg-red-500 text-white">{item.badge}</span>
                      )}
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

/* ── Sidebar Content ─────────────────────────────────────── */
function SidebarContent({ user, profile, plan, pathname, collapsed = false }: {
  user: User | null
  profile: UserProfile | null
  plan: string
  pathname: string
  collapsed?: boolean
}) {
  const postsUsed  = profile?.posts_used_this_month ?? 0
  const postsLimit = profile?.posts_limit ?? 12
  const planLabel  = plan.charAt(0).toUpperCase() + plan.slice(1)
  const pct        = Math.min((postsUsed / postsLimit) * 100, 100)

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--surface)', borderRight: '1px solid var(--line)' }}>
      {/* Logo */}
      <div className={`pt-4 pb-3 border-b flex items-center ${collapsed ? 'justify-center px-3' : 'px-4'}`} style={{ borderColor: 'var(--line)' }}>
        <Link href="/dashboard">
          {collapsed
            ? <WordMark icon wordmark={false} iconSize={32} />
            : <WordMark icon wordmark iconSize={30} />
          }
        </Link>
      </div>

      {/* Workspace switcher — full only */}
      {!collapsed && (
        <WorkspaceSwitcher user={user} profile={profile} plan={plan} />
      )}
      {collapsed && user && (
        <div className="px-2 py-3 border-b flex justify-center" style={{ borderColor: 'var(--line)' }}>
          <Avatar className="w-8 h-8" style={{ borderRadius: 'var(--r-sm)' }}>
            <AvatarImage src={user.linkedin_picture || ''} />
            <AvatarFallback style={{ borderRadius: 'var(--r-sm)', background: 'var(--pl-accent-soft)', color: 'var(--pl-accent)', fontWeight: 700, fontSize: 12 }}>
              {user.linkedin_name?.[0] || 'U'}
            </AvatarFallback>
          </Avatar>
        </div>
      )}

      {/* Nav */}
      <SidebarNav plan={plan} pathname={pathname} collapsed={collapsed} />

      {/* Upgrade banner */}
      {!collapsed && plan !== 'pro' && (
        <div className="px-3 pb-2" style={{ borderTop: '1px solid var(--line)', paddingTop: 12 }}>
          <div className="rounded-lg p-3" style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px]" style={{ fontFamily: 'var(--f-mono)', color: 'var(--ink-4)' }}>
                {postsUsed}/{postsLimit} posts left
              </span>
              <Link href="/dashboard/upgrade"
                className="text-[11px] font-semibold flex items-center gap-0.5 transition-opacity hover:opacity-70"
                style={{ color: 'var(--pl-accent)' }}>
                Upgrade to Pro <ChevronRight size={10} />
              </Link>
            </div>
            <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'var(--line-2)' }}>
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: 'var(--pl-accent)' }} />
            </div>
          </div>
        </div>
      )}

      {/* Appearance trigger */}
      {!collapsed && (
        <div className="px-3 pb-3" style={{ borderTop: collapsed ? undefined : '1px solid var(--line)', paddingTop: 12 }}>
          <AppearanceTrigger variant="sidebar" />
        </div>
      )}
    </div>
  )
}

/* ── Banners ─────────────────────────────────────────────── */
interface Subscription {
  status: string
  trial_ends_at: string | null
  plan_id: string | null
  next_billing_date: string | null
}

function TrialBanner({ trialEndsAt, onDismiss }: { trialEndsAt: string; onDismiss: () => void }) {
  const end      = new Date(trialEndsAt)
  const now      = new Date()
  const daysLeft = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
  const endDate  = end.toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })
  return (
    <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-4 py-2.5 flex items-center gap-3">
      <Clock size={14} className="shrink-0 opacity-90" strokeWidth={2} />
      <p className="text-sm font-medium flex-1">
        Free trial ends in <strong>{daysLeft} day{daysLeft !== 1 ? 's' : ''}</strong> — no charge until <strong>{endDate}</strong>.
      </p>
      <Link href="/dashboard/settings?tab=plan" className="text-xs font-bold bg-white/20 hover:bg-white/30 transition-colors rounded-full px-3 py-1 shrink-0 whitespace-nowrap">
        Manage plan
      </Link>
      <button onClick={onDismiss} className="opacity-70 hover:opacity-100 transition-opacity shrink-0 ml-1">
        <X size={14} />
      </button>
    </div>
  )
}

/* ── Add Contact Toast ───────────────────────────────────── */
const SENDER_EMAIL        = 'noreply@personalink.in'
const CONTACT_DISMISSED_K = 'pl_add_contact_dismissed'

function AddContactToast() {
  const [visible, setVisible] = useState(false)
  const [copied, setCopied]   = useState(false)

  useEffect(() => {
    if (!localStorage.getItem(CONTACT_DISMISSED_K)) {
      const t = setTimeout(() => setVisible(true), 1500)
      return () => clearTimeout(t)
    }
  }, [])

  function dismiss() { setVisible(false); localStorage.setItem(CONTACT_DISMISSED_K, '1') }
  async function copy() {
    await navigator.clipboard.writeText(SENDER_EMAIL)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.96 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-20 md:bottom-6 right-4 z-50 w-[320px] overflow-hidden"
          style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--sh-3)' }}
        >
          <div className="flex items-start gap-3 p-4">
            <div className="w-9 h-9 flex items-center justify-center shrink-0 mt-0.5 rounded-lg" style={{ background: 'var(--pl-accent-soft)', borderRadius: 'var(--r-sm)' }}>
              <Mail size={16} style={{ color: 'var(--pl-accent)' }} strokeWidth={1.75} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13.5px] font-semibold mb-1 leading-snug" style={{ color: 'var(--ink)' }}>Keep emails out of spam</p>
              <p className="text-[12px] leading-relaxed mb-3" style={{ color: 'var(--ink-3)' }}>
                Add our sender to your contacts so approval emails and weekly digests always reach your inbox.
              </p>
              <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: 'var(--bg-2)' }}>
                <span className="text-[12px] flex-1 truncate" style={{ fontFamily: 'var(--f-mono)', color: 'var(--ink-2)' }}>{SENDER_EMAIL}</span>
                <button onClick={copy} style={{ color: 'var(--pl-accent)' }} title="Copy email">
                  {copied ? <CheckIcon size={13} strokeWidth={2.5} className="text-emerald-500" /> : <Copy size={13} strokeWidth={2} />}
                </button>
              </div>
            </div>
            <button onClick={dismiss} className="shrink-0 -mt-0.5 -mr-0.5 transition-colors" style={{ color: 'var(--ink-4)' }}>
              <X size={14} />
            </button>
          </div>
          <div style={{ borderTop: '1px solid var(--line)' }} className="flex">
            <button onClick={dismiss} className="flex-1 py-2.5 text-[12px] font-semibold transition-colors" style={{ color: 'var(--ink-3)', fontFamily: 'var(--f-mono)' }}>
              Got it
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ── Topbar ──────────────────────────────────────────────── */
function Topbar({ pathname, user }: { pathname: string; user: User | null }) {
  const router = useRouter()
  const crumb  = pathname.split('/').filter(Boolean).slice(1).map(s => s.replace(/-/g, ' ')).join(' › ') || 'overview'

  return (
    <div
      className="hidden md:flex items-center gap-3 px-5 h-[54px] shrink-0"
      style={{ background: 'var(--surface)', borderBottom: '1px solid var(--line)', boxShadow: 'var(--sh-1)' }}
    >
      {/* Breadcrumb */}
      <span className="text-[11px] mr-auto" style={{ fontFamily: 'var(--f-mono)', color: 'var(--ink-4)', letterSpacing: '.04em' }}>
        // Workspace <span style={{ color: 'var(--ink-3)' }}>› {crumb}</span>
      </span>

      {/* Search */}
      <div className="flex items-center gap-2 h-8 px-3 rounded-md" style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', minWidth: 200 }}>
        <Search size={13} style={{ color: 'var(--ink-4)' }} />
        <span className="text-[12px] flex-1" style={{ color: 'var(--ink-4)', fontFamily: 'var(--f-sans)' }}>Search…</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--surface-3)', color: 'var(--ink-4)', fontFamily: 'var(--f-mono)' }}>⌘K</span>
      </div>

      {/* Icons */}
      <button className="flex items-center justify-center w-8 h-8 rounded-md transition-colors hover:bg-surface-3" style={{ border: '1px solid var(--line)', color: 'var(--ink-3)' }}>
        <Bell size={15} />
      </button>
      <button className="flex items-center justify-center w-8 h-8 rounded-md transition-colors hover:bg-surface-3" style={{ border: '1px solid var(--line)', color: 'var(--ink-3)' }}>
        <HelpCircle size={15} />
      </button>

      {/* New post */}
      <Link href="/dashboard/generate"
        className="flex items-center gap-1.5 h-8 px-3.5 rounded-md text-[13px] font-semibold text-white transition-all hover:opacity-90"
        style={{ background: 'var(--pl-accent)', fontFamily: 'var(--f-sans)' }}>
        <Plus size={14} strokeWidth={2.5} />
        New post
      </Link>

      {/* User pill */}
      <button onClick={() => router.push('/dashboard/settings')} className="flex items-center gap-2 h-8 px-2 rounded-md transition-colors hover:bg-surface-3" style={{ border: '1px solid var(--line)' }}>
        <Avatar className="w-5 h-5">
          <AvatarImage src={user?.linkedin_picture || ''} />
          <AvatarFallback style={{ fontSize: 9, background: 'var(--pl-accent-soft)', color: 'var(--pl-accent)', fontWeight: 700 }}>
            {user?.linkedin_name?.[0] || 'U'}
          </AvatarFallback>
        </Avatar>
        <span className="text-[12px] hidden lg:block" style={{ color: 'var(--ink-2)', fontFamily: 'var(--f-sans)' }}>
          {user?.linkedin_name?.split(' ')[0] ?? '…'}
        </span>
      </button>
    </div>
  )
}

/* ── Root layout ─────────────────────────────────────────── */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router   = useRouter()
  const [user,         setUser]         = useState<User | null>(null)
  const [profile,      setProfile]      = useState<UserProfile | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [mobileOpen,   setMobileOpen]   = useState(false)
  const [moreOpen,     setMoreOpen]     = useState(false)
  const [trialDismissed, setTrialDismissed] = useState(false)
  const [agencyMode, setAgencyMode]     = useState<{ agencyName: string; clientName: string | null } | null>(null)
  const isOnline = useOnlineStatus()

  useEffect(() => {
    fetch('/api/me').then(r => {
      if (!r.ok) { router.push('/'); return r.json() }
      return r.json()
    }).then(d => {
      if (d?.user)         setUser(d.user)
      if (d?.profile)      setProfile(d.profile)
      if (d?.subscription) setSubscription(d.subscription)
      if (d?.agencyMode)   setAgencyMode(d.agencyMode)
    }).catch(() => router.push('/'))
  }, [])

  useEffect(() => { setMobileOpen(false) }, [pathname])

  const plan = profile?.plan || 'starter'
  const sidebarProps = { user, profile, plan, pathname }

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex md:w-16 lg:w-[240px] flex-col sticky top-0 h-screen overflow-y-auto shrink-0 transition-all duration-200"
        style={{ background: 'var(--surface)', borderRight: '1px solid var(--line)' }}
      >
        <div className="flex flex-col h-full lg:hidden">
          <SidebarContent {...sidebarProps} collapsed />
        </div>
        <div className="hidden lg:flex flex-col h-full">
          <SidebarContent {...sidebarProps} collapsed={false} />
        </div>
      </aside>

      {/* Mobile Sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" showCloseButton={false} className="p-0 w-[240px]" style={{ background: 'var(--surface)' }}>
          <SidebarContent {...sidebarProps} collapsed={false} />
        </SheetContent>
      </Sheet>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* System banners */}
        {!isOnline && (
          <div className="text-white text-center text-xs font-medium py-2 px-4 bg-slate-800">
            You're offline — changes won't be saved until you reconnect
          </div>
        )}
        {agencyMode && (
          <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-between gap-3 text-xs font-medium">
            <span>
              Managing{agencyMode.clientName ? `: ${agencyMode.clientName}` : ''} — on behalf of <strong>{agencyMode.agencyName}</strong>
            </span>
            <button
              onClick={async () => {
                await fetch('/api/agency/switch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
                router.push('/agency/dashboard')
              }}
              className="shrink-0 bg-white/20 hover:bg-white/30 transition-colors px-3 py-1 rounded-full font-semibold"
            >
              ← Back to agency
            </button>
          </div>
        )}
        {!agencyMode && !trialDismissed && subscription?.status === 'trial' && subscription.trial_ends_at && new Date(subscription.trial_ends_at) > new Date() && (
          <TrialBanner trialEndsAt={subscription.trial_ends_at} onDismiss={() => setTrialDismissed(true)} />
        )}

        {/* Desktop topbar */}
        <Topbar pathname={pathname} user={user} />

        {/* Mobile top bar */}
        <div className="md:hidden h-[54px] flex items-center justify-between px-4 shrink-0"
          style={{ background: 'var(--surface)', borderBottom: '1px solid var(--line)', boxShadow: 'var(--sh-1)' }}>
          <Link href="/dashboard">
            <WordMark icon wordmark={false} iconSize={30} />
          </Link>
          <div className="flex items-center gap-1">
            <button onClick={() => setMobileOpen(o => !o)} className="p-2 rounded-md transition-colors hover:bg-surface-3" style={{ color: 'var(--ink-3)' }}>
              <Menu size={20} />
            </button>
          </div>
        </div>

        {/* Page content */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.main
            key={pathname}
            className="flex-1 overflow-x-hidden pb-nav-safe"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            <ErrorBoundary>{children}</ErrorBoundary>
          </motion.main>
        </AnimatePresence>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 safe-pb" style={{ background: 'var(--surface)', borderTop: '1px solid var(--line)' }}>
        <div className="flex h-14">
          {BOTTOM_NAV_ITEMS.map(item => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
            const Icon   = item.icon
            return (
              <Link key={item.href} href={item.href}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[44px] transition-colors"
                style={{ color: active ? 'var(--pl-accent)' : 'var(--ink-4)' }}
              >
                <Icon size={20} strokeWidth={active ? 2 : 1.75} />
                <span className={`text-[9px] font-semibold transition-opacity ${active ? 'opacity-100' : 'opacity-50'}`}>{item.label}</span>
              </Link>
            )
          })}
          <button onClick={() => setMoreOpen(true)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[44px] transition-colors"
            style={{ color: 'var(--ink-4)' }}>
            <MoreHorizontal size={20} strokeWidth={1.75} />
          </button>
        </div>
      </nav>

      <AddContactToast />

      {/* More sheet */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="pb-safe rounded-t-2xl px-4 pt-4" style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}>
          <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: 'var(--line-2)' }} />
          <div className="text-[10px] px-1 mb-2" style={{ fontFamily: 'var(--f-mono)', color: 'var(--ink-4)', letterSpacing: '.05em' }}>// more</div>
          <div className="flex flex-col gap-0.5">
            {MORE_ITEMS.map(item => {
              const Icon   = item.icon
              const active = pathname.startsWith(item.href)
              return (
                <Link key={item.href} href={item.href} onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl min-h-[44px] transition-colors"
                  style={{
                    background: active ? 'var(--pl-accent-soft)' : 'transparent',
                    color: active ? 'var(--pl-accent)' : 'var(--ink-2)',
                  }}>
                  <Icon size={18} className="shrink-0" style={{ color: active ? 'var(--pl-accent)' : 'var(--ink-4)' }} strokeWidth={active ? 2 : 1.75} />
                  <span className="text-[14px]" style={{ fontFamily: 'var(--f-sans)', fontWeight: active ? 600 : 400 }}>{item.label}</span>
                </Link>
              )
            })}
          </div>
          <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--line)' }}>
            <AppearanceTrigger variant="sidebar" />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

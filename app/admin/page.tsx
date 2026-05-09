'use client'

import { useEffect, useState } from 'react'

type UserRow = {
  id: string
  name: string
  email: string
  linkedin_id: string
  plan: string
  subscription_status: string
  sub_status: string
  subscription_count: number
  payment_processor: string
  currency: string
  joined: string
  last_active: string
  posts_total: number
  posts_this_month: number
}

type Metrics = {
  new_signups_today: number
  mrr: number
  trial_conversion_rate: number
  most_popular_plan: string
  avg_linkedin_score: number
  total_posts_all_time: number
  users_at_post_limit: number
  onboarding_completion_rate: number
  total_users: number
  active_subscribers: number
  posts_today: number
}

type Revenue = {
  total_active: number
  mrr: number
  mrr_by_currency: Record<string, number>
  plan_breakdown: Record<string, number>
  new_subs_this_month: number
  churned_this_month: number
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  trialing: 'bg-blue-100 text-blue-700',
  trial: 'bg-blue-100 text-blue-700',
  access_code: 'bg-purple-100 text-purple-700',
  inactive: 'bg-slate-100 text-slate-500',
  cancelled: 'bg-red-100 text-red-600',
  halted: 'bg-orange-100 text-orange-700',
  expired: 'bg-slate-100 text-slate-400',
}

const PLAN_COLORS: Record<string, string> = {
  pro: 'text-purple-700 font-bold',
  standard: 'text-blue-700 font-semibold',
  starter: 'text-slate-600',
  free: 'text-slate-400 italic',
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })
}

function MetricCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 px-5 py-4">
      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      {sub && <div className="text-[11px] text-slate-400 mt-0.5">{sub}</div>}
    </div>
  )
}

export default function AdminDashboard() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [revenue, setRevenue] = useState<Revenue | null>(null)
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [metricsLoading, setMetricsLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')
  const [search, setSearch] = useState('')

  function loadData() {
    setLoading(true)
    fetch('/api/admin/data')
      .then(r => r.json())
      .then(d => { setUsers(d.users || []); setRevenue(d.revenue || null) })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()

    fetch('/api/admin/metrics')
      .then(r => r.json())
      .then(d => setMetrics(d))
      .finally(() => setMetricsLoading(false))
  }, [])

  function downloadCSV() {
    window.location.href = '/api/admin/export-csv'
  }

  async function syncSheets() {
    setSyncing(true); setSyncMsg('')
    const res = await fetch('/api/admin/sync-sheets', { method: 'POST' })
    const d = await res.json()
    if (res.ok) {
      setSyncMsg(`✓ Synced ${d.sheets_updated} sheets · ${d.users_synced} users · ${new Date(d.synced_at).toLocaleTimeString('en-IN')}`)
    } else {
      setSyncMsg(`Error: ${d.error}`)
    }
    setSyncing(false)
  }

  const filtered = users.filter(u =>
    !search ||
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.plan.includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 text-slate-400 text-sm">
        Loading dashboard…
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-8">

      {/* Live Metrics */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Live Metrics</h2>
          <span className="text-[11px] text-slate-400">Real-time from Supabase</span>
        </div>
        {metricsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 px-5 py-4 animate-pulse">
                <div className="h-3 bg-slate-100 rounded w-3/4 mb-2" />
                <div className="h-7 bg-slate-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : metrics ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard label="New Signups Today" value={metrics.new_signups_today} sub={`${metrics.posts_today} posts generated today`} />
            <MetricCard label="MRR" value={`₹${metrics.mrr.toLocaleString('en-IN')}`} sub={`${metrics.active_subscribers} active subscribers`} />
            <MetricCard label="Trial → Paid (this month)" value={`${metrics.trial_conversion_rate}%`} sub="conversion rate" />
            <MetricCard label="Most Popular Plan" value={metrics.most_popular_plan.charAt(0).toUpperCase() + metrics.most_popular_plan.slice(1)} sub={`of ${metrics.total_users} users`} />
            <MetricCard label="Avg LinkedIn Score" value={metrics.avg_linkedin_score} sub="out of 100" />
            <MetricCard label="Total Posts Generated" value={metrics.total_posts_all_time.toLocaleString('en-IN')} sub="all time" />
            <MetricCard label="Users At Post Limit" value={metrics.users_at_post_limit} sub="this month" />
            <MetricCard label="Onboarding Completion" value={`${metrics.onboarding_completion_rate}%`} sub={`${metrics.total_users} users total`} />
          </div>
        ) : null}
      </div>

      {/* Sync All Sheets */}
      <div className="bg-white rounded-xl border border-slate-200 px-6 py-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 mb-1">Google Sheets Sync</h2>
            <p className="text-[13px] text-slate-500">
              Syncs 8 sheets: Users · Daily Analytics · Plan Breakdown · Engagement · Retention &amp; Growth · Weekly Summary · Onboarding Funnel · Content Analytics
            </p>
            {syncMsg && (
              <p className={`text-[12px] mt-1.5 font-medium ${syncMsg.startsWith('Error') ? 'text-red-500' : 'text-emerald-600'}`}>
                {syncMsg}
              </p>
            )}
          </div>
          <button
            onClick={syncSheets}
            disabled={syncing}
            className="whitespace-nowrap px-5 py-2.5 bg-[#0B458B] text-white text-sm font-bold rounded-lg hover:bg-[#0a3a75] disabled:opacity-50 transition-colors flex items-center gap-2 self-start sm:self-auto"
          >
            {syncing ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Syncing All Sheets…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Sync All Sheets Now
              </>
            )}
          </button>
        </div>
      </div>

      {/* Revenue summary */}
      {revenue && (
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Revenue Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            {[
              { label: 'Active Subscribers', value: revenue.total_active },
              { label: 'MRR (₹ equiv.)', value: `₹${revenue.mrr.toLocaleString('en-IN')}` },
              { label: 'New This Month', value: revenue.new_subs_this_month },
              { label: 'Churned This Month', value: revenue.churned_this_month },
              {
                label: 'By Plan',
                value: `S:${revenue.plan_breakdown.starter ?? 0} / Std:${revenue.plan_breakdown.standard ?? 0} / P:${revenue.plan_breakdown.pro ?? 0}`,
              },
              {
                label: 'By Currency',
                value: Object.entries(revenue.mrr_by_currency ?? {})
                  .map(([c, v]) => `${c}:${v}`)
                  .join(' · ') || '—',
              },
            ].map(stat => (
              <div key={stat.label} className="bg-white rounded-xl border border-slate-200 px-5 py-4">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{stat.label}</div>
                <div className="text-xl font-bold text-slate-900 break-all">{stat.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Users table */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Users ({users.length})
          </h2>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name, email, plan…"
              className="border border-slate-200 rounded-lg px-3 py-2 sm:py-1.5 text-sm text-slate-700 w-full sm:w-52 focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
            <button
              onClick={loadData}
              disabled={loading}
              className="px-3 py-2 sm:py-1.5 bg-[#0B458B] text-white text-xs font-semibold rounded-lg hover:bg-[#0a3a75] disabled:opacity-50 transition-colors"
            >
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
            <button
              onClick={downloadCSV}
              className="px-3 py-2 sm:py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-700 transition-colors"
            >
              Export CSV
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {['Name', 'Email', 'Plan', 'Status', 'Processor', 'Joined', 'Posts Total', 'Posts/Mo', 'Resubs', 'Last Active'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap max-w-[160px] truncate">{u.name}</td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap max-w-[180px] truncate">{u.email}</td>
                    <td className={`px-4 py-3 capitalize text-sm ${PLAN_COLORS[u.plan] || ''}`}>{u.plan}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_COLORS[u.subscription_status] || 'bg-slate-100 text-slate-500'}`}>
                        {u.subscription_status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-[13px]">
                      {u.payment_processor === 'dodo'
                        ? <span title="Dodo Payments">🌍 Dodo <span className="text-slate-400 text-[11px]">{u.currency}</span></span>
                        : <span title="Razorpay">🇮🇳 Razorpay</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{fmt(u.joined)}</td>
                    <td className="px-4 py-3 text-slate-700 font-medium text-center">{u.posts_total}</td>
                    <td className="px-4 py-3 text-slate-700 text-center">{u.posts_this_month}</td>
                    <td className="px-4 py-3 text-slate-700 text-center">{u.subscription_count}</td>
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{fmt(u.last_active)}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-slate-400 text-sm">
                      {search ? 'No users match your search.' : 'No users yet.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

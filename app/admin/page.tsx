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
  joined: string
  last_active: string
  posts_total: number
  posts_this_month: number
}

type Revenue = {
  total_active: number
  mrr: number
  plan_breakdown: Record<string, number>
  new_subs_this_month: number
  churned_this_month: number
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  trialing: 'bg-blue-100 text-blue-700',
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
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })
}

export default function AdminDashboard() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [revenue, setRevenue] = useState<Revenue | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/admin/data')
      .then(r => r.json())
      .then(d => { setUsers(d.users || []); setRevenue(d.revenue || null) })
      .finally(() => setLoading(false))
  }, [])

  function downloadCSV() {
    window.location.href = '/api/admin/export-csv'
  }

  async function syncSheets() {
    setSyncing(true); setSyncMsg('')
    const res = await fetch('/api/admin/sync-sheets', { method: 'POST' })
    const d = await res.json()
    setSyncMsg(res.ok ? `Synced ${d.rows} rows at ${new Date(d.synced_at).toLocaleTimeString()}` : d.error)
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
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6 md:space-y-8">
      {/* Revenue summary */}
      {revenue && (
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Revenue Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Active Subscribers', value: revenue.total_active },
              { label: 'MRR', value: `₹${revenue.mrr.toLocaleString('en-IN')}` },
              { label: 'New This Month', value: revenue.new_subs_this_month },
              { label: 'Churned This Month', value: revenue.churned_this_month },
              {
                label: 'By Plan',
                value: `S:${revenue.plan_breakdown.starter} / Std:${revenue.plan_breakdown.standard} / P:${revenue.plan_breakdown.pro}`,
              },
            ].map(stat => (
              <div key={stat.label} className="bg-white rounded-xl border border-slate-200 px-5 py-4">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{stat.label}</div>
                <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
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
            <div className="flex gap-2">
              <button
                onClick={downloadCSV}
                className="flex-1 sm:flex-none px-3 py-2 sm:py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-700 transition-colors"
              >
                Export CSV
              </button>
              <button
                onClick={syncSheets}
                disabled={syncing}
                className="flex-1 sm:flex-none px-3 py-2 sm:py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {syncing ? 'Syncing…' : 'Sync Sheets'}
              </button>
            </div>
            {syncMsg && <span className="text-xs text-slate-500">{syncMsg}</span>}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {['Name', 'Email', 'Plan', 'Status', 'Joined', 'Posts Total', 'Posts/Mo', 'Resubs', 'Last Active'].map(h => (
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
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{fmt(u.joined)}</td>
                    <td className="px-4 py-3 text-slate-700 font-medium text-center">{u.posts_total}</td>
                    <td className="px-4 py-3 text-slate-700 text-center">{u.posts_this_month}</td>
                    <td className="px-4 py-3 text-slate-700 text-center">{u.subscription_count}</td>
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{fmt(u.last_active)}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-slate-400 text-sm">
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

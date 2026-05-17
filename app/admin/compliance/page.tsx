'use client'

import { useEffect, useState } from 'react'

type Overview = {
  total_events: number
  affected_users: number
  events_by_type: Record<string, number>
  events_by_severity: Record<string, number>
  high_spam_posts: number
  flagged_posts: number
  elevated_risk_users: number
  recent_blocks: number
}

type TrustDistribution = {
  high_trust: number
  medium_trust: number
  low_trust: number
}

type SpamPost = {
  id: string
  user_id: string
  spam_score: number
  humanity_score: number
  hook_similarity_score: number
  originality_score: number
  status: string
  requires_manual_review: boolean
  preview: string
  created_at: string
}

type RiskUser = {
  user_id: string
  name: string | null
  plan: string | null
  trust_score: number | null
  risk_score: number | null
  flagged_count: number | null
  autopilot_eligible: boolean | null
  control_preference: string | null
}

type ComplianceEvent = {
  event_type: string
  severity: string
  details: Record<string, unknown>
  created_at: string
  user_id: string
  post_id: string | null
}

type ComplianceData = {
  overview: Overview
  trust_distribution: TrustDistribution
  high_spam_posts: SpamPost[]
  risk_users: RiskUser[]
  recent_blocks: ComplianceEvent[]
  recent_events: ComplianceEvent[]
}

const SEVERITY_COLORS: Record<string, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-orange-100 text-orange-700',
  low: 'bg-yellow-100 text-yellow-700',
  none: 'bg-slate-100 text-slate-500',
}

const EVENT_LABELS: Record<string, string> = {
  post_blocked_spam: 'Spam Block',
  post_blocked_moderation: 'Mod Block',
  post_flagged_review: 'Flagged',
  autopilot_blocked: 'Autopilot Block',
  trust_score_reduced: 'Trust Reduced',
  high_spam_generation: 'High Spam',
  similarity_blocked: 'Similarity Block',
  moderation_failed: 'Mod Failed',
}

function Chip({ label, className }: { label: string; className: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${className}`}>
      {label}
    </span>
  )
}

function ScoreBadge({ label, value, inverted = false }: { label: string; value: number | null; inverted?: boolean }) {
  const v = value ?? 0
  const good = inverted ? v <= 30 : v >= 70
  const bad = inverted ? v >= 60 : v <= 40
  const color = bad ? 'text-red-600 font-bold' : good ? 'text-emerald-600 font-semibold' : 'text-slate-600'
  return (
    <div className="text-center">
      <div className={`text-lg font-bold ${color}`}>{v}</div>
      <div className="text-[10px] text-slate-400 uppercase tracking-wide">{label}</div>
    </div>
  )
}

function MetricCard({ label, value, sub, warn }: { label: string; value: string | number; sub?: string; warn?: boolean }) {
  return (
    <div className={`bg-white rounded-xl border px-5 py-4 ${warn ? 'border-red-200' : 'border-slate-200'}`}>
      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-2xl font-bold ${warn ? 'text-red-600' : 'text-slate-900'}`}>{value}</div>
      {sub && <div className="text-[11px] text-slate-400 mt-0.5">{sub}</div>}
    </div>
  )
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function ComplianceDashboard() {
  const [data, setData] = useState<ComplianceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'overview' | 'spam' | 'users' | 'events'>('overview')

  useEffect(() => {
    document.title = 'Compliance — PersonaLink Admin'
    fetch('/api/admin/compliance')
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Loading compliance data…</div>
  )

  if (!data) return (
    <div className="flex items-center justify-center h-64 text-red-500 text-sm">Failed to load. Check admin auth.</div>
  )

  const { overview, trust_distribution, high_spam_posts, risk_users, recent_blocks, recent_events } = data

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Compliance Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Last 30 days · Platform risk overview</p>
      </div>

      {/* Metric strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <MetricCard label="Events" value={overview.total_events} />
        <MetricCard label="Affected Users" value={overview.affected_users} />
        <MetricCard label="High Spam Posts" value={overview.high_spam_posts} warn={overview.high_spam_posts > 10} />
        <MetricCard label="Flagged Posts" value={overview.flagged_posts} warn={overview.flagged_posts > 20} />
        <MetricCard label="Risk Users" value={overview.elevated_risk_users} warn={overview.elevated_risk_users > 5} />
        <MetricCard label="Blocks" value={overview.recent_blocks} warn={overview.recent_blocks > 5} />
        <MetricCard label="High Trust" value={trust_distribution.high_trust} sub="users 70+" />
        <MetricCard label="Low Trust" value={trust_distribution.low_trust} sub="users <40" warn={trust_distribution.low_trust > 3} />
      </div>

      {/* Event type breakdown */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-sm font-bold text-slate-700 mb-3">Events by Type</h2>
        <div className="flex flex-wrap gap-2">
          {Object.entries(overview.events_by_type).sort(([, a], [, b]) => b - a).map(([type, count]) => (
            <div key={type} className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2 text-xs">
              <span className="font-semibold text-slate-700">{EVENT_LABELS[type] ?? type}</span>
              <span className="bg-slate-200 text-slate-600 rounded-full px-1.5 py-0.5 font-bold">{count}</span>
            </div>
          ))}
          {Object.keys(overview.events_by_type).length === 0 && (
            <span className="text-slate-400 text-xs">No events recorded yet.</span>
          )}
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {(['overview', 'spam', 'users', 'events'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors capitalize ${
              tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t === 'spam' ? 'High Spam Posts' : t === 'users' ? 'Risk Users' : t === 'events' ? 'Recent Events' : 'Blocks'}
          </button>
        ))}
      </div>

      {/* Overview tab — recent blocks */}
      {tab === 'overview' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-700">Recent Blocks</h2>
          </div>
          {recent_blocks.length === 0 ? (
            <div className="px-5 py-8 text-center text-slate-400 text-sm">No blocks recorded in the last 30 days.</div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 uppercase tracking-wide">
                  <th className="px-4 py-2 text-left font-semibold">Event</th>
                  <th className="px-4 py-2 text-left font-semibold">Severity</th>
                  <th className="px-4 py-2 text-left font-semibold">User</th>
                  <th className="px-4 py-2 text-left font-semibold">Details</th>
                  <th className="px-4 py-2 text-left font-semibold">When</th>
                </tr>
              </thead>
              <tbody>
                {recent_blocks.map((e, i) => (
                  <tr key={i} className="border-t border-slate-50 hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-semibold text-slate-700">{EVENT_LABELS[e.event_type] ?? e.event_type}</td>
                    <td className="px-4 py-2.5"><Chip label={e.severity} className={SEVERITY_COLORS[e.severity]} /></td>
                    <td className="px-4 py-2.5 text-slate-400 font-mono">{e.user_id.slice(0, 8)}…</td>
                    <td className="px-4 py-2.5 text-slate-500 max-w-xs truncate">{JSON.stringify(e.details)}</td>
                    <td className="px-4 py-2.5 text-slate-400">{fmt(e.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* High spam posts tab */}
      {tab === 'spam' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-700">High Spam Posts (spam ≥ 40)</h2>
          </div>
          {high_spam_posts.length === 0 ? (
            <div className="px-5 py-8 text-center text-slate-400 text-sm">No high-spam posts in the last 30 days.</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {high_spam_posts.map(p => (
                <div key={p.id} className="px-5 py-4 hover:bg-slate-50">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-600 line-clamp-2">{p.preview}</p>
                      <div className="flex gap-2 mt-2">
                        <Chip label={p.status} className="bg-slate-100 text-slate-500" />
                        {p.requires_manual_review && <Chip label="review" className="bg-orange-100 text-orange-700" />}
                        <span className="text-[10px] text-slate-400">{fmt(p.created_at)}</span>
                      </div>
                    </div>
                    <div className="flex gap-3 shrink-0">
                      <ScoreBadge label="Spam" value={p.spam_score} inverted />
                      <ScoreBadge label="Human" value={p.humanity_score} />
                      <ScoreBadge label="Hook" value={p.hook_similarity_score} inverted />
                      <ScoreBadge label="Orig" value={p.originality_score} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Risk users tab */}
      {tab === 'users' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-700">Users with Elevated Risk (risk ≥ 30)</h2>
          </div>
          {risk_users.length === 0 ? (
            <div className="px-5 py-8 text-center text-slate-400 text-sm">No elevated-risk users.</div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 uppercase tracking-wide">
                  <th className="px-4 py-2 text-left font-semibold">User</th>
                  <th className="px-4 py-2 text-left font-semibold">Plan</th>
                  <th className="px-4 py-2 text-left font-semibold">Control</th>
                  <th className="px-4 py-2 text-center font-semibold">Trust</th>
                  <th className="px-4 py-2 text-center font-semibold">Risk</th>
                  <th className="px-4 py-2 text-center font-semibold">Flags</th>
                  <th className="px-4 py-2 text-center font-semibold">Autopilot</th>
                </tr>
              </thead>
              <tbody>
                {risk_users.map((u, i) => (
                  <tr key={i} className="border-t border-slate-50 hover:bg-slate-50">
                    <td className="px-4 py-2.5">
                      <div className="font-semibold text-slate-700">{u.name ?? '—'}</div>
                      <div className="text-slate-400 font-mono text-[10px]">{u.user_id.slice(0, 10)}…</div>
                    </td>
                    <td className="px-4 py-2.5 capitalize text-slate-600">{u.plan ?? 'free'}</td>
                    <td className="px-4 py-2.5 capitalize text-slate-500">{u.control_preference ?? '—'}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={(u.trust_score ?? 0) >= 60 ? 'text-emerald-600 font-bold' : 'text-red-600 font-bold'}>
                        {u.trust_score ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={(u.risk_score ?? 0) >= 50 ? 'text-red-600 font-bold' : 'text-orange-600 font-semibold'}>
                        {u.risk_score ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center text-slate-600">{u.flagged_count ?? 0}</td>
                    <td className="px-4 py-2.5 text-center">
                      {u.autopilot_eligible
                        ? <span className="text-emerald-600 font-bold">Yes</span>
                        : <span className="text-slate-400">No</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Recent events tab */}
      {tab === 'events' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-700">All Recent Events (last 50)</h2>
          </div>
          {recent_events.length === 0 ? (
            <div className="px-5 py-8 text-center text-slate-400 text-sm">No events yet.</div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 uppercase tracking-wide">
                  <th className="px-4 py-2 text-left font-semibold">Event</th>
                  <th className="px-4 py-2 text-left font-semibold">Sev</th>
                  <th className="px-4 py-2 text-left font-semibold">User</th>
                  <th className="px-4 py-2 text-left font-semibold">When</th>
                </tr>
              </thead>
              <tbody>
                {recent_events.map((e, i) => (
                  <tr key={i} className="border-t border-slate-50 hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-semibold text-slate-700">{EVENT_LABELS[e.event_type] ?? e.event_type}</td>
                    <td className="px-4 py-2.5"><Chip label={e.severity} className={SEVERITY_COLORS[e.severity]} /></td>
                    <td className="px-4 py-2.5 text-slate-400 font-mono">{e.user_id.slice(0, 8)}…</td>
                    <td className="px-4 py-2.5 text-slate-400">{fmt(e.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

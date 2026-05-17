'use client'

import { useEffect, useState } from 'react'
import { AccessCode } from '@/lib/supabase'

const PLAN_COLORS: Record<string, string> = {
  pro: 'bg-purple-100 text-purple-700',
  standard: 'bg-blue-100 text-blue-700',
  starter: 'bg-slate-100 text-slate-600',
}

function randomCode() {
  const words = ['FREE', 'PASS', 'VIP', 'BETA', 'EARLY', 'FRIEND', 'LAUNCH']
  const w = words[Math.floor(Math.random() * words.length)]
  const num = Math.floor(1000 + Math.random() * 9000)
  return `PERSONALINK-${w}-${num}`
}

function fmt(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })
}

export default function AccessCodesPage() {
  const [codes, setCodes] = useState<AccessCode[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    code: '', plan: 'standard', max_uses: 1, expires_at: '', created_by: '',
  })
  const [error, setError] = useState('')

  async function loadCodes() {
    const res = await fetch('/api/admin/codes')
    const d = await res.json()
    setCodes(d.codes || [])
    setLoading(false)
  }

  useEffect(() => {
    document.title = 'Access Codes — PersonaLink Admin'
    fetch('/api/admin/codes')
      .then(r => r.json())
      .then(d => { setCodes(d.codes || []); setLoading(false) })
  }, [])

  async function createCode(e: React.FormEvent) {
    e.preventDefault()
    if (!form.code || !form.plan) { setError('Code and plan are required'); return }
    setSaving(true); setError('')
    const res = await fetch('/api/admin/codes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        max_uses: Number(form.max_uses),
        expires_at: form.expires_at || null,
        created_by: form.created_by || null,
      }),
    })
    if (res.ok) {
      setForm({ code: '', plan: 'standard', max_uses: 1, expires_at: '', created_by: '' })
      loadCodes()
    } else {
      const d = await res.json()
      setError(d.error || 'Failed to create code')
    }
    setSaving(false)
  }

  async function toggleCode(id: string, is_active: boolean) {
    await fetch('/api/admin/codes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_active }),
    })
    loadCodes()
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
      {/* Create form */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-5">Create Access Code</h2>
        <form onSubmit={createCode} className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1.5 flex-1 min-w-[180px]">
            <label className="text-xs font-semibold text-slate-500">Code</label>
            <div className="flex gap-2">
              <input
                value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="PERSONALINK-FREE-2024"
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm flex-1 font-mono focus:outline-none focus:ring-2 focus:ring-brand/30"
              />
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, code: randomCode() }))}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
              >
                Generate
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500">Plan</label>
            <select
              value={form.plan}
              onChange={e => setForm(f => ({ ...f, plan: e.target.value }))}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
            >
              <option value="starter">Starter</option>
              <option value="standard">Standard</option>
              <option value="pro">Pro</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5 w-24">
            <label className="text-xs font-semibold text-slate-500">Max Uses</label>
            <input
              type="number"
              min={1}
              value={form.max_uses}
              onChange={e => setForm(f => ({ ...f, max_uses: parseInt(e.target.value) || 1 }))}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500">Expires (optional)</label>
            <input
              type="date"
              value={form.expires_at}
              onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </div>

          <div className="flex flex-col gap-1.5 flex-1 min-w-[140px]">
            <label className="text-xs font-semibold text-slate-500">Created For (optional)</label>
            <input
              value={form.created_by}
              onChange={e => setForm(f => ({ ...f, created_by: e.target.value }))}
              placeholder="e.g. Hamza's friend"
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-700 disabled:opacity-50 transition-colors self-end"
          >
            {saving ? 'Creating…' : 'Create Code'}
          </button>
        </form>
        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      </div>

      {/* Codes table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">
            All Codes ({codes.length})
          </h2>
        </div>
        {loading ? (
          <div className="px-6 py-12 text-center text-slate-400 text-sm">Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {['Code', 'Plan', 'Uses', 'Expires', 'Created For', 'Created', 'Status', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {codes.map(c => (
                  <tr key={c.id} className={`hover:bg-slate-50/80 ${!c.is_active ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3 font-mono font-semibold text-slate-800">{c.code}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${PLAN_COLORS[c.plan]}`}>
                        {c.plan}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <span className={c.uses_count >= c.max_uses ? 'text-red-500 font-semibold' : ''}>
                        {c.uses_count}/{c.max_uses}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{fmt(c.expires_at)}</td>
                    <td className="px-4 py-3 text-slate-500">{c.created_by || '—'}</td>
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{fmt(c.created_at)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${c.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                        {c.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleCode(c.id, !c.is_active)}
                        className="text-xs font-semibold text-slate-400 hover:text-red-500 transition-colors whitespace-nowrap"
                      >
                        {c.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
                {codes.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-slate-400 text-sm">
                      No codes yet. Create one above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

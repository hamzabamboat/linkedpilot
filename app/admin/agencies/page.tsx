'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Plus,
  Eye,
  EyeOff,
  Pencil,
  Trash2,
  Check,
  X,
  Users,
  ToggleLeft,
  ToggleRight,
  AlertCircle,
  KeyRound,
} from 'lucide-react'

type Agency = {
  id: string
  name: string
  email: string
  seat_limit: number
  seats_used: number
  notes: string | null
  is_active: boolean
  created_at: string
}

export default function AdminAgenciesPage() {
  const [agencies, setAgencies] = useState<Agency[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Create form
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', seatLimit: 5, notes: '' })
  const [showPw, setShowPw] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  // Edit state
  const [editing, setEditing] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: '', seatLimit: 5, notes: '', newPassword: '' })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/agencies')
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to load'); return }
      setAgencies(data.agencies)
    } catch {
      setError('Failed to load agencies')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { document.title = 'Agencies — PersonaLink Admin' }, [])
  useEffect(() => { load() }, [load])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    setCreateError('')
    try {
      const res = await fetch('/api/admin/agencies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          seatLimit: form.seatLimit,
          notes: form.notes,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setCreateError(data.error || 'Failed to create'); return }
      setCreateOpen(false)
      setForm({ name: '', email: '', password: '', seatLimit: 5, notes: '' })
      load()
    } catch {
      setCreateError('Something went wrong')
    } finally {
      setCreating(false)
    }
  }

  async function handleToggleActive(agency: Agency) {
    await fetch(`/api/admin/agencies/${agency.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !agency.is_active }),
    })
    load()
  }

  function startEdit(agency: Agency) {
    setEditing(agency.id)
    setEditForm({ name: agency.name, seatLimit: agency.seat_limit, notes: agency.notes ?? '', newPassword: '' })
  }

  async function handleSaveEdit(agencyId: string) {
    setSaving(true)
    await fetch(`/api/admin/agencies/${agencyId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: editForm.name,
        seatLimit: editForm.seatLimit,
        notes: editForm.notes,
        ...(editForm.newPassword ? { password: editForm.newPassword } : {}),
      }),
    })
    setEditing(null)
    setSaving(false)
    load()
  }

  async function handleDelete(agency: Agency) {
    if (!confirm(`Permanently delete agency "${agency.name}" and all their client links?\n\nThis cannot be undone.`)) return
    await fetch(`/api/admin/agencies/${agency.id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Agencies</h1>
          <p className="text-slate-500 text-sm mt-0.5">{agencies.length} agenc{agencies.length === 1 ? 'y' : 'ies'} registered</p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 bg-brand hover:bg-brand-dark text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          New agency
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-4 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading…</div>
        ) : agencies.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-slate-500 text-sm font-medium">No agencies yet</p>
            <p className="text-slate-400 text-xs mt-1">Create one to get started</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left text-xs font-semibold text-slate-500 px-5 py-3">Agency</th>
                <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">Email</th>
                <th className="text-center text-xs font-semibold text-slate-500 px-4 py-3">Seats</th>
                <th className="text-center text-xs font-semibold text-slate-500 px-4 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">Notes</th>
                <th className="text-right text-xs font-semibold text-slate-500 px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {agencies.map((agency, i) => (
                <tr key={agency.id} className={`border-b border-slate-100 last:border-0 ${!agency.is_active ? 'opacity-60' : ''}`}>
                  <td className="px-5 py-4">
                    {editing === agency.id ? (
                      <input
                        value={editForm.name}
                        onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                        className="border border-brand rounded-lg px-2 py-1 text-sm w-36 focus:outline-none focus:ring-1 focus:ring-brand"
                      />
                    ) : (
                      <span className="font-semibold text-slate-900">{agency.name}</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-slate-600">{agency.email}</td>
                  <td className="px-4 py-4 text-center">
                    {editing === agency.id ? (
                      <input
                        type="number"
                        min={agency.seats_used}
                        max={100}
                        value={editForm.seatLimit}
                        onChange={e => setEditForm(f => ({ ...f, seatLimit: Number(e.target.value) }))}
                        className="border border-brand rounded-lg px-2 py-1 text-sm w-16 text-center focus:outline-none focus:ring-1 focus:ring-brand"
                      />
                    ) : (
                      <span className={`font-medium ${agency.seats_used >= agency.seat_limit ? 'text-amber-600' : 'text-slate-700'}`}>
                        {agency.seats_used}/{agency.seat_limit}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <button
                      onClick={() => handleToggleActive(agency)}
                      className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full transition-colors ${agency.is_active ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                    >
                      {agency.is_active
                        ? <><ToggleRight className="w-3.5 h-3.5" /> Active</>
                        : <><ToggleLeft className="w-3.5 h-3.5" /> Inactive</>
                      }
                    </button>
                  </td>
                  <td className="px-4 py-4 text-slate-500 max-w-[160px]">
                    {editing === agency.id ? (
                      <input
                        value={editForm.notes}
                        onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                        placeholder="Notes…"
                        className="border border-slate-200 rounded-lg px-2 py-1 text-sm w-full focus:outline-none focus:ring-1 focus:ring-brand"
                      />
                    ) : (
                      <span className="text-xs truncate block">{agency.notes || '—'}</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-1">
                      {editing === agency.id ? (
                        <>
                          {/* Reset password inline */}
                          <input
                            type="password"
                            value={editForm.newPassword}
                            onChange={e => setEditForm(f => ({ ...f, newPassword: e.target.value }))}
                            placeholder="New password"
                            className="border border-slate-200 rounded-lg px-2 py-1 text-xs w-28 mr-1 focus:outline-none focus:ring-1 focus:ring-brand"
                          />
                          <button
                            onClick={() => handleSaveEdit(agency.id)}
                            disabled={saving}
                            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors"
                            title="Save"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditing(null)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                            title="Cancel"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEdit(agency)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(agency)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create modal */}
      {createOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-900">Create agency</h2>
              <button onClick={() => { setCreateOpen(false); setCreateError('') }} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs font-medium text-slate-600 block mb-1.5">Agency name *</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Acme Marketing Agency"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-slate-600 block mb-1.5">Login email *</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="agency@example.com"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-slate-600 block mb-1.5">Password *</label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      placeholder="Min 8 characters"
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1.5">Seat limit</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={form.seatLimit}
                    onChange={e => setForm(f => ({ ...f, seatLimit: Number(e.target.value) }))}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1.5">Notes (internal)</label>
                  <input
                    type="text"
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Contract ref, etc."
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                </div>
              </div>

              {createError && (
                <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {createError}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setCreateOpen(false); setCreateError('') }}
                  className="flex-1 py-2.5 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 py-2.5 text-sm font-semibold bg-brand hover:bg-brand-dark text-white rounded-xl transition-colors disabled:opacity-60"
                >
                  {creating ? 'Creating…' : 'Create agency'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

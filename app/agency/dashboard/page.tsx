'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import {
  LogOut,
  Plus,
  Users,
  MoreVertical,
  Pencil,
  Trash2,
  ExternalLink,
  CheckCircle,
  X,
  AlertCircle,
} from 'lucide-react'

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  )
}

type ClientData = {
  id: string
  client_name: string
  is_active: boolean
  created_at: string
  user_id: string
  users: {
    id: string
    linkedin_name: string | null
    linkedin_picture: string | null
    linkedin_id: string | null
    subscription_status: string
  } | null
  user_profiles: {
    posts_used_this_month: number
    posts_limit: number
    plan: string | null
    onboarding_completed_at: string | null
  } | null
}

export default function AgencyDashboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [clients, setClients] = useState<ClientData[]>([])
  const [seatLimit, setSeatLimit] = useState(5)
  const [agencyName, setAgencyName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Add client modal
  const [addOpen, setAddOpen] = useState(false)
  const [newClientName, setNewClientName] = useState('')
  const [newClientEmail, setNewClientEmail] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')

  // Menu state
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null)
  const [renameValue, setRenameValue] = useState('')

  // Success toast
  const [toast, setToast] = useState('')

  const linkedSuccess = searchParams.get('linked') === '1'

  const loadClients = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/agency/clients')
      if (res.status === 401) { router.push('/agency/login'); return }
      const data = await res.json()
      setClients(data.clients?.filter((c: ClientData) => c.is_active) ?? [])
      setSeatLimit(data.seatLimit ?? 5)
    } catch {
      setError('Failed to load clients')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    loadClients()
    // Get agency name from a lightweight ping
    fetch('/api/me').then(r => r.json()).catch(() => null)
  }, [loadClients])

  useEffect(() => {
    if (linkedSuccess) {
      showToast('LinkedIn connected successfully!')
      loadClients()
    }
  }, [linkedSuccess, loadClients])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3500)
  }

  async function handleAddClient(e: React.FormEvent) {
    e.preventDefault()
    setAdding(true)
    setAddError('')
    try {
      const res = await fetch('/api/agency/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientName: newClientName, email: newClientEmail }),
      })
      const data = await res.json()
      if (!res.ok) { setAddError(data.error || 'Failed to add client'); return }
      setAddOpen(false)
      setNewClientName('')
      setNewClientEmail('')
      showToast('Client added! Connect their LinkedIn to get started.')
      loadClients()
    } catch {
      setAddError('Something went wrong')
    } finally {
      setAdding(false)
    }
  }

  async function handleManage(clientId: string) {
    const res = await fetch('/api/agency/switch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId }),
    })
    const data = await res.json()
    if (res.ok && data.redirect) router.push(data.redirect)
  }

  async function handleRemove(clientId: string, clientName: string) {
    if (!confirm(`Remove "${clientName}" from your agency? This will deactivate their account.`)) return
    await fetch(`/api/agency/clients/${clientId}`, { method: 'DELETE' })
    setMenuOpen(null)
    loadClients()
  }

  async function handleRename(clientId: string) {
    if (!renameValue.trim()) return
    await fetch(`/api/agency/clients/${clientId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientName: renameValue }),
    })
    setRenaming(null)
    loadClients()
  }

  async function handleLogout() {
    await fetch('/api/agency/logout', { method: 'POST' })
    router.push('/agency/login')
  }

  const isLinkedInConnected = (client: ClientData) =>
    client.users?.linkedin_id && !client.users.linkedin_id.startsWith('agency_client_')

  const seatsUsed = clients.length

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header row */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Agency Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            Manage your client LinkedIn accounts
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-slate-900 text-white text-sm font-medium px-4 py-3 rounded-xl shadow-lg animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          {toast}
        </div>
      )}

      {/* Seat usage banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 mb-6 flex items-center gap-4">
        <div className="w-10 h-10 bg-brand-light rounded-xl flex items-center justify-center shrink-0">
          <Users className="w-5 h-5 text-brand" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            {seatsUsed} / {seatLimit} client seats used
          </p>
          <div className="mt-1.5 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand rounded-full transition-all"
              style={{ width: `${Math.min((seatsUsed / seatLimit) * 100, 100)}%` }}
            />
          </div>
        </div>
        {seatsUsed < seatLimit && (
          <button
            onClick={() => setAddOpen(true)}
            className="shrink-0 flex items-center gap-1.5 bg-brand hover:bg-brand-dark text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add client
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl px-4 py-3 text-sm mb-6 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Client grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-3/4" />
                  <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded w-1/2" />
                </div>
              </div>
              <div className="h-8 bg-slate-100 dark:bg-slate-800 rounded-lg" />
            </div>
          ))}
        </div>
      ) : clients.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users className="w-7 h-7 text-slate-400" />
          </div>
          <h3 className="text-slate-700 dark:text-slate-300 font-semibold mb-1">No clients yet</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-5">Add your first client to get started</p>
          <button
            onClick={() => setAddOpen(true)}
            className="inline-flex items-center gap-2 bg-brand hover:bg-brand-dark text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add first client
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map(client => {
            const linkedIn = isLinkedInConnected(client)
            const postsUsed = client.user_profiles?.posts_used_this_month ?? 0
            const postsLimit = client.user_profiles?.posts_limit ?? 30
            const plan = client.user_profiles?.plan ?? 'pro'

            return (
              <div key={client.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow">
                {/* Client header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    {client.users?.linkedin_picture && linkedIn ? (
                      <Image
                        src={client.users.linkedin_picture}
                        alt={client.client_name}
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-brand-light flex items-center justify-center text-brand font-bold text-base">
                        {client.client_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      {renaming?.id === client.id ? (
                        <form
                          onSubmit={e => { e.preventDefault(); handleRename(client.id) }}
                          className="flex items-center gap-1"
                        >
                          <input
                            autoFocus
                            value={renameValue}
                            onChange={e => setRenameValue(e.target.value)}
                            className="text-sm font-semibold bg-transparent border-b border-brand outline-none text-slate-900 dark:text-white w-28"
                          />
                          <button type="submit" className="text-brand text-xs font-medium">Save</button>
                          <button type="button" onClick={() => setRenaming(null)} className="text-slate-400 text-xs">×</button>
                        </form>
                      ) : (
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{client.client_name}</p>
                      )}
                      <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded-md ${plan === 'pro' ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300' : plan === 'standard' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                        {plan}
                      </span>
                    </div>
                  </div>

                  {/* Context menu */}
                  <div className="relative shrink-0">
                    <button
                      onClick={() => setMenuOpen(menuOpen === client.id ? null : client.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {menuOpen === client.id && (
                      <div className="absolute right-0 top-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-20 w-40 py-1 text-sm">
                        <button
                          onClick={() => { setRenaming({ id: client.id, name: client.client_name }); setRenameValue(client.client_name); setMenuOpen(null) }}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-left text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                        >
                          <Pencil className="w-3.5 h-3.5" /> Rename
                        </button>
                        <button
                          onClick={() => handleRemove(client.id, client.client_name)}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Remove
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* LinkedIn status */}
                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium ${linkedIn ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300'}`}>
                  <LinkedInIcon className="w-3.5 h-3.5 shrink-0" />
                  {linkedIn
                    ? `Connected as ${client.users?.linkedin_name ?? 'LinkedIn user'}`
                    : 'LinkedIn not connected'
                  }
                </div>

                {/* Posts usage */}
                <div>
                  <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                    <span>Posts this month</span>
                    <span>{postsUsed} / {postsLimit}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${postsUsed / postsLimit > 0.8 ? 'bg-amber-400' : 'bg-brand'}`}
                      style={{ width: `${Math.min((postsUsed / postsLimit) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-auto">
                  {!linkedIn && (
                    <a
                      href={`/api/agency/clients/${client.id}/linkedin-auth`}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <LinkedInIcon className="w-3.5 h-3.5" />
                      Connect LinkedIn
                    </a>
                  )}
                  <button
                    onClick={() => handleManage(client.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 px-3 rounded-xl bg-brand hover:bg-brand-dark text-white transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Manage
                  </button>
                </div>
              </div>
            )
          })}

          {/* Add client card (when seats remain) */}
          {seatsUsed < seatLimit && (
            <button
              onClick={() => setAddOpen(true)}
              className="bg-slate-50 dark:bg-slate-900/50 hover:bg-brand-light/30 dark:hover:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-brand/40 rounded-2xl p-5 flex flex-col items-center justify-center gap-3 text-slate-400 hover:text-brand transition-all min-h-[200px]"
            >
              <Plus className="w-8 h-8" />
              <span className="text-sm font-medium">Add client</span>
            </button>
          )}
        </div>
      )}

      {/* Add Client Modal */}
      {addOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="font-bold text-slate-900 dark:text-white text-base">Add new client</h2>
              <button
                onClick={() => { setAddOpen(false); setAddError('') }}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddClient} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1.5">
                  Client name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={newClientName}
                  onChange={e => setNewClientName(e.target.value)}
                  required
                  placeholder="Acme Corp / John Smith"
                  autoFocus
                  className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1.5">
                  Client email <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  type="email"
                  value={newClientEmail}
                  onChange={e => setNewClientEmail(e.target.value)}
                  placeholder="client@example.com"
                  className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2.5">
                After creating the client, you'll be able to connect their LinkedIn account from the dashboard.
              </p>

              {addError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {addError}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setAddOpen(false); setAddError('') }}
                  className="flex-1 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adding}
                  className="flex-1 py-2.5 text-sm font-semibold bg-brand hover:bg-brand-dark text-white rounded-xl transition-colors disabled:opacity-60"
                >
                  {adding ? 'Creating…' : 'Create client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Close menu on outside click */}
      {menuOpen && (
        <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
      )}
    </div>
  )
}

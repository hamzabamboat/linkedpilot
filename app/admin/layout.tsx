import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Admin — PersonaLink',
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-slate-900 text-white px-6 h-14 flex items-center gap-4 sticky top-0 z-50">
        <div className="w-7 h-7 bg-brand rounded-lg flex items-center justify-center text-white font-extrabold text-sm">P</div>
        <span className="font-bold text-sm tracking-wide">PersonaLink Admin</span>
        <nav className="flex gap-1 ml-4">
          <Link href="/admin" className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-700 transition-colors">
            Dashboard
          </Link>
          <Link href="/admin/codes" className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-700 transition-colors">
            Access Codes
          </Link>
          <Link href="/admin/agencies" className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-700 transition-colors">
            Agencies
          </Link>
          <Link href="/admin/compliance" className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-700 transition-colors">
            Compliance
          </Link>
        </nav>
      </header>
      <main>{children}</main>
    </div>
  )
}

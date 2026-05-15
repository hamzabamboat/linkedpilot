import Link from 'next/link'
import Image from 'next/image'

export default function AgencyDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-6 h-14 flex items-center gap-3 sticky top-0 z-50 shadow-sm">
        <div className="bg-white rounded-xl p-1 inline-flex items-center justify-center shadow-sm border border-slate-100">
          <Image src="/logo-icon.png" alt="PersonaLink" width={28} height={28} className="h-7 w-7" />
        </div>
        <span className="font-bold text-sm text-slate-800 dark:text-slate-100">PersonaLink</span>
        <span className="text-slate-300 dark:text-slate-600 text-sm">·</span>
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">Agency Portal</span>
      </header>
      <main>{children}</main>
    </div>
  )
}

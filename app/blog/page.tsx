import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'

export const metadata: Metadata = {
  title: 'Blog — LinkedIn Growth Tips | PersonaLink',
  description: 'Actionable LinkedIn growth strategies, AI content tips, and personal branding insights for Indian founders, consultants, and professionals.',
}

const ARTICLES = [
  {
    slug: 'how-to-grow-on-linkedin-without-posting-daily',
    title: 'How to grow on LinkedIn without posting daily',
    excerpt: "You don't need to post every day to grow on LinkedIn. Here's the smarter approach that busy founders use to build a 10,000+ following without burning out.",
    tags: ['LinkedIn Automation', 'LinkedIn Manager', 'Growth Strategy'],
    date: 'May 2026',
    readTime: '5 min read',
  },
  {
    slug: 'best-ai-linkedin-post-generators-for-indian-professionals-2026',
    title: 'Best AI LinkedIn post generators for Indian professionals 2026',
    excerpt: "We tested 8 AI LinkedIn tools available in India. Here's which ones actually write in your voice, support INR pricing, and handle Indian audiences.",
    tags: ['AI LinkedIn Manager India', 'LinkedIn Tools', 'Product Review'],
    date: 'April 2026',
    readTime: '7 min read',
  },
  {
    slug: 'why-your-linkedin-posts-get-zero-engagement',
    title: 'Why your LinkedIn posts get zero engagement (and how to fix it)',
    excerpt: 'Most LinkedIn posts fail because of 3 fixable mistakes. After analysing 500+ posts from Indian professionals, we found the patterns that kill reach.',
    tags: ['LinkedIn Profile Manager', 'Content Strategy', 'Engagement'],
    date: 'March 2026',
    readTime: '6 min read',
  },
]

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-50">
        <div className="max-w-[1100px] mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <div className="bg-white rounded-xl px-3 py-1.5 inline-flex items-center justify-center shadow-sm border border-slate-100">
              <Image src="/logo-text.png" alt="PersonaLink" width={120} height={28} className="h-7 w-auto" />
            </div>
          </Link>
          <div className="flex gap-4 items-center">
            <Link href="/#pricing" className="text-slate-500 text-sm font-medium hover:text-slate-900">Pricing</Link>
            <Link href="/blog" className="text-brand text-sm font-semibold">Blog</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-[860px] mx-auto px-4 md:px-6 py-12 md:py-20">
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 text-[12px] font-bold text-slate-400 uppercase tracking-widest mb-4">Blog</div>
          <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">
            LinkedIn growth insights for Indian professionals
          </h1>
          <p className="text-slate-500 text-lg">
            Actionable tips on LinkedIn automation, AI content, and personal branding — written for founders, consultants, and professionals in India.
          </p>
        </div>

        <div className="flex flex-col gap-8">
          {ARTICLES.map(article => (
            <Link
              key={article.slug}
              href={`/blog/${article.slug}`}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all p-6 md:p-8 group"
            >
              <div className="flex flex-wrap gap-2 mb-4">
                {article.tags.map(tag => (
                  <span key={tag} className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-brand/5 text-brand border border-brand/10">
                    {tag}
                  </span>
                ))}
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-3 group-hover:text-brand transition-colors">
                {article.title}
              </h2>
              <p className="text-slate-500 leading-relaxed mb-4">
                {article.excerpt}
              </p>
              <div className="flex items-center gap-3 text-[13px] text-slate-400">
                <span>{article.date}</span>
                <span>·</span>
                <span>{article.readTime}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <footer className="bg-slate-900 py-10 px-6 text-center mt-20">
        <p className="text-slate-500 text-[13px]">© 2026 PersonaLink. Your LinkedIn, on autopilot.</p>
      </footer>
    </div>
  )
}

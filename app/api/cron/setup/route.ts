import { NextRequest, NextResponse } from 'next/server'
import { qstash } from '@/lib/qstash'

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!appUrl) {
    return NextResponse.json({ error: 'NEXT_PUBLIC_APP_URL is not set' }, { status: 500 })
  }

  const schedules = [
    { name: 'publish',        path: '/api/cron/publish',        cron: '*/15 * * * *' },
    { name: 'weekly-digest',  path: '/api/cron/weekly-digest',  cron: '0 9 * * 1'   },
    { name: 'monthly-reset',  path: '/api/cron/monthly-reset',  cron: '0 0 1 * *'   },
    { name: 'sync-sheets',    path: '/api/admin/sync-sheets',   cron: '0 0 * * *'   },
  ]

  const results: Record<string, string> = {}

  for (const s of schedules) {
    try {
      const schedule = await qstash.schedules.create({
        destination: `${appUrl}${s.path}`,
        cron: s.cron,
      })
      results[s.name] = schedule.scheduleId
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return NextResponse.json({ error: `Failed to create ${s.name} schedule: ${message}`, results }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true, schedules: results })
}

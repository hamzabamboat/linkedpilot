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

  const schedule = await qstash.schedules.create({
    destination: `${appUrl}/api/cron/publish`,
    cron: '*/15 * * * *',
  })

  return NextResponse.json({ scheduleId: schedule.scheduleId })
}

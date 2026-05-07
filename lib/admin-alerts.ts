import { sendAdminAlert } from './email'

export const ADMIN_EMAIL = 'hamzabamboat@gmail.com'

export async function alertCircuitOpen(service: string, reason: string, stats: Record<string, unknown>): Promise<void> {
  await sendAdminAlert({
    subject: `🚨 CIRCUIT OPEN: ${service} blocked`,
    body: `Circuit breaker OPENED\nService: ${service}\nReason: ${reason}\nStats: ${JSON.stringify(stats, null, 2)}\n\nAll API calls are now blocked for 15 minutes.\nAuto-resets at: ${new Date(Date.now() + 900_000).toISOString()}`,
  }).catch(console.error)
}

export async function alertSpendThreshold(period: string, amountInr: number, limitInr: number): Promise<void> {
  await sendAdminAlert({
    subject: `⚠️ SPEND ALERT: ₹${amountInr.toFixed(0)} in ${period}`,
    body: `API spend threshold exceeded.\nPeriod: ${period}\nAmount: ₹${amountInr.toFixed(2)}\nLimit: ₹${limitInr}\nTime: ${new Date().toISOString()}\n\nAction required: check for abuse or runaway processes.`,
  }).catch(console.error)
}

export async function alertHighCallVolume(callsIn5Min: number, window: string): Promise<void> {
  await sendAdminAlert({
    subject: `⚠️ HIGH VOLUME: ${callsIn5Min} Claude calls in 5 minutes`,
    body: `Unusually high Claude call volume.\nCalls in 5-minute window: ${callsIn5Min}\nThreshold: 50\nWindow: ${window}\n\nInvestigate for possible abuse.`,
  }).catch(console.error)
}

export async function alertPlanAbuse(userId: string, feature: string, plan: string, attempts: number): Promise<void> {
  await sendAdminAlert({
    subject: `🔒 PLAN ABUSE: ${attempts} attempts on locked feature ${feature}`,
    body: `User ${userId} (plan: ${plan}) has attempted to access "${feature}" ${attempts} times today.\nThis may indicate a plan bypass attempt.`,
  }).catch(console.error)
}

export async function alertErrorRate(service: string, errorsPerMin: number): Promise<void> {
  await sendAdminAlert({
    subject: `🔴 ERROR RATE: ${errorsPerMin} errors/min on ${service}`,
    body: `High error rate detected.\nService: ${service}\nErrors in last minute: ${errorsPerMin}\nThreshold: 20\nTime: ${new Date().toISOString()}`,
  }).catch(console.error)
}

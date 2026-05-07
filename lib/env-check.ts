const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'ANTHROPIC_API_KEY',
  'RESEND_API_KEY',
  'CRON_SECRET',
  'ADMIN_SECRET',
  'NEXT_PUBLIC_APP_URL',
] as const

export function validateEnv(): void {
  const missing = REQUIRED_ENV_VARS.filter(key => !process.env[key])
  if (missing.length > 0) {
    console.error(`[env-check] Missing required env vars: ${missing.join(', ')}`)
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Missing required env vars: ${missing.join(', ')}`)
    }
  }
}

export function requireEnv(key: string): string {
  const value = process.env[key]
  if (!value) throw new Error(`Missing required environment variable: ${key}`)
  return value
}

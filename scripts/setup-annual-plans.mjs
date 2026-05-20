/**
 * One-time setup script: creates annual billing products in Dodo and plans in Razorpay.
 * Run: node scripts/setup-annual-plans.mjs
 *
 * Prints the env var lines to paste into .env.local when done.
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load .env.local manually
const envPath = resolve(process.cwd(), '.env.local')
const envLines = readFileSync(envPath, 'utf-8').split('\n')
const env = {}
for (const line of envLines) {
  const m = line.match(/^([^#=]+)=(.*)$/)
  if (m) env[m[1].trim()] = m[2].trim()
}

const DODO_API_KEY = env.DODO_API_KEY
const DODO_ENVIRONMENT = env.DODO_ENVIRONMENT || 'live_mode'
const RAZORPAY_KEY_ID = env.RAZORPAY_KEY_ID
const RAZORPAY_KEY_SECRET = env.RAZORPAY_KEY_SECRET

// ── Dodo annual products ──────────────────────────────────────────────────────
// payment_frequency: yearly (charge once/year)
// subscription_period: yearly

const DODO_ANNUAL_PRODUCTS = [
  { key: 'DODO_PRODUCT_STARTER_USD_ANNUAL',   name: 'PersonaLink Starter — Annual', currency: 'USD', price: 10800 },
  { key: 'DODO_PRODUCT_STANDARD_USD_ANNUAL',  name: 'PersonaLink Standard — Annual', currency: 'USD', price: 27000 },
  { key: 'DODO_PRODUCT_PRO_USD_ANNUAL',       name: 'PersonaLink Pro — Annual',      currency: 'USD', price: 54000 },
  { key: 'DODO_PRODUCT_STARTER_GBP_ANNUAL',   name: 'PersonaLink Starter — Annual', currency: 'GBP', price: 9000 },
  { key: 'DODO_PRODUCT_STANDARD_GBP_ANNUAL',  name: 'PersonaLink Standard — Annual', currency: 'GBP', price: 22500 },
  { key: 'DODO_PRODUCT_PRO_GBP_ANNUAL',       name: 'PersonaLink Pro — Annual',      currency: 'GBP', price: 45000 },
  { key: 'DODO_PRODUCT_STARTER_EUR_ANNUAL',   name: 'PersonaLink Starter — Annual', currency: 'EUR', price: 9900 },
  { key: 'DODO_PRODUCT_STANDARD_EUR_ANNUAL',  name: 'PersonaLink Standard — Annual', currency: 'EUR', price: 25200 },
  { key: 'DODO_PRODUCT_PRO_EUR_ANNUAL',       name: 'PersonaLink Pro — Annual',      currency: 'EUR', price: 49500 },
]

// ── Razorpay annual plans ─────────────────────────────────────────────────────
// period: yearly, interval: 1

const RAZORPAY_ANNUAL_PLANS = [
  { key: 'RAZORPAY_PLAN_ID_STARTER_ANNUAL',  name: 'PersonaLink Starter — Annual',  amount: 899100  },
  { key: 'RAZORPAY_PLAN_ID_STANDARD_ANNUAL', name: 'PersonaLink Standard — Annual', amount: 2249100 },
  { key: 'RAZORPAY_PLAN_ID_PRO_ANNUAL',      name: 'PersonaLink Pro — Annual',      amount: 4499100 },
]

async function createDodoProducts() {
  const { default: DodoPayments } = await import('dodopayments')
  const dodo = new DodoPayments({ bearerToken: DODO_API_KEY, environment: DODO_ENVIRONMENT })

  console.log('\n── Creating Dodo annual products ──')
  const results = {}
  for (const product of DODO_ANNUAL_PRODUCTS) {
    try {
      const created = await dodo.products.create({
        name: product.name,
        tax_category: 'saas',
        price: {
          type: 'recurring_price',
          currency: product.currency,
          discount: 0,
          price: product.price,
          purchasing_power_parity: false,
          payment_frequency_count: 1,
          payment_frequency_interval: 'Year',
          subscription_period_count: 1,
          subscription_period_interval: 'Year',
          trial_period_days: 7,
        },
        description: 'PersonaLink AI LinkedIn content manager — annual subscription (25% off monthly)',
      })
      results[product.key] = created.product_id
      console.log(`  ✓ ${product.key}=${created.product_id}`)
    } catch (err) {
      console.error(`  ✗ ${product.key}: ${err.message}`)
      results[product.key] = 'ERROR'
    }
  }
  return results
}

async function createRazorpayPlans() {
  const Razorpay = (await import('razorpay')).default
  const rzp = new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET })

  console.log('\n── Creating Razorpay annual plans ──')
  const results = {}
  for (const plan of RAZORPAY_ANNUAL_PLANS) {
    try {
      const created = await rzp.plans.create({
        period: 'yearly',
        interval: 1,
        item: {
          name: plan.name,
          amount: plan.amount,
          currency: 'INR',
          description: 'PersonaLink annual subscription — 25% off monthly',
        },
        notes: { product: 'personalink', billing: 'annual' },
      })
      results[plan.key] = created.id
      console.log(`  ✓ ${plan.key}=${created.id}`)
    } catch (err) {
      const msg = err?.error?.description || err?.message || String(err)
      console.error(`  ✗ ${plan.key}: ${msg}`)
      results[plan.key] = 'ERROR'
    }
  }
  return results
}

async function main() {
  console.log(`Using Dodo environment: ${DODO_ENVIRONMENT}`)

  const dodoResults = await createDodoProducts()
  // Razorpay plans already created — skip to avoid duplicates
  const razorResults = {
    RAZORPAY_PLAN_ID_STARTER_ANNUAL: 'plan_SrVyX1ZRrCTbFA',
    RAZORPAY_PLAN_ID_STANDARD_ANNUAL: 'plan_SrVyXFC8H9wyIb',
    RAZORPAY_PLAN_ID_PRO_ANNUAL: 'plan_SrVyXSwiISryZK',
  }

  const all = { ...dodoResults, ...razorResults }
  const hasErrors = Object.values(all).some(v => v === 'ERROR')

  console.log('\n── Paste these into .env.local ──')
  for (const [key, val] of Object.entries(all)) {
    console.log(`${key}=${val}`)
  }

  if (hasErrors) {
    console.log('\n⚠  Some products/plans failed. Fix the errors above and re-run for just those.')
    process.exit(1)
  } else {
    console.log('\n✓ All done. Paste the lines above into .env.local and redeploy.')
  }
}

main().catch(err => { console.error(err); process.exit(1) })

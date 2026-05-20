import DodoPayments from 'dodopayments'

export function getDodo() {
  return new DodoPayments({
    bearerToken: process.env.DODO_API_KEY!,
    environment: (process.env.DODO_ENVIRONMENT as 'live_mode' | 'test_mode') ?? 'test_mode',
  })
}

export const DODO_PLANS = {
  starter: {
    USD: { price: 12, productId: process.env.DODO_PRODUCT_STARTER_USD! },
    GBP: { price: 10, productId: process.env.DODO_PRODUCT_STARTER_GBP! },
    EUR: { price: 11, productId: process.env.DODO_PRODUCT_STARTER_EUR! },
  },
  standard: {
    USD: { price: 30, productId: process.env.DODO_PRODUCT_STANDARD_USD! },
    GBP: { price: 25, productId: process.env.DODO_PRODUCT_STANDARD_GBP! },
    EUR: { price: 28, productId: process.env.DODO_PRODUCT_STANDARD_EUR! },
  },
  pro: {
    USD: { price: 60, productId: process.env.DODO_PRODUCT_PRO_USD! },
    GBP: { price: 50, productId: process.env.DODO_PRODUCT_PRO_GBP! },
    EUR: { price: 55, productId: process.env.DODO_PRODUCT_PRO_EUR! },
  },
} as const

// Annual plans — 25% off monthly × 12, billed as a single yearly charge.
// Requires separate products created in Dodo with annual billing interval.
export const DODO_ANNUAL_PLANS = {
  starter: {
    USD: { price: 108, productId: process.env.DODO_PRODUCT_STARTER_USD_ANNUAL! },
    GBP: { price: 90, productId: process.env.DODO_PRODUCT_STARTER_GBP_ANNUAL! },
    EUR: { price: 99, productId: process.env.DODO_PRODUCT_STARTER_EUR_ANNUAL! },
  },
  standard: {
    USD: { price: 270, productId: process.env.DODO_PRODUCT_STANDARD_USD_ANNUAL! },
    GBP: { price: 225, productId: process.env.DODO_PRODUCT_STANDARD_GBP_ANNUAL! },
    EUR: { price: 252, productId: process.env.DODO_PRODUCT_STANDARD_EUR_ANNUAL! },
  },
  pro: {
    USD: { price: 540, productId: process.env.DODO_PRODUCT_PRO_USD_ANNUAL! },
    GBP: { price: 450, productId: process.env.DODO_PRODUCT_PRO_GBP_ANNUAL! },
    EUR: { price: 495, productId: process.env.DODO_PRODUCT_PRO_EUR_ANNUAL! },
  },
} as const

export type DodoPlan = keyof typeof DODO_PLANS
export type DodoCurrency = keyof typeof DODO_PLANS.starter
export type BillingPeriod = 'monthly' | 'annual'

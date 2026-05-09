import DodoPayments from 'dodopayments'

export function getDodo() {
  return new DodoPayments({
    bearerToken: process.env.DODO_API_KEY!,
    environment: process.env.NODE_ENV === 'production' ? 'live_mode' : 'test_mode',
  })
}

export const DODO_PLANS = {
  starter: {
    USD: { price: 12, productId: process.env.DODO_PRODUCT_STARTER_USD! },
    GBP: { price: 10, productId: process.env.DODO_PRODUCT_STARTER_GBP! },
    SGD: { price: 16, productId: process.env.DODO_PRODUCT_STARTER_SGD! },
    AED: { price: 45, productId: process.env.DODO_PRODUCT_STARTER_AED! },
    EUR: { price: 11, productId: process.env.DODO_PRODUCT_STARTER_EUR! },
  },
  standard: {
    USD: { price: 30, productId: process.env.DODO_PRODUCT_STANDARD_USD! },
    GBP: { price: 25, productId: process.env.DODO_PRODUCT_STANDARD_GBP! },
    SGD: { price: 40, productId: process.env.DODO_PRODUCT_STANDARD_SGD! },
    AED: { price: 110, productId: process.env.DODO_PRODUCT_STANDARD_AED! },
    EUR: { price: 28, productId: process.env.DODO_PRODUCT_STANDARD_EUR! },
  },
  pro: {
    USD: { price: 60, productId: process.env.DODO_PRODUCT_PRO_USD! },
    GBP: { price: 50, productId: process.env.DODO_PRODUCT_PRO_GBP! },
    SGD: { price: 80, productId: process.env.DODO_PRODUCT_PRO_SGD! },
    AED: { price: 220, productId: process.env.DODO_PRODUCT_PRO_AED! },
    EUR: { price: 55, productId: process.env.DODO_PRODUCT_PRO_EUR! },
  },
} as const

export type DodoPlan = keyof typeof DODO_PLANS
export type DodoCurrency = keyof typeof DODO_PLANS.starter

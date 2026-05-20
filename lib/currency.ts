// annual* fields are the yearly total (25% off monthly × 12)
export const CURRENCIES = {
  IN: { code: 'INR', symbol: '₹', starter: 999, standard: 2499, pro: 4999, annualStarter: 8991, annualStandard: 22491, annualPro: 44991 },
  US: { code: 'USD', symbol: '$', starter: 12, standard: 30, pro: 60, annualStarter: 108, annualStandard: 270, annualPro: 540 },
  GB: { code: 'GBP', symbol: '£', starter: 10, standard: 25, pro: 50, annualStarter: 90, annualStandard: 225, annualPro: 450 },
  DE: { code: 'EUR', symbol: '€', starter: 11, standard: 28, pro: 55, annualStarter: 99, annualStandard: 252, annualPro: 495 },
  FR: { code: 'EUR', symbol: '€', starter: 11, standard: 28, pro: 55, annualStarter: 99, annualStandard: 252, annualPro: 495 },
  IT: { code: 'EUR', symbol: '€', starter: 11, standard: 28, pro: 55, annualStarter: 99, annualStandard: 252, annualPro: 495 },
  NL: { code: 'EUR', symbol: '€', starter: 11, standard: 28, pro: 55, annualStarter: 99, annualStandard: 252, annualPro: 495 },
  ES: { code: 'EUR', symbol: '€', starter: 11, standard: 28, pro: 55, annualStarter: 99, annualStandard: 252, annualPro: 495 },
  BE: { code: 'EUR', symbol: '€', starter: 11, standard: 28, pro: 55, annualStarter: 99, annualStandard: 252, annualPro: 495 },
  AT: { code: 'EUR', symbol: '€', starter: 11, standard: 28, pro: 55, annualStarter: 99, annualStandard: 252, annualPro: 495 },
  PT: { code: 'EUR', symbol: '€', starter: 11, standard: 28, pro: 55, annualStarter: 99, annualStandard: 252, annualPro: 495 },
  IE: { code: 'EUR', symbol: '€', starter: 11, standard: 28, pro: 55, annualStarter: 99, annualStandard: 252, annualPro: 495 },
  FI: { code: 'EUR', symbol: '€', starter: 11, standard: 28, pro: 55, annualStarter: 99, annualStandard: 252, annualPro: 495 },
  GR: { code: 'EUR', symbol: '€', starter: 11, standard: 28, pro: 55, annualStarter: 99, annualStandard: 252, annualPro: 495 },
  LU: { code: 'EUR', symbol: '€', starter: 11, standard: 28, pro: 55, annualStarter: 99, annualStandard: 252, annualPro: 495 },
  SK: { code: 'EUR', symbol: '€', starter: 11, standard: 28, pro: 55, annualStarter: 99, annualStandard: 252, annualPro: 495 },
  SI: { code: 'EUR', symbol: '€', starter: 11, standard: 28, pro: 55, annualStarter: 99, annualStandard: 252, annualPro: 495 },
  EE: { code: 'EUR', symbol: '€', starter: 11, standard: 28, pro: 55, annualStarter: 99, annualStandard: 252, annualPro: 495 },
  LV: { code: 'EUR', symbol: '€', starter: 11, standard: 28, pro: 55, annualStarter: 99, annualStandard: 252, annualPro: 495 },
  LT: { code: 'EUR', symbol: '€', starter: 11, standard: 28, pro: 55, annualStarter: 99, annualStandard: 252, annualPro: 495 },
  CY: { code: 'EUR', symbol: '€', starter: 11, standard: 28, pro: 55, annualStarter: 99, annualStandard: 252, annualPro: 495 },
  MT: { code: 'EUR', symbol: '€', starter: 11, standard: 28, pro: 55, annualStarter: 99, annualStandard: 252, annualPro: 495 },
  HR: { code: 'EUR', symbol: '€', starter: 11, standard: 28, pro: 55, annualStarter: 99, annualStandard: 252, annualPro: 495 },
  DEFAULT: { code: 'USD', symbol: '$', starter: 12, standard: 30, pro: 60, annualStarter: 108, annualStandard: 270, annualPro: 540 },
} as const

export type CountryCode = keyof typeof CURRENCIES

export function getCurrency(country: string | undefined) {
  if (!country) return CURRENCIES.DEFAULT
  return (CURRENCIES as Record<string, { code: string; symbol: string; starter: number; standard: number; pro: number; annualStarter: number; annualStandard: number; annualPro: number }>)[country] ?? CURRENCIES.DEFAULT
}

export function getPaymentProcessor(countryCode: string): 'razorpay' | 'dodo' {
  return countryCode === 'IN' ? 'razorpay' : 'dodo'
}

export function formatPrice(symbol: string, amount: number) {
  return `${symbol}${amount.toLocaleString()}`
}

// Fixed approximate rates (update periodically). Used for INR-equivalent MRR display.
export const CURRENCY_TO_INR: Record<string, number> = {
  INR: 1,
  USD: 84,
  GBP: 107,
  EUR: 90,
}

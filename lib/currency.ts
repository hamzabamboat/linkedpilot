export const CURRENCIES = {
  IN: { code: 'INR', symbol: '₹', starter: 999, standard: 2499, pro: 4999 },
  US: { code: 'USD', symbol: '$', starter: 12, standard: 30, pro: 60 },
  GB: { code: 'GBP', symbol: '£', starter: 10, standard: 25, pro: 50 },
  SG: { code: 'SGD', symbol: 'S$', starter: 16, standard: 40, pro: 80 },
  AE: { code: 'AED', symbol: 'AED ', starter: 45, standard: 110, pro: 220 },
  DE: { code: 'EUR', symbol: '€', starter: 11, standard: 28, pro: 55 },
  FR: { code: 'EUR', symbol: '€', starter: 11, standard: 28, pro: 55 },
  IT: { code: 'EUR', symbol: '€', starter: 11, standard: 28, pro: 55 },
  NL: { code: 'EUR', symbol: '€', starter: 11, standard: 28, pro: 55 },
  ES: { code: 'EUR', symbol: '€', starter: 11, standard: 28, pro: 55 },
  BE: { code: 'EUR', symbol: '€', starter: 11, standard: 28, pro: 55 },
  DEFAULT: { code: 'USD', symbol: '$', starter: 12, standard: 30, pro: 60 },
} as const

export type CountryCode = keyof typeof CURRENCIES

export function getCurrency(country: string | undefined) {
  return CURRENCIES[(country as CountryCode) ?? 'DEFAULT'] ?? CURRENCIES.DEFAULT
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
  SGD: 63,
  AED: 23,
  EUR: 90,
}

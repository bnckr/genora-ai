import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
  typescript: true,
})

export const STRIPE_PLANS: Record<string, string> = {
  pro:      process.env.STRIPE_PRICE_PRO      ?? '',
  business: process.env.STRIPE_PRICE_BUSINESS ?? '',
}

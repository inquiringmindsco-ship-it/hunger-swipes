import Stripe from 'stripe'

export function getStripe(): Stripe | null {
  const secret = process.env.STRIPE_SECRET_KEY
  if (!secret) return null
  return new Stripe(secret, { apiVersion: '2025-03-31.basil' as any })
}

export function getWebhookSecret(): string | undefined {
  return process.env.STRIPE_WEBHOOK_SECRET
}

export function isTestMode(): boolean {
  const key = process.env.STRIPE_SECRET_KEY || ''
  return key.startsWith('sk_test_')
}

export function assertTestMode() {
  if (!isTestMode()) {
    throw new Error('Recipe payments are restricted to Stripe test mode. Set STRIPE_SECRET_KEY to a test key.')
  }
}

export async function getRecipeCommerceConfig(admin: any) {
  const { data } = await admin.from('recipe_commerce_config').select('key,value')
  const map: Record<string, any> = {}
  for (const row of data || []) map[row.key] = row.value
  return {
    fixedPriceMinimum: Number(map.fixed_price_minimum?.amount ?? 4.99),
    proudToPayMinimum: Number(map.proud_to_pay_minimum?.amount ?? 5.00),
    platformFeePercent: Number(map.platform_fee_percent?.percent ?? 20),
    creatorSharePercent: Number(map.creator_share_percent?.percent ?? 80),
    testModeOnly: Boolean(map.test_mode_only?.enabled ?? true),
  }
}

export function computeRecipeEcon(priceCents: number, platformFeePercent: number) {
  const creatorSharePercent = 100 - platformFeePercent
  const platformFeeCents = Math.round(priceCents * (platformFeePercent / 100))
  const creatorPayoutCents = priceCents - platformFeeCents
  return { platformFeeCents, creatorPayoutCents, platformFeePercent, creatorSharePercent }
}

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/utils/withAuth'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const POST = withAuth(async (req: NextRequest, user) => {
  const { planSlug } = await req.json()

  // Mapeia slug → preço em centavos e créditos
  const PLANS: Record<string, { priceCents: number; credits: number; label: string }> = {
    pro:      { priceCents: 5900,  credits: 500,  label: 'Pro' },
    business: { priceCents: 19900, credits: 2000, label: 'Business' },
  }

  const plan = PLANS[planSlug]
  if (!plan) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  }

  // Busca ou cria o price no Stripe dinamicamente (sem precisar de webhook)
  const price = await stripe.prices.create({
    currency:     'brl',
    unit_amount:  plan.priceCents,
    recurring:    { interval: 'month' },
    product_data: { name: `Genora ${plan.label}` },
  })

  const { data: dbUser } = await supabaseAdmin
    .from('users')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single()

  // Busca o plan_id no banco
  const { data: dbPlan } = await supabaseAdmin
    .from('plans')
    .select('id, credits_monthly')
    .eq('name', plan.label)
    .single()

  const session = await stripe.checkout.sessions.create({
    customer:    dbUser?.stripe_customer_id ?? undefined,
    mode:        'subscription',
    line_items:  [{ price: price.id, quantity: 1 }],
    // Após pagamento confirmado, credita direto via success_url com o session_id
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/checkout/confirm?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
    metadata:    {
      user_id:  user.id,
      plan_id:  dbPlan?.id ?? '',
      credits:  String(dbPlan?.credits_monthly ?? plan.credits),
    },
    customer_email: dbUser?.stripe_customer_id ? undefined : user.email,
  })

  return NextResponse.json({ url: session.url })
})

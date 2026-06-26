// Rota chamada pelo Stripe após pagamento confirmado (success_url)
// Substitui o webhook enquanto não está configurado

import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('session_id')

  if (!sessionId) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=missing_session`)
  }

  // Verifica o pagamento diretamente no Stripe
  const session = await stripe.checkout.sessions.retrieve(sessionId)

  if (session.payment_status !== 'paid') {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/pricing?error=payment_failed`)
  }

  const userId  = session.metadata?.user_id
  const planId  = session.metadata?.plan_id
  const credits = parseInt(session.metadata?.credits ?? '0', 10)

  if (!userId || !planId) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=invalid_metadata`)
  }

  // Idempotência: só processa se ainda não foi creditado (checa pelo stripe session id)
  const { data: existing } = await supabaseAdmin
    .from('credit_transactions')
    .select('id')
    .eq('stripe_invoice_id', sessionId)
    .single()

  if (!existing) {
    // Atualiza plano do usuário
    await supabaseAdmin
      .from('users')
      .update({ plan_id: planId, stripe_customer_id: session.customer as string })
      .eq('id', userId)

    // Credita os créditos do plano
    await supabaseAdmin.rpc('credit_credits', {
      p_user_id:           userId,
      p_amount:            credits,
      p_reason:            'plan_activation',
      p_stripe_invoice_id: sessionId,
    })

    // Cria registro na tabela subscriptions
    await supabaseAdmin.from('subscriptions').upsert({
      user_id:                userId,
      plan_id:                planId,
      stripe_subscription_id: session.subscription as string,
      status:                 'active',
    }, { onConflict: 'user_id' })
  }

  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard?upgraded=true`)
}

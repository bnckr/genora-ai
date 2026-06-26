// Webhook do Stripe — configurar quando for para produção
// Por enquanto o crédito é concedido direto no retorno do checkout (success_url)

export async function POST() {
  return new Response('Webhook not configured yet', { status: 200 })
}

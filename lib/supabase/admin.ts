import { createClient } from "@supabase/supabase-js";

/**
 * Cliente com a service_role key do Supabase — ignora RLS.
 *
 * NUNCA importe isso em código que roda no browser. Use apenas em rotas de
 * servidor que não têm uma sessão de usuário autenticado pra se apoiar, como
 * o webhook do WhatsApp (a Meta chama a rota diretamente, sem cookies/sessão).
 *
 * Requer a variável de ambiente SUPABASE_SERVICE_ROLE_KEY (encontrada em
 * Supabase Dashboard → Project Settings → API → service_role secret).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados"
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
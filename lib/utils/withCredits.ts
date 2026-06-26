import { supabaseAdmin } from '@/lib/supabase/admin'

export async function checkCredits(userId: string, required: number): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('users')
    .select('credits_balance')
    .eq('id', userId)
    .single()

  return (data?.credits_balance ?? 0) >= required
}

export async function getCreditCost(feature: string, model: string): Promise<number> {
  const { data } = await supabaseAdmin
    .from('credit_costs')
    .select('credits')
    .eq('feature', feature)
    .eq('model', model)
    .single()

  return data?.credits ?? 0
}

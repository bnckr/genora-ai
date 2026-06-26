import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/utils/withAuth'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const GET = withAuth(async (_req, user) => {
  const { data } = await supabaseAdmin
    .from('users')
    .select('credits_balance')
    .eq('id', user.id)
    .single()

  return NextResponse.json({ balance: data?.credits_balance ?? 0 })
})

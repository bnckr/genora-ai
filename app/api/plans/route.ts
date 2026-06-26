import { NextResponse } from 'next/server'
import { getPlans } from '@/lib/supabase/queries'

export async function GET() {
  const plans = await getPlans()
  return NextResponse.json(plans)
}

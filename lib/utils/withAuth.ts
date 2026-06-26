import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { User as SupabaseUser } from '@supabase/supabase-js'

type Handler = (req: NextRequest, user: SupabaseUser) => Promise<NextResponse>

export function withAuth(handler: Handler) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return handler(req, user)
  }
}

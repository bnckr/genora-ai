import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/utils/withAuth'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const GET = withAuth(async (_req, user) => {
  const { data } = await supabaseAdmin
    .from('projects')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_archived', false)
    .order('updated_at', { ascending: false })

  return NextResponse.json(data ?? [])
})

export const POST = withAuth(async (req: NextRequest, user) => {
  const { name, description } = await req.json()

  if (!name?.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('projects')
    .insert({ user_id: user.id, name: name.trim(), description })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data, { status: 201 })
})

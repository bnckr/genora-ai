import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/utils/withAuth'
import { checkCredits, getCreditCost } from '@/lib/utils/withCredits'
import { generateVideo } from '@/lib/ai/video'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const maxDuration = 60

export const POST = withAuth(async (req: NextRequest, user) => {
  const body = await req.json()
  const { prompt, model = 'mochi-v1', projectId, metadata = {} } = body

  if (!prompt?.trim()) {
    return NextResponse.json({ error: 'prompt is required' }, { status: 400 })
  }

  const credits    = await getCreditCost('video', model)
  const hasCredits = await checkCredits(user.id, credits)

  if (!hasCredits) {
    return NextResponse.json({ error: 'insufficient_credits' }, { status: 402 })
  }

  const { data: generation, error: genError } = await supabaseAdmin
    .from('generations')
    .insert({
      user_id:      user.id,
      project_id:   projectId ?? null,
      feature:      'video',
      prompt,
      model,
      provider:     'fal',
      status:       'pending',
      credits_used: credits,
      metadata,
    })
    .select()
    .single()

  if (genError || !generation) {
    return NextResponse.json({ error: 'Failed to create generation' }, { status: 500 })
  }

  const { error: debitError } = await supabaseAdmin.rpc('debit_credits', {
    p_user_id:       user.id,
    p_amount:        credits,
    p_reason:        'video_generation',
    p_generation_id: generation.id,
  })

  if (debitError) {
    await supabaseAdmin.from('generations').delete().eq('id', generation.id)
    return NextResponse.json({ error: debitError.message }, { status: 402 })
  }

  try {
    // Submete o job no fal.ai — retorna imediatamente com o request_id
    const result = await generateVideo({ prompt, model })

    // Salva o job_id externo (request_id do fal.ai) para polling via SSE
    await supabaseAdmin
      .from('generations')
      .update({ job_id: result.jobId })
      .eq('id', generation.id)

    const { data: updatedUser } = await supabaseAdmin
      .from('users')
      .select('credits_balance')
      .eq('id', user.id)
      .single()

    return NextResponse.json({
      generation:      { ...generation, status: 'pending', job_id: result.jobId },
      credits_balance: updatedUser?.credits_balance ?? 0,
    })

  } catch (err) {
    await supabaseAdmin
      .from('generations')
      .update({ status: 'failed', error_msg: String(err) })
      .eq('id', generation.id)

    return NextResponse.json({ error: 'Generation failed', detail: String(err) }, { status: 500 })
  }
})

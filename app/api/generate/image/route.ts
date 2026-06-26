import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/utils/withAuth'
import { checkCredits, getCreditCost } from '@/lib/utils/withCredits'
import { generateImage } from '@/lib/ai/image'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const maxDuration = 60

export const POST = withAuth(async (req: NextRequest, user) => {
  const body = await req.json()
  const { prompt, model = 'flux-schnell', projectId, metadata = {} } = body

  if (!prompt?.trim()) {
    return NextResponse.json({ error: 'prompt is required' }, { status: 400 })
  }

  const credits    = await getCreditCost('image', model)
  const hasCredits = await checkCredits(user.id, credits)

  if (!hasCredits) {
    return NextResponse.json({ error: 'insufficient_credits' }, { status: 402 })
  }

  // Cria registro da geração
  const { data: generation, error: genError } = await supabaseAdmin
    .from('generations')
    .insert({
      user_id:      user.id,
      project_id:   projectId ?? null,
      feature:      'image',
      prompt,
      model,
      provider:     'replicate',
      status:       'processing',
      credits_used: credits,
      metadata,
    })
    .select()
    .single()

  if (genError || !generation) {
    return NextResponse.json({ error: 'Failed to create generation' }, { status: 500 })
  }

  // Debita créditos atomicamente
  const { error: debitError } = await supabaseAdmin.rpc('debit_credits', {
    p_user_id:       user.id,
    p_amount:        credits,
    p_reason:        'image_generation',
    p_generation_id: generation.id,
  })

  if (debitError) {
    await supabaseAdmin.from('generations').delete().eq('id', generation.id)
    return NextResponse.json({ error: debitError.message }, { status: 402 })
  }

  try {
    const result = await generateImage({ prompt, model })

    if (result.status === 'pending') {
      // Replicate ainda processando — atualiza jobId e retorna para polling via SSE
      await supabaseAdmin
        .from('generations')
        .update({ status: 'pending', job_id: result.jobId })
        .eq('id', generation.id)

      return NextResponse.json({
        generation: { ...generation, status: 'pending', job_id: result.jobId },
      })
    }

    // Replicate retornou URLs direto (Prefer: wait)
    const urls = result.outputUrls ?? []

    // Cria os assets com as URLs do Replicate
    const assets = await Promise.all(
      urls.map((cdn_url) =>
        supabaseAdmin
          .from('assets')
          .insert({
            generation_id: generation.id,
            user_id:       user.id,
            storage_path:  cdn_url, // URL externa do Replicate
            cdn_url,
            type:          'image',
            is_public:     false,
          })
          .select()
          .single()
          .then(({ data }) => data),
      ),
    )

    await supabaseAdmin
      .from('generations')
      .update({ status: 'completed', job_id: result.jobId })
      .eq('id', generation.id)

    const { data: updatedUser } = await supabaseAdmin
      .from('users')
      .select('credits_balance')
      .eq('id', user.id)
      .single()

    return NextResponse.json({
      generation:      { ...generation, status: 'completed' },
      assets,
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

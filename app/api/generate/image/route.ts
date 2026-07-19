import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateImage } from '@/lib/ai/image'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()

    // 1. Autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // 2. Body
    const body = await req.json()
    const {
      prompt,
      model = 'krea-2-medium',
      aspectRatio = '1:1',
    } = body

    if (!prompt?.trim()) {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 })
    }

    // 3. Custo em créditos
    const creditCost = model === 'krea-2-large' ? 3 : 1

    // 4. Busca saldo do usuário
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('credits_balance')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })
    }

    if (profile.credits_balance < creditCost) {
      return NextResponse.json({ error: 'insufficient_credits' }, { status: 402 })
    }

    // 5. Cria registro da geração
    const { data: generation, error: genError } = await supabase
      .from('generations')
      .insert({
        user_id: user.id,
        feature: 'image',
        prompt: prompt.trim(),
        model,
        provider: 'krea',
        status: 'processing',
        credits_used: creditCost,
        metadata: { aspectRatio },
      })
      .select()
      .single()

    if (genError || !generation) {
      console.error('Erro ao criar generation:', genError)
      return NextResponse.json({ error: 'Falha ao criar geração' }, { status: 500 })
    }

    // 6. Debita créditos
    const newBalance = profile.credits_balance - creditCost

    const { error: debitError } = await supabase
      .from('users')
      .update({ credits_balance: newBalance })
      .eq('id', user.id)

    if (debitError) {
      // rollback da generation
      await supabase.from('generations').delete().eq('id', generation.id)
      return NextResponse.json({ error: 'Falha ao debitar créditos' }, { status: 500 })
    }

    // 7. Registra transação de créditos
    await supabase.from('credit_transactions').insert({
      user_id: user.id,
      amount: -creditCost,
      type: 'usage',
      reason: 'image_generation',
      generation_id: generation.id,
      balance_after: newBalance,
    })

    // 8. Gera a imagem com Krea
    const result = await generateImage({
      prompt: prompt.trim(),
      model: model as 'krea-2-medium' | 'krea-2-large',
      aspectRatio: aspectRatio as any,
    })

    if (result.status === 'failed' || !result.outputUrls?.length) {
      await supabase
        .from('generations')
        .update({
          status: 'failed',
          error_msg: result.error || 'Nenhuma imagem retornada',
        })
        .eq('id', generation.id)

      return NextResponse.json(
        { error: 'Generation failed', detail: result.error },
        { status: 500 }
      )
    }

    // 9. Salva os assets
    const assetsToInsert = result.outputUrls.map((url) => ({
      generation_id: generation.id,
      user_id: user.id,
      storage_path: url,
      cdn_url: url,
      type: 'image',
      is_public: false,
    }))

    const { data: assets, error: assetsError } = await supabase
      .from('assets')
      .insert(assetsToInsert)
      .select()

    if (assetsError) {
      console.error('Erro ao salvar assets:', assetsError)
    }

    // 10. Marca generation como completed
    await supabase
      .from('generations')
      .update({
        status: 'completed',
        job_id: result.jobId,
      })
      .eq('id', generation.id)

    return NextResponse.json({
      generation: { ...generation, status: 'completed' },
      assets: assets || [],
      credits_balance: newBalance,
    })
  } catch (err) {
    console.error('[API] generate/image error:', err)
    return NextResponse.json(
      { error: 'Internal server error', detail: String(err) },
      { status: 500 }
    )
  }
}
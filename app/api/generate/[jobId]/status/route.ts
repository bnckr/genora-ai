import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { checkVideoStatus } from '@/lib/ai/video'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return new Response('Unauthorized', { status: 401 })

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      let attempts = 0
      const maxAttempts = 90 // 90 × 3s = 4.5min (vídeo pode demorar)

      const poll = async () => {
        attempts++

        // Busca a geração no banco para saber o provider e o job_id externo
        const { data: generation } = await supabaseAdmin
          .from('generations')
          .select('*, assets(*)')
          .eq('id', jobId)
          .eq('user_id', user.id)
          .single()

        if (!generation) {
          send({ status: 'failed', error_msg: 'Generation not found' })
          controller.close()
          return
        }

        // Se já completou/falhou no banco, retorna direto
        if (generation.status === 'completed' || generation.status === 'failed') {
          send(generation)
          controller.close()
          return
        }

        // Para vídeos no fal.ai, verifica o status externamente
        if (generation.provider === 'fal' && generation.job_id) {
          try {
            const result = await checkVideoStatus(generation.job_id)

            if (result.status === 'completed' && result.outputUrls?.length) {
              // Salva o asset e atualiza a geração
              const cdn_url = result.outputUrls[0]

              await supabaseAdmin.from('assets').insert({
                generation_id: generation.id,
                user_id:       user.id,
                storage_path:  cdn_url,
                cdn_url,
                type:          'video',
                is_public:     false,
              })

              await supabaseAdmin
                .from('generations')
                .update({ status: 'completed' })
                .eq('id', generation.id)

              send({ ...generation, status: 'completed', assets: [{ cdn_url }] })
              controller.close()
              return
            }

            if (result.status === 'failed') {
              await supabaseAdmin
                .from('generations')
                .update({ status: 'failed', error_msg: result.error })
                .eq('id', generation.id)

              send({ ...generation, status: 'failed', error_msg: result.error })
              controller.close()
              return
            }
          } catch (err) {
            console.error('[SSE] fal.ai status check failed', err)
          }
        }

        send(generation) // ainda pending/processing

        if (attempts >= maxAttempts) {
          send({ ...generation, status: 'failed', error_msg: 'Timeout' })
          controller.close()
          return
        }

        setTimeout(poll, 3000) // vídeo: polling a cada 3s
      }

      await poll()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
    },
  })
}
